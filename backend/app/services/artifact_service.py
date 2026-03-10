"""Artifact service — Firestore CRUD with automatic embedding generation.

Paths per agent-prompts.md:
  users/{userId}/rooms/{roomId}/artifacts/{artifactId}
"""

import uuid
import logging
from datetime import UTC, datetime
from typing import Optional

from app.core.firestore import get_firestore_client
from app.models.artifact import Artifact, ArtifactType, ARTIFACT_VISUAL_MAP
from app.models.common import Position3D
from app.services.embedding_service import get_embedding

logger = logging.getLogger(__name__)


def _artifacts_ref(user_id: str, room_id: str):
    return (
        get_firestore_client()
        .collection("users")
        .document(user_id)
        .collection("rooms")
        .document(room_id)
        .collection("artifacts")
    )


async def create_artifact(
    user_id: str,
    room_id: str,
    artifact_type: ArtifactType,
    summary: str,
    full_content: Optional[str] = None,
    capture_session_id: Optional[str] = None,
    position: Optional[Position3D] = None,
    color: Optional[str] = None,
    is_seed_data: bool = False,
    skip_enrichment: bool = False,
    captured_at: Optional[datetime] = None,
    wall: Optional[str] = None,
) -> Artifact:
    artifact_id = f"artifact_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC)

    embed_text = summary + (" " + full_content[:500] if full_content else "")
    embedding = await get_embedding(embed_text)

    if position is None or wall is None:
        existing_count = await _count_artifacts(user_id, room_id)
        default_pos, default_wall = _next_artifact_position(existing_count)
        position = position or default_pos
        wall = wall or default_wall

    artifact = Artifact(
        id=artifact_id,
        roomId=room_id,
        type=artifact_type,
        position=position,
        visual=ARTIFACT_VISUAL_MAP[artifact_type],
        summary=summary,
        fullContent=full_content,
        embedding=embedding,
        createdAt=now,
        captureSessionId=capture_session_id,
        color=color,
        wall=wall,
        isSeedData=is_seed_data,
        capturedAt=captured_at or now,
    )
    await _artifacts_ref(user_id, room_id).document(artifact_id).set(artifact.model_dump())
    logger.info("Artifact created: userId=%s roomId=%s artifactId=%s", user_id, room_id, artifact_id)

    import asyncio
    from app.services.room_service import recompute_room_summary
    asyncio.create_task(recompute_room_summary(user_id, room_id), name=f"room-summary-{room_id}")

    if not skip_enrichment:
        # T122: Kick off web enrichment asynchronously after artifact creation
        from app.agents.enrichment_agent import run_enrichment
        from app.websocket.manager import manager

        async def _on_enrichment(payload: dict) -> None:
            await manager.send(user_id, payload)

        asyncio.create_task(
            run_enrichment(
                user_id=user_id,
                artifact=artifact,
                room_id=room_id,
                on_enrichment_created=_on_enrichment,
            ),
            name=f"enrichment-{user_id}-{artifact_id}",
        )

    return artifact



async def get_artifact(user_id: str, room_id: str, artifact_id: str) -> Artifact | None:
    doc = await _artifacts_ref(user_id, room_id).document(artifact_id).get()
    if not doc.exists:
        return None
    return Artifact(**doc.to_dict())


async def get_room_artifacts(user_id: str, room_id: str) -> list[Artifact]:
    docs = await _artifacts_ref(user_id, room_id).order_by("createdAt").get()
    return [Artifact(**doc.to_dict()) for doc in docs if doc.exists]


async def delete_artifact(user_id: str, room_id: str, artifact_id: str) -> None:
    await _artifacts_ref(user_id, room_id).document(artifact_id).delete()
    logger.info("Artifact deleted: userId=%s roomId=%s artifactId=%s", user_id, room_id, artifact_id)
    from app.services.room_service import recompute_room_summary
    await recompute_room_summary(user_id, room_id)


async def get_artifact_by_id(user_id: str, artifact_id: str) -> Artifact | None:
    """Fetch an artifact without knowing its room.

    Needed by the /artifacts/{artifactId} REST endpoint which only has the
    artifact ID, not the room ID. Uses direct document lookups to avoid
    requiring a Firestore collection-group index on the 'id' field.
    """
    from app.services.room_service import get_all_rooms

    db = get_firestore_client()
    rooms = await get_all_rooms(user_id)
    for room in rooms:
        doc = await (
            db.collection("users")
            .document(user_id)
            .collection("rooms")
            .document(room.id)
            .collection("artifacts")
            .document(artifact_id)
            .get()
        )
        if doc.exists:
            return Artifact(**doc.to_dict())
    return None


async def delete_artifact_by_id(user_id: str, artifact_id: str) -> None:
    """Delete an artifact without knowing its room (finds it first)."""
    artifact = await get_artifact_by_id(user_id, artifact_id)
    if artifact is None:
        return
    room_id = artifact.roomId
    await _artifacts_ref(user_id, room_id).document(artifact_id).delete()
    logger.info("Artifact deleted: userId=%s artifactId=%s", user_id, artifact_id)
    from app.services.room_service import recompute_room_summary
    await recompute_room_summary(user_id, room_id)


async def _count_artifacts(user_id: str, room_id: str) -> int:
    docs = await _artifacts_ref(user_id, room_id).select([]).get()
    return len(docs)


def _next_artifact_position(index: int) -> tuple[Position3D, str]:
    """Place artifacts flush against room walls at eye level.

    Room local space is 8×8 (Dimensions3D default).
    North wall (z≈0) is occupied by the decorative shelf, so artifacts
    cycle through east, west, and south walls instead.
    """
    _SLOTS = [
        (Position3D(x=0.05, y=1.8, z=2.5), "west"),   # 0 – west wall, lower-front
        (Position3D(x=7.95, y=1.8, z=2.5), "east"),   # 1 – east wall, lower-front
        (Position3D(x=0.05, y=1.8, z=5.5), "west"),   # 2 – west wall, lower-back
        (Position3D(x=7.95, y=1.8, z=5.5), "east"),   # 3 – east wall, lower-back
        (Position3D(x=2.0,  y=1.8, z=7.95), "south"), # 4 – south wall, left
        (Position3D(x=6.0,  y=1.8, z=7.95), "south"), # 5 – south wall, right
        (Position3D(x=0.05, y=2.7, z=2.5), "west"),   # 6 – west wall, upper-front
        (Position3D(x=7.95, y=2.7, z=2.5), "east"),   # 7 – east wall, upper-front
        (Position3D(x=0.05, y=2.7, z=5.5), "west"),   # 8 – west wall, upper-back
        (Position3D(x=7.95, y=2.7, z=5.5), "east"),   # 9 – east wall, upper-back
        (Position3D(x=4.0,  y=1.8, z=7.95), "south"), # 10 – south wall, center
    ]
    return _SLOTS[index % len(_SLOTS)]
