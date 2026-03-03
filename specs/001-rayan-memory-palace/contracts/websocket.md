# WebSocket Contract: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**Protocol**: WebSocket over wss://
**Created**: 2026-03-02

## Connection

**Endpoint**: `wss://{backend-url}/ws/{userId}`

**Authentication**: Bearer token in first message after connection

```json
{
  "type": "auth",
  "token": "firebase_id_token"
}
```

**Response**:
```json
{
  "type": "auth_success",
  "userId": "user_123"
}
```

---

## Message Types

### Client → Server

#### 1. Start Capture Session

```json
{
  "type": "capture_start",
  "sessionId": "session_uuid",
  "sourceType": "webcam" | "screen_share" | "upload" | "text_input"
}
```

#### 2. Stream Media Chunk

```json
{
  "type": "media_chunk",
  "sessionId": "session_uuid",
  "chunkIndex": 0,
  "data": "base64_encoded_webm_chunk",
  "timestamp": 1709337600000
}
```

#### 3. End Capture Session

```json
{
  "type": "capture_end",
  "sessionId": "session_uuid"
}
```

#### 4. Voice Query

```json
{
  "type": "voice_query",
  "queryId": "query_uuid",
  "audioData": "base64_encoded_audio",
  "context": {
    "currentRoomId": "room_ml_001" | null,
    "focusedArtifactId": "artifact_123" | null
  }
}
```

#### 5. Text Query (fallback)

```json
{
  "type": "text_query",
  "queryId": "query_uuid",
  "text": "What was the main point about attention?",
  "context": {
    "currentRoomId": "room_ml_001" | null,
    "focusedArtifactId": "artifact_123" | null
  }
}
```

#### 6. Interrupt Current Response

```json
{
  "type": "interrupt"
}
```

#### 7. Artifact Interaction

```json
{
  "type": "artifact_click",
  "artifactId": "artifact_123",
  "roomId": "room_ml_001"
}
```

#### 8. Request Room Connection

```json
{
  "type": "request_connection",
  "fromRoomId": "room_ml_001",
  "toRoomId": "room_linalg_002"
}
```

---

### Server → Client

#### 1. Capture Acknowledgment

Sent when a concept is extracted during capture.

```json
{
  "type": "capture_ack",
  "sessionId": "session_uuid",
  "extraction": {
    "concept": "Attention mechanism",
    "confidence": 0.92,
    "timestamp": 1709337605000
  },
  "voiceResponse": "base64_encoded_audio" | null
}
```

#### 2. Capture Complete

```json
{
  "type": "capture_complete",
  "sessionId": "session_uuid",
  "summary": {
    "conceptCount": 5,
    "artifactsCreated": ["artifact_1", "artifact_2"],
    "roomsAffected": ["room_ml_001"],
    "newRoomsCreated": []
  },
  "voiceSummary": "base64_encoded_audio"
}
```

#### 3. Voice Response (streaming)

Interleaved response with voice and visuals.

```json
{
  "type": "response_chunk",
  "queryId": "query_uuid",
  "chunkIndex": 0,
  "content": {
    "audioChunk": "base64_encoded_audio" | null,
    "text": "Partial transcript..." | null,
    "generatedImage": {
      "url": "https://storage.../diagram.png",
      "position": { "x": 2.5, "y": 1.8, "z": -2.0 }
    } | null,
    "navigation": {
      "targetRoomId": "room_linalg_002",
      "highlightArtifacts": ["artifact_456"]
    } | null,
    "connectionCreated": {
      "fromRoomId": "room_ml_001",
      "toRoomId": "room_linalg_002",
      "reason": "Matrix multiplication is fundamental to attention"
    } | null
  },
  "isComplete": false
}
```

#### 4. Response Complete

```json
{
  "type": "response_complete",
  "queryId": "query_uuid"
}
```

#### 5. Artifact Recall Response

When user clicks an artifact.

