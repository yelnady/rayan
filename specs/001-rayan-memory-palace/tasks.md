# Tasks: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**Input**: Design documents from `/specs/001-rayan-memory-palace/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓ (websocket.md, rest-api.md, firestore.md, agent-prompts.md)

**Organization**: Tasks grouped by user story (P1-P5) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1=P1 Capture, US2=P2 Navigation, US3=P3 Voice, US4=P4 Enrichment, US5=P5 Account)

## Path Conventions

- **Backend**: `backend/` (Python FastAPI)
- **Frontend**: `frontend/` (React/TypeScript/Three.js)
- **Infrastructure**: `infrastructure/` (Terraform)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and base configuration

- [x] T001 Create project directory structure per plan.md (backend/, frontend/, infrastructure/)
- [x] T002 [P] Initialize backend Python project with pyproject.toml and requirements.txt
- [x] T003 [P] Initialize frontend React/Vite project with package.json
- [x] T004 [P] Create backend/.env.example with all required environment variables
- [x] T005 [P] Create frontend/.env.example with Firebase and API configuration
- [x] T006 [P] Configure backend linting (ruff) and formatting in pyproject.toml
- [x] T007 [P] Configure frontend linting (ESLint) and formatting (Prettier) in package.json
- [x] T008 [P] Create backend/Dockerfile for Cloud Run deployment
- [x] T009 [P] Create infrastructure/main.tf with Cloud Run, Firestore, Storage modules

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [x] T010 Create backend/app/main.py with FastAPI app, CORS, and health endpoint
- [x] T011 Create backend/app/config.py with Settings class using pydantic-settings
- [x] T012 [P] Create backend/app/core/firebase.py with Firebase Admin SDK initialization
- [x] T013 [P] Create backend/app/core/firestore.py with Firestore client singleton
- [x] T014 [P] Create backend/app/core/storage.py with Cloud Storage client
- [x] T015 [P] Create backend/app/core/gemini.py with GenAI client initialization
- [x] T016 Create backend/app/middleware/auth.py with Firebase token verification dependency
- [x] T017 Create backend/app/models/user.py with User Pydantic model per data-model.md
- [x] T018 [P] Create backend/app/models/palace.py with Palace and Layout models
- [x] T019 [P] Create backend/app/models/room.py with Room model and RoomStyle enum
- [x] T020 [P] Create backend/app/models/artifact.py with Artifact model and ArtifactType enum
- [x] T021 Create backend/app/services/user_service.py with user CRUD operations
- [x] T022 Create backend/app/routers/health.py with /health endpoint

### Frontend Foundation

- [x] T023 Create frontend/src/config/firebase.ts with Firebase initialization
- [x] T024 Create frontend/src/config/api.ts with API and WebSocket base URLs
- [x] T025 [P] Create frontend/src/stores/authStore.ts with Zustand auth state
- [x] T026 [P] Create frontend/src/stores/palaceStore.ts with palace state management
- [x] T027 Create frontend/src/services/api.ts with authenticated fetch wrapper
- [x] T028 Create frontend/src/hooks/useAuth.ts with Firebase auth hook
- [x] T029 Create frontend/src/components/auth/GoogleSignIn.tsx component
- [x] T030 Create frontend/src/App.tsx with router and auth provider setup
- [x] T031 [P] Create frontend/src/types/palace.ts with TypeScript interfaces per data-model.md
- [x] T032 [P] Create frontend/src/types/api.ts with API request/response types per rest-api.md

### WebSocket Infrastructure

- [x] T033 Create backend/app/websocket/manager.py with WebSocket connection manager
- [x] T034 Create backend/app/websocket/handlers.py with message type router
- [x] T035 Create backend/app/websocket/auth.py with WebSocket authentication handler
- [x] T036 Add WebSocket endpoint to backend/app/main.py at /ws/{userId}
- [x] T037 Create frontend/src/services/websocket.ts with WebSocket client class per websocket.md

**Checkpoint**: Foundation ready - All services initialized, auth working, WebSocket connected

---

## Phase 3: User Story 1 - Real-Time Memory Capture (Priority: P1) 🎯 MVP

**Goal**: Capture real-time audio/video via webcam, extract concepts using Gemini Live API, store as artifacts

