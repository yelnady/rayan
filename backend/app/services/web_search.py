"""Web search service using Google Custom Search JSON API.

T119: Provides search_web() to fetch top results for a query.

Environment variables required (via config.py):
  GOOGLE_API_KEY        — API key with Custom Search enabled
  GOOGLE_SEARCH_CX      — Custom Search Engine ID
"""

import logging
from dataclasses import dataclass

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"
_DEFAULT_RESULTS = 5


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    display_url: str = ""


async def search_web(query: str, num_results: int = _DEFAULT_RESULTS) -> list[SearchResult]:
    """Perform a Google Custom Search and return top results.

    Falls back to an empty list if API keys are not configured or the
    request fails, so enrichment gracefully degrades.
    """
    api_key = getattr(settings, "google_api_key", "")
    cx = getattr(settings, "google_search_cx", "")

    if not api_key or not cx:
        logger.warning("web_search: GOOGLE_API_KEY or GOOGLE_SEARCH_CX not set — skipping search")
        return []

    params = {
        "key": api_key,
        "cx": cx,
        "q": query,
        "num": min(num_results, 10),
        "safe": "active",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(_SEARCH_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("web_search: request failed for query=%r", query)
        return []

    results: list[SearchResult] = []
    for item in data.get("items", []):
        results.append(SearchResult(
            title=item.get("title", ""),
            url=item.get("link", ""),
            snippet=item.get("snippet", ""),
            display_url=item.get("displayLink", ""),
        ))

    logger.info("web_search: query=%r returned %d results", query, len(results))
    return results
