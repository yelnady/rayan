"""LiveSessionManager — persistent Gemini Live API sessions per user.

Manages a long-lived streaming connection to Gemini Live for each user.
Audio is forwarded via send_realtime_input (not send() with LiveClientRealtimeInput).
Gemini's built-in VAD handles turn detection; the receive loop dispatches
audio/text/interruption events back to the caller via callbacks.

Architecture: The `async with client.aio.live.connect(...)` context manager owns the
underlying websocket. We run the entire session lifecycle (connect → receive loop →
close) inside a single background task so the `async with` block stays alive for the
duration of the session. An asyncio.Event signals when to shut down.

Tool calling: Gemini may call navigate_to_room, highlight_artifact, or create_diagram.
Each tool call is executed by _execute_tool() and a live_tool_call WS notification
is sent to the frontend before the tool response is returned to Gemini.
"""

import asyncio
import base64
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Awaitable, Callable, Optional

from google.genai import types as genai_types

from app.core.gemini import LIVE_MODEL, get_genai_client
from app.services.search_service import SearchResult, semantic_search

logger = logging.getLogger(__name__)

# ── Callback types ─────────────────────────────────────────────────────────────

OnAudioChunk = Callable[[str], Awaitable[None]]        # base64 audio
OnTextChunk = Callable[[str], Awaitable[None]]          # transcript text
OnInterrupted = Callable[[], Awaitable[None]]
OnTurnComplete = Callable[[], Awaitable[None]]
OnUserText = Callable[[str], Awaitable[None]]           # user speech transcript
OnToolActivity = Callable[[str, dict], Awaitable[None]] # (tool_name, payload)


@dataclass
class LiveSession:
    user_id: str
    session: object  # genai AsyncSession, set once connected
    task: asyncio.Task  # the background task running the session lifecycle
    close_event: asyncio.Event  # signal to shut down
    ready_event: asyncio.Event  # signaled when session is connected
    current_room_id: Optional[str] = field(default=None)
    _closed: bool = field(default=False, init=False)


# ── Tool stubs (used only for schema generation by the Gemini SDK) ─────────────

def navigate_to_room(room_id: str) -> str:
    """Navigate the user to a specific room in their memory palace, or back to the lobby.

    Args:
        room_id: The exact room ID from the ROOM DIRECTORY to navigate to,
                 or "lobby" to return to the main palace lobby.
    """
    return ""


def highlight_artifact(artifact_id: str) -> str:
    """Highlight a specific artifact in the memory palace to draw the user's attention to it.

    Args:
        artifact_id: The exact artifact ID from MEMORIES to highlight.
    """
    return ""


def save_artifact(artifact_type: str, summary: str, full_content: str = "") -> str:
    """Save a new artifact to the current room in the memory palace and store it permanently.

    Use this when the user shares knowledge, a concept, or information they want to remember.

    Args:
        artifact_type: Type of artifact. Must be one of:
            - "lecture"      → a lesson, class, or educational talk (shown as hologram frame)
            - "document"     → a text document, note, or article (shown as floating book)
            - "visual"       → an image, diagram, or visual content (shown as framed image)
            - "conversation" → a discussion, interview, or dialogue (shown as speech bubble)
            - "enrichment"   → supplementary or research material (shown as crystal orb)
        summary: A concise summary of what this artifact contains (required).
        full_content: The full detailed content of the artifact (optional but recommended).
    """
    return ""


def end_session() -> str:
    """End the current voice session when the user asks to stop, disconnect, or end the conversation."""
    return ""


def close_artifact() -> str:
    """Close the currently open artifact detail modal or memory view."""
    return ""


# ── System prompt ──────────────────────────────────────────────────────────────

