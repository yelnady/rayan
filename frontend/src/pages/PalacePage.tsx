import { useState, useEffect, useRef } from 'react';
import { usePalace } from '../hooks/usePalace';
import { useWS } from '../hooks/useWS';
import { useVoice } from '../hooks/useVoice';
import { useCaptureWS } from '../hooks/useCaptureWS';
import { PalaceCanvas } from '../components/palace/PalaceCanvas';
import { CaptureOverlay } from '../components/capture/CaptureOverlay';
import { ConceptToast } from '../components/capture/ConceptToast';
import { CaptureComplete } from '../components/capture/CaptureComplete';
import { CapturePreview } from '../components/capture/CapturePreview';
import { RoomSuggestionModal } from '../components/capture/RoomSuggestionModal';
import { ArtifactDetailModal } from '../components/artifacts/ArtifactDetailModal';
import { ActionBar } from '../components/hud/ActionBar';
import { ToolActivityToast } from '../components/hud/ToolActivityToast';
import { ResponsePanel } from '../components/voice/ResponsePanel';
import { Joystick } from '../components/navigation/Joystick';
import { TransitionOverlay } from '../components/hud/TransitionOverlay';
import { usePalaceStore } from '../stores/palaceStore';
import { useCameraStore } from '../stores/cameraStore';
import { useCaptureStore } from '../stores/captureStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useTransitionStore } from '../stores/transitionStore';
import { Logo } from '../components/brand/Logo';
import type { Artifact } from '../types/palace';


