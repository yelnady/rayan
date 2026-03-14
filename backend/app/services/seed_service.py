"""Seed Service — pre-populate new palaces with sample rooms and artifacts.

Creates 6 themed rooms with ~3 artifacts each so the palace feels alive
from the first visit. Artifacts get real embeddings and staggered capturedAt
dates spread over the past 2 weeks.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from app.models.artifact import Artifact, ArtifactType
from app.models.room import Room
from app.services.artifact_service import create_artifact
from app.services.room_service import create_room, increment_artifact_count, recompute_room_summary

logger = logging.getLogger(__name__)

# ── Seed definitions ──────────────────────────────────────────────────────────

_SEED_ROOMS: list[dict[str, Any]] = [
    {
        "name": "Natural Museum Visit",
        "style": "museum",
        "keywords": ["museum", "nature", "exhibits", "paleontology"],
        "artifacts": [
            {
                "type": ArtifactType.lecture,
                "title": "Dinosaur Evolution",
                "summary": (
                    "A deep dive into 165 million years of dinosaur evolution, from early Triassic archosaurs "
                    "to the Cretaceous extinction event."
                ),
                "fullContent": (
                    "The exhibit traced the full arc of dinosaur evolution over 165 million years. "
                    "Starting with small bipedal archosaurs in the late Triassic, the display showed how "
                    "sauropods grew to enormous sizes while theropods evolved into agile predators. "
                    "The Cretaceous section featured feathered dinosaurs, connecting them directly to modern birds. "
                    "The final panel covered the asteroid impact and the mass extinction event."
                ),
            },
            {
                "type": ArtifactType.visual,
                "title": "Ancient Fossils Display",
                "summary": (
                    "Perfectly preserved trilobite and ammonite fossils spanning 500 million years, "
                    "showcasing intricate spiral patterns from the Cambrian period."
                ),
                "fullContent": (
                    "A stunning glass case held dozens of perfectly preserved trilobite and ammonite fossils. "
                    "The oldest specimens dated back 500 million years to the Cambrian period. "
                    "Each fossil was labeled with its geological era and the location where it was found. "
                    "The intricate spiral patterns of the ammonites were particularly striking under the museum lights."
                ),
            },
            {
                "type": ArtifactType.document,
                "title": "Ocean Evolution Guide",
                "summary": (
                    "A museum guide tracing how marine ecosystems transformed from the Cambrian Explosion "
                    "through the rise of coral reefs, sharks, and marine reptiles."
                ),
                "fullContent": (
                    "The museum guidebook covered how marine ecosystems changed from the Precambrian to today. "
                    "It explained the Cambrian Explosion when most major animal phyla first appeared in the oceans. "
                    "Coral reefs, ancient sharks, and giant marine reptiles like plesiosaurs each had dedicated chapters. "
                    "The guide emphasized how ocean chemistry shifts drove major evolutionary transitions."
                ),
            },
        ],
    },
    {
        "name": "Machine Learning Lab",
        "style": "lab",
        "keywords": ["machine-learning", "neural-networks", "AI", "algorithms"],
        "artifacts": [
            {
                "type": ArtifactType.lecture,
                "title": "Gradient Descent",
                "summary": (
                    "An intuitive walkthrough of gradient descent, learning rates, and why Adam optimizer "
                    "is the go-to choice for deep learning."
                ),
                "fullContent": (
                    "The lecture walked through how gradient descent iteratively minimizes a loss function. "
                    "Starting with the intuition of rolling a ball downhill, it introduced learning rates and "
                    "showed how too-large steps cause oscillation while too-small steps lead to slow convergence. "
                    "Stochastic gradient descent and mini-batch variants were compared for speed and stability. "
                    "Adam optimizer was presented as the go-to default for most deep learning tasks."
                ),
            },
            {
                "type": ArtifactType.document,
                "title": "Neural Network Architectures",
                "summary": (
                    "A comparison of CNNs, RNNs, and Transformers — covering their strengths, limitations, "
                    "and why attention mechanisms revolutionized NLP."
                ),
                "fullContent": (
                    "A comprehensive overview comparing three major neural network families. "
                    "CNNs excel at spatial pattern recognition using convolutional filters and pooling layers. "
                    "RNNs and LSTMs process sequential data but struggle with long-range dependencies. "
                    "Transformers solved the long-range problem with self-attention, enabling breakthroughs "
                    "in NLP and becoming the foundation for modern large language models."
                ),
            },
            {
                "type": ArtifactType.conversation,
                "title": "Debugging Overfitting",
                "summary": (
                    "Diagnosing a model where training loss improved but validation loss diverged — "
                    "solved with dropout, early stopping, and learning rate scheduling."
                ),
                "fullContent": (
                    "Discussion about a model where training loss decreased but validation loss diverged after epoch 15. "
                    "The root cause was overfitting due to insufficient dropout and no data augmentation. "
                    "Adding dropout of 0.3 after dense layers and implementing early stopping fixed the issue. "
                    "We also discussed using learning rate scheduling to improve final convergence."
                ),
            },
        ],
    },
    {
        "name": "Mountain Hiking",
        "style": "garden",
        "keywords": ["hiking", "mountains", "outdoors", "nature"],
        "artifacts": [
            {
                "type": ArtifactType.visual,
                "title": "Summit Panorama",
                "summary": (
                    "A breathtaking 360-degree view from the summit with snow-capped peaks, "
                    "a sea of clouds below, and seven mountain ranges visible at golden hour."
                ),
                "fullContent": (
                    "The view from the summit was breathtaking with snow-capped peaks stretching in every direction. "
                    "Cloud formations sat below us in the valley, creating a sea-of-clouds effect at sunrise. "
                    "We could identify at least seven distinct mountain ranges from the observation point. "
                    "The golden hour light painted everything in warm amber and deep purple shadows."
                ),
            },
            {
                "type": ArtifactType.conversation,
                "title": "Trail Safety Tips",
                "summary": (
                    "Key safety advice from the trail guide: carry extra water, watch for altitude sickness, "
                    "and always start descending before 2 PM."
                ),
                "fullContent": (
                    "The trail guide shared essential safety advice for high-altitude hiking. "
                    "Always carry more water than you think you need and start descending before 2 PM. "
                    "Watch for signs of altitude sickness: headaches, nausea, and unusual fatigue. "
                    "Layer clothing for rapid weather changes and never hike alone above the treeline."
                ),
            },
            {
                "type": ArtifactType.document,
                "title": "Alpine Flora Guide",
                "summary": (
                    "Identification guide for hardy plants above 10,000 feet, including forget-me-nots "
                    "and moss campion with their extreme survival adaptations."
                ),
                "fullContent": (
                    "A field guide section covering the hardy plants that survive above 10,000 feet. "
                    "Alpine forget-me-nots, moss campion, and sky pilot were the most common species spotted. "
                    "These plants have adapted with deep root systems, waxy leaves, and compact growth forms. "
                    "The blooming season is incredibly short, lasting only 6-8 weeks in midsummer."
                ),
            },
        ],
    },
    {
        "name": "Biology Garden",
        "style": "sanctuary",
        "keywords": ["biology", "cells", "genetics", "botany"],
        "artifacts": [
            {
                "type": ArtifactType.lecture,
                "title": "Photosynthesis",
                "summary": (
                    "The two-stage process of photosynthesis: light reactions generating ATP in thylakoids, "
                    "and the Calvin cycle building glucose in the stroma."
                ),
                "fullContent": (
                    "The lecture covered the two main stages of photosynthesis: light reactions and the Calvin cycle. "
                    "In the thylakoid membranes, chlorophyll absorbs photons to split water and generate ATP. "
                    "The Calvin cycle then uses that ATP and CO2 to build glucose in the stroma. "
                    "C4 and CAM plants were highlighted as evolutionary adaptations for hot, dry climates."
                ),
            },
            {
                "type": ArtifactType.document,
                "title": "Cell Organelles",
                "summary": (
                    "A reference guide to eukaryotic organelles — from the nucleus controlling gene expression "
                    "to mitochondria producing ATP and the Golgi shipping proteins."
                ),
                "fullContent": (
                    "A detailed reference covering the major organelles in eukaryotic cells. "
                    "The nucleus stores DNA and controls gene expression through mRNA transcription. "
                    "Mitochondria are the powerhouses, producing ATP through oxidative phosphorylation. "
                    "The endoplasmic reticulum handles protein folding while the Golgi apparatus packages "
                    "and ships proteins to their correct cellular destinations."
                ),
            },
            {
                "type": ArtifactType.visual,
                "title": "DNA Double Helix",
                "summary": (
                    "A 3D model of the double helix showing A-T and G-C base pairing, "
                    "the sugar-phosphate backbone, and how helicase unzips DNA for replication."
                ),
                "fullContent": (
                    "A detailed 3D model showing the double helix structure discovered by Watson and Crick. "
                    "Adenine pairs with thymine, and guanine pairs with cytosine through hydrogen bonds. "
                    "The sugar-phosphate backbone spirals around the outside while base pairs stack inside. "
                    "The model also showed how helicase unzips the strands during DNA replication."
                ),
            },
        ],
    },
    {
        "name": "Coffee Shop Moments",
        "style": "studio",
        "keywords": ["coffee", "conversations", "ideas", "social"],
        "artifacts": [
            {
                "type": ArtifactType.conversation,
                "title": "AI Study Companion Idea",
                "summary": (
                    "Brainstorming an app that captures lectures, extracts concepts, and places them "
                    "in 3D memory palace rooms with a freemium revenue model."
                ),
                "fullContent": (
                    "Over lattes, we brainstormed an app that records lectures and creates interactive study guides. "
                    "The key insight was using spatial memory to help retention, like a mental palace. "
                    "We sketched out the MVP: capture audio, extract concepts, and place them in 3D rooms. "
                    "Revenue model would be freemium with premium features for unlimited captures and AI tutoring."
                ),
            },
            {
                "type": ArtifactType.document,
                "title": "Latte Art Techniques",
                "summary": (
                    "The barista's guide to microfoam texturing, heart pours, and rosetta patterns — "
                    "from proper steam wand technique to the final pull-through."
                ),
                "fullContent": (
                    "The barista explained the fundamentals of latte art starting with proper milk texturing. "
                    "Microfoam needs to be silky with tiny bubbles, achieved by keeping the steam wand just below the surface. "
                    "Hearts are the easiest pattern: pour from high, then drop low and push through. "
                    "Rosettas require a side-to-side wiggle while slowly pulling back through the design."
                ),
            },
            {
                "type": ArtifactType.lecture,
                "title": "History of Coffee",
                "summary": (
                    "Coffee's journey from Ethiopian highlands and Sufi monasteries in Yemen "
                    "to Ottoman coffeehouses and Dutch plantations in Java."
                ),
                "fullContent": (
                    "Coffee originated in the Ethiopian highlands where legend says a goat herder noticed his goats' energy. "
                    "By the 15th century, Sufi monks in Yemen were using it for all-night prayer sessions. "
                    "Coffeehouses spread through the Ottoman Empire and became centers of intellectual exchange. "
                    "The Dutch brought coffee plants to Java, establishing the global plantation system we know today."
                ),
            },
        ],
    },
    {
        "name": "My Daughter",
        "style": "library",
        "keywords": ["family", "daughter", "milestones", "parenting"],
        "artifacts": [
            {
                "type": ArtifactType.conversation,
                "title": "First Words & Milestones",
                "summary": (
                    "Tracking her language development from 'dada' at 10 months to full sentences at 20 months "
                    "— ahead of the curve according to the pediatrician."
                ),
                "fullContent": (
                    "Her first word was 'dada' at 10 months, quickly followed by 'mama' a week later. "
                    "By 14 months she was pointing at everything and saying 'dat?' wanting to know every name. "
                    "Her first sentence at 20 months was 'I want juice' which came out as 'I wan jooss.' "
                    "The pediatrician said she was ahead of the curve for language development."
                ),
            },
            {
                "type": ArtifactType.visual,
                "title": "Third Birthday Party",
                "summary": (
                    "A butterfly-themed birthday with twelve kids, purple cake, and the moment "
                    "she saw the play kitchen she had been asking for."
                ),
                "fullContent": (
                    "The butterfly-themed party had twelve kids from daycare and both sets of grandparents. "
                    "She insisted on a purple cake with butterflies and blew out the candles on the first try. "
                    "The highlight was her face when she opened the play kitchen set she had been asking about. "
                    "She fell asleep in the car on the way home clutching her new stuffed caterpillar."
                ),
            },
            {
                "type": ArtifactType.document,
                "title": "Bedtime Stories",
                "summary": (
                    "Our nightly three-book routine featuring Goodnight Moon, The Very Hungry Caterpillar, "
                    "and Owl Babies — with a new book added every month."
                ),
                "fullContent": (
                    "Our nightly reading routine includes three books before lights out. "
                    "Current favorites are 'Goodnight Moon,' 'The Very Hungry Caterpillar,' and 'Owl Babies.' "
                    "She has memorized most of 'Brown Bear, Brown Bear' and 'reads' it to her stuffed animals. "
                    "We started a tradition of getting a new book every month from the local bookshop."
                ),
            },
        ],
    },
]


async def seed_palace(user_id: str) -> dict:
    """Populate a new palace with seed rooms and artifacts.

    Returns a summary dict with created room/artifact counts.
    """
    now = datetime.now(UTC)
    total_artifacts = sum(len(r["artifacts"]) for r in _SEED_ROOMS)
    # Spread artifacts over the past 14 days
    time_step = timedelta(days=14) / max(total_artifacts, 1)

    rooms_created = 0
    artifacts_created = 0
    artifact_index = 0
    created_room_ids: list[str] = []
    created_rooms: list[Room] = []
    created_artifacts: list[Artifact] = []

    for room_def in _SEED_ROOMS:
        room = await create_room(
            user_id=user_id,
            name=room_def["name"],
            keywords=room_def["keywords"],
            style=room_def.get("style"),
        )
        created_room_ids.append(room.id)
        created_rooms.append(room)
        rooms_created += 1

        for art_def in room_def["artifacts"]:
            # Stagger dates: oldest first, most recent last
            captured_at = now - timedelta(days=14) + (time_step * artifact_index)

            artifact = await create_artifact(
                user_id=user_id,
                room_id=room.id,
                artifact_type=art_def["type"],
                title=art_def["title"],
                summary=art_def["summary"],
                full_content=art_def["fullContent"],
                is_seed_data=True,
                captured_at=captured_at,
            )
            created_artifacts.append(artifact)
            await increment_artifact_count(user_id, room.id)
            artifacts_created += 1
            artifact_index += 1

        await recompute_room_summary(user_id, room.id)

    # ── Wire lobby doors so the front-end can render portals ────────────────────
    # Cycle through wall positions for the first 4 rooms; remaining rooms get
    # north wall with increasing door indices.
    WALL_POSITIONS = ["north", "east", "south", "west"]
    lobby_doors = []
    for i, room_id in enumerate(created_room_ids):
        wall = WALL_POSITIONS[i % len(WALL_POSITIONS)]
        door_index = i // len(WALL_POSITIONS)
        lobby_doors.append({
            "roomId": room_id,
            "wallPosition": wall,
            "doorIndex": door_index,
        })

    from app.core.firestore import get_firestore_client
    layout_ref = (
        get_firestore_client()
        .collection("users")
        .document(user_id)
        .collection("layout")
        .document("main")
    )
    await layout_ref.set({"lobbyDoors": lobby_doors}, merge=True)

    logger.info(
        "Palace seeded: userId=%s rooms=%d artifacts=%d lobbyDoors=%d",
        user_id, rooms_created, artifacts_created, len(lobby_doors),
    )
    return {
        "rooms": created_rooms,
        "artifacts": created_artifacts,
        "summary": {
            "roomsCreated": rooms_created,
            "artifactsCreated": artifacts_created,
        }
    }
