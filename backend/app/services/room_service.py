"""Room service — Firestore CRUD and topic-similarity matching.

Paths per agent-prompts.md:
  users/{userId}/rooms/{roomId}
"""

import random
import uuid
import logging
from datetime import UTC, datetime

from app.core.firestore import get_firestore_client
from app.models.common import Dimensions3D, Position3D
from app.models.room import ALL_ROOM_STYLES, Room
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
    style: str | None = None,
) -> Room:
    room_id = f"room_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC)

    topic_text = name + " " + " ".join(keywords)
    embedding = await get_embedding(topic_text)

    if position is None:
        existing = await get_all_rooms(user_id)
        position = _next_grid_position(existing)

    # Pick a random style if not specified, avoiding repeats where possible
    if style is None:
        try:
            existing_styles = {r.style for r in await get_all_rooms(user_id) if r.style}
            unused = [s for s in ALL_ROOM_STYLES if s not in existing_styles]
            style = random.choice(unused) if unused else random.choice(ALL_ROOM_STYLES)
        except Exception:
            style = random.choice(ALL_ROOM_STYLES)

    room = Room(
        id=room_id,
        name=name,
        style=style,
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


async def update_room_summary(user_id: str, room_id: str, summary: str) -> None:
    await _rooms_ref(user_id).document(room_id).update({"summary": summary})


async def recompute_room_summary(user_id: str, room_id: str) -> str:
    from app.services.artifact_service import get_room_artifacts  # local import avoids circular
    artifacts = await get_room_artifacts(user_id, room_id)
    summary = " | ".join(a.summary for a in artifacts if a.summary)

    # Date range calculation
    dates = []
    for a in artifacts:
        # Prefer capturedAt, fallback to createdAt
        dt = a.capturedAt or a.createdAt
        if dt:
            dates.append(dt)

    first_at = min(dates) if dates else None
    last_at = max(dates) if dates else None

    # Update both summary and dates in one Firestore call
    await _rooms_ref(user_id).document(room_id).update({
        "summary": summary,
        "firstMemoryAt": first_at,
        "lastMemoryAt": last_at,
    })
    return summary


async def find_similar_room(
    user_id: str,
    current_room_id: str,
) -> Room | None:
    """Return the room most semantically similar to current_room_id (excluding itself)."""
    rooms = await get_all_rooms(user_id)
    current = next((r for r in rooms if r.id == current_room_id), None)
    if current is None or not current.topicEmbedding:
        return None

    best_room: Room | None = None
    best_score = -1.0
    for room in rooms:
        if room.id == current_room_id or not room.topicEmbedding:
            continue
        score = cosine_similarity(current.topicEmbedding, room.topicEmbedding)
        if score > best_score:
            best_score = score
            best_room = room

    return best_room


async def find_best_room_match(
    user_id: str,
    artifact_embedding: list[float],
    keywords: list[str] | None = None,
) -> tuple[Room | None, float]:
    """Return (best_room, similarity). Returns (None, 0.0) when no rooms exist.

    Scoring priority:
      1. Cosine similarity against room topicEmbedding (primary).
      2. Jaccard keyword overlap (fallback when a room has no embedding), capped
         at 0.6 so it never triggers the HIGH_SIMILARITY auto-assign threshold.
    """
    rooms = await get_all_rooms(user_id)
    if not rooms:
        return None, 0.0

    artifact_kw = {k.lower() for k in (keywords or [])}

    best_room: Room | None = None
    best_score = 0.0
    for room in rooms:
        if room.topicEmbedding:
            score = cosine_similarity(artifact_embedding, room.topicEmbedding)
        elif artifact_kw and room.topicKeywords:
            room_kw = {k.lower() for k in room.topicKeywords}
            union = len(artifact_kw | room_kw)
            score = (len(artifact_kw & room_kw) / union * 0.6) if union else 0.0
        else:
            continue
        if score > best_score:
            best_score = score
            best_room = room

    return best_room, best_score


async def delete_room(user_id: str, room_id: str) -> None:
    """Delete a room, all its artifacts, and its lobby door entry."""
    from app.services.artifact_service import get_room_artifacts
    from app.core.firestore import get_firestore_client

    # Delete all artifacts in the room
    artifacts = await get_room_artifacts(user_id, room_id)
    artifacts_ref = (
        get_firestore_client()
        .collection("users").document(user_id)
        .collection("rooms").document(room_id)
        .collection("artifacts")
    )
    for art in artifacts:
        await artifacts_ref.document(art.id).delete()

    # Delete the room document
    await _rooms_ref(user_id).document(room_id).delete()

    # Remove the corresponding lobby door entry
    layout_ref = (
        get_firestore_client()
        .collection("users").document(user_id)
        .collection("layout").document("main")
    )
    layout_doc = await layout_ref.get()
    if layout_doc.exists:
        existing_doors = (layout_doc.to_dict() or {}).get("lobbyDoors", [])
        updated_doors = [d for d in existing_doors if d.get("roomId") != room_id]
        await layout_ref.set({"lobbyDoors": updated_doors}, merge=True)

    logger.info("Room deleted: userId=%s roomId=%s", user_id, room_id)


async def add_lobby_door(user_id: str, room_id: str) -> dict:
    """Persist a lobby door for a newly created room and return the door dict."""
    from app.core.firestore import get_firestore_client
    _WALL_CYCLE = ["north", "east", "south", "west"]
    layout_ref = (
        get_firestore_client()
        .collection("users").document(user_id)
        .collection("layout").document("main")
    )
    layout_doc = await layout_ref.get()
    existing_doors = (layout_doc.to_dict() or {}).get("lobbyDoors", []) if layout_doc.exists else []
    door_idx = len(existing_doors)
    new_door = {
        "roomId": room_id,
        "wallPosition": _WALL_CYCLE[door_idx % 4],
        "doorIndex": door_idx // 4,
    }
    await layout_ref.set({"lobbyDoors": existing_doors + [new_door]}, merge=True)
    logger.info("Lobby door added: userId=%s roomId=%s door=%s", user_id, room_id, new_door)
    return new_door


def _next_grid_position(existing: list[Room]) -> Position3D:
    """Lay rooms out on a square grid, 30 units apart, starting well clear of the lobby.

    The lobby occupies roughly 0-12 on X and Z, so we start rooms at X=30
    to avoid any geometry overlap.

    Occupied slots are derived from existing room positions rather than using
    len(existing) as an index, so deletions and race conditions don't cause
    two rooms to land on the same spot.
    """
    OFFSET_X = 30.0
    OFFSET_Z = 0.0
    SPACING = 30.0
    COLS = 3
    SNAP = SPACING / 2  # tolerance for snapping a position to a grid slot

    occupied: set[tuple[int, int]] = set()
    for room in existing:
        col = round((room.position.x - OFFSET_X) / SPACING)
        row = round((room.position.z - OFFSET_Z) / SPACING)
        # Only count positions that are close enough to a valid grid slot
        if (
            abs(room.position.x - (OFFSET_X + col * SPACING)) < SNAP
            and abs(room.position.z - (OFFSET_Z + row * SPACING)) < SNAP
            and col >= 0 and row >= 0
        ):
            occupied.add((col, row))

    # Scan grid slots in row-major order and return the first free one
    n = 0
    while True:
        col = n % COLS
        row = n // COLS
        if (col, row) not in occupied:
            return Position3D(x=OFFSET_X + col * SPACING, y=0.0, z=OFFSET_Z + row * SPACING)
        n += 1
