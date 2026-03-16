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

    # ── Pass 1: create all rooms and write lobby doors before any artifacts ──────
    # Lobby doors must exist in Firestore before artifact placement so that
    # _get_room_exit_wall returns the correct wall and door-gap skipping works.
    WALL_POSITIONS = ["north", "east", "south", "west"]
    lobby_doors = []
    for i, room_def in enumerate(_SEED_ROOMS):
        room = await create_room(
            user_id=user_id,
            name=room_def["name"],
            keywords=room_def["keywords"],
            style=room_def.get("style"),
        )
        created_room_ids.append(room.id)
        created_rooms.append(room)
        rooms_created += 1

        wall = WALL_POSITIONS[i % len(WALL_POSITIONS)]
        door_index = i // len(WALL_POSITIONS)
        lobby_doors.append({
            "roomId": room.id,
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

    # ── Pass 2: create artifacts now that lobby doors are in Firestore ───────────
    for room, room_def in zip(created_rooms, _SEED_ROOMS):
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


# ── Extra rooms definitions ────────────────────────────────────────────────────

_EXTRA_ROOMS: list[dict[str, Any]] = [
    {
        "name": "Lunch Food",
        "style": "gallery",
        "keywords": ["food", "lunch", "nutrition", "meals", "cooking"],
        "artifacts": [
            {
                "type": ArtifactType.lifestyle,
                "title": "My Go-To Lunch Combos",
                "summary": (
                    "A rotation of five quick lunches I actually enjoy: caprese sandwich, "
                    "grain bowl with roasted veggies, spicy tuna wrap, soup + crusty bread, "
                    "and leftover stir-fry over rice."
                ),
                "fullContent": (
                    "After years of boring desk lunches I settled on a five-meal rotation that keeps things interesting. "
                    "Monday: caprese sandwich with fresh mozzarella, tomato, basil, and a drizzle of olive oil on ciabatta. "
                    "Tuesday: grain bowl with farro, roasted sweet potato, arugula, and tahini dressing. "
                    "Wednesday: spicy tuna wrap with avocado, cucumber, and sriracha mayo. "
                    "Thursday: whatever soup is in the fridge with a thick slice of crusty sourdough. "
                    "Friday: leftover stir-fry reheated over jasmine rice — often better the second day. "
                    "The key is prepping components on Sunday so assembly takes under five minutes."
                ),
            },
            {
                "type": ArtifactType.insight,
                "title": "Protein at Lunch Boosts Afternoon Focus",
                "summary": (
                    "Switching from a carb-heavy lunch to one anchored by 30g of protein cut my afternoon "
                    "energy slump significantly — the science points to stable blood sugar and slower gastric emptying."
                ),
                "fullContent": (
                    "I started tracking my afternoon productivity against what I ate at lunch. "
                    "On days with pasta or sandwiches alone I reliably hit a 2 PM wall. "
                    "After switching to lunches with at least 30g of protein (chicken, legumes, eggs, or Greek yogurt) "
                    "the slump almost disappeared. The mechanism is twofold: protein slows gastric emptying which blunts "
                    "the post-meal glucose spike, and amino acids support neurotransmitter synthesis — dopamine and "
                    "norepinephrine both require tyrosine as a precursor. "
                    "Best high-protein lunch options I found: canned sardines on crackers (25g), cottage cheese bowl "
                    "with fruit (20g), or a three-egg frittata slice (18g)."
                ),
            },
            {
                "type": ArtifactType.habit,
                "title": "Sunday Meal Prep Routine",
                "summary": (
                    "Every Sunday I spend 45 minutes roasting a sheet pan of vegetables, cooking a big batch "
                    "of grains, and hard-boiling eggs — making weekday lunches a 3-minute assembly job."
                ),
                "fullContent": (
                    "The Sunday prep session that changed my lunch game: "
                    "1. Roast one sheet pan of whatever vegetables need using (usually bell peppers, zucchini, red onion) "
                    "at 200°C for 25 minutes with olive oil and smoked paprika. "
                    "2. Cook 300g of farro or quinoa in salted water — keeps in the fridge for 5 days. "
                    "3. Hard-boil 6 eggs and refrigerate unpeeled. "
                    "4. Wash and dry all salad greens so they are grab-ready. "
                    "Total active time: about 45 minutes. "
                    "With these components ready, any weekday lunch is just layering things in a container. "
                    "I also prep one batch of dressing — lemon-tahini is the current favourite."
                ),
            },
            {
                "type": ArtifactType.moment,
                "title": "Best Banh Mi I Ever Had",
                "summary": (
                    "A tiny hole-in-the-wall banh mi stall near Ben Thanh market in Ho Chi Minh City: "
                    "perfectly charred pork, pickled daikon, fresh jalapeño, and the crispiest baguette."
                ),
                "fullContent": (
                    "Walking through District 1 in Ho Chi Minh City we almost missed it — a woman with a small cart "
                    "and a charcoal grill, a line of locals, and the smell of caramelizing pork. "
                    "The banh mi cost the equivalent of 80 cents. "
                    "The baguette shattered when you bit it, the pork had a dark caramelized crust from the grill, "
                    "and the pickled daikon and carrots cut right through the richness. "
                    "A single slice of jalapeño and a smear of pâté and that was it — perfect. "
                    "I have been chasing that combination ever since and nothing has come close. "
                    "The lesson: the best food is rarely in restaurants."
                ),
            },
            {
                "type": ArtifactType.media,
                "title": "Street Food Around the World — Netflix",
                "summary": (
                    "David Gelb's documentary series changed how I think about lunch: every dish has decades "
                    "of craft behind it, and the street stall is often the most honest version of a cuisine."
                ),
                "fullContent": (
                    "Watched all three seasons of Street Food on Netflix over two weeks. "
                    "Each episode profiles a single vendor — their life story, technique, and the dish they've "
                    "spent sometimes 40+ years perfecting. "
                    "The Bangkok episode on Jay Fai's crab omelette was the most striking: she still cooks over "
                    "charcoal wearing ski goggles because the fire is so intense. "
                    "The series made me rethink what 'good food' means. It is almost never about expensive ingredients "
                    "— it is about repetition, attention, and pride. "
                    "Favourite episodes: Jay Fai (Bangkok), Hamid (Los Angeles), and the Jeonju episode on bibimbap."
                ),
            },
            {
                "type": ArtifactType.question,
                "title": "Is Intermittent Fasting Worth It for Lunch Skippers?",
                "summary": (
                    "Exploring whether skipping lunch and eating in a 16:8 window actually improves metabolic "
                    "health — the evidence is mixed and highly individual."
                ),
                "fullContent": (
                    "I spent a month trying 16:8 intermittent fasting, eating only between noon and 8 PM. "
                    "The first week was rough — hunger spikes at 10 AM, difficulty concentrating before noon. "
                    "By week two the hunger adapted but I noticed my workouts before noon suffered noticeably. "
                    "The research picture is nuanced: some RCTs show improved insulin sensitivity and lipid profiles, "
                    "others show no difference when total calories are controlled. "
                    "The biggest confound is that IF mainly works by reducing total caloric intake in most people. "
                    "My conclusion: useful if you are not hungry in the morning anyway, counterproductive if you "
                    "exercise in the morning or do cognitively demanding work before noon. "
                    "Ended up going back to an early lunch around 12:30."
                ),
            },
        ],
    },
    {
        "name": "My Daughter",
        "style": "sanctuary",
        "keywords": ["daughter", "family", "milestones", "parenting", "childhood"],
        "artifacts": [
            {
                "type": ArtifactType.milestone,
                "title": "First Day of Kindergarten",
                "summary": (
                    "She walked through the school gate without looking back — backpack bouncing, "
                    "ponytail swinging. I stood there longer than I needed to."
                ),
                "fullContent": (
                    "We practiced the night before: where to hang her backpack, what to do if she needed "
                    "the bathroom, how to open her lunch box. "
                    "She woke up at 6 AM without being called, dressed herself mostly correctly, and ate "
                    "her entire breakfast — unusual for her. "
                    "At the gate she turned, said 'Bye Baba, I'm going,' and walked in. "
                    "She did not look back. "
                    "I stood at the gate for probably five minutes after she disappeared around the corner. "
                    "Her teacher sent a photo at 10 AM: she was sitting cross-legged in a circle, hand raised, "
                    "the biggest smile in the room. "
                    "I showed her mum and we just looked at each other."
                ),
            },
            {
                "type": ArtifactType.dream,
                "title": "She Wants to Be a Vet",
                "summary": (
                    "At four and a half she declared she would be a veterinarian — specifically to help "
                    "'sick lions and also dogs.' She has not wavered in six months."
                ),
                "fullContent": (
                    "It started with a visit to the neighbour's cat who had just had surgery. "
                    "She asked why the cat had a cone, listened to the full explanation, then asked "
                    "'Who fixed the cat?' When we said a vet, she thought for a moment and said 'I want "
                    "to do that.' "
                    "Since then she has been treating every stuffed animal with a toy stethoscope. "
                    "Her patients include three bears, a rabbit, a dinosaur, and a plastic shark. "
                    "She insists the shark has a tummy ache. "
                    "When her grandmother asked if she might want to be a doctor instead, she said: "
                    "'Doctors are for people. Animals need me more.' "
                    "I wrote it down because I never want to forget the logic of a four-year-old."
                ),
            },
            {
                "type": ArtifactType.emotion,
                "title": "The Tight Bedtime Hug",
                "summary": (
                    "Every night she hugs me for exactly as long as she needs to, then lets go and says "
                    "'Okay.' That single word carries everything — safety, trust, readiness for tomorrow."
                ),
                "fullContent": (
                    "The bedtime routine ends the same way every night. "
                    "Books read, water fetched, one last trip to the bathroom negotiated. "
                    "Then she opens her arms and I lean down and she hugs me with her whole body — "
                    "both arms tight around my neck, her face pressed into my shoulder. "
                    "She does not say anything. "
                    "Some nights it lasts five seconds, some nights closer to a minute. "
                    "When she is ready she just releases, lies back on her pillow, and says 'Okay.' "
                    "That's the signal. Lights out. "
                    "I have started measuring my days by that hug. "
                    "If I got that, the day was good."
                ),
            },
            {
                "type": ArtifactType.habit,
                "title": "Morning Dance Party",
                "summary": (
                    "We dance in the kitchen for the first song on the morning playlist every single day — "
                    "no exceptions, not even on rushed school days. It sets everything right."
                ),
                "fullContent": (
                    "It started by accident when a good song came on the radio while I was making her breakfast. "
                    "She grabbed my hand and we danced around the kitchen table. "
                    "The next morning she asked 'Are we dancing today?' "
                    "Now it is non-negotiable. One song, every morning, before school and before work. "
                    "Current favourites in rotation: anything by Stromae, 'September' by Earth Wind & Fire, "
                    "and for reasons I cannot explain, a Turkish folk song her grandmother played once. "
                    "On the mornings we are running late and I am tempted to skip it, those are exactly "
                    "the mornings it matters most. "
                    "Two minutes of dancing fixes more than coffee does."
                ),
            },
            {
                "type": ArtifactType.goal,
                "title": "Teaching Her to Read by Summer",
                "summary": (
                    "Working through phonics together every evening — she can decode CVC words reliably now "
                    "and just read her first full sentence independently: 'The cat sat on the mat.'"
                ),
                "fullContent": (
                    "We started with letter sounds in January, five minutes every night after dinner. "
                    "She resisted at first — she wanted stories read to her, not to do the work herself. "
                    "The breakthrough was when I started letting her 'teach' her stuffed elephant the letters — "
                    "suddenly she was the expert and the elephant was the student. "
                    "By February she had all 26 letter sounds solid. "
                    "March we moved to blending: cat, dog, sit, run. "
                    "Last Tuesday she pointed at a word in her book, sounded it out slowly, and read it. "
                    "Then the next word. Then a whole sentence: 'The cat sat on the mat.' "
                    "She looked up with enormous eyes and said 'I read it, Baba.' "
                    "Yes, you did. "
                    "Target: reading simple picture books independently before her fifth birthday in July."
                ),
            },
            {
                "type": ArtifactType.conversation,
                "title": "Why Is the Sky Blue?",
                "summary": (
                    "She asked why the sky is blue during our morning walk and we ended up talking "
                    "for twenty minutes about light, rainbows, and why sunsets are orange — entirely on her terms."
                ),
                "fullContent": (
                    "We were walking to the park when she stopped, looked up, and asked: 'Why is the sky blue?' "
                    "I tried to explain Rayleigh scattering at a level that might land — sunlight is made of all "
                    "the colours, but blue bounces around more than the others when it hits the air. "
                    "She thought about it and asked: 'What about rainbows? Is that all the colours coming back?' "
                    "I told her yes, roughly, when light bends through water drops. "
                    "She asked: 'So rain is like a mirror for colours?' "
                    "I said that was a beautiful way to think about it. "
                    "Then: 'Why is the sunset orange then? Is the blue tired?' "
                    "I did not have a good child-friendly answer for the geometry of low-angle scattering in ten words "
                    "so I said: 'Sort of. At the end of the day the light has to travel through much more air "
                    "and the blue gets lost on the way.' "
                    "She nodded, satisfied. Then: 'I think the sky is showing off in the morning and going to sleep at night.' "
                    "I think she is right."
                ),
            },
        ],
    },
]


async def populate_extra_rooms(user_id: str) -> dict:
    """Create the Lunch Food and My Daughter rooms with rich artifacts.

    Safe to call on an existing palace — rooms are always added (never replaced).
    Returns a summary dict with created room/artifact counts.
    """
    now = datetime.now(UTC)
    total_artifacts = sum(len(r["artifacts"]) for r in _EXTRA_ROOMS)
    time_step = timedelta(days=14) / max(total_artifacts, 1)

    rooms_created = 0
    artifacts_created = 0
    artifact_index = 0
    created_rooms: list[Room] = []
    created_artifacts: list[Artifact] = []

    # ── Pass 1: create rooms and register lobby doors ─────────────────────────
    from app.core.firestore import get_firestore_client
    layout_ref = (
        get_firestore_client()
        .collection("users")
        .document(user_id)
        .collection("layout")
        .document("main")
    )
    layout_doc = await layout_ref.get()
    existing_doors: list[dict] = (layout_doc.to_dict() or {}).get("lobbyDoors", []) if layout_doc.exists else []

    new_doors: list[dict] = []
    WALL_POSITIONS = ["north", "east", "south", "west"]

    for room_def in _EXTRA_ROOMS:
        room = await create_room(
            user_id=user_id,
            name=room_def["name"],
            keywords=room_def["keywords"],
            style=room_def.get("style"),
        )
        created_rooms.append(room)
        rooms_created += 1

        door_idx = len(existing_doors) + len(new_doors)
        new_doors.append({
            "roomId": room.id,
            "wallPosition": WALL_POSITIONS[door_idx % len(WALL_POSITIONS)],
            "doorIndex": door_idx // len(WALL_POSITIONS),
        })

    all_doors = existing_doors + new_doors
    await layout_ref.set({"lobbyDoors": all_doors}, merge=True)

    # ── Pass 2: create artifacts ──────────────────────────────────────────────
    for room, room_def in zip(created_rooms, _EXTRA_ROOMS):
        for art_def in room_def["artifacts"]:
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

    logger.info(
        "Extra rooms populated: userId=%s rooms=%d artifacts=%d",
        user_id, rooms_created, artifacts_created,
    )
    return {
        "rooms": created_rooms,
        "artifacts": created_artifacts,
        "summary": {
            "roomsCreated": rooms_created,
            "artifactsCreated": artifacts_created,
        },
    }
