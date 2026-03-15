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
MERGE_SIMILARITY_THRESHOLD: float = 0.90


def _normalize_title_summary(title: str, summary: str) -> tuple[str, str]:
    """Rescue content when the model stuffs everything into the title.

    If title is longer than _MAX_TITLE_WORDS AND summary is thin (<10 words),
    the overflow words from the title become the summary so no content is lost.
    """
    if not title:
        return title, summary
    words = title.split()
    if len(words) <= _MAX_TITLE_WORDS:
        return title, summary
    short_title = " ".join(words[:_MAX_TITLE_WORDS])
    overflow = " ".join(words[_MAX_TITLE_WORDS:])
    if not summary or len(summary.split()) < 10:
        summary = overflow + (" " + summary if summary else "")
    return short_title, summary.strip()


def _clamp_title(title: str) -> str:
    """Clamp title to _MAX_TITLE_WORDS words (no summary rescue)."""
    if not title:
        return title
    words = title.split()
    if len(words) > _MAX_TITLE_WORDS:
        return " ".join(words[:_MAX_TITLE_WORDS])
    return title

_SYSTEM_PROMPT_TEMPLATE = """
You are Rayan, a silent memory capture assistant co-listening to a live session with {name}.
BEHAVIOR:
- Stay silent while observing. Do NOT narrate, comment, or summarise unless asked.
- Respond naturally when {name} addresses you directly (by name or with a question).
- You are co-listening: you hear both the content being shared AND {name} speaking to you.

SESSION CONTEXT:
- At the very start of each session, greet {name} warmly, I will try to be silent and listen to you, and ask ONE short question to understand their context: what they are doing or where they are. Examples: 'Are you in a lecture, a meeting, working on something, or just out and about?' Listen to their answer and use it to calibrate everything — the artifact types you pick, the concepts you prioritise, how actively you capture.


EXISTING ROOMS IN {name}'s PALACE: 
{room_directory} 

ARTIFACT TYPES (use with create_artifact):
  KNOWLEDGE & LEARNING:
  - lecture      → educational talks, classes, presentations    (hologram frame)
  - document     → notes, articles, written text               (floating book)
  - lesson       → structured lessons, tutorials, how-tos      (lesson model)
  - insight      → realizations, aha moments, key takeaways    (brain model)
  - question     → open questions, things to explore           (question model)
  EXPERIENCES & EMOTIONS:
  - moment       → a specific personal memory or experience    (coffee model)
  - milestone    → life events, achievements, transitions      (milestone model)
  - emotion      → feelings or emotional states                (heart model)
  - dream        → long-term aspirations, deep wishes          (dream model)
  - habit        → recurring behaviors, routines               (tree model)
  OPINIONS & IDENTITY:
  - conversation → discussions, interviews, dialogues          (speech bubble)
  - opinion      → views, stances, beliefs on a topic          (opinion model)
  - visual       → images, diagrams, visual content            (framed image)
  - media        → music, podcasts, films that resonated       (headphones model)
  GOALS:
  - goal         → aspirations, objectives, things to achieve  (cash stack model)
  - enrichment   → research or supplementary material          (crystal orb)

WRITING SUMMARIES:
- NEVER write summaries in first or second person. Do NOT use phrases like "you mentioned", "you spoke about", "you discussed", "the user said", etc.
- Write summaries as objective, factual descriptions of the concept itself. Example: "Bias mitigation in ML pipelines involves…" not "You mentioned that bias mitigation…"
- The source of information does not matter — whether the user spoke it or it came from a lecture, video, or screen — the summary should always describe the content, not attribute it.

CAPTURING CONCEPTS:
- Autonomous capture: When YOU identify a key concept worth remembering (confidence >= 0.7, at least 40 seconds since the last extraction), call `capture_concept`.
- Direct user request: When the user EXPLICITLY asks you to save, add, capture, or remember something (e.g. 'add this', 'save that', 'remember this'), ALWAYS call `create_artifact` immediately — no confidence or time restrictions apply. Then verbally confirm: 'Got it, {name} — [concept name] added to [room name].'
- SMART MERGE: The system automatically detects near-duplicate concepts. If you call `capture_concept` for a topic already captured this session, the new information will be MERGED into the existing artifact rather than creating a duplicate — the summary is updated and the new content is appended. So: do NOT hold back if new, meaningful details emerge on a topic already saved. DO hold back if nothing genuinely new has been said (same point repeated verbatim).
- edit_artifact: when you are confused that an existent memory already can be updated instead of creating new one, call it.

CREATING ROOMS:
- `capture_concept` AUTOMATICALLY creates a new room when no existing room fits — you do NOT need to call `create_room` before capturing. Just call `capture_concept` and the system handles room placement.
- Only call `create_room` explicitly when the user directly asks for a specific named room (e.g. "create a room called X").
- If you do call `create_room`, immediately follow it with `capture_concept` to place the triggering content into it.
- NEVER call both `create_room` and `capture_concept` for the same concept unless the user explicitly named the room — doing so creates a duplicate empty room.

CAPTURING SCREENSHOTS:
- Call `take_screenshot` proactively whenever you see something visually significant on screen: a compelling diagram, a dense slide, a chart, a code snippet, a formula, a mind map, or any visual that captures an important concept better than words alone.
- Prioritise moments where the visual IS the concept — not just decoration. Ask yourself: 'Would {name} want this image on their palace wall?' If yes, capture it.
- You may call `take_screenshot` independently of `capture_concept` — they complement each other. Capture the spoken idea with `capture_concept` AND the visual with `take_screenshot` when both apply.
- Do NOT screenshot blank screens, menus, or transitional frames. Only capture when something meaningful is visible.
- No time restriction applies to `take_screenshot` — call it as often as the content warrants.

ENDING THE SESSION:
- Call `close_session` when the user asks to close, finish, or stop the capture session.
"""

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
        # (artifact_id, room_id, title, embedding) — used for within-session dedup
        self._session_embeddings: list[tuple[str, str, str, list[float]]] = []
        # Set to True when capture_concept auto-creates a room inside categorize_and_store.
        # Cleared after the next create_room check so only ONE consecutive duplicate is skipped.
        self._skip_next_create_room: bool = False

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

    async def send_frame(self, jpeg_bytes: bytes) -> None:
        """Send a JPEG video frame to Gemini Live via send_realtime_input(video=...)."""
        if self._session and not self._closed:
            try:
                await self._session.send_realtime_input(
                    video=genai_types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
                )
            except Exception:
                logger.exception("send_frame error: sessionId=%s", self.session_id)

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
                            parts=[genai_types.Part(text="[SESSION_START] Greet the user warmly with one sentence, then immediately ask them one short question to understand their current context — what they are doing or where they are (e.g. a lecture, meeting, working on something, screen session, or just out). Keep it natural and brief.")],
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
                            function_responses.append(genai_types.FunctionResponse(
                                id=fn_call.id,
                                name=fn_call.name,
                                response={"result": result},
                            ))
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
            title, summary = _normalize_title_summary(
                args.get("title", ""), args.get("summary", "")
            )
            event = ExtractionEvent(
                concept_title=title,
                concept_summary=summary,
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
            title = args.get("title", "").strip()
            keywords = list(args.get("keywords", []))
            full_content = args.get("full_content", "").strip() or None
            artifact_type_str = args.get("artifact_type", "conversation")

            try:
                from app.services.room_service import add_lobby_door
                from app.websocket.manager import manager as ws_manager

                result = await categorize_and_store(
                    user_id=self.user_id,
                    session_id=None,
                    concept_title=title,
                    concept_summary=summary,
                    concept_type=artifact_type_str,
                    concept_keywords=keywords,
                    concept_confidence=1.0,
                    full_content=full_content,
                )
                artifact = result.artifact
                room = result.room

                rooms_added: list[dict] = []
                lobby_doors_added: list[dict] = []
                if result.action == "suggested_new":
                    rooms_added = [{
                        "id": room.id,
                        "name": room.name,
                        "position": {"x": room.position.x, "y": room.position.y, "z": room.position.z},
                        "style": room.style,
                    }]
                    lobby_doors_added = [await add_lobby_door(self.user_id, room.id)]

                await ws_manager.send(self.user_id, {
                    "type": "palace_update",
                    "changes": {
                        "roomsAdded": rooms_added,
                        "artifactsAdded": [{
                            "id": artifact.id,
                            "roomId": artifact.roomId,
                            "type": artifact.type.value,
                            "position": {"x": artifact.position.x, "y": artifact.position.y, "z": artifact.position.z},
                            "visual": artifact.visual.value,
                            "title": artifact.title,
                            "summary": artifact.summary,
                        }],
                        "connectionsAdded": [],
                        "lobbyDoorsAdded": lobby_doors_added,
                    },
                })
                await self._send_capture_event(f"Saved: {artifact.title or summary[:40]}", "create_artifact")
                logger.info(
                    "[CaptureAgent] Artifact saved: userId=%s artifactId=%s roomId=%s action=%s",
                    self.user_id, artifact.id, room.id, result.action,
                )
                return f"Artifact saved in room '{room.name}' (action={result.action}): id={artifact.id}"
            except Exception:
                logger.exception("create_artifact failed for userId=%s", self.user_id)
                return "Failed to save artifact"


        elif name == "create_room":
            room_name = args.get("name", "New Room")
            keywords = list(args.get("keywords", []))
            # Guard: if capture_concept just auto-created a room in the same tool batch,
            # skip this create_room to prevent a duplicate empty room.
            if self._skip_next_create_room:
                self._skip_next_create_room = False
                logger.info(
                    "[CaptureAgent] Skipping create_room — capture_concept already auto-created a room: "
                    "sessionId=%s skipped_name=%r",
                    self.session_id, room_name,
                )
                return "Room was already auto-created by the preceding capture_concept call. No new room needed."
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
                await self._send_capture_event(f"Room created: {room_name}", "create_room")

                # Inform Gemini about the new room so it's aware for the rest of the session
                if self._session and not self._closed:
                    try:
                        await self._session.send_client_content(
                            turns=[
                                genai_types.Content(role="user", parts=[genai_types.Part(text=f"[ROOM CREATED] A new room '{room_name}' (ID: {new_room.id}) has been added to the palace. The next concept you capture will be placed here automatically.")]),
                                genai_types.Content(role="model", parts=[genai_types.Part(text=f"Understood. Room '{room_name}' is ready. I'll place the next captured concept into it.")]),
                            ],
                            turn_complete=False,
                        )
                    except Exception:
                        logger.exception("Context injection failed after create_room: sessionId=%s", self.session_id)

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
                await self._send_capture_event(f"Updated: {updated.title or artifact_id}", "edit_artifact")
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
                await self._send_capture_event("Artifact deleted", "delete_artifact")
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
            query = args.get("query", "")
            result = await execute_web_search(query)
            await self._send_capture_event(f"Web search: {query[:40]}", "web_search")
            return result

        elif name in ("end_session", "close_session"):
            await self._send_capture_event("Session closing…", "close_session")
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
                        "title": result.artifact.title,
                        "summary": result.artifact.summary,
                        "sourceMediaUrl": image_url,
                        "wall": result.artifact.wall,
                    }],
                    "connectionsAdded": [],
                    "lobbyDoorsAdded": lobby_doors_added,
                },
            })

            await self._send_capture_event(f"Screenshot: {title}", "take_screenshot")
            logger.info(
                "Screenshot saved: userId=%s sessionId=%s artifactId=%s url=%s",
                self.user_id, self.session_id, result.artifact.id, image_url,
            )
            return f"Screenshot saved as visual artifact in room '{result.room.name}'"
        except Exception:
            logger.exception("Screenshot artifact creation failed: sessionId=%s", self.session_id)
            return "Screenshot uploaded but artifact creation failed"

    # ── Dedup / merge helpers ──────────────────────────────────────────────────

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _find_similar_session_artifact(
        self, embedding: list[float]
    ) -> tuple[str, str, str] | None:
        """Return (artifact_id, room_id, title) of the most similar session artifact, or None."""
        best_id = best_room_id = best_title = None
        best_sim = MERGE_SIMILARITY_THRESHOLD
        for artifact_id, room_id, title, cached_emb in self._session_embeddings:
            sim = self._cosine_similarity(embedding, cached_emb)
            if sim >= best_sim:
                best_sim = sim
                best_id = artifact_id
                best_room_id = room_id
                best_title = title
        if best_id is not None:
            return best_id, best_room_id, best_title  # type: ignore[return-value]
        return None

    async def _merge_into_artifact(
        self,
        artifact_id: str,
        room_id: str,
        existing_title: str,
        event: ExtractionEvent,
    ) -> None:
        """Append new concept info into an existing artifact instead of creating a duplicate."""
        from app.services.artifact_service import get_artifact, update_artifact
        from app.websocket.manager import manager as ws_manager

        current = await get_artifact(self.user_id, room_id, artifact_id)
        if current is None:
            logger.warning(
                "Merge target not found, skipping: userId=%s artifactId=%s",
                self.user_id, artifact_id,
            )
            return

        # Append new info as a clearly delimited section
        new_section = f"\n\n---\n**{event.concept_title}**\n{event.concept_summary}"
        if event.full_content:
            new_section += f"\n\n{event.full_content}"
        merged_full_content = (current.fullContent or current.summary) + new_section

        updated = await update_artifact(
            user_id=self.user_id,
            artifact_id=artifact_id,
            summary=event.concept_summary,
            full_content=merged_full_content,
        )
        if updated is None:
            logger.warning("Merge update returned None: artifactId=%s", artifact_id)
            return

        # Show in capture panel conversation log
        await self._send_capture_event(f"Updated: {existing_title}", "merge_concept")

        # Propagate change to the 3D palace
        await ws_manager.send(self.user_id, {
            "type": "palace_update",
            "changes": {
                "roomsAdded": [],
                "artifactsAdded": [],
                "artifactsUpdated": [{
                    "id": updated.id,
                    "title": updated.title,
                    "summary": updated.summary,
                    "fullContent": updated.fullContent,
                }],
                "connectionsAdded": [],
            },
        })

        await add_artifact_to_session(self.user_id, self.session_id, artifact_id)
        logger.info(
            "[CaptureAgent] Concept merged into existing artifact: userId=%s artifactId=%s existingTitle=%r",
            self.user_id, artifact_id, existing_title,
        )

    async def _handle_extraction(self, event: ExtractionEvent) -> None:
        # Consume the pending room ID so the artifact lands in the just-created room
        force_room_id = self._last_created_room_id
        self._last_created_room_id = None

        # ── Within-session dedup check ────────────────────────────────────────
        # Skip when a specific room is forced (e.g. right after create_room) so
        # intentional re-categorisation is never suppressed.
        if not force_room_id and self._session_embeddings:
            try:
                from app.services.embedding_service import get_embedding
                embed_text = event.concept_title + ". " + event.concept_summary
                new_embedding = await get_embedding(embed_text)
                match = self._find_similar_session_artifact(new_embedding)
                if match:
                    artifact_id, room_id, existing_title = match
                    logger.info(
                        "[CaptureAgent] Near-duplicate detected (merging): userId=%s "
                        "artifactId=%s title=%r → %r",
                        self.user_id, artifact_id, event.concept_title, existing_title,
                    )
                    await self._merge_into_artifact(artifact_id, room_id, existing_title, event)
                    self._extractions.append(event)
                    return
            except Exception:
                logger.exception(
                    "Dedup check failed (proceeding with normal extraction): sessionId=%s",
                    self.session_id,
                )

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
            # If categorize_and_store auto-created a room, flag it so that a redundant
            # explicit create_room call in the same tool batch gets skipped.
            if result.action == "suggested_new" and not force_room_id:
                self._skip_next_create_room = True
            # Cache embedding so future extractions can dedup against this one
            if result.artifact.embedding:
                self._session_embeddings.append((
                    result.artifact.id,
                    result.artifact.roomId,
                    result.artifact.title or event.concept_title,
                    result.artifact.embedding,
                ))
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

    async def _send_capture_event(self, label: str, tool: str) -> None:
        """Send a capture_tool_event so the left panel shows a badge for this action."""
        from app.websocket.manager import manager as ws_manager
        await ws_manager.send(self.user_id, {
            "type": "capture_tool_event",
            "tool": tool,
            "label": label,
        })

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
