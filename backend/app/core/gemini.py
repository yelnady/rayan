from google import genai

LIVE_MODEL = "gemini-live-2.5-flash-native-audio"
STANDARD_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.5-flash-image"
EMBEDDING_MODEL = "text-embedding-005"

_client_cache: dict[str, genai.Client] = {}


def get_genai_client(api_key: str | None = None) -> genai.Client:
    """Return a cached GenAI client using the provided API key.

    Raises ValueError if no key is provided — all callers must supply a
    user-owned key; there is no fallback to shared project credentials.
    """
    if not api_key:
        raise ValueError("A Gemini API key is required. Add one in Settings.")
    if api_key not in _client_cache:
        client = genai.Client(api_key=api_key)
        # Workaround for google-genai SDK bug: trailing slash in base_url
        # causes double-slash in websocket URIs, resulting in 1008 Auth Policy Violations.
        if client._api_client._http_options.base_url.endswith('/'):
            client._api_client._http_options.base_url = client._api_client._http_options.base_url[:-1]
        _client_cache[api_key] = client
    return _client_cache[api_key]
