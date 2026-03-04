"""Recall Agent — memory Q&A with streaming voice/text responses.

Handles both voice queries (Gemini Live API, gemini-live-2.5-flash-native-audio)
and text queries (standard Gemini, gemini-2.5-flash).

For each query:
  1. Semantic search retrieves the most relevant artifacts.
  2. A grounded system prompt is built from those artifacts.
  3. Gemini streams audio + text chunks back, fired as `response_chunk`
     WebSocket messages via the provided callback.
  4. When a diagram trigger is detected in the text, `diagram_service`
     generates an image and it is interleaved into the stream.
  5. On completion, `on_complete` is called.

Active-query registry allows `interrupt` to cancel an in-flight task.

Per agent-prompts.md §3 Recall Agent.
"""

import asyncio
import base64
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Awaitable, Callable, Optional

from google.genai import types as genai_types

from app.core.gemini import LIVE_MODEL, STANDARD_MODEL, get_genai_client
from app.services.diagram_service import generate_diagram
from app.services.search_service import SearchResult, semantic_search

logger = logging.getLogger(__name__)

# ── Types ──────────────────────────────────────────────────────────────────────

@dataclass
class ResponseChunk:
    audio_chunk: Optional[bytes]    # raw audio bytes (to be base64-encoded for WS)
    text: Optional[str]
    generated_image_url: Optional[str]
    generated_image_position: Optional[dict]
    navigation: Optional[dict]
    is_complete: bool


ChunkCallback = Callable[[ResponseChunk], Awaitable[None]]
CompleteCallback = Callable[[], Awaitable[None]]

# ── System prompt ──────────────────────────────────────────────────────────────

_BASE_SYSTEM_PROMPT = """\
You are Rayan, a knowledgeable memory recall assistant. You help users explore \
and understand their stored memories in the Memory Palace.

Today's date is {current_date}.

ROOM DIRECTORY:
{room_directory}

RULES:
- ONLY use information from the provided MEMORIES section below.
- If you don't have relevant memories say "I don't have that in your palace yet."
- NEVER hallucinate or invent information.
- Cite which artifact/room the information comes from.
- Keep responses conversational but informative (under 60 seconds unless asked).

RESPONSE STRUCTURE:
1. Brief direct answer (1-2 sentences)
2. Supporting details from memories (2-3 sentences)
3. Source citation ("This is from your [topic] session on [date]")
4. Optional: note if a diagram would help

ARTIFACT IDENTIFICATION:
When a single artifact is the primary answer, emit exactly once:
  [ARTIFACT: <artifact_id>]
Only emit this when you are confident. Use the exact ID from MEMORIES.

DIAGRAM TRIGGER:
If a diagram would genuinely help, output exactly one line:
  [DIAGRAM: <type>|<title>|<description>]
where type is one of: flowchart, comparison, formula, timeline, mindmap

MEMORIES:
{memories}
"""


async def _build_room_directory(user_id: str) -> str:
    from app.services.room_service import get_all_rooms
    try:
        rooms = await get_all_rooms(user_id)
    except Exception:
        return "(unavailable)"
    if not rooms:
        return "(no rooms)"
    lines = [f"- [{r.id}] {r.name}: {r.summary or '(no summary yet)'}" for r in rooms]
    return "\n".join(lines)


async def _load_room_artifacts_as_results(user_id: str, room_id: str) -> list[SearchResult]:
    from app.services.artifact_service import get_room_artifacts
    from app.services.room_service import get_room
    room = await get_room(user_id, room_id)
    room_name = room.name if room else room_id
    artifacts = await get_room_artifacts(user_id, room_id)
    return [
        SearchResult(
            artifact_id=a.id, room_id=room_id, room_name=room_name,
            summary=a.summary, similarity=1.0, highlight=None,
            full_content=a.fullContent, embedding=a.embedding, captured_at=a.capturedAt,
        )
        for a in artifacts
    ]


