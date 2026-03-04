from datetime import datetime
from enum import Enum

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
