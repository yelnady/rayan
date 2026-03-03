"""Capture session service — Firestore CRUD for CaptureSession documents.

Paths per agent-prompts.md:
  users/{userId}/captureSessions/{sessionId}
"""

import logging
from datetime import UTC, datetime

from app.core.firestore import get_firestore_client
from app.models.capture_session import CaptureSession, SessionStatus, SourceType

logger = logging.getLogger(__name__)


def _sessions_ref(user_id: str):
    return (
        get_firestore_client()
        .collection("users")
        .document(user_id)
        .collection("captureSessions")
    )


async def start_session(user_id: str, session_id: str, source_type: str) -> CaptureSession:
    now = datetime.now(UTC)
    session = CaptureSession(
        id=session_id,
        userId=user_id,
        startedAt=now,
        status=SessionStatus.active,
        sourceType=SourceType(source_type),
    )
    await _sessions_ref(user_id).document(session_id).set(session.model_dump())
    logger.info("Session started: userId=%s sessionId=%s", user_id, session_id)
    return session


async def get_session(user_id: str, session_id: str) -> CaptureSession | None:
    doc = await _sessions_ref(user_id).document(session_id).get()
    if not doc.exists:
        return None
    return CaptureSession(**doc.to_dict())


async def add_artifact_to_session(user_id: str, session_id: str, artifact_id: str) -> None:
    from google.cloud.firestore import ArrayUnion, Increment as FSIncrement
    await _sessions_ref(user_id).document(session_id).update({
        "extractedArtifactIds": ArrayUnion([artifact_id]),
        "conceptCount": FSIncrement(1),
    })


async def end_session(
    user_id: str,
    session_id: str,
    status: SessionStatus = SessionStatus.completed,
) -> CaptureSession | None:
    session = await get_session(user_id, session_id)
    if session is None:
        logger.warning("end_session: session not found userId=%s sessionId=%s", user_id, session_id)
        return None

    now = datetime.now(UTC)
    duration = (now - session.startedAt).total_seconds()

    await _sessions_ref(user_id).document(session_id).update({
        "status": status.value,
        "endedAt": now,
        "durationSeconds": duration,
    })
    logger.info("Session ended: userId=%s sessionId=%s status=%s", user_id, session_id, status.value)
    return await get_session(user_id, session_id)