def _build_system_prompt(results: list[SearchResult], room_directory: str = "") -> str:
    current_date = datetime.now(UTC).strftime("%Y-%m-%d")
    if not results:
        return _BASE_SYSTEM_PROMPT.format(
            current_date=current_date,
            room_directory=room_directory or "(unavailable)",
            memories="(none found)",
        )
    lines: list[str] = []
    for r in results:
        captured_str = r.captured_at.strftime("%Y-%m-%d") if r.captured_at else "unknown"
        lines.append(
            f"[ARTIFACT {r.artifact_id} | Room: {r.room_name} | Captured: {captured_str} | Similarity: {r.similarity:.2f}]\n"
            f"Summary: {r.summary}"
        )
        if r.full_content:
            lines.append(f"Full content: {r.full_content[:800]}")
        lines.append("")
    return _BASE_SYSTEM_PROMPT.format(
        current_date=current_date,
        room_directory=room_directory or "(unavailable)",
        memories="\n".join(lines),
    )


# ── Active-query registry ──────────────────────────────────────────────────────

_active_queries: dict[str, asyncio.Task] = {}


def register_query(user_id: str, task: asyncio.Task) -> None:
    _active_queries[user_id] = task


def cancel_query(user_id: str) -> Optional[str]:
    """Cancel the active query for user_id. Returns the query_id if found."""
    task = _active_queries.pop(user_id, None)
    if task and not task.done():
        task.cancel()
        return True
    return False


def unregister_query(user_id: str) -> None:
    _active_queries.pop(user_id, None)


# ── Public API ─────────────────────────────────────────────────────────────────

async def process_voice_query(
    user_id: str,
    query_id: str,
    audio_bytes: bytes,
    context: dict,
    on_chunk: ChunkCallback,
    on_complete: CompleteCallback,
) -> None:
    """Process a voice query using Gemini Live API (streaming audio response)."""
    room_id: Optional[str] = context.get("currentRoomId")
    artifact_id: Optional[str] = context.get("focusedArtifactId")

    room_directory = await _build_room_directory(user_id)
    if room_id:
        results = await _load_room_artifacts_as_results(user_id, room_id)
    else:
        results = await _retrieve_context(user_id, "", room_id, artifact_id)
    system_prompt = _build_system_prompt(results, room_directory)
    nav_hint = _build_navigation(results, is_room_mode=bool(room_id))

    client = get_genai_client()
    config = genai_types.LiveConnectConfig(
        response_modalities=["AUDIO", "TEXT"],
        system_instruction=system_prompt,
        speech_config=genai_types.SpeechConfig(
            voice_config=genai_types.VoiceConfig(
                prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                    voice_name="Aoede"
                )
            )
        ),
    )

    chunk_index = 0
    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=config) as gemini:
            # Send audio input
            await gemini.send(
                input=genai_types.LiveClientRealtimeInput(
                    media_chunks=[genai_types.Blob(data=audio_bytes, mime_type="audio/webm")]
                )
            )
            # Signal end of turn so Gemini knows we're done sending and should respond.
            # Without this, the Live API just waits forever for more audio.
            await gemini.send(end_of_turn=True)

            text_buf = ""
            nav_sent = False
            selected_artifact_id: Optional[str] = None

            async for response in gemini.receive():
                audio_chunk: Optional[bytes] = None
                text_delta: Optional[str] = None
                diagram_result = None

                if hasattr(response, "data") and response.data:
                    audio_chunk = bytes(response.data)

                if hasattr(response, "text") and response.text:
                    text_delta = response.text
                    text_buf += response.text

                    # Check for artifact marker
                    if not selected_artifact_id:
                        found = _extract_artifact_id(text_buf)
                        if found:
                            selected_artifact_id = found
                            await on_chunk(ResponseChunk(
                                audio_chunk=None, text=None,
                                generated_image_url=None, generated_image_position=None,
                                navigation={
                                    "targetRoomId": results[0].room_id if results else "",
                                    "highlightArtifacts": [found],
                                    "enterRoom": False,
                                    "selectedArtifactId": found,
                                },
                                is_complete=False,
                            ))

                    # Check for diagram trigger in buffered text
                    diagram_result = await _maybe_generate_diagram(
                        text_buf, user_id, results
                    )
                    if diagram_result:
                        text_buf = ""  # reset after consuming

                nav: Optional[dict] = None
                if not nav_sent and nav_hint and (audio_chunk or text_delta):
                    nav = nav_hint
                    nav_sent = True

                chunk = ResponseChunk(
                    audio_chunk=audio_chunk,
                    text=text_delta,
                    generated_image_url=diagram_result.url if diagram_result else None,
                    generated_image_position=diagram_result.position if diagram_result else None,
                    navigation=nav,
                    is_complete=False,
                )
                await on_chunk(chunk)
                chunk_index += 1

    except asyncio.CancelledError:
        logger.info("voice_query cancelled: userId=%s queryId=%s", user_id, query_id)
        raise
    except Exception:
        logger.exception("voice_query error: userId=%s queryId=%s", user_id, query_id)
    finally:
        unregister_query(user_id)
        await on_complete()


