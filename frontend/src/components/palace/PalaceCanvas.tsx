import { Suspense, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { FirstPersonControls } from '../navigation/FirstPersonControls';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { Corridor } from './Corridor';
import { Artifact } from '../artifacts/Artifact';
import { usePalaceStore } from '../../stores/palaceStore';
import { useCameraStore } from '../../stores/cameraStore';
import type { Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';
import type { LobbyDoor, WallPosition } from '../../types/palace';

// ─── T156 (deferred): When texture assets are added, register KTX2Loader here:
//   import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
//   import { useKTX2 } from '@react-three/drei';
//   Add to <Canvas> gl prop: { onCreated: ({ gl }) => { gl.initGLContext?.(); } }
//   Then use: const floorTex = useKTX2('/textures/floor.ktx2') in theme decorators.

import { BakeShadows } from '@react-three/drei';

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

  // Compute raw lobby doors (used in useMemo below — must happen before any hooks)
  const rawLobbyDoors = (() => {
    const base = layout?.lobbyDoors ?? [];
    if (base.length === 0 && rooms.length > 0) {
      return rooms.map((room, i): LobbyDoor => ({
        roomId: room.id,
        wallPosition: WALL_CYCLE[i % WALL_CYCLE.length],
        doorIndex: Math.floor(i / WALL_CYCLE.length),
      }));
    }
    return base;
  })();

  // T157: Memoize lobby doors to avoid unnecessary Lobby re-renders
  const lobbyDoors = useMemo(() => rawLobbyDoors, [JSON.stringify(rawLobbyDoors)]);

  // T157: Stable callback so Lobby/Door children don't re-render on every PalaceCanvas render
  const handleEnterRoom = useCallback((roomId: string) => {
    const state = usePalaceStore.getState();
    state.setCurrentRoomId(roomId);
    const targetRoom = state.rooms.find(r => r.id === roomId);
    if (targetRoom) {
      useCameraStore.getState().teleport({
        x: targetRoom.position.x + targetRoom.dimensions.w / 2,
        y: 1.7,
        z: targetRoom.position.z + targetRoom.dimensions.d / 2,
      });
    }
  }, []);

  // Show nothing until the palace record itself exists (very brief flash at most)
  if (!palace) {
    return <div style={CANVAS_STYLE} />;
  }

  return (
    <>
      <Canvas
        style={CANVAS_STYLE}
        // T154: Tightened far plane (500→200) — all rooms are within ~100 units.
        // Three.js frustumCulled=true is the default on every mesh, so off-screen
        // geometry is already rejected by the GPU before rasterization.
        camera={{ fov: 75, near: 0.1, far: 200, position: [6, 1.7, 6] }}
        shadows
        dpr={[1, 1.5]} // Caps pixel ratio on high-res screens (like Retina Macs) to prevent lag
        performance={{ min: 0.5 }} // Allows R3F to scale down performance if frame rate drops
        gl={{
          antialias: true,
          // T154: Hint the browser to favor the high-performance GPU on multi-GPU systems.
          powerPreference: 'high-performance',
        }}
      >
        <fog attach="fog" args={['#060614', 20, 80]} />

        <Suspense fallback={null}>
          <BakeShadows />
          {/* Lobby — always rendered; doors are empty when layout hasn't loaded yet */}
          <Lobby
            lobbyDoors={lobbyDoors}
            rooms={rooms}
            onEnterRoom={handleEnterRoom}
          />

          {/* Rooms with their artifacts */}
          {rooms.map((room, index) => {
            // T157: doors array built per room (stable across renders unless connections change)
            const doors: DoorSpec[] = (room.connections ?? []).map((targetId, i) => ({
              wall: 'north',
              index: i,
              targetRoomId: targetId,
            }));
            const roomArtifacts = artifacts[room.id] ?? [];

            // T153: books and orbs are now instanced inside Room via BookInstancedRenderer /
            // OrbInstancedRenderer — only pass the remaining types through children.
            const nonInstancedArtifacts = roomArtifacts.filter(
              (a) => a.visual !== 'floating_book' && a.visual !== 'crystal_orb',
            );

            return (
              <Room
                key={room.id}
                room={room}
                index={index}
                doors={doors}
                artifacts={roomArtifacts}
                onArtifactClick={onArtifactClick}
              >
                {nonInstancedArtifacts.map((artifact) => (
                  <Artifact
                    key={artifact.id}
                    artifact={artifact}
                    onClick={onArtifactClick}
                  />
                ))}
              </Room>
            );
          })}


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

      {/* Target Crosshair */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '6px',
          height: '6px',
          backgroundColor: 'white',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          mixBlendMode: 'difference',
          zIndex: 1000,
        }}
      />
    </>
  );
}
