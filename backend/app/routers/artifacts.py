"""Artifacts REST router — GET /artifacts/{artifactId}, DELETE /artifacts/{artifactId}.

Per rest-api.md §Artifacts.

GET  /artifacts/{artifactId}
  → { artifact: {..., relatedArtifacts, fullContent, enrichments}, enrichments: [...] }

DELETE /artifacts/{artifactId}
  → { success: true }
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from fastapi import Query

from app.middleware.auth import verify_token
from app.services.artifact_service import get_artifact_by_id, delete_artifact_by_id, move_artifact
from app.services.search_service import semantic_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


# ── Response Models ───────────────────────────────────────────────────────────

from pydantic import BaseModel


class ArtifactPosition(BaseModel):
    x: float
    y: float
    z: float


class EnrichmentImage(BaseModel):
    url: str
    caption: str


class EnrichmentDetail(BaseModel):
    id: str
    sourceName: str
    sourceUrl: str
    extractedContent: Optional[str] = None
    images: list[EnrichmentImage] = []
    createdAt: str
    relevanceScore: Optional[float] = None


class ArtifactDetail(BaseModel):
    id: str
    roomId: str
    type: str
    position: ArtifactPosition
    visual: str
    summary: str
    fullContent: Optional[str] = None
    sourceMediaUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    createdAt: str
    capturedAt: Optional[str] = None
    captureSessionId: Optional[str] = None
    relatedArtifacts: list[str] = []
    color: Optional[str] = None


class ArtifactDetailResponse(BaseModel):
    artifact: ArtifactDetail
    enrichments: list[EnrichmentDetail] = []


class RelatedMemory(BaseModel):
    artifactId: str
    roomId: str
    roomName: str
    summary: str
    similarity: float


class RelatedMemoriesResponse(BaseModel):
    related: list[RelatedMemory]


class MoveRequest(BaseModel):
    roomId: str


class MoveResponse(BaseModel):
    artifact: ArtifactDetail


class DeleteResponse(BaseModel):
    success: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "/{artifact_id}",
    response_model=ArtifactDetailResponse,
    status_code=status.HTTP_200_OK,
)
async def get_artifact_detail(
    artifact_id: str,
    user: dict = Depends(verify_token),
) -> ArtifactDetailResponse:
    """Return full artifact details including enrichments.

    Per rest-api.md §GET /artifacts/{artifactId}.
    """
    user_id: str = user["user_id"]

    try:
        result = await get_artifact_by_id(user_id, artifact_id)
    except Exception:
        logger.exception(
            "get_artifact_by_id failed: userId=%s artifactId=%s", user_id, artifact_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "Failed to retrieve artifact."},
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RESOURCE_NOT_FOUND",
                "message": "Artifact not found",
                "details": {"artifactId": artifact_id},
            },
        )

    artifact_doc = result
    # Enrichments are stored on the artifact document as IDs — for now return empty list
    # (full enrichment service is Phase 6 / US4)
    enrichment_docs: list = []

    return ArtifactDetailResponse(
        artifact=ArtifactDetail(
            id=artifact_doc.id,
            roomId=artifact_doc.roomId,
            type=artifact_doc.type,
            position=ArtifactPosition(
                x=artifact_doc.position.x,
                y=artifact_doc.position.y,
                z=artifact_doc.position.z,
            ),
            visual=artifact_doc.visual,
            summary=artifact_doc.summary,
            fullContent=getattr(artifact_doc, "fullContent", None),
            sourceMediaUrl=getattr(artifact_doc, "sourceMediaUrl", None),
            thumbnailUrl=getattr(artifact_doc, "thumbnailUrl", None),
            createdAt=artifact_doc.createdAt.isoformat(),
            capturedAt=artifact_doc.capturedAt.isoformat() if artifact_doc.capturedAt else None,
            captureSessionId=getattr(artifact_doc, "captureSessionId", None),
            relatedArtifacts=getattr(artifact_doc, "relatedArtifacts", []),
            color=getattr(artifact_doc, "color", None),
        ),
        enrichments=[
            EnrichmentDetail(
                id=e.id,
                sourceName=e.sourceName,
                sourceUrl=e.sourceUrl,
                extractedContent=getattr(e, "extractedContent", None),
                images=[EnrichmentImage(url=img.url, caption=img.caption) for img in e.images],
                createdAt=e.createdAt,
                relevanceScore=getattr(e, "relevanceScore", None),
            )
            for e in enrichment_docs
        ],
    )


@router.get(
    "/{artifact_id}/related",
    response_model=RelatedMemoriesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_related_memories(
    artifact_id: str,
    threshold: float = Query(default=0.50, ge=0.0, le=1.0),
    limit: int = Query(default=5, ge=1, le=20),
    user: dict = Depends(verify_token),
) -> RelatedMemoriesResponse:
    """Return semantically similar artifacts above the similarity threshold."""
    user_id: str = user["user_id"]

    artifact = await get_artifact_by_id(user_id, artifact_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Artifact not found"},
        )

    if not artifact.summary:
        return RelatedMemoriesResponse(related=[])

    results = await semantic_search(user_id, artifact.summary, limit=limit + 1)

    related = [
        RelatedMemory(
            artifactId=r.artifact_id,
            roomId=r.room_id,
            roomName=r.room_name,
            summary=r.summary,
            similarity=round(r.similarity, 3),
        )
        for r in results
        if r.artifact_id != artifact_id and r.similarity >= threshold
    ][:limit]

    return RelatedMemoriesResponse(related=related)


@router.post(
    "/{artifact_id}/move",
    response_model=MoveResponse,
    status_code=status.HTTP_200_OK,
)
async def move_artifact_endpoint(
    artifact_id: str,
    body: MoveRequest,
    user: dict = Depends(verify_token),
) -> MoveResponse:
    """Move an artifact to a different room."""
    user_id: str = user["user_id"]

    result = await move_artifact(user_id, artifact_id, body.roomId)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Artifact not found"},
        )

    return MoveResponse(
        artifact=ArtifactDetail(
            id=result.id,
            roomId=result.roomId,
            type=result.type,
            position=ArtifactPosition(x=result.position.x, y=result.position.y, z=result.position.z),
            visual=result.visual,
            summary=result.summary,
            fullContent=getattr(result, "fullContent", None),
            sourceMediaUrl=getattr(result, "sourceMediaUrl", None),
            thumbnailUrl=getattr(result, "thumbnailUrl", None),
            createdAt=result.createdAt.isoformat(),
            capturedAt=result.capturedAt.isoformat() if result.capturedAt else None,
            captureSessionId=getattr(result, "captureSessionId", None),
            color=getattr(result, "color", None),
        )
    )


@router.delete(
    "/{artifact_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_artifact_endpoint(
    artifact_id: str,
    user: dict = Depends(verify_token),
) -> DeleteResponse:
    """Delete an artifact and its associated embeddings.

    Per rest-api.md §DELETE /artifacts/{artifactId}.
    """
    user_id: str = user["user_id"]

    try:
        await delete_artifact_by_id(user_id, artifact_id)
    except Exception:
        logger.exception(
            "delete_artifact failed: userId=%s artifactId=%s", user_id, artifact_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "Failed to delete artifact."},
        )

    logger.info("delete_artifact: userId=%s artifactId=%s", user_id, artifact_id)
    return DeleteResponse(success=True)