async def process_text_query(
    user_id: str,
    query_id: str,
    text: str,
    context: dict,
    on_chunk: ChunkCallback,
    on_complete: CompleteCallback,
) -> None:
    """Process a text query using standard Gemini (streaming text response)."""
    room_id: Optional[str] = context.get("currentRoomId")
    artifact_id: Optional[str] = context.get("focusedArtifactId")

    # Extract temporal date range from query
    date_range = await _extract_date_range(text)
    captured_after = date_range[0] if date_range else None
    captured_before = date_range[1] if date_range else None

    room_directory = await _build_room_directory(user_id)
    if room_id:
        results = await _load_room_artifacts_as_results(user_id, room_id)
    else:
        results = await _retrieve_context(
            user_id, text, room_id, artifact_id,
            captured_after=captured_after,
            captured_before=captured_before,
        )
    system_prompt = _build_system_prompt(results, room_directory)
    nav_hint = _build_navigation(results, is_room_mode=bool(room_id))

    client = get_genai_client()
    nav_sent = False
    text_buf = ""
    chunk_index = 0
    selected_artifact_id: Optional[str] = None

    try:
        async for response in await client.aio.models.generate_content_stream(
            model=STANDARD_MODEL,
            contents=text,
            config=genai_types.GenerateContentConfig(system_instruction=system_prompt),
        ):
            text_delta: Optional[str] = None
            if response.text:
                text_delta = response.text
                text_buf += response.text

                # Check for artifact marker
                if not selected_artifact_id:
                    found = _extract_artifact_id(text_buf)
                    if found:
                        selected_artifact_id = found
                        await on_chunk(ResponseChunk(
                            audio_chunk=None, text=None,
                            generated_image_url=None, generated_image_position=None,
                            navigation={
                                "targetRoomId": results[0].room_id if results else "",
                                "highlightArtifacts": [found],
                                "enterRoom": False,
                                "selectedArtifactId": found,
                            },
                            is_complete=False,
                        ))

            diagram_result = await _maybe_generate_diagram(text_buf, user_id, results)
            if diagram_result:
                text_buf = ""

            nav: Optional[dict] = None
            if not nav_sent and nav_hint and text_delta:
                nav = nav_hint
                nav_sent = True

            chunk = ResponseChunk(
                audio_chunk=None,
                text=text_delta,
                generated_image_url=diagram_result.url if diagram_result else None,
                generated_image_position=diagram_result.position if diagram_result else None,
                navigation=nav,
                is_complete=False,
            )
            await on_chunk(chunk)
            chunk_index += 1

    except asyncio.CancelledError:
        logger.info("text_query cancelled: userId=%s queryId=%s", user_id, query_id)
        raise
    except Exception:
        logger.exception("text_query error: userId=%s queryId=%s", user_id, query_id)
    finally:
        unregister_query(user_id)
        await on_complete()


# ── Helpers ────────────────────────────────────────────────────────────────────

