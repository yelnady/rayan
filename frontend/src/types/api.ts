import type { Artifact, CaptureSession, Enrichment, Layout, Palace, Room, UserPreferences } from './palace';

// ── Error ────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ── Palace ───────────────────────────────────────────────────────────────────

export interface GetPalaceResponse {
  palace: Palace;
  layout: Layout;
  rooms: Room[];
  artifacts: Record<string, Artifact[]>;
}

export interface CreatePalaceResponse {
  palace: Palace;
}

export interface UpdateLayoutRequest {
  lastCameraPosition?: { x: number; y: number; z: number };
  lastCameraRotation?: { pitch: number; yaw: number; roll: number };
  lastRoomId?: string;
}

export interface UpdateLayoutResponse {
  success: boolean;
}

// ── Rooms ────────────────────────────────────────────────────────────────────

export interface GetRoomResponse {
  room: Room;
  artifacts: Artifact[];
}

export interface RoomAccessResponse {
  success: boolean;
  lastAccessedAt: string;
}

// ── Artifacts ────────────────────────────────────────────────────────────────

export interface GetArtifactResponse {
  artifact: Artifact;
  enrichments: Enrichment[];
}

export interface DeleteArtifactResponse {
  success: boolean;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface ListSessionsParams {
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface ListSessionsResponse {
  sessions: CaptureSession[];
  nextCursor?: string;
}

export interface GetSessionResponse {
  session: CaptureSession;
  artifacts: Array<{ id: string; summary: string }>;
  roomsAffected: string[];
}

// ── Search ───────────────────────────────────────────────────────────────────

export interface SearchRequest {
  query: string;
  limit?: number;
  roomId?: string;
}

export interface SearchResult {
  artifactId: string;
  roomId: string;
  roomName: string;
  summary: string;
  similarity: number;
  highlight: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

// ── Enrichment ───────────────────────────────────────────────────────────────

export interface TriggerEnrichmentRequest {
  artifactId: string;
}

export interface TriggerEnrichmentResponse {
  status: string;
  message: string;
}

export interface UpdateEnrichmentRequest {
  verified: boolean;
}

export interface UpdateEnrichmentResponse {
  success: boolean;
}

// ── Preferences ───────────────────────────────────────────────────────────────

export interface GetPreferencesResponse {
  preferences: UserPreferences;
}

export interface UpdatePreferencesRequest {
  voiceEnabled?: boolean;
  enrichmentEnabled?: boolean;
  captureQuality?: 'low' | 'medium' | 'high';
  theme?: string;
}

export interface UpdatePreferencesResponse {
  preferences: UserPreferences;
}
