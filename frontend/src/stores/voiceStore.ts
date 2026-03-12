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

export interface ChatMessage {
  id: string;
  role: 'user' | 'rayan' | 'tool';
  text: string;
  toolName?: string;
}

export interface DiagramEntry {
  url: string;
  position: { x: number; y: number; z: number };
}

interface VoiceState {
  /** Current session status */
  status: VoiceStatus;
  /** Whether the microphone is muted (session stays open) */
  muted: boolean;

  /** Accumulated transcript text from live_text messages (legacy) */
  transcript: string;
  /** Chat conversation messages (user + rayan turns) */
  messages: ChatMessage[];
  /** Generated diagram images */
  diagrams: DiagramEntry[];
  /** Narration data from an artifact_recall message */
  currentNarration: ArtifactRecallMessage['content'] | null;
  /** Human-readable error message */
  error: string | null;
  /** Whether the conversation panel is visible */
  showPanel: boolean;
  /** Active tool call notification — cleared after display */
  toolActivity: { tool: string; label: string } | null;
  /** Synthesis overlay state */
  synthesisState: 'idle' | 'loading' | 'done';
  synthesisImageUrl: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  setStatus: (status: VoiceStatus) => void;
  setMuted: (muted: boolean) => void;

  appendTranscript: (text: string) => void;
  /** Append text to the last rayan message, or create a new one */
  appendRayanText: (text: string) => void;
  /** Append text to the last user message, or create a new one */
  appendUserText: (text: string) => void;
  /** Add an inline tool-call event to the conversation log */
  addToolEvent: (text: string, toolName: string) => void;
  addDiagram: (diagram: DiagramEntry) => void;
  setNarration: (narration: ArtifactRecallMessage['content'] | null) => void;
  setError: (error: string | null) => void;
  setToolActivity: (activity: { tool: string; label: string } | null) => void;
  setShowPanel: (show: boolean) => void;
  setSynthesisState: (state: 'idle' | 'loading' | 'done') => void;
  setSynthesisImageUrl: (url: string | null) => void;
  /** Reset transient state (transcript, diagrams) but keep session status */
  resetTranscript: () => void;
  /** Clear all messages from the conversation log */
  clearMessages: () => void;
  /** Full reset to disconnected state */
  reset: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const defaultState = {
  status: 'disconnected' as VoiceStatus,
  muted: false,

  transcript: '',
  messages: [] as ChatMessage[],
  diagrams: [] as DiagramEntry[],
  currentNarration: null,
  error: null,
  toolActivity: null as { tool: string; label: string } | null,
  showPanel: false,
  synthesisState: 'idle' as 'idle' | 'loading' | 'done',
  synthesisImageUrl: null as string | null,
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...defaultState,

  setStatus: (status) => set({ status }),
  setMuted: (muted) => set({ muted }),

  appendTranscript: (text) =>
    set((state) => ({ transcript: state.transcript ? `${state.transcript}${text}` : text })),
  appendRayanText: (text) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'rayan') {
        msgs[msgs.length - 1] = { ...last, text: last.text + text };
      } else {
        msgs.push({ id: `rayan-${Date.now()}`, role: 'rayan', text });
      }
      return { messages: msgs };
    }),
  appendUserText: (text) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'user') {
        msgs[msgs.length - 1] = { ...last, text: last.text + text };
      } else {
        msgs.push({ id: `user-${Date.now()}`, role: 'user', text });
      }
      return { messages: msgs };
    }),
  addToolEvent: (text, toolName) =>
    set((state) => ({
      messages: [...state.messages, { id: `tool-${Date.now()}`, role: 'tool', text, toolName }],
    })),
  addDiagram: (diagram) =>
    set((state) => ({ diagrams: [...state.diagrams, diagram] })),
  setNarration: (currentNarration) => set({ currentNarration }),
  setError: (error) => set({ error, status: 'error' }),
  setToolActivity: (toolActivity) => set({ toolActivity }),
  setShowPanel: (showPanel) => set({ showPanel }),
  setSynthesisState: (synthesisState) => set({ synthesisState }),
  setSynthesisImageUrl: (synthesisImageUrl) => set({ synthesisImageUrl }),
  resetTranscript: () => set({ transcript: '', diagrams: [], currentNarration: null }),
  clearMessages: () => set({ messages: [] }),
  reset: () => set(defaultState),
}));
