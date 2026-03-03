"""Rooms router — REST endpoints per rest-api.md: GET /rooms/{roomId}, POST /rooms/{roomId}/access."""

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_token
from app.services.artifact_service import get_room_artifacts
from app.services.room_service import get_room, update_last_accessed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["rooms"])


@router.get("/rooms/{room_id}")
async def get_room_detail(room_id: str, user: dict = Depends(verify_token)):
    """Get a room with all its artifacts."""
    user_id = user["user_id"]

    room = await get_room(user_id, room_id)
    if room is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "RESOURCE_NOT_FOUND", "message": "Room not found", "details": {"roomId": room_id}}},
        )

    artifacts = await get_room_artifacts(user_id, room_id)
    artifacts_list = []
    for art in artifacts:
        artifacts_list.append({
            "id": art.id,
            "type": art.type.value,
            "position": art.position.model_dump(),
            "visual": art.visual.value,
            "summary": art.summary,
            "thumbnailUrl": art.thumbnailUrl,
            "createdAt": art.createdAt,
            "color": art.color,
        })

    return {
        "room": {
            "id": room.id,
            "name": room.name,
            "position": room.position.model_dump(),
            "dimensions": room.dimensions.model_dump(),
            "style": room.style.value,
            "connections": room.connections,
            "createdAt": room.createdAt,
            "lastAccessedAt": room.lastAccessedAt,
            "artifactCount": room.artifactCount,
            "topicKeywords": room.topicKeywords,
        },
        "artifacts": artifacts_list,
    }


@router.post("/rooms/{room_id}/access")
async def record_room_access(room_id: str, user: dict = Depends(verify_token)):
    """Record room access — updates lastAccessedAt."""
    user_id = user["user_id"]

    room = await get_room(user_id, room_id)
    if room is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "RESOURCE_NOT_FOUND", "message": "Room not found", "details": {"roomId": room_id}}},
        )

    now = datetime.now(UTC)
    await update_last_accessed(user_id, room_id)
    logger.info("Room accessed: userId=%s roomId=%s", user_id, room_id)

    return {"success": True, "lastAccessedAt": now}
