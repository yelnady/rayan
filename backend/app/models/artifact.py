from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from app.models.common import Position3D


class ArtifactType(str, Enum):
    # Original types
    lecture = "lecture"
    document = "document"
    visual = "visual"
    conversation = "conversation"
    enrichment = "enrichment"
    # Knowledge & Learning
    lesson = "lesson"
    insight = "insight"
    question = "question"
    # Experiences & Emotions
    moment = "moment"
    milestone = "milestone"
    emotion = "emotion"
    dream = "dream"
    habit = "habit"
    # Opinions & Identity
    opinion = "opinion"
    media = "media"
    # Goals
    goal = "goal"


class ArtifactVisual(str, Enum):
    # Procedural (existing)
    floating_book = "floating_book"
    hologram_frame = "hologram_frame"
    framed_image = "framed_image"
    speech_bubble = "speech_bubble"
    crystal_orb = "crystal_orb"
    # GLB models
    lesson = "lesson"           # lesson.glb
    brain = "brain"             # Brain.glb
    question = "question"       # question.glb
    coffee = "coffee"           # coffee.glb
    milestone = "milestone"     # Milestone.glb
    heart = "heart"             # heart.glb
    dream = "dream"             # Dream.glb
    tree = "tree"               # Tree.glb
    opinion = "opinion"         # Opinion.glb
    headphones = "headphones"   # Headphones.glb
    cash_stack = "cash_stack"   # Cash Stack.glb


# Maps artifact type → visual
ARTIFACT_VISUAL_MAP: dict[ArtifactType, ArtifactVisual] = {
    ArtifactType.lecture: ArtifactVisual.hologram_frame,
    ArtifactType.document: ArtifactVisual.floating_book,
    ArtifactType.visual: ArtifactVisual.framed_image,
    ArtifactType.conversation: ArtifactVisual.speech_bubble,
    ArtifactType.enrichment: ArtifactVisual.crystal_orb,
    ArtifactType.lesson: ArtifactVisual.lesson,
    ArtifactType.insight: ArtifactVisual.brain,
    ArtifactType.question: ArtifactVisual.question,
    ArtifactType.moment: ArtifactVisual.coffee,
    ArtifactType.milestone: ArtifactVisual.milestone,
    ArtifactType.emotion: ArtifactVisual.heart,
    ArtifactType.dream: ArtifactVisual.dream,
    ArtifactType.habit: ArtifactVisual.tree,
    ArtifactType.opinion: ArtifactVisual.opinion,
    ArtifactType.media: ArtifactVisual.headphones,
    ArtifactType.goal: ArtifactVisual.cash_stack,
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
    wall: Optional[str] = None
    isSeedData: bool = False
    capturedAt: Optional[datetime] = None
