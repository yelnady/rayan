import { Suspense, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { FirstPersonControls } from '../navigation/FirstPersonControls';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { Corridor } from './Corridor';
import { Artifact } from '../artifacts/Artifact';
import { usePalaceStore } from '../../stores/palaceStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useTransitionStore } from '../../stores/transitionStore';
import type { Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';
import type { LobbyDoor, WallPosition } from '../../types/palace';

// ─── T156 (deferred): When texture assets are added, register KTX2Loader here:
//   import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
//   import { useKTX2 } from '@react-three/drei';
//   Add to <Canvas> gl prop: { onCreated: ({ gl }) => { gl.initGLContext?.(); } }
//   Then use: const floorTex = useKTX2('/textures/floor.ktx2') in theme decorators.

import { BakeShadows, useTexture, OrbitControls } from '@react-three/drei';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';


const CANVAS_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#060614',
};

const WALL_CYCLE: WallPosition[] = ['north', 'east', 'south', 'west'];

interface PalaceCanvasProps {
  onArtifactClick?: (artifact: ArtifactData) => void;
}

// Global massive ground plane that sits slightly below all rooms
function PalaceGround() {
  const groundTex = useTexture('/textures/palace_ground_texture.png');
  const groundMaterial = useMemo(() => {
    const tex = groundTex.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(50, 50); // Tile it heavily so it looks detailed across a massive area
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: tex,
      color: '#A0A0A0', // Slightly darken it so it's a moody background, not overly bright
      roughness: 0.6,
      metalness: 0.2, // Give it a slight sheen
    });
  }, [groundTex]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]} // Just below the floors of the rooms (y=0)
      receiveShadow
    >
      <planeGeometry args={[500, 500]} />
      <primitive object={groundMaterial} attach="material" />
    </mesh>
  );
}

// Positions the camera bird's-eye style when overview mode is entered.
// Sets camera position during render (useMemo) so OrbitControls' constructor
// already sees the correct position — useEffect would run too late.
function OverviewCameraRig({ centerX, centerZ }: { centerX: number; centerZ: number }) {
  const { camera } = useThree();
  const isOverviewMode = useCameraStore((s) => s.isOverviewMode);

  useMemo(() => {
    if (!isOverviewMode) return;
    camera.position.set(centerX, 35, centerZ + 45);
    camera.lookAt(centerX, 0, centerZ);
    (camera as THREE.PerspectiveCamera).fov = 50;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [isOverviewMode, camera, centerX, centerZ]);

  return null;
}

export function PalaceCanvas({ onArtifactClick }: PalaceCanvasProps) {
  const { palace, layout, rooms, artifacts } = usePalaceStore();
  const isOverviewMode = useCameraStore((s) => s.isOverviewMode);

  // Compute centroid of all rooms (+ lobby at 6,0,6) for overview camera target
  const overviewCenter = useMemo(() => {
    if (rooms.length === 0) return { x: 6, z: 6 };
    const xs = rooms.map((r) => r.position.x + r.dimensions.w / 2);
    const zs = rooms.map((r) => r.position.z + r.dimensions.d / 2);
    xs.push(6); zs.push(6); // include lobby center
    return {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      z: zs.reduce((a, b) => a + b, 0) / zs.length,
    };
  }, [rooms]);

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
    useTransitionStore.getState().startTransition('enter', () => {
      const state = usePalaceStore.getState();
      state.setCurrentRoomId(roomId);
      const targetRoom = state.rooms.find(r => r.id === roomId);
      if (targetRoom) {
        useCameraStore.getState().exitOverview();

        const w = targetRoom.dimensions.w;
        const d = targetRoom.dimensions.d;
        const h = targetRoom.style === 'library' ? 5 : 4.5; // Roughly match Room.tsx heights

        // Calculate room world bounds
        const startX = targetRoom.position.x;
        const startZ = targetRoom.position.z;

        // Position camera at the "back" of the room (opposite the name wall at local Z=0)
        // We push it back towards local Z=d as much as possible with a small margin
        const entryX = startX + w / 2;
        const entryZ = startZ + d - 1.5;

        useCameraStore.getState().teleport({
          x: entryX,
          y: 1.7, // Human eye level
          z: entryZ,
        });

        // Facing the "front" wall (local Z=0) where the room name is
        useCameraStore.getState().lookAt({
          x: startX + w / 2,
          y: h * 0.8, // Look slightly up towards the name plate
          z: startZ,
        });
      }
    });
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
        <fog attach="fog" args={['#060614', isOverviewMode ? 60 : 20, isOverviewMode ? 200 : 80]} />

        <Suspense fallback={null}>
          <BakeShadows />
          {/* Universal palace ground floor */}
          <PalaceGround />

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
                onEnter={() => handleEnterRoom(room.id)}
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

          <EffectComposer enableNormalPass={false}>
            <N8AO aoRadius={0.5} intensity={2} color="black" />
          </EffectComposer>
        </Suspense>

        <OverviewCameraRig centerX={overviewCenter.x} centerZ={overviewCenter.z} />
        {isOverviewMode
          ? <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.2}
            target={[overviewCenter.x, 0, overviewCenter.z]}
          />
          : <FirstPersonControls />
        }
      </Canvas>

      {/* Target Crosshair Removed */}
    </>
  );
}
