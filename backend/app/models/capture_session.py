from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class SessionStatus(str, Enum):
    active = "active"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class SourceType(str, Enum):
    webcam = "webcam"
    screen_share = "screen_share"
    upload = "upload"
    text_input = "text_input"


class CaptureSession(BaseModel):
    id: str
    userId: str
    startedAt: datetime
    endedAt: Optional[datetime] = None
    status: SessionStatus = SessionStatus.active
    sourceType: SourceType
    rawMediaUrl: Optional[str] = None
    extractedArtifactIds: list[str] = []
    conceptCount: int = 0
    durationSeconds: Optional[float] = None
