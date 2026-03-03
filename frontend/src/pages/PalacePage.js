import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
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
export function PalacePage() {
    // Start WebSocket connection and wire all server → store listeners
    const ws = useWS();
    // Load palace data into palaceStore on mount
    const { loading, error, reload } = usePalace();
    const currentRoomId = usePalaceStore((s) => s.currentRoomId);
    // ── T115: Artifact detail modal state ──────────────────────────────────────
    const [selectedArtifact, setSelectedArtifact] = useState(null);
    /** T115 — send artifact_click WS message and open the detail modal. */
    function handleArtifactClick(artifact) {
        const roomId = artifact.roomId ?? currentRoomId ?? '';
        ws.sendArtifactClick(artifact.id, roomId);
        setSelectedArtifact({ id: artifact.id, roomId });
    }
    if (error) {
        return (_jsxs("div", { style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: '#fff',
                background: '#060614',
                gap: 16,
            }, children: [_jsxs("p", { style: { color: '#ff6b6b' }, children: ["Failed to load palace: ", error] }), _jsx("button", { onClick: reload, style: {
                        padding: '8px 20px',
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                    }, children: "Retry" })] }));
    }
    const voiceContext = {
        currentRoomId: currentRoomId ?? null,
        focusedArtifactId: selectedArtifact?.id ?? null,
    };
    return (_jsxs(_Fragment, { children: [_jsx(PalaceCanvas, { onArtifactClick: handleArtifactClick }), loading && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(6,6,20,0.85)',
                    color: '#fff',
                    zIndex: 50,
                    fontSize: 18,
                }, children: "Loading your memory palace\u2026" })), _jsxs("div", { style: {
                    position: 'fixed',
                    bottom: 32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                }, children: [_jsx(CaptureButton, { source: "webcam" }), _jsx(VoiceButton, { context: voiceContext })] }), currentRoomId && (_jsxs("div", { style: {
                    position: 'fixed',
                    top: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 14,
                    letterSpacing: '0.05em',
                    pointerEvents: 'none',
                }, children: ["Room: ", currentRoomId] })), _jsx(CaptureOverlay, {}), _jsx(ConceptToast, {}), _jsx(CaptureComplete, { onClose: () => useCaptureStore.getState().reset() }), _jsx(RoomSuggestionModal, {}), _jsx(VoiceIndicator, {}), _jsx(ResponsePanel, {}), selectedArtifact && (_jsx(ArtifactDetailModal, { artifactId: selectedArtifact.id, onClose: () => setSelectedArtifact(null) }))] }));
}
