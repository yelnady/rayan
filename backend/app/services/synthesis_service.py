"""Synthesis Service — room-level mind map generation with Gemini image model.

Fetches all artifacts in a room, builds a rich synthesis prompt, generates a
mind map image via gemini-2.5-flash-image, uploads to Cloud Storage, and
stores the result as a `synthesis` artifact in the room.

Cloud Storage path: syntheses/{roomId}/{uuid}.png
"""

import asyncio
import logging
import uuid

from google.genai import errors as genai_errors
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

# Synthesis artifacts are mounted on the south wall, centred at mid-height.
_SYNTHESIS_POSITION = Position3D(x=4.0, y=2.5, z=7.95)
_SYNTHESIS_WALL = "south"


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
    room_style = room.style if room else "default"
    artifacts = await get_room_artifacts(user_id, room_id)

    # Exclude any existing synthesis artifacts from the input
    source_artifacts = [a for a in artifacts if a.type != ArtifactType.synthesis]

    if not source_artifacts:
        raise ValueError("Room has no artifacts to synthesize.")

    prompt = _build_prompt(room_name, source_artifacts, room_style)
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


_STYLE_PALETTES: dict[str, dict] = {
    "library": {
        "bg": "warm amber twilight fading into deep mahogany — like candlelight in an ancient reading room",
        "nodes": "aged parchment nodes with ink-gold borders and soft candleflame glows",
        "lines": "sepia-toned ink threads, gently curved like handwritten connections",
        "accents": "warm golds, rust reds, moss greens, cream whites",
        "feel": "scholarly and timeless, like a dream inside an ancient library at midnight",
    },
    "lab": {
        "bg": "deep midnight blue dissolving into electric teal — a dark quantum laboratory",
        "nodes": "holographic panels with neon cyan/green borders, soft bioluminescent glow",
        "lines": "electric arc connections, pulsing with energy, data-stream thin",
        "accents": "neon cyan, plasma green, UV violet, white sparks",
        "feel": "scientific wonder, as if dreaming inside a particle accelerator",
    },
    "gallery": {
        "bg": "soft dusk lavender bleeding into rose gold and pearl white mist",
        "nodes": "framed canvas nodes with watercolour washes and gilt edges",
        "lines": "impressionistic brushstroke connections, flowing and painterly",
        "accents": "mauve, rose gold, cerulean, soft coral, antique white",
        "feel": "artistic and ethereal, like wandering through a dream museum at golden hour",
    },
    "garden": {
        "bg": "deep twilight emerald sky, bioluminescent meadow mist rising from the ground",
        "nodes": "organic leaf-shaped or petal-shaped nodes with soft bioluminescent edges",
        "lines": "winding vine connections with tiny glowing buds along the path",
        "accents": "jade greens, moonlit whites, lavender, soft amber firefly dots",
        "feel": "alive and breathing, like a dream in an enchanted midnight garden",
    },
    "workshop": {
        "bg": "dark charcoal steel fading into deep burnt sienna — a forge at dusk",
        "nodes": "metal-plate nodes with riveted edges, glowing amber welds at corners",
        "lines": "blueprint grid lines with mechanical precision, copper or white",
        "accents": "copper, molten orange, blueprint blue, chrome silver, rust red",
        "feel": "industrial and inventive, like blueprints dreamed up in a forge at night",
    },
}

_DEFAULT_PALETTE = {
    "bg": "deep cosmic void fading from indigo to black, scattered with soft star dust",
    "nodes": "rounded glowing nodes with luminous borders, each branch its own colour",
    "lines": "curved luminous connections, like threads of memory through space",
    "accents": "electric blues, purples, teals, golds",
    "feel": "a futuristic memory palace adrift in a dream",
}

_TYPE_MOOD_MAP: dict[str, str] = {
    "emotion": "warmth, feeling",
    "dream": "wonder, surrealism",
    "moment": "nostalgia, presence",
    "milestone": "pride, achievement",
    "insight": "revelation, clarity",
    "question": "curiosity, mystery",
    "goal": "ambition, direction",
    "habit": "rhythm, growth",
    "lesson": "learning, depth",
    "opinion": "conviction, perspective",
    "media": "culture, resonance",
    "lecture": "knowledge, structure",
    "document": "precision, reference",
    "enrichment": "discovery, connection",
}


def _build_prompt(room_name: str, artifacts: list[Artifact], room_style: str = "default") -> str:
    palette = _STYLE_PALETTES.get(room_style, _DEFAULT_PALETTE)

    # Collect dominant artifact types to inform mood
    type_counts: dict[str, int] = {}
    for a in artifacts:
        type_counts[a.type.value] = type_counts.get(a.type.value, 0) + 1
    top_types = sorted(type_counts, key=lambda t: type_counts[t], reverse=True)[:3]
    moods = [_TYPE_MOOD_MAP[t] for t in top_types if t in _TYPE_MOOD_MAP]
    mood_line = f"Emotional undertones: {'; '.join(moods)}." if moods else ""

    # Collect artifact colors for subtle node tinting hints
    artifact_colors = list({
        a.color for a in artifacts if getattr(a, "color", None)
    })[:6]
    color_hint = (
        f"Blend these memory colours subtly into the nodes: {', '.join(artifact_colors)}."
        if artifact_colors else ""
    )

    nodes = []
    for a in artifacts:
        title = getattr(a, "title", "") or a.summary[:60]
        kw = ", ".join(getattr(a, "keywords", [])[:4])
        nodes.append(f"• {title}" + (f" [{kw}]" if kw else ""))
    nodes_text = "\n".join(nodes[:30])

    return (
        f'Create a stunning, high-quality mind map titled "{room_name}".\n\n'
        f"ATMOSPHERE & STYLE (match the room's soul — a {room_style} style):\n"
        f"- Background: {palette['bg']}\n"
        f"- Nodes: {palette['nodes']}\n"
        f"- Connection lines: {palette['lines']}\n"
        f"- Colour palette: {palette['accents']}\n"
        f"- Overall feel: {palette['feel']}\n"
        f"{mood_line}\n"
        f"{color_hint}\n\n"
        f"CONCEPTS TO MAP:\n{nodes_text}\n\n"
        "Draw visible relationships between related concepts. "
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
    delays = [5, 15, 30]  # seconds between retries on 429
    for attempt, delay in enumerate(delays + [None]):
        try:
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
        except genai_errors.ClientError as e:
            if e.code == 429 and delay is not None:
                logger.warning(
                    "Image generation rate-limited (attempt %d), retrying in %ds",
                    attempt + 1,
                    delay,
                )
                await asyncio.sleep(delay)
            else:
                raise


async def _upload_image(image_bytes: bytes, blob_path: str) -> str:
    bucket_name = settings.media_bucket
    client = get_storage_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(image_bytes, content_type="image/png")
    blob.make_public()
    return blob.public_url
