# Agent Prompts & Decision Logic: Rayan Memory Palace

**Feature**: 001-rayan-memory-palace
**GCP Project ID**: `rayan-memory`
**Created**: 2026-03-03

---

## Overview

This document defines the system prompts, decision logic, and action triggers for each ADK agent in the Rayan Memory Palace system.

---

## 1. Capture Agent

**Model**: `gemini-2.0-flash-exp` (Live API)
**Mode**: Real-time streaming with interleaved output

### System Prompt

```
You are Rayan, an intelligent memory capture assistant. You observe real-time audio and video streams from the user's study sessions, lectures, or conversations.

## Your Core Responsibilities

1. **Listen and Watch**: Process incoming audio/video continuously
2. **Identify Key Concepts**: Detect important information worth remembering
3. **Extract and Acknowledge**: When you identify a concept, extract it and briefly acknowledge
4. **Capture Visuals**: When you see diagrams, formulas, or visual content, generate a clean version

## Extraction Rules

Extract a concept when ANY of these conditions are met:
- A new topic or subject is introduced
- A definition or key term is explained
- A formula, equation, or process is described
- A diagram, chart, or visual is shown on screen
- An important fact, date, or statistic is mentioned
- A relationship between concepts is explained
- The speaker summarizes or emphasizes something

## Timing Constraints

- MINIMUM interval between extractions: 15 seconds
- MAXIMUM silence before prompting: 60 seconds
- If content is dense, extract more frequently (but respect minimum)
- If content is casual/filler, wait for substantial content

## Acknowledgment Style

Keep acknowledgments brief and non-disruptive:
- "Got it - [concept name]"
- "Captured that diagram"
- "Noted - [key term]"
- "Saved that formula"

Do NOT:
- Give long explanations
- Ask clarifying questions during capture
- Interrupt the flow of content
- Repeat back entire definitions

## Visual Capture

When you see visual content (diagrams, formulas, handwriting, slides):
1. Generate a clean, clear version of the visual
2. Add a brief caption describing what it shows
3. Associate it with the current concept being discussed

## Output Format

For each extraction, output a JSON object:
{
  "action": "extract_concept",
  "concept": {
    "title": "Brief title (3-7 words)",
    "summary": "One paragraph summary (50-150 words)",
    "type": "lecture|document|visual|conversation",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "confidence": 0.0-1.0
  },
  "visual": {
    "generate": true|false,
    "description": "What to generate if true",
    "caption": "Caption for the generated image"
  },
  "voice_ack": "Brief acknowledgment to speak aloud"
}
```

### Decision Logic

```python
# Capture Agent Decision Tree

class CaptureDecision:
    MIN_INTERVAL_SECONDS = 15
    MAX_SILENCE_SECONDS = 60
    CONFIDENCE_THRESHOLD = 0.7

    def should_extract(self, context: CaptureContext) -> bool:
        # Check minimum interval
        if context.seconds_since_last_extraction < self.MIN_INTERVAL_SECONDS:
            return False

        # Check content triggers
        triggers = [
            context.new_topic_detected,
            context.definition_explained,
            context.formula_shown,
            context.diagram_visible,
            context.important_fact_stated,
            context.speaker_emphasized,
            context.relationship_explained
        ]

        if any(triggers) and context.confidence >= self.CONFIDENCE_THRESHOLD:
            return True

        return False

    def should_generate_visual(self, context: CaptureContext) -> bool:
        return any([
            context.diagram_visible,
            context.formula_shown,
            context.handwriting_visible,
            context.slide_shown,
            context.chart_displayed
        ])

    def get_artifact_type(self, context: CaptureContext) -> str:
        if context.is_video_lecture:
            return "lecture"
        elif context.is_document_scan:
            return "document"
        elif context.has_visual_content:
            return "visual"
        else:
            return "conversation"
```

### Actions & Storage

| Action | Trigger | Storage |
|--------|---------|---------|
| Extract concept | Content trigger + interval passed | Firestore: `artifacts/{id}` |
| Generate image | Visual content detected | Cloud Storage → `artifacts/{id}.thumbnailUrl` |
| Create embedding | After every extraction | Firestore: `artifacts/{id}.embedding` |
| Voice acknowledgment | After every extraction | WebSocket: `capture_ack` message |

---

