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
    CAPTURE_LIVE_TOOLS,
    execute_web_search,
)
from app.core.gemini import LIVE_MODEL, get_genai_client
from app.services.capture_service import add_artifact_to_session

logger = logging.getLogger(__name__)

MIN_EXTRACTION_INTERVAL: float = 15.0
CONFIDENCE_THRESHOLD: float = 0.7
_MAX_TITLE_WORDS: int = 8


def _clamp_title(title: str) -> str:
    """Enforce max title length — truncate to _MAX_TITLE_WORDS words."""
    if not title:
        return title
    words = title.split()
    if len(words) > _MAX_TITLE_WORDS:
        return " ".join(words[:_MAX_TITLE_WORDS])
    return title

_SYSTEM_PROMPT_TEMPLATE = (
    "You are Rayan, a silent memory capture assistant co-listening to a live session with {name}.\n\n"
    "BEHAVIOR:\n"
    "- Stay silent while observing. Do NOT narrate, comment, or summarise unless asked.\n"
    "- Respond naturally when {name} addresses you directly (by name or with a question).\n"
    "- When you capture a concept, briefly acknowledge: 'Got it, {name} — [concept name] added to [room name].'\n"
    "- You are co-listening: you hear both the content being shared AND {name} speaking to you.\n\n"
    "EXISTING ROOMS IN {name}'s PALACE:\n"
    "{room_directory}\n\n"
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
    "  - enrichment: supplementary research or background material\n"
    "  EVENTS & DEADLINES:\n"
    "  - exam: upcoming exams, tests, or assessments with a scheduled date\n\n"
    "CAPTURING CONCEPTS:\n"
    "- Autonomous capture: When YOU identify a key concept worth remembering (confidence >= 0.7, "
    "at least 15 seconds since the last extraction), call `capture_concept`.\n"
    "- Direct user request: When the user EXPLICITLY asks you to save, add, capture, or remember "
    "something (e.g. 'add this', 'save that', 'remember this'), ALWAYS call `create_artifact` "
    "immediately — no confidence or time restrictions apply. Then verbally confirm: "
    "'Got it, {name} — [concept name] added to [room name].'\n"
    "- Do NOT repeat concepts already captured.\n\n"
    "FILLING TOOL FIELDS CORRECTLY — this is critical:\n"
    "- `title`: 3-7 words only. A short, noun-phrase label. Example: 'Feynman Technique for Learning'.\n"
    "- `summary`: 2-4 full sentences. Describe what was actually said — the key idea, context, and why it matters. "
    "NEVER put the full content in the title. NEVER leave the summary as a single word or fragment.\n"
    "- `full_content` (create_artifact only): The verbatim or detailed version of what was shared.\n\n"
    "NAVIGATING & INTERACTING WITH THE PALACE:\n"
    "- navigate_to_room: when your answer lives in a specific room, navigate there; use 'lobby' to return home.\n"
    "- navigate_to_map_view: toggle the bird's-eye overview map — use when {name} asks to see the map, overview, all rooms, or to exit back to first-person.\n"
    "- navigate_horizontal: when {name} wants to see more artifacts in the same room, move left or right.\n"
    "- highlight_artifact: when one artifact is the key answer, highlight it.\n"
    "- edit_artifact: when {name} wants to update, correct, or expand an existing memory — always confirm what to change before calling.\n"
    "- delete_artifact: when {name} explicitly asks to delete or forget a specific memory — always confirm the artifact name before calling.\n\n"
    "CREATING ROOMS:\n"
    "- Only call `create_room` when the topic is clearly distinct from ALL existing rooms listed above.\n"
    "- Do NOT create a room if a sufficiently similar one already exists — the system will route the "
    "artifact there automatically.\n"
    "- Call `create_room` when the user explicitly asks for a new room or when no existing room fits.\n"
    "- Immediately after `create_room` returns, call `capture_concept` (or `create_artifact` if user-requested) "
    "to save the content that triggered the new room into it.\n"
    "- After both calls, confirm verbally: 'Created a new room for [topic] and saved [concept], {name}.'\n\n"
    "CAPTURING SCREENSHOTS:\n"
    "- Call `take_screenshot` proactively whenever you see something visually significant on screen: "
    "a compelling diagram, a dense slide, a chart, a code snippet, a formula, a mind map, or any visual "
    "that captures an important concept better than words alone.\n"
    "- Prioritise moments where the visual IS the concept — not just decoration. Ask yourself: "
    "'Would {name} want this image on their palace wall?' If yes, capture it.\n"
    "- You may call `take_screenshot` independently of `capture_concept` — they complement each other. "
    "Capture the spoken idea with `capture_concept` AND the visual with `take_screenshot` when both apply.\n"
    "- Write a `title` that names what is shown (e.g. 'Transformer Attention Mechanism Diagram'). "
    "Write a `summary` that explains what the visual shows and why it matters (1-3 sentences).\n"
    "- Do NOT screenshot blank screens, menus, or transitional frames. Only capture when something meaningful is visible.\n"
    "- No time restriction applies to `take_screenshot` — call it as often as the content warrants.\n\n"
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
    full_content: Optional[str] = None


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
        self._display_name = display_name.split()[0] if display_name else "there"
        self._system_prompt: str = ""  # built in start() after room fetch
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
        self._last_created_room_id: Optional[str] = None  # set after create_room, consumed by next extraction
        self._pending_screenshot: Optional[asyncio.Future] = None  # awaited during take_screenshot

    async def start(self) -> None:
        room_directory = await self._build_room_directory()
        self._system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
            name=self._display_name,
            room_directory=room_directory,
        )
        self._task = asyncio.create_task(
            self._lifecycle(), name=f"capture-{self.session_id}"
        )
        logger.info("CaptureAgent started: sessionId=%s rooms=%s", self.session_id, room_directory[:80])

    async def _build_room_directory(self) -> str:
        try:
            from app.services.room_service import get_all_rooms
            rooms = await get_all_rooms(self.user_id)
        except Exception:
            logger.exception("Failed to fetch rooms for capture prompt: sessionId=%s", self.session_id)
            return "(no rooms yet)"
        if not rooms:
            return "(no rooms yet — artifacts will be placed in newly created rooms)"
        lines = []
        for r in rooms:
            kw = ", ".join(r.topicKeywords) if r.topicKeywords else "—"
            lines.append(f"- [{r.id}] {r.name} (keywords: {kw})")
        return "\n".join(lines)

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
            tools=[{"function_declarations": CAPTURE_LIVE_TOOLS}],
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
                await session.send(
                    input=genai_types.LiveClientContent(
                        turns=[genai_types.Content(
                            role="user",
                            parts=[genai_types.Part(text="[SESSION_START] Introduce yourself briefly to the user.")],
                        )],
                        turn_complete=True,
                    )
                )
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
                concept_title=_clamp_title(args.get("title", "")),
                concept_summary=args.get("summary", ""),
                concept_type=args.get("artifact_type", "lecture"),
                concept_keywords=list(args.get("keywords", [])),
                confidence=confidence,
            )
            await self._handle_extraction(event)
            room_name = event.categorization.room.name if event.categorization else "your palace"
            return f"concept captured and saved to room '{room_name}'"

        elif name == "create_artifact":
            summary = args.get("summary", "").strip()
            if not summary:
                return "Cannot save artifact: summary is required."
            title = _clamp_title((args.get("title", "") or summary[:60]).strip())
            full_content = args.get("full_content", "").strip() or None
            self._last_extraction_at = time.monotonic()
            event = ExtractionEvent(
                concept_title=title,
                concept_summary=summary,
                concept_type=args.get("artifact_type", "moment"),
                concept_keywords=list(args.get("keywords", [])),
                confidence=1.0,
                full_content=full_content,
            )
            try:
                await self._handle_extraction(event)
            except Exception:
                logger.exception("create_artifact failed: sessionId=%s", self.session_id)
                return "Failed to save artifact"
            room_name = event.categorization.room.name if event.categorization else "your palace"
            return f"artifact saved to room '{room_name}'"


        elif name == "create_room":
            room_name = args.get("name", "New Room")
            keywords = list(args.get("keywords", []))
            try:
                from app.services.room_service import add_lobby_door, create_room as svc_create_room
                from app.websocket.manager import manager as ws_manager
                new_room = await svc_create_room(self.user_id, room_name, keywords)
                new_door = await add_lobby_door(self.user_id, new_room.id)
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
                            "style": new_room.style,
                        }],
                        "artifactsAdded": [],
                        "connectionsAdded": [],
                        "lobbyDoorsAdded": [new_door],
                    },
                })
                self._last_created_room_id = new_room.id
                return f"Room '{room_name}' created with ID {new_room.id}"
            except Exception:
                logger.exception("create_room failed: sessionId=%s", self.session_id)
                return "Failed to create room"

        elif name == "navigate_to_room":
            from app.websocket.manager import manager as ws_manager
            room_id = args.get("room_id", "")
            if room_id == "lobby":
                await ws_manager.send(self.user_id, {"type": "live_tool_call", "tool": "navigate_to_room", "label": "Returning to the palace lobby", "payload": {"navigation": {"targetRoomId": "lobby", "highlightArtifacts": [], "enterRoom": True, "selectedArtifactId": None}}})
                return "Returned to the palace lobby"
            try:
                from app.services.room_service import get_room
                room = await get_room(self.user_id, room_id)
                room_name = room.name if room else room_id
            except Exception:
                room_name = room_id
            await ws_manager.send(self.user_id, {"type": "live_tool_call", "tool": "navigate_to_room", "label": f"Navigating to {room_name}", "payload": {"navigation": {"targetRoomId": room_id, "highlightArtifacts": [], "enterRoom": True, "selectedArtifactId": None}}})
            return f"Navigated to room {room_name}"

        elif name == "navigate_to_map_view":
            from app.websocket.manager import manager as ws_manager
            await ws_manager.send(self.user_id, {"type": "live_tool_call", "tool": "navigate_to_map_view", "label": "Toggling map overview", "payload": {"toggleMapView": True}})
            return "Map view toggled."

        elif name == "navigate_horizontal":
            from app.websocket.manager import manager as ws_manager
            direction = args.get("direction", "right").lower()
            if direction not in ["left", "right"]:
                direction = "right"
            await ws_manager.send(self.user_id, {"type": "live_tool_call", "tool": "navigate_horizontal", "label": f"Moving {direction}", "payload": {"navigation": {"moveHorizontal": direction}}})
            return f"Moved {direction}."

        elif name == "highlight_artifact":
            from app.websocket.manager import manager as ws_manager
            artifact_id = args.get("artifact_id", "")
            await ws_manager.send(self.user_id, {"type": "live_tool_call", "tool": "highlight_artifact", "label": "Highlighting artifact", "payload": {"artifactId": artifact_id}})
            return f"Highlighted artifact {artifact_id}"

        elif name == "edit_artifact":
            from app.services.artifact_service import update_artifact
            from app.websocket.manager import manager as ws_manager
            artifact_id = args.get("artifact_id", "").strip()
            new_summary = args.get("summary", "").strip() or None
            new_full_content = args.get("full_content", "").strip() or None
            if not artifact_id:
                return "Cannot edit artifact: artifact_id is required."
            if not new_summary and not new_full_content:
                return "Cannot edit artifact: at least one of summary or full_content must be provided."
            try:
                updated = await update_artifact(user_id=self.user_id, artifact_id=artifact_id, summary=new_summary, full_content=new_full_content)
                if updated is None:
                    return f"Artifact {artifact_id} not found."
                await ws_manager.send(self.user_id, {"type": "palace_update", "changes": {"roomsAdded": [], "artifactsAdded": [], "artifactsUpdated": [{"id": updated.id, "summary": updated.summary}], "connectionsAdded": []}})
                return f"Artifact {artifact_id} updated."
            except Exception:
                logger.exception("edit_artifact failed: sessionId=%s", self.session_id)
                return "Failed to edit artifact."

        elif name == "delete_artifact":
            from app.services.artifact_service import delete_artifact_by_id
            from app.websocket.manager import manager as ws_manager
            artifact_id = args.get("artifact_id", "")
            try:
                await delete_artifact_by_id(self.user_id, artifact_id)
                await ws_manager.send(self.user_id, {"type": "palace_update", "changes": {"roomsAdded": [], "artifactsAdded": [], "artifactsRemoved": [artifact_id], "connectionsAdded": []}})
                return f"Artifact {artifact_id} deleted."
            except Exception:
                logger.exception("delete_artifact failed: sessionId=%s", self.session_id)
                return "Failed to delete artifact."

        elif name == "take_screenshot":
            return await self._handle_screenshot(
                title=_clamp_title(args.get("title", "Screenshot")),
                summary=args.get("summary", ""),
                keywords=list(args.get("keywords", [])),
            )

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

    def resolve_screenshot(self, image_b64: str) -> None:
        """Called by the WS handler when the frontend returns a captured frame."""
        if self._pending_screenshot and not self._pending_screenshot.done():
            self._pending_screenshot.set_result(image_b64)

    async def _handle_screenshot(self, title: str, summary: str, keywords: list[str]) -> str:
        """Request a frame from the frontend, upload to GCS, create visual artifact."""
        import base64 as _base64
        import uuid as _uuid
        from datetime import UTC, datetime

        from app.agents.memory_architect import categorize_and_store
        from app.config import settings
        from app.core.firestore import get_firestore_client
        from app.core.storage import get_storage_client
        from app.services.room_service import add_lobby_door
        from app.websocket.manager import manager as ws_manager

        # Ask the frontend to grab a frame
        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_screenshot = fut
        await ws_manager.send(self.user_id, {
            "type": "capture_screenshot_request",
            "sessionId": self.session_id,
        })

        try:
            image_b64 = await asyncio.wait_for(fut, timeout=15.0)
        except asyncio.TimeoutError:
            logger.warning("Screenshot timed out: sessionId=%s", self.session_id)
            return "Screenshot timed out — no frame received from client"
        finally:
            self._pending_screenshot = None

        if not image_b64:
            return "Screenshot failed — empty frame received"

        # Upload to GCS
        try:
            image_bytes = _base64.b64decode(image_b64)
            blob_path = f"screenshots/{self.session_id}/{_uuid.uuid4().hex}.jpg"
            bucket = get_storage_client().bucket(settings.media_bucket)
            blob = bucket.blob(blob_path)
            blob.upload_from_string(image_bytes, content_type="image/jpeg")
            blob.make_public()
            image_url = blob.public_url
        except Exception:
            logger.exception("Screenshot GCS upload failed: sessionId=%s", self.session_id)
            return "Screenshot captured but upload to storage failed"

        # Categorize and store as a visual artifact
        try:
            force_room_id = self._last_created_room_id
            self._last_created_room_id = None
            result = await categorize_and_store(
                user_id=self.user_id,
                session_id=self.session_id,
                concept_title=title,
                concept_summary=summary,
                concept_type="visual",
                concept_keywords=keywords,
                concept_confidence=1.0,
                captured_at=datetime.now(UTC),
                force_room_id=force_room_id,
            )

            # Patch sourceMediaUrl directly in Firestore
            db = get_firestore_client()
            await (
                db.collection("users")
                .document(self.user_id)
                .collection("rooms")
                .document(result.room.id)
                .collection("artifacts")
                .document(result.artifact.id)
                .update({"sourceMediaUrl": image_url})
            )
            result.artifact.sourceMediaUrl = image_url

            # Track extraction
            event = ExtractionEvent(
                concept_title=title,
                concept_summary=summary,
                concept_type="visual",
                concept_keywords=keywords,
                confidence=1.0,
            )
            event.categorization = result
            self._extractions.append(event)
            await add_artifact_to_session(self.user_id, self.session_id, result.artifact.id)

            # Add lobby door for new rooms
            lobby_doors_added = []
            rooms_added = []
            if result.action == "suggested_new":
                rooms_added = [{
                    "id": result.room.id,
                    "name": result.room.name,
                    "position": {"x": result.room.position.x, "y": result.room.position.y, "z": result.room.position.z},
                    "style": result.room.style,
                }]
                try:
                    door = await add_lobby_door(self.user_id, result.room.id)
                    lobby_doors_added = [door]
                except Exception:
                    logger.exception("add_lobby_door failed for screenshot room: sessionId=%s", self.session_id)

            # Broadcast palace_update — include sourceMediaUrl so the framed image renders
            await ws_manager.send(self.user_id, {
                "type": "palace_update",
                "changes": {
                    "roomsAdded": rooms_added,
                    "artifactsAdded": [{
                        "id": result.artifact.id,
                        "roomId": result.artifact.roomId,
                        "type": result.artifact.type.value,
                        "position": {"x": result.artifact.position.x, "y": result.artifact.position.y, "z": result.artifact.position.z},
                        "visual": result.artifact.visual.value,
                        "summary": result.artifact.summary,
                        "sourceMediaUrl": image_url,
                        "wall": result.artifact.wall,
                    }],
                    "connectionsAdded": [],
                    "lobbyDoorsAdded": lobby_doors_added,
                },
            })

            logger.info(
                "Screenshot saved: userId=%s sessionId=%s artifactId=%s url=%s",
                self.user_id, self.session_id, result.artifact.id, image_url,
            )
            return f"Screenshot saved as visual artifact in room '{result.room.name}'"
        except Exception:
            logger.exception("Screenshot artifact creation failed: sessionId=%s", self.session_id)
            return "Screenshot uploaded but artifact creation failed"

    async def _handle_extraction(self, event: ExtractionEvent) -> None:
        # Consume the pending room ID so the artifact lands in the just-created room
        force_room_id = self._last_created_room_id
        self._last_created_room_id = None
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
                force_room_id=force_room_id,
                full_content=event.full_content,
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
