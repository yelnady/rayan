"""WebSocket message router.

Dispatches incoming messages to the correct handler based on `type`.
All handlers receive (user_id, message_dict) and send responses via the
shared ConnectionManager.

Per websocket.md client→server message types:
  auth            → handled before this router (in auth.py)
  capture_start   → start a capture session
  media_chunk     → stream media data to Gemini
  capture_end     → finalize capture session
  voice_query     → voice-based memory query
  text_query      → text-based memory query (fallback)
  interrupt       → stop current agent response
  artifact_click  → trigger artifact narration
  request_connection → request a semantic corridor between rooms
  ping            → heartbeat
"""

import json
import logging
from typing import Any

from fastapi import WebSocket

from app.websocket.manager import manager

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
    """Initialise a capture session. Full logic implemented in Phase 3 (T039-T041)."""
    session_id = msg.get("sessionId")
    source_type = msg.get("sourceType", "webcam")
    logger.info("capture_start: userId=%s sessionId=%s sourceType=%s", user_id, session_id, source_type)
    # TODO (T039): delegate to capture_service.start_session()


@_handler("media_chunk")
async def handle_media_chunk(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Stream a base64-encoded media chunk. Full logic implemented in Phase 3 (T042)."""
    session_id = msg.get("sessionId")
    logger.debug("media_chunk: userId=%s sessionId=%s chunkIndex=%s", user_id, session_id, msg.get("chunkIndex"))
    # TODO (T042): forward chunk to capture agent


@_handler("capture_end")
async def handle_capture_end(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Finalise a capture session. Full logic implemented in Phase 3 (T043)."""
    session_id = msg.get("sessionId")
    logger.info("capture_end: userId=%s sessionId=%s", user_id, session_id)
    # TODO (T043): delegate to capture_service.end_session()


@_handler("voice_query")
async def handle_voice_query(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Process a voice query against stored memories. Full logic in Phase 5 (T092)."""
    query_id = msg.get("queryId")
    logger.info("voice_query: userId=%s queryId=%s", user_id, query_id)
    # TODO (T092): delegate to recall_agent


@_handler("text_query")
async def handle_text_query(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Text fallback for voice_query. Full logic in Phase 5 (T093)."""
    query_id = msg.get("queryId")
    logger.info("text_query: userId=%s queryId=%s text=%s", user_id, query_id, msg.get("text", "")[:80])
    # TODO (T093): delegate to recall_agent


@_handler("interrupt")
async def handle_interrupt(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Interrupt the current agent response. Full logic in Phase 5 (T095)."""
    logger.info("interrupt: userId=%s", user_id)
    # TODO (T095): cancel active generation task for this user


@_handler("artifact_click")
async def handle_artifact_click(user_id: str, msg: dict, websocket: WebSocket) -> None:
    """Trigger artifact narration. Full logic in Phase 5 (T094)."""
    artifact_id = msg.get("artifactId")
    room_id = msg.get("roomId")
    logger.info("artifact_click: userId=%s artifactId=%s roomId=%s", user_id, artifact_id, room_id)
    # TODO (T094): delegate to narrator_agent


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
