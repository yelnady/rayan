# Firestore Schema Contract: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**Database**: Firestore (Native Mode)
**Created**: 2026-03-02

## Collection Structure

```text
users/{userId}
├── email: string
├── displayName: string?
├── avatarUrl: string?
├── createdAt: timestamp
├── lastActiveAt: timestamp
├── preferences: map
│   ├── voiceEnabled: boolean
│   ├── enrichmentEnabled: boolean
│   ├── captureQuality: string ("low"|"medium"|"high")
│   └── theme: string
│
├── palace (subcollection: single document)
│   └── main
│       ├── createdAt: timestamp
│       ├── lastModifiedAt: timestamp
│       ├── lobbyPosition: map { x, y, z }
│       ├── roomCount: number
│       └── artifactCount: number
│
├── layout (subcollection: single document)
│   └── main
│       ├── lobbyDoors: array
│       │   └── { roomId, wallPosition, doorIndex }
│       ├── corridors: array
│       │   └── { fromRoomId, toRoomId, reason, createdAt }
│       ├── lastCameraPosition: map { x, y, z }?
│       ├── lastCameraRotation: map { pitch, yaw, roll }?
│       └── lastRoomId: string?
│
├── rooms (subcollection)
│   └── {roomId}
│       ├── name: string
│       ├── position: map { x, y, z }
│       ├── dimensions: map { w, d, h }
│       ├── style: string ("library"|"lab"|"gallery"|"garden"|"workshop")
│       ├── connections: array<string>
│       ├── createdAt: timestamp
│       ├── lastAccessedAt: timestamp
│       ├── artifactCount: number
│       ├── topicKeywords: array<string>
│       └── topicEmbedding: array<number> (768d)
│
│       └── artifacts (subcollection)
│           └── {artifactId}
│               ├── type: string ("lecture"|"document"|"visual"|"conversation"|"enrichment")
│               ├── position: map { x, y, z }
│               ├── visual: string ("floating_book"|"hologram_frame"|"framed_image"|"speech_bubble"|"crystal_orb")
│               ├── summary: string
│               ├── fullContent: string?
│               ├── embedding: array<number> (768d)
│               ├── sourceMediaUrl: string?
│               ├── thumbnailUrl: string?
│               ├── createdAt: timestamp
│               ├── captureSessionId: string?
│               ├── relatedArtifacts: array<string>?
│               └── color: string?
│
│               └── enrichments (subcollection)
│                   └── {enrichmentId}
│                       ├── sourceUrl: string
│                       ├── sourceName: string
│                       ├── extractedContent: string
│                       ├── images: array
│                       │   └── { url, caption, sourceUrl }
│                       ├── createdAt: timestamp
│                       ├── relevanceScore: number
│                       └── verified: boolean?
│
└── captureSessions (subcollection)
    └── {sessionId}
        ├── startedAt: timestamp
        ├── endedAt: timestamp?
        ├── status: string ("active"|"processing"|"completed"|"failed")
        ├── sourceType: string ("webcam"|"screen_share"|"upload"|"text_input")
        ├── rawMediaUrl: string?
        ├── extractedArtifactIds: array<string>
        ├── conceptCount: number
        └── durationSeconds: number?
```

---

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Palace subcollection
      match /palace/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Layout subcollection
      match /layout/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Rooms subcollection
      match /rooms/{roomId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Artifacts subcollection
        match /artifacts/{artifactId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;

          // Enrichments subcollection
          match /enrichments/{enrichmentId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }

      // Capture sessions subcollection
      match /captureSessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Indexes

### Composite Indexes

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "rooms",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "artifacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "artifacts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "captureSessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "enrichments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "relevanceScore", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "rooms",
      "fieldPath": "topicKeywords",
      "indexes": [
        { "queryScope": "COLLECTION", "arrayConfig": "CONTAINS" }
      ]
    }
  ]
}
```

---

## Query Patterns

### 1. Load Palace with Rooms

```python
# Get palace and layout
palace_ref = db.collection('users').document(user_id)
palace_doc = palace_ref.collection('palace').document('main').get()
layout_doc = palace_ref.collection('layout').document('main').get()

# Get all rooms (batch)
rooms = palace_ref.collection('rooms').get()
```

### 2. Load Room with Artifacts

```python
room_ref = db.collection('users').document(user_id).collection('rooms').document(room_id)
room_doc = room_ref.get()

# Get artifacts sorted by creation time
artifacts = room_ref.collection('artifacts').order_by('createdAt', direction='DESCENDING').get()
```

### 3. Search by Topic Keywords

```python
rooms = db.collection('users').document(user_id) \
    .collection('rooms') \
    .where('topicKeywords', 'array_contains', 'machine learning') \
    .get()
```

### 4. Get Recent Capture Sessions

```python
sessions = db.collection('users').document(user_id) \
    .collection('captureSessions') \
    .where('status', '==', 'completed') \
    .order_by('startedAt', direction='DESCENDING') \
    .limit(20) \
    .get()
```

### 5. Get Enrichments for Artifact

```python
enrichments = db.collection('users').document(user_id) \
    .collection('rooms').document(room_id) \
    .collection('artifacts').document(artifact_id) \
    .collection('enrichments') \
    .order_by('relevanceScore', direction='DESCENDING') \
    .get()
```

---

## Denormalization Strategy

### Room-Level Counts

`artifactCount` is denormalized to `rooms/{roomId}` for efficient display without loading all artifacts.

**Update Pattern**:
```python
# When adding artifact
room_ref.update({
    'artifactCount': firestore.Increment(1)
})

# When deleting artifact
room_ref.update({
    'artifactCount': firestore.Increment(-1)
})
```

### Palace-Level Counts

`roomCount` and `artifactCount` are denormalized to `palace/main` for dashboard display.

---

## Batch Operations

### Create Room with Door

```python
batch = db.batch()

# Create room
room_ref = palace_ref.collection('rooms').document()
batch.set(room_ref, {
    'name': 'Machine Learning',
    'position': {'x': 10, 'y': 0, 'z': 0},
    'dimensions': {'w': 8, 'd': 8, 'h': 4},
    'style': 'library',
    'connections': [],
    'createdAt': firestore.SERVER_TIMESTAMP,
    'lastAccessedAt': firestore.SERVER_TIMESTAMP,
    'artifactCount': 0,
    'topicKeywords': ['neural networks', 'deep learning'],
    'topicEmbedding': embedding_vector
})

# Add lobby door
layout_ref = palace_ref.collection('layout').document('main')
batch.update(layout_ref, {
    'lobbyDoors': firestore.ArrayUnion([{
        'roomId': room_ref.id,
        'wallPosition': 'north',
        'doorIndex': 0
    }])
})

# Increment room count
palace_doc_ref = palace_ref.collection('palace').document('main')
batch.update(palace_doc_ref, {
    'roomCount': firestore.Increment(1),
    'lastModifiedAt': firestore.SERVER_TIMESTAMP
})

batch.commit()
```

---

## Size Limits

| Field | Max Size |
|-------|----------|
| `summary` | 500 characters |
| `fullContent` | 50 KB |
| `embedding` | 768 floats (~6 KB) |
| `topicKeywords` | 20 items |
| `lobbyDoors` | 50 items |
| `corridors` | 100 items |
| `connections` | 10 items per room |
| `relatedArtifacts` | 20 items |

---

## TTL / Cleanup

- `captureSessions` with status "failed": Delete after 7 days
- `captureSessions` with status "completed": Keep indefinitely
- `rawMediaUrl` references: Cleanup via Cloud Function if session deleted
