"""Rooms router — REST endpoints per rest-api.md: GET /rooms/{roomId}, POST /rooms/{roomId}/access."""

import logging
from datetime import UTC, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import verify_token
from app.services.artifact_service import get_room_artifacts
from app.services.room_service import get_room, update_last_accessed, delete_room

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
            "style": room.style,
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


@router.delete("/rooms/{room_id}")
async def delete_room_endpoint(room_id: str, user: dict = Depends(verify_token)):
    """Delete a room and all its artifacts."""
    user_id = user["user_id"]

    room = await get_room(user_id, room_id)
    if room is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "RESOURCE_NOT_FOUND", "message": "Room not found", "details": {"roomId": room_id}}},
        )

    await delete_room(user_id, room_id)
    logger.info("Room deleted via API: userId=%s roomId=%s", user_id, room_id)

    # Push palace_update so the 3D scene removes the room immediately
    try:
        from app.websocket.manager import manager as ws_manager
        await ws_manager.send(user_id, {
            "type": "palace_update",
            "changes": {
                "roomsRemoved": [room_id],
                "roomsAdded": [],
                "artifactsAdded": [],
                "connectionsAdded": [],
            },
        })
    except Exception:
        logger.exception("WS push failed after delete_room: userId=%s roomId=%s", user_id, room_id)

    return {"success": True}


@router.post("/rooms/{room_id}/synthesize")
async def synthesize_room_endpoint(
    room_id: str,
    replace_artifact_id: Optional[str] = Query(default=None),
    user: dict = Depends(verify_token),
):
    """Generate (or regenerate) a mind map synthesis artifact for a room.

    Creates a new synthesis artifact containing a Gemini-generated mind map image
    of all memories in the room. If replace_artifact_id is provided, regenerates
    the image for that existing synthesis artifact in-place.
    """
    user_id = user["user_id"]

    room = await get_room(user_id, room_id)
    if room is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "RESOURCE_NOT_FOUND", "message": "Room not found"}},
        )

    try:
        from app.services.synthesis_service import synthesize_room
        artifact = await synthesize_room(
            user_id=user_id,
            room_id=room_id,
            replace_artifact_id=replace_artifact_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "BAD_REQUEST", "message": str(e)}})
    except Exception:
        logger.exception("synthesize_room failed: userId=%s roomId=%s", user_id, room_id)
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "Synthesis failed."}},
        )

    # Push palace_update so the 3D scene updates immediately.
    try:
        from app.websocket.manager import manager as ws_manager
        if replace_artifact_id:
            await ws_manager.send(user_id, {
                "type": "palace_update",
                "changes": {
                    "roomsAdded": [],
                    "artifactsAdded": [],
                    "artifactsUpdated": [{
                        "id": artifact.id,
                        "sourceMediaUrl": artifact.sourceMediaUrl,
                        "summary": artifact.summary,
                    }],
                    "connectionsAdded": [],
                },
            })
        else:
            await ws_manager.send(user_id, {
                "type": "palace_update",
                "changes": {
                    "roomsAdded": [],
                    "artifactsAdded": [{
                        "id": artifact.id,
                        "roomId": artifact.roomId,
                        "type": artifact.type.value,
                        "position": {
                            "x": artifact.position.x,
                            "y": artifact.position.y,
                            "z": artifact.position.z,
                        },
                        "visual": artifact.visual.value,
                        "title": artifact.title,
                        "summary": artifact.summary,
                        "sourceMediaUrl": artifact.sourceMediaUrl,
                        "color": artifact.color,
                        "wall": artifact.wall,
                    }],
                    "connectionsAdded": [],
                },
            })
    except Exception:
        logger.exception("WS push failed after synthesize_room: userId=%s", user_id)

    return {
        "artifact": {
            "id": artifact.id,
            "roomId": artifact.roomId,
            "type": artifact.type.value,
            "visual": artifact.visual.value,
            "summary": artifact.summary,
            "sourceMediaUrl": artifact.sourceMediaUrl,
            "color": artifact.color,
            "position": artifact.position.model_dump(),
            "wall": artifact.wall,
        }
    }
