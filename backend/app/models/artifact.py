from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from app.models.common import Position3D


class ArtifactType(str, Enum):
    lecture = "lecture"
    document = "document"
    visual = "visual"
    conversation = "conversation"
    enrichment = "enrichment"


class ArtifactVisual(str, Enum):
    floating_book = "floating_book"
    hologram_frame = "hologram_frame"
    framed_image = "framed_image"
    speech_bubble = "speech_bubble"
    crystal_orb = "crystal_orb"


# Maps artifact type → required visual per data-model.md validation rules
ARTIFACT_VISUAL_MAP: dict[ArtifactType, ArtifactVisual] = {
    ArtifactType.lecture: ArtifactVisual.hologram_frame,
    ArtifactType.document: ArtifactVisual.floating_book,
    ArtifactType.visual: ArtifactVisual.framed_image,
    ArtifactType.conversation: ArtifactVisual.speech_bubble,
    ArtifactType.enrichment: ArtifactVisual.crystal_orb,
}


class Artifact(BaseModel):
    id: str
    roomId: str
    type: ArtifactType
    position: Position3D
    visual: ArtifactVisual
    summary: str
    fullContent: Optional[str] = None
    embedding: list[float] = []
    sourceMediaUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    createdAt: datetime
    captureSessionId: Optional[str] = None
    enrichments: list[str] = []
    relatedArtifacts: list[str] = []
    color: Optional[str] = None
