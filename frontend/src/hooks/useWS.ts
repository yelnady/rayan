/**
 * Returns the singleton RayanWebSocket instance for the current user.
 * Creates and connects it on first call; tears it down on sign-out.
 */
import { useEffect, useRef } from 'react';
import { RayanWebSocket } from '../services/websocket';
import { WS_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { useCaptureStore } from '../stores/captureStore';
import { usePalaceStore } from '../stores/palaceStore';

let _instance: RayanWebSocket | null = null;

function getInstance(userId: string, getToken: () => Promise<string>): RayanWebSocket {
  if (!_instance) {
    _instance = new RayanWebSocket(WS_BASE_URL, userId, getToken);
  }
  return _instance;
}

export function useWS(): RayanWebSocket {
  const { user } = useAuthStore();
  const wsRef = useRef<RayanWebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      _instance?.disconnect();
      _instance = null;
      wsRef.current = null;
      return;
    }

    const getToken = () => user.getIdToken();
    const ws = getInstance(user.uid, getToken);
    wsRef.current = ws;
    ws.connect();

    // Wire server → client messages into Zustand stores
    const unsubs = [
      ws.on('capture_ack', (msg) => {
        useCaptureStore.getState().addConcept(msg.extraction);
      }),
      ws.on('capture_complete', (msg) => {
        useCaptureStore.getState().setSummary(msg.summary);
        useCaptureStore.getState().setStatus('complete');
      }),
      ws.on('room_suggestion', (msg) => {
        // Store the suggestion; useCapture.waitForRoomSuggestionResponse resolves it
        useCaptureStore.getState().setRoomSuggestion(msg);
      }),
      ws.on('palace_update', (msg) => {
        const palaceStore = usePalaceStore.getState();
        msg.changes.roomsAdded?.forEach((r) =>
          palaceStore.addRoom({
            id: r.id,
            name: r.name,
            position: r.position,
            dimensions: { w: 8, d: 8, h: 4 },
            style: r.style as never,
            connections: [],
            artifactCount: 0,
          }),
        );
        msg.changes.artifactsAdded?.forEach((a) =>
          palaceStore.addArtifact({
            id: a.id,
            roomId: a.roomId,
            type: a.type as never,
            position: a.position,
            visual: a.visual as never,
            summary: a.summary,
            embedding: [],
            createdAt: new Date().toISOString(),
          } as never),
        );
      }),
      ws.on('error', (msg) => {
        console.error('[WS error]', msg.code, msg.message);
      }),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [user]);

  if (!wsRef.current && user) {
    const getToken = () => user.getIdToken();
    wsRef.current = getInstance(user.uid, getToken);
  }

  // Return a no-op stub when not authenticated so callers don't need to null-check
  return wsRef.current ?? (new Proxy({} as RayanWebSocket, { get: () => () => undefined }));
}
