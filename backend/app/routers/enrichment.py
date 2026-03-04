"""Enrichment router — REST endpoints for enrichment triggers and status.

T123: Provides:
  POST  /enrichment/trigger          — kick off async enrichment for an artifact
  PATCH /enrichments/{enrichmentId}  — mark an enrichment as verified/unverified
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import verify_token
from app.services.artifact_service import get_artifact_by_id
from app.services.enrichment_service import update_enrichment_verified
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["enrichment"])


# ── Request / Response models ─────────────────────────────────────────────────


class TriggerRequest(BaseModel):
    artifactId: str


class TriggerResponse(BaseModel):
    status: str
    message: str


class PatchEnrichmentRequest(BaseModel):
    verified: bool


class PatchEnrichmentResponse(BaseModel):
    success: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/enrichment/trigger", status_code=202, response_model=TriggerResponse)
async def trigger_enrichment(
    body: TriggerRequest,
    user: dict = Depends(verify_token),
) -> TriggerResponse:
    """Manually trigger web enrichment for an artifact.

    Returns 202 Accepted immediately; enrichments arrive via WebSocket
    enrichment_update messages as they are created.
    """
    user_id: str = user["user_id"]
    artifact_id: str = body.artifactId

    artifact = await get_artifact_by_id(user_id, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail=f"Artifact {artifact_id!r} not found")

    # Import here to avoid circular deps (agent imports services, not routers)
    from app.agents.enrichment_agent import run_enrichment

    async def _on_enrichment(payload: dict) -> None:
        await manager.send(user_id, payload)

    asyncio.create_task(
        run_enrichment(
            user_id=user_id,
            artifact=artifact,
            room_id=artifact.roomId,
            on_enrichment_created=_on_enrichment,
        ),
        name=f"enrichment-{user_id}-{artifact_id}",
    )

    logger.info("enrichment triggered: userId=%s artifactId=%s", user_id, artifact_id)
    return TriggerResponse(
        status="processing",
        message="Enrichment started. Updates will arrive via WebSocket.",
    )


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
