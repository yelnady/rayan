/**
 * Returns the singleton RayanWebSocket instance for the current user.
 * Creates and connects it on first call; tears it down on sign-out.
 *
 * T109: Also wires response_chunk, response_complete, and artifact_recall
 * messages into voiceStore and AudioPlayback.
 */
import { useEffect, useRef } from 'react';
import { RayanWebSocket } from '../services/websocket';
import { WS_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { useCaptureStore } from '../stores/captureStore';
import { usePalaceStore } from '../stores/palaceStore';
import { useVoiceStore } from '../stores/voiceStore';
import { AudioPlayback } from '../services/audioPlayback';
import { useEnrichmentStore } from '../stores/enrichmentStore';

let _instance: RayanWebSocket | null = null;
/** Singleton AudioPlayback shared across listeners (reset on disconnect). */
let _playback: AudioPlayback | null = null;
/** Track whether listeners have been wired to prevent duplicates. */
let _listenersWired = false;
let _listenerUnsubs: Array<() => void> = [];

function getInstance(userId: string, getToken: () => Promise<string>): RayanWebSocket {
  if (!_instance) {
    _instance = new RayanWebSocket(WS_BASE_URL, userId, getToken);
  }
  return _instance;
}

function wireListeners(ws: RayanWebSocket): void {
  if (_listenersWired) return;
  _listenersWired = true;

  _playback = new AudioPlayback();

  _listenerUnsubs = [
    ws.on('capture_ack', (msg) => {
      useCaptureStore.getState().addConcept(msg.extraction);
    }),
    ws.on('capture_complete', (msg) => {
      useCaptureStore.getState().setSummary(msg.summary);
      useCaptureStore.getState().setStatus('complete');
    }),
    ws.on('room_suggestion', (msg) => {
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

    // ── Live streaming voice wiring ─────────────────────────────────────
    ws.on('live_session_started', () => {
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.status === 'connecting') {
        voiceStore.setStatus('connected');
      }
    }),
    ws.on('live_audio', (msg) => {
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.status !== 'responding') {
        voiceStore.setStatus('responding');
      }
      if (_playback) {
        void _playback.enqueue(msg.audioChunk);
      }
    }),
    ws.on('live_text', (msg) => {
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.status !== 'responding') {
        voiceStore.setStatus('responding');
      }
      voiceStore.appendTranscript(msg.text);
    }),
    ws.on('live_interrupted', () => {
      _playback?.stop();
      const voiceStore = useVoiceStore.getState();
      voiceStore.resetTranscript();
      voiceStore.setStatus('connected');
    }),
    ws.on('live_turn_complete', () => {
      const voiceStore = useVoiceStore.getState();
      setTimeout(() => {
        if (voiceStore.status === 'responding') {
          useVoiceStore.getState().setStatus('connected');
        }
      }, 2500);
    }),

    // ── Legacy: response_chunk / response_complete for text_query fallback ─
    ws.on('response_chunk', (msg) => {
      const voiceStore = useVoiceStore.getState();
      voiceStore.setStatus('responding');

      if (msg.content.text) {
        voiceStore.appendTranscript(msg.content.text);
      }
      if (msg.content.audioChunk && _playback) {
        void _playback.enqueue(msg.content.audioChunk);
      }
      if (msg.content.generatedImage) {
        voiceStore.addDiagram(msg.content.generatedImage);
      }
    }),
    ws.on('response_complete', (_msg) => {
      setTimeout(() => {
        const voiceStore = useVoiceStore.getState();
        if (voiceStore.status === 'responding') {
          voiceStore.setStatus('connected');
        }
      }, 2500);
    }),
    ws.on('artifact_recall', (msg) => {
      const voiceStore = useVoiceStore.getState();
      voiceStore.setNarration(msg.content);
      voiceStore.setStatus('responding');
      if (msg.content.voiceNarration && _playback) {
        void _playback.enqueue(msg.content.voiceNarration);
      }
    }),

    // ── T126: Enrichment update — drives crystal_orb_pulse animation ─────
    ws.on('enrichment_update', (msg) => {
      useEnrichmentStore.getState().addEnrichment(msg.artifactId, {
        id: msg.enrichment.id,
        sourceName: msg.enrichment.sourceName,
        sourceUrl: msg.enrichment.sourceUrl,
        preview: msg.enrichment.preview,
        images: msg.enrichment.images,
      });
    }),
  ];
}

function teardownListeners(): void {
  _listenerUnsubs.forEach((fn) => fn());
  _listenerUnsubs = [];
  _playback?.stop();
  _playback = null;
  _listenersWired = false;
}

export function useWS(): RayanWebSocket {
  const { user } = useAuthStore();
  const wsRef = useRef<RayanWebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      teardownListeners();
      _instance?.disconnect();
      _instance = null;
      wsRef.current = null;
      return;
    }

    const getToken = () => user.getIdToken();
    const ws = getInstance(user.uid, getToken);
    wsRef.current = ws;
    ws.connect();
    wireListeners(ws);

    return () => {
      // Only tear down on actual unmount of last consumer (sign-out)
      // The listeners persist as long as the singleton WS lives
    };
  }, [user]);

  if (!wsRef.current && user) {
    const getToken = () => user.getIdToken();
    wsRef.current = getInstance(user.uid, getToken);
  }

  // Return a no-op stub when not authenticated so callers don't need to null-check
  return wsRef.current ?? (new Proxy({} as RayanWebSocket, { get: () => () => undefined }));
}
