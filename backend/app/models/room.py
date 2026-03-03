from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.models.common import Dimensions3D, Position3D


class RoomStyle(str, Enum):
    library = "library"
    lab = "lab"
    gallery = "gallery"
    garden = "garden"
    workshop = "workshop"


class Room(BaseModel):
    id: str
    name: str
    position: Position3D
    dimensions: Dimensions3D = Dimensions3D()
    style: RoomStyle
    connections: list[str] = []
    createdAt: datetime
    lastAccessedAt: datetime
    artifactCount: int = 0
    topicKeywords: list[str] = []
    topicEmbedding: list[float] = []
