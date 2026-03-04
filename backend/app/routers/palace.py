"""Palace router — REST endpoints per rest-api.md: GET/POST /palace, PATCH /palace/layout."""

import asyncio
import uuid
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.middleware.auth import verify_token
from app.models.common import Position3D, Rotation3D
from app.core.firestore import get_firestore_client
from app.services.room_service import get_all_rooms
from app.services.artifact_service import get_room_artifacts
from app.services.seed_service import seed_palace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["palace"])


def _palace_ref(user_id: str):
    return get_firestore_client().collection("users").document(user_id).collection("palace").document("main")


def _layout_ref(user_id: str):
    return get_firestore_client().collection("users").document(user_id).collection("layout").document("main")


@router.get("/palace")
async def get_palace(user: dict = Depends(verify_token)):
    """Get the current user's palace with all rooms."""
    user_id = user["user_id"]

    palace_doc = await _palace_ref(user_id).get()
    if not palace_doc.exists:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "RESOURCE_NOT_FOUND", "message": "Palace not found", "details": {}}},
        )

    palace_data = palace_doc.to_dict()
    palace_data["id"] = f"palace_{user_id}"
    palace_data["userId"] = user_id

    layout_doc = await _layout_ref(user_id).get()
    layout_data = layout_doc.to_dict() if layout_doc.exists else {
        "lobbyDoors": [],
        "corridors": [],
        "lastCameraPosition": None,
        "lastCameraRotation": None,
        "lastRoomId": None,
    }

    rooms = await get_all_rooms(user_id)
    rooms_list = []
    artifacts_map = {}
    
    # Fetch artifacts for each room in parallel
    room_artifact_tasks = [get_room_artifacts(user_id, room.id) for room in rooms]
    all_artifacts = await asyncio.gather(*room_artifact_tasks)

    for i, room in enumerate(rooms):
        rooms_list.append({
            "id": room.id,
            "name": room.name,
            "position": room.position.model_dump(),
            "dimensions": room.dimensions.model_dump(),
            "style": "library", # Default since style was removed from DB model
            "connections": room.connections,
            "artifactCount": room.artifactCount,
        })
        
        # Add fetched artifacts to the map
        artifacts_map[room.id] = [a.model_dump() for a in all_artifacts[i]]

    # Auto-generate lobbyDoors when they're empty but rooms exist.
    # This handles the race condition where rooms are seeded but layout
    # isn't updated with door entries yet.
    if not layout_data.get("lobbyDoors") and rooms_list:
        wall_cycle = ["north", "east", "south", "west"]
        generated_doors = []
        for i, room in enumerate(rooms_list):
            generated_doors.append({
                "roomId": room["id"],
                "wallPosition": wall_cycle[i % len(wall_cycle)],
                "doorIndex": i // len(wall_cycle),
            })
        layout_data["lobbyDoors"] = generated_doors
        # Persist so this only needs to happen once
        try:
            await _layout_ref(user_id).set({"lobbyDoors": generated_doors}, merge=True)
            logger.info("Auto-generated %d lobbyDoors for userId=%s", len(generated_doors), user_id)
        except Exception:
            logger.exception("Failed to persist auto-generated lobbyDoors for userId=%s", user_id)

    return {
        "palace": palace_data,
        "layout": layout_data,
        "rooms": rooms_list,
        "artifacts": artifacts_map,
    }


