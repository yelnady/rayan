# Rayan: A 3D Memory Palace — What I Built, Why It Hurts, and How Gemini Made It Real

---

## The Problem Lives in My Body

I'm not talking about forgetting where I left my phone. I mean, yes, that too — and there's something particularly humiliating about searching for your phone while actively talking on it, a joke so universal that strangers laugh at it on Reddit in threads with thousands of upvotes. But the thing that actually got me wasn't the keys, or the reusable bags I leave in the car every single week, or the one item I drove to the grocery store specifically to buy that somehow escapes my mind the moment I walk through the sliding doors.

What got me was something quieter.

I was in a conversation with someone I respect. A mentor. We were talking about a book — *a book I had read*, underlined, and supposedly absorbed. And I had nothing. Not the argument. Not the author's name. Not even the feeling I had when I finished it. Just a vague sense that it had been meaningful, like trying to describe a dream two hours after waking.

That's when it stopped being funny.

---

## We Are All Forgetting Too Much

Spend twenty minutes on any productivity subreddit and you'll find the same confessions, written by different people, over and over:

> *"I forgot how to spell 'pants' yesterday. I stood there for thirty seconds. I'm a grown adult."*

> *"I went to the store for one thing. ONE thing. I came home with four bags and not the thing."*

> *"I took so many notes during that lecture. I never opened them again."*

The most painful ones come from people who've started to wonder if something is wrong with them. People with ADHD who explain that their forgetfulness isn't laziness — it's neurological, a working memory that simply cannot hold the thread. People in burnout who realize their memory problems are a flare going off: *you are carrying too much, something has to give*. People who've been through trauma and describe autobiographical gaps, whole stretches of their life that feel like someone edited the footage.

And then there's the rest of us, the allegedly healthy ones, who still regularly blank on a colleague's name thirty seconds after being introduced, who still pack for a trip and forget the charger, toothbrush, and that one specific thing we told ourselves three times not to forget.

The problem is not that we're stupid. The problem is that **our tools treat memory like a filing cabinet when our brains work nothing like that.**

We have more capture tools than ever. Notes apps, bookmarks, voice memos, meeting recordings. We are drowning in captured information we will never retrieve. The bottleneck was never capture. It was always retrieval — and retrieval requires context, connection, and place.

---

## Then I Found Gemini Live

I was playing with the Gemini Live 2.5 Flash Native Audio API on a weekend with no particular goal. I asked it something mid-sentence, interrupted myself, started over. It recovered. Not with a canned "I'm sorry, can you repeat that?" but naturally, the way a person does. I interrupted it back. It adapted. I changed the subject. It followed.

And I thought: *this is the first AI that could actually sit with you.*

Not answer you. Sit with you. Listen alongside you. Be present while you do something else.

That's when the whole thing clicked into place. I didn't need a better notes app. I didn't need a smarter search box. I needed something that could listen to my life — my lectures, my meetings, my half-formed thoughts while I stare at a whiteboard — and quietly build a map of what I know, organized in space, searchable by voice, always there.

That system is **Rayan**.

---

## What I Built

Rayan is a voice-first AI memory system. Two persistent Gemini Live agents run simultaneously in the background of a fully rendered Three.js 3D environment you navigate in first person.

**CaptureAgent** listens passively alongside you. Start a session during a lecture, a podcast, a meeting, a conversation. It processes your microphone and optionally your screen or camera. When it detects a concept worth keeping — confidence $\geq 0.7$ — it silently extracts it: generates a title, summary, keywords, classifies the type, creates a 768-dimensional embedding via `text-embedding-005`, and hands it to the Memory Architect for placement. A glowing artifact appears on your palace wall in real time. You don't press anything.

**RecallAgent** is your voice companion inside the palace. Walk up to any room, any artifact, speak naturally. It searches your memories using cosine similarity over stored embeddings, grounds every answer in what you've actually captured, and speaks back. It cannot hallucinate things not in your palace — the system prompt enforces citation, and the retrieval is the only source of truth.

The palace isn't a metaphor. Themed rooms, glowing hologram panels, crystal orbs for formulas, framed screenshots on the walls, speech bubbles for quotes, 3D books. Sixteen distinct artifact types. You walk through it. You look around. The spatial context — *that idea was on the north wall of my ML room, next to the orb about attention mechanisms* — gives you retrieval cues that no flat list ever will.

Smart deduplication runs on every new capture. Near-duplicates at cosine similarity $\geq 0.90$ are merged, not added. The palace stays clean.

---

## How I Built It

### The Backend: Surprisingly Smooth

