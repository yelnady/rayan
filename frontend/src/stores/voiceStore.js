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
// ── Store ─────────────────────────────────────────────────────────────────────
const defaultState = {
    status: 'disconnected',
    muted: false,
    activeQueryId: null,
    transcript: '',
    diagrams: [],
    currentNarration: null,
    error: null,
};
export const useVoiceStore = create((set) => ({
    ...defaultState,
    setStatus: (status) => set({ status }),
    setMuted: (muted) => set({ muted }),
    setActiveQueryId: (activeQueryId) => set({ activeQueryId }),
    appendTranscript: (text) => set((state) => ({ transcript: state.transcript ? `${state.transcript}${text}` : text })),
    addDiagram: (diagram) => set((state) => ({ diagrams: [...state.diagrams, diagram] })),
    setNarration: (currentNarration) => set({ currentNarration }),
    setError: (error) => set({ error, status: 'error' }),
    resetTranscript: () => set({ transcript: '', diagrams: [], currentNarration: null }),
    reset: () => set(defaultState),
}));
