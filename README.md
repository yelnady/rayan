# Rayan — Living Memory Palace Agent

Rayan is an AI agent that builds and maintains a personalized 3D memory palace from your real life. It captures what you see, hear, and read through real-time audio/video streaming, then lets you walk through an immersive 3D environment and have natural voice conversations with your own memories.

[Read the Product Overview (for end users)](./PRODUCT.md)

## Features

- **Real-Time Memory Capture** — Stream your webcam and microphone; Rayan extracts key concepts and stores them as artifacts with voice acknowledgement
- **3D Palace Navigation** — Walk through topic-based rooms in an immersive Three.js environment using keyboard/mouse controls
- **Voice Conversations** — Ask questions about your memories using natural speech via Gemini Live API
- **Web Enrichment** — Artifacts are automatically enriched with relevant web research
- **Semantic Search** — Find memories via vector similarity search powered by Vertex AI

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | TypeScript, React 18, Three.js, @react-three/fiber |
| Backend | Python 3.11, FastAPI, WebSocket |
| AI | Gemini 2.5 Flash, Gemini Live API (`gemini-live-2.5-flash-native-audio`) |
| Database | Firestore, Vertex AI Vector Search |
| Storage | Google Cloud Storage |
| Auth | Firebase Auth |
| Deploy | Cloud Run (backend), Firebase Hosting (frontend) |

## Project Structure

```
backend/
├── app/
│   ├── core/          # Firebase, Firestore, Gemini, Storage clients
│   ├── routers/       # REST API routes (palace, rooms, artifacts, search, enrichment)
│   ├── websocket/     # WebSocket auth, handlers, connection manager
│   ├── middleware/    # Auth middleware
│   └── config.py      # Settings (pydantic-settings, .env)
└── main.py            # Uvicorn entry point

frontend/
└── src/
    ├── components/
    │   ├── palace/    # 3D palace scene and Room rendering
    │   ├── capture/   # Real-time video/audio capture UI
    │   ├── voice/     # Voice conversation UI
    │   ├── artifacts/ # Artifact detail views
    │   ├── hud/       # Heads-up display overlays
    │   └── navigation/# First-person camera controls
    ├── hooks/         # Custom React hooks
    ├── services/      # API and WebSocket clients
    └── stores/        # Zustand state management
```

## Getting Started

### Prerequisites

- Python 3.11+, Node.js 18+
- Google Cloud project with Firestore, Vertex AI, and Cloud Storage enabled
- Firebase project for authentication

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `GOOGLE_API_KEY` | API key for Google Custom Search (enrichment) |
| `GOOGLE_SEARCH_CX` | Custom Search Engine ID |
| `FIREBASE_PROJECT_ID` | Firebase project for token verification |
| `VERTEX_AI_INDEX_ENDPOINT` | Vertex AI Vector Search endpoint |
| `MEDIA_BUCKET` | Cloud Storage bucket for media uploads |

## Deployment

```bash
# Backend → Cloud Run
bash deploy-backend.sh

# Frontend → Firebase Hosting
bash deploy-frontend.sh
```

## Development

```bash
# Backend linting
cd backend && ruff check . && ruff format .

# Frontend linting + tests
cd frontend && npm run lint && npm test
```
