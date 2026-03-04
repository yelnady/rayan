import { create } from 'zustand';
import type { Artifact, Layout, Palace, Room } from '../types/palace';

interface PalaceState {
  palace: Palace | null;
  layout: Layout | null;
  rooms: Room[];
  artifacts: Record<string, Artifact[]>; // roomId → artifacts
  currentRoomId: string | null;
  loading: boolean;
  error: string | null;

  setPalace: (palace: Palace | null) => void;
  setLayout: (layout: Layout | null) => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  setArtifacts: (roomId: string, artifacts: Artifact[]) => void;
  setAllArtifacts: (artifacts: Record<string, Artifact[]>) => void;
  addArtifact: (artifact: Artifact) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePalaceStore = create<PalaceState>((set) => ({
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
  addRoom: (room) =>
    set((state) => ({
      rooms: [...state.rooms.filter((r) => r.id !== room.id), room],
    })),
  setArtifacts: (roomId, artifacts) =>
    set((state) => ({ artifacts: { ...state.artifacts, [roomId]: artifacts } })),
  setAllArtifacts: (artifacts) => set({ artifacts }),
  addArtifact: (artifact) =>
    set((state) => {
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
