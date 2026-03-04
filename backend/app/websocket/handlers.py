"""WebSocket message router.

Dispatches incoming messages to the correct handler based on `type`.
All handlers receive (user_id, message_dict) and send responses via the
shared ConnectionManager.

Per websocket.md client→server message types:
  auth            → handled before this router (in auth.py)
  capture_start   → start a capture session
  media_chunk     → stream media data to Gemini
  capture_end     → finalize capture session
  voice_query     → voice-based memory query       [T092]
  text_query      → text-based memory query (fallback) [T093]
  interrupt       → stop current agent response    [T095]
  artifact_click  → trigger artifact narration     [T094, T097]
  request_connection → request a semantic corridor between rooms
  ping            → heartbeat
"""

import asyncio
import base64
import json
import logging
from typing import Any

from fastapi import WebSocket

from app.agents import capture_agent as capture_agent_module
from app.agents import recall_agent as recall_agent_module
from app.agents import narrator_agent as narrator_agent_module
from app.agents.capture_agent import CaptureAgent
from app.models.capture_session import SessionStatus
from app.services import capture_service
from app.services.live_session_manager import live_session_manager
from app.websocket.manager import manager
from app.websocket.responses import (
    broadcast_palace_update,
    send_capture_ack,
    send_capture_complete,
    send_room_suggestion,
)

logger = logging.getLogger(__name__)

# Message handlers registry: type → async callable(user_id, message, websocket)
_HANDLERS: dict[str, Any] = {}


def _handler(msg_type: str):
    """Decorator to register a message handler."""
    def decorator(fn):
        _HANDLERS[msg_type] = fn
        return fn
    return decorator


@_handler("ping")
async def handle_ping(user_id: str, msg: dict, websocket: WebSocket) -> None:
    import time
    await manager.send(user_id, {"type": "pong", "serverTime": int(time.time() * 1000)})


