import { create } from 'zustand';
import type { CaptureAckMessage, CaptureCompleteMessage, RoomSuggestionMessage } from '../services/websocket';

export type CaptureStatus = 'idle' | 'capturing' | 'processing' | 'complete' | 'error';

interface CaptureState {
  sessionId: string | null;
  status: CaptureStatus;
  sourceType: 'webcam' | 'screen_share' | 'upload' | 'text_input' | 'voice';
  concepts: CaptureAckMessage['extraction'][];
  summary: CaptureCompleteMessage['summary'] | null;
  roomSuggestion: RoomSuggestionMessage | null;
  /** Resolves when the user responds to a room suggestion */
  roomSuggestionResolver: ((choice: RoomSuggestionChoice) => void) | null;
  error: string | null;
  activeStream: MediaStream | null;
  /** Chat conversation messages (user + rayan turns) */
  messages: ChatMessage[];
  /** Whether conversation panel is visible */
  showPanel: boolean;

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
  setActiveStream: (stream: MediaStream | null) => void;
  /** Add an inline tool-call event to conversation log */
  addToolEvent: (text: string, toolName: string) => void;
  /** Append text to the last rayan message, or create a new one */
  appendRayanText: (text: string) => void;
  /** Append text to the last user message, or create a new one */
  appendUserText: (text: string) => void;
  setShowPanel: (show: boolean) => void;
  /** Clear all messages from conversation log */
  clearMessages: () => void;
  reset: () => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'rayan' | 'tool';
  text: string;
  toolName?: string;
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
  activeStream: null,
  messages: [] as ChatMessage[],
  showPanel: false,
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
  setActiveStream: (activeStream) => set({ activeStream }),
  addToolEvent: (text, toolName) =>
    set((state) => ({
      messages: [...state.messages, { id: `tool-${Date.now()}`, role: 'tool', text, toolName }],
    })),
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
  setShowPanel: (showPanel) => set({ showPanel }),
  clearMessages: () => set({ messages: [] }),
  reset: () => set(defaultState),
}));
