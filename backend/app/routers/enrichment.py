"""Enrichment router — REST endpoints for enrichment status.

Provides:
  PATCH /enrichments/{enrichmentId}  — mark an enrichment as verified/unverified
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import verify_token
from app.services.enrichment_service import update_enrichment_verified

logger = logging.getLogger(__name__)

router = APIRouter(tags=["enrichment"])


# ── Request / Response models ─────────────────────────────────────────────────


class PatchEnrichmentRequest(BaseModel):
    verified: bool


class PatchEnrichmentResponse(BaseModel):
    success: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.patch("/enrichments/{enrichment_id}", response_model=PatchEnrichmentResponse)
async def patch_enrichment(
    enrichment_id: str,
    body: PatchEnrichmentRequest,
    user: dict = Depends(verify_token),
    artifact_id: str = "",
) -> PatchEnrichmentResponse:
    """Update the verified flag on an enrichment.

    Query param `artifact_id` is required to locate the enrichment document.
    """
    user_id: str = user["user_id"]

    if not artifact_id:
        raise HTTPException(
            status_code=422,
            detail="artifact_id query parameter is required to locate the enrichment.",
        )

    success = await update_enrichment_verified(
        user_id=user_id,
        artifact_id=artifact_id,
        enrichment_id=enrichment_id,
        verified=body.verified,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Enrichment {enrichment_id!r} not found for artifact {artifact_id!r}",
        )

    return PatchEnrichmentResponse(success=True)