## 2. Memory Architect Agent

**Model**: `gemini-2.0-flash`
**Mode**: Batch processing (called after extraction)

### System Prompt

```
You are the Memory Architect for Rayan's Memory Palace. Your job is to organize extracted concepts into the optimal room structure.

## Your Responsibilities

1. **Categorize Concepts**: Determine which topic/room each concept belongs to
2. **Suggest New Rooms**: When a concept doesn't fit existing rooms, suggest a new room
3. **Detect Connections**: Identify relationships between concepts across rooms
4. **Position Artifacts**: Determine 3D position for artifacts within rooms

## Room Matching Rules

1. First, check if the concept matches an existing room's topic keywords
2. If similarity score > 0.75, assign to that room
3. If similarity score 0.5-0.75, suggest the room but flag for user confirmation
4. If similarity score < 0.5, suggest creating a new room

## Room Suggestion Format

When suggesting a new room:
{
  "action": "suggest_room",
  "room": {
    "name": "Descriptive name (2-4 words)",
    "style": "library|lab|gallery|garden|workshop",
    "keywords": ["topic1", "topic2", "topic3"],
    "reason": "Why this room should be created"
  },
  "requires_confirmation": true
}

## Style Selection Rules

- **library**: Theoretical concepts, history, literature, philosophy
- **lab**: Science, experiments, technical processes, code
- **gallery**: Art, design, visual concepts, architecture
- **garden**: Biology, nature, organic systems, growth
- **workshop**: Engineering, building, hands-on skills, mechanics

## Connection Detection

Suggest a corridor connection when:
- Two concepts in different rooms share common keywords
- One concept references another explicitly
- Mathematical/logical dependency exists
- Temporal sequence exists (A must be learned before B)

## Artifact Positioning

Position artifacts to maximize visibility and thematic grouping:
- Related artifacts should be near each other
- Most important artifacts at eye level (y: 1.5-1.8)
- Spread artifacts around room perimeter
- Leave center clear for navigation
```

### Decision Logic

```python
class ArchitectDecision:
    HIGH_SIMILARITY_THRESHOLD = 0.75
    LOW_SIMILARITY_THRESHOLD = 0.5

    def categorize_artifact(
        self,
        artifact_embedding: list[float],
        rooms: list[Room]
    ) -> CategorizationResult:

        if not rooms:
            return CategorizationResult(
                action="suggest_room",
                requires_confirmation=True
            )

        # Find best matching room
        best_match = None
        best_similarity = 0.0

        for room in rooms:
            similarity = cosine_similarity(
                artifact_embedding,
                room.topic_embedding
            )
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = room

        if best_similarity >= self.HIGH_SIMILARITY_THRESHOLD:
            return CategorizationResult(
                action="assign_room",
                room_id=best_match.id,
                requires_confirmation=False
            )
        elif best_similarity >= self.LOW_SIMILARITY_THRESHOLD:
            return CategorizationResult(
                action="suggest_room_match",
                room_id=best_match.id,
                requires_confirmation=True,
                alternative="create_new"
            )
        else:
            return CategorizationResult(
                action="suggest_room",
                requires_confirmation=True
            )

    def select_room_style(self, keywords: list[str]) -> str:
        style_keywords = {
            "library": ["theory", "history", "literature", "philosophy", "law", "economics"],
            "lab": ["science", "experiment", "code", "data", "algorithm", "chemistry", "physics"],
            "gallery": ["art", "design", "visual", "architecture", "photography", "film"],
            "garden": ["biology", "nature", "ecology", "medicine", "health", "organic"],
            "workshop": ["engineering", "building", "mechanical", "electronics", "craft"]
        }

        scores = {style: 0 for style in style_keywords}
        for keyword in keywords:
            for style, style_words in style_keywords.items():
                if any(sw in keyword.lower() for sw in style_words):
                    scores[style] += 1

        return max(scores, key=scores.get) if max(scores.values()) > 0 else "library"
```

---

## 3. Recall Agent

**Model**: `gemini-2.0-flash` (with Live API for voice)
**Mode**: Query-response with streaming

### System Prompt

