from functools import lru_cache

from google import genai

from app.config import settings

LIVE_MODEL = "gemini-live-2.5-flash-native-audio"
STANDARD_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.5-flash-image"
EMBEDDING_MODEL = "models/text-embedding-004"


@lru_cache(maxsize=1)
def get_genai_client() -> genai.Client:
    """Return a cached GenAI client."""
    return genai.Client(api_key=settings.gemini_api_key)
