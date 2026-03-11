"""WebSocket authentication.

Unlike HTTP, WebSocket connections send credentials in the first message
(browsers cannot set Authorization headers on WS upgrades).

Flow per websocket.md:
  1. Client connects to /ws/{userId}
  2. Client sends: {"type": "auth", "token": "<firebase_id_token>"}
  3. Server verifies token; userId in token must match userId in URL
  4. Server responds with auth_success or closes with 4001
"""

import json
import logging

from fastapi import WebSocket, WebSocketDisconnect
from firebase_admin import auth

logger = logging.getLogger(__name__)

_AUTH_TIMEOUT_SECONDS = 10


async def authenticate_websocket(websocket: WebSocket, url_user_id: str) -> dict[str, str] | None:
    """Wait for the auth handshake message and verify the Firebase token.

    Returns the decoded user dict on success, or None if auth fails
    (the connection is closed before returning None).
    """
    try:
        raw = await websocket.receive_text()
        msg = json.loads(raw)
    except (WebSocketDisconnect, json.JSONDecodeError):
        await _reject(websocket, "Expected auth message")
        return None

    if msg.get("type") != "auth" or not msg.get("token"):
        await _reject(websocket, "Expected {type: 'auth', token: '...'}")
        return None

    token: str = msg["token"]

    try:
        decoded = auth.verify_id_token(token)
    except Exception:
        logger.warning("Invalid Firebase token for userId=%s", url_user_id)
        await _reject(websocket, "Invalid or expired token")
        return None

    token_uid: str = decoded["uid"]
    if token_uid != url_user_id:
        logger.warning("Token uid=%s does not match URL userId=%s", token_uid, url_user_id)
        await _reject(websocket, "Token user does not match requested userId")
        return None

    user = {
        "user_id": token_uid,
        "email": decoded.get("email", ""),
        "display_name": decoded.get("name", ""),
    }

    await websocket.send_text(json.dumps({"type": "auth_success", "userId": token_uid}))
    logger.info("WebSocket authenticated: userId=%s", token_uid)
    return user


async def _reject(websocket: WebSocket, reason: str) -> None:
    try:
        await websocket.send_text(
            json.dumps({"type": "error", "code": "UNAUTHORIZED", "message": reason, "retryable": False})
        )
        await websocket.close(code=4001)
    except Exception:
        pass
