# Implementation Plan: Rayan - Living Memory Palace Agent

**Branch**: `001-rayan-memory-palace` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-rayan-memory-palace/spec.md`

## Summary

Rayan is an AI agent that builds and maintains a personalized 3D memory palace from real-life experiences. Users stream webcam/microphone input, and the system extracts knowledge in real-time using Gemini Live API, stores it in a semantic knowledge graph, and renders it as an interactive 3D environment using Three.js. Users can walk through topic-based rooms and have natural voice conversations with their memories.

**Competition Target**: Gemini Live Agent Challenge ($80,000 prize pool)
- Live Agent: Real-time voice/vision capture with interruption support
- Creative Storyteller: Interleaved voice narration + generated diagrams
- UI Navigator: Autonomous web enrichment agent

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Python 3.11 (backend)
**Primary Dependencies**:
- Frontend: React 18, Three.js, @react-three/fiber, @react-three/drei, GSAP
- Backend: FastAPI, Google GenAI SDK, ADK (Agent Development Kit)
- AI: Gemini Live API, Gemini 2.0 Flash (interleaved output)

**Storage**:
- Firestore (knowledge graph, palace layout, user sessions)
- Cloud Storage (media artifacts - video clips, images)
- Vertex AI Vector Search (semantic embeddings for memory retrieval)

**Testing**: Vitest (frontend), pytest (backend)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge 2022+) with WebGL 2.0
**Project Type**: Web application (React frontend + FastAPI backend + AI agents)

**Performance Goals**:
- 3D palace: 30+ FPS on 2020+ consumer hardware
- Voice response latency: <3 seconds
- Memory capture: <3 second concept extraction
- Real-time interruption: <2 second response pivot

**Constraints**:
- Must use Gemini models exclusively (hackathon requirement)
- Must use Google GenAI SDK or ADK (hackathon requirement)
- Must be hosted on Google Cloud (hackathon requirement)
- 4-minute demo video limit

**Scale/Scope**:
- Single user focus for hackathon demo
- ~10-20 rooms for demo scenario
- ~50-100 artifacts across all rooms

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Code Quality First** | ✅ PASS | TypeScript for type safety, clear module boundaries (frontend/backend/agents), injectable dependencies |
| **II. UX Consistency** | ✅ PASS | Consistent 3D navigation patterns, voice feedback on all actions, 5 themed room styles, accessible error messages |
| **III. Performance Requirements** | ✅ PASS | 30+ FPS target defined, 3s response latency budget, procedural geometry for efficiency |
| **IV. Test-Driven QA** | ✅ PASS | Vitest + pytest for unit tests, E2E tests for critical paths, performance benchmarks |
| **V. Simplicity & Pragmatism** | ✅ PASS | Procedural rooms (no 3D modeling), 5 room styles only, incremental delivery by user story |

**Quality Gates Compliance**:
- Code Review: Single developer (hackathon), self-review with linting
- Static Analysis: ESLint + Pyright enabled
- Test Suite: Critical path coverage
- Performance: FPS monitoring, latency logging
- Accessibility: Voice-first interaction, keyboard navigation for 3D
- Documentation: README with spin-up instructions (hackathon requirement)

## Project Structure

### Documentation (this feature)

```text
specs/001-rayan-memory-palace/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Local development guide
├── contracts/           # Phase 1: API contracts
│   ├── websocket.md     # WebSocket message schemas
│   ├── rest-api.md      # REST endpoint contracts
│   └── firestore.md     # Firestore document schemas
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── agents/
│   │   ├── capture_agent.py      # Gemini Live API - real-time vision/audio
│   │   ├── memory_architect.py   # Knowledge extraction → graph → 3D scene mapping
│   │   ├── recall_agent.py       # Vector search + interleaved output
│   │   ├── enrichment_agent.py   # Web research (UI Navigator)
│   │   └── narrator_agent.py     # Voice synthesis + diagram generation
│   ├── api/
│   │   ├── routes.py             # REST endpoints
│   │   └── websocket.py          # WebSocket handlers
│   ├── models/
│   │   ├── palace.py             # Palace, Room, Artifact models
│   │   └── user.py               # User model
│   └── services/
│       ├── firestore.py          # Firestore operations
│       ├── storage.py            # Cloud Storage operations
│       └── vector_search.py      # Vertex AI Vector Search
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── requirements.txt
└── main.py

