"""Tool stubs and execution helpers for all Rayan agents.

These are plain Python functions whose signatures and docstrings are read by the
Gemini SDK to generate the function-calling schema sent to the model.

Execution logic lives in the agent that owns each tool:
  - capture_concept  → CaptureAgent._receive_responses()
  - all others       → RecallAgent._execute_tool()
"""


# ── Capture Agent tools ────────────────────────────────────────────────────────

def capture_concept(
    title: str,
    summary: str,
    artifact_type: str,
    keywords: list[str],
    confidence: float,
) -> str:
    """Extract and save a key concept to the memory palace.

    Args:
        title: Short title for the concept (3-7 words).
        summary: Detailed summary of the concept (50-150 words).
        artifact_type: Type of memory. One of:
            lecture, document, visual, conversation, enrichment,
            lesson, insight, question,
            moment, milestone, emotion, dream, habit,
            opinion, media, goal.
        keywords: 2-4 topic keywords for categorisation.
        confidence: How confident you are this is worth saving (0.0-1.0).
    """
    return ""


# ── Recall Agent tools ─────────────────────────────────────────────────────────

def navigate_to_room(room_id: str) -> str:
    """Navigate the user to a specific room in their memory palace, or back to the lobby.

    Args:
        room_id: The exact room ID from the ROOM DIRECTORY to navigate to,
                 or "lobby" to return to the main palace lobby.
    """
    return ""


def navigate_to_map_view() -> str:
    """Toggle the bird's-eye map overview of the entire memory palace.

    Use this when the user asks to see the map, overview, bird's-eye view,
    or wants to see all their rooms at once — e.g. "show me the map",
    "go to overview", "show me everything", "zoom out".

    Also use this to exit map view when the user asks to go back to
    first-person view — e.g. "exit map", "go back", "first person".
    """
    return ""


def navigate_horizontal(direction: str) -> str:
    """Move left or right within the current room to see more artifacts.

    Args:
        direction: The direction to move. Must be either "left" or "right".
    """
    return ""


def highlight_artifact(artifact_id: str) -> str:
    """Highlight a specific artifact in the memory palace to draw the user's attention to it.

    Args:
        artifact_id: The exact artifact ID from MEMORIES to highlight.
    """
    return ""



def create_artifact(artifact_type: str, title: str, summary: str, keywords: list[str] = [], full_content: str = "") -> str:
    """Create and save a new artifact to the current room in the memory palace.

    Use this when the user shares something they want to remember — a thought, experience,
    goal, emotion, opinion, or any personal memory.

    Args:
        artifact_type: The type of memory. Must be one of:

            KNOWLEDGE & LEARNING:
            - "lecture"      → educational talks, classes, presentations    (hologram frame)
            - "document"     → notes, articles, written text                (floating book)
            - "lesson"       → structured lessons, tutorials, how-tos       (lesson model)
            - "insight"      → sudden realizations, aha moments             (brain model)
            - "question"     → open questions, things to explore            (question model)

            EXPERIENCES & EMOTIONS:
            - "moment"       → a personal memory or specific experience     (coffee model)
            - "milestone"    → life events, achievements, transitions       (milestone model)
            - "emotion"      → feelings or emotional states                 (heart model)
            - "dream"        → long-term aspirations, deep wishes           (dream model)
            - "habit"        → recurring behaviors, routines                (tree model)

            OPINIONS & IDENTITY:
            - "conversation" → discussions, interviews, dialogues           (speech bubble)
            - "opinion"      → views, stances, beliefs on topics            (opinion model)
            - "visual"       → images, diagrams, visual content             (framed image)
            - "media"        → music, podcasts, films that resonated        (headphones model)

            GOALS:
            - "goal"         → aspirations, objectives, things to achieve   (cash stack model)
            - "enrichment"   → research or supplementary material           (crystal orb)

        title: A short, descriptive name for the artifact (3-7 words).
        summary: A concise summary of what this artifact contains (required).
        keywords: 2-5 topic keywords that describe the artifact's content.
        full_content: The full detailed content (optional but recommended).
    """
    return ""


def create_room(name: str, keywords: list[str]) -> str:
    """Create a new room in the memory palace for a distinct topic.

    Use this when the user explicitly asks to start a new room, or when the
    current topic is clearly unrelated to any existing room.

    Args:
        name: A short, descriptive name for the room (3-5 words).
        keywords: 2-4 topic keywords that describe the room's theme.
    """
    return ""


def web_search(query: str) -> str:
    """Search the web for information about a topic and return a summary of findings.

    Use this to look up facts, definitions, current information, or context about
    anything mentioned during the session that would enrich the user's memory.

    Args:
        query: A clear, specific search query (e.g. "what is the Feynman technique for learning").
    """
    return ""


def end_session() -> str:
    """End the current voice session when the user asks to stop, disconnect, or end the conversation."""
    return ""


def close_session() -> str:
    """Save and close the current capture session, finalizing all captured memories.

    Use this when the user explicitly asks to close, finish, or stop the capture session.
    This saves all captured artifacts and ends the session gracefully.
    """
    return ""


def synthesize_room() -> str:
    """Generate a beautiful mind map image that synthesizes all memories in the current room.

    Use this when the user asks you to summarize, visualize, or synthesize the current room —
    e.g. "summarize everything here", "make a mind map of this room", "show me an overview".

    No arguments needed — the current room context is used automatically.
    The mind map is stored as a special synthesis artifact floating in the center of the room.
    """
    return ""


def close_artifact() -> str:
    """Close the currently open artifact detail modal or memory view."""
    return ""


def edit_artifact(artifact_id: str, summary: str = "", full_content: str = "") -> str:
    """Edit an existing artifact's summary or full content in the memory palace.

    Use this when the user asks to update, correct, or expand a memory.
    At least one of summary or full_content must be provided.

    Args:
        artifact_id: The exact artifact ID from MEMORIES to edit.
        summary: The new concise summary to replace the existing one (leave empty to keep unchanged).
        full_content: The new full content to replace the existing one (leave empty to keep unchanged).
    """
    return ""


def delete_artifact(artifact_id: str) -> str:
    """Permanently delete an artifact from the user's memory palace.

    Use this only when the user explicitly asks to delete, remove, or forget a specific memory.
    Always confirm which artifact the user wants to delete before calling this tool.

    Args:
        artifact_id: The exact artifact ID from MEMORIES to delete.
    """
    return ""


# ── Execution helpers ──────────────────────────────────────────────────────────

async def execute_web_search(query: str) -> str:
    """Execute a web search using Gemini's google_search grounding and return results."""
    import json
    import logging
    from app.core.gemini import get_genai_client

    logger = logging.getLogger(__name__)
    client = get_genai_client()
    prompt = f"Search for information about: {query}\n\nProvide a concise summary (2-4 sentences) of the most relevant findings."
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config={
                "tools": [{"google_search": {}}],
                "temperature": 0.2,
                "max_output_tokens": 512,
            },
        )
        return response.text.strip() if response.text else "No results found."
    except Exception:
        logger.exception("execute_web_search failed for query=%r", query[:80])
        return "Web search failed."