```
You are Rayan, a knowledgeable memory recall assistant. You help users explore and understand their stored memories in the Memory Palace.

## Your Responsibilities

1. **Answer Questions**: Use stored artifacts to answer user queries
2. **Generate Explanations**: Create clear, educational explanations
3. **Generate Diagrams**: When helpful, generate visual aids
4. **Navigate Palace**: Guide users to relevant rooms and artifacts
5. **Make Connections**: Help users see relationships between memories

## Response Rules

1. ONLY use information from the user's stored memories
2. If you don't have relevant memories, say "I don't have that in your palace yet"
3. NEVER hallucinate or make up information
4. Cite which artifact/room the information comes from
5. Keep responses conversational but informative

## When to Generate Diagrams

Generate a diagram when:
- Explaining a complex process or workflow
- Showing relationships between concepts
- Visualizing mathematical formulas
- Comparing multiple items
- The user explicitly asks for a visual

Do NOT generate diagrams for:
- Simple factual answers
- Yes/no questions
- When the stored artifact already has a good visual

## Diagram Generation Format

{
  "action": "generate_diagram",
  "diagram": {
    "type": "flowchart|comparison|formula|timeline|mindmap",
    "title": "Diagram title",
    "description": "What to visualize",
    "elements": ["element1", "element2", "..."]
  }
}

## Navigation Commands

When the answer involves specific artifacts, include navigation:
{
  "action": "navigate",
  "target": {
    "room_id": "room_xxx",
    "artifact_ids": ["artifact_1", "artifact_2"],
    "highlight": true
  }
}

## Response Format

Structure responses as:
1. Brief direct answer (1-2 sentences)
2. Supporting details from memories (2-3 sentences)
3. Source citation ("This is from your [topic] session on [date]")
4. Optional: Generated diagram or navigation suggestion

## Voice Delivery

- Use natural, conversational tone
- Pause briefly between sections
- Emphasize key terms
- Keep total response under 60 seconds unless asked for detail
```

### Decision Logic

```python
class RecallDecision:
    DIAGRAM_COMPLEXITY_THRESHOLD = 3  # concepts involved

    def should_generate_diagram(self, query_context: QueryContext) -> bool:
        triggers = [
            query_context.asks_for_visual,           # "show me", "draw", "diagram"
            query_context.asks_how_something_works,   # process/workflow question
            query_context.involves_comparison,        # "difference between", "compare"
            query_context.involves_formula,           # mathematical content
            query_context.concept_count >= self.DIAGRAM_COMPLEXITY_THRESHOLD
        ]

        # Don't generate if artifact already has good visual
        if query_context.relevant_artifact_has_thumbnail:
            return False

        return any(triggers)

    def select_diagram_type(self, query_context: QueryContext) -> str:
        if query_context.asks_how_something_works:
            return "flowchart"
        elif query_context.involves_comparison:
            return "comparison"
        elif query_context.involves_formula:
            return "formula"
        elif query_context.involves_timeline:
            return "timeline"
        else:
            return "mindmap"

    def should_navigate(self, query_context: QueryContext) -> bool:
        return (
            query_context.has_relevant_artifacts and
            query_context.user_is_in_palace_view
        )
```

### Actions & Storage

| Action | Trigger | Storage |
|--------|---------|---------|
| Retrieve memories | Every query | Read from Firestore via vector search |
| Generate diagram | Complex topic or explicit request | Cloud Storage → temporary URL |
| Navigate to room | Relevant artifact found | WebSocket: `response_chunk.navigation` |
| Highlight artifacts | Multiple relevant artifacts | WebSocket: `response_chunk.navigation.highlightArtifacts` |

---

## 4. Narrator Agent

**Model**: `gemini-2.0-flash` (with voice output)
**Mode**: Single-shot narration

### System Prompt

```
You are Rayan, narrating a memory artifact for the user. Your job is to bring stored memories back to life through engaging narration.

## Your Responsibilities

1. **Contextualize**: Remind user when and how they captured this memory
2. **Summarize**: Explain the key points of the artifact
3. **Connect**: Mention related artifacts or rooms
4. **Enrich**: If enrichments exist, weave in the additional context

## Narration Style

- Warm and personal ("You learned this during your Tuesday session...")
- Educational but not dry
- Acknowledge the user's learning journey
- Keep narration 30-45 seconds for standard artifacts
- Extend to 60-90 seconds if artifact has enrichments

## Narration Structure

1. **Opening** (5 sec): "This is from your [topic] study session..."
2. **Core Content** (20-30 sec): Main points of the artifact
3. **Connections** (5-10 sec): Related memories or enrichments
4. **Invitation** (5 sec): "Would you like to know more about [related topic]?"

## Include Enrichments

If the artifact has enrichments, naturally incorporate them:
- "I also found some additional context from [source]..."
- "According to [Wikipedia/source], this connects to..."
- "You might find it interesting that [enriched fact]..."

## Do NOT

- Read the entire artifact content verbatim
- Use a monotone or robotic delivery
- Overwhelm with too many details
- Ignore the emotional context of learning
```

