from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class CaptureQuality(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Preferences(BaseModel):
    voiceEnabled: bool = True
    enrichmentEnabled: bool = True
    captureQuality: CaptureQuality = CaptureQuality.medium
    theme: str = "default"


class User(BaseModel):
    id: str
    email: str
    displayName: Optional[str] = None
    avatarUrl: Optional[str] = None
    createdAt: datetime
    lastActiveAt: datetime
    preferences: Preferences = Preferences()
