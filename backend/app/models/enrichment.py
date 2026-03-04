"""Enrichment model — external data attached to an artifact.

Firestore path per data-model.md:
  users/{userId}/palace/rooms/{roomId}/artifacts/{artifactId}/enrichments/{enrichmentId}
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EnrichmentImage(BaseModel):
    url: str
    caption: str
    sourceUrl: str = ""


class Enrichment(BaseModel):
    id: str
    artifactId: str
    sourceUrl: str
    sourceName: str
    extractedContent: str
    images: list[EnrichmentImage] = []
    createdAt: datetime
    relevanceScore: float = 0.0
    verified: Optional[bool] = None