frontend/
├── src/
│   ├── components/
│   │   ├── Palace/
│   │   │   ├── Lobby.tsx
│   │   │   ├── Room.tsx
│   │   │   ├── Artifact.tsx
│   │   │   ├── Door.tsx
│   │   │   └── Corridor.tsx
│   │   ├── Capture/
│   │   │   ├── CaptureMode.tsx
│   │   │   └── MediaStream.tsx
│   │   └── UI/
│   │       ├── VoiceIndicator.tsx
│   │       ├── Minimap.tsx
│   │       └── LoadingStates.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useVoice.ts
│   │   └── usePalace.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── stores/
│   │   └── palaceStore.ts
│   └── three/
│       ├── roomGenerator.ts      # Procedural room creation
│       ├── artifactFactory.ts    # Artifact visual types
│       ├── navigation.ts         # First-person controls
│       └── themes.ts             # Room style definitions
├── tests/
├── public/
│   └── textures/                 # Floor, wall, ceiling textures
├── package.json
├── vite.config.ts
└── index.html

infrastructure/
├── terraform/
│   ├── main.tf
│   ├── cloud_run.tf
│   ├── firestore.tf
│   └── storage.tf
└── cloudbuild.yaml
```

**Structure Decision**: Web application structure with clear frontend/backend separation. Frontend handles 3D rendering and user interaction. Backend handles AI agent orchestration and data persistence. Infrastructure-as-code for bonus points.

## Complexity Tracking

| Potential Complexity | Decision | Rationale |
|---------------------|----------|-----------|
| Custom 3D models | REJECTED | Procedural geometry with primitives is sufficient and faster to develop |
| Multiple room layouts | SIMPLIFIED | 5 themed styles only (library, lab, gallery, garden, workshop) |
| Complex state management | SIMPLIFIED | Zustand for minimal boilerplate, Firestore as source of truth |
| Custom voice synthesis | SIMPLIFIED | Use Gemini's native voice output capabilities |
| Offline support | DEFERRED | Not required for hackathon demo, adds significant complexity |

## Agent Architecture

```text
Browser (React + Three.js + WebRTC)
    ↕ WebSocket (real-time bidirectional)
Cloud Run (FastAPI)
    ↕
ADK Agent Orchestrator
    ├── Capture Agent (Gemini Live API - real-time vision/audio)
    │   └── Extracts concepts, entities, relationships
    ├── Memory Architect Agent
    │   └── Knowledge graph → room assignment → 3D position calculation
    ├── Recall Agent (Vertex AI Vector Search + Gemini)
    │   └── Semantic retrieval + interleaved voice/visual output
    ├── Enrichment Agent (Gemini multimodal)
    │   └── Autonomous web research for memory enhancement
    └── Narrator Agent
        └── Voice synthesis + diagram generation on artifact click
    ↕
Firestore (knowledge graph + session state)
Cloud Storage (media artifacts)
Vertex AI (embeddings + vector search)
```

## Room Generation Strategy

Rooms are procedurally generated from semantic clustering:

1. **First Visit**: User starts in Lobby (grand hall with ambient lighting, no doors)
2. **Memory Capture**: Each new topic creates a room; related topics cluster nearby
3. **Room Styles** (topic-based selection):
   - Library (warm amber) - humanities, reading
   - Lab (cool blue) - technical, science
   - Gallery (soft white) - visual arts, images
   - Garden (green tones) - nature, wellness
   - Workshop (industrial) - practical skills, DIY

4. **Artifact Types**:
   | Memory Type | 3D Visual | Interaction |
   |-------------|-----------|-------------|
   | Lecture/talk | Floating hologram frame | Click → narration + diagrams |
   | Document/paper | Glowing book on pedestal | Click → explanation + visuals |
   | Visual scene | Framed image on wall | Click → discussion |
   | Conversation | Ethereal speech bubbles | Click → replay points |
   | Web enrichment | Crystal orb with particles | Click → findings presentation |

## Demo Script (4 minutes)

**Minute 1**: Capture Mode
- User at desk with textbooks, whiteboard visible
- Starts capture, narrates concepts
- Rayan acknowledges extractions in real-time with voice

**Minute 2**: Palace Navigation
- Enter palace, walk into "Study Session" room
- Click floating book artifact
- Rayan narrates summary + generated diagram appears

**Minute 3**: Voice Conversation + Connections
- Ask: "Connect this to transformer attention"
- Rayan links rooms with glowing corridor
- Generates comparison diagram with interleaved voice

**Minute 4**: Enrichment + Architecture
- Show enrichment agent finding arxiv paper
- Display architecture diagram
- Show Cloud Run console (deployment proof)
- Pitch the vision
