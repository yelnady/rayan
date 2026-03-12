// ── Shared geometry types ────────────────────────────────────────────────────

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Rotation3D {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface Dimensions3D {
  w: number;
  d: number;
  h: number;
}

// ── Enums ────────────────────────────────────────────────────────────────────

export type RoomStyle =
  | 'library' | 'lab' | 'gallery' | 'garden' | 'workshop'
  | 'museum' | 'observatory' | 'sanctuary' | 'studio' | 'dojo';

export type ArtifactType =
  // Knowledge & Learning
  | 'lecture' | 'document' | 'lesson' | 'insight' | 'question'
  // Experiences & Emotions
  | 'moment' | 'milestone' | 'emotion' | 'dream' | 'habit'
  // Opinions & Identity
  | 'conversation' | 'opinion' | 'visual' | 'media'
  // Goals
  | 'goal' | 'enrichment'
  // Synthesis
  | 'synthesis';

export type ArtifactVisual =
  // Procedural
  | 'floating_book' | 'hologram_frame' | 'framed_image' | 'speech_bubble' | 'crystal_orb'
  // Synthesis
  | 'synthesis_map'
  // GLB models
  | 'lesson' | 'brain' | 'question' | 'coffee' | 'milestone'
  | 'heart' | 'dream' | 'tree' | 'opinion' | 'headphones' | 'cash_stack';

export type CaptureQuality = 'low' | 'medium' | 'high';

export type WallPosition = 'north' | 'east' | 'south' | 'west';

export type CaptureSessionStatus = 'active' | 'processing' | 'completed' | 'failed';

export type CaptureSourceType = 'webcam' | 'screen_share' | 'upload' | 'text_input';

// ── Entities ─────────────────────────────────────────────────────────────────

export interface UserPreferences {
  voiceEnabled: boolean;
  enrichmentEnabled: boolean;
  captureQuality: CaptureQuality;
  theme: string;
}

export interface LobbyDoor {
  roomId: string;
  wallPosition: WallPosition;
  doorIndex: number;
}

export interface Corridor {
  fromRoomId: string;
  toRoomId: string;
  reason: string;
  createdAt?: string;
}

export interface Palace {
  id: string;
  userId: string;
  createdAt: string;
  lastModifiedAt: string;
  lobbyPosition: Position3D;
  roomCount: number;
  artifactCount: number;
}

export interface Layout {
  lobbyDoors: LobbyDoor[];
  corridors: Corridor[];
  lastCameraPosition?: Position3D;
  lastCameraRotation?: Rotation3D;
  lastRoomId?: string;
}

export interface Room {
  id: string;
  name: string;
  style?: RoomStyle;
  position: Position3D;
  dimensions: Dimensions3D;
  connections: string[];
  createdAt?: string;
  lastAccessedAt?: string;
  artifactCount: number;
  topicKeywords?: string[];
  summary?: string;
  firstMemoryAt?: string;
  lastMemoryAt?: string;
}

export interface Artifact {
  id: string;
  roomId: string;
  type: ArtifactType;
  position: Position3D;
  visual: ArtifactVisual;
  title?: string;
  keywords?: string[];
  summary: string;
  fullContent?: string;
  sourceMediaUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  captureSessionId?: string;
  enrichments?: string[];
  relatedArtifacts?: string[];
  color?: string;
  wall?: WallPosition | 'center';
  capturedAt?: string;
}

export interface EnrichmentImage {
  url: string;
  caption: string;
  sourceUrl?: string;
}

export interface Enrichment {
  id: string;
  artifactId: string;
  sourceUrl: string;
  sourceName: string;
  extractedContent: string;
  images?: EnrichmentImage[];
  createdAt: string;
  relevanceScore: number;
  verified?: boolean;
}

export interface CaptureSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  status: CaptureSessionStatus;
  sourceType: CaptureSourceType;
  rawMediaUrl?: string;
  extractedArtifactIds: string[];
  conceptCount: number;
  durationSeconds?: number;
}