_DATE_EXTRACTION_PROMPT = """\
Extract a date range from the user's query. Today is {today}.
If the query contains a temporal reference (e.g. "yesterday", "last week", "two days ago"),
return JSON: {{"after": "YYYY-MM-DDTHH:MM:SSZ", "before": "YYYY-MM-DDTHH:MM:SSZ"}}
If no temporal reference, return: {{"after": null, "before": null}}
Only output the JSON, nothing else."""


async def _extract_date_range(query: str) -> Optional[tuple[datetime, datetime]]:
    """Parse temporal references ('yesterday', 'last week') into a date range."""
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    try:
        client = get_genai_client()
        response = await client.aio.models.generate_content(
            model=STANDARD_MODEL,
            contents=_DATE_EXTRACTION_PROMPT.format(today=today) + f"\n\nQuery: {query}",
            config=genai_types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=100,
            ),
        )
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data = json.loads(text)
        if data.get("after") and data.get("before"):
            return (
                datetime.fromisoformat(data["after"].replace("Z", "+00:00")),
                datetime.fromisoformat(data["before"].replace("Z", "+00:00")),
            )
    except Exception:
        logger.debug("Date extraction failed for query: %s", query[:80])
    return None


async def _retrieve_context(
    user_id: str,
    query_text: str,
    room_id: Optional[str],
    artifact_id: Optional[str],
    captured_after: Optional[datetime] = None,
    captured_before: Optional[datetime] = None,
) -> list[SearchResult]:
    """Use text query (or artifact summary as proxy) for semantic retrieval."""
    search_query = query_text
    if not search_query and artifact_id:
        search_query = artifact_id
    if not search_query:
        return []
    try:
        return await semantic_search(
            user_id=user_id,
            query=search_query,
            limit=8,
            room_id=room_id,
            captured_after=captured_after,
            captured_before=captured_before,
        )
    except Exception:
        logger.exception("semantic_search failed for userId=%s", user_id)
        return []


def _build_navigation(
    results: list[SearchResult],
    is_room_mode: bool = False,
    selected_artifact_id: Optional[str] = None,
) -> Optional[dict]:
    """Build a navigation hint from top search results if any exist."""
    if not results:
        return None
    top = results[0]
    highlight_ids = [r.artifact_id for r in results[:3]]
    return {
        "targetRoomId": top.room_id,
        "highlightArtifacts": highlight_ids,
        "enterRoom": not is_room_mode,
        "selectedArtifactId": selected_artifact_id,
    }


_ARTIFACT_TRIGGER_PREFIX = "[ARTIFACT:"


def _extract_artifact_id(text_buf: str) -> Optional[str]:
    if _ARTIFACT_TRIGGER_PREFIX not in text_buf:
        return None
    start = text_buf.index(_ARTIFACT_TRIGGER_PREFIX)
    end = text_buf.find("]", start)
    if end == -1:
        return None
    return text_buf[start + len(_ARTIFACT_TRIGGER_PREFIX):end].strip() or None


_DIAGRAM_TRIGGER_PREFIX = "[DIAGRAM:"

async def _maybe_generate_diagram(
    text_buf: str,
    user_id: str,
    results: list[SearchResult],
):
    """Return a DiagramResult if the text buffer contains a diagram trigger."""
    if _DIAGRAM_TRIGGER_PREFIX not in text_buf:
        return None

    start = text_buf.index(_DIAGRAM_TRIGGER_PREFIX)
    end = text_buf.find("]", start)
    if end == -1:
        return None

    payload = text_buf[start + len(_DIAGRAM_TRIGGER_PREFIX):end].strip()
    parts = [p.strip() for p in payload.split("|")]
    if len(parts) < 3:
        return None

    _, title, description = parts[0], parts[1], parts[2]
    artifact_id = results[0].artifact_id if results else "recall"

    try:
        diagram = await generate_diagram(
            description=description,
            caption=title,
            artifact_id=artifact_id,
        )
        return diagram
    except Exception:
        logger.exception("Diagram generation failed")
        return None
