import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections keyed by userId."""

    def __init__(self) -> None:
        # userId → WebSocket
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id] = websocket
        logger.info("WebSocket connected: userId=%s (total=%d)", user_id, len(self._connections))

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)
        logger.info("WebSocket disconnected: userId=%s", user_id)

    async def send(self, user_id: str, message: dict[str, Any]) -> bool:
        """Send a JSON message to a specific user. Returns False if not connected."""
        ws = self._connections.get(user_id)
        if ws is None:
            return False
        try:
            await ws.send_text(json.dumps(message))
            return True
        except Exception:
            logger.exception("Failed to send to userId=%s", user_id)
            self.disconnect(user_id)
            return False

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send a JSON message to all connected users."""
        disconnected: list[str] = []
        for user_id, ws in self._connections.items():
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                disconnected.append(user_id)
        for user_id in disconnected:
            self.disconnect(user_id)

    def is_connected(self, user_id: str) -> bool:
        return user_id in self._connections

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Singleton shared across all WebSocket endpoints
manager = ConnectionManager()
