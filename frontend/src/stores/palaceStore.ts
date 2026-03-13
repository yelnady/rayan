import { create } from 'zustand';
import type { Artifact, Layout, Palace, Room } from '../types/palace';

interface PalaceState {
  palace: Palace | null;
  layout: Layout | null;
  rooms: Room[];
  artifacts: Record<string, Artifact[]>; // roomId → artifacts
  currentRoomId: string | null;
  loading: boolean;
  isSeeding: boolean;
  error: string | null;
  highlightedArtifactIds: string[];
  agentSelectedArtifactId: string | null;
  highlightedLobbyDoorRoomId: string | null;
  hoveredArtifactId: string | null;

  setPalace: (palace: Palace | null) => void;
  setLayout: (layout: Layout | null) => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setArtifacts: (roomId: string, artifacts: Artifact[]) => void;
  setAllArtifacts: (artifacts: Record<string, Artifact[]>) => void;
  addArtifact: (artifact: Artifact) => void;
  removeArtifact: (artifactId: string) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setIsSeeding: (isSeeding: boolean) => void;
  setError: (error: string | null) => void;
  updateArtifact: (artifactId: string, patch: Partial<Artifact>) => void;
  setHighlightedArtifacts: (ids: string[]) => void;
  setAgentSelectedArtifactId: (id: string | null) => void;
  setHighlightedLobbyDoorRoomId: (id: string | null) => void;
  setHoveredArtifactId: (id: string | null) => void;
}

export const usePalaceStore = create<PalaceState>((set) => ({
  palace: null,
  layout: null,
  rooms: [],
  artifacts: {},
  currentRoomId: null,
  loading: false,
  isSeeding: false,
  error: null,
  highlightedArtifactIds: [],
  agentSelectedArtifactId: null,
  highlightedLobbyDoorRoomId: null,
  hoveredArtifactId: null,

  setPalace: (palace) => set({ palace }),
  setLayout: (layout) => set({ layout }),
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) =>
    set((state) => ({
      rooms: [...state.rooms.filter((r) => r.id !== room.id), room],
    })),
  removeRoom: (roomId) =>
    set((state) => {
      const artifacts = { ...state.artifacts };
      delete artifacts[roomId];
      const layout = state.layout
        ? { ...state.layout, lobbyDoors: state.layout.lobbyDoors.filter((d) => d.roomId !== roomId) }
        : state.layout;
      return {
        rooms: state.rooms.filter((r) => r.id !== roomId),
        artifacts,
        layout,
        currentRoomId: state.currentRoomId === roomId ? null : state.currentRoomId,
      };
    }),
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
  removeArtifact: (artifactId) =>
    set((state) => {
      const updated: Record<string, Artifact[]> = {};
      for (const [roomId, arts] of Object.entries(state.artifacts)) {
        updated[roomId] = arts.filter((a) => a.id !== artifactId);
      }
      return { artifacts: updated };
    }),
  updateArtifact: (artifactId, patch) =>
    set((state) => {
      const updated: Record<string, Artifact[]> = {};
      for (const [roomId, arts] of Object.entries(state.artifacts)) {
        updated[roomId] = arts.map((a) => a.id === artifactId ? { ...a, ...patch } : a);
      }
      return { artifacts: updated };
    }),
  setCurrentRoomId: (currentRoomId) => set({ currentRoomId }),
  setLoading: (loading) => set({ loading }),
  setIsSeeding: (isSeeding) => set({ isSeeding }),
  setError: (error) => set({ error }),
  setHighlightedArtifacts: (highlightedArtifactIds) => set({ highlightedArtifactIds }),
  setAgentSelectedArtifactId: (agentSelectedArtifactId) => set({ agentSelectedArtifactId }),
  setHighlightedLobbyDoorRoomId: (highlightedLobbyDoorRoomId) => set({ highlightedLobbyDoorRoomId }),
  setHoveredArtifactId: (hoveredArtifactId) => set({ hoveredArtifactId }),
}));
