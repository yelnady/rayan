#!/usr/bin/env python3
"""
fix_room_positions.py — one-shot migration to fix room positions for existing users.

Run from the backend/ directory:
    python fix_room_positions.py

This will:
  1. Find all users who have a palace
  2. Re-assign room positions so they're staggered 30+ units away from the lobby origin
  3. Re-write lobbyDoors in the layout document
"""

import asyncio
import os
import sys

# Make sure the app package is importable
sys.path.insert(0, os.path.dirname(__file__))

# Bootstrap GCP credentials / settings
from app.config import settings  # noqa: F401 – loads .env
from app.core.firestore import get_firestore_client

WALL_POSITIONS = ["north", "east", "south", "west"]
OFFSET_X = 30.0
OFFSET_Z = 0.0
SPACING  = 30.0
COLS     = 3


def grid_position(n: int) -> dict:
    col = n % COLS
    row = n // COLS
    return {"x": OFFSET_X + col * SPACING, "y": 0.0, "z": OFFSET_Z + row * SPACING}


async def fix_user(db, user_id: str) -> None:
    rooms_ref = db.collection("users").document(user_id).collection("rooms")
    layout_ref = (
        db.collection("users").document(user_id).collection("layout").document("main")
    )

    rooms_snap = await rooms_ref.get()
    if not rooms_snap:
        print(f"  [{user_id}] no rooms, skipping")
        return

    # Sort by createdAt so ordering is stable
    rooms = sorted(
        [{"id": d.id, **d.to_dict()} for d in rooms_snap if d.exists],
        key=lambda r: r.get("createdAt", 0),
    )

    lobby_doors = []
    for i, room in enumerate(rooms):
        new_pos = grid_position(i)
        await rooms_ref.document(room["id"]).update({"position": new_pos})
        print(f"  [{user_id}] room {room['id']:20s} → position {new_pos}")

        lobby_doors.append({
            "roomId": room["id"],
            "wallPosition": WALL_POSITIONS[i % len(WALL_POSITIONS)],
            "doorIndex": i // len(WALL_POSITIONS),
        })

    await layout_ref.set({"lobbyDoors": lobby_doors}, merge=True)
    print(f"  [{user_id}] wrote {len(lobby_doors)} lobbyDoors to layout")


async def main() -> None:
    db = get_firestore_client()

    # Discover all users who have a palace by querying the 'palace' collection
    # group directly in Firestore — no Firebase Auth Admin role required.
    palace_docs = await db.collection_group("palace").where("__name__", "!=", "").get()

    # Extract unique user IDs from paths like: users/{uid}/palace/main
    user_ids = set()
    for doc in palace_docs:
        parts = doc.reference.path.split("/")
        # path format: users / {uid} / palace / {doc_id}
        if len(parts) >= 2 and parts[0] == "users":
            user_ids.add(parts[1])

    print(f"Found {len(user_ids)} user(s) with a palace: {user_ids}")

    for uid in sorted(user_ids):
        print(f"[{uid}] fixing …")
        await fix_user(db, uid)

    print("\nDone ✓")


if __name__ == "__main__":
    asyncio.run(main())