The backend was honestly the easy part. Python, FastAPI, WebSockets. Gemini Live handles the persistent bidirectional audio streaming. The tool-calling architecture is clean: each agent declares a set of functions it can invoke mid-conversation — `create_memory`, `navigate_to_room`, `highlight_artifact`, `synthesize_room`, `take_screenshot` — and Gemini dispatches these asynchronously without breaking the audio stream at all. The moment an artifact is created, the server pushes a `palace_update` WebSocket event to the frontend. No polling. No page refresh. The 3D scene mutates in place, live.

The WebSocket protocol is fully typed on both ends. The `RayanWebSocket` client handles an auth handshake on connect, a 30-second heartbeat ping, and auto-reconnect with exponential backoff — starting at 1 second, capping at 30. Every server message belongs to a discriminated union of typed events: `palace_update`, `live_tool_call`, `capture_tool_event`, `live_interrupted`, `capture_screenshot_request`. Each one maps to a specific handler in the frontend with no ambiguity.

Google Search grounding is native to the Gemini agents — no third-party API, no wrapper. When Recall is asked about something not yet in the palace, it queries the live web mid-session and cites what it finds.

The creative synthesis feature uses `gemini-2.5-flash-image` to generate styled visual mind maps of an entire room's memories — warm parchment for a Library, holographic panels for a Lab. Not a diagram. Something closer to art.

### The Frontend: Where All the Hard Work Lives

The frontend is a React + TypeScript app built around React Three Fiber and Three.js. The 3D canvas is the entire interface — there is no separate UI layer sitting on top of a viewport. Everything you interact with is inside the scene.

**First-person controls, built from scratch.** I didn't use any existing FPS library. `FirstPersonControls.tsx` is fully custom — WASD + arrow keys, right-click drag to look, scroll wheel to push forward, a mobile on-screen joystick, and single-finger touch rotation with separately tuned sensitivity. The camera sits at exactly `1.7` units height — eye level — and moves with velocity-damped physics. A damping factor of `7.0` gives that weighty, organic feel instead of stopping instantly. Dynamic FOV widens under speed, lerped against a target that adds up to `10` degrees at max velocity, so running feels fast without being disorienting. Head bob is a `sin(timer × speed × 2.5)` oscillation on camera Y that kicks in only above 0.5 velocity — subtle enough to feel real, not enough to nauseate. Wall collision is hard-clamped against each room's bounding box so you can never walk through a wall.

**The cinematic intro.** The first thing you see is not a fade-in — the camera starts at `(6, 8, 35)`, elevated and behind the south wall, looking slightly downward into the space. Then it glides forward over 5.2 seconds using ease-in-out quadratic interpolation:

$$t_{\text{eased}} = \begin{cases} 2t^2 & t < 0.5 \\ 1 - \dfrac{(-2t+2)^2}{2} & t \geq 0.5 \end{cases}$$

But there's a subtlety: the animation waits 15 frames before starting. Those 15 frames are for shader compilation and texture uploads — without that pause, the first frames of the fly-in stutter as WebGL compiles the toon materials. That one detail took an embarrassingly long time to understand.

**Rooms as living environments.** Each room has one of ten visual themes — `library`, `lab`, `gallery`, `garden`, `workshop`, `museum`, `observatory`, `sanctuary`, `studio`, `dojo` — each defined as explicit per-wall color palettes, ambient light color and intensity, and floor plank colors. Walls use `MeshToonMaterial` with a hand-crafted 4-step toon gradient texture (`[40, 100, 180, 240]`) that gives the space a painted, illustrated quality rather than a physically accurate render. The floor is alternating plank geometry, each plank a separate `PlaneGeometry` with its own toon material, giving a genuine parquet feel. Every room also has floating ambient particles — `THREE.Points` rendered with additive blending and a canvas-generated radial gradient soft-dot texture — drifting upward and respawning at the floor in a slow, infinite loop. In bird's-eye overview mode, each room island shows glassmorphism HTML labels floating in 3D space: room name badge, memory count, and a date range from the first to the last captured memory.

**Artifacts as real 3D objects.** Each artifact type maps to a GLB model — `Brain.glb`, `Dream.glb`, `Headphones.glb`, `Hamburger.glb`, `Warning.glb`, 24 models in total — or to a procedural mesh for special types like `CrystalOrb` and `SpeechBubble`. Every GLB has a hand-tuned scale constant derived from bounding-box analysis of the file (scales range from `0.001` for some organic models to `5` for the question mark) and a rotation correction to align its forward axis with `+Z` so it always faces into the room from whatever wall it's mounted on. The `wallRotation()` function checks the artifact's explicit `wall` attribute first, then falls back to spatial inference from raw x/z coordinates. Hover detection uses an invisible `SphereGeometry` hitbox with `depthWrite: false` — the visible model and the clickable surface are deliberately separate objects. Date/time plaques with glassmorphism styling float below each artifact, visible only when you are inside that artifact's room and not hovering.