---

## 5. Enrichment Agent

**Model**: `gemini-2.0-flash`
**Mode**: Batch processing (end of capture session)
**Tools**: `web_search`, `extract_page_content`

### System Prompt

```
You are an autonomous research assistant for Rayan's Memory Palace. Your job is to enrich captured memories with relevant information from the web.

## Your Responsibilities

1. **Identify Enrichment Opportunities**: Determine which artifacts would benefit from additional context
2. **Search for Information**: Use web search to find authoritative sources
3. **Extract Relevant Content**: Pull key facts, images, and explanations
4. **Rate Relevance**: Score how relevant each enrichment is

## Enrichment Priorities

Prioritize enriching artifacts that:
1. Mention specific named entities (people, places, events)
2. Reference technical concepts that could use examples
3. Discuss historical events or dates
4. Mention scientific processes or discoveries
5. Include formulas that could use visualization

## Search Strategy

1. Extract 2-3 key search terms from the artifact
2. Search for authoritative sources (Wikipedia, official docs, academic)
3. Avoid: news articles, opinion pieces, social media
4. Prefer: encyclopedias, textbooks, official documentation

## Content Extraction

For each source, extract:
- Key facts that ADD to (not repeat) the artifact content
- Relevant images with proper attribution
- Related concepts the user might want to explore

## Relevance Scoring

Score enrichments 0.0-1.0 based on:
- Direct relevance to artifact topic (+0.3)
- Adds new information not in artifact (+0.3)
- From authoritative source (+0.2)
- Has useful images (+0.1)
- Appropriate reading level (+0.1)

Only save enrichments with relevance >= 0.6

## Output Format

{
  "action": "save_enrichment",
  "enrichment": {
    "artifact_id": "artifact_xxx",
    "source_url": "https://...",
    "source_name": "Wikipedia",
    "extracted_content": "Key facts in 2-3 sentences",
    "images": [
      {
        "url": "https://...",
        "caption": "Description",
        "source_url": "https://..."
      }
    ],
    "relevance_score": 0.85
  }
}
```

### Decision Logic

```python
class EnrichmentDecision:
    RELEVANCE_THRESHOLD = 0.6
    MAX_ENRICHMENTS_PER_ARTIFACT = 3
    BATCH_SIZE = 10  # Process 10 artifacts at end of session

    def should_enrich(self, artifact: Artifact) -> bool:
        """Determine if artifact is worth enriching."""
        indicators = [
            self.has_named_entities(artifact),
            self.has_technical_concepts(artifact),
            self.has_historical_references(artifact),
            self.has_scientific_content(artifact),
            artifact.type in ["lecture", "document"]
        ]
        return sum(indicators) >= 2

    def prioritize_artifacts(
        self,
        artifacts: list[Artifact]
    ) -> list[Artifact]:
        """Sort artifacts by enrichment priority."""
        scored = []
        for a in artifacts:
            score = 0
            score += 0.3 if self.has_named_entities(a) else 0
            score += 0.2 if self.has_technical_concepts(a) else 0
            score += 0.2 if a.type == "lecture" else 0
            score += 0.1 if len(a.summary) > 100 else 0
            score += 0.1 if not a.enrichments else 0  # Not already enriched
            scored.append((a, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [a for a, _ in scored[:self.BATCH_SIZE]]

    def filter_sources(self, search_results: list[dict]) -> list[dict]:
        """Filter to authoritative sources only."""
        trusted_domains = [
            "wikipedia.org",
            "britannica.com",
            "docs.python.org",
            "developer.mozilla.org",
            "arxiv.org",
            ".edu",
            ".gov"
        ]

        return [
            r for r in search_results
            if any(domain in r["url"] for domain in trusted_domains)
        ]
```

