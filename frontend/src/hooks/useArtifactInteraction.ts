import { useState, useCallback } from 'react';
import type { Artifact } from '../types/palace';
import { useWS } from './useWS';

interface UseArtifactInteractionReturn {
  hoveredArtifact: Artifact | null;
  selectedArtifact: Artifact | null;
  onArtifactHover: (artifact: Artifact | null) => void;
  onArtifactClick: (artifact: Artifact) => void;
  clearSelection: () => void;
}

export function useArtifactInteraction(currentRoomId: string | null): UseArtifactInteractionReturn {
  const ws = useWS();
  const [hoveredArtifact, setHoveredArtifact] = useState<Artifact | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  const onArtifactHover = useCallback((artifact: Artifact | null) => {
    setHoveredArtifact(artifact);
  }, []);

  const onArtifactClick = useCallback(
    (artifact: Artifact) => {
      const roomId = artifact.roomId ?? currentRoomId ?? '';
      console.log(`[useArtifactInteraction] Artifact Click: id=${artifact.id}, roomId=${roomId}`);
      setSelectedArtifact(artifact);
      ws.sendArtifactClick(artifact.id, roomId);
    },
    [ws, currentRoomId],
  );

  const clearSelection = useCallback(() => {
    setSelectedArtifact(null);
  }, []);

  return { hoveredArtifact, selectedArtifact, onArtifactHover, onArtifactClick, clearSelection };
}
