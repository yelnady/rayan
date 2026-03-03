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
) -> Artifact:
    artifact_id = f"artifact_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC)

    embed_text = summary + (" " + full_content[:500] if full_content else "")
    embedding = await get_embedding(embed_text)

    if position is None:
        existing_count = await _count_artifacts(user_id, room_id)
        position = _next_artifact_position(existing_count)

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
    )
    await _artifacts_ref(user_id, room_id).document(artifact_id).set(artifact.model_dump())
    logger.info("Artifact created: userId=%s roomId=%s artifactId=%s", user_id, room_id, artifact_id)
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


async def get_artifact_by_id(user_id: str, artifact_id: str) -> Artifact | None:
    """Fetch an artifact without knowing its room — uses a subcollection query.

    Needed by the /artifacts/{artifactId} REST endpoint which only has the
    artifact ID, not the room ID.
    """
    db = get_firestore_client()
    # Collection group query across all 'artifacts' sub-collections for this user
    query = (
        db.collection_group("artifacts")
        .where("id", "==", artifact_id)
    )
    docs = await query.get()
    for doc in docs:
        if doc.exists:
            # Verify ownership via path: users/{userId}/rooms/{roomId}/artifacts/{artifactId}
            parts = doc.reference.path.split("/")
            if len(parts) >= 6 and parts[1] == user_id:
                return Artifact(**doc.to_dict())
    return None


async def delete_artifact_by_id(user_id: str, artifact_id: str) -> None:
    """Delete an artifact without knowing its room (finds it first)."""
    artifact = await get_artifact_by_id(user_id, artifact_id)
    if artifact is None:
        return
    await _artifacts_ref(user_id, artifact.roomId).document(artifact_id).delete()
    logger.info("Artifact deleted: userId=%s artifactId=%s", user_id, artifact_id)


async def _count_artifacts(user_id: str, room_id: str) -> int:
    docs = await _artifacts_ref(user_id, room_id).select([]).get()
    return len(docs)


def _next_artifact_position(index: int) -> Position3D:
    """Distribute artifacts along room perimeter at eye level."""
    import math
    angle = (index * 45.0) % 360.0
    r = 2.5
    return Position3D(
        x=r * math.cos(math.radians(angle)),
        y=1.5,
        z=r * math.sin(math.radians(angle)),
    )
