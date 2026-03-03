"""Capture Agent — Gemini Live API integration.

Manages one long-lived Gemini Live session per capture session.
Receives audio/video chunks from the WebSocket handler, streams them
to Gemini, and fires an async callback whenever a concept is extracted.

System prompt instructs Gemini to output single-line JSON on each extraction:
  {"action":"extract_concept","concept":{...},"voice_ack":"..."}
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional

from google.genai import types as genai_types

from app.agents.memory_architect import CategorizationResult, categorize_and_store
from app.core.gemini import LIVE_MODEL, get_genai_client
from app.services.capture_service import add_artifact_to_session

logger = logging.getLogger(__name__)

MIN_EXTRACTION_INTERVAL: float = 15.0  # seconds between extractions
CONFIDENCE_THRESHOLD: float = 0.7

_SYSTEM_PROMPT = (
    "You are Rayan, an intelligent memory capture assistant. "
    "You observe real-time audio/video from study sessions, lectures, and conversations.\n\n"
    "When you identify a key concept worth remembering, output a single-line JSON:\n"
    '{"action":"extract_concept",'
    '"concept":{"title":"<3-7 words>","summary":"<50-150 words>","type":"lecture|document|visual|conversation",'
    '"keywords":["k1","k2","k3"],"confidence":<0.0-1.0>},'
    '"voice_ack":"<brief: Got it - [concept]>"}\n\n'
    "Rules:\n"
    "- Minimum 15 seconds between extractions\n"
    "- Only extract when confidence >= 0.7\n"
    "- Keep voice_ack very brief and non-disruptive\n"
    "- Do NOT repeat information already extracted"
)


@dataclass
class ExtractionEvent:
    concept_title: str
    concept_summary: str
    concept_type: str
    concept_keywords: list[str]
    confidence: float
    voice_audio: Optional[bytes] = None
    categorization: Optional[CategorizationResult] = None


ExtractionCallback = Callable[[ExtractionEvent], Awaitable[None]]


class CaptureAgent:
    """One instance per active capture session."""

    def __init__(
        self,
        user_id: str,
        session_id: str,
        on_extraction: ExtractionCallback,
    ) -> None:
        self.user_id = user_id
        self.session_id = session_id
        self._on_extraction = on_extraction
        self._chunk_queue: asyncio.Queue[Optional[bytes]] = asyncio.Queue(maxsize=200)
        self._task: Optional[asyncio.Task] = None
        self._last_extraction_at: float = 0.0
        self._extractions: list[ExtractionEvent] = []
        self._running = False

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(
            self._run(), name=f"capture-{self.session_id}"
        )
        logger.info("CaptureAgent started: sessionId=%s", self.session_id)

    async def send_chunk(self, data: bytes) -> None:
        """Queue raw audio/video bytes for streaming to Gemini."""
        if self._running and not self._chunk_queue.full():
            await self._chunk_queue.put(data)

    async def stop(self) -> list[ExtractionEvent]:
        """Gracefully stop the agent and return all extraction events."""
        self._running = False
        await self._chunk_queue.put(None)  # sentinel to unblock sender
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=10.0)
            except asyncio.TimeoutError:
                self._task.cancel()
        logger.info(
            "CaptureAgent stopped: sessionId=%s totalExtractions=%d",
            self.session_id, len(self._extractions),
        )
        return self._extractions

    # ── Private ────────────────────────────────────────────────────────────

    async def _run(self) -> None:
        client = get_genai_client()
        config = genai_types.LiveConnectConfig(
            response_modalities=["AUDIO", "TEXT"],
            system_instruction=_SYSTEM_PROMPT,
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name="Aoede"
                    )
                )
            ),
        )
        try:
            async with client.aio.live.connect(model=LIVE_MODEL, config=config) as gemini:
                await asyncio.gather(
                    self._send_chunks(gemini),
                    self._receive_responses(gemini),
                )
        except Exception:
            logger.exception("CaptureAgent session error: sessionId=%s", self.session_id)

    async def _send_chunks(self, gemini) -> None:
        while True:
            chunk = await self._chunk_queue.get()
            if chunk is None:
                break
            try:
                await gemini.send(
                    genai_types.LiveClientRealtimeInput(
                        media_chunks=[genai_types.Blob(data=chunk, mime_type="audio/webm")]
                    )
                )
            except Exception:
                logger.exception("Chunk send error: sessionId=%s", self.session_id)

    async def _receive_responses(self, gemini) -> None:
        audio_buf = bytearray()
        text_buf = ""

        async for response in gemini.receive():
            if not self._running and self._chunk_queue.empty():
                break

            if hasattr(response, "data") and response.data:
                audio_buf.extend(response.data)
            if hasattr(response, "text") and response.text:
                text_buf += response.text

            extraction = _try_parse_extraction(text_buf)
            if extraction and self._should_extract(extraction["concept"]["confidence"]):
                self._last_extraction_at = time.monotonic()
                text_buf = ""
                event = ExtractionEvent(
                    concept_title=extraction["concept"]["title"],
                    concept_summary=extraction["concept"]["summary"],
                    concept_type=extraction["concept"]["type"],
                    concept_keywords=extraction["concept"]["keywords"],
                    confidence=extraction["concept"]["confidence"],
                    voice_audio=bytes(audio_buf) if audio_buf else None,
                )
                audio_buf.clear()
                await self._handle_extraction(event)

    async def _handle_extraction(self, event: ExtractionEvent) -> None:
        try:
            result = await categorize_and_store(
                user_id=self.user_id,
                session_id=self.session_id,
                concept_title=event.concept_title,
                concept_summary=event.concept_summary,
                concept_type=event.concept_type,
                concept_keywords=event.concept_keywords,
                concept_confidence=event.confidence,
            )
            event.categorization = result
            await add_artifact_to_session(
                self.user_id, self.session_id, result.artifact.id
            )
        except Exception:
            logger.exception("Categorization failed: sessionId=%s", self.session_id)

        self._extractions.append(event)
        try:
            await self._on_extraction(event)
        except Exception:
            logger.exception("Extraction callback error: sessionId=%s", self.session_id)

    def _should_extract(self, confidence: float) -> bool:
        elapsed = time.monotonic() - self._last_extraction_at
        return confidence >= CONFIDENCE_THRESHOLD and elapsed >= MIN_EXTRACTION_INTERVAL


def _try_parse_extraction(text: str) -> Optional[dict]:
    for line in reversed(text.splitlines()):
        line = line.strip()
        if '"action":"extract_concept"' in line:
            try:
                data = json.loads(line)
                if data.get("action") == "extract_concept" and "concept" in data:
                    return data
            except json.JSONDecodeError:
                continue
    return None


# ── Agent registry (session_id → CaptureAgent) ─────────────────────────────

_active: dict[str, CaptureAgent] = {}


def get_agent(session_id: str) -> Optional[CaptureAgent]:
    return _active.get(session_id)


def register_agent(session_id: str, agent: CaptureAgent) -> None:
    _active[session_id] = agent


def unregister_agent(session_id: str) -> None:
    _active.pop(session_id, None)