_BASE_SYSTEM_PROMPT = """\
You are Rayan, a knowledgeable memory recall assistant. You help users explore \
and understand their stored memories in the Memory Palace.

Today's date is {current_date}.

ROOM DIRECTORY (use these exact IDs with navigate_to_room):
{room_directory}

RULES:
- ONLY use information from the provided MEMORIES section below.
- If you don't have relevant memories say "I don't have that in your palace yet."
- NEVER hallucinate or invent information.
- Cite which artifact/room the information comes from.
- Keep responses conversational but informative (under 60 seconds unless asked).

RESPONSE STRUCTURE:
1. Brief direct answer (1-2 sentences)
2. Supporting details from memories (2-3 sentences)
3. Source citation ("This is from your [topic] session on [date]")

ARTIFACT TYPES (use with save_artifact):
- lecture      → educational talks, classes, lessons        (visual: hologram frame)
- document     → notes, articles, text documents            (visual: floating book)
- visual       → images, diagrams, visual content           (visual: framed image)
- conversation → discussions, interviews, dialogues         (visual: speech bubble)
- enrichment   → research, supplementary material           (visual: crystal orb)

TOOLS — use them proactively when relevant:
- navigate_to_room: when your answer lives in a specific room, navigate there
- highlight_artifact: when one artifact is the key answer, highlight it
- save_artifact: when the user shares something they want to remember, save it
- end_session: call this IMMEDIATELY as soon as the user expresses a clear intent to stop, disconnect, or end the conversation. Do not wait for further confirmation.

MEMORIES:
{memories}
"""


async def _build_room_directory(user_id: str) -> str:
    from app.services.room_service import get_all_rooms
    try:
        rooms = await get_all_rooms(user_id)
    except Exception:
        return "(unavailable)"
    if not rooms:
        return "(no rooms yet)"
    lines = [f"- [{r.id}] {r.name}: {r.summary or '(no summary yet)'}" for r in rooms]
    return "\n".join(lines)


def _build_system_prompt(results: list[SearchResult], room_directory: str = "") -> str:
    current_date = datetime.now(UTC).strftime("%Y-%m-%d")
    if not results:
        return _BASE_SYSTEM_PROMPT.format(
            current_date=current_date,
            room_directory=room_directory or "(unavailable)",
            memories="(none found)",
        )
    lines: list[str] = []
    for r in results:
        captured_str = r.captured_at.strftime("%Y-%m-%d") if r.captured_at else "unknown"
        lines.append(
            f"[ARTIFACT {r.artifact_id} | Room: {r.room_name} | Captured: {captured_str} | Similarity: {r.similarity:.2f}]\n"
            f"Summary: {r.summary}"
        )
        if r.full_content:
            lines.append(f"Full content: {r.full_content[:800]}")
        lines.append("")
    return _BASE_SYSTEM_PROMPT.format(
        current_date=current_date,
        room_directory=room_directory or "(unavailable)",
        memories="\n".join(lines),
    )


# ── Manager ────────────────────────────────────────────────────────────────────

class LiveSessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, LiveSession] = {}

    async def start_session(
        self,
        user_id: str,
        context: dict,
        on_audio: OnAudioChunk,
        on_text: OnTextChunk,
        on_interrupted: OnInterrupted,
        on_turn_complete: OnTurnComplete,
        on_user_text: Optional[OnUserText] = None,
        on_tool_activity: Optional[OnToolActivity] = None,
    ) -> None:
        """Open a persistent Gemini Live connection for the user."""
        # Close any existing session first
        await self.close_session(user_id)

        # Retrieve memory context and room directory in parallel
        room_id: Optional[str] = context.get("currentRoomId")
        artifact_id: Optional[str] = context.get("focusedArtifactId")
        logger.info(
            "[LiveSession] Starting for userId=%s | currentRoomId=%s | focusedArtifactId=%s",
            user_id, room_id, artifact_id,
        )
        results, room_directory = await asyncio.gather(
            _retrieve_context(user_id, room_id, artifact_id),
            _build_room_directory(user_id),
        )
        if results:
            logger.info(
                "[LiveSession] ✅ %d memory artifact(s) attached to system prompt:",
                len(results),
            )
            for r in results:
                logger.info(
                    "  • [%s] room=%s | similarity=%.2f | captured=%s | summary=%s",
                    r.artifact_id, r.room_name, r.similarity,
                    r.captured_at.strftime("%Y-%m-%d") if r.captured_at else "unknown",
                    (r.summary or "")[:120],
                )
        else:
            logger.warning(
                "[LiveSession] ⚠️  No memories attached — system prompt will have empty context. "
                "(focusedArtifactId=%s is required for retrieval)",
                artifact_id,
            )
        logger.info("[LiveSession] Room directory built: %d room(s)", room_directory.count("\n- [") + (1 if "- [" in room_directory else 0))

        # Start the session immediately with basic prompt, retrieve context asynchronously
        system_prompt = _build_system_prompt([], room_directory)

        config = genai_types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            enable_affective_dialog=True,
            system_instruction=system_prompt,
            tools=[navigate_to_room, highlight_artifact, save_artifact, end_session, close_artifact],
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

        close_event = asyncio.Event()
        ready_event = asyncio.Event()

        # Placeholder — session ref gets filled by the background task
        live = LiveSession(
            user_id=user_id,
            session=None,
            task=None,  # type: ignore[arg-type]
            close_event=close_event,
            ready_event=ready_event,
            current_room_id=room_id,
        )
        self._sessions[user_id] = live

        # Launch the background task that holds the `async with` context alive
        task = asyncio.create_task(
            self._session_lifecycle(
                live, config, on_audio, on_text, on_interrupted, on_turn_complete,
                on_user_text, on_tool_activity,
            ),
            name=f"live-session-{user_id}",
        )
        live.task = task

        # Wait until the session is actually connected (or failed)
        try:
            await asyncio.wait_for(ready_event.wait(), timeout=15.0)
        except asyncio.TimeoutError:
            logger.error("Live session timed out connecting for userId=%s", user_id)
            await self.close_session(user_id)
            raise RuntimeError("Live session connection timed out")

        if live.session is None:
            # Connection failed inside the task
            self._sessions.pop(user_id, None)
            raise RuntimeError("Live session failed to connect")

        logger.info("Live session started for userId=%s", user_id)

        # Inject initial room context and semantic memories asynchronously
        asyncio.create_task(self.update_context(user_id, room_id, artifact_id))

    async def send_audio(self, user_id: str, audio_bytes: bytes) -> None:
        """Forward a PCM audio chunk to Gemini."""
        live = self._sessions.get(user_id)
        if not live or live._closed or live.session is None:
            return
        try:
            await live.session.send_realtime_input(
                audio=genai_types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
            )
        except Exception as exc:
            if "ConnectionClosed" in type(exc).__name__:
                logger.debug("send_audio: session already closed for userId=%s, ignoring", user_id)
                live._closed = True
            else:
                logger.exception("send_audio error for userId=%s", user_id)

    async def close_session(self, user_id: str) -> None:
        """Signal the session task to shut down and wait for cleanup."""
        live = self._sessions.pop(user_id, None)
        if not live:
            return
        live._closed = True
        live.close_event.set()
        if live.task and not live.task.done():
            live.task.cancel()
            try:
                await live.task
            except (asyncio.CancelledError, Exception):
                pass
        logger.info("Live session closed for userId=%s", user_id)

    def has_session(self, user_id: str) -> bool:
        return user_id in self._sessions

    async def update_context(
        self,
        user_id: str,
        room_id: Optional[str],
        artifact_id: Optional[str] = None
    ) -> None:
        """Inject updated room artifacts and semantic context mid-conversation."""
        live = self._sessions.get(user_id)
        if not live or live._closed or live.session is None:
            return

        live.current_room_id = room_id
        
        # Load room artifacts and semantic context in parallel
        artifacts_text_task = _load_room_context_text(user_id, room_id)
        semantic_context_task = _retrieve_context(user_id, room_id, artifact_id)
        
        artifacts_text, results = await asyncio.gather(artifacts_text_task, semantic_context_task)

        if room_id:
            intro = "[ROOM CONTEXT UPDATE] The user is now in a room."
        else:
            intro = "[ROOM CONTEXT UPDATE] The user is in the palace lobby."

        context_msg = f"{intro}\n\n{artifacts_text}\n\n"
        
        if artifact_id:
            context_msg += f"The user is specifically looking at ARTIFACT ID: {artifact_id}.\n"
            
        if results:
            context_msg += "Here are some relevant memories related to what the user is seeing:\n"
            for r in results:
                captured_str = r.captured_at.strftime("%Y-%m-%d") if r.captured_at else "unknown"
                context_msg += (
                    f"- [{r.artifact_id} in {r.room_name}]: {r.summary} (Captured: {captured_str})\n"
                )
        
        context_msg += "\nUse this context to answer questions or provide narration if the user asks."

        try:
            await live.session.send_client_content(
                turns=[
                    genai_types.Content(role="user", parts=[genai_types.Part(text=context_msg)]),
                    genai_types.Content(role="model", parts=[genai_types.Part(text="Understood. I have updated my context with the current room details and relevant memories.")]),
                ],
                turn_complete=False,
            )
            logger.info("[LiveSession] Context updated for userId=%s roomId=%s artifactId=%s", user_id, room_id, artifact_id)
        except Exception:
            logger.exception("Context update failed for userId=%s roomId=%s", user_id, room_id)

    async def _execute_tool(
        self,
        user_id: str,
        fn_name: str,
        fn_args: dict,
        on_tool_activity: Optional[OnToolActivity],
    ) -> str:
        """Execute a tool call from Gemini, notify the frontend, return the result string."""
        logger.info("[LiveSession] Tool call: %s args=%s userId=%s", fn_name, fn_args, user_id)

        async def notify(payload: dict) -> None:
            if on_tool_activity:
                await on_tool_activity(fn_name, payload)

        if fn_name == "navigate_to_room":
            room_id = fn_args.get("room_id", "")
            if room_id == "lobby":
                await notify({
                    "label": "Returning to the palace lobby",
                    "navigation": {
                        "targetRoomId": "lobby",
                        "highlightArtifacts": [],
                        "enterRoom": True,
                        "selectedArtifactId": None,
                    },
                })
                return "Returned to the palace lobby"
            try:
                from app.services.room_service import get_room
                room = await get_room(user_id, room_id)
                room_name = room.name if room else room_id
            except Exception:
                room_name = room_id
            await notify({
                "label": f"Navigating to {room_name}",
                "navigation": {
                    "targetRoomId": room_id,
                    "highlightArtifacts": [],
                    "enterRoom": True,
                    "selectedArtifactId": None,
                },
            })
            return f"Navigated to room {room_name}"

        elif fn_name == "highlight_artifact":
            artifact_id = fn_args.get("artifact_id", "")
            live = self._sessions.get(user_id)
            # Sync memory automatically when highlighting
            await self.update_context(user_id, live.current_room_id if live else None, artifact_id)
            
            await notify({
                "label": "Highlighting artifact",
                "artifactId": artifact_id,
            })
            return f"Highlighted artifact {artifact_id}. I have also loaded its full content into my memory."

        elif fn_name == "save_artifact":
            live = self._sessions.get(user_id)
            room_id = live.current_room_id if live else None
            if not room_id:
                return "Cannot save artifact: no room selected. Ask the user to navigate to a room first."
            summary = fn_args.get("summary", "").strip()
            if not summary:
                return "Cannot save artifact: summary is required."
            full_content = fn_args.get("full_content", "").strip() or None
            artifact_type_str = fn_args.get("artifact_type", "conversation")

            await notify({"label": f"Saving: {summary[:50]}…"})
            try:
                from app.models.artifact import ArtifactType
                from app.services.artifact_service import create_artifact
                from app.websocket.manager import manager as ws_manager
                try:
                    artifact_type = ArtifactType(artifact_type_str)
                except ValueError:
                    artifact_type = ArtifactType.conversation

                artifact = await create_artifact(
                    user_id=user_id,
                    room_id=room_id,
                    artifact_type=artifact_type,
                    summary=summary,
                    full_content=full_content,
                )
                # Push palace_update so the artifact appears immediately in the 3D scene
                await ws_manager.send(user_id, {
                    "type": "palace_update",
                    "changes": {
                        "roomsAdded": [],
                        "artifactsAdded": [{
                            "id": artifact.id,
                            "roomId": artifact.roomId,
                            "type": artifact.type.value,
                            "position": {"x": artifact.position.x, "y": artifact.position.y, "z": artifact.position.z},
                            "visual": artifact.visual.value,
                            "summary": artifact.summary,
                        }],
                        "connectionsAdded": [],
                    },
                })
                # Refresh Gemini's context so it knows about the new artifact
                await self.update_context(user_id, room_id)
                logger.info("[LiveSession] Artifact saved: userId=%s artifactId=%s roomId=%s", user_id, artifact.id, room_id)
                return f"Artifact saved: id={artifact.id} summary={summary[:60]}"
            except Exception:
                logger.exception("save_artifact failed for userId=%s", user_id)
                return "Failed to save artifact"

        elif fn_name == "end_session":
            await notify({"label": "Ending session…"})
            # Signal the session to stop — the receive loop will exit on the
            # next iteration and the frontend's live_session_end message (or
            # the explicit close below) will clean up the rest.
            live = self._sessions.get(user_id)
            if live:
                live._closed = True
                asyncio.create_task(delayed_close())
            return "Session ended"

        elif fn_name == "close_artifact":
            await notify({
                "label": "Closing artifact",
                "closeArtifact": True,
            })
            return "Artifact closed"

        else:
            logger.warning("[LiveSession] Unknown tool call: %s userId=%s", fn_name, user_id)
            return "Unknown tool"

    async def _session_lifecycle(
        self,
        live: LiveSession,
        config: genai_types.LiveConnectConfig,
        on_audio: OnAudioChunk,
        on_text: OnTextChunk,
        on_interrupted: OnInterrupted,
        on_turn_complete: OnTurnComplete,
        on_user_text: Optional[OnUserText] = None,
        on_tool_activity: Optional[OnToolActivity] = None,
    ) -> None:
        """Run inside the `async with connect()` block to keep the WS alive."""
        client = get_genai_client()
        try:
            async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                live.session = session
                live.ready_event.set()

                await self._receive_loop(
                    live, session, on_audio, on_text, on_interrupted, on_turn_complete,
                    on_user_text, on_tool_activity,
                )
        except asyncio.CancelledError:
            logger.debug("Session lifecycle cancelled for userId=%s", live.user_id)
        except Exception:
            logger.exception("Session lifecycle error for userId=%s", live.user_id)
        finally:
            live.ready_event.set()  # unblock start_session if still waiting

    async def _receive_loop(
        self,
        live: LiveSession,
        session: object,
        on_audio: OnAudioChunk,
        on_text: OnTextChunk,
        on_interrupted: OnInterrupted,
        on_turn_complete: OnTurnComplete,
        on_user_text: Optional[OnUserText] = None,
        on_tool_activity: Optional[OnToolActivity] = None,
    ) -> None:
        """Read from Gemini and dispatch events until close_event is set."""
        try:
            while not live.close_event.is_set():
                async for response in session.receive():
                    if live.close_event.is_set():
                        break

                    # ── Tool calls ────────────────────────────────────────────
                    tool_call = getattr(response, "tool_call", None)
                    if tool_call and getattr(tool_call, "function_calls", None):
                        function_responses = []
                        for fn_call in tool_call.function_calls:
                            result = await self._execute_tool(
                                live.user_id,
                                fn_call.name,
                                dict(fn_call.args),
                                on_tool_activity,
                            )
                            function_responses.append({
                                "name": fn_call.name,
                                "response": {"result": result},
                                "id": fn_call.id,
                            })
                        await session.send_tool_response(function_responses=function_responses)
                        continue

                    # ── Server content ────────────────────────────────────────
                    server_content = getattr(response, "server_content", None)
                    if server_content is None:
                        continue

                    if getattr(server_content, "interrupted", False):
                        await on_interrupted()
                        continue

                    if on_user_text:
                        input_trans = getattr(server_content, "input_transcription", None)
                        if input_trans:
                            user_text = getattr(input_trans, "text", None)
                            if user_text:
                                await on_user_text(user_text)

                    model_turn = getattr(server_content, "model_turn", None)
                    if model_turn and model_turn.parts:
                        for part in model_turn.parts:
                            inline_data = getattr(part, "inline_data", None)
                            if inline_data and inline_data.data:
                                audio_b64 = base64.b64encode(inline_data.data).decode()
                                await on_audio(audio_b64)
                            text = getattr(part, "text", None)
                            if text:
                                await on_text(text)

                    output_trans = getattr(server_content, "output_transcription", None)
                    if output_trans:
                        rayan_text = getattr(output_trans, "text", None)
                        if rayan_text:
                            await on_text(rayan_text)

                    if getattr(server_content, "turn_complete", False):
                        await on_turn_complete()

        except asyncio.CancelledError:
            logger.debug("Receive loop cancelled for userId=%s", live.user_id)
        except Exception:
            logger.exception("Receive loop error for userId=%s", live.user_id)


