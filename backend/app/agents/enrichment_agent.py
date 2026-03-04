"""Enrichment Agent — uses Gemini to research artifacts from the web.

T117: ADK-style agent that:
  1. Takes an artifact summary/content
  2. Queries Google Custom Search for relevant pages
  3. Extracts text from the top results
  4. Uses Gemini to synthesise enrichment content and relevance score
  5. Saves enrichments to Firestore via enrichment_service
  6. Broadcasts enrichment_update WebSocket event per websocket.md §6
"""

import logging
from typing import Awaitable, Callable

from app.core.gemini import get_genai_client
from app.models.enrichment import EnrichmentImage
from app.models.artifact import Artifact
from app.services.content_extractor import extract_content
from app.services.web_search import search_web
from app.services.enrichment_service import create_enrichment

logger = logging.getLogger(__name__)

# Max pages to fully extract content from (keeps latency reasonable)
_MAX_PAGES_TO_EXTRACT = 3
_MODEL = "gemini-2.0-flash"

_SYSTEM_PROMPT = """You are a research assistant enriching a memory palace artifact.
Given an artifact summary and web research content, you will:
1. Identify the most relevant facts from the research
2. Write a concise but informative enrichment (100-300 words)
3. Assess relevance on a scale from 0.0 to 1.0

Respond ONLY in this JSON format:
{
  "enriched_content": "...",
  "relevance_score": 0.85
}"""


async def run_enrichment(
    user_id: str,
    artifact: Artifact,
    room_id: str,
    on_enrichment_created: Callable[[dict], Awaitable[None]] | None = None,
) -> None:
    """Run the full enrichment pipeline for one artifact.

    on_enrichment_created — optional async callback called after each
    enrichment is saved; receives the enrichment_update WebSocket payload.
    """
    logger.info(
        "enrichment_agent: starting for userId=%s artifactId=%s", user_id, artifact.id
    )

    query = artifact.summary
    if artifact.fullContent:
        # Use first 200 chars of content for a more focused query
        query = f"{artifact.summary} {artifact.fullContent[:200]}"

    # Step 1: web search
    results = await search_web(query, num_results=_MAX_PAGES_TO_EXTRACT)
    if not results:
        logger.info("enrichment_agent: no search results for artifactId=%s", artifact.id)
        return

    # Step 2: extract content from top pages
    enrichments_created = 0
    for result in results[:_MAX_PAGES_TO_EXTRACT]:
        try:
            page_text = await extract_content(result.url)
            if not page_text:
                continue

            # Step 3: synthesise with Gemini
            enriched = await _synthesise(artifact.summary, result.title, page_text)
            if enriched is None:
                continue

            enrich_content = enriched.get("enriched_content", "")
            relevance = float(enriched.get("relevance_score", 0.0))

            # Skip low-relevance enrichments
            if relevance < 0.3:
                logger.info(
                    "enrichment_agent: skipping low-relevance result (%.2f) for %s",
                    relevance, result.url,
                )
                continue

            # Step 4: persist
            enrichment = await create_enrichment(
                user_id=user_id,
                artifact_id=artifact.id,
                room_id=room_id,
                source_url=result.url,
                source_name=result.display_url or result.title,
                extracted_content=enrich_content,
                images=[],
                relevance_score=relevance,
            )
            enrichments_created += 1

            # Step 5: notify via WebSocket callback
            if on_enrichment_created:
                payload = {
                    "type": "enrichment_update",
                    "artifactId": artifact.id,
                    "enrichment": {
                        "id": enrichment.id,
                        "sourceName": enrichment.sourceName,
                        "sourceUrl": enrichment.sourceUrl,
                        "preview": enrichment.extractedContent[:300],
                        "images": [
                            {"url": img.url, "caption": img.caption}
                            for img in enrichment.images
                        ],
                    },
                    "visualIndicator": {
                        "artifactId": artifact.id,
                        "effect": "crystal_orb_pulse",
                    },
                }
                await on_enrichment_created(payload)

        except Exception:
            logger.exception(
                "enrichment_agent: failed processing result %s for artifactId=%s",
                result.url, artifact.id,
            )

    logger.info(
        "enrichment_agent: done userId=%s artifactId=%s enrichments=%d",
        user_id, artifact.id, enrichments_created,
    )


async def _synthesise(artifact_summary: str, page_title: str, page_text: str) -> dict | None:
    """Ask Gemini to synthesise relevant enrichment content.

    Returns a dict with `enriched_content` and `relevance_score` keys,
    or None on failure.
    """
    import json

    prompt = (
        f"ARTIFACT SUMMARY:\n{artifact_summary}\n\n"
        f"WEB PAGE TITLE: {page_title}\n\n"
        f"WEB PAGE CONTENT:\n{page_text[:3000]}\n\n"
        "Synthesise an enrichment and respond in JSON only."
    )

    client = get_genai_client()
    try:
        response = await client.aio.models.generate_content(
            model=_MODEL,
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config={
                "system_instruction": _SYSTEM_PROMPT,
                "temperature": 0.2,
                "max_output_tokens": 512,
            },
        )
        raw = response.text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        return json.loads(raw)
    except Exception:
        logger.exception("_synthesise: Gemini call failed")
        return None
