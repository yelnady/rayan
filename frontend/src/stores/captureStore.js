import { create } from 'zustand';
const defaultState = {
    sessionId: null,
    status: 'idle',
    sourceType: 'webcam',
    concepts: [],
    summary: null,
    roomSuggestion: null,
    roomSuggestionResolver: null,
    error: null,
};
export const useCaptureStore = create((set) => ({
    ...defaultState,
    setSessionId: (sessionId) => set({ sessionId }),
    setStatus: (status) => set({ status }),
    setSourceType: (sourceType) => set({ sourceType }),
    addConcept: (extraction) => set((state) => ({ concepts: [...state.concepts, extraction] })),
    setSummary: (summary) => set({ summary }),
    setRoomSuggestion: (roomSuggestion, roomSuggestionResolver = undefined) => set({ roomSuggestion, roomSuggestionResolver: roomSuggestionResolver ?? null }),
    setError: (error) => set({ error }),
    reset: () => set(defaultState),
}));
