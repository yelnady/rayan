import { useState, useCallback } from 'react';
import { useWS } from './useWS';
export function useArtifactInteraction(currentRoomId) {
    const ws = useWS();
    const [hoveredArtifact, setHoveredArtifact] = useState(null);
    const [selectedArtifact, setSelectedArtifact] = useState(null);
    const onArtifactHover = useCallback((artifact) => {
        setHoveredArtifact(artifact);
    }, []);
    const onArtifactClick = useCallback((artifact) => {
        setSelectedArtifact(artifact);
        const roomId = artifact.roomId ?? currentRoomId ?? '';
        ws.sendArtifactClick(artifact.id, roomId);
    }, [ws, currentRoomId]);
    const clearSelection = useCallback(() => {
        setSelectedArtifact(null);
    }, []);
    return { hoveredArtifact, selectedArtifact, onArtifactHover, onArtifactClick, clearSelection };
}
