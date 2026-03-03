# Data Model: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**Created**: 2026-03-02

## Overview

This document defines the data entities for the Rayan Memory Palace system. The primary storage is Firestore with a hierarchical document structure optimized for real-time sync and semantic querying.

## Entity Definitions

### User

Represents an authenticated user with their own memory palace.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Firebase Auth UID |
| email | string | Yes | User email address |
| displayName | string | No | Display name for UI |
| avatarUrl | string | No | Profile image URL |
| createdAt | timestamp | Yes | Account creation time |
| lastActiveAt | timestamp | Yes | Last activity timestamp |
| preferences | Preferences | No | User settings |

**Preferences (embedded)**:
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| voiceEnabled | boolean | true | Enable voice narration |
| enrichmentEnabled | boolean | true | Enable auto web research |
| captureQuality | enum | "medium" | "low" / "medium" / "high" |
| theme | string | "default" | UI theme preference |

**Firestore Path**: `users/{userId}`

---

### Palace

The user's complete 3D memory space.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Auto-generated |
| userId | string | Yes | Owner reference |
| createdAt | timestamp | Yes | Palace creation time |
| lastModifiedAt | timestamp | Yes | Last update time |
| lobbyPosition | Position3D | Yes | Starting position |
| roomCount | number | Yes | Total rooms (denormalized) |
| artifactCount | number | Yes | Total artifacts (denormalized) |

**Firestore Path**: `users/{userId}/palace`

---

### Layout

Palace spatial organization (subcollection of Palace).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| lobbyDoors | LobbyDoor[] | Yes | Doors from lobby to rooms |
| corridors | Corridor[] | No | Connections between rooms |
| lastCameraPosition | Position3D | No | User's last position |
| lastCameraRotation | Rotation3D | No | User's last look direction |
| lastRoomId | string | No | Room user was in |

**LobbyDoor (embedded)**:
| Field | Type | Description |
|-------|------|-------------|
| roomId | string | Target room reference |
| wallPosition | enum | "north" / "east" / "south" / "west" |
| doorIndex | number | Position along wall (0-based) |

**Corridor (embedded)**:
| Field | Type | Description |
|-------|------|-------------|
| fromRoomId | string | Source room |
| toRoomId | string | Target room |
| reason | string | Why connected (semantic relationship) |
| createdAt | timestamp | When connection was made |

**Firestore Path**: `users/{userId}/palace/layout`

---

### Room

A topic-clustered space within the palace.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Auto-generated (e.g., "room_ml_001") |
| name | string | Yes | Topic name (e.g., "Machine Learning") |
| position | Position3D | Yes | World coordinates (x, z) |
| dimensions | Dimensions3D | Yes | Room size (w, d, h) |
| style | enum | Yes | Visual theme |
| connections | string[] | No | Connected room IDs |
| createdAt | timestamp | Yes | Room creation time |
| lastAccessedAt | timestamp | Yes | Last time user entered |
| artifactCount | number | Yes | Artifacts in room (denormalized) |
| topicKeywords | string[] | Yes | Semantic clustering terms |
| topicEmbedding | number[] | Yes | Room topic embedding (768d) |

**Style enum**: "library" | "lab" | "gallery" | "garden" | "workshop"

**Dimensions3D (embedded)**:
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| w | number | 8 | Width (meters) |
| d | number | 8 | Depth (meters) |
| h | number | 4 | Height (meters) |

**Firestore Path**: `users/{userId}/palace/rooms/{roomId}`

---

### Artifact

A single memory object within a room.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Auto-generated |
| roomId | string | Yes | Parent room reference |
| type | enum | Yes | Memory type |
| position | Position3D | Yes | Position within room |
| visual | enum | Yes | 3D representation type |
| summary | string | Yes | Brief description |
| fullContent | string | No | Complete extracted text |
| embedding | number[] | Yes | Semantic embedding (768d) |
| sourceMediaUrl | string | No | Cloud Storage reference |
| thumbnailUrl | string | No | Preview image URL |
| createdAt | timestamp | Yes | Capture timestamp |
| captureSessionId | string | No | Source session reference |
| enrichments | string[] | No | Related enrichment IDs |
| relatedArtifacts | string[] | No | Semantically similar artifacts |
| color | string | No | Glow color hex (e.g., "#4A90D9") |

**Type enum**: "lecture" | "document" | "visual" | "conversation" | "enrichment"

**Visual enum**: "floating_book" | "hologram_frame" | "framed_image" | "speech_bubble" | "crystal_orb"

**Firestore Path**: `users/{userId}/palace/rooms/{roomId}/artifacts/{artifactId}`

---

### CaptureSession

