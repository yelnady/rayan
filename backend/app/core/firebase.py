import firebase_admin
from firebase_admin import credentials
from app.config import settings

def init_firebase(project_id: str) -> firebase_admin.App:
    """Initialize Firebase Admin SDK (idempotent)."""
    if not firebase_admin._apps:
        if settings.google_application_credentials:
            cred = credentials.Certificate(settings.google_application_credentials)
        else:
            cred = credentials.ApplicationDefault()
        return firebase_admin.initialize_app(cred, {"projectId": project_id})
    return firebase_admin.get_app()
