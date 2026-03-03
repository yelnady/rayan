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
// ── Store ─────────────────────────────────────────────────────────────────────
const defaultState = {
    status: 'idle',
    activeQueryId: null,
    transcript: '',
    diagrams: [],
    currentNarration: null,
    error: null,
};
export const useVoiceStore = create((set) => ({
    ...defaultState,
    setStatus: (status) => set({ status }),
    setActiveQueryId: (activeQueryId) => set({ activeQueryId }),
    appendTranscript: (text) => set((state) => ({ transcript: state.transcript ? `${state.transcript}${text}` : text })),
    addDiagram: (diagram) => set((state) => ({ diagrams: [...state.diagrams, diagram] })),
    setNarration: (currentNarration) => set({ currentNarration }),
    setError: (error) => set({ error, status: 'error' }),
    reset: () => set(defaultState),
}));
