import { useState } from 'react';
import { usePalace } from '../hooks/usePalace';
import { useWS } from '../hooks/useWS';
import { PalaceCanvas } from '../components/palace/PalaceCanvas';
import { CaptureOverlay } from '../components/capture/CaptureOverlay';
import { ConceptToast } from '../components/capture/ConceptToast';
import { CaptureComplete } from '../components/capture/CaptureComplete';
import { CapturePreview } from '../components/capture/CapturePreview';
import { RoomSuggestionModal } from '../components/capture/RoomSuggestionModal';
import { ArtifactDetailModal } from '../components/artifacts/ArtifactDetailModal';
import { ActionBar } from '../components/hud/ActionBar';
import { VoiceIndicator } from '../components/voice/VoiceIndicator';
import { ResponsePanel } from '../components/voice/ResponsePanel';
import { usePalaceStore } from '../stores/palaceStore';
import { useCaptureStore } from '../stores/captureStore';
import type { Artifact } from '../types/palace';
import { colors, fonts, zIndex } from '../config/tokens';


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
          minHeight: '100vh',
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 60%), ${colors.bg}`,
          padding: 24,
        }}
      >
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${colors.errorBorder}`,
            borderRadius: 20,
            padding: '36px 44px',
            maxWidth: 440,
            width: '100%',
            textAlign: 'center',
            boxShadow: `0 0 40px rgba(239,68,68,0.1), 0 24px 64px rgba(0,0,0,0.5)`,
            animation: 'scaleIn 0.3s ease',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: colors.errorMuted,
              border: `1px solid ${colors.errorBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 24,
            }}
          >
            ⚠️
          </div>

          <h2
            style={{
              fontFamily: fonts.heading,
              fontSize: 20,
              fontWeight: 600,
              color: colors.white,
              margin: '0 0 8px',
            }}
          >
            Can’t reach the palace
          </h2>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: colors.textSecondary,
              margin: '0 0 4px',
              lineHeight: 1.6,
            }}
          >
            The backend server isn’t responding. Make sure it’s running and try again.
          </p>

          {/* Technical detail */}
          <p
            style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.textFaint,
              margin: '0 0 28px',
              padding: '6px 10px',
              background: 'rgba(239,68,68,0.05)',
              borderRadius: 6,
              border: `1px solid rgba(239,68,68,0.1)`,
            }}
          >
            {error}
          </p>

          <button
            onClick={reload}
            style={{
              padding: '11px 28px',
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: `0 4px 16px ${colors.primaryGlow}`,
              letterSpacing: '0.01em',
            }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            background: 'rgba(6,6,20,0.9)',
            zIndex: zIndex.overlay,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: `2px solid ${colors.primaryMuted}`,
              borderTopColor: colors.primary,
              animation: 'spin 0.85s linear infinite',
            }}
          />
          <span
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.textMuted,
              letterSpacing: '0.02em',
            }}
          >
            Loading your memory palace…
          </span>
        </div>
      )}

      {/* HUD — bottom-center: unified action bar */}
      <ActionBar />

      {/* Click-to-explore hint — shown when palace is loaded but pointer is not yet locked */}
      {!loading && !error && (
        <div
          style={{
            position: 'fixed',
            bottom: 110,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: zIndex.hud,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: colors.glass,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${colors.border}`,
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: 12,
              fontFamily: fonts.body,
              color: colors.textMuted,
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            Click to explore · WASD to move
          </div>
        </div>
      )}

      {/* Room label — top-center */}
      {currentRoomId && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: zIndex.hud,
            color: colors.textMuted,
            fontSize: 13,
            fontFamily: fonts.body,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          {currentRoomId}
        </div>
      )}

      {/* Capture status overlays */}
      <CapturePreview />
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
