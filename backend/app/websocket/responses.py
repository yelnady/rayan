"""Typed WebSocket response helpers per websocket.md server→client schemas.

T048: capture_ack, capture_complete
T049: palace_update (rooms/artifacts/connections added)
"""

import base64
import time
from typing import Optional

from app.agents.capture_agent import ExtractionEvent
from app.models.artifact import Artifact
from app.models.room import Room
from app.websocket.manager import manager


# ── T048: Capture responses ─────────────────────────────────────────────────

async def send_capture_ack(
    user_id: str,
    session_id: str,
    event: ExtractionEvent,
) -> None:
    """Send capture_ack when a concept is extracted per websocket.md."""
    voice_audio = getattr(event, 'voice_audio', None)
    voice_b64: Optional[str] = (
        base64.b64encode(voice_audio).decode() if voice_audio else None
    )
    await manager.send(user_id, {
        "type": "capture_ack",
        "sessionId": session_id,
        "extraction": {
            "concept": event.concept_title,
            "confidence": event.confidence,
            "timestamp": int(time.time() * 1000),
        },
        "voiceResponse": voice_b64,
    })


async def send_capture_complete(
    user_id: str,
    session_id: str,
    artifact_ids: list[str],
    room_ids: list[str],
    new_room_ids: list[str],
    concept_count: int,
    artifacts: Optional[list[dict]] = None,
    rooms: Optional[list[dict]] = None,
    duration_seconds: Optional[float] = None,
    source_type: Optional[str] = None,
    voice_summary_audio: Optional[bytes] = None,
) -> None:
    """Send capture_complete when a session finishes per websocket.md."""
    voice_b64: Optional[str] = (
        base64.b64encode(voice_summary_audio).decode() if voice_summary_audio else None
    )
    await manager.send(user_id, {
        "type": "capture_complete",
        "sessionId": session_id,
        "summary": {
            "conceptCount": concept_count,
            "artifactsCreated": artifact_ids,
            "roomsAffected": room_ids,
            "newRoomsCreated": new_room_ids,
            "artifacts": artifacts or [],
            "rooms": rooms or [],
            "durationSeconds": duration_seconds,
            "sourceType": source_type,
        },
        "voiceSummary": voice_b64 or "",
    })


async def send_room_suggestion(
    user_id: str,
    artifact_id: str,
    suggestion: dict,
    timeout_seconds: int = 30,
) -> None:
    """Broadcast room_suggestion when Memory Architect needs user confirmation."""
    await manager.send(user_id, {
        "type": "room_suggestion",
        "artifact_id": artifact_id,
        "suggestion": suggestion,
        "timeout_seconds": timeout_seconds,
        "default_action": "accept",
    })


# ── T049: Palace update broadcast ──────────────────────────────────────────

async def broadcast_palace_update(
    user_id: str,
    rooms_added: Optional[list[Room]] = None,
    artifacts_added: Optional[list[Artifact]] = None,
    connections_added: Optional[list[dict]] = None,
    lobby_doors_added: Optional[list[dict]] = None,
) -> None:
    """Broadcast palace_update when rooms/artifacts/connections change per websocket.md."""
    changes: dict = {
        "roomsAdded": [],
        "artifactsAdded": [],
        "connectionsAdded": connections_added or [],
        "lobbyDoorsAdded": lobby_doors_added or [],
    }

    for room in (rooms_added or []):
        changes["roomsAdded"].append({
            "id": room.id,
            "name": room.name,
            "position": room.position.model_dump(),
            "style": room.style,
        })

    for artifact in (artifacts_added or []):
        changes["artifactsAdded"].append({
            "id": artifact.id,
            "roomId": artifact.roomId,
            "type": artifact.type.value,
            "position": artifact.position.model_dump(),
            "visual": artifact.visual.value,
            "summary": artifact.summary,
        })

    await manager.send(user_id, {"type": "palace_update", "changes": changes})


# ── T121: Enrichment update broadcast ─────────────────────────────────────────

async def send_enrichment_update(
    user_id: str,
    artifact_id: str,
    enrichment_id: str,
    source_name: str,
    source_url: str,
    preview: str,
    images: Optional[list[dict]] = None,
) -> None:
    """Broadcast enrichment_update when the enrichment agent adds new data.

    Per websocket.md §6 — includes a crystal_orb_pulse visual indicator.
    """
    await manager.send(user_id, {
        "type": "enrichment_update",
        "artifactId": artifact_id,
        "enrichment": {
            "id": enrichment_id,
            "sourceName": source_name,
            "sourceUrl": source_url,
            "preview": preview,
            "images": images or [],
        },
        "visualIndicator": {
            "artifactId": artifact_id,
            "effect": "crystal_orb_pulse",
        },
    })

