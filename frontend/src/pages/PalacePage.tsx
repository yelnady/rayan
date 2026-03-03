import { useState } from 'react';
import { usePalace } from '../hooks/usePalace';
import { useWS } from '../hooks/useWS';
import { PalaceCanvas } from '../components/palace/PalaceCanvas';
import { CaptureButton } from '../components/capture/CaptureButton';
import { CaptureOverlay } from '../components/capture/CaptureOverlay';
import { ConceptToast } from '../components/capture/ConceptToast';
import { CaptureComplete } from '../components/capture/CaptureComplete';
import { RoomSuggestionModal } from '../components/capture/RoomSuggestionModal';
import { ArtifactDetailModal } from '../components/artifacts/ArtifactDetailModal';
import { VoiceButton } from '../components/voice/VoiceButton';
import { VoiceIndicator } from '../components/voice/VoiceIndicator';
import { ResponsePanel } from '../components/voice/ResponsePanel';
import { usePalaceStore } from '../stores/palaceStore';
import { useCaptureStore } from '../stores/captureStore';
import type { Artifact } from '../types/palace';

export function PalacePage() {
  // Start WebSocket connection and wire all server → store listeners
  const ws = useWS();

  // Load palace data into palaceStore on mount
  const { loading, error, reload } = usePalace();

  const currentRoomId = usePalaceStore((s) => s.currentRoomId);

  // ── T115: Artifact detail modal state ──────────────────────────────────────
  const [selectedArtifact, setSelectedArtifact] = useState<{ id: string; roomId: string } | null>(null);

  /** T115 — send artifact_click WS message and open the detail modal. */
  function handleArtifactClick(artifact: Artifact) {
    const roomId = artifact.roomId ?? currentRoomId ?? '';
    ws.sendArtifactClick(artifact.id, roomId);
    setSelectedArtifact({ id: artifact.id, roomId });
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#fff',
          background: '#060614',
          gap: 16,
        }}
      >
        <p style={{ color: '#ff6b6b' }}>Failed to load palace: {error}</p>
        <button
          onClick={reload}
          style={{
            padding: '8px 20px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const voiceContext = {
    currentRoomId: currentRoomId ?? null,
    focusedArtifactId: selectedArtifact?.id ?? null,
  };

  return (
    <>
      {/* 3D palace scene */}
      <PalaceCanvas onArtifactClick={handleArtifactClick} />

      {/* Loading overlay (before palace data arrives) */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(6,6,20,0.85)',
            color: '#fff',
            zIndex: 50,
            fontSize: 18,
          }}
        >
          Loading your memory palace…
        </div>
      )}

      {/* HUD — bottom-center: capture + voice buttons */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <CaptureButton source="webcam" />
        <VoiceButton context={voiceContext} />
      </div>

      {/* Room label — top-center */}
      {currentRoomId && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
            letterSpacing: '0.05em',
            pointerEvents: 'none',
          }}
        >
          Room: {currentRoomId}
        </div>
      )}

      {/* Capture status overlays */}
      <CaptureOverlay />
      <ConceptToast />
      <CaptureComplete onClose={() => useCaptureStore.getState().reset()} />
      <RoomSuggestionModal />

      {/* Voice UI (T105, T106, T107) */}
      <VoiceIndicator />
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
