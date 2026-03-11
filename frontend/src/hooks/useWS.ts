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
    // capture_session_started/ended, capture_text/user_text, capture_ack, capture_audio
    // are all handled by useCaptureWS (mounted in PalacePage). Only handle the
    // messages that useCaptureWS does NOT cover.
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
      msg.changes.artifactsRemoved?.forEach((id: string) =>
        palaceStore.removeArtifact(id)
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

      // Navigate to room: cinematic fly to lobby door → highlight → enter room
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

          const enterTarget = () => {
            usePalaceStore.getState().setHighlightedLobbyDoorRoomId(null);
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
            });
          };

          if (currentRoomId !== null && !isLobby) {
            // Currently in a room: exit room immediately, then fly cinematically to lobby facing the door
            const ld = getLobbyDoor(nav.targetRoomId);
            const idx = ld.doorIndex ?? 0;
            const offset = idx * DOOR_SPACING;

            // Camera stand position in lobby (3 units from the wall — enough to see the full door)
            let facingX = 0, facingZ = 0, doorCX = 0, doorCZ = 0;
            switch (ld.wallPosition) {
              case 'south':
                facingX = LOBBY_SIZE / 2 + offset; facingZ = LOBBY_SIZE - 3;
                doorCX  = LOBBY_SIZE / 2 + offset; doorCZ  = LOBBY_SIZE; break;
              case 'east':
                facingX = LOBBY_SIZE - 3; facingZ = LOBBY_SIZE / 2 + offset;
                doorCX  = LOBBY_SIZE;     doorCZ  = LOBBY_SIZE / 2 + offset; break;
              case 'west':
                facingX = 3; facingZ = LOBBY_SIZE / 2 + offset;
                doorCX  = 0; doorCZ  = LOBBY_SIZE / 2 + offset; break;
              default: // north
                facingX = LOBBY_SIZE / 2 + offset; facingZ = 3;
                doorCX  = LOBBY_SIZE / 2 + offset; doorCZ  = 0; break;
            }

            // Leave the room immediately so lobby collision/rendering takes over
            palaceStore.setCurrentRoomId(null);
            useCameraStore.getState().exitOverview();
            // Narrow FOV for a cinematic door-framing effect
            useCameraStore.getState().setFov(65);

            // Smooth cinematic glide through the palace to the lobby door
            useCameraStore.getState().flyTo(
              { x: facingX, y: 1.7, z: facingZ },
              { x: doorCX, y: 1.25, z: doorCZ },
              () => {
                // Arrived in lobby facing the door — highlight it, it opens, then enter
                if (usePalaceStore.getState().currentRoomId !== null) return;
                usePalaceStore.getState().setHighlightedLobbyDoorRoomId(nav.targetRoomId);
                setTimeout(enterTarget, 1500);
              }
            );
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

      // Horizontal strafe: briefly push mobileMovement left or right
      if (msg.payload.navigation?.moveHorizontal) {
        const dir = msg.payload.navigation.moveHorizontal === 'left' ? -1 : 1;
        useCameraStore.getState().setMobileMovement({ x: dir, z: 0 });
        setTimeout(() => useCameraStore.getState().setMobileMovement({ x: 0, z: 0 }), 600);
      }

      // Cinematic Highlight: Move camera + Open popup + glow
      if (msg.payload.artifactId) {
        const artifactId = msg.payload.artifactId;
        usePalaceStore.getState().setHighlightedArtifacts([artifactId]);
        setTimeout(() => usePalaceStore.getState().setHighlightedArtifacts([]), 5_000);
        usePalaceStore.getState().setAgentSelectedArtifactId(artifactId);
      }

      // Server-initiated session end
      if (msg.tool === 'end_session') {
        stopVoiceSession();
        _instance?.sendLiveSessionEnd();
      }
    }),

    ws.on('live_memory_loaded' as any, (msg: any) => {
      useVoiceStore.getState().addToolEvent(msg.label, 'memory_search');
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
