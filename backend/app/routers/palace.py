"""Palace router — REST endpoints per rest-api.md: GET/POST /palace, PATCH /palace/layout."""

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
    for room in rooms:
        rooms_list.append({
            "id": room.id,
            "name": room.name,
            "position": room.position.model_dump(),
            "dimensions": room.dimensions.model_dump(),
            "style": room.style.value,
            "connections": room.connections,
            "artifactCount": room.artifactCount,
        })

    return {
        "palace": palace_data,
        "layout": layout_data,
        "rooms": rooms_list,
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
