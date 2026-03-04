# Rayan Development Guidelines

Auto-generated from feature plans. Last updated: 2026-03-02

## Active Technologies

- **Frontend**: TypeScript 5.x, React 18, Three.js, @react-three/fiber
- **Backend**: Python 3.11, FastAPI, Google GenAI SDK, ADK
- **AI**: Gemini 2.5 Flash, Gemini Live API, Vertex AI
  - Live API: `gemini-live-2.5-flash-native-audio`
  - All other APIs: `gemini-2.5-flash`
- **Database**: Firestore, Vertex AI Vector Search
- **Storage**: Cloud Storage
- **Deployment**: Cloud Run (backend), Firebase Hosting (frontend), Terraform

## Project Structure

```text
backend/
├── src/
│   ├── agents/          # ADK agents (capture, recall, enrichment, narrator)
│   ├── api/             # FastAPI routes and WebSocket handlers
│   ├── models/          # Pydantic models
│   └── services/        # Firestore, Storage, Vector Search clients
├── tests/
└── main.py

frontend/
├── src/
│   ├── components/      # React components (Palace, Capture, UI)
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API clients
│   ├── stores/          # Zustand state
│   └── three/           # Three.js scene generators
├── tests/
└── index.html

infrastructure/
├── terraform/           # IaC for Cloud Run, Firestore, Storage
└── cloudbuild.yaml      # CI/CD pipeline
```

## Commands

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000  # Start dev server
pytest                                  # Run tests
ruff check . && ruff format .          # Lint and format
```

### Frontend

```bash
cd frontend
npm run dev      # Start dev server
npm test         # Run tests
npm run lint     # Lint
npm run build    # Production build
```

### Deployment

```bash
# Deploy backend to Cloud Run
gcloud builds submit --tag gcr.io/$PROJECT_ID/rayan-backend ./backend
gcloud run deploy rayan-backend --image gcr.io/$PROJECT_ID/rayan-backend --region us-central1

# Deploy frontend to Firebase Hosting
cd frontend && npm run build && firebase deploy --only hosting
```

## Code Style

- **Python**: Follow PEP 8, use Ruff for linting/formatting
- **TypeScript**: ESLint + Prettier, strict mode enabled
- **Three.js**: Use @react-three/fiber declarative patterns

## Key Patterns

### WebSocket Communication
All real-time features (capture, voice queries, palace updates) use WebSocket at `/ws/{userId}`

### Agent Architecture
ADK agents are orchestrated via the Memory Architect. Each agent has a specific role:
- **Capture Agent**: Real-time video/audio → concept extraction
- **Recall Agent**: Query → vector search → grounded response
- **Enrichment Agent**: Artifact → web research → enhancement
- **Narrator Agent**: Artifact click → voice + diagram generation

### 3D Palace Generation
- Rooms are procedurally generated from semantic clustering
- 5 themed styles: library, lab, gallery, garden, workshop
- Artifacts are type-mapped to visuals (book, hologram, frame, orb, bubble)

## Recent Changes

- 001-rayan-memory-palace: Initial feature implementation plan

<!-- MANUAL ADDITIONS START -->
<!-- Add project-specific notes here that should persist across updates -->
- Do not create or include `.js` files for React components (especially palace items) when a corresponding `.tsx` file exists. Always default to updating the `.tsx` versions.
<!-- MANUAL ADDITIONS END -->
