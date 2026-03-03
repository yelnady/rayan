import firebase_admin
from firebase_admin import credentials


def init_firebase(project_id: str) -> firebase_admin.App:
    """Initialize Firebase Admin SDK (idempotent)."""
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        return firebase_admin.initialize_app(cred, {"projectId": project_id})
    return firebase_admin.get_app()
