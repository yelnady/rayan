"""Narrator Agent — brings artifacts to life with voice narration and diagrams.

When a user clicks an artifact in the 3D palace:
  1. Loads artifact data from Firestore.
  2. Finds related artifacts via semantic search on the artifact's embedding.
  3. Generates a narration script using Gemini standard model.
  4. Optionally generates a diagram if the content warrants it.
  5. Synthesises voice audio using Gemini Live API.
  6. Returns a NarrationResult for the handler to package as `artifact_recall`.

Per agent-prompts.md §4 Narrator Agent.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

from google.genai import types as genai_types

from app.core.gemini import LIVE_MODEL, STANDARD_MODEL, get_genai_client
from app.services import artifact_service
from app.services.diagram_service import DiagramResult, generate_diagram
from app.services.search_service import SearchResult, semantic_search

logger = logging.getLogger(__name__)

_NARRATION_SYSTEM_PROMPT = """\
You are Rayan, narrating a memory artifact for {name}. Bring stored memories \
to life through engaging, personal narration.

NARRATION STRUCTURE:
1. Opening (5 sec): "{name}, this is from your [topic] study session..."
2. Core Content (20-30 sec): Main points of the artifact
3. Connections (5-10 sec): Related memories or enrichments
4. Invitation (5 sec): "Would you like to know more about [related topic], {name}?"

STYLE:
- Warm and personal ("{name}, you captured this during your Tuesday session...")
- Educational but not dry; acknowledge {name}'s learning journey
- 30-45 seconds for standard artifacts; 60-90 if enrichments exist
- Do NOT read the artifact verbatim; synthesise and bring it to life

DIAGRAM TRIGGER (use at most once):
If the content has a visual concept that would benefit from a diagram, output:
  [DIAGRAM: <type>|<title>|<description>]
where type is one of: flowchart | comparison | formula | timeline | mindmap

ARTIFACT:
{artifact_text}

RELATED ARTIFACTS:
{related_text}
"""


@dataclass
class NarrationResult:
    voice_audio: Optional[bytes]
    narration_text: str
    diagrams: list[DiagramResult] = field(default_factory=list)
    related_artifacts: list[dict] = field(default_factory=list)
    summary: str = ""


async def narrate_artifact(
    user_id: str,
    artifact_id: str,
    room_id: str,
    display_name: str = "",
) -> NarrationResult:
    """Generate a full narration (voice + diagrams) for the given artifact."""
    # 1. Load artifact
    artifact = await artifact_service.get_artifact(user_id, room_id, artifact_id)
    if artifact is None:
        logger.warning("narrate_artifact: artifact not found userId=%s artifactId=%s", user_id, artifact_id)
        return NarrationResult(
            voice_audio=None,
            narration_text="I couldn't find that artifact in your palace.",
        )

    # 2. Find related artifacts via semantic search using artifact summary as query
    related: list[SearchResult] = []
    if artifact.embedding:
        try:
            related = await _find_related(user_id, artifact)
        except Exception:
            logger.exception("Related artifact search failed: artifactId=%s", artifact_id)

    related_artifact_dicts = [
        {
            "artifactId": r.artifact_id,
            "roomId": r.room_id,
            "reason": f"Related via {r.room_name} ({r.similarity:.0%} similarity)",
        }
        for r in related[:3]
    ]

    # 3. Build narration script via standard Gemini
    artifact_text = (
        f"Title: {artifact.summary}\n"
        f"Type: {artifact.type.value}\n"
        f"Created: {artifact.createdAt.strftime('%A, %B %d %Y') if artifact.createdAt else 'unknown'}\n"
    )
    if artifact.fullContent:
        artifact_text += f"Content: {artifact.fullContent[:1000]}"

    related_text = "\n".join(
        f"- {r['artifactId']} in {r['roomId']} ({r['reason']})"
        for r in related_artifact_dicts
    ) or "(none)"

    prompt = _NARRATION_SYSTEM_PROMPT.format(
        name=display_name.split()[0] if display_name else "there",
        artifact_text=artifact_text,
        related_text=related_text,
    )

    narration_text, diagrams = await _compose_narration(prompt, artifact_id)

    # 4. Synthesise voice audio via Gemini Live
    voice_audio = await _synthesise_voice(narration_text)

    result = NarrationResult(
        voice_audio=voice_audio,
        narration_text=narration_text,
        diagrams=diagrams,
        related_artifacts=related_artifact_dicts,
        summary=artifact.summary,
    )
    logger.info(
        "narrate_artifact: userId=%s artifactId=%s audioBytes=%d diagrams=%d",
        user_id, artifact_id,
        len(voice_audio) if voice_audio else 0,
        len(diagrams),
    )
    return result


# ── Private helpers ────────────────────────────────────────────────────────────

async def _find_related(user_id: str, artifact) -> list[SearchResult]:
    """Use the artifact's own summary as a search query to find related artifacts."""
    return await semantic_search(
        user_id=user_id,
        query=artifact.summary,
        limit=5,
    )


async def _compose_narration(
    prompt: str,
    artifact_id: str,
) -> tuple[str, list[DiagramResult]]:
    """Generate narration text (and detect a diagram trigger) via standard Gemini."""
    client = get_genai_client()
    full_text = ""
    try:
        async for chunk in await client.aio.models.generate_content_stream(
            model=STANDARD_MODEL,
            contents="Begin narration:",
            config=genai_types.GenerateContentConfig(system_instruction=prompt),
        ):
            if chunk.text:
                full_text += chunk.text
    except Exception:
        logger.exception("Narration text generation failed: artifactId=%s", artifact_id)
        full_text = "I encountered an issue narrating this memory. Please try again."

    # Extract optional diagram trigger
    diagrams: list[DiagramResult] = []
    trigger = "[DIAGRAM:"
    if trigger in full_text:
        start = full_text.index(trigger)
        end = full_text.find("]", start)
        if end != -1:
            payload = full_text[start + len(trigger):end].strip()
            parts = [p.strip() for p in payload.split("|")]
            if len(parts) >= 3:
                _, title, description = parts[0], parts[1], parts[2]
                try:
                    diagram = await generate_diagram(
                        description=description,
                        caption=title,
                        artifact_id=artifact_id,
                    )
                    diagrams.append(diagram)
                except Exception:
                    logger.exception("Diagram gen failed in narrator: artifactId=%s", artifact_id)
            # Strip the diagram directive from the spoken text
            full_text = full_text[:start].strip() + " " + full_text[end + 1:].strip()

    return full_text.strip(), diagrams


async def _synthesise_voice(narration_text: str) -> Optional[bytes]:
    """Convert narration text to audio bytes via Gemini Live."""
    if not narration_text:
        return None

    client = get_genai_client()
    config = genai_types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        enable_affective_dialog=True,
        speech_config=genai_types.SpeechConfig(
            voice_config=genai_types.VoiceConfig(
                prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                    voice_name="Aoede"
                )
            ),
            language_code="en-US",
        ),
    )
    audio_buf = bytearray()
    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=config) as gemini:
            await gemini.send_client_content(
                turns=genai_types.Content(
                    role="user",
                    parts=[genai_types.Part(text=narration_text)],
                ),
                turn_complete=True,
            )
            async for response in gemini.receive():
                if hasattr(response, "data") and response.data:
                    audio_buf.extend(response.data)
    except Exception:
        logger.exception("Voice synthesis failed")
        return None

    return bytes(audio_buf) if audio_buf else None
