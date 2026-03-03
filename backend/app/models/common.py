from pydantic import BaseModel


class Position3D(BaseModel):
    x: float
    y: float
    z: float


class Rotation3D(BaseModel):
    pitch: float
    yaw: float
    roll: float


class Dimensions3D(BaseModel):
    w: float = 8.0
    d: float = 8.0
    h: float = 4.0
