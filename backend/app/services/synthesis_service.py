"""Synthesis Service — room-level mind map generation with Gemini image model.

Fetches all artifacts in a room, builds a rich synthesis prompt, generates a
mind map image via gemini-2.5-flash-image, uploads to Cloud Storage, and
stores the result as a `synthesis` artifact in the room.

Cloud Storage path: syntheses/{roomId}/{uuid}.png
"""

import logging
import uuid

from google.genai import types as genai_types

from app.config import settings
from app.core.gemini import IMAGE_MODEL, get_genai_client
from app.core.storage import get_storage_client
from app.models.artifact import Artifact, ArtifactType, ArtifactVisual
from app.models.common import Position3D
from app.services.artifact_service import (
    create_artifact,
    get_room_artifacts,
    update_artifact,
)
from app.services.room_service import get_room

logger = logging.getLogger(__name__)

# Synthesis artifacts float at the center of the room, elevated.
_SYNTHESIS_POSITION = Position3D(x=4.0, y=2.5, z=4.0)
_SYNTHESIS_WALL = "center"


async def synthesize_room(
    user_id: str,
    room_id: str,
    replace_artifact_id: str | None = None,
) -> Artifact:
    """Generate a mind map image for all artifacts in a room.

    Args:
        user_id: Authenticated user.
        room_id: Room to synthesize.
        replace_artifact_id: If provided, replace an existing synthesis artifact
            image instead of creating a new one.

    Returns:
        The newly created or updated synthesis Artifact.
    """
    room = await get_room(user_id, room_id)
    room_name = room.name if room else "Memory Room"
    artifacts = await get_room_artifacts(user_id, room_id)

    # Exclude any existing synthesis artifacts from the input
    source_artifacts = [a for a in artifacts if a.type != ArtifactType.synthesis]

    if not source_artifacts:
        raise ValueError("Room has no artifacts to synthesize.")

    prompt = _build_prompt(room_name, source_artifacts)
    image_bytes = await _generate_image(prompt)

    blob_path = f"syntheses/{room_id}/{uuid.uuid4().hex}.png"
    image_url = await _upload_image(image_bytes, blob_path)

    keywords = _collect_keywords(source_artifacts)
    summary = (
        f"Mind map synthesis of {len(source_artifacts)} memories in '{room_name}'."
    )
    full_content = _build_full_content(room_name, source_artifacts)

    if replace_artifact_id:
        # Update the existing synthesis artifact's image URL in-place.
        # update_artifact only handles summary/full_content, so we patch directly.
        from app.core.firestore import get_firestore_client

        artifact = None
        for a in artifacts:
            if a.id == replace_artifact_id:
                artifact = a
                break

        if artifact and artifact.type == ArtifactType.synthesis:
            db = get_firestore_client()
            await (
                db.collection("users")
                .document(user_id)
                .collection("rooms")
                .document(room_id)
                .collection("artifacts")
                .document(replace_artifact_id)
                .update(
                    {
                        "sourceMediaUrl": image_url,
                        "summary": summary,
                        "fullContent": full_content,
                        "keywords": keywords,
                    }
                )
            )
            artifact.sourceMediaUrl = image_url
            artifact.summary = summary
            artifact.fullContent = full_content
            artifact.keywords = keywords
            logger.info(
                "Synthesis regenerated: userId=%s roomId=%s artifactId=%s",
                user_id,
                room_id,
                replace_artifact_id,
            )
            return artifact

    # Create a fresh synthesis artifact.
    artifact = await create_artifact(
        user_id=user_id,
        room_id=room_id,
        artifact_type=ArtifactType.synthesis,
        title=f"{room_name} — Mind Map",
        keywords=keywords,
        summary=summary,
        full_content=full_content,
        position=_SYNTHESIS_POSITION,
        wall=_SYNTHESIS_WALL,
        color="#FFD700",
    )

    # Patch sourceMediaUrl (not a standard create_artifact param to avoid bloat).
    from app.core.firestore import get_firestore_client

    db = get_firestore_client()
    await (
        db.collection("users")
        .document(user_id)
        .collection("rooms")
        .document(room_id)
        .collection("artifacts")
        .document(artifact.id)
        .update({"sourceMediaUrl": image_url})
    )
    artifact.sourceMediaUrl = image_url

    logger.info(
        "Synthesis created: userId=%s roomId=%s artifactId=%s url=%s",
        user_id,
        room_id,
        artifact.id,
        image_url,
    )
    return artifact


# ── Private helpers ────────────────────────────────────────────────────────────


def _build_prompt(room_name: str, artifacts: list[Artifact]) -> str:
    nodes = []
    for a in artifacts:
        title = getattr(a, "title", "") or a.summary[:60]
        kw = ", ".join(getattr(a, "keywords", [])[:4])
        nodes.append(f"• {title}" + (f" [{kw}]" if kw else ""))

    nodes_text = "\n".join(nodes[:30])  # cap at 30 concepts

    return (
        f"Create a stunning, high-quality mind map titled \"{room_name}\".\n\n"
        "STYLE REQUIREMENTS:\n"
        "- Dark background (deep navy or black, #050512 or similar)\n"
        "- Central node with the room topic, large and glowing\n"
        "- Branch out to each concept with curved, luminous connection lines\n"
        "- Each node: rounded rectangle with soft glow, distinct color per branch\n"
        "- Colors: electric blues, purples, teals, golds — vibrant and cosmic\n"
        "- Use clear, readable sans-serif font — white or light text on dark nodes\n"
        "- Add subtle particle/star effects in the background\n"
        "- Overall feel: futuristic memory palace, quantum knowledge map\n\n"
        f"CONCEPTS TO MAP:\n{nodes_text}\n\n"
        "Show relationships between related concepts where possible. "
        "Make it beautiful enough to hang on a wall."
    )


def _collect_keywords(artifacts: list[Artifact]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for a in artifacts:
        for kw in getattr(a, "keywords", []):
            if kw not in seen:
                seen.add(kw)
                out.append(kw)
    return out[:20]


def _build_full_content(room_name: str, artifacts: list[Artifact]) -> str:
    lines = [f"Mind map synthesis of '{room_name}' ({len(artifacts)} memories):\n"]
    for a in artifacts:
        title = getattr(a, "title", "") or a.summary[:60]
        lines.append(f"• {title}: {a.summary[:200]}")
    return "\n".join(lines)


async def _generate_image(prompt: str) -> bytes:
    client = get_genai_client()
    response = await client.aio.models.generate_content(
        model=IMAGE_MODEL,
        contents=[prompt],
        config=genai_types.GenerateContentConfig(
            response_modalities=["Text", "Image"],
        ),
    )
    for part in response.parts:
        if part.inline_data is not None:
            return part.inline_data.data
    raise ValueError("Gemini image model returned no image for room synthesis.")


async def _upload_image(image_bytes: bytes, blob_path: str) -> str:
    bucket_name = settings.media_bucket
    client = get_storage_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(image_bytes, content_type="image/png")
    blob.make_public()
    return blob.public_url
