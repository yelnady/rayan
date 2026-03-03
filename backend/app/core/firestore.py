from functools import lru_cache

from google.cloud import firestore


@lru_cache(maxsize=1)
def get_firestore_client() -> firestore.AsyncClient:
    """Return a cached async Firestore client."""
    return firestore.AsyncClient()
