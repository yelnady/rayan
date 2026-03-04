"""Content extractor — fetches a URL and returns cleaned text content.

T120: Pulls readable text from a webpage for enrichment context.
Uses httpx for async HTTP and html.parser (stdlib) to strip tags.
No heavy dependency on BeautifulSoup; keeps the container slim.
"""

import html
import logging
import re
from html.parser import HTMLParser

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 8.0
_MAX_CONTENT_CHARS = 4000  # feed to Gemini — keep token budget reasonable

# Tags whose inner text we discard entirely
_SKIP_TAGS = {
    "script", "style", "noscript", "nav", "footer", "header", "aside",
    "form", "button", "meta", "link", "svg", "img",
}


class _TextExtractor(HTMLParser):
    """Minimal HTML → plain-text converter."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip_depth: int = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag in _SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            text = data.strip()
            if text:
                self._parts.append(text)

    @property
    def text(self) -> str:
        raw = " ".join(self._parts)
        # Collapse whitespace runs
        return re.sub(r"\s{2,}", " ", html.unescape(raw)).strip()


async def extract_content(url: str) -> str:
    """Fetch *url* and return cleaned text, up to _MAX_CONTENT_CHARS.

    Returns an empty string on any network or parse error so callers can
    degrade gracefully.
    """
    try:
        async with httpx.AsyncClient(
            timeout=_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": "RayanMemoryBot/1.0"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "html" not in content_type:
                logger.info("content_extractor: non-HTML content at %s (%s)", url, content_type)
                return resp.text[:_MAX_CONTENT_CHARS]
            html_text = resp.text
    except Exception:
        logger.warning("content_extractor: failed to fetch %s", url)
        return ""

    extractor = _TextExtractor()
    try:
        extractor.feed(html_text)
    except Exception:
        logger.warning("content_extractor: parse error for %s", url)
        return ""

    return extractor.text[:_MAX_CONTENT_CHARS]
