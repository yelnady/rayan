from app.core.firestore import get_firestore_client


async def get_user_gemini_key(user_id: str) -> str | None:
    """Fetch the user's stored Gemini API key from Firestore."""
    db = get_firestore_client()
    doc = await db.collection("users").document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("geminiApiKey") or None
    return None


async def set_user_gemini_key(user_id: str, api_key: str | None) -> None:
    """Store or clear the user's Gemini API key in Firestore."""
    db = get_firestore_client()
    await db.collection("users").document(user_id).set(
        {"geminiApiKey": api_key or None},
        merge=True,
    )