@router.post("/palace", status_code=201)
async def create_palace(user: dict = Depends(verify_token)):
    """Create a new palace for the user."""
    user_id = user["user_id"]

    palace_doc = await _palace_ref(user_id).get()
    if palace_doc.exists:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "CONFLICT", "message": "Palace already exists", "details": {}}},
        )

    now = datetime.now(UTC)
    palace_data = {
        "createdAt": now,
        "lastModifiedAt": now,
        "lobbyPosition": {"x": 0, "y": 0, "z": 0},
        "roomCount": 0,
        "artifactCount": 0,
    }
    await _palace_ref(user_id).set(palace_data)

    # Initialize layout document
    layout_data = {
        "lobbyDoors": [],
        "corridors": [],
        "lastCameraPosition": None,
        "lastCameraRotation": None,
        "lastRoomId": None,
    }
    await _layout_ref(user_id).set(layout_data)

    logger.info("Palace created for userId=%s", user_id)

    async def _seed_and_notify(uid: str) -> None:
        try:
            summary = await seed_palace(uid)
            from app.websocket.manager import manager
            await manager.send(uid, {"type": "palace_update", "data": summary})
        except Exception:
            logger.exception("Seed palace failed for userId=%s", uid)

    asyncio.create_task(_seed_and_notify(user_id), name=f"seed-palace-{user_id}")

    return {
        "palace": {
            "id": f"palace_{user_id}",
            "userId": user_id,
            "createdAt": now,
            "lobbyPosition": {"x": 0, "y": 0, "z": 0},
            "roomCount": 0,
            "artifactCount": 0,
        }
    }


class LayoutUpdateRequest(BaseModel):
    lastCameraPosition: Optional[Position3D] = None
    lastCameraRotation: Optional[Rotation3D] = None
    lastRoomId: Optional[str] = None


@router.patch("/palace/layout")
async def update_palace_layout(
    body: LayoutUpdateRequest,
    user: dict = Depends(verify_token),
):
    """Update user's camera position and current room."""
    user_id = user["user_id"]

    updates: dict = {}
    if body.lastCameraPosition is not None:
        updates["lastCameraPosition"] = body.lastCameraPosition.model_dump()
    if body.lastCameraRotation is not None:
        updates["lastCameraRotation"] = body.lastCameraRotation.model_dump()
    if body.lastRoomId is not None:
        updates["lastRoomId"] = body.lastRoomId

    if updates:
        await _layout_ref(user_id).set(updates, merge=True)

    return {"success": True}


# ── Admin: fix room positions ─────────────────────────────────────────────────

_WALL_CYCLE = ["north", "east", "south", "west"]
_OFFSET_X   = 30.0
_OFFSET_Z   = 0.0
_SPACING    = 30.0
_COLS       = 3


def _grid_pos(n: int) -> dict:
    col = n % _COLS
    row = n // _COLS
    return {"x": _OFFSET_X + col * _SPACING, "y": 0.0, "z": _OFFSET_Z + row * _SPACING}


@router.post("/palace/fix-positions")
async def fix_room_positions(user: dict = Depends(verify_token)):
    """One-shot repair: re-grid all rooms away from origin and rebuild lobbyDoors.

    Safe to call multiple times — idempotent.
    """
    user_id = user["user_id"]
    db = get_firestore_client()
    rooms_ref = db.collection("users").document(user_id).collection("rooms")

    room_docs = await rooms_ref.get()
    rooms = sorted(
        [{"id": d.id, **d.to_dict()} for d in room_docs if d.exists],
        key=lambda r: r.get("createdAt", ""),
    )

    lobby_doors = []
    for i, room in enumerate(rooms):
        new_pos = _grid_pos(i)
        await rooms_ref.document(room["id"]).update({"position": new_pos})
        lobby_doors.append({
            "roomId": room["id"],
            "wallPosition": _WALL_CYCLE[i % len(_WALL_CYCLE)],
            "doorIndex": i // len(_WALL_CYCLE),
        })

    await _layout_ref(user_id).set({"lobbyDoors": lobby_doors}, merge=True)

    logger.info(
        "fix-positions: userId=%s rooms=%d lobbyDoors=%d",
        user_id, len(rooms), len(lobby_doors),
    )
    return {
        "fixed": len(rooms),
        "lobbyDoors": len(lobby_doors),
        "positions": [{"roomId": rooms[i]["id"], "position": _grid_pos(i)} for i in range(len(rooms))],
    }

