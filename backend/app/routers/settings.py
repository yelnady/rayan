from fastapi import APIRouter, Depends

from app.middleware.auth import verify_token
from app.services.user_settings_service import get_user_gemini_key, set_user_gemini_key

router = APIRouter(prefix="/api/v1", tags=["settings"])


@router.get("/settings")
async def get_settings(user: dict = Depends(verify_token)):
    api_key = await get_user_gemini_key(user["user_id"])
    return {
        "hasGeminiKey": bool(api_key),
        "geminiApiKeyPreview": f"{api_key[:8]}..." if api_key else None,
    }


@router.put("/settings")
async def update_settings(body: dict, user: dict = Depends(verify_token)):
    api_key = body.get("geminiApiKey") or None
    await set_user_gemini_key(user["user_id"], api_key)
    return {"ok": True}
