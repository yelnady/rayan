"""Capture Agent — Gemini Live API integration.

Manages one long-lived Gemini Live session per capture session.
Receives audio/video chunks from the WebSocket handler, streams them
to Gemini, and fires an async callback whenever a concept is extracted.

Architecture mirrors RecallAgent: a background task holds the `async with`
context alive; a close_event signals shutdown.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Awaitable, Callable, Optional

from google.genai import types as genai_types

from app.agents.memory_architect import CategorizationResult, categorize_and_store
from app.agents.tools.tools import (
    capture_concept,
    close_session,
    create_artifact,
    create_room,
    end_session,
    execute_web_search,
    web_search,
)
from app.core.gemini import LIVE_MODEL, get_genai_client
from app.services.capture_service import add_artifact_to_session

logger = logging.getLogger(__name__)

MIN_EXTRACTION_INTERVAL: float = 15.0
CONFIDENCE_THRESHOLD: float = 0.7

_SYSTEM_PROMPT_TEMPLATE = (
    "You are Rayan, a silent memory capture assistant co-listening to a live session with {name}.\n\n"
    "BEHAVIOR:\n"
    "- Stay silent while observing. Do NOT narrate, comment, or summarise unless asked.\n"
    "- Respond naturally when {name} addresses you directly (by name or with a question).\n"
    "- When you capture a concept, briefly acknowledge: 'Got it, {name} — [concept name].'\n"
    "- You are co-listening: you hear both the content being shared AND {name} speaking to you.\n\n"
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
    "CAPTURING CONCEPTS:\n"
    "- Autonomous capture: When YOU identify a key concept worth remembering (confidence >= 0.7, "
    "at least 15 seconds since the last extraction), call `capture_concept`.\n"
    "- Direct user request: When the user EXPLICITLY asks you to save, add, capture, or remember "
    "something (e.g. 'add this', 'save that', 'remember this'), ALWAYS call `create_artifact` "
    "immediately — no confidence or time restrictions apply. Then verbally confirm: 'Got it, {name} — saved.'\n"
    "- Do NOT repeat concepts already captured.\n\n"
    "ENDING THE SESSION:\n"
    "- Call `close_session` when the user asks to close, finish, or stop the capture session.\n"
    "- Call `end_session` when the user asks to stop, disconnect, or end the voice conversation.\n"
    "- Always respond verbally to the user before or after calling these tools."
)


@dataclass
class ExtractionEvent:
    concept_title: str
    concept_summary: str
    concept_type: str
    concept_keywords: list[str]
    confidence: float
    captured_at: datetime = field(default_factory=lambda: datetime.now(UTC))
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
        display_name: str = "",
    ) -> None:
        self.user_id = user_id
        self.session_id = session_id
        name = display_name or "there"
        self._system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(name=name)
        self._on_extraction = on_extraction
        self._on_audio = on_audio
        self._on_text = on_text
        self._on_user_text = on_user_text
        self._on_close = on_close
        self._last_extraction_at: float = 0.0
        self._extractions: list[ExtractionEvent] = []
        self._session = None  # set once connected
        self._task: Optional[asyncio.Task] = None
        self._close_event = asyncio.Event()
        self._closed = False

    async def start(self) -> None:
        self._task = asyncio.create_task(
            self._lifecycle(), name=f"capture-{self.session_id}"
        )
        logger.info("CaptureAgent started: sessionId=%s", self.session_id)

    async def send_chunk(self, data: bytes) -> None:
        """Send media bytes (screen/webcam audio) directly to the session."""
        if self._session and not self._closed:
            try:
                await self._session.send(
                    input=genai_types.LiveClientRealtimeInput(
                        media_chunks=[genai_types.Blob(data=data, mime_type="audio/webm")]
                    )
                )
            except Exception:
                logger.exception("send_chunk error: sessionId=%s", self.session_id)

    async def send_voice(self, data: bytes) -> None:
        """Forward user's mic audio as conversational input."""
        if self._session and not self._closed:
            try:
                await self._session.send_realtime_input(
                    audio=genai_types.Blob(data=data, mime_type="audio/pcm;rate=16000")
                )
            except Exception as exc:
                if "ConnectionClosed" in type(exc).__name__:
                    self._closed = True
                else:
                    logger.exception("send_voice error: sessionId=%s", self.session_id)

    async def stop(self) -> list[ExtractionEvent]:
        """Gracefully stop the agent and return all extraction events."""
        self._closed = True
        self._close_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
        logger.info(
            "CaptureAgent stopped: sessionId=%s totalExtractions=%d",
            self.session_id, len(self._extractions),
        )
        return self._extractions

    # ── Private ────────────────────────────────────────────────────────────────

    async def _lifecycle(self) -> None:
        client = get_genai_client()
        config = genai_types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            enable_affective_dialog=True,
            system_instruction=self._system_prompt,
            tools=[capture_concept, create_artifact, create_room, web_search, end_session, close_session],
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
                await self._receive_loop(session)
        except asyncio.CancelledError:
            logger.debug("CaptureAgent lifecycle cancelled: sessionId=%s", self.session_id)
        except Exception:
            logger.exception("CaptureAgent session error: sessionId=%s", self.session_id)
        finally:
            self._session = None

    async def _receive_loop(self, session) -> None:
        try:
            while not self._close_event.is_set():
                async for response in session.receive():
                    if self._close_event.is_set():
                        break

                    # ── Tool calls ─────────────────────────────────────────────
                    tool_call = getattr(response, "tool_call", None)
                    if tool_call and getattr(tool_call, "function_calls", None):
                        function_responses = []
                        for fn_call in tool_call.function_calls:
                            result = await self._execute_tool(
                                fn_call.name,
                                dict(fn_call.args) if fn_call.args else {},
                            )
                            function_responses.append({
                                "name": fn_call.name,
                                "response": {"result": result},
                                "id": fn_call.id,
                            })
                        await session.send_tool_response(function_responses=function_responses)
                        continue

                    # ── Server content ─────────────────────────────────────────
                    server_content = getattr(response, "server_content", None)
                    if server_content is None:
                        continue

                    if getattr(server_content, "interrupted", False):
                        continue

                    if self._on_user_text:
                        input_trans = getattr(server_content, "input_transcription", None)
                        if input_trans:
                            user_text = getattr(input_trans, "text", None)
                            if user_text:
                                try:
                                    await self._on_user_text(user_text)
                                except Exception:
                                    logger.exception("on_user_text error: sessionId=%s", self.session_id)

                    model_turn = getattr(server_content, "model_turn", None)
                    if model_turn and model_turn.parts:
                        for part in model_turn.parts:
                            inline_data = getattr(part, "inline_data", None)
                            if inline_data and inline_data.data and self._on_audio:
                                try:
                                    await self._on_audio(bytes(inline_data.data))
                                except Exception:
                                    logger.exception("on_audio error: sessionId=%s", self.session_id)

                    output_trans = getattr(server_content, "output_transcription", None)
                    if output_trans:
                        rayan_text = getattr(output_trans, "text", None)
                        if rayan_text and self._on_text:
                            try:
                                await self._on_text(rayan_text)
                            except Exception:
                                logger.exception("on_text error: sessionId=%s", self.session_id)

        except asyncio.CancelledError:
            logger.debug("CaptureAgent receive loop cancelled: sessionId=%s", self.session_id)
        except Exception:
            logger.exception("CaptureAgent receive loop error: sessionId=%s", self.session_id)

    async def _execute_tool(self, name: str, args: dict) -> str:
        if name == "capture_concept":
            confidence = float(args.get("confidence", 0.0))
            if not self._should_extract(confidence):
                return "skipped — too soon or low confidence"
            self._last_extraction_at = time.monotonic()
            event = ExtractionEvent(
                concept_title=args.get("title", ""),
                concept_summary=args.get("summary", ""),
                concept_type=args.get("artifact_type", "lecture"),
                concept_keywords=list(args.get("keywords", [])),
                confidence=confidence,
            )
            await self._handle_extraction(event)
            return "concept captured successfully"

        elif name == "create_artifact":
            self._last_extraction_at = time.monotonic()
            event = ExtractionEvent(
                concept_title=args.get("summary", "")[:60],
                concept_summary=args.get("summary", ""),
                concept_type=args.get("artifact_type", "moment"),
                concept_keywords=[],
                confidence=1.0,
            )
            await self._handle_extraction(event)
            return "artifact created successfully"

        elif name == "create_room":
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
                            "position": {
                                "x": new_room.position.x,
                                "y": new_room.position.y,
                                "z": new_room.position.z,
                            },
                            "style": "library",
                        }],
                        "artifactsAdded": [],
                        "connectionsAdded": [],
                    },
                })
                return f"Room '{room_name}' created with ID {new_room.id}"
            except Exception:
                logger.exception("create_room failed: sessionId=%s", self.session_id)
                return "Failed to create room"

        elif name == "web_search":
            return await execute_web_search(args.get("query", ""))

        elif name in ("end_session", "close_session"):
            self._closed = True
            self._close_event.set()
            if self._on_close:
                async def _delayed() -> None:
                    await asyncio.sleep(0.5)
                    try:
                        await self._on_close()  # type: ignore[misc]
                    except Exception:
                        logger.exception("on_close error: sessionId=%s", self.session_id)
                asyncio.create_task(_delayed())
            return "Session ended successfully"

        else:
            logger.warning("CaptureAgent: unknown tool %r sessionId=%s", name, self.session_id)
            return "unknown tool"

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
            await add_artifact_to_session(self.user_id, self.session_id, result.artifact.id)
        except asyncio.CancelledError:
            # Ensure the event is recorded even if cancelled mid-write.
            self._extractions.append(event)
            raise
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