export function PalacePage() {
  // Start WebSocket connection and wire all server → store listeners
  const ws = useWS();

  // Load palace data into palaceStore on mount
  const { loading, error, reload } = usePalace();

  // Initialize capture WebSocket listeners
  useCaptureWS();

  const currentRoomId = usePalaceStore((s) => s.currentRoomId);
  const isOverviewMode = useCameraStore((s) => s.isOverviewMode);
  const isSeeding = usePalaceStore((s) => s.isSeeding);
  const voicePanelOpen = useVoiceStore((s) => s.showPanel);
  const capturePanelOpen = useCaptureStore((s) => s.showPanel && s.status === 'capturing');
  const panelOpen = voicePanelOpen || capturePanelOpen;
  const PANEL_WIDTH = 320;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Send context update to live session whenever the user enters a different room
  const prevRoomIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevRoomIdRef.current === undefined) {
      // Skip the very first render (session not open yet)
      prevRoomIdRef.current = currentRoomId;
      return;
    }
    if (currentRoomId !== prevRoomIdRef.current) {
      prevRoomIdRef.current = currentRoomId;
      ws.sendContextUpdate(currentRoomId);
    }
  }, [currentRoomId, ws]);

  // React to agent-selected artifact: navigate to its room, stand in front of it, open modal
  const agentSelectedArtifactId = usePalaceStore((s) => s.agentSelectedArtifactId);
  useEffect(() => {
    if (!agentSelectedArtifactId) return;
    const state = usePalaceStore.getState();

    let foundRoomId: string | null = null;
    let foundArtifact: Artifact | null = null;
    for (const [rid, arts] of Object.entries(state.artifacts)) {
      const found = arts.find((a) => a.id === agentSelectedArtifactId);
      if (found) { foundRoomId = rid; foundArtifact = found; break; }
    }

    if (!foundRoomId || !foundArtifact) return;
    const finalRoomId = foundRoomId;
    const artifact = foundArtifact;
    const room = state.rooms.find((r) => r.id === finalRoomId);
    if (!room) return;

    // World position of the artifact
    const worldX = room.position.x + artifact.position.x;
    const worldZ = room.position.z + artifact.position.z;

    // Stand 2 units in front of the artifact (away from its wall)
    const STAND_DIST = 2.0;
    let standX = worldX;
    let standZ = worldZ;
    if (artifact.wall === 'north' || artifact.position.z < 0.6) standZ = worldZ + STAND_DIST;
    else if (artifact.wall === 'south' || artifact.position.z > room.dimensions.d - 0.6) standZ = worldZ - STAND_DIST;
    else if (artifact.wall === 'west' || artifact.position.x < 0.2) standX = worldX + STAND_DIST;
    else if (artifact.wall === 'east' || artifact.position.x > room.dimensions.w - 0.2) standX = worldX - STAND_DIST;

    const openModal = () => {
      setTimeout(() => setSelectedArtifact({ id: agentSelectedArtifactId, roomId: finalRoomId }), 1000);
    };

    const flyToArtifact = () => {
      useCameraStore.getState().flyTo(
        { x: standX, y: 1.7, z: standZ },
        { x: worldX, y: artifact.position.y, z: worldZ },
        openModal,
      );
    };

    if (state.currentRoomId !== finalRoomId) {
      // Transition into the room, then fly to the artifact
      useTransitionStore.getState().startTransition('enter', () => {
        usePalaceStore.getState().setCurrentRoomId(finalRoomId);
        useCameraStore.getState().exitOverview();
        // Teleport to room entry so the fly starts from a sensible position
        const entryX = room.position.x + room.dimensions.w / 2;
        const entryZ = room.position.z + room.dimensions.d - 0.5;
        useCameraStore.getState().teleport({ x: entryX, y: 1.7, z: entryZ });
        flyToArtifact();
      });
    } else {
      flyToArtifact();
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
          {/* Logo instead of manual alert */}
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto mb-6">
            <Logo size={40} className="opacity-40 grayscale" />
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
      {/* 3D palace scene — shifts right when side panel is open */}
      <PalaceCanvas onArtifactClick={handleArtifactClick} leftOffset={panelOpen && !isMobile ? PANEL_WIDTH : 0} />

      {/* Loading overlay */}
      {(loading || isSeeding) && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[rgba(6,6,20,0.94)] z-overlay backdrop-blur-md">
          <div className="relative">
            <Logo size={64} className="relative z-10" />
            <div className="absolute inset-0 bg-indigo-500/25 blur-3xl animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-primary-muted border-t-primary animate-spin" />
            <span className="font-body text-xs text-text-muted tracking-[0.2em] uppercase font-semibold">
              {isSeeding ? 'Initializing your Memory Palace…' : 'Reconstructing Palace…'}
            </span>
            {isSeeding && (
              <span className="font-body text-[11px] text-text-faint italic">
                This might take a moment while we build your first rooms...
              </span>
            )}
          </div>
        </div>
      )}

      {/* HUD — bottom-center: unified action bar */}
      <ActionBar />

      {/* Tool activity toast — appears when Gemini calls a tool */}
      <ToolActivityToast />

      {/* Mobile Joystick */}
      {isMobile && !isOverviewMode && <Joystick />}




      {/* Capture status overlays - hide when panel is active */}
      <CapturePreview />
      {(!useCaptureStore.getState().showPanel) && (
        <>
          <CaptureOverlay />
          <ConceptToast />
        </>
      )}
      <CaptureComplete onClose={() => useCaptureStore.getState().reset()} />
      <RoomSuggestionModal />

      {/* Panel reopen tab — visible on desktop when panel is closed */}
      {!panelOpen && !isMobile && (
        <button
          onClick={() => useVoiceStore.getState().setShowPanel(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-response-panel flex flex-col items-center justify-center gap-1.5 bg-[rgba(255,255,255,0.92)] backdrop-blur-xl border border-r border-[rgba(0,0,0,0.08)] rounded-r-xl px-1.5 py-4 shadow-md hover:bg-white transition-colors group"
          title="Open conversation panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-500 transition-colors">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
            Chat
          </span>
        </button>
      )}

      {/* Voice and Capture UI (T105, T106, T107) */}
      <ResponsePanel />

      {/* Artifact detail modal (T113) */}
      {selectedArtifact && (
        <ArtifactDetailModal
          artifactId={selectedArtifact.id}
          onClose={() => setSelectedArtifact(null)}
        />
      )}

      {/* Handle live_tool_call: close_artifact */}
      {useEffect(() => {
        return ws.on('live_tool_call', (msg) => {
          if (msg.tool === 'close_artifact' || msg.payload.closeArtifact) {
            setSelectedArtifact(null);
          }
        });
      }, [ws])}

      {/* Magical Transition Overlay */}
      <TransitionOverlay />
    </>
  );
}
