import { usePalace } from '../hooks/usePalace';
import { useWS } from '../hooks/useWS';
import { PalaceCanvas } from '../components/palace/PalaceCanvas';
import { CaptureButton } from '../components/capture/CaptureButton';
import { CaptureOverlay } from '../components/capture/CaptureOverlay';
import { ConceptToast } from '../components/capture/ConceptToast';
import { CaptureComplete } from '../components/capture/CaptureComplete';
import { RoomSuggestionModal } from '../components/capture/RoomSuggestionModal';
import { usePalaceStore } from '../stores/palaceStore';
import type { Artifact } from '../types/palace';

export function PalacePage() {
  // Start WebSocket connection and wire palace_update messages into palaceStore
  useWS();

  // Load palace data into palaceStore on mount
  const { loading, error, reload } = usePalace();

  const currentRoomId = usePalaceStore((s) => s.currentRoomId);

  function handleArtifactClick(artifact: Artifact) {
    // WS artifact_click is sent by useArtifactInteraction inside Artifact components.
    // Here we could open an artifact detail modal in a future task (T113).
    console.info('[Palace] Artifact clicked:', artifact.id);
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

      {/* HUD — bottom-center capture button */}
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
      <CaptureComplete />
      <RoomSuggestionModal />
    </>
  );
}
