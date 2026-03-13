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
    title: str = "",
    keywords: Optional[list[str]] = None,
    full_content: Optional[str] = None,
    capture_session_id: Optional[str] = None,
    position: Optional[Position3D] = None,
    color: Optional[str] = None,
    is_seed_data: bool = False,
    captured_at: Optional[datetime] = None,
    wall: Optional[str] = None,
) -> Artifact:
    artifact_id = f"artifact_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC)

    embed_text = summary + (" " + full_content[:500] if full_content else "")
    embedding = await get_embedding(embed_text)

    if position is None or wall is None:
        occupied = await _get_occupied_slots(user_id, room_id)
        exit_wall = await _get_room_exit_wall(user_id, room_id)
        default_pos, default_wall = _next_artifact_position(occupied, exit_wall)
        position = position or default_pos
        wall = wall or default_wall

    artifact = Artifact(
        id=artifact_id,
        roomId=room_id,
        type=artifact_type,
        position=position,
        visual=ARTIFACT_VISUAL_MAP[artifact_type],
        title=title,
        keywords=keywords or [],
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


async def update_artifact(
    user_id: str,
    artifact_id: str,
    summary: Optional[str] = None,
    full_content: Optional[str] = None,
) -> Artifact | None:
    """Update an artifact's summary and/or full_content, regenerating its embedding."""
    artifact = await get_artifact_by_id(user_id, artifact_id)
    if artifact is None:
        return None

    room_id = artifact.roomId
    updates: dict = {}

    if summary is not None:
        updates["summary"] = summary
        artifact.summary = summary
    if full_content is not None:
        updates["fullContent"] = full_content
        artifact.fullContent = full_content

    if updates:
        embed_text = artifact.summary + (" " + artifact.fullContent[:500] if artifact.fullContent else "")
        updates["embedding"] = await get_embedding(embed_text)
        await _artifacts_ref(user_id, room_id).document(artifact_id).update(updates)
        logger.info("Artifact updated: userId=%s artifactId=%s fields=%s", user_id, artifact_id, list(updates.keys()))

    import asyncio
    from app.services.room_service import recompute_room_summary
    asyncio.create_task(recompute_room_summary(user_id, room_id), name=f"room-summary-{room_id}")

    return artifact


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


_EXIT_WALL_MAP = {"north": "south", "east": "west", "south": "north", "west": "east"}


async def _get_room_exit_wall(user_id: str, room_id: str) -> str | None:
    """Return the wall that holds the lobby exit door for this room, or None."""
    layout_ref = (
        get_firestore_client()
        .collection("users")
        .document(user_id)
        .collection("layout")
        .document("main")
    )
    layout_doc = await layout_ref.get()
    if not layout_doc.exists:
        return None
    lobby_doors = (layout_doc.to_dict() or {}).get("lobbyDoors", [])
    for d in lobby_doors:
        if d.get("roomId") == room_id:
            lobby_wall = d.get("wallPosition", "")
            return _EXIT_WALL_MAP.get(lobby_wall)
    return None


async def _get_occupied_slots(user_id: str, room_id: str) -> set[tuple[float, float, float]]:
    """Return a set of (x, y, z) positions already occupied in the room."""
    docs = await _artifacts_ref(user_id, room_id).select(["position"]).get()
    occupied: set[tuple[float, float, float]] = set()
    for doc in docs:
        if not doc.exists:
            continue
        pos = (doc.to_dict() or {}).get("position", {})
        if pos:
            occupied.add((
                round(float(pos.get("x", 0)), 2),
                round(float(pos.get("y", 0)), 2),
                round(float(pos.get("z", 0)), 2),
            ))
    return occupied


# Pre-built wall slots for an 8×8 room.
# North wall (z≈0) is reserved for the decorative shelf.
# Slots alternate west/east/south so the room fills evenly.
# Lower row (y=1.8) fills first, then upper row (y=2.7), then a third row (y=3.6).
_WALL_SLOTS: list[tuple[Position3D, str]] = [
    # ── lower row ──────────────────────────────────────────────────────────
    (Position3D(x=0.05, y=1.8, z=2.0),  "west"),
    (Position3D(x=7.95, y=1.8, z=2.0),  "east"),
    (Position3D(x=0.05, y=1.8, z=4.0),  "west"),
    (Position3D(x=7.95, y=1.8, z=4.0),  "east"),
    (Position3D(x=0.05, y=1.8, z=6.0),  "west"),
    (Position3D(x=7.95, y=1.8, z=6.0),  "east"),
    (Position3D(x=2.0,  y=1.8, z=7.95), "south"),
    (Position3D(x=4.0,  y=1.8, z=7.95), "south"),
    (Position3D(x=6.0,  y=1.8, z=7.95), "south"),
    # ── upper row ──────────────────────────────────────────────────────────
    (Position3D(x=0.05, y=2.7, z=2.0),  "west"),
    (Position3D(x=7.95, y=2.7, z=2.0),  "east"),
    (Position3D(x=0.05, y=2.7, z=4.0),  "west"),
    (Position3D(x=7.95, y=2.7, z=4.0),  "east"),
    (Position3D(x=0.05, y=2.7, z=6.0),  "west"),
    (Position3D(x=7.95, y=2.7, z=6.0),  "east"),
    (Position3D(x=2.0,  y=2.7, z=7.95), "south"),
    (Position3D(x=4.0,  y=2.7, z=7.95), "south"),
    (Position3D(x=6.0,  y=2.7, z=7.95), "south"),
    # ── third row (high) ───────────────────────────────────────────────────
    (Position3D(x=0.05, y=3.6, z=2.0),  "west"),
    (Position3D(x=7.95, y=3.6, z=2.0),  "east"),
    (Position3D(x=0.05, y=3.6, z=4.0),  "west"),
    (Position3D(x=7.95, y=3.6, z=4.0),  "east"),
    (Position3D(x=0.05, y=3.6, z=6.0),  "west"),
    (Position3D(x=7.95, y=3.6, z=6.0),  "east"),
    (Position3D(x=2.0,  y=3.6, z=7.95), "south"),
    (Position3D(x=4.0,  y=3.6, z=7.95), "south"),
    (Position3D(x=6.0,  y=3.6, z=7.95), "south"),
]


def _next_artifact_position(
    occupied: set[tuple[float, float, float]],
    exit_wall: str | None = None,
) -> tuple[Position3D, str]:
    """Return the first wall slot not already occupied, skipping door openings.

    Falls back to a floating center position offset by slot index when all
    wall slots are taken (extremely rare).

    The exit door is always centred at 4.0 along the wall (for an 8-unit room
    with one door at index 0), covering 3.25–4.75 ± a 0.25 safety margin.
    """
    _DOOR_CENTER = 4.0
    _DOOR_HALF = 0.75 + 0.25  # DOOR_WIDTH / 2 + safety margin

    for pos, wall in _WALL_SLOTS:
        # Skip any slot whose position along the wall falls inside the door gap.
        if exit_wall and wall == exit_wall:
            coord = pos.x if wall == "south" else pos.z
            if abs(coord - _DOOR_CENTER) < _DOOR_HALF:
                continue
        key = (round(pos.x, 2), round(pos.y, 2), round(pos.z, 2))
        if key not in occupied:
            return pos, wall

    # Overflow: float artifacts in the center at increasing heights
    overflow_index = len(occupied) - len(_WALL_SLOTS)
    return Position3D(x=4.0, y=1.5 + overflow_index * 0.5, z=4.0), "south"