**Independent Test**: Start capture session → speak/show content → see extracted concepts acknowledged → session completes with artifacts created

### Backend Implementation for US1

- [x] T038 [US1] Create backend/app/models/capture_session.py with CaptureSession model
- [x] T039 [US1] Create backend/app/services/capture_service.py with session management
- [x] T040 [US1] Create backend/app/agents/capture_agent.py with Gemini Live API integration
- [x] T041 [US1] Implement capture_start handler in backend/app/websocket/handlers.py
- [x] T042 [US1] Implement media_chunk handler with base64 decoding and streaming to Gemini
- [x] T043 [US1] Implement capture_end handler with session finalization
- [x] T044 [US1] Create backend/app/agents/memory_architect.py for artifact categorization
- [x] T045 [US1] Create backend/app/services/embedding_service.py with Gemini text-embedding-004
- [x] T046 [US1] Create backend/app/services/artifact_service.py with artifact CRUD and embedding storage
- [x] T047 [US1] Create backend/app/services/room_service.py with room creation and topic matching
- [x] T048 [US1] Add capture_ack and capture_complete WebSocket responses per websocket.md
- [x] T049 [US1] Add palace_update WebSocket broadcast for new rooms/artifacts

### Frontend Implementation for US1

- [x] T050 [P] [US1] Create frontend/src/stores/captureStore.ts with capture session state
- [x] T051 [US1] Create frontend/src/services/mediaCapture.ts with MediaRecorder setup (webcam/screen)
- [x] T052 [US1] Create frontend/src/hooks/useCapture.ts with capture session lifecycle
- [x] T053 [US1] Create frontend/src/components/capture/CaptureButton.tsx with start/stop toggle
- [x] T054 [US1] Create frontend/src/components/capture/CaptureOverlay.tsx with status display
- [x] T055 [US1] Create frontend/src/components/capture/ConceptToast.tsx for capture_ack notifications
- [x] T056 [US1] Implement media chunk streaming to WebSocket in frontend/src/services/websocket.ts
- [x] T057 [US1] Create frontend/src/components/capture/CaptureComplete.tsx summary modal
- [x] T057b [US1] Create frontend/src/components/capture/RoomSuggestionModal.tsx with accept/reject/edit flow per agent-prompts.md room confirmation flow
- [x] T057c [US1] Handle room_suggestion WebSocket message in frontend/src/stores/captureStore.ts (show modal, resolve with user choice)

### REST Endpoints for US1

- [x] T058 [US1] Create backend/app/routers/sessions.py with GET /sessions and GET /sessions/{sessionId}
- [x] T059 [US1] Register sessions router in backend/app/main.py

**Checkpoint**: Capture flow complete - Can capture webcam, extract concepts, create artifacts in Firestore; room suggestion modal appears when similarity < 0.75

---

## Phase 4: User Story 2 - 3D Palace Navigation (Priority: P2)

**Goal**: Render immersive 3D memory palace with themed rooms, first-person navigation, and artifact visualization

**Independent Test**: Load palace → see lobby with doors → navigate into room → see floating artifacts → walk between rooms

### Backend Implementation for US2

- [x] T060 [US2] Create backend/app/routers/palace.py with GET /palace, POST /palace, PATCH /palace/layout
- [x] T061 [US2] Create backend/app/routers/rooms.py with GET /rooms/{roomId}, POST /rooms/{roomId}/access
- [x] T062 [US2] Register palace and rooms routers in backend/app/main.py

### Frontend 3D Implementation for US2

- [x] T063 [P] [US2] Install Three.js dependencies: three, @react-three/fiber, @react-three/drei, gsap
- [x] T064 [P] [US2] Create frontend/src/config/themes.ts with 5 room themes per research.md
- [x] T065 [P] [US2] Create frontend/src/types/three.ts with 3D position/dimension types
- [x] T066 [US2] Create frontend/src/components/palace/PalaceCanvas.tsx with Canvas and scene setup
- [x] T067 [US2] Create frontend/src/components/palace/Lobby.tsx with central hub rendering
- [x] T068 [US2] Create frontend/src/components/palace/Room.tsx with procedural geometry generation
- [x] T069 [US2] Create frontend/src/components/palace/WallsWithDoors.tsx with door cutouts
- [x] T070 [US2] Create frontend/src/components/palace/Door.tsx with animated door component
- [x] T071 [US2] Create frontend/src/components/palace/Corridor.tsx for room-to-room connections
- [x] T072 [US2] Create frontend/src/components/navigation/FirstPersonControls.tsx with PointerLockControls
- [x] T073 [US2] Create frontend/src/hooks/useNavigation.ts for movement and collision detection
- [x] T074 [US2] Create frontend/src/components/palace/Lighting.tsx with theme-aware lighting

