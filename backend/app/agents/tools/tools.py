"""Tool stubs for all Rayan agents.

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
        artifact_type: One of: lecture, document, visual, conversation.
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


def save_artifact(artifact_type: str, summary: str, full_content: str = "") -> str:
    """Save a new artifact to the current room in the memory palace and store it permanently.

    Use this when the user shares knowledge, a concept, or information they want to remember.

    Args:
        artifact_type: Type of artifact. Must be one of:
            - "lecture"      → a lesson, class, or educational talk (shown as hologram frame)
            - "document"     → a text document, note, or article (shown as floating book)
            - "visual"       → an image, diagram, or visual content (shown as framed image)
            - "conversation" → a discussion, interview, or dialogue (shown as speech bubble)
            - "enrichment"   → supplementary or research material (shown as crystal orb)
        summary: A concise summary of what this artifact contains (required).
        full_content: The full detailed content of the artifact (optional but recommended).
    """
    return ""


def end_session() -> str:
    """End the current voice session when the user asks to stop, disconnect, or end the conversation."""
    return ""


def close_artifact() -> str:
    """Close the currently open artifact detail modal or memory view."""
    return ""
