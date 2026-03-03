from functools import lru_cache

from google.cloud import storage


@lru_cache(maxsize=1)
def get_storage_client() -> storage.Client:
    """Return a cached Cloud Storage client."""
    return storage.Client()
