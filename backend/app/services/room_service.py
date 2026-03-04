"""Room service — Firestore CRUD and topic-similarity matching.

Paths per agent-prompts.md:
  users/{userId}/rooms/{roomId}
"""

import uuid
import logging
from datetime import UTC, datetime

from app.core.firestore import get_firestore_client
from app.models.common import Dimensions3D, Position3D
from app.models.room import Room
from app.services.embedding_service import cosine_similarity, get_embedding

logger = logging.getLogger(__name__)


def _rooms_ref(user_id: str):
    return get_firestore_client().collection("users").document(user_id).collection("rooms")


async def get_all_rooms(user_id: str) -> list[Room]:
    docs = await _rooms_ref(user_id).get()
    return [Room(**doc.to_dict()) for doc in docs if doc.exists]


async def get_room(user_id: str, room_id: str) -> Room | None:
    doc = await _rooms_ref(user_id).document(room_id).get()
    if not doc.exists:
        return None
    return Room(**doc.to_dict())


async def create_room(
    user_id: str,
    name: str,
    keywords: list[str],
    position: Position3D | None = None,
) -> Room:
    room_id = f"room_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC)

    topic_text = name + " " + " ".join(keywords)
    embedding = await get_embedding(topic_text)

    if position is None:
        existing = await get_all_rooms(user_id)
        position = _next_grid_position(existing)

    room = Room(
        id=room_id,
        name=name,
        position=position,
        dimensions=Dimensions3D(),
        createdAt=now,
        lastAccessedAt=now,
        topicKeywords=keywords,
        topicEmbedding=embedding,
    )
    await _rooms_ref(user_id).document(room_id).set(room.model_dump())
    logger.info("Room created: userId=%s roomId=%s name=%r", user_id, room_id, name)
    return room


async def increment_artifact_count(user_id: str, room_id: str) -> None:
    from google.cloud.firestore import Increment as FSIncrement
    await _rooms_ref(user_id).document(room_id).update({"artifactCount": FSIncrement(1)})


async def update_last_accessed(user_id: str, room_id: str) -> None:
    await _rooms_ref(user_id).document(room_id).update({"lastAccessedAt": datetime.now(UTC)})


async def find_best_room_match(
    user_id: str,
    artifact_embedding: list[float],
) -> tuple[Room | None, float]:
    """Return (best_room, similarity). Returns (None, 0.0) when no rooms exist."""
    rooms = await get_all_rooms(user_id)
    if not rooms:
        return None, 0.0

    best_room: Room | None = None
    best_score = 0.0
    for room in rooms:
        if not room.topicEmbedding:
            continue
        score = cosine_similarity(artifact_embedding, room.topicEmbedding)
        if score > best_score:
            best_score = score
            best_room = room

    return best_room, best_score


def _next_grid_position(existing: list[Room]) -> Position3D:
    """Lay rooms out on a square grid, 30 units apart, starting well clear of the lobby.

    The lobby occupies roughly 0-12 on X and Z, so we start rooms at X=30
    to avoid any geometry overlap.
    """
    OFFSET_X = 30.0   # clear the lobby width
    OFFSET_Z = 0.0
    SPACING = 30.0
    COLS = 3           # rooms per row before wrapping

    n = len(existing)
    col = n % COLS
    row = n // COLS
    return Position3D(x=OFFSET_X + col * SPACING, y=0.0, z=OFFSET_Z + row * SPACING)
