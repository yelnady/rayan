# Research: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**Created**: 2026-03-02

## Overview

This document consolidates research findings for the Rayan Memory Palace implementation. All technology decisions are made to maximize hackathon judging criteria while maintaining feasibility within the competition timeline.

---

## 1. Gemini Live API & Real-Time AI

### Decision: Use Gemini 2.5 Flash with Live API

**Rationale**:
- Gemini Live API provides real-time bidirectional streaming for audio/video
- Native support for interruption handling (barge-in)
- Interleaved output mode allows mixing voice + generated images in single response stream
- Mandatory for "Live Agents" category

### Implementation Pattern

```python
from google import genai
from google.genai import types

client = genai.Client()

# Real-time streaming with multimodal input
async with client.aio.live.connect(
    model="gemini-live-2.5-flash-native-audio",
    config=types.LiveConnectConfig(
        response_modalities=["AUDIO", "IMAGE"],  # Interleaved output
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Aoede"  # Warm, conversational
                )
            )
        )
    )
) as session:
    # Stream video frames
    await session.send(video_frame, end_of_turn=False)

    # Stream audio chunks
    await session.send(audio_chunk, end_of_turn=False)

    # Receive interleaved responses
    async for response in session.receive():
        if response.audio:
            # Play audio chunk
            pass
        if response.image:
            # Render generated diagram
            pass
```

### Interruption Handling

```python
# Detect user speech during agent response
if voice_activity_detected:
    await session.send(types.InterruptMessage())
    # Session automatically stops current generation
    # New context is preserved
```

---

## 2. ADK (Agent Development Kit)

### Decision: Use ADK for Multi-Agent Orchestration

**Rationale**:
- Official Google framework for building agents
- Native integration with Gemini models
- Tool-use patterns for web search (enrichment agent)
- Mandatory option per hackathon rules

**Agent Architecture**:

```python
from google.adk import Agent, Tool

# Define tools for enrichment agent
@Tool
def web_search(query: str) -> str:
    """Search the web for information."""
    # Uses Google Search API or Serper
    pass

@Tool
def extract_page_content(url: str) -> dict:
    """Extract text and images from a webpage."""
    pass

# Create specialized agents
capture_agent = Agent(
    model="gemini-live-2.5-flash-native-audio",
    system_instruction="""You are a memory capture assistant.
    Extract key concepts, entities, and relationships from streaming input.
    Acknowledge extractions concisely."""
)

enrichment_agent = Agent(
    model="gemini-2.5-flash",
    tools=[web_search, extract_page_content],
    system_instruction="""You are a research assistant.
    Find relevant information to enrich user memories.
    Focus on authoritative sources."""
)

recall_agent = Agent(
    model="gemini-live-2.5-flash-native-audio",
    system_instruction="""You are a memory recall assistant.
    Answer questions based on stored memories.
    Generate diagrams when helpful.
    Never hallucinate - say "I don't have that memory" if unsure."""
)
```

---

## 3. Three.js 3D Implementation

### Decision: Procedural Geometry with @react-three/fiber

**Rationale**:
- No custom 3D modeling required (faster development)
- React integration via @react-three/fiber
- Drei helpers for common patterns (PointerLockControls, Text, etc.)
- GSAP for smooth animations
- Achieves 30+ FPS on consumer hardware

**Alternatives Considered**:
- Babylon.js: Heavier, less React integration
- A-Frame: VR-focused, overkill for browser
- Unity/Unreal WebGL export: Too heavy, long build times

### Room Generation Pattern

```tsx
// React Three Fiber component
function Room({ roomData }: { roomData: RoomData }) {
  const { w, d, h } = roomData.dimensions;
  const theme = THEMES[roomData.style];

  return (
    <group position={[roomData.position.x, 0, roomData.position.z]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={theme.floorTexture} />
      </mesh>

      {/* Walls with door cutouts */}
      <WallsWithDoors
        width={w}
        depth={d}
        height={h}
        doors={roomData.connections}
        theme={theme}
      />

      {/* Ambient lighting per theme */}
      <pointLight
        position={[w/2, h-0.5, d/2]}
        color={theme.lightColor}
        intensity={theme.lightIntensity}
      />

      {/* Artifacts */}
      {roomData.artifacts.map(artifact => (
        <Artifact key={artifact.id} data={artifact} />
      ))}
    </group>
  );
}
```

