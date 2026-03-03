import { create } from 'zustand';
export const usePalaceStore = create((set) => ({
    palace: null,
    layout: null,
    rooms: [],
    artifacts: {},
    currentRoomId: null,
    loading: false,
    error: null,
    setPalace: (palace) => set({ palace }),
    setLayout: (layout) => set({ layout }),
    setRooms: (rooms) => set({ rooms }),
    addRoom: (room) => set((state) => ({
        rooms: [...state.rooms.filter((r) => r.id !== room.id), room],
    })),
    setArtifacts: (roomId, artifacts) => set((state) => ({ artifacts: { ...state.artifacts, [roomId]: artifacts } })),
    addArtifact: (artifact) => set((state) => {
        const existing = state.artifacts[artifact.roomId] ?? [];
        return {
            artifacts: {
                ...state.artifacts,
                [artifact.roomId]: [...existing.filter((a) => a.id !== artifact.id), artifact],
            },
        };
    }),
    setCurrentRoomId: (currentRoomId) => set({ currentRoomId }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));