### Artifact Visualization for US2

- [x] T075 [P] [US2] Create frontend/src/components/artifacts/FloatingBook.tsx visual
- [x] T076 [P] [US2] Create frontend/src/components/artifacts/HologramFrame.tsx visual
- [x] T077 [P] [US2] Create frontend/src/components/artifacts/FramedImage.tsx visual
- [x] T078 [P] [US2] Create frontend/src/components/artifacts/SpeechBubble.tsx visual
- [x] T079 [P] [US2] Create frontend/src/components/artifacts/CrystalOrb.tsx visual
- [x] T080 [US2] Create frontend/src/components/artifacts/Artifact.tsx with visual type switch
- [x] T081 [US2] Create frontend/src/hooks/useArtifactInteraction.ts with click/hover handlers
- [x] T082 [US2] Create frontend/src/components/artifacts/ArtifactTooltip.tsx for hover preview
- [x] T083 [US2] Add GSAP animations for artifact floating/pulsing in artifact components

### Palace Data Loading for US2

- [x] T084 [US2] Create frontend/src/services/palaceApi.ts with palace REST endpoints
- [x] T085 [US2] Create frontend/src/hooks/usePalace.ts for loading palace state
- [x] T086 [US2] Create frontend/src/hooks/useRoom.ts for loading room with artifacts
- [x] T087 [US2] Create frontend/src/pages/PalacePage.tsx main 3D view page
- [x] T088 [US2] Handle palace_update WebSocket messages to add rooms/artifacts in real-time

**Checkpoint**: 3D navigation complete - Can explore palace, enter rooms, see artifacts

---

## Phase 5: User Story 3 - Voice Conversation with Memories (Priority: P3)

**Goal**: Ask questions about memories using voice, receive interleaved audio responses with generated diagrams

**Independent Test**: Click artifact → hear narration → ask follow-up question → receive voice answer with visual aids

### Backend Implementation for US3

- [x] T089 [US3] Create backend/app/agents/recall_agent.py with memory Q&A using Gemini
- [x] T090 [US3] Create backend/app/agents/narrator_agent.py for artifact narration
- [x] T091 [US3] Create backend/app/services/search_service.py with semantic vector search
- [x] T092 [US3] Implement voice_query WebSocket handler in backend/app/websocket/handlers.py
- [x] T093 [US3] Implement text_query WebSocket handler as fallback
- [x] T094 [US3] Implement artifact_click WebSocket handler for recall
- [x] T095 [US3] Implement interrupt WebSocket handler for barge-in
- [x] T096 [US3] Add response_chunk streaming with interleaved audio/image per websocket.md
- [x] T097 [US3] Add artifact_recall WebSocket response with narration and diagrams
- [x] T098 [US3] Create backend/app/services/diagram_service.py for Gemini image generation
- [x] T099 [US3] Create backend/app/routers/search.py with POST /search endpoint
- [x] T100 [US3] Register search router in backend/app/main.py

### Frontend Voice Implementation for US3

- [x] T101 [P] [US3] Create frontend/src/stores/voiceStore.ts with conversation state
- [x] T102 [US3] Create frontend/src/services/audioCapture.ts with microphone MediaRecorder
- [x] T103 [US3] Create frontend/src/services/audioPlayback.ts for streaming audio chunks
- [x] T104 [US3] Create frontend/src/hooks/useVoice.ts for voice query lifecycle
- [x] T105 [US3] Create frontend/src/components/voice/VoiceButton.tsx with push-to-talk
- [x] T106 [US3] Create frontend/src/components/voice/VoiceIndicator.tsx for recording state
- [x] T107 [US3] Create frontend/src/components/voice/ResponsePanel.tsx for text transcript
- [x] T108 [US3] Create frontend/src/components/voice/GeneratedDiagram.tsx for inline images
- [x] T109 [US3] Handle response_chunk WebSocket messages with audio/image routing
- [x] T110 [US3] Implement interrupt on voice activity detection in frontend/src/hooks/useVoice.ts