### Theme Definitions

```typescript
const THEMES = {
  library: {
    floorTexture: '/textures/wood_floor.jpg',
    wallTexture: '/textures/wood_panel.jpg',
    lightColor: '#FFA500',  // Warm amber
    lightIntensity: 0.8,
    fogColor: '#2A1810',
    particleColor: '#FFD700'
  },
  lab: {
    floorTexture: '/textures/tile_floor.jpg',
    wallTexture: '/textures/white_wall.jpg',
    lightColor: '#4A90D9',  // Cool blue
    lightIntensity: 1.0,
    fogColor: '#1A2A3A',
    particleColor: '#00BFFF'
  },
  gallery: {
    floorTexture: '/textures/marble_floor.jpg',
    wallTexture: '/textures/white_wall.jpg',
    lightColor: '#FFFFFF',  // Soft white
    lightIntensity: 0.9,
    fogColor: '#F5F5F5',
    particleColor: '#E0E0E0'
  },
  garden: {
    floorTexture: '/textures/grass.jpg',
    wallTexture: '/textures/hedge.jpg',
    lightColor: '#90EE90',  // Green
    lightIntensity: 1.1,
    fogColor: '#1A3A1A',
    particleColor: '#32CD32'
  },
  workshop: {
    floorTexture: '/textures/concrete.jpg',
    wallTexture: '/textures/brick.jpg',
    lightColor: '#FFA07A',  // Industrial orange
    lightIntensity: 0.7,
    fogColor: '#2A2520',
    particleColor: '#FF6347'
  }
};
```

### Performance Optimizations

1. **Instance Merging**: Use `InstancedMesh` for repeated geometry (books, orbs)
2. **Level of Detail**: Reduce geometry detail for distant artifacts
3. **Frustum Culling**: Default in Three.js, ensures off-screen objects skip render
4. **Texture Compression**: Use compressed formats (basis, ktx2)
5. **Object Pooling**: Reuse Three.js objects instead of recreating

---

## 4. Google Cloud Architecture

### Decision: Cloud Run + Firestore + Vertex AI

**Rationale**:
- Cloud Run: Auto-scaling, WebSocket support, container-based
- Firestore: Real-time sync, hierarchical data model fits palace structure
- Vertex AI Vector Search: Semantic retrieval for memory search
- All are Google Cloud services (hackathon requirement)

### Infrastructure-as-Code (Terraform)

```hcl
# Cloud Run service
resource "google_cloud_run_service" "backend" {
  name     = "rayan-backend"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/rayan-backend:latest"

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
        }
      }

      # WebSocket requires session affinity
      service_account_name = google_service_account.backend.email
    }

    metadata {
      annotations = {
        "run.googleapis.com/sessionAffinity" = "true"
        "autoscaling.knative.dev/maxScale"   = "10"
      }
    }
  }
}

# Firestore database
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = "us-central1"
  type        = "FIRESTORE_NATIVE"
}

# Cloud Storage for media
resource "google_storage_bucket" "media" {
  name          = "rayan-media-${var.project_id}"
  location      = "US"
  force_destroy = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Vertex AI Vector Search index
resource "google_vertex_ai_index" "artifacts" {
  display_name = "artifact-embeddings"
  description  = "Semantic search index for memory artifacts"
  region       = "us-central1"

  metadata {
    contents_delta_uri = "gs://${google_storage_bucket.media.name}/embeddings/"
    config {
      dimensions                  = 768
      approximate_neighbors_count = 150
      distance_measure_type       = "COSINE_DISTANCE"

      algorithm_config {
        tree_ah_config {
          leaf_node_embedding_count    = 1000
          leaf_nodes_to_search_percent = 10
        }
      }
    }
  }
}
```

