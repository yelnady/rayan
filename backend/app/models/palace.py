from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from app.models.common import Position3D, Rotation3D

WallPosition = Literal["north", "east", "south", "west"]


class LobbyDoor(BaseModel):
    roomId: str
    wallPosition: WallPosition
    doorIndex: int


class Corridor(BaseModel):
    fromRoomId: str
    toRoomId: str
    reason: str
    createdAt: datetime


class Palace(BaseModel):
    id: str
    userId: str
    createdAt: datetime
    lastModifiedAt: datetime
    lobbyPosition: Position3D = Position3D(x=0, y=0, z=0)
    roomCount: int = 0
    artifactCount: int = 0


class Layout(BaseModel):
    lobbyDoors: list[LobbyDoor] = []
    corridors: list[Corridor] = []
    lastCameraPosition: Optional[Position3D] = None
    lastCameraRotation: Optional[Rotation3D] = None
    lastRoomId: Optional[str] = None
