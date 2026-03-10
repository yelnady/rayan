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
from app.agents.tools.tools import capture_concept, create_artifact, create_room, end_session, execute_web_search, web_search
from app.core.gemini import LIVE_MODEL, get_genai_client
from app.services.capture_service import add_artifact_to_session

logger = logging.getLogger(__name__)

MIN_EXTRACTION_INTERVAL: float = 15.0  # seconds between extractions
CONFIDENCE_THRESHOLD: float = 0.7

_SYSTEM_PROMPT = (
    "You are Rayan, an intelligent memory capture assistant co-listening to a live session.\n\n"
    "INTRO: At the very start, introduce yourself in 1-2 sentences. "
    "Example: \"Hi, I'm Rayan — I'll be listening alongside you and saving the important concepts.\"\n\n"
    "BEHAVIOR:\n"
    "- Stay silent while observing. Do NOT narrate, comment, or summarise unless asked.\n"
    "- Respond naturally when the user addresses you directly (by name or with a question).\n"
    "- When you capture a concept, briefly acknowledge: 'Got it — [concept name].'\n"
    "- You are co-listening: you hear both the content being shared AND the user speaking to you.\n\n"
    "ARTIFACT TYPES:\n"
    "  KNOWLEDGE & LEARNING:\n"
    "  - lecture: spoken explanations, presentations, teachings\n"
    "  - document: written text, papers, slides, notes\n"
    "  - lesson: structured lessons, tutorials, step-by-step guides\n"
    "  - insight: sudden realizations, aha moments, key takeaways\n"
    "  - question: open questions, things left to explore\n"
    "  EXPERIENCES & EMOTIONS:\n"
    "  - moment: a specific personal memory or experience\n"
    "  - milestone: life events, achievements, transitions\n"
    "  - emotion: feelings or emotional states tied to a moment\n"
    "  - dream: waking up and telling my dreams\n"
    "  - habit: recurring behaviors or routines\n"
    "  OPINIONS & IDENTITY:\n"
    "  - conversation: discussions, interviews, Q&A\n"
    "  - opinion: views, stances, beliefs on a topic\n"
    "  - visual: diagrams, charts, images, demonstrations\n"
    "  - media: music, podcasts, films that resonated\n"
    "  GOALS:\n"
    "  - goal: aspirations, objectives, things to achieve\n"
    "  - enrichment: supplementary research or background material\n\n"
    "When you identify a key concept worth remembering (confidence >= 0.7, "
    "at least 15 seconds since the last extraction), call the `capture_concept` tool. "
    "You may also call `create_artifact` directly for any memory type above. "
    "Do NOT repeat concepts already captured.\n\n"
    "Call `end_session` IMMEDIATELY as soon as the user expresses a clear intent to stop, disconnect, or end the conversation. Do not wait for further confirmation."
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
CloseCallback = Callable[[], Awaitable[None]]


class CaptureAgent:
    """One instance per active capture session."""

    def __init__(
        self,
        user_id: str,
        session_id: str,
        on_extraction: ExtractionCallback,
        on_audio: Optional[AudioCallback] = None,
        on_text: Optional[TextCallback] = None,
        on_user_text: Optional[TextCallback] = None,
        on_close: Optional[CloseCallback] = None,
    ) -> None:
        self.user_id = user_id
        self.session_id = session_id
        self._on_extraction = on_extraction
        self._on_audio = on_audio
        self._on_text = on_text
        self._on_user_text = on_user_text
        self._on_close = on_close
        self._chunk_queue: asyncio.Queue[Optional[bytes]] = asyncio.Queue(maxsize=200)
        self._task: Optional[asyncio.Task] = None
        self._last_extraction_at: float = 0.0
        self._extractions: list[ExtractionEvent] = []
        self._running = False
        self._session = None  # set once connected, used by send_voice

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(
            self._run(), name=f"capture-{self.session_id}"
        )
        logger.info("CaptureAgent started: sessionId=%s", self.session_id)

    async def send_chunk(self, data: bytes) -> None:
        """Queue media bytes (screen/webcam audio) for co-listening stream."""
        if self._running and not self._chunk_queue.full():
            await self._chunk_queue.put(data)

    async def send_voice(self, data: bytes) -> None:
        """Forward user's mic audio as conversational input (separate from media stream)."""
        if self._session and self._running:
            try:
                await self._session.send_realtime_input(
                    audio=genai_types.Blob(data=data, mime_type="audio/pcm;rate=16000")
                )
            except Exception:
                logger.exception("send_voice error: sessionId=%s", self.session_id)

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
            proactivity=genai_types.ProactivityConfig(proactive_audio=True),
            system_instruction=_SYSTEM_PROMPT,
            tools=[capture_concept, create_artifact, create_room, web_search, end_session],
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                ),
                language_code="en-US",
            ),
            realtime_input_config=genai_types.RealtimeInputConfig(
                automatic_activity_detection=genai_types.AutomaticActivityDetection(
                    disabled=False
                )
            ),
            output_audio_transcription=genai_types.AudioTranscriptionConfig(),
            input_audio_transcription=genai_types.AudioTranscriptionConfig(),
        )
        try:
            async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                self._session = session
                await asyncio.gather(
                    self._send_chunks(session),
                    self._receive_responses(session),
                )
        except Exception:
            logger.exception("CaptureAgent session error: sessionId=%s", self.session_id)
        finally:
            self._session = None

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
        # Trigger the opening introduction now that the receive loop is running,
        # so the response is guaranteed to be captured.
        await session.send_client_content(
            turns=[genai_types.Content(
                role="user",
                parts=[genai_types.Part(text="[Capture session started. Please introduce yourself briefly.]")],
            )],
            turn_complete=True,
        )

        async for response in session.receive():
            if not self._running and self._chunk_queue.empty():
                break

            # ── Tool calls ────────────────────────────────────────────────────
            tool_call = getattr(response, "tool_call", None)
            if tool_call and getattr(tool_call, "function_calls", None):
                for fc in tool_call.function_calls:
                    args = dict(fc.args) if fc.args else {}

                    if fc.name == "capture_concept":
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

                    elif fc.name == "create_artifact":
                        self._last_extraction_at = time.monotonic()
                        event = ExtractionEvent(
                            concept_title=args.get("summary", "")[:60],
                            concept_summary=args.get("summary", ""),
                            concept_type=args.get("artifact_type", "moment"),
                            concept_keywords=[],
                            confidence=1.0,
                            voice_audio=bytes(audio_buf) if audio_buf else None,
                        )
                        audio_buf.clear()
                        await self._handle_extraction(event)

                        await session.send_tool_response(
                            function_responses=[
                                genai_types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": "artifact created successfully"},
                                )
                            ]
                        )

                    elif fc.name == "create_room":
                        room_name = args.get("name", "New Room")
                        keywords = list(args.get("keywords", []))
                        try:
                            from app.services.room_service import create_room as svc_create_room
                            from app.websocket.manager import manager as ws_manager
                            new_room = await svc_create_room(self.user_id, room_name, keywords)
                            await ws_manager.send(self.user_id, {
                                "type": "palace_update",
                                "changes": {
                                    "roomsAdded": [{
                                        "id": new_room.id,
                                        "name": new_room.name,
                                        "position": {"x": new_room.position.x, "y": new_room.position.y, "z": new_room.position.z},
                                        "style": "library",
                                    }],
                                    "artifactsAdded": [],
                                    "connectionsAdded": [],
                                },
                            })
                            result_msg = f"Room '{room_name}' created with ID {new_room.id}"
                        except Exception:
                            logger.exception("create_room failed: sessionId=%s", self.session_id)
                            result_msg = "Failed to create room"
                        await session.send_tool_response(
                            function_responses=[
                                genai_types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": result_msg},
                                )
                            ]
                        )

                    elif fc.name == "web_search":
                        result = await execute_web_search(args.get("query", ""))
                        await session.send_tool_response(
                            function_responses=[
                                genai_types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": result},
                                )
                            ]
                        )

                    elif fc.name == "end_session":
                        await session.send_tool_response(
                            function_responses=[
                                genai_types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": "Session ended successfully"},
                                )
                            ]
                        )
                        if self._on_close:
                            async def delayed_close():
                                await asyncio.sleep(0.5)
                                if self._on_close:
                                    await self._on_close()
                            asyncio.create_task(delayed_close())
                        self._running = False

                    else:
                        await session.send_tool_response(
                            function_responses=[
                                genai_types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": "unknown tool"},
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

            # Handle output transcription (Rayan speaking)
            output_trans = getattr(server_content, "output_transcription", None)
            if output_trans:
                rayan_text = getattr(output_trans, "text", None)
                if rayan_text and self._on_text:
                    try:
                        await self._on_text(rayan_text)
                    except Exception:
                        logger.exception("Text callback error: sessionId=%s", self.session_id)

            # Handle input transcription (user speaking to Rayan)
            input_trans = getattr(server_content, "input_transcription", None)
            if input_trans:
                user_text = getattr(input_trans, "text", None)
                if user_text and self._on_user_text:
                    try:
                        await self._on_user_text(user_text)
                    except Exception:
                        logger.exception("User text callback error: sessionId=%s", self.session_id)

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
