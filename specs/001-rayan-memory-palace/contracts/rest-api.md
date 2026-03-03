# REST API Contract: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**Base URL**: `https://{backend-url}/api/v1`
**Created**: 2026-03-02

## Authentication

All endpoints require Firebase Auth ID token in header:

```
Authorization: Bearer {firebase_id_token}
```

---

## Endpoints

### Palace

#### GET /palace

Get the current user's palace with all rooms.

**Response 200**:
```json
{
  "palace": {
    "id": "palace_123",
    "userId": "user_123",
    "createdAt": "2026-03-02T10:00:00Z",
    "lastModifiedAt": "2026-03-02T15:30:00Z",
    "lobbyPosition": { "x": 0, "y": 0, "z": 0 },
    "roomCount": 5,
    "artifactCount": 23
  },
  "layout": {
    "lobbyDoors": [
      { "roomId": "room_ml_001", "wallPosition": "north", "doorIndex": 0 },
      { "roomId": "room_linalg_002", "wallPosition": "east", "doorIndex": 0 }
    ],
    "corridors": [
      {
        "fromRoomId": "room_ml_001",
        "toRoomId": "room_linalg_002",
        "reason": "Matrix operations"
      }
    ],
    "lastCameraPosition": { "x": 5.2, "y": 1.6, "z": -3.0 },
    "lastCameraRotation": { "pitch": 0, "yaw": 1.57, "roll": 0 },
    "lastRoomId": "room_ml_001"
  },
  "rooms": [
    {
      "id": "room_ml_001",
      "name": "Machine Learning",
      "position": { "x": 10, "y": 0, "z": 0 },
      "dimensions": { "w": 8, "d": 8, "h": 4 },
      "style": "library",
      "connections": ["room_linalg_002"],
      "artifactCount": 12
    }
  ]
}
```

**Response 404**: Palace not found (new user)

---

#### POST /palace

Create a new palace for the user.

**Request Body**: None required (uses authenticated user)

**Response 201**:
```json
{
  "palace": {
    "id": "palace_new",
    "userId": "user_123",
    "createdAt": "2026-03-02T10:00:00Z",
    "lobbyPosition": { "x": 0, "y": 0, "z": 0 },
    "roomCount": 0,
    "artifactCount": 0
  }
}
```

---

#### PATCH /palace/layout

Update user's camera position and current room.

**Request Body**:
```json
{
  "lastCameraPosition": { "x": 5.2, "y": 1.6, "z": -3.0 },
  "lastCameraRotation": { "pitch": 0, "yaw": 1.57, "roll": 0 },
  "lastRoomId": "room_ml_001"
}
```

**Response 200**:
```json
{
  "success": true
}
```

---

### Rooms

#### GET /rooms/{roomId}

Get a room with all its artifacts.

**Response 200**:
```json
{
  "room": {
    "id": "room_ml_001",
    "name": "Machine Learning",
    "position": { "x": 10, "y": 0, "z": 0 },
    "dimensions": { "w": 8, "d": 8, "h": 4 },
    "style": "library",
    "connections": ["room_linalg_002"],
    "createdAt": "2026-03-01T14:00:00Z",
    "lastAccessedAt": "2026-03-02T15:30:00Z",
    "artifactCount": 12,
    "topicKeywords": ["neural networks", "deep learning", "attention"]
  },
  "artifacts": [
    {
      "id": "artifact_001",
      "type": "lecture",
      "position": { "x": 2, "y": 1.5, "z": -3 },
      "visual": "hologram_frame",
      "summary": "Attention mechanism lecture notes",
      "thumbnailUrl": "https://storage.../thumb.jpg",
      "createdAt": "2026-03-01T14:30:00Z",
      "color": "#4A90D9"
    }
  ]
}
```

---

#### POST /rooms/{roomId}/access

Record room access (updates lastAccessedAt).

**Response 200**:
```json
{
  "success": true,
  "lastAccessedAt": "2026-03-02T16:00:00Z"
}
```

---

### Artifacts

#### GET /artifacts/{artifactId}

Get full artifact details including content.

