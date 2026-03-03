/**
 * Voice store — Zustand state for the US3 voice conversation feature.
 *
 * Tracks the full lifecycle of a voice query:
 *   idle → listening → processing → responding → idle
 *
 * Populated by:
 *   - useVoice hook (status transitions, audio playback)
 *   - useWS listener (response_chunk, response_complete, artifact_recall)
 */

import { create } from 'zustand';
import type { ArtifactRecallMessage } from '../services/websocket';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'responding' | 'error';

export interface DiagramEntry {
  url: string;
  position: { x: number; y: number; z: number };
}

interface VoiceState {
  /** Current UI status */
  status: VoiceStatus;
  /** UUID of the active query (set when listening starts) */
  activeQueryId: string | null;
  /** Accumulated transcript text from response_chunk messages */
  transcript: string;
  /** Generated diagram images from response_chunk messages */
  diagrams: DiagramEntry[];
  /** Narration data from an artifact_recall message */
  currentNarration: ArtifactRecallMessage['content'] | null;
  /** Human-readable error message */
  error: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  setStatus: (status: VoiceStatus) => void;
  setActiveQueryId: (queryId: string | null) => void;
  /** Append a text chunk to the transcript */
  appendTranscript: (text: string) => void;
  /** Add a generated diagram from a response_chunk */
  addDiagram: (diagram: DiagramEntry) => void;
  /** Set the narration received from an artifact_recall message */
  setNarration: (narration: ArtifactRecallMessage['content'] | null) => void;
  setError: (error: string | null) => void;
  /** Reset all transient state (call when a query completes or is interrupted) */
  reset: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const defaultState = {
  status: 'idle' as VoiceStatus,
  activeQueryId: null,
  transcript: '',
  diagrams: [] as DiagramEntry[],
  currentNarration: null,
  error: null,
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...defaultState,

  setStatus: (status) => set({ status }),
  setActiveQueryId: (activeQueryId) => set({ activeQueryId }),
  appendTranscript: (text) =>
    set((state) => ({ transcript: state.transcript ? `${state.transcript}${text}` : text })),
  addDiagram: (diagram) =>
    set((state) => ({ diagrams: [...state.diagrams, diagram] })),
  setNarration: (currentNarration) => set({ currentNarration }),
  setError: (error) => set({ error, status: 'error' }),
  reset: () => set(defaultState),
}));
