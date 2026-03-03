"""Search router — POST /search semantic memory query.

Per rest-api.md §Search:
  POST /search
  Request:  { query, limit?, roomId? }
  Response: { results: [{ artifactId, roomId, roomName, summary, similarity, highlight }] }
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.middleware.auth import verify_token
from app.services.search_service import semantic_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language search query")
    limit: int = Field(default=10, ge=1, le=50, description="Maximum number of results")
    roomId: Optional[str] = Field(default=None, description="Optional: scope search to a specific room")


class SearchResultItem(BaseModel):
    artifactId: str
    roomId: str
    roomName: str
    summary: str
    similarity: float
    highlight: Optional[str]


class SearchResponse(BaseModel):
    results: list[SearchResultItem]


@router.post("", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def search_memories(
    body: SearchRequest,
    user: dict = Depends(verify_token),
) -> SearchResponse:
    """Semantic search across all stored memories.

    Uses cosine similarity against Gemini embeddings to find the most
    relevant artifacts matching the natural language query.
    """
    user_id: str = user["user_id"]

    try:
        results = await semantic_search(
            user_id=user_id,
            query=body.query,
            limit=body.limit,
            room_id=body.roomId,
        )
    except Exception:
        logger.exception("semantic_search failed: userId=%s query=%r", user_id, body.query[:60])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "Search failed. Please try again."},
        )

    return SearchResponse(
        results=[
            SearchResultItem(
                artifactId=r.artifact_id,
                roomId=r.room_id,
                roomName=r.room_name,
                summary=r.summary,
                similarity=round(r.similarity, 4),
                highlight=r.highlight,
            )
            for r in results
        ]
    )
