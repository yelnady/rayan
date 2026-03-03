from datetime import UTC, datetime

from app.core.firestore import get_firestore_client
from app.models.user import Preferences, User

_COLLECTION = "users"


async def get_user(user_id: str) -> User | None:
    db = get_firestore_client()
    doc = await db.collection(_COLLECTION).document(user_id).get()
    if not doc.exists:
        return None
    return User(**doc.to_dict())


async def create_user(
    user_id: str,
    email: str,
    display_name: str | None = None,
) -> User:
    db = get_firestore_client()
    now = datetime.now(UTC)
    user = User(
        id=user_id,
        email=email,
        displayName=display_name,
        createdAt=now,
        lastActiveAt=now,
        preferences=Preferences(),
    )
    await db.collection(_COLLECTION).document(user_id).set(user.model_dump())
    return user


async def get_or_create_user(
    user_id: str,
    email: str,
    display_name: str | None = None,
) -> User:
    """Return existing user or create one on first sign-in."""
    user = await get_user(user_id)
    if user:
        return user
    return await create_user(user_id, email, display_name)


async def update_last_active(user_id: str) -> None:
    db = get_firestore_client()
    await db.collection(_COLLECTION).document(user_id).update(
        {"lastActiveAt": datetime.now(UTC)}
    )