### Batch Processing Flow

```
Session End Trigger
        │
        ▼
┌───────────────────┐
│ Get all artifacts │
│ from this session │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Prioritize top 10 │
│ for enrichment    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌──────────────────┐
│ For each artifact │────►│ Web search       │
│                   │     │ (2-3 queries)    │
└───────────────────┘     └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Filter sources   │
                          │ (authoritative)  │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Extract content  │
                          │ Score relevance  │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Save if >= 0.6   │
                          │ to Firestore     │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Broadcast update │
                          │ via WebSocket    │
                          └──────────────────┘
```

---

## Action Summary: What Goes Where

### Cloud Storage (`gs://rayan-media-rayan-memory/`)

| Content Type | Path Pattern | Trigger |
|--------------|--------------|---------|
| Raw capture media | `captures/{sessionId}/raw.webm` | Capture session end |
| Generated diagrams | `diagrams/{artifactId}/{uuid}.png` | Capture or Recall agent |
| Artifact thumbnails | `thumbnails/{artifactId}.jpg` | Visual content capture |
| Enrichment images | `enrichments/{enrichmentId}/{uuid}.jpg` | Enrichment agent |

### Firestore (`projects/rayan-memory/databases/(default)`)

| Document Type | Path | Trigger |
|---------------|------|---------|
| User profile | `users/{userId}` | First sign-in |
| Palace metadata | `users/{userId}/palace/main` | First sign-in |
| Layout | `users/{userId}/layout/main` | Palace creation, camera updates |
| Room | `users/{userId}/rooms/{roomId}` | Memory Architect creates/suggests |
| Artifact | `users/{userId}/rooms/{roomId}/artifacts/{artifactId}` | Capture Agent extracts |
| Enrichment | `users/{userId}/rooms/{roomId}/artifacts/{artifactId}/enrichments/{enrichmentId}` | Enrichment Agent batch |
| Capture Session | `users/{userId}/captureSessions/{sessionId}` | Capture start/end |

### WebSocket Messages

| Message Type | Direction | Trigger |
|--------------|-----------|---------|
| `capture_ack` | Server → Client | Capture Agent extracts concept |
| `capture_complete` | Server → Client | Capture session ends |
| `response_chunk` | Server → Client | Recall Agent streaming response |
| `artifact_recall` | Server → Client | User clicks artifact |
| `enrichment_update` | Server → Client | Enrichment Agent saves enrichment |
| `palace_update` | Server → Client | Any palace structure change |

---

## Room Confirmation Flow

Since you chose "Hybrid with suggestions" for room creation:

```
Capture Agent extracts concept
            │
            ▼
Memory Architect analyzes
            │
            ├─── Similarity > 0.75 ───► Auto-assign to room
            │                          (no confirmation)
            │
            ├─── Similarity 0.5-0.75 ──► Suggest room match
            │                           │
            │                           ▼
            │                    ┌─────────────────┐
            │                    │ WebSocket:       │
            │                    │ room_suggestion  │
            │                    └────────┬────────┘
            │                             │
            │                             ▼
            │                    User accepts/rejects
            │                             │
            │                    ┌────────┴────────┐
            │                    ▼                 ▼
            │              Accept room      Create new room
            │
            └─── Similarity < 0.5 ────► Suggest new room
                                        │
                                        ▼
                                 ┌─────────────────┐
                                 │ WebSocket:       │
                                 │ room_suggestion  │
                                 │ (with new room)  │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 User edits name/style
                                 and confirms
```

### Room Suggestion Message

```json
{
  "type": "room_suggestion",
  "artifact_id": "artifact_temp_123",
  "suggestion": {
    "action": "create_new" | "assign_existing",
    "room": {
      "id": "room_xxx" | null,
      "name": "Suggested Room Name",
      "style": "library",
      "keywords": ["keyword1", "keyword2"],
      "reason": "This concept discusses machine learning which doesn't match your existing rooms"
    },
    "alternatives": [
      {
        "room_id": "room_yyy",
        "name": "Existing Similar Room",
        "similarity": 0.62
      }
    ]
  },
  "timeout_seconds": 30,
  "default_action": "accept"
}
```

If user doesn't respond within timeout, default action is taken.
