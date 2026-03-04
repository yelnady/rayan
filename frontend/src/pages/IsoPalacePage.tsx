/**
 * IsoPalacePage — Monument Valley-style isometric memory palace at /iso.
 *
 * View state machine:
 *   'world' → (click platform) → 'room' → (click artifact) → modal open
 *   'room'  → (click Back)     → 'world'
 *
 * Uses the same data stores, hooks, and ArtifactDetailModal as PalacePage.
 * No Three.js, no WASD — pure CSS 3D + GSAP.
 */

import { useState, useCallback } from 'react';
import { usePalace } from '../hooks/usePalace';
import { usePalaceStore } from '../stores/palaceStore';
import { useArtifactInteraction } from '../hooks/useArtifactInteraction';
import { IsoWorld } from '../components/isometric/IsoWorld';
import { IsoRoomView } from '../components/isometric/IsoRoomView';
import { ArtifactDetailModal } from '../components/artifacts/ArtifactDetailModal';
import { ActionBar } from '../components/hud/ActionBar';
import type { Room, Artifact } from '../types/palace';

type ViewState = 'world' | 'room';

export function IsoPalacePage() {
  const { loading, error } = usePalace();
  const { rooms, artifacts } = usePalaceStore();

  const [view, setView] = useState<ViewState>('world');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const { selectedArtifact, onArtifactClick, clearSelection } = useArtifactInteraction(
    selectedRoom?.id ?? null,
  );

  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
    setView('room');
  }, []);

  const handleBack = useCallback(() => {
    setView('world');
    setSelectedRoom(null);
  }, []);

  const handleArtifactClick = useCallback(
    (artifact: Artifact) => {
      onArtifactClick(artifact);
    },
    [onArtifactClick],
  );

  const handleModalClose = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-muted border-t-primary animate-spin" />
        <span className="font-body text-[13px] text-text-muted">
          Loading your palace…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <span className="font-body text-sm text-error">{error}</span>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <span className="font-body text-sm text-text-muted">
          Your palace has no rooms yet. Start a capture session to build your first memory room.
        </span>
      </div>
    );
  }

  const roomArtifacts: Artifact[] = selectedRoom ? (artifacts[selectedRoom.id] ?? []) : [];

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 120% 60% at 30% 80%, rgba(99,102,241,0.05) 0%, transparent 50%),
                     radial-gradient(ellipse 80% 50% at 70% 10%, rgba(251,191,36,0.07) 0%, transparent 50%),
                     var(--colors-bg, #F9FAFB)`,
      }}
    >
      {/* Global keyframes for platform animations */}
      <style>{`
        @keyframes selected-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes cloud-drift {
          0% { transform: translate(0px, 0px); }
          100% { transform: translate(25px, 15px); }
        }
      `}</style>

      {/* World view — always mounted so GSAP entrance plays once */}
      <IsoWorld onRoomClick={handleRoomClick} selectedRoomId={selectedRoom?.id} />

      {/* Room overlay */}
      {view === 'room' && selectedRoom && (
        <IsoRoomView
          room={selectedRoom}
          artifacts={roomArtifacts}
          onArtifactClick={handleArtifactClick}
          onBack={handleBack}
        />
      )}

      {/* Artifact detail modal */}
      {selectedArtifact && (
        <ArtifactDetailModal
          artifactId={selectedArtifact.id}
          onClose={handleModalClose}
        />
      )}

      {/* HUD */}
      <ActionBar />
    </div>
  );
}
