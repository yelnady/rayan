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
    client = genai.Client(vertexai=True, project=settings.google_cloud_project, location="us-central1")
    # Workaround for google-genai SDK bug: trailing slash in base_url
    # causes double-slash in websocket URIs, resulting in 1008 Auth Policy Violations.
    if client._api_client._http_options.base_url.endswith('/'):
        client._api_client._http_options.base_url = client._api_client._http_options.base_url[:-1]
    return client
