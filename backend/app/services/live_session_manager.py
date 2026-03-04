"""LiveSessionManager — persistent Gemini Live API sessions per user.

Manages a long-lived streaming connection to Gemini Live for each user.
Audio is forwarded via send_realtime_input (not send() with LiveClientRealtimeInput).
Gemini's built-in VAD handles turn detection; the receive loop dispatches
audio/text/interruption events back to the caller via callbacks.

Architecture: The `async with client.aio.live.connect(...)` context manager owns the
underlying websocket. We run the entire session lifecycle (connect → receive loop →
close) inside a single background task so the `async with` block stays alive for the
duration of the session. An asyncio.Event signals when to shut down.
"""

import asyncio
import base64
import logging
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional

from google.genai import types as genai_types

from app.core.gemini import LIVE_MODEL, get_genai_client
from app.services.search_service import SearchResult, semantic_search

logger = logging.getLogger(__name__)

# ── Types ──────────────────────────────────────────────────────────────────────

OnAudioChunk = Callable[[str], Awaitable[None]]        # base64 audio
OnTextChunk = Callable[[str], Awaitable[None]]          # transcript text
OnInterrupted = Callable[[], Awaitable[None]]
OnTurnComplete = Callable[[], Awaitable[None]]


@dataclass
class LiveSession:
    user_id: str
    session: object  # genai AsyncSession, set once connected
    task: asyncio.Task  # the background task running the session lifecycle
    close_event: asyncio.Event  # signal to shut down
    ready_event: asyncio.Event  # signaled when session is connected
    _closed: bool = field(default=False, init=False)


# ── System prompt ──────────────────────────────────────────────────────────────

_BASE_SYSTEM_PROMPT = """\
You are Rayan, a knowledgeable memory recall assistant. You help users explore \
and understand their stored memories in the Memory Palace.

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

MEMORIES:
{memories}
"""


def _build_system_prompt(results: list[SearchResult]) -> str:
    if not results:
        return _BASE_SYSTEM_PROMPT.format(memories="(none found)")
    lines: list[str] = []
    for r in results:
        lines.append(
            f"[ARTIFACT {r.artifact_id} | Room: {r.room_name} | Similarity: {r.similarity:.2f}]\n"
            f"Summary: {r.summary}"
        )
        if r.full_content:
            lines.append(f"Full content: {r.full_content[:800]}")
        lines.append("")
    return _BASE_SYSTEM_PROMPT.format(memories="\n".join(lines))


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
    ) -> None:
        """Open a persistent Gemini Live connection for the user."""
        # Close any existing session first
        await self.close_session(user_id)

        # Retrieve memory context via semantic search
        room_id: Optional[str] = context.get("currentRoomId")
        artifact_id: Optional[str] = context.get("focusedArtifactId")
        results = await _retrieve_context(user_id, room_id, artifact_id)
        system_prompt = _build_system_prompt(results)

        config = genai_types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=system_prompt,
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                )
            ),
            realtime_input_config=genai_types.RealtimeInputConfig(
                automatic_activity_detection=genai_types.AutomaticActivityDetection(
                    disabled=False
                )
            ),
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
        )
        self._sessions[user_id] = live

        # Launch the background task that holds the `async with` context alive
        task = asyncio.create_task(
            self._session_lifecycle(
                live, config, on_audio, on_text, on_interrupted, on_turn_complete,
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

    async def send_audio(self, user_id: str, audio_bytes: bytes) -> None:
        """Forward a PCM audio chunk to Gemini."""
        live = self._sessions.get(user_id)
        if not live or live._closed or live.session is None:
            return
        try:
            await live.session.send_realtime_input(
                audio=genai_types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
            )
        except Exception:
            logger.exception("send_audio error for userId=%s", user_id)

    async def close_session(self, user_id: str) -> None:
        """Signal the session task to shut down and wait for cleanup."""
        live = self._sessions.pop(user_id, None)
        if not live:
            return
        live._closed = True
        live.close_event.set()  # signal the background task to exit
        if live.task and not live.task.done():
            live.task.cancel()
            try:
                await live.task
            except (asyncio.CancelledError, Exception):
                pass
        logger.info("Live session closed for userId=%s", user_id)

    def has_session(self, user_id: str) -> bool:
        return user_id in self._sessions

    async def _session_lifecycle(
        self,
        live: LiveSession,
        config: genai_types.LiveConnectConfig,
        on_audio: OnAudioChunk,
        on_text: OnTextChunk,
        on_interrupted: OnInterrupted,
        on_turn_complete: OnTurnComplete,
    ) -> None:
        """Run inside the `async with connect()` block to keep the WS alive."""
        client = get_genai_client()
        try:
            async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                # Store the session reference so send_audio can use it
                live.session = session
                live.ready_event.set()

                # Run the receive loop until close_event is signaled
                await self._receive_loop(
                    live, session, on_audio, on_text, on_interrupted, on_turn_complete,
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
    ) -> None:
        """Read from Gemini and dispatch events until close_event is set."""
        try:
            async for response in session.receive():
                if live.close_event.is_set():
                    break

                server_content = getattr(response, "server_content", None)
                if server_content is None:
                    continue

                # Interruption — Gemini detected user started speaking
                if getattr(server_content, "interrupted", False):
                    await on_interrupted()
                    continue

                # Model turn — audio/text chunks
                model_turn = getattr(server_content, "model_turn", None)
                if model_turn and model_turn.parts:
                    for part in model_turn.parts:
                        # Audio data
                        inline_data = getattr(part, "inline_data", None)
                        if inline_data and inline_data.data:
                            audio_b64 = base64.b64encode(inline_data.data).decode()
                            await on_audio(audio_b64)
                        # Text
                        text = getattr(part, "text", None)
                        if text:
                            await on_text(text)

                # Turn complete
                if getattr(server_content, "turn_complete", False):
                    await on_turn_complete()

        except asyncio.CancelledError:
            logger.debug("Receive loop cancelled for userId=%s", live.user_id)
        except Exception:
            logger.exception("Receive loop error for userId=%s", live.user_id)


# ── Module-level singleton ─────────────────────────────────────────────────────

live_session_manager = LiveSessionManager()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _retrieve_context(
    user_id: str,
    room_id: Optional[str],
    artifact_id: Optional[str],
) -> list[SearchResult]:
    """Retrieve memory context for the system prompt."""
    search_query = artifact_id or ""
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
