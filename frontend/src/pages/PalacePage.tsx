import { useState, useEffect, useRef } from 'react';
import { usePalace } from '../hooks/usePalace';
import { useWS } from '../hooks/useWS';
import { useVoice } from '../hooks/useVoice';
import { PalaceCanvas } from '../components/palace/PalaceCanvas';
import { CaptureOverlay } from '../components/capture/CaptureOverlay';
import { ConceptToast } from '../components/capture/ConceptToast';
import { CaptureComplete } from '../components/capture/CaptureComplete';
import { CapturePreview } from '../components/capture/CapturePreview';
import { RoomSuggestionModal } from '../components/capture/RoomSuggestionModal';
import { ArtifactDetailModal } from '../components/artifacts/ArtifactDetailModal';
import { ActionBar } from '../components/hud/ActionBar';
import { ResponsePanel } from '../components/voice/ResponsePanel';
import { usePalaceStore } from '../stores/palaceStore';
import { useCameraStore } from '../stores/cameraStore';
import { useCaptureStore } from '../stores/captureStore';
import { useVoiceStore } from '../stores/voiceStore';
import type { Artifact } from '../types/palace';


export function PalacePage() {
  // Start WebSocket connection and wire all server → store listeners
  const ws = useWS();

  // Load palace data into palaceStore on mount
  const { loading, error, reload } = usePalace();

  const currentRoomId = usePalaceStore((s) => s.currentRoomId);
  const currentRoom = usePalaceStore((s) => s.rooms.find(r => r.id === s.currentRoomId));
  const [selectedArtifact, setSelectedArtifact] = useState<{ id: string; roomId: string } | null>(null);

  // Auto-connect the mic the first time the user enters any room
  const { status: voiceStatus, connect: connectVoice } = useVoice();
  const voiceConnectedRef = useRef(false);
  useEffect(() => {
    if (currentRoomId && !voiceConnectedRef.current && voiceStatus === 'disconnected') {
      voiceConnectedRef.current = true;
      void connectVoice();
    }
  }, [currentRoomId, voiceStatus, connectVoice]);

  // React to agent-selected artifact: open modal + rotate camera toward it
  const agentSelectedArtifactId = usePalaceStore((s) => s.agentSelectedArtifactId);
  useEffect(() => {
    if (!agentSelectedArtifactId) return;
    const state = usePalaceStore.getState();

    let foundRoomId: string | null = null;
    let artifactPos: { x: number; y: number; z: number } | null = null;
    for (const [rid, arts] of Object.entries(state.artifacts)) {
      const found = arts.find((a) => a.id === agentSelectedArtifactId);
      if (found) {
        foundRoomId = rid;
        artifactPos = found.position;
        break;
      }
    }

    if (!foundRoomId) return;

    setSelectedArtifact({ id: agentSelectedArtifactId, roomId: foundRoomId });

    if (artifactPos) {
      const room = state.rooms.find((r) => r.id === foundRoomId);
      if (room) {
        useCameraStore.getState().lookAt({
          x: room.position.x + artifactPos.x,
          y: artifactPos.y,
          z: room.position.z + artifactPos.z,
        });
      }
    }

    usePalaceStore.getState().setAgentSelectedArtifactId(null);
  }, [agentSelectedArtifactId]);

  /** T115 — send artifact_click WS message and open the detail modal. */
  function handleArtifactClick(artifact: Artifact) {
    // Clear old narration before fetching the new one
    useVoiceStore.getState().resetTranscript();
    const roomId = artifact.roomId ?? currentRoomId ?? '';
    ws.sendArtifactClick(artifact.id, roomId);
    setSelectedArtifact({ id: artifact.id, roomId });
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-bg relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(239,68,68,0.08)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative bg-surface border border-error-border rounded-[20px] px-11 py-9 max-w-[440px] w-full text-center shadow-[0_0_40px_rgba(239,68,68,0.1),0_24px_64px_rgba(0,0,0,0.5)] animate-[scaleIn_0.3s_ease]">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-error-muted border border-error-border flex items-center justify-center mx-auto mb-5 text-2xl">
            ⚠️
          </div>

          <h2 className="font-heading text-xl font-semibold text-text-primary m-0 mb-2">
            Can’t reach the palace
          </h2>

          <p className="font-body text-[13px] text-text-secondary m-0 mb-1 leading-relaxed">
            The backend server isn’t responding. Make sure it’s running and try again.
          </p>

          {/* Technical detail */}
          <p className="font-mono text-[11px] text-text-faint m-0 mb-7 px-2.5 py-1.5 bg-[rgba(239,68,68,0.05)] rounded-md border border-[rgba(239,68,68,0.1)]">
            {error}
          </p>

          <button
            onClick={reload}
            className="px-7 py-3 bg-primary text-text-primary border-none rounded-[10px] cursor-pointer font-body font-semibold text-sm shadow-primary-glow tracking-wide transition-transform hover:scale-105"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 3D palace scene */}
      <PalaceCanvas onArtifactClick={handleArtifactClick} />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3.5 bg-[rgba(6,6,20,0.9)] z-overlay backdrop-blur-sm">
          <div className="w-7 h-7 rounded-full border-2 border-primary-muted border-t-primary animate-spin" />
          <span className="font-body text-sm text-text-muted tracking-wide">
            Loading your memory palace…
          </span>
        </div>
      )}

      {/* HUD — bottom-center: unified action bar */}
      <ActionBar />

      {/* Click-to-explore hint — shown when palace is loaded but pointer is not yet locked */}
      {!loading && !error && (
        <div className="fixed bottom-[110px] left-1/2 -translate-x-1/2 z-hud pointer-events-none">
          <div className="bg-glass backdrop-blur-md border border-border rounded-[20px] px-4 py-1.5 text-xs font-body text-text-muted tracking-wide whitespace-nowrap">
            Click to explore · WASD to move
          </div>
        </div>
      )}

      {/* Room label — top-center */}
      {currentRoomId && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-hud text-text-muted text-[13px] font-body tracking-[0.06em] uppercase pointer-events-none">
          {currentRoom?.name ?? currentRoomId}
        </div>
      )}

      {/* Capture status overlays */}
      <CapturePreview />
      <CaptureOverlay />
      <ConceptToast />
      <CaptureComplete onClose={() => useCaptureStore.getState().reset()} />
      <RoomSuggestionModal />

      {/* Voice UI (T105, T106, T107) */}
      <ResponsePanel />

      {/* Artifact detail modal (T113) */}
      {selectedArtifact && (
        <ArtifactDetailModal
          artifactId={selectedArtifact.id}
          onClose={() => setSelectedArtifact(null)}
        />
      )}
    </>
  );
}