A single recording session.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Auto-generated |
| userId | string | Yes | Owner reference |
| startedAt | timestamp | Yes | Session start time |
| endedAt | timestamp | No | Session end time |
| status | enum | Yes | Session status |
| sourceType | enum | Yes | Input type |
| rawMediaUrl | string | No | Cloud Storage reference |
| extractedArtifactIds | string[] | Yes | Created artifact references |
| conceptCount | number | Yes | Number of concepts extracted |
| durationSeconds | number | No | Session length |

**Status enum**: "active" | "processing" | "completed" | "failed"

**SourceType enum**: "webcam" | "screen_share" | "upload" | "text_input"

**Firestore Path**: `users/{userId}/captureSessions/{sessionId}`

---

### Enrichment

External data added to enhance an artifact.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Auto-generated |
| artifactId | string | Yes | Parent artifact reference |
| sourceUrl | string | Yes | Original web source |
| sourceName | string | Yes | Site/publication name |
| extractedContent | string | Yes | Pulled text content |
| images | EnrichmentImage[] | No | Extracted images |
| createdAt | timestamp | Yes | Enrichment time |
| relevanceScore | number | Yes | 0-1 relevance rating |
| verified | boolean | No | User confirmed accuracy |

**EnrichmentImage (embedded)**:
| Field | Type | Description |
|-------|------|-------------|
| url | string | Cloud Storage URL |
| caption | string | Image description |
| sourceUrl | string | Original image source |

**Firestore Path**: `users/{userId}/palace/rooms/{roomId}/artifacts/{artifactId}/enrichments/{enrichmentId}`

---

## Shared Types

### Position3D

| Field | Type | Description |
|-------|------|-------------|
| x | number | X coordinate (meters) |
| y | number | Y coordinate (height, meters) |
| z | number | Z coordinate (meters) |

### Rotation3D

| Field | Type | Description |
|-------|------|-------------|
| pitch | number | X-axis rotation (radians) |
| yaw | number | Y-axis rotation (radians) |
| roll | number | Z-axis rotation (radians) |

---

## Relationships

```text
User (1) ──────── (1) Palace
                      │
                      ├── (1) Layout
                      │       ├── lobbyDoors[]
                      │       └── corridors[]
                      │
                      └── (N) Room
                              │
                              └── (N) Artifact
                                      │
                                      └── (N) Enrichment

User (1) ──────── (N) CaptureSession
```

## Validation Rules

### Room
- `name`: 1-100 characters, non-empty
- `position.x`, `position.z`: Must not overlap with existing rooms
- `dimensions.w`, `dimensions.d`: 4-16 meters
- `dimensions.h`: 3-6 meters
- `style`: Must be valid enum value

### Artifact
- `summary`: 1-500 characters
- `position`: Must be within parent room dimensions
- `embedding`: Must be 768-dimensional vector
- `type` and `visual` must be consistent:
  - lecture → hologram_frame
  - document → floating_book
  - visual → framed_image
  - conversation → speech_bubble
  - enrichment → crystal_orb

### CaptureSession
- `endedAt`: Must be after `startedAt` if set
- `status`: Can only transition forward (active → processing → completed/failed)

---

## Indexing Strategy

### Firestore Indexes (composite)

1. **Artifact by room + creation time**
   - Collection: `artifacts`
   - Fields: `roomId` ASC, `createdAt` DESC

2. **Room by topic keywords**
   - Collection: `rooms`
   - Fields: `topicKeywords` ARRAY_CONTAINS

3. **CaptureSession by status**
   - Collection: `captureSessions`
   - Fields: `userId` ASC, `status` ASC, `startedAt` DESC

### Vertex AI Vector Search Indexes

1. **Artifact embeddings**
   - Dimensions: 768
   - Distance: Cosine similarity
   - Purpose: Semantic memory retrieval

2. **Room topic embeddings**
   - Dimensions: 768
   - Distance: Cosine similarity
   - Purpose: Room placement and connection suggestions

---

## State Transitions

### CaptureSession Status

```text
[active] ──(endCapture)──→ [processing] ──(success)──→ [completed]
                                │
                                └──(error)──→ [failed]
```

### Room Lifecycle

```text
[created] ──(firstArtifact)──→ [populated] ──(allDeleted)──→ [empty]
                                    │
                                    └──(connected)──→ [linked]
```

---

## Cloud Storage Structure

```text
gs://rayan-media-{project_id}/
├── users/{userId}/
│   ├── captures/
│   │   └── {sessionId}/
│   │       ├── raw_video.webm
│   │       ├── raw_audio.webm
│   │       └── thumbnails/
│   │           └── {timestamp}.jpg
│   ├── artifacts/
│   │   └── {artifactId}/
│   │       ├── thumbnail.jpg
│   │       └── generated/
│   │           └── {diagramId}.png
│   └── enrichments/
│       └── {enrichmentId}/
│           └── {imageIndex}.jpg
└── shared/
    └── textures/
        └── {style}/
            ├── floor.jpg
            ├── wall.jpg
            └── ceiling.jpg
```