**The Zustand state machine that ties everything together.** A single `palaceStore` holds the live state: rooms array, a `roomId → artifacts[]` map, current room, highlighted artifact IDs, and agent-selected artifact ID. When a `palace_update` WebSocket event arrives, `addArtifact()` or `addRoom()` fires and React Three Fiber re-renders only the changed parts of the scene. When the RecallAgent calls `navigate_to_room`, the frontend receives a `live_tool_call` message, fires a `flyTo` on the camera store, and the camera glides cinematically to a position near the room entrance facing inward. When `highlight_artifact` fires, `highlightedArtifactIds` updates in the store and those objects pulse with a glow shell rendered with additive blending.

---

## The Real Challenges

The backend wasn't the hard part. Let me be honest about where I actually struggled.

**The 3D was brutal.** Three.js and React Three Fiber are powerful but unforgiving. Getting the first-person controls to feel right — the cinematic intro fly-in, the smooth navigation between rooms, the touch support, the way the camera settles — took far longer than I expected. Positioning artifacts on walls without them clipping through geometry, getting the lighting to make the rooms feel atmospheric rather than flat, handling the transitions when a new artifact appears mid-session. Small things that seem trivial until you're debugging them at 2am and the hologram panel is floating six feet in front of the wrong wall.

Making the rooms actually *look nice* — not just functional, but beautiful enough that you'd want to spend time in them — was genuinely hard. A memory palace that feels cold and utilitarian defeats the whole point. The spatial emotion matters. I spent more time on room aesthetics than on almost anything else.

**Finding the right moment to capture.** Not every sentence in a lecture is a memory worth keeping. Not every thought is a concept. Getting the CaptureAgent calibrated to extract *what matters* — frequently enough to be useful, infrequently enough not to flood the palace with noise — required a lot of tuning. Confidence thresholds, deduplication windows, how long to wait before synthesizing multiple mentions of the same idea into one artifact. This is where the real intelligence lives, and it's subtle.

**Building something useful, not just technically impressive.** There's a trap in hackathons where you assemble an impressive-looking stack and call it a product. I kept asking myself: would I actually use this? Would it help someone with ADHD who loses their train of thought mid-sentence? Would it help someone in burnout who can't retain what they read? Would it help the person who blanks on a word they've known their whole life? That question forced harder choices than any technical problem. It meant cutting features that were cool but didn't serve retrieval. It meant designing the voice interaction for someone who's exhausted, not someone who wants to demo AI.

---

## What I Learned

Gemini Live isn't just a fast model. The affective dialogue support — `enable_affective_dialog=True` — changes the emotional register of the whole interaction. The agent doesn't just understand what you say. It picks up on how you're saying it. When you're excited, it matches the energy. When you're tired, it softens. That's not a small thing when you're building a companion you'll use for hours.

I learned that spatial memory is real and underused. The method of loci has been documented for centuries for a reason. When I tested the palace with actual users, the most common reaction wasn't "wow, it looks cool" — it was "I actually remember where things are." People started navigating by feel. *The transformer stuff is in the ML room, second wall on the right.* The 3D isn't decoration. It's the retrieval mechanism.

And I learned that the problem I was trying to solve — the helplessness of forgetting, the low-grade shame of not being able to retrieve your own mind — is more universal and more painful than I expected. When I explained Rayan to people, they didn't nod politely. They leaned in. They said *I need this*. Some of them said it quietly, like they were admitting something.

---

## Accomplishments That We're Proud Of

Some of these I'm proud of because they were technically hard. Some because they were emotionally hard. Some because they work in a way I didn't fully expect when I started.

**We built a real-time 3D world that updates itself while you just live your life.** The moment the CaptureAgent extracts a concept, it appears on a palace wall — rendered as the right 3D object, in the right room, on the right wall, facing into the space — without you touching anything. That whole pipeline: Gemini Live → tool call → embedding → room classification → WebSocket push → Zustand state update → React Three Fiber re-render, all in a few seconds, reliably, mid-conversation. Getting that to work end-to-end without a single step breaking the audio session felt like a genuine engineering win.

**The first-person controls feel like a real place.** This sounds like a small thing. It isn't. Every FPS controller I've ever used in a browser felt like a toy — frictionless, sterile, disconnected from your body. The combination of velocity damping, head bob, dynamic FOV widening at speed, cinematic fly-to for agent navigation, and the 5-second intro fly-in that waits for shaders to finish before animating — together they make the palace feel inhabited. When someone walks into their ML room for the first time and looks around at the things they've captured over the past week, there's a moment of genuine recognition. *I know this place.* That reaction is what I was aiming for. Getting there required more care than any single feature.

**Zero hallucination recall, grounded entirely in your own memories.** The RecallAgent cannot fabricate. Every answer it gives is either directly retrieved from a stored artifact via 768-dimensional cosine similarity search, or explicitly flagged as coming from a live web search. The system prompt makes this non-negotiable: if the answer isn't in the palace and not findable on the web, the agent says so. In a world where AI assistants confidently invent sources and dates and quotes, building something that is constitutionally grounded in *your actual knowledge* felt important. It also required resisting a lot of pressure to make the demo sound smarter than the data actually supports.

