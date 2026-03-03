import numpy as np

from app.core.gemini import EMBEDDING_MODEL, get_genai_client


async def get_embedding(text: str) -> list[float]:
    """Return a 768-dimensional semantic embedding via Gemini text-embedding-004."""
    client = get_genai_client()
    response = await client.aio.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
    )
    return list(response.embeddings[0].values)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two embedding vectors. Returns 0.0 for zero vectors."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = float(np.linalg.norm(va))
    norm_b = float(np.linalg.norm(vb))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))
