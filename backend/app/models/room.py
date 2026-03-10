from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from app.models.common import Dimensions3D, Position3D


# Removed RoomStyle


class Room(BaseModel):
    id: str
    name: str
    position: Position3D
    dimensions: Dimensions3D = Dimensions3D()
    connections: list[str] = []
    createdAt: datetime
    lastAccessedAt: datetime
    artifactCount: int = 0
    topicKeywords: list[str] = []
    topicEmbedding: list[float] = []
    summary: str = ""  # derived from artifact summaries; updated after each artifact add/delete
    firstMemoryAt: Optional[datetime] = None
    lastMemoryAt: Optional[datetime] = None
