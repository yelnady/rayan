#!/usr/bin/env python3
"""Standalone script — populate Lunch Food + My Daughter rooms for a given user.

Usage (from backend/ directory):
    python scripts/populate_extra.py <USER_ID>

The script initialises Firebase Admin SDK using the same credentials the
server uses (.env / GOOGLE_APPLICATION_CREDENTIALS) and calls
populate_extra_rooms() directly against Firestore.

Example:
    cd backend
    python scripts/populate_extra.py abc123uid
"""

import asyncio
import sys
import os
import logging

# ── Make sure the app package is importable ───────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)


async def main(user_id: str) -> None:
    # Init Firebase before touching any service
    from app.config import settings
    from app.core.firebase import init_firebase

    init_firebase(settings.firebase_project_id)
    logger.info("Firebase initialised (project=%s)", settings.firebase_project_id)

    from app.services.seed_service import populate_extra_rooms

    logger.info("Populating extra rooms for userId=%s …", user_id)
    result = await populate_extra_rooms(user_id)

    summary = result["summary"]
    print(f"\nDone!")
    print(f"  Rooms created   : {summary['roomsCreated']}")
    print(f"  Artifacts created: {summary['artifactsCreated']}")
    for room in result["rooms"]:
        print(f"  - {room.name!r}  id={room.id}  style={room.style}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <USER_ID>")
        sys.exit(1)

    asyncio.run(main(sys.argv[1]))
