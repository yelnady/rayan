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
import { useCameraStore } from '../stores/cameraStore';
import { useVoiceStore } from '../stores/voiceStore';
import { AudioPlayback } from '../services/audioPlayback';
import { useEnrichmentStore } from '../stores/enrichmentStore';
import { useTransitionStore } from '../stores/transitionStore';
import { stopVoiceSession } from './useVoice';

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
    ws.on('capture_audio', (msg) => {
      if (_playback) void _playback.enqueue(msg.data);
    }),
    ws.on('capture_ack', (msg) => {
      useCaptureStore.getState().addConcept(msg.extraction);
      // Log extraction in the conversation panel
      useVoiceStore.getState().addToolEvent(`Memory Captured: ${msg.extraction.concept}`, 'capture_concept');
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
        })
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
        } as never)
      );
    }),
    ws.on('seeding_started' as any, () => {
      usePalaceStore.getState().setIsSeeding(true);
    }),
    ws.on('seeding_complete' as any, () => {
      usePalaceStore.getState().setIsSeeding(false);
    }),
    ws.on('error', (msg) => {
      console.error('[WS error]', msg.code, msg.message);
    }),

    // ── Live streaming voice wiring ─────────────────────────────────────
    ws.on('live_session_started', () => {
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.status === 'connecting') {
        voiceStore.setStatus('connected');
        voiceStore.addToolEvent('Session Started', 'session_start');
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
      voiceStore.appendRayanText(msg.text);
    }),
    ws.on('live_user_text', (msg) => {
      useVoiceStore.getState().appendUserText(msg.text);
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
    ws.on('live_tool_call', (msg) => {
      // Add inline event to conversation log
      useVoiceStore.getState().addToolEvent(msg.label, msg.tool);
      // Show activity toast
      useVoiceStore.getState().setToolActivity({ tool: msg.tool, label: msg.label });
      setTimeout(() => useVoiceStore.getState().setToolActivity(null), 4_000);

      // Navigate to room: exit to lobby first (if in a room), then enter target room
      if (msg.payload.navigation?.enterRoom) {
        const nav = msg.payload.navigation;
        const isLobby = nav.targetRoomId === 'lobby';
        const palaceStore = usePalaceStore.getState();
        const currentRoomId = palaceStore.currentRoomId;
        const targetRoomId = isLobby ? null : nav.targetRoomId;
        const { startTransition } = useTransitionStore.getState();

        if (currentRoomId !== targetRoomId) {
          const WALL_CYCLE = ['north', 'east', 'south', 'west'] as const;
          const DOOR_SPACING = 2.2;
          const LOBBY_SIZE = 12;
          const layout = palaceStore.layout;

          // Find which lobby wall/index this room's door is on (mirrors PalaceCanvas fallback logic)
          const getLobbyDoor = (roomId: string) => {
            const fromLayout = layout?.lobbyDoors?.find(d => d.roomId === roomId);
            if (fromLayout) return fromLayout;
            const idx = Math.max(palaceStore.rooms.findIndex(r => r.id === roomId), 0);
            return { wallPosition: WALL_CYCLE[idx % 4], doorIndex: Math.floor(idx / 4) };
          };

          // Room entry position based on which lobby wall the door is on (mirrors handleEnterRoom in PalaceCanvas)
          const getRoomEntry = (room: typeof palaceStore.rooms[0], wallPosition: string) => {
            const { w, d } = room.dimensions;
            const rx = room.position.x, rz = room.position.z;
            switch (wallPosition) {
              case 'south': return { entryX: rx + w / 2, entryZ: rz + 0.5,       lookX: rx + w / 2, lookZ: rz + d };
              case 'east':  return { entryX: rx + 0.5,       entryZ: rz + d / 2,  lookX: rx + w,     lookZ: rz + d / 2 };
              case 'west':  return { entryX: rx + w - 0.5,   entryZ: rz + d / 2,  lookX: rx,         lookZ: rz + d / 2 };
              default:      return { entryX: rx + w / 2,     entryZ: rz + d - 0.5, lookX: rx + w / 2, lookZ: rz };
            }
          };

          // Lobby position that faces the given door
          const getLobbyFacing = (wallPosition: string, doorIndex: number) => {
            const offset = doorIndex * DOOR_SPACING;
            switch (wallPosition) {
              case 'south': return { x: LOBBY_SIZE / 2 + offset, z: LOBBY_SIZE - 2, lx: LOBBY_SIZE / 2 + offset, lz: LOBBY_SIZE };
              case 'east':  return { x: LOBBY_SIZE - 2,           z: LOBBY_SIZE / 2 + offset, lx: LOBBY_SIZE,     lz: LOBBY_SIZE / 2 + offset };
              case 'west':  return { x: 2,                        z: LOBBY_SIZE / 2 + offset, lx: 0,              lz: LOBBY_SIZE / 2 + offset };
              default:      return { x: LOBBY_SIZE / 2 + offset,  z: 2,             lx: LOBBY_SIZE / 2 + offset, lz: 0 };
            }
          };

          const enterTarget = () => {
            startTransition(isLobby ? 'exit' : 'enter', () => {
              palaceStore.setCurrentRoomId(targetRoomId);
              useCameraStore.getState().exitOverview();
              if (!isLobby) {
                const room = palaceStore.rooms.find(r => r.id === nav.targetRoomId);
                if (room) {
                  const ld = getLobbyDoor(nav.targetRoomId);
                  const { entryX, entryZ, lookX, lookZ } = getRoomEntry(room, ld.wallPosition);
                  useCameraStore.getState().teleport({ x: entryX, y: 1.7, z: entryZ });
                  useCameraStore.getState().lookAt({ x: lookX, y: 1.7, z: lookZ });
                  useCameraStore.getState().setFov(100);
                }
              } else {
                useCameraStore.getState().teleport({ x: 6, y: 1.7, z: 6 });
                useCameraStore.getState().lookAt({ x: 6, y: 1.7, z: 0 });
                useCameraStore.getState().setFov(75);
              }
              _instance?.sendContextUpdate(targetRoomId);
            });
          };

          if (currentRoomId !== null && !isLobby) {
            // In a room → exit to lobby facing the target door, then enter the target room
            const ld = getLobbyDoor(nav.targetRoomId);
            const facing = getLobbyFacing(ld.wallPosition, ld.doorIndex ?? 0);
            startTransition('exit', () => {
              palaceStore.setCurrentRoomId(null);
              useCameraStore.getState().exitOverview();
              useCameraStore.getState().teleport({ x: facing.x, y: 1.7, z: facing.z });
              useCameraStore.getState().lookAt({ x: facing.lx, y: 1.7, z: facing.lz });
              useCameraStore.getState().setFov(75);
              // Wait for the lobby fade-in to complete, then enter the target room
              setTimeout(enterTarget, 1200);
            });
          } else {
            // Already in lobby (or navigating to lobby): single transition
            enterTarget();
          }
        }

        if (nav.highlightArtifacts?.length) {
          palaceStore.setHighlightedArtifacts(nav.highlightArtifacts);
          setTimeout(() => usePalaceStore.getState().setHighlightedArtifacts([]), 5_000);
        }
        if (nav.selectedArtifactId) {
          palaceStore.setAgentSelectedArtifactId(nav.selectedArtifactId);
        }
      }

      // Cinematic Highlight: Move camera + Open popup
      if (msg.payload.artifactId) {
        usePalaceStore.getState().setAgentSelectedArtifactId(msg.payload.artifactId);
      }

      // Server-initiated session end
      if (msg.tool === 'end_session') {
        stopVoiceSession();
        _instance?.sendLiveSessionEnd();
      }
    }),

    // ── Legacy: artifact_recall ──────────────────────────────────────────
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