```json
{
  "type": "artifact_recall",
  "artifactId": "artifact_123",
  "content": {
    "voiceNarration": "base64_encoded_audio",
    "summary": "This is from your study session on Tuesday...",
    "generatedDiagrams": [
      {
        "url": "https://storage.../attention_formula.png",
        "caption": "Scaled dot-product attention"
      }
    ],
    "relatedArtifacts": [
      {
        "artifactId": "artifact_456",
        "roomId": "room_linalg_002",
        "reason": "Uses matrix multiplication"
      }
    ]
  }
}
```

#### 6. Enrichment Update

When enrichment agent adds new data.

```json
{
  "type": "enrichment_update",
  "artifactId": "artifact_123",
  "enrichment": {
    "id": "enrichment_789",
    "sourceName": "Wikipedia",
    "sourceUrl": "https://en.wikipedia.org/...",
    "preview": "The Eiffel Tower was constructed...",
    "images": [
      {
        "url": "https://storage.../enrichment_img.jpg",
        "caption": "Eiffel Tower at night"
      }
    ]
  },
  "visualIndicator": {
    "artifactId": "artifact_123",
    "effect": "crystal_orb_pulse"
  }
}
```

#### 7. Error

```json
{
  "type": "error",
  "code": "CAPTURE_FAILED" | "QUERY_FAILED" | "UNAUTHORIZED" | "RATE_LIMITED",
  "message": "Human-readable error message",
  "retryable": true | false
}
```

#### 8. Palace State Update

Real-time sync of palace changes.

```json
{
  "type": "palace_update",
  "changes": {
    "roomsAdded": [{
      "id": "room_new_001",
      "name": "Computer Vision",
      "position": { "x": 20, "y": 0, "z": 10 },
      "style": "lab"
    }],
    "artifactsAdded": [{
      "id": "artifact_new_001",
      "roomId": "room_ml_001",
      "type": "document",
      "position": { "x": 3, "y": 1.5, "z": -2 },
      "visual": "floating_book",
      "summary": "CNN architecture notes"
    }],
    "connectionsAdded": [{
      "fromRoomId": "room_ml_001",
      "toRoomId": "room_new_001",
      "reason": "CNNs are used in computer vision"
    }]
  }
}
```

---

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `CAPTURE_FAILED` | Media processing error | Yes |
| `QUERY_FAILED` | AI response generation failed | Yes |
| `UNAUTHORIZED` | Invalid or expired token | No (re-auth) |
| `RATE_LIMITED` | Too many requests | Yes (backoff) |
| `SESSION_NOT_FOUND` | Invalid session ID | No |
| `ARTIFACT_NOT_FOUND` | Invalid artifact ID | No |
| `CONNECTION_LOST` | Backend connection dropped | Yes |

---

## Connection Lifecycle

```text
Client                                Server
   |                                     |
   |──── connect ────────────────────────>|
   |<─── connection accepted ─────────────|
   |                                     |
   |──── auth { token } ─────────────────>|
   |<─── auth_success ───────────────────|
   |                                     |
   |──── capture_start ──────────────────>|
   |──── media_chunk ────────────────────>|
   |<─── capture_ack ────────────────────|
   |──── media_chunk ────────────────────>|
   |<─── capture_ack ────────────────────|
   |──── capture_end ────────────────────>|
   |<─── capture_complete ───────────────|
   |                                     |
   |──── voice_query ────────────────────>|
   |<─── response_chunk (audio) ─────────|
   |<─── response_chunk (image) ─────────|
   |<─── response_complete ──────────────|
   |                                     |
   |──── interrupt ──────────────────────>|
   |<─── response interrupted ───────────|
   |                                     |
```

---

## Rate Limits

| Operation | Limit |
|-----------|-------|
| Media chunks | 30/second |
| Voice queries | 10/minute |
| Artifact clicks | 60/minute |
| Connection requests | 5/minute |

---

## Heartbeat

Client sends ping every 30 seconds:

```json
{
  "type": "ping"
}
```

Server responds:

```json
{
  "type": "pong",
  "serverTime": 1709337600000
}
```

Connection closed after 90 seconds of no activity.
