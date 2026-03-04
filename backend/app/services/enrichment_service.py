"""Enrichment service — Firestore CRUD for Enrichment documents.

T118: Provides create/read/list operations for enrichments.

Firestore path per data-model.md:
  users/{userId}/rooms/{roomId}/artifacts/{artifactId}/enrichments/{enrichmentId}

Note: The artifact document lives at:
  users/{userId}/palace/rooms/{roomId}/artifacts/{artifactId}

We need roomId when writing enrichments. If roomId is unknown, callers
should use artifact_service.get_artifact_by_id() to resolve it first.
"""

import logging
import uuid
from datetime import UTC, datetime
from typing import Optional

from app.core.firestore import get_firestore_client
from app.models.enrichment import Enrichment, EnrichmentImage
from app.services.artifact_service import get_artifact_by_id

logger = logging.getLogger(__name__)


def _enrichments_ref(user_id: str, room_id: str, artifact_id: str):
    return (
        get_firestore_client()
        .collection("users")
        .document(user_id)
        .collection("rooms")
        .document(room_id)
        .collection("artifacts")
        .document(artifact_id)
        .collection("enrichments")
    )


async def create_enrichment(
    user_id: str,
    artifact_id: str,
    room_id: str,
    source_url: str,
    source_name: str,
    extracted_content: str,
    images: Optional[list[EnrichmentImage]] = None,
    relevance_score: float = 0.0,
) -> Enrichment:
    enrichment_id = f"enrichment_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC)

    enrichment = Enrichment(
        id=enrichment_id,
        artifactId=artifact_id,
        sourceUrl=source_url,
        sourceName=source_name,
        extractedContent=extracted_content,
        images=images or [],
        createdAt=now,
        relevanceScore=relevance_score,
    )

    await _enrichments_ref(user_id, room_id, artifact_id).document(enrichment_id).set(
        enrichment.model_dump()
    )

    # Update the artifact's enrichment ID list
    db = get_firestore_client()
    artifact_ref = (
        db.collection("users")
        .document(user_id)
        .collection("rooms")
        .document(room_id)
        .collection("artifacts")
        .document(artifact_id)
    )
    # Append the enrichment ID using Firestore ArrayUnion
    from google.cloud.firestore_v1 import ArrayUnion  # type: ignore
    await artifact_ref.update({"enrichments": ArrayUnion([enrichment_id])})

    logger.info(
        "Enrichment created: userId=%s artifactId=%s enrichmentId=%s",
        user_id, artifact_id, enrichment_id,
    )
    return enrichment


async def get_enrichment(
    user_id: str, room_id: str, artifact_id: str, enrichment_id: str
) -> Enrichment | None:
    doc = await _enrichments_ref(user_id, room_id, artifact_id).document(enrichment_id).get()
    if not doc.exists:
        return None
    return Enrichment(**doc.to_dict())


async def get_enrichments_for_artifact(
    user_id: str, room_id: str, artifact_id: str
) -> list[Enrichment]:
    docs = await _enrichments_ref(user_id, room_id, artifact_id).order_by("createdAt").get()
    return [Enrichment(**doc.to_dict()) for doc in docs if doc.exists]


async def update_enrichment_verified(
    user_id: str, artifact_id: str, enrichment_id: str, verified: bool
) -> bool:
    """Patch the verified flag on an enrichment document.

    Resolves room_id via artifact lookup since the REST endpoint only
    provides artifactId + enrichmentId.
    """
    artifact = await get_artifact_by_id(user_id, artifact_id)
    if artifact is None:
        logger.warning("update_enrichment_verified: artifact not found: %s", artifact_id)
        return False

    ref = _enrichments_ref(user_id, artifact.roomId, artifact_id).document(enrichment_id)
    await ref.update({"verified": verified})
    logger.info(
        "Enrichment verified: userId=%s enrichmentId=%s verified=%s",
        user_id, enrichment_id, verified,
    )
    return True
