import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FirstPersonControls } from '../navigation/FirstPersonControls';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { Corridor } from './Corridor';
import { Artifact } from '../artifacts/Artifact';
import { ArtifactTooltip } from '../artifacts/ArtifactTooltip';
import { usePalaceStore } from '../../stores/palaceStore';
import { useCameraStore } from '../../stores/cameraStore';
import type { Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';
import type { LobbyDoor, WallPosition } from '../../types/palace';

const CANVAS_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#060614',
};

const WALL_CYCLE: WallPosition[] = ['north', 'east', 'south', 'west'];

interface PalaceCanvasProps {
  onArtifactClick?: (artifact: ArtifactData) => void;
}

export function PalaceCanvas({ onArtifactClick }: PalaceCanvasProps) {
  const { palace, layout, rooms, artifacts } = usePalaceStore();
  const [hoveredArtifact, setHoveredArtifact] = useState<ArtifactData | null>(null);

  // Show nothing until the palace record itself exists (very brief flash at most)
  if (!palace) {
    return <div style={CANVAS_STYLE} />;
  }

  // layout may be null if the palace was just created (no rooms yet) — render the
  // lobby anyway so the user never sees a black void.
  let lobbyDoors = layout?.lobbyDoors ?? [];

  // Auto-generate lobby doors when the layout has none but rooms exist.
  // This handles the common case where rooms were seeded but lobbyDoors
  // weren't written back to the layout document.
  if (lobbyDoors.length === 0 && rooms.length > 0) {
    lobbyDoors = rooms.map((room, i): LobbyDoor => ({
      roomId: room.id,
      wallPosition: WALL_CYCLE[i % WALL_CYCLE.length],
      doorIndex: Math.floor(i / WALL_CYCLE.length),
    }));
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
        {/* Lobby — always rendered; doors are empty when layout hasn't loaded yet */}
        <Lobby
          lobbyDoors={lobbyDoors}
          rooms={rooms}
          onEnterRoom={(roomId) => {
            const state = usePalaceStore.getState();
            state.setCurrentRoomId(roomId);
            const targetRoom = state.rooms.find(r => r.id === roomId);
            if (targetRoom) {
              useCameraStore.getState().teleport({
                x: targetRoom.position.x + targetRoom.dimensions.w / 2,
                y: targetRoom.position.y + 1.7, // Eye height above floor
                z: targetRoom.position.z + targetRoom.dimensions.d - 1,
              });
            }
          }}
        />

        {/* Rooms with their artifacts */}
        {rooms.map((room, index) => {
          const doors: DoorSpec[] = (room.connections ?? []).map((targetId, i) => ({
            wall: 'north',
            index: i,
            targetRoomId: targetId,
          }));
          const roomArtifacts = artifacts[room.id] ?? [];
          return (
            <Room key={room.id} room={room} index={index} doors={doors}>
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
        {layout?.corridors?.map((c, i) => {
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