# ── Module-level singleton ─────────────────────────────────────────────────────

live_session_manager = LiveSessionManager()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _load_room_context_text(user_id: str, room_id: Optional[str]) -> str:
    """Build a text block listing all artifacts in a room for context injection."""
    if not room_id:
        room_directory = await _build_room_directory(user_id)
        return f"The user is in the palace lobby (no room selected).\n\nAvailable rooms:\n{room_directory}"
    try:
        from app.services.artifact_service import get_room_artifacts
        from app.services.room_service import get_room
        room, artifacts = await asyncio.gather(
            get_room(user_id, room_id),
            get_room_artifacts(user_id, room_id),
        )
        room_name = room.name if room else room_id
        if not artifacts:
            return f"Room: {room_name}\nNo artifacts in this room yet."
        lines = [f"Room: {room_name} (ID: {room_id})"]
        for a in artifacts:
            lines.append(f"- [ARTIFACT ID: {a.id}] {a.summary or '(no summary)'}")
        return "\n".join(lines)
    except Exception:
        logger.exception("_load_room_context_text failed for userId=%s roomId=%s", user_id, room_id)
        return "(failed to load room artifacts)"


async def _retrieve_context(
    user_id: str,
    room_id: Optional[str],
    artifact_id: Optional[str],
) -> list[SearchResult]:
    """Retrieve memory context for the system prompt."""
    search_query = ""
    
    if artifact_id:
        try:
            from app.services.artifact_service import get_artifact
            # Note: room_id is required by get_artifact but room_id might be None in lobby
            # However, if artifact_id is provided, we usually have a room_id.
            # If not, we might need a better way to find the artifact.
            artifact = await get_artifact(user_id, room_id or "lobby", artifact_id)
            if artifact:
                search_query = artifact.summary
        except Exception:
            logger.warning("Failed to load artifact %s for semantic search query", artifact_id)
            
    if not search_query:
        return []

    try:
        return await semantic_search(
            user_id=user_id,
            query=search_query,
            limit=8,
            room_id=room_id,
        )
    except Exception:
        logger.exception("semantic_search failed for userId=%s", user_id)
        return []
