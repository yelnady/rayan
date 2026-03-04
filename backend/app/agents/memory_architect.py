"""Memory Architect Agent.

Categorizes extracted concepts into palace rooms per agent-prompts.md thresholds:

  similarity >= 0.75  → auto-assign to best matching room (no confirmation)
  similarity 0.5-0.75 → suggest match; broadcast room_suggestion to user
  similarity <  0.5   → create new room; broadcast room_suggestion to user
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Optional

from app.models.artifact import Artifact, ArtifactType
from app.models.room import Room
from app.services.artifact_service import create_artifact
from app.services.embedding_service import get_embedding
from app.services.room_service import (
    create_room,
    find_best_room_match,
    increment_artifact_count,
)

logger = logging.getLogger(__name__)

HIGH_SIMILARITY: float = 0.75
LOW_SIMILARITY: float = 0.50




@dataclass
class CategorizationResult:
    artifact: Artifact
    room: Room
    action: Literal["auto_assigned", "suggested_match", "suggested_new"]
    requires_confirmation: bool
    suggestion: Optional[dict] = None




def _infer_room_name(title: str, keywords: list[str]) -> str:
    if keywords:
        return " ".join(w.title() for w in keywords[:2])
    return " ".join(title.split()[:3])


async def categorize_and_store(
    user_id: str,
    session_id: str,
    concept_title: str,
    concept_summary: str,
    concept_type: str,
    concept_keywords: list[str],
    concept_confidence: float,
    captured_at: Optional[datetime] = None,
) -> CategorizationResult:
    """Embed concept → match room → create artifact → return result."""
    # Map raw string type to enum (default to lecture)
    try:
        artifact_type = ArtifactType(concept_type)
    except ValueError:
        artifact_type = ArtifactType.lecture

    embed_text = concept_title + ". " + concept_summary
    embedding = await get_embedding(embed_text)

    best_room, similarity = await find_best_room_match(user_id, embedding)

    logger.info(
        "categorize: userId=%s title=%r room=%s similarity=%.3f",
        user_id, concept_title, best_room.id if best_room else None, similarity,
    )

    if best_room and similarity >= HIGH_SIMILARITY:
        artifact = await _store(user_id, session_id, best_room.id, artifact_type, concept_title, concept_summary, captured_at)
        await increment_artifact_count(user_id, best_room.id)
        return CategorizationResult(
            artifact=artifact,
            room=best_room,
            action="auto_assigned",
            requires_confirmation=False,
        )

    elif best_room and similarity >= LOW_SIMILARITY:
        artifact = await _store(user_id, session_id, best_room.id, artifact_type, concept_title, concept_summary, captured_at)
        return CategorizationResult(
            artifact=artifact,
            room=best_room,
            action="suggested_match",
            requires_confirmation=True,
            suggestion={
                "action": "assign_existing",
                "room": {
                    "id": best_room.id,
                    "name": best_room.name,
                    "keywords": best_room.topicKeywords,
                    "reason": (
                        f"This matches your '{best_room.name}' room "
                        f"({similarity:.0%} similarity)"
                    ),
                },
                "alternatives": [],
            },
        )

    else:
        room_name = _infer_room_name(concept_title, concept_keywords)
        new_room = await create_room(user_id, room_name, concept_keywords)
        artifact = await _store(user_id, session_id, new_room.id, artifact_type, concept_title, concept_summary, captured_at)
        await increment_artifact_count(user_id, new_room.id)
        return CategorizationResult(
            artifact=artifact,
            room=new_room,
            action="suggested_new",
            requires_confirmation=True,
            suggestion={
                "action": "create_new",
                "room": {
                    "id": new_room.id,
                    "name": new_room.name,
                    "keywords": new_room.topicKeywords,
                    "reason": f"Created a new room for '{concept_title}'",
                },
                "alternatives": [],
            },
        )


async def _store(
    user_id: str,
    session_id: str,
    room_id: str,
    artifact_type: ArtifactType,
    title: str,
    summary: str,
    captured_at: Optional[datetime] = None,
) -> Artifact:
    return await create_artifact(
        user_id=user_id,
        room_id=room_id,
        artifact_type=artifact_type,
        summary=f"{title}: {summary}",
        capture_session_id=session_id,
        captured_at=captured_at,
    )