### Deployment Pipeline (Cloud Build)

```yaml
# cloudbuild.yaml
steps:
  # Build backend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/rayan-backend:$COMMIT_SHA', './backend']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/rayan-backend:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'rayan-backend'
      - '--image=gcr.io/$PROJECT_ID/rayan-backend:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'

  # Build and deploy frontend
  - name: 'node:20'
    dir: 'frontend'
    entrypoint: npm
    args: ['ci']

  - name: 'node:20'
    dir: 'frontend'
    entrypoint: npm
    args: ['run', 'build']
    env:
      - 'VITE_API_URL=https://rayan-backend-xxx-uc.a.run.app'

  # Deploy frontend to Cloud Storage + CDN
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    dir: 'frontend'
    entrypoint: gsutil
    args: ['-m', 'cp', '-r', 'dist/*', 'gs://rayan-frontend-$PROJECT_ID/']
```

---

## 5. Embedding Strategy

### Decision: Gemini Embedding API (768 dimensions)

**Rationale**:
- Native integration with Gemini models
- Consistent semantic space for retrieval
- 768 dimensions balances quality vs storage

### Implementation

```python
from google import genai

client = genai.Client()

def get_embedding(text: str) -> list[float]:
    response = client.models.embed_content(
        model="models/text-embedding-004",
        content=text
    )
    return response.embedding

# For artifacts
artifact_embedding = get_embedding(artifact.summary + " " + artifact.full_content[:500])

# For rooms (topic embedding)
room_embedding = get_embedding(" ".join(room.topic_keywords))
```

### Vector Search Query

```python
from google.cloud import aiplatform

def search_similar_artifacts(query_embedding: list[float], top_k: int = 10):
    index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
        index_endpoint_name="projects/.../locations/us-central1/indexEndpoints/..."
    )

    response = index_endpoint.find_neighbors(
        deployed_index_id="artifact-embeddings",
        queries=[query_embedding],
        num_neighbors=top_k
    )

    return [
        {"artifact_id": neighbor.id, "similarity": neighbor.distance}
        for neighbor in response[0]
    ]
```

---

## 6. Authentication

### Decision: Firebase Auth with Google Sign-In

**Rationale**:
- Native Google ecosystem integration
- Easy setup for hackathon timeline
- Handles OAuth flow, session management
- Works seamlessly with Firestore security rules

### Implementation

```typescript
// Frontend
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const auth = getAuth();
const provider = new GoogleAuthProvider();

async function signIn() {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  // Send to backend for verification
}
```

```python
# Backend verification
from firebase_admin import auth

def verify_token(id_token: str) -> dict:
    decoded = auth.verify_id_token(id_token)
    return {
        "user_id": decoded["uid"],
        "email": decoded["email"]
    }
```

---

## Summary of Technology Decisions

| Component | Decision | Rationale |
|-----------|----------|-----------|
| AI Model (Live API) | `gemini-live-2.5-flash-native-audio` | Real-time audio/voice streaming |
| AI Model (Standard) | `gemini-2.5-flash` | Batch inference, enrichment |
| AI Model (Image gen) | `gemini-2.5-flash-image` | Diagram + thumbnail generation |
| Agent Framework | ADK | Multi-agent orchestration |
| 3D Rendering | Three.js + R3F | Browser-native, React integration |
| Animation | GSAP | Smooth transitions |
| Backend | FastAPI on Cloud Run | WebSocket support, auto-scaling |
| Database | Firestore | Real-time sync, hierarchical |
| Vector Search | Vertex AI | Semantic retrieval |
| Storage | Cloud Storage | Media artifacts |
| Auth | Firebase Auth | Google sign-in, security rules |
| IaC | Terraform | Bonus points for automation |
| CI/CD | Cloud Build | Integrated deployment |

All decisions optimize for:
1. **Hackathon requirements** (Gemini, Google Cloud)
2. **Development speed** (managed services, familiar tools)
3. **Demo impact** (real-time, visual, interactive)
4. **Judging criteria** (multimodal, agent architecture, cloud deployment)
