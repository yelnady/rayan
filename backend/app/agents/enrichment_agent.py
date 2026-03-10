"""Enrichment Agent — uses Gemini + built-in Google Search to research artifacts.

T117: ADK-style agent that:
  1. Takes an artifact summary/content
  2. Calls Gemini with the built-in google_search grounding tool
  3. Synthesises enrichment content and a relevance score
  4. Saves the enrichment to Firestore via enrichment_service
  5. Broadcasts enrichment_update WebSocket event per websocket.md §6
"""

import json
import logging
from typing import Awaitable, Callable

from app.core.gemini import get_genai_client
from app.models.artifact import Artifact
from app.services.enrichment_service import create_enrichment

logger = logging.getLogger(__name__)

_MODEL = "gemini-2.5-flash"

_SYSTEM_PROMPT = """You are a research assistant enriching a memory palace artifact.
Use Google Search to find the most relevant information about the given topic, then:
1. Write a concise but informative enrichment (100-300 words) based on what you find
2. Assess how relevant the research is to the artifact on a scale from 0.0 to 1.0

Respond ONLY in this JSON format:
{
  "enriched_content": "...",
  "relevance_score": 0.85,
  "source_name": "brief description of the main source"
}"""


async def run_enrichment(
    user_id: str,
    artifact: Artifact,
    room_id: str,
    on_enrichment_created: Callable[[dict], Awaitable[None]] | None = None,
) -> None:
    """Run the full enrichment pipeline for one artifact."""
    logger.info(
        "enrichment_agent: starting for userId=%s artifactId=%s", user_id, artifact.id
    )

    query = artifact.summary
    if artifact.fullContent:
        query = f"{artifact.summary} {artifact.fullContent[:200]}"

    result = await _research_with_google(artifact.summary, query)
    if not result:
        logger.info("enrichment_agent: no result for artifactId=%s", artifact.id)
        return

    enrich_content = result.get("enriched_content", "").strip()
    relevance = float(result.get("relevance_score", 0.0))
    source_name = result.get("source_name", "Google Search")

    if relevance < 0.3 or not enrich_content:
        logger.info(
            "enrichment_agent: skipping low-relevance result (%.2f) for artifactId=%s",
            relevance, artifact.id,
        )
        return

    enrichment = await create_enrichment(
        user_id=user_id,
        artifact_id=artifact.id,
        room_id=room_id,
        source_url="",
        source_name=source_name,
        extracted_content=enrich_content,
        images=[],
        relevance_score=relevance,
    )

    if on_enrichment_created:
        payload = {
            "type": "enrichment_update",
            "artifactId": artifact.id,
            "enrichment": {
                "id": enrichment.id,
                "sourceName": enrichment.sourceName,
                "sourceUrl": enrichment.sourceUrl,
                "preview": enrichment.extractedContent[:300],
                "images": [],
            },
            "visualIndicator": {
                "artifactId": artifact.id,
                "effect": "crystal_orb_pulse",
            },
        }
        await on_enrichment_created(payload)

    logger.info(
        "enrichment_agent: done userId=%s artifactId=%s relevance=%.2f",
        user_id, artifact.id, relevance,
    )


async def _research_with_google(artifact_summary: str, query: str) -> dict | None:
    """Call Gemini with built-in Google Search grounding and return parsed enrichment dict."""
    prompt = (
        f"Research this topic and provide enrichment content:\n\n"
        f"ARTIFACT: {artifact_summary}\n\n"
        f"SEARCH QUERY: {query}\n\n"
        "Synthesise your findings and respond ONLY in the specified JSON format."
    )

    client = get_genai_client()
    try:
        response = await client.aio.models.generate_content(
            model=_MODEL,
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config={
                "system_instruction": _SYSTEM_PROMPT,
                "tools": [{"google_search": {}}],
                "temperature": 0.2,
                "max_output_tokens": 512,
            },
        )
        raw = response.text.strip() if response.text else ""
        if not raw:
            return None

        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        return json.loads(raw)
    except Exception:
        logger.exception("_research_with_google: Gemini call failed for query=%r", query[:60])
        return None
