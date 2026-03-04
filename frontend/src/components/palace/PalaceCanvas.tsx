import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FirstPersonControls } from '../navigation/FirstPersonControls';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { Corridor } from './Corridor';
import { Artifact } from '../artifacts/Artifact';
import { ArtifactTooltip } from '../artifacts/ArtifactTooltip';
import { usePalaceStore } from '../../stores/palaceStore';
import type { Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';

const CANVAS_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#060614',
  cursor: 'crosshair',
};

interface PalaceCanvasProps {
  onArtifactClick?: (artifact: ArtifactData) => void;
}

export function PalaceCanvas({ onArtifactClick }: PalaceCanvasProps) {
  const { palace, layout, rooms, artifacts } = usePalaceStore();
  const [hoveredArtifact, setHoveredArtifact] = useState<ArtifactData | null>(null);

  if (!palace || !layout) {
    return (
      <div style={{ ...CANVAS_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        Loading palace…
      </div>
    );
  }

  return (
    <Canvas
      style={CANVAS_STYLE}
      camera={{ fov: 75, near: 0.1, far: 500, position: [6, 1.7, 6] }}
      shadows
      gl={{ antialias: true }}
    >
      <fog attach="fog" args={['#060614', 20, 80]} />

      <Suspense fallback={null}>
        {/* Lobby */}
        <Lobby
          lobbyDoors={layout.lobbyDoors}
          rooms={rooms}
          onEnterRoom={(roomId) => usePalaceStore.getState().setCurrentRoomId(roomId)}
        />

        {/* Rooms with their artifacts */}
        {rooms.map((room) => {
          const doors: DoorSpec[] = (room.connections ?? []).map((targetId, i) => ({
            wall: 'north',
            index: i,
            targetRoomId: targetId,
          }));
          const roomArtifacts = artifacts[room.id] ?? [];
          return (
            <Room key={room.id} room={room} doors={doors}>
              {roomArtifacts.map((artifact) => (
                <Artifact
                  key={artifact.id}
                  artifact={artifact}
                  onClick={onArtifactClick}
                  onHover={setHoveredArtifact}
                />
              ))}
            </Room>
          );
        })}

        {/* Hover tooltip */}
        {hoveredArtifact && <ArtifactTooltip artifact={hoveredArtifact} />}

        {/* Corridors */}
        {layout.corridors?.map((c, i) => {
          const from = rooms.find((r) => r.id === c.fromRoomId)?.position;
          const to = rooms.find((r) => r.id === c.toRoomId)?.position;
          if (!from || !to) return null;
          return <Corridor key={i} from={from} to={to} />;
        })}
      </Suspense>

      <FirstPersonControls />
    </Canvas>
  );
}
