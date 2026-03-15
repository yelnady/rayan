"""Search Service — semantic vector search across all rooms and artifacts.

Performs a Firestore full-scan with cosine ranking (Vertex AI Vector Search
deferred to post-hackathon; the embedding data is already stored so migration
is straightforward).

Public API:
  async def semantic_search(user_id, query, limit=10, room_id=None) -> list[SearchResult]
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from app.core.firestore import get_firestore_client
from app.models.artifact import Artifact
from app.models.room import Room
from app.services.embedding_service import cosine_similarity, get_embedding

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    artifact_id: str
    room_id: str
    room_name: str
    summary: str
    similarity: float
    highlight: Optional[str]
    full_content: Optional[str]
    embedding: list[float]
    captured_at: Optional[datetime] = None


MIN_SIMILARITY: float = 0.25
KEYWORD_BOOST: float = 0.08  # added per matching query keyword found in artifact text


def _keyword_boost(query: str, artifact: "Artifact") -> float:
    """Return a small additive score boost for exact query-keyword matches in the artifact."""
    query_words = {w.lower() for w in query.split() if len(w) > 3}
    if not query_words:
        return 0.0
    searchable = " ".join(filter(None, [
        artifact.title or "",
        artifact.summary or "",
        artifact.fullContent or "",
        " ".join(artifact.keywords or []),
    ])).lower()
    matched = sum(1 for w in query_words if w in searchable)
    # Cap boost at 3 matches so very long queries don't dominate
    return min(matched, 3) * KEYWORD_BOOST


async def semantic_search(
    user_id: str,
    query: str,
    limit: int = 10,
    room_id: Optional[str] = None,
    captured_after: Optional[datetime] = None,
    captured_before: Optional[datetime] = None,
    min_similarity: float = MIN_SIMILARITY,
) -> list[SearchResult]:
    """Hybrid semantic + keyword search across user's memories.

    Steps:
      1. Embed the query string.
      2. Load rooms — if room_id given, prioritise that room first then search others.
      3. For each room, cosine-rank artifacts and apply a keyword boost.
      4. Filter below min_similarity and return top-`limit` results.
    """
    if not query.strip():
        return []

    try:
        query_embedding = await get_embedding(query)
    except Exception:
        logger.exception("Failed to embed query for userId=%s", user_id)
        return []

    db = get_firestore_client()
    rooms_ref = db.collection("users").document(user_id).collection("rooms")

    # Always load all rooms; if room_id is set, score those artifacts first so
    # they rank higher when similarity is equal (preserves room-context relevance).
    rooms_snapshot = await rooms_ref.get()
    all_rooms = [Room(**snap.to_dict()) for snap in rooms_snapshot if snap.exists]

    # Put the focused room first so ties resolve in its favour
    if room_id:
        all_rooms.sort(key=lambda r: (0 if r.id == room_id else 1))

    results: list[SearchResult] = []

    for room in all_rooms:
        artifacts_ref = rooms_ref.document(room.id).collection("artifacts")
        artifact_docs = await artifacts_ref.get()

        for doc in artifact_docs:
            if not doc.exists:
                continue
            try:
                artifact = Artifact(**doc.to_dict())
            except Exception:
                logger.warning("Skipping malformed artifact doc %s", doc.id)
                continue

            if not artifact.embedding:
                continue

            # Date filtering
            if captured_after or captured_before:
                if artifact.capturedAt is None:
                    continue
                if captured_after and artifact.capturedAt < captured_after:
                    continue
                if captured_before and artifact.capturedAt > captured_before:
                    continue

            sim = cosine_similarity(query_embedding, artifact.embedding)
            # Hybrid: add keyword boost before threshold check
            score = sim + _keyword_boost(query, artifact)

            if score < min_similarity:
                continue

            highlight = _extract_highlight(query, artifact.summary)
            results.append(
                SearchResult(
                    artifact_id=artifact.id,
                    room_id=room.id,
                    room_name=room.name,
                    summary=artifact.summary,
                    similarity=score,
                    highlight=highlight,
                    full_content=artifact.fullContent,
                    embedding=artifact.embedding,
                    captured_at=artifact.capturedAt,
                )
            )

    results.sort(key=lambda r: r.similarity, reverse=True)
    top = results[:limit]
    logger.info(
        "semantic_search: userId=%s query=%r rooms=%d candidates=%d top=%d",
        user_id, query[:60], len(all_rooms), len(results), len(top),
    )
    return top


# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_highlight(query: str, text: str, window: int = 120) -> Optional[str]:
    """Return a snippet from `text` near the first query keyword match."""
    if not text:
        return None
    query_words = [w.lower() for w in query.split() if len(w) > 3]
    text_lower = text.lower()
    for word in query_words:
        idx = text_lower.find(word)
        if idx != -1:
            start = max(0, idx - 30)
            end = min(len(text), idx + window)
            snippet = text[start:end].strip()
            return f"...{snippet}..." if start > 0 else f"{snippet}..."
    # No keyword found — return first window chars
    return text[:window].strip() + "..." if len(text) > window else text