### Artifact Detail View for US3

- [x] T111 [US3] Create backend/app/routers/artifacts.py with GET /artifacts/{artifactId}, DELETE
- [x] T112 [US3] Register artifacts router in backend/app/main.py
- [x] T113 [US3] Create frontend/src/components/artifacts/ArtifactDetailModal.tsx full content view
- [x] T114 [US3] Create frontend/src/components/artifacts/RelatedArtifacts.tsx for connections
- [x] T115 [US3] Add click handler to Artifact.tsx to trigger artifact_click WebSocket message

**Checkpoint**: Voice conversation complete - Can ask questions, hear answers, see diagrams

---

## Phase 6: User Story 4 - Web Enrichment Agent (Priority: P4)

**Goal**: Automatically enrich memories with web research, display enrichments as crystal orbs

**Independent Test**: Capture content → see enrichment orb appear → click orb → view web-sourced images and facts

### Backend Implementation for US4

- [x] T116 [US4] Create backend/app/models/enrichment.py with Enrichment model
- [x] T117 [US4] Create backend/app/agents/enrichment_agent.py with ADK tools for web search
- [x] T118 [US4] Create backend/app/services/enrichment_service.py with enrichment CRUD
- [x] T119 [US4] Create backend/app/services/web_search.py with Google Search API integration
- [x] T120 [US4] Create backend/app/services/content_extractor.py for webpage parsing
- [x] T121 [US4] Add enrichment_update WebSocket broadcast per websocket.md
- [x] T122 [US4] Trigger enrichment agent after artifact creation in artifact_service.py
- [x] T123 [US4] Create backend/app/routers/enrichment.py with POST /enrichment/trigger, PATCH /enrichments/{id}
- [x] T124 [US4] Register enrichment router in backend/app/main.py

### Frontend Enrichment Implementation for US4

- [x] T125 [P] [US4] Create frontend/src/stores/enrichmentStore.ts with enrichment state
- [x] T126 [US4] Handle enrichment_update WebSocket messages in websocket.ts
- [x] T127 [US4] Add crystal_orb_pulse animation to CrystalOrb.tsx on new enrichment
- [x] T128 [US4] Create frontend/src/components/enrichment/EnrichmentPanel.tsx detail view
- [x] T129 [US4] Create frontend/src/components/enrichment/EnrichmentImage.tsx with caption
- [x] T130 [US4] Create frontend/src/components/enrichment/SourceAttribution.tsx for links
- [x] T131 [US4] Add enrichments section to ArtifactDetailModal.tsx

**Checkpoint**: Enrichment complete - Artifacts get enriched with web data, viewable as orbs

---

## Phase 7: User Story 5 - User Account & Palace Persistence (Priority: P5)

**Goal**: Persist palace across sessions, manage user preferences, show dashboard

**Independent Test**: Sign in → create memories → sign out → sign back in → all memories restored

### Backend Implementation for US5

- [ ] T132 [US5] Create backend/app/routers/preferences.py with GET /preferences, PATCH /preferences
- [ ] T133 [US5] Register preferences router in backend/app/main.py
- [ ] T134 [US5] Add user initialization on first sign-in in user_service.py
- [ ] T135 [US5] Save camera position and current room on palace/layout update

### Frontend Account Implementation for US5

- [ ] T136 [P] [US5] Create frontend/src/stores/preferencesStore.ts with user preferences
- [ ] T137 [US5] Create frontend/src/components/settings/SettingsPanel.tsx
- [ ] T138 [US5] Create frontend/src/components/settings/VoiceToggle.tsx
- [ ] T139 [US5] Create frontend/src/components/settings/EnrichmentToggle.tsx
- [ ] T140 [US5] Create frontend/src/components/settings/CaptureQualitySelect.tsx
- [ ] T141 [US5] Create frontend/src/pages/DashboardPage.tsx with stats and recent sessions
- [ ] T142 [US5] Create frontend/src/components/dashboard/PalaceStats.tsx
- [ ] T143 [US5] Create frontend/src/components/dashboard/RecentSessions.tsx
- [ ] T144 [US5] Create frontend/src/components/dashboard/QuickActions.tsx
- [ ] T145 [US5] Restore camera position and room on palace load in usePalace.ts

