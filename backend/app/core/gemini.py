from functools import lru_cache

from google import genai

from app.config import settings

LIVE_MODEL = "gemini-live-2.5-flash-native-audio"
STANDARD_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.5-flash-image"
EMBEDDING_MODEL = "text-embedding-005"


@lru_cache(maxsize=1)
def get_genai_client() -> genai.Client:
    """Return a cached GenAI client using Application Default Credentials."""
    return genai.Client(vertexai=True, project=settings.google_cloud_project, location="us-central1")
