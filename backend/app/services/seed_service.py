"""Seed Service — pre-populate new palaces with sample rooms and artifacts.

Creates 6 themed rooms with ~3 artifacts each so the palace feels alive
from the first visit. Artifacts get real embeddings and staggered capturedAt
dates spread over the past 2 weeks.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from app.models.artifact import ArtifactType
from app.services.artifact_service import create_artifact
from app.services.room_service import create_room, increment_artifact_count, recompute_room_summary

logger = logging.getLogger(__name__)

# ── Seed definitions ──────────────────────────────────────────────────────────

_SEED_ROOMS: list[dict[str, Any]] = [
    {
        "name": "Natural Museum Visit",

        "keywords": ["museum", "nature", "exhibits", "paleontology"],
        "artifacts": [
            {
                "type": ArtifactType.lecture,
                "summary": "Evolution of Dinosaurs: From the Triassic to Extinction",
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
                "summary": "Ancient Fossils Display: Trilobites and Ammonites",
                "fullContent": (
                    "A stunning glass case held dozens of perfectly preserved trilobite and ammonite fossils. "
                    "The oldest specimens dated back 500 million years to the Cambrian period. "
                    "Each fossil was labeled with its geological era and the location where it was found. "
                    "The intricate spiral patterns of the ammonites were particularly striking under the museum lights."
                ),
            },
            {
                "type": ArtifactType.document,
                "summary": "Marine Life Through the Ages: Ocean Evolution Guide",
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

        "keywords": ["machine-learning", "neural-networks", "AI", "algorithms"],
        "artifacts": [
            {
                "type": ArtifactType.lecture,
                "summary": "Gradient Descent Explained: Optimizing Loss Functions",
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
                "summary": "Neural Network Architectures: CNNs, RNNs, and Transformers",
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
                "summary": "Debugging a Model: Why Validation Loss Keeps Increasing",
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

        "keywords": ["hiking", "mountains", "outdoors", "nature"],
        "artifacts": [
            {
                "type": ArtifactType.visual,
                "summary": "Summit Panorama View: 360-Degree Mountain Vista",
                "fullContent": (
                    "The view from the summit was breathtaking with snow-capped peaks stretching in every direction. "
                    "Cloud formations sat below us in the valley, creating a sea-of-clouds effect at sunrise. "
                    "We could identify at least seven distinct mountain ranges from the observation point. "
                    "The golden hour light painted everything in warm amber and deep purple shadows."
                ),
            },
            {
                "type": ArtifactType.conversation,
                "summary": "Trail Safety Tips: What We Learned from the Guide",
                "fullContent": (
                    "The trail guide shared essential safety advice for high-altitude hiking. "
                    "Always carry more water than you think you need and start descending before 2 PM. "
                    "Watch for signs of altitude sickness: headaches, nausea, and unusual fatigue. "
                    "Layer clothing for rapid weather changes and never hike alone above the treeline."
                ),
            },
            {
                "type": ArtifactType.document,
                "summary": "Alpine Flora Identification: Wildflowers Above the Treeline",
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

        "keywords": ["biology", "cells", "genetics", "botany"],
        "artifacts": [
            {
                "type": ArtifactType.lecture,
                "summary": "Photosynthesis Process: How Plants Convert Sunlight to Energy",
                "fullContent": (
                    "The lecture covered the two main stages of photosynthesis: light reactions and the Calvin cycle. "
                    "In the thylakoid membranes, chlorophyll absorbs photons to split water and generate ATP. "
                    "The Calvin cycle then uses that ATP and CO2 to build glucose in the stroma. "
                    "C4 and CAM plants were highlighted as evolutionary adaptations for hot, dry climates."
                ),
            },
            {
                "type": ArtifactType.document,
                "summary": "Cell Structure & Function: Organelles and Their Roles",
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
                "summary": "DNA Double Helix: Structure and Base Pairing",
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

        "keywords": ["coffee", "conversations", "ideas", "social"],
        "artifacts": [
            {
                "type": ArtifactType.conversation,
                "summary": "Startup Idea Brainstorm: AI-Powered Study Companion",
                "fullContent": (
                    "Over lattes, we brainstormed an app that records lectures and creates interactive study guides. "
                    "The key insight was using spatial memory to help retention, like a mental palace. "
                    "We sketched out the MVP: capture audio, extract concepts, and place them in 3D rooms. "
                    "Revenue model would be freemium with premium features for unlimited captures and AI tutoring."
                ),
            },
            {
                "type": ArtifactType.document,
                "summary": "Latte Art Techniques: From Hearts to Rosettas",
                "fullContent": (
                    "The barista explained the fundamentals of latte art starting with proper milk texturing. "
                    "Microfoam needs to be silky with tiny bubbles, achieved by keeping the steam wand just below the surface. "
                    "Hearts are the easiest pattern: pour from high, then drop low and push through. "
                    "Rosettas require a side-to-side wiggle while slowly pulling back through the design."
                ),
            },
            {
                "type": ArtifactType.lecture,
                "summary": "History of Coffee: From Ethiopia to Global Phenomenon",
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

        "keywords": ["family", "daughter", "milestones", "parenting"],
        "artifacts": [
            {
                "type": ArtifactType.conversation,
                "summary": "First Words & Milestones: Tracking Her Amazing Progress",
                "fullContent": (
                    "Her first word was 'dada' at 10 months, quickly followed by 'mama' a week later. "
                    "By 14 months she was pointing at everything and saying 'dat?' wanting to know every name. "
                    "Her first sentence at 20 months was 'I want juice' which came out as 'I wan jooss.' "
                    "The pediatrician said she was ahead of the curve for language development."
                ),
            },
            {
                "type": ArtifactType.visual,
                "summary": "Birthday Celebration: Her Third Birthday Party",
                "fullContent": (
                    "The butterfly-themed party had twelve kids from daycare and both sets of grandparents. "
                    "She insisted on a purple cake with butterflies and blew out the candles on the first try. "
                    "The highlight was her face when she opened the play kitchen set she had been asking about. "
                    "She fell asleep in the car on the way home clutching her new stuffed caterpillar."
                ),
            },
            {
                "type": ArtifactType.document,
                "summary": "Bedtime Story Collection: Our Favorite Books to Read Together",
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

    for room_def in _SEED_ROOMS:
        room = await create_room(
            user_id=user_id,
            name=room_def["name"],
            keywords=room_def["keywords"],
        )
        created_room_ids.append(room.id)
        rooms_created += 1

        for art_def in room_def["artifacts"]:
            # Stagger dates: oldest first, most recent last
            captured_at = now - timedelta(days=14) + (time_step * artifact_index)

            await create_artifact(
                user_id=user_id,
                room_id=room.id,
                artifact_type=art_def["type"],
                summary=art_def["summary"],
                full_content=art_def["fullContent"],
                is_seed_data=True,
                skip_enrichment=True,
                captured_at=captured_at,
            )
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
        "roomsCreated": rooms_created,
        "artifactsCreated": artifacts_created,
    }
