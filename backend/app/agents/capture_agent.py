"""Capture Agent — Gemini Live API integration.

Manages one long-lived Gemini Live session per capture session.
Receives audio/video chunks from the WebSocket handler, streams them
to Gemini, and fires an async callback whenever a concept is extracted.

Uses Gemini function calling: Gemini calls `capture_concept` whenever it
identifies a key concept worth remembering.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Awaitable, Callable, Optional

from google.genai import types as genai_types

from app.agents.memory_architect import CategorizationResult, categorize_and_store
from app.agents.tools.tools import capture_concept
from app.core.gemini import LIVE_MODEL, get_genai_client
from app.services.capture_service import add_artifact_to_session

logger = logging.getLogger(__name__)

MIN_EXTRACTION_INTERVAL: float = 15.0  # seconds between extractions
CONFIDENCE_THRESHOLD: float = 0.7

_SYSTEM_PROMPT = (
    "You are Rayan, an intelligent memory capture assistant. "
    "You observe real-time audio/video from work, meetings, study sessions, lectures, and conversations.\n\n"
    "INTRO: At the very start of each capture session, introduce yourself in 1-2 sentences — "
    "who you are and what you will be doing. For example: \"Hi, I'm Rayan — your memory capture "
    "assistant. I'll be listening quietly and will save the important concepts as you work.\"\n\n"
    "SILENCE RULE: After your intro, remain completely silent while observing. Do NOT narrate, "
    "comment on, or summarise the content being captured. Only break silence when:\n"
    "  1. You call capture_concept — give a brief acknowledgement like 'Got it — [concept name].'\n"
    "  2. The user directly addresses you.\n\n"
    "ARTIFACT TYPES:\n"
    "- lecture: spoken explanations, presentations, teachings\n"
    "- document: written text, papers, slides, notes\n"
    "- visual: diagrams, charts, images, demonstrations\n"
    "- conversation: discussions, interviews, Q&A\n\n"
    "When you identify a key concept worth remembering (confidence >= 0.7, "
    "at least 15 seconds since the last extraction), call the `capture_concept` tool. "
    "Do NOT repeat concepts already captured."
)



@dataclass
class ExtractionEvent:
    concept_title: str
    concept_summary: str
    concept_type: str
    concept_keywords: list[str]
    confidence: float
    captured_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    voice_audio: Optional[bytes] = None
    categorization: Optional[CategorizationResult] = None


ExtractionCallback = Callable[[ExtractionEvent], Awaitable[None]]
AudioCallback = Callable[[bytes], Awaitable[None]]
TextCallback = Callable[[str], Awaitable[None]]


class CaptureAgent:
    """One instance per active capture session."""

    def __init__(
        self,
        user_id: str,
        session_id: str,
        on_extraction: ExtractionCallback,
        on_audio: Optional[AudioCallback] = None,
        on_text: Optional[TextCallback] = None,
    ) -> None:
        self.user_id = user_id
        self.session_id = session_id
        self._on_extraction = on_extraction
        self._on_audio = on_audio
        self._on_text = on_text
        self._chunk_queue: asyncio.Queue[Optional[bytes]] = asyncio.Queue(maxsize=200)
        self._task: Optional[asyncio.Task] = None
        self._last_extraction_at: float = 0.0
        self._extractions: list[ExtractionEvent] = []
        self._running = False

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(
            self._run(), name=f"capture-{self.session_id}"
        )
        logger.info("CaptureAgent started: sessionId=%s", self.session_id)

    async def send_chunk(self, data: bytes) -> None:
        """Queue raw audio/video bytes for streaming to Gemini."""
        if self._running and not self._chunk_queue.full():
            await self._chunk_queue.put(data)

    async def stop(self) -> list[ExtractionEvent]:
        """Gracefully stop the agent and return all extraction events."""
        self._running = False
        await self._chunk_queue.put(None)  # sentinel to unblock sender
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=10.0)
            except asyncio.TimeoutError:
                self._task.cancel()
        logger.info(
            "CaptureAgent stopped: sessionId=%s totalExtractions=%d",
            self.session_id, len(self._extractions),
        )
        return self._extractions

    # ── Private ────────────────────────────────────────────────────────────

    async def _run(self) -> None:
        client = get_genai_client()
        config = genai_types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            enable_affective_dialog=True,
            system_instruction=_SYSTEM_PROMPT,
            tools=[capture_concept],
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                ),
                language_code="en-US",
            ),
            output_audio_transcription=genai_types.AudioTranscriptionConfig(),
        )
        try:
            async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                # Trigger the opening introduction before streaming begins
                await session.send_client_content(
                    turns=[genai_types.Content(
                        role="user",
                        parts=[genai_types.Part(text="[Capture session started]")],
                    )],
                    turn_complete=True,
                )
                await asyncio.gather(
                    self._send_chunks(session),
                    self._receive_responses(session),
                )
        except Exception:
            logger.exception("CaptureAgent session error: sessionId=%s", self.session_id)

    async def _send_chunks(self, session) -> None:
        while True:
            chunk = await self._chunk_queue.get()
            if chunk is None:
                break
            try:
                await session.send(
                    input=genai_types.LiveClientRealtimeInput(
                        media_chunks=[genai_types.Blob(data=chunk, mime_type="audio/webm")]
                    )
                )
            except Exception:
                logger.exception("Chunk send error: sessionId=%s", self.session_id)

    async def _receive_responses(self, session) -> None:
        audio_buf = bytearray()

        async for response in session.receive():
            if not self._running and self._chunk_queue.empty():
                break

            # ── Tool calls ────────────────────────────────────────────────────
            tool_call = getattr(response, "tool_call", None)
            if tool_call and getattr(tool_call, "function_calls", None):
                for fc in tool_call.function_calls:
                    if fc.name != "capture_concept":
                        continue
                    args = dict(fc.args) if fc.args else {}
                    confidence = float(args.get("confidence", 0.0))
                    if not self._should_extract(confidence):
                        await session.send_tool_response(
                            function_responses=[
                                genai_types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": "skipped — too soon or low confidence"},
                                )
                            ]
                        )
                        continue

                    self._last_extraction_at = time.monotonic()
                    event = ExtractionEvent(
                        concept_title=args.get("title", ""),
                        concept_summary=args.get("summary", ""),
                        concept_type=args.get("artifact_type", "lecture"),
                        concept_keywords=list(args.get("keywords", [])),
                        confidence=confidence,
                        voice_audio=bytes(audio_buf) if audio_buf else None,
                    )
                    audio_buf.clear()
                    await self._handle_extraction(event)

                    await session.send_tool_response(
                        function_responses=[
                            genai_types.FunctionResponse(
                                name=fc.name,
                                id=fc.id,
                                response={"result": "concept captured successfully"},
                            )
                        ]
                    )
                continue

            # ── Server content (audio out + transcription) ────────────────────────
            server_content = getattr(response, "server_content", None)
            if server_content is None:
                continue

            model_turn = getattr(server_content, "model_turn", None)
            if model_turn and model_turn.parts:
                for part in model_turn.parts:
                    inline_data = getattr(part, "inline_data", None)
                    if inline_data and inline_data.data:
                        audio_buf.extend(inline_data.data)
                        if self._on_audio:
                            try:
                                await self._on_audio(bytes(inline_data.data))
                            except Exception:
                                logger.exception("on_audio callback error: sessionId=%s", self.session_id)

            # Handle output transcription
            output_trans = getattr(server_content, "output_transcription", None)
            if output_trans:
                rayan_text = getattr(output_trans, "text", None)
                if rayan_text and self._on_text:
                    try:
                        await self._on_text(rayan_text)
                    except Exception:
                        logger.exception("Text callback error: sessionId=%s", self.session_id)

            if getattr(server_content, "turn_complete", False):
                audio_buf.clear()

    async def _handle_extraction(self, event: ExtractionEvent) -> None:
        try:
            result = await categorize_and_store(
                user_id=self.user_id,
                session_id=self.session_id,
                concept_title=event.concept_title,
                concept_summary=event.concept_summary,
                concept_type=event.concept_type,
                concept_keywords=event.concept_keywords,
                concept_confidence=event.confidence,
                captured_at=event.captured_at,
            )
            event.categorization = result
            await add_artifact_to_session(
                self.user_id, self.session_id, result.artifact.id
            )
        except Exception:
            logger.exception("Categorization failed: sessionId=%s", self.session_id)

        self._extractions.append(event)
        try:
            await self._on_extraction(event)
        except Exception:
            logger.exception("Extraction callback error: sessionId=%s", self.session_id)

    def _should_extract(self, confidence: float) -> bool:
        elapsed = time.monotonic() - self._last_extraction_at
        return confidence >= CONFIDENCE_THRESHOLD and elapsed >= MIN_EXTRACTION_INTERVAL


# ── Agent registry (session_id → CaptureAgent) ─────────────────────────────

_active: dict[str, CaptureAgent] = {}


def get_agent(session_id: str) -> Optional[CaptureAgent]:
    return _active.get(session_id)


def register_agent(session_id: str, agent: CaptureAgent) -> None:
    _active[session_id] = agent


def unregister_agent(session_id: str) -> None:
    _active.pop(session_id, None)
