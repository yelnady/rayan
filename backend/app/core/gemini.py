from google import genai

from app.config import settings

LIVE_MODEL = "gemini-live-2.5-flash-native-audio"
STANDARD_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.5-flash-image"
EMBEDDING_MODEL = "text-embedding-005"

# Cache clients by api_key (None = Vertex AI ADC)
_client_cache: dict[str | None, genai.Client] = {}


def get_genai_client(api_key: str | None = None) -> genai.Client:
    """Return a cached GenAI client.

    If api_key is provided, creates a Gemini API key client.
    Otherwise falls back to Vertex AI Application Default Credentials.
    """
    if api_key not in _client_cache:
        if api_key:
            client = genai.Client(api_key=api_key)
        else:
            client = genai.Client(vertexai=True, project=settings.google_cloud_project, location="us-central1")
        # Workaround for google-genai SDK bug: trailing slash in base_url
        # causes double-slash in websocket URIs, resulting in 1008 Auth Policy Violations.
        if client._api_client._http_options.base_url.endswith('/'):
            client._api_client._http_options.base_url = client._api_client._http_options.base_url[:-1]
        _client_cache[api_key] = client
    return _client_cache[api_key]
