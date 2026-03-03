import { create } from 'zustand';
import type { CaptureAckMessage, CaptureCompleteMessage, RoomSuggestionMessage } from '../services/websocket';

export type CaptureStatus = 'idle' | 'capturing' | 'processing' | 'complete' | 'error';

interface CaptureState {
  sessionId: string | null;
  status: CaptureStatus;
  sourceType: 'webcam' | 'screen_share' | 'upload' | 'text_input';
  concepts: CaptureAckMessage['extraction'][];
  summary: CaptureCompleteMessage['summary'] | null;
  roomSuggestion: RoomSuggestionMessage | null;
  /** Resolves when the user responds to a room suggestion */
  roomSuggestionResolver: ((choice: RoomSuggestionChoice) => void) | null;
  error: string | null;

  setSessionId: (id: string | null) => void;
  setStatus: (status: CaptureStatus) => void;
  setSourceType: (type: CaptureState['sourceType']) => void;
  addConcept: (extraction: CaptureAckMessage['extraction']) => void;
  setSummary: (summary: CaptureCompleteMessage['summary']) => void;
  setRoomSuggestion: (
    msg: RoomSuggestionMessage | null,
    resolver?: (choice: RoomSuggestionChoice) => void,
  ) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export interface RoomSuggestionChoice {
  action: 'accept' | 'reject' | 'edit';
  editedName?: string;
  editedStyle?: string;
}

const defaultState = {
  sessionId: null,
  status: 'idle' as CaptureStatus,
  sourceType: 'webcam' as const,
  concepts: [],
  summary: null,
  roomSuggestion: null,
  roomSuggestionResolver: null,
  error: null,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...defaultState,

  setSessionId: (sessionId) => set({ sessionId }),
  setStatus: (status) => set({ status }),
  setSourceType: (sourceType) => set({ sourceType }),
  addConcept: (extraction) =>
    set((state) => ({ concepts: [...state.concepts, extraction] })),
  setSummary: (summary) => set({ summary }),
  setRoomSuggestion: (roomSuggestion, roomSuggestionResolver = undefined) =>
    set({ roomSuggestion, roomSuggestionResolver: roomSuggestionResolver ?? null }),
  setError: (error) => set({ error }),
  reset: () => set(defaultState),
}));