**Two simultaneous persistent Gemini Live sessions, coordinated without conflict.** CaptureAgent and RecallAgent run at the same time. They share the same palace. A capture can happen in the middle of a Recall session — the WebSocket pushes the new artifact, the scene updates, and the RecallAgent can reference it in the same conversation, immediately. Keeping both sessions alive, ensuring their tool calls route to the right handlers, preventing race conditions in the palace state — the coordination layer was subtle and I'm proud it works as cleanly as it does.

**The synthesis images.** Asking Rayan to synthesize a room and watching `gemini-2.5-flash-image` generate a styled mind map that genuinely reflects the visual identity of that room's theme — the warm parchment of a Library, the cool holographic grid of a Lab — and seeing it appear as a framed artifact on the 3D wall, in real time, rendered inside the palace you're standing in: that feature surprised me every time during testing. It's the most overtly beautiful thing in the system and the one that consistently made people go quiet for a second.

**The capture calibration actually works.** Confidence $\geq 0.7$, deduplication at cosine similarity $\geq 0.90$, intelligent session-aware merging of near-identical concepts — this combination means the palace fills with things that are genuinely worth keeping and not with noise. Running the CaptureAgent through a 45-minute lecture and ending up with 8–12 clean, distinct artifacts that actually represent the structure of what was taught: that's the system working as intended. It required a lot of prompt tuning and threshold experimentation to get there, and it's still the part I'd most want to improve further.

**It runs in a browser.** No app install. No desktop client. A full first-person 3D memory palace with two live AI voice agents, real-time WebSocket updates, and 24 loaded GLB models — in a browser tab. That constraint forced every performance decision to be deliberate: instanced rendering for books and orbs, `useGLTF.preload()` for all models, the 15-frame shader settle delay before the intro animation, `memo` with custom equality on every artifact component. The fact that it loads and runs smoothly on a normal laptop, on the web, without plugins, still feels like something.

---

## What's Next for Rayan

The palace works. But it's the beginning, not the end.

**Collaborative palaces.** Right now your palace is yours alone. The obvious next step is shared rooms — a study group building a palace together during a lecture, a team capturing decisions and context from a meeting that everyone can walk through afterward. The architecture already supports multiple users per palace; the missing piece is the permissions model and the real-time merge layer.

**Palace-to-palace connections.** You capture something in your Machine Learning room that directly relates to a memory a colleague has in their Statistics room. Right now those live in two separate systems. A cross-palace connection graph — opt-in, semantic similarity driven — would let you walk through a door in your palace and step into someone else's, into the specific room where that related idea lives.

**Wearable capture.** The CaptureAgent works beautifully with a laptop microphone and screen share. But real life doesn't happen at a desk. The next frontier is integration with smart glasses and earbuds — devices that let the agent listen passively throughout your day without requiring you to start a session. You put them on in the morning and take them off at night. The palace builds itself.

**Temporal navigation.** Every artifact has a `capturedAt` timestamp. A timeline scrubber that lets you rewind your palace to how it looked three months ago — watching rooms grow, seeing which ideas you kept returning to, identifying the moments when your thinking shifted — would turn the palace from a retrieval tool into something more like a map of how you think over time.

**Spaced repetition built into the walk.** The method of loci was always meant to be practiced, not just visited once. The RecallAgent already knows what's in each room. The next step is having it schedule gentle revisits — walking you through artifacts you haven't engaged with in a while, quizzing you on them conversationally, and adjusting based on whether you remember. Not as a flashcard drill. As a natural voice conversation while you're doing something else.

**Better rooms.** The ten themes work but I want twenty, thirty, fifty. I want the Observatory to feel genuinely cosmic, the Garden to feel alive. Each room should feel like a place you'd want to sit and think, not just a container for objects. That's partly a 3D art problem, partly a shader problem, and partly just time — but it matters, because the spatial emotion is the whole point.

---

## Why This Matters to Me Personally

I built Rayan because I am tired of being a person who takes in a lot and retains too little. I am tired of arriving at conversations empty-handed about things I cared about. I am tired of the particular indignity of forgetting the name of someone who matters to me thirty seconds after they told me.

I'm not claiming this is a cure for ADHD or trauma or burnout. It isn't. But for the person who has too much coming in and no good way to hold it — the student in six lectures a week, the professional in back-to-back meetings, the curious person who reads voraciously and remembers almost none of it — Rayan is a second brain that doesn't require you to stop what you're doing to use it.

You just live. It listens. The palace builds itself.

And when you need to remember something — really need it, not just search for a keyword — you walk into a room, look at the wall where that memory lives, and you ask.