**Checkpoint**: Persistence complete - Full sign-in flow, preferences saved, palace restored

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Demo preparation, deployment, optimization

### Performance Optimization

- [ ] T153 Add InstancedMesh for repeated geometry (books, orbs) in artifact components
- [ ] T154 Add frustum culling configuration to PalaceCanvas.tsx
- [ ] T155 Add LOD (Level of Detail) for distant artifacts
- [ ] T156 Compress textures using basis/ktx2 format for themes
- [ ] T157 Add React.memo and useMemo optimizations to expensive 3D components

### Demo Preparation

- [ ] T158 Create demo seed data script backend/scripts/seed_demo.py
- [ ] T159 Run through 4-minute demo script per plan.md demo section
- [ ] T160 Take Cloud Run console screenshot for deployment proof
- [ ] T161 Create architecture diagram for submission
- [ ] T162 Record demo video

### Final Validation

- [ ] T163 Run quickstart.md validation end-to-end
- [ ] T164 Verify all REST endpoints per rest-api.md contract
- [ ] T165 Verify all WebSocket messages per websocket.md contract
- [ ] T166 Test error handling and rate limiting per contracts

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────────────────────────────────────────────►
                 │
                 ▼
Phase 2: Foundational (BLOCKING) ──────────────────────────────────────►
                 │
                 ├─────────────────────┬─────────────────────┬──────────►
                 ▼                     ▼                     ▼
         Phase 3: US1 (P1)      Phase 4: US2 (P2)     Phase 5: US3 (P3)
         Real-Time Capture      3D Navigation         Voice Conversation
                 │                     │                     │
                 ▼                     ▼                     ▼
         Phase 6: US4 (P4)      (depends on US1        (depends on US1
         Web Enrichment          artifacts)             artifacts)
                 │
                 ▼
         Phase 7: US5 (P5)
         Account & Persistence
                 │
                 ▼
Phase 8: Polish & Demo ────────────────────────────────────────────────►
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (P1) Capture | Foundational | Phase 2 complete |
| US2 (P2) Navigation | Foundational + US1 artifacts | Phase 2 complete (partial), US1 for full testing |
| US3 (P3) Voice | Foundational + US1 artifacts | Phase 2 complete (partial), US1 for full testing |
| US4 (P4) Enrichment | US1 artifacts | US1 complete |
| US5 (P5) Account | Foundational | Phase 2 complete |

### MVP Path (Minimum for Demo)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 - Real-Time Capture
4. Complete Phase 4: US2 - 3D Navigation (at least T063-T088)
5. Complete Phase 5: US3 - Voice Conversation (at least T089-T110)
6. **DEMO READY**: Can capture, navigate, and converse with memories

### Parallel Opportunities

- All tasks marked [P] can run in parallel within their phase
- After Phase 2, US1/US2/US5 can start in parallel
- US3/US4 depend on US1 artifacts existing
- Within each US, tests and models marked [P] can run in parallel

---

## Implementation Strategy

### Day 1: Foundation (Phase 1-2)
1. Setup project structure and dependencies
2. Configure Firebase, Firestore, Gemini clients
3. Implement WebSocket infrastructure
4. Create base models and auth middleware

### Day 2: Core Capture (Phase 3)
1. Implement Gemini Live API capture agent
2. Build media streaming pipeline
3. Create artifact storage service
4. Build capture UI components

### Day 3: 3D Palace (Phase 4)
1. Build Three.js scene and navigation
2. Create room and artifact visuals
3. Implement real-time palace updates
4. Add animations and effects

### Day 4: Voice & Polish (Phase 5-8)
1. Implement voice query/response flow
2. Add artifact narration
3. Deploy to Cloud Run
4. Record demo video

---

## Notes

- Focus on hackathon judging criteria: multimodal, agent architecture, cloud deployment
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Use `gcloud` CLI for quick deployment iterations
- Keep demo script timing in mind (4 minutes total)