@_handler("capture_start")
async def handle_capture_start(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """T041 — Start a capture session and spin up a CaptureAgent."""
    session_id: str = msg.get("sessionId", "")
    source_type: str = msg.get("sourceType", "webcam")

    if not session_id:
        await manager.send(user_id, {
            "type": "error", "code": "INVALID_REQUEST",
            "message": "capture_start requires sessionId", "retryable": False,
        })
        return

    # Persist session in Firestore
    await capture_service.start_session(user_id, session_id, source_type)

    # Build extraction callback — fires on every concept Gemini extracts
    async def on_extraction(event):
        await send_capture_ack(user_id, session_id, event)
        # Broadcast palace_update for the newly created artifact/room
        if event.categorization:
            cat = event.categorization
            rooms_added = [cat.room] if cat.action == "suggested_new" else []
            await broadcast_palace_update(
                user_id,
                rooms_added=rooms_added,
                artifacts_added=[cat.artifact],
            )
            # Broadcast room_suggestion when user confirmation is required
            if cat.requires_confirmation and cat.suggestion:
                await send_room_suggestion(user_id, cat.artifact.id, cat.suggestion)

    agent = CaptureAgent(user_id, session_id, on_extraction)
    await agent.start()
    capture_agent_module.register_agent(session_id, agent)
    logger.info("capture_start: userId=%s sessionId=%s", user_id, session_id)


@_handler("media_chunk")
async def handle_media_chunk(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """T042 — Decode base64 media chunk and stream to the active CaptureAgent."""
    session_id: str = msg.get("sessionId", "")
    data_b64: str = msg.get("data", "")

    agent = capture_agent_module.get_agent(session_id)
    if agent is None:
        logger.warning("media_chunk: no active agent for sessionId=%s", session_id)
        return

    try:
        raw_bytes = base64.b64decode(data_b64)
        await agent.send_chunk(raw_bytes)
    except Exception:
        logger.exception("media_chunk decode/send error: sessionId=%s", session_id)


@_handler("capture_end")
async def handle_capture_end(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """T043 — Stop CaptureAgent, finalize session, send capture_complete."""
    session_id: str = msg.get("sessionId", "")

    agent = capture_agent_module.get_agent(session_id)
    if agent is None:
        logger.warning("capture_end: no active agent for sessionId=%s", session_id)
        return

    # Stop agent and collect all extractions
    extractions = await agent.stop()
    capture_agent_module.unregister_agent(session_id)

    # Finalize session in Firestore
    session = await capture_service.end_session(user_id, session_id, SessionStatus.completed)

    # Gather artifact/room IDs from all extractions
    artifact_ids: list[str] = []
    room_ids: set[str] = set()
    new_room_ids: list[str] = []
    for ev in extractions:
        if ev.categorization:
            artifact_ids.append(ev.categorization.artifact.id)
            room_ids.add(ev.categorization.room.id)
            if ev.categorization.action == "suggested_new":
                new_room_ids.append(ev.categorization.room.id)

    concept_count = session.conceptCount if session else len(extractions)
    await send_capture_complete(
        user_id, session_id,
        artifact_ids=artifact_ids,
        room_ids=list(room_ids),
        new_room_ids=new_room_ids,
        concept_count=concept_count,
    )
    logger.info("capture_end: userId=%s sessionId=%s concepts=%d", user_id, session_id, concept_count)


# ── US3: Voice Conversation handlers ──────────────────────────────────────────


@_handler("voice_query")
async def handle_voice_query(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """T092 — Process a voice query against stored memories. Streams response_chunk messages."""
    query_id: str = msg.get("queryId", "")
    audio_b64: str = msg.get("audioData", "")
    context: dict = msg.get("context", {})

    if not query_id:
        await manager.send(user_id, {
            "type": "error", "code": "INVALID_REQUEST",
            "message": "voice_query requires queryId", "retryable": False,
        })
        return

    if not audio_b64:
        await manager.send(user_id, {
            "type": "error", "code": "INVALID_REQUEST",
            "message": "voice_query requires audioData", "retryable": False,
        })
        return

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception:
        await manager.send(user_id, {
            "type": "error", "code": "INVALID_REQUEST",
            "message": "audioData is not valid base64", "retryable": False,
        })
        return

    chunk_index = 0

    async def on_chunk(chunk) -> None:
        nonlocal chunk_index
        content: dict = {}
        if chunk.audio_chunk:
            content["audioChunk"] = base64.b64encode(chunk.audio_chunk).decode()
        if chunk.text:
            content["text"] = chunk.text
        if chunk.generated_image_url:
            content["generatedImage"] = {
                "url": chunk.generated_image_url,
                "position": chunk.generated_image_position or {"x": 2.5, "y": 1.8, "z": -2.0},
            }
        if chunk.navigation:
            content["navigation"] = chunk.navigation
        await manager.send(user_id, {
            "type": "response_chunk",
            "queryId": query_id,
            "chunkIndex": chunk_index,
            "content": content,
            "isComplete": False,
        })
        chunk_index += 1

    async def on_complete() -> None:
        await manager.send(user_id, {
            "type": "response_complete",
            "queryId": query_id,
        })

    task = asyncio.create_task(
        recall_agent_module.process_voice_query(
            user_id=user_id,
            query_id=query_id,
            audio_bytes=audio_bytes,
            context=context,
            on_chunk=on_chunk,
            on_complete=on_complete,
        ),
        name=f"voice_query-{user_id}-{query_id}",
    )
    recall_agent_module.register_query(user_id, task)
    logger.info("voice_query started: userId=%s queryId=%s", user_id, query_id)


@_handler("text_query")
async def handle_text_query(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """T093 — Text fallback for voice queries. Streams response_chunk messages."""
    query_id: str = msg.get("queryId", "")
    text: str = msg.get("text", "").strip()
    context: dict = msg.get("context", {})

    if not query_id:
        await manager.send(user_id, {
            "type": "error", "code": "INVALID_REQUEST",
            "message": "text_query requires queryId", "retryable": False,
        })
        return

    if not text:
        await manager.send(user_id, {
            "type": "error", "code": "INVALID_REQUEST",
            "message": "text_query requires non-empty text", "retryable": False,
        })
        return

    chunk_index = 0

    async def on_chunk(chunk) -> None:
        nonlocal chunk_index
        content: dict = {}
        if chunk.text:
            content["text"] = chunk.text
        if chunk.generated_image_url:
            content["generatedImage"] = {
                "url": chunk.generated_image_url,
                "position": chunk.generated_image_position or {"x": 2.5, "y": 1.8, "z": -2.0},
            }
        if chunk.navigation:
            content["navigation"] = chunk.navigation
        await manager.send(user_id, {
            "type": "response_chunk",
            "queryId": query_id,
            "chunkIndex": chunk_index,
            "content": content,
            "isComplete": False,
        })
        chunk_index += 1

    async def on_complete() -> None:
        await manager.send(user_id, {
            "type": "response_complete",
            "queryId": query_id,
        })

    task = asyncio.create_task(
        recall_agent_module.process_text_query(
            user_id=user_id,
            query_id=query_id,
            text=text,
            context=context,
            on_chunk=on_chunk,
            on_complete=on_complete,
        ),
        name=f"text_query-{user_id}-{query_id}",
    )
    recall_agent_module.register_query(user_id, task)
    logger.info("text_query started: userId=%s queryId=%s text=%s", user_id, query_id, text[:80])


@_handler("interrupt")
async def handle_interrupt(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """T095 — Cancel the active query task (barge-in support)."""
    cancelled = recall_agent_module.cancel_query(user_id)
    if cancelled:
        logger.info("interrupt: cancelled active query for userId=%s", user_id)
        await manager.send(user_id, {"type": "response_interrupted"})
    else:
        logger.info("interrupt: no active query for userId=%s", user_id)


@_handler("artifact_click")
async def handle_artifact_click(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """T094 + T097 — Narrate an artifact and send artifact_recall WebSocket response."""
    artifact_id: str = msg.get("artifactId", "")
    room_id: str = msg.get("roomId", "")

    if not artifact_id or not room_id:
        await manager.send(user_id, {
            "type": "error", "code": "INVALID_REQUEST",
            "message": "artifact_click requires artifactId and roomId", "retryable": False,
        })
        return

    logger.info("artifact_click: userId=%s artifactId=%s roomId=%s", user_id, artifact_id, room_id)

    try:
        result = await narrator_agent_module.narrate_artifact(user_id, artifact_id, room_id)
    except Exception:
        logger.exception("narrator_agent failed: userId=%s artifactId=%s", user_id, artifact_id)
        await manager.send(user_id, {
            "type": "error", "code": "QUERY_FAILED",
            "message": "Failed to narrate artifact", "retryable": True,
        })
        return

    # Build artifact_recall message per websocket.md §5
    diagrams = [
        {"url": d.url, "caption": d.caption}
        for d in result.diagrams
    ]
    voice_ack = base64.b64encode(result.voice_audio).decode() if result.voice_audio else None

    await manager.send(user_id, {
        "type": "artifact_recall",
        "artifactId": artifact_id,
        "content": {
            "voiceNarration": voice_ack,
            "summary": result.summary,
            "generatedDiagrams": diagrams,
            "relatedArtifacts": result.related_artifacts,
        },
    })


# ── US3-v2: Live streaming voice handlers ─────────────────────────────────────


@_handler("live_session_start")
async def handle_live_session_start(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Open a persistent Gemini Live session for real-time voice streaming."""
    context: dict = msg.get("context", {})

    async def on_audio(audio_b64: str) -> None:
        await manager.send(user_id, {"type": "live_audio", "audioChunk": audio_b64})

    async def on_text(text: str) -> None:
        await manager.send(user_id, {"type": "live_text", "text": text})

    async def on_interrupted() -> None:
        await manager.send(user_id, {"type": "live_interrupted"})

    async def on_turn_complete() -> None:
        await manager.send(user_id, {"type": "live_turn_complete"})

    try:
        await live_session_manager.start_session(
            user_id=user_id,
            context=context,
            on_audio=on_audio,
            on_text=on_text,
            on_interrupted=on_interrupted,
            on_turn_complete=on_turn_complete,
        )
        await manager.send(user_id, {"type": "live_session_started"})
    except Exception:
        logger.exception("live_session_start failed: userId=%s", user_id)
        await manager.send(user_id, {
            "type": "error", "code": "LIVE_SESSION_FAILED",
            "message": "Failed to start live session", "retryable": True,
        })


@_handler("audio_chunk")
async def handle_audio_chunk(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Forward a PCM audio chunk to the active Gemini Live session."""
    data_b64: str = msg.get("data", "")
    if not data_b64:
        return
    try:
        audio_bytes = base64.b64decode(data_b64)
        await live_session_manager.send_audio(user_id, audio_bytes)
    except Exception:
        logger.exception("audio_chunk error: userId=%s", user_id)


@_handler("live_session_end")
async def handle_live_session_end(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Close the persistent Gemini Live session."""
    await live_session_manager.close_session(user_id)
    logger.info("live_session_end: userId=%s", user_id)


@_handler("request_connection")
async def handle_request_connection(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Request a semantic corridor between two rooms. Full logic in Phase 5."""
    logger.info(
        "request_connection: userId=%s from=%s to=%s",
        user_id, msg.get("fromRoomId"), msg.get("toRoomId"),
    )
    # TODO: delegate to memory_architect


async def route_message(user_id: str, raw: str, websocket: WebSocket) -> None:
    """Parse a raw JSON string and dispatch to the appropriate handler."""
    try:
        msg: dict = json.loads(raw)
    except json.JSONDecodeError:
        await manager.send(
            user_id,
            {"type": "error", "code": "INVALID_REQUEST", "message": "Message must be valid JSON", "retryable": False},
        )
        return

    msg_type: str = msg.get("type", "")
    handler = _HANDLERS.get(msg_type)

    if handler is None:
        logger.warning("Unknown message type '%s' from userId=%s", msg_type, user_id)
        await manager.send(
            user_id,
            {"type": "error", "code": "INVALID_REQUEST", "message": f"Unknown message type: {msg_type!r}", "retryable": False},
        )
        return

    try:
        await handler(user_id, msg, websocket)
    except Exception:
        logger.exception("Handler error for type=%s userId=%s", msg_type, user_id)
        await manager.send(
            user_id,
            {"type": "error", "code": "INTERNAL_ERROR", "message": "Internal server error", "retryable": True},
        )
