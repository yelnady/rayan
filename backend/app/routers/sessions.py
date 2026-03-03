"""Sessions router — REST endpoints for capture session history per rest-api.md."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.middleware.auth import verify_token
from app.services.capture_service import get_session
from app.core.firestore import get_firestore_client

router = APIRouter(prefix="/api/v1", tags=["sessions"])


@router.get("/sessions")
async def list_sessions(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    user: dict = Depends(verify_token),
):
    """List capture sessions for the authenticated user."""
    user_id = user["user_id"]
    db = get_firestore_client()
    ref = (
        db.collection("users")
        .document(user_id)
        .collection("captureSessions")
        .order_by("startedAt", direction="DESCENDING")
    )

    if status:
        ref = ref.where("status", "==", status)

    if cursor:
        # cursor is the document ID of the last seen session
        snap = await db.collection("users").document(user_id).collection("captureSessions").document(cursor).get()
        if snap.exists:
            ref = ref.start_after(snap)

    ref = ref.limit(limit + 1)
    docs = await ref.get()

    sessions = []
    for doc in docs[:limit]:
        if doc.exists:
            data = doc.to_dict()
            sessions.append({
                "id": data.get("id"),
                "startedAt": data.get("startedAt"),
                "endedAt": data.get("endedAt"),
                "status": data.get("status"),
                "sourceType": data.get("sourceType"),
                "conceptCount": data.get("conceptCount", 0),
                "durationSeconds": data.get("durationSeconds"),
            })

    next_cursor = docs[limit].id if len(docs) > limit else None
    return {"sessions": sessions, "nextCursor": next_cursor}


@router.get("/sessions/{session_id}")
async def get_session_detail(
    session_id: str,
    user: dict = Depends(verify_token),
):
    """Get session details with created artifacts."""
    user_id = user["user_id"]
    session = await get_session(user_id, session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "RESOURCE_NOT_FOUND", "message": "Session not found", "details": {"sessionId": session_id}}},
        )

    # Fetch artifacts created in this session
    db = get_firestore_client()
    rooms_ref = db.collection("users").document(user_id).collection("rooms")
    rooms_docs = await rooms_ref.get()

    artifacts = []
    rooms_affected = set()

    for room_doc in rooms_docs:
        if not room_doc.exists:
            continue
        artifact_docs = await rooms_ref.document(room_doc.id).collection("artifacts").where(
            "captureSessionId", "==", session_id
        ).get()
        for art_doc in artifact_docs:
            if art_doc.exists:
                data = art_doc.to_dict()
                artifacts.append({
                    "id": data.get("id"),
                    "summary": data.get("summary"),
                })
                rooms_affected.add(room_doc.id)

    return {
        "session": {
            "id": session.id,
            "startedAt": session.startedAt,
            "endedAt": session.endedAt,
            "status": session.status,
            "sourceType": session.sourceType,
            "rawMediaUrl": session.rawMediaUrl,
            "conceptCount": session.conceptCount,
            "durationSeconds": session.durationSeconds,
        },
        "artifacts": artifacts,
        "roomsAffected": list(rooms_affected),
    }
