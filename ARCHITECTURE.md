# Rayan — System Architecture

## Component Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          User's Browser                              │
│                   React 18 + Three.js + @react-three/fiber           │
│                        (Firebase Hosting)                            │
│                                                                      │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │
│  │  3D Memory  │   │  Capture Panel   │   │   Voice Panel        │  │
│  │  Palace     │   │  (mic + screen   │   │   (Recall mode)      │  │
│  │  Three.js   │   │   stream)        │   │   audio playback     │  │
│  └──────┬──────┘   └────────┬─────────┘   └──────────┬───────────┘  │
│         │                  │                          │              │
│         └──────────────────┴──────────────────────────┘              │
│                            │  WebSocket /ws/{userId}                 │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                     Cloud Run — FastAPI + uvicorn                    │
│                        (session affinity)                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  WebSocket Handler  /ws/{userId}                             │    │
│  │  Routes: audio_chunk, video_frame, capture_start/stop,       │    │
│  │          recall_start/stop, screenshot_response              │    │
│  └────────┬───────────────────────────────┬─────────────────────┘    │
│           │                               │                          │
│  ┌────────▼─────────────────┐   ┌─────────▼──────────────────────┐  │
│  │  CaptureAgent            │   │  RecallAgent                   │  │
│  │                          │   │                                │  │
│  │  Model:                  │   │  Model:                        │  │
│  │  gemini-live-2.5-flash-  │   │  gemini-live-2.5-flash-        │  │
│  │  native-audio            │   │  native-audio                  │  │
│  │                          │   │                                │  │
│  │  enable_affective_       │   │  enable_affective_             │  │
│  │  dialog=True             │   │  dialog=True                   │  │
│  │                          │   │                                │  │
│  │  Tools:                  │   │  Tools:                        │  │
│  │  • capture_concept       │   │  • navigate_to_room            │  │
│  │  • create_artifact       │   │  • navigate_horizontal         │  │
│  │  • create_room           │   │  • navigate_to_map_view        │  │
│  │  • take_screenshot       │   │  • highlight_artifact          │  │
│  │  • edit_artifact         │   │  • create_artifact             │  │
│  │  • delete_artifact       │   │  • edit_artifact               │  │
│  │  • web_search            │   │  • delete_artifact             │  │
│  │  • navigate_to_room      │   │  • delete_room                 │  │
│  │  • end_session           │   │  • synthesize_room             │  │
│  │                          │   │  • web_search                  │  │
│  │  Dedup: cosine sim on    │   │  • end_session                 │  │
│  │  text-embedding-005      │   │                                │  │
│  └────────┬─────────────────┘   └─────────┬──────────────────────┘  │
│           │                               │                          │
│  ┌────────▼───────────────────────────────▼──────────────────────┐   │
│  │  Memory Architect  (gemini-2.5-flash)                         │   │
│  │  • Categorizes concept into existing room or suggests new one  │   │
│  │  • Assigns artifact type and visual                            │   │
│  │  • Generates embedding via Vertex AI text-embedding-005        │   │
│  │  • Writes artifact + embedding to Firestore                    │   │
│  └────────────────────────────────┬───────────────────────────────┘  │
│                                   │                                  │
│  ┌────────────────────────────────▼───────────────────────────────┐  │
│  │  Semantic Search  (recall grounding)                           │  │
│  │  • Embeds user query via Vertex AI text-embedding-005          │  │
│  │  • Cosine similarity scan across all stored embeddings         │  │
│  │  • Top-8 results injected into RecallAgent system prompt       │  │
│  │  • Re-runs on every room navigation and artifact highlight      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                         Google Cloud                                 │
│                                                                      │
│  ┌──────────────────────┐   ┌────────────────────────────────────┐   │
│  │  Cloud Firestore     │   │  Vertex AI                         │   │
│  │                      │   │                                    │   │
│  │  users/              │   │  text-embedding-005                │   │
│  │   {userId}/          │   │  768-dimensional embeddings        │   │
│  │    rooms/            │   │  Used for:                         │   │
│  │     {roomId}/        │   │  • Artifact storage (capture)      │   │
│  │      artifacts/      │   │  • Semantic search (recall)        │   │
│  │       {id}           │   │  • Dedup detection (capture)       │   │
│  │       .embedding[]   │   │                                    │   │
│  │       .summary       │   │  Vector Search index               │   │
│  │       .fullContent   │   │  768-dim, cosine, Tree-AH          │   │
│  │       .type          │   │  (Terraform-provisioned)           │   │
│  └──────────────────────┘   └────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Cloud Storage  (rayan-media-{project})                      │    │
│  │  • JPEG screenshots captured during Capture sessions         │    │
│  │  • AI-generated mind map images (synthesize_room)            │    │
│  │  • Public URLs stored as sourceMediaUrl on artifacts         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Firebase Hosting  (frontend)                                │    │
│  │  Firebase Auth     (user identity)                           │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow — Capture Mode

```
Mic + Screen
     │
     ▼
CaptureAgent (Gemini Live)
     │ autonomous concept detection
     │ OR user says "save this"
     ▼
capture_concept / create_artifact tool call
     │
     ▼
Memory Architect (gemini-2.5-flash)
  • Selects or creates a room
  • Assigns artifact type + visual
     │
     ▼
text-embedding-005 (Vertex AI)
  • Generates 768-dim embedding
     │
     ├──► Firestore  (artifact + embedding stored)
     │
     └──► WebSocket → Browser
              palace_update event
              → artifact appears in 3D palace
```

## Data Flow — Recall Mode

```
User speaks
     │
     ▼
RecallAgent (Gemini Live)
  enable_affective_dialog=True
     │
     ▼
On session start / room nav / artifact highlight:
  update_context() → semantic_search()
     │
     ▼
text-embedding-005 (Vertex AI)
  Embed current context / artifact summary
     │
     ▼
Cosine similarity vs all stored embeddings (Firestore)
  Top-8 most relevant memories selected
     │
     ▼
send_client_content → injected into live conversation
  RecallAgent answers ONLY from these grounded memories
     │
     ▼
Audio response → WebSocket → Browser
  + optional tool calls (navigate, highlight, synthesize)
```

## Infrastructure (Terraform)

| Resource | Type | Config |
|----------|------|--------|
| `rayan-backend` | Cloud Run v2 | 2 CPU / 2 GB / max 10 instances / session affinity |
| `(default)` | Firestore Native | `us-central1` |
| `rayan-media-{project}` | Cloud Storage | US multi-region / CORS enabled |
| `rayan-frontend-{project}` | Cloud Storage | Static website hosting |
| `artifact-embeddings` | Vertex AI Vector Search | 768-dim / cosine / Tree-AH |
| `rayan-backend` | Service Account | Firestore user + Storage admin + Vertex AI user |

All resources provisioned with: `terraform apply -var="project_id=<PROJECT_ID>"`
