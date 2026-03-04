/**
 * Voice store — Zustand state for the voice conversation feature.
 *
 * Tracks the full lifecycle of a live streaming session:
 *   disconnected → connecting → connected → responding → connected
 *
 * Populated by:
 *   - useVoice hook (status transitions, mute state)
 *   - useWS listener (live_audio, live_text, live_interrupted, live_turn_complete)
 */

import { create } from 'zustand';
import type { ArtifactRecallMessage } from '../services/websocket';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'responding' | 'error';

export interface DiagramEntry {
  url: string;
  position: { x: number; y: number; z: number };
}

interface VoiceState {
  /** Current session status */
  status: VoiceStatus;
  /** Whether the microphone is muted (session stays open) */
  muted: boolean;
  /** UUID of the active query (kept for backward compat with text_query) */
  activeQueryId: string | null;
  /** Accumulated transcript text from live_text messages */
  transcript: string;
  /** Generated diagram images */
  diagrams: DiagramEntry[];
  /** Narration data from an artifact_recall message */
  currentNarration: ArtifactRecallMessage['content'] | null;
  /** Human-readable error message */
  error: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  setStatus: (status: VoiceStatus) => void;
  setMuted: (muted: boolean) => void;
  setActiveQueryId: (queryId: string | null) => void;
  appendTranscript: (text: string) => void;
  addDiagram: (diagram: DiagramEntry) => void;
  setNarration: (narration: ArtifactRecallMessage['content'] | null) => void;
  setError: (error: string | null) => void;
  /** Reset transient state (transcript, diagrams) but keep session status */
  resetTranscript: () => void;
  /** Full reset to disconnected state */
  reset: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const defaultState = {
  status: 'disconnected' as VoiceStatus,
  muted: false,
  activeQueryId: null,
  transcript: '',
  diagrams: [] as DiagramEntry[],
  currentNarration: null,
  error: null,
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...defaultState,

  setStatus: (status) => set({ status }),
  setMuted: (muted) => set({ muted }),
  setActiveQueryId: (activeQueryId) => set({ activeQueryId }),
  appendTranscript: (text) =>
    set((state) => ({ transcript: state.transcript ? `${state.transcript}${text}` : text })),
  addDiagram: (diagram) =>
    set((state) => ({ diagrams: [...state.diagrams, diagram] })),
  setNarration: (currentNarration) => set({ currentNarration }),
  setError: (error) => set({ error, status: 'error' }),
  resetTranscript: () => set({ transcript: '', diagrams: [], currentNarration: null }),
  reset: () => set(defaultState),
}));
