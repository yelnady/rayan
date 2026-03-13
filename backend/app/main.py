import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.firebase import init_firebase
from app.routers import health, sessions, palace, rooms, search, artifacts, enrichment
from app.websocket.auth import authenticate_websocket
from app.websocket.handlers import route_message
from app.websocket.manager import manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)
    init_firebase(settings.firebase_project_id)
    yield


app = FastAPI(
    title="Rayan Memory Palace",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(sessions.router)
app.include_router(palace.router)
app.include_router(rooms.router)
app.include_router(search.router)
app.include_router(artifacts.router)
app.include_router(enrichment.router)



@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str) -> None:
    """Main WebSocket endpoint per websocket.md.

    Protocol:
      1. Accept connection
      2. Wait for auth handshake ({type: auth, token: ...})
      3. Route all subsequent messages through handlers.route_message()
      4. Disconnect and clean up on close or error
    """
    await manager.connect(user_id, websocket)
    try:
        user = await authenticate_websocket(websocket, user_id)
        if user is None:
            return  # auth.py already closed the connection

        if user.get("display_name"):
            manager.set_display_name(user_id, user["display_name"])

        while True:
            raw = await websocket.receive_text()
            await route_message(user["user_id"], raw, websocket)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected normally: userId=%s", user_id)
    except Exception:
        logger.exception("Unexpected WebSocket error: userId=%s", user_id)
    finally:
        manager.disconnect(user_id)
