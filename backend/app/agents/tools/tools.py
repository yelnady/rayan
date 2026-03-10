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


def highlight_artifact(artifact_id: str) -> str:
    """Highlight a specific artifact in the memory palace to draw the user's attention to it.

    Args:
        artifact_id: The exact artifact ID from MEMORIES to highlight.
    """
    return ""



def create_artifact(artifact_type: str, summary: str, full_content: str = "") -> str:
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

        summary: A concise summary of what this artifact contains (required).
        full_content: The full detailed content (optional but recommended).
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


def close_artifact() -> str:
    """Close the currently open artifact detail modal or memory view."""
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
