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


async def semantic_search(
    user_id: str,
    query: str,
    limit: int = 10,
    room_id: Optional[str] = None,
    captured_after: Optional[datetime] = None,
    captured_before: Optional[datetime] = None,
) -> list[SearchResult]:
    """Semantic search across user's memories.

    Steps:
      1. Embed the query string.
      2. Load all rooms (optionally filtered to `room_id`).
      3. For each room, load all artifacts and cosine-rank against query embedding.
      4. Return top-`limit` results sorted by similarity descending.
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

    if room_id:
        rooms_snapshot = [await rooms_ref.document(room_id).get()]
        rooms = [Room(**snap.to_dict()) for snap in rooms_snapshot if snap.exists]
    else:
        rooms_snapshot = await rooms_ref.get()
        rooms = [Room(**snap.to_dict()) for snap in rooms_snapshot if snap.exists]

    results: list[SearchResult] = []

    for room in rooms:
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

            # Date filtering: exclude artifacts without capturedAt when filters active
            if captured_after or captured_before:
                if artifact.capturedAt is None:
                    continue
                if captured_after and artifact.capturedAt < captured_after:
                    continue
                if captured_before and artifact.capturedAt > captured_before:
                    continue

            sim = cosine_similarity(query_embedding, artifact.embedding)
            if sim <= 0.0:
                continue

            highlight = _extract_highlight(query, artifact.summary)
            results.append(
                SearchResult(
                    artifact_id=artifact.id,
                    room_id=room.id,
                    room_name=room.name,
                    summary=artifact.summary,
                    similarity=sim,
                    highlight=highlight,
                    full_content=artifact.fullContent,
                    embedding=artifact.embedding,
                    captured_at=artifact.capturedAt,
                )
            )

    results.sort(key=lambda r: r.similarity, reverse=True)
    top = results[:limit]
    logger.info(
        "semantic_search: userId=%s query=%r rooms=%d artifacts=%d top=%d",
        user_id, query[:60], len(rooms), len(results), len(top),
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
