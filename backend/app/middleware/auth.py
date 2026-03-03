from fastapi import Header, HTTPException
from firebase_admin import auth


async def verify_token(authorization: str = Header(...)) -> dict[str, str]:
    """FastAPI dependency that verifies a Firebase ID token.

    Returns a dict with user_id and email on success.
    Raises HTTP 401 on any failure.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header must be 'Bearer <token>'")

    token = authorization.removeprefix("Bearer ")

    try:
        decoded = auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    return {
        "user_id": decoded["uid"],
        "email": decoded.get("email", ""),
    }