**Response 200**:
```json
{
  "artifact": {
    "id": "artifact_001",
    "roomId": "room_ml_001",
    "type": "lecture",
    "position": { "x": 2, "y": 1.5, "z": -3 },
    "visual": "hologram_frame",
    "summary": "Attention mechanism lecture notes",
    "fullContent": "The attention mechanism allows the model to focus on...",
    "sourceMediaUrl": "https://storage.../video.webm",
    "thumbnailUrl": "https://storage.../thumb.jpg",
    "createdAt": "2026-03-01T14:30:00Z",
    "captureSessionId": "session_123",
    "relatedArtifacts": ["artifact_456", "artifact_789"],
    "color": "#4A90D9"
  },
  "enrichments": [
    {
      "id": "enrichment_001",
      "sourceName": "Wikipedia",
      "sourceUrl": "https://en.wikipedia.org/wiki/Attention_(machine_learning)",
      "extractedContent": "Attention mechanisms are...",
      "images": [
        { "url": "https://storage.../img.jpg", "caption": "Attention diagram" }
      ],
      "createdAt": "2026-03-01T15:00:00Z",
      "relevanceScore": 0.92
    }
  ]
}
```

---

#### DELETE /artifacts/{artifactId}

Delete an artifact.

**Response 200**:
```json
{
  "success": true
}
```

---

### Capture Sessions

#### GET /sessions

List capture sessions for the user.

**Query Parameters**:
- `status`: Filter by status ("active", "completed", "failed")
- `limit`: Max results (default 20)
- `cursor`: Pagination cursor

**Response 200**:
```json
{
  "sessions": [
    {
      "id": "session_123",
      "startedAt": "2026-03-02T14:00:00Z",
      "endedAt": "2026-03-02T14:05:30Z",
      "status": "completed",
      "sourceType": "webcam",
      "conceptCount": 8,
      "durationSeconds": 330
    }
  ],
  "nextCursor": "abc123"
}
```

---

#### GET /sessions/{sessionId}

Get session details with created artifacts.

**Response 200**:
```json
{
  "session": {
    "id": "session_123",
    "startedAt": "2026-03-02T14:00:00Z",
    "endedAt": "2026-03-02T14:05:30Z",
    "status": "completed",
    "sourceType": "webcam",
    "rawMediaUrl": "https://storage.../raw.webm",
    "conceptCount": 8,
    "durationSeconds": 330
  },
  "artifacts": [
    { "id": "artifact_001", "summary": "Attention mechanism..." },
    { "id": "artifact_002", "summary": "Transformer architecture..." }
  ],
  "roomsAffected": ["room_ml_001"]
}
```

---

### Search

#### POST /search

Semantic search across all memories.

**Request Body**:
```json
{
  "query": "transformer attention mechanism",
  "limit": 10,
  "roomId": "room_ml_001"  // optional: scope to room
}
```

**Response 200**:
```json
{
  "results": [
    {
      "artifactId": "artifact_001",
      "roomId": "room_ml_001",
      "roomName": "Machine Learning",
      "summary": "Attention mechanism lecture notes",
      "similarity": 0.94,
      "highlight": "...scaled dot-product attention..."
    }
  ]
}
```

---

### Enrichment

#### POST /enrichment/trigger

Manually trigger enrichment for an artifact.

**Request Body**:
```json
{
  "artifactId": "artifact_001"
}
```

**Response 202**:
```json
{
  "status": "processing",
  "message": "Enrichment started. Updates will arrive via WebSocket."
}
```

---

#### PATCH /enrichments/{enrichmentId}

Update enrichment verification status.

**Request Body**:
```json
{
  "verified": true
}
```

**Response 200**:
```json
{
  "success": true
}
```

---

### User Preferences

#### GET /preferences

Get user preferences.

**Response 200**:
```json
{
  "preferences": {
    "voiceEnabled": true,
    "enrichmentEnabled": true,
    "captureQuality": "medium",
    "theme": "default"
  }
}
```

---

#### PATCH /preferences

Update user preferences.

**Request Body**:
```json
{
  "enrichmentEnabled": false
}
```

**Response 200**:
```json
{
  "preferences": {
    "voiceEnabled": true,
    "enrichmentEnabled": false,
    "captureQuality": "medium",
    "theme": "default"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Artifact not found",
    "details": { "artifactId": "invalid_id" }
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request body |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |
| 403 | `FORBIDDEN` | Not allowed to access resource |
| 404 | `RESOURCE_NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Temporarily unavailable |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| GET requests | 100/minute |
| POST/PATCH/DELETE | 30/minute |
| Search | 20/minute |
| Enrichment trigger | 10/minute |
