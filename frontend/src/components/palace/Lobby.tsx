import { useMemo } from 'react';
import { Text, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useCameraStore } from '../../stores/cameraStore';
import { usePalaceStore } from '../../stores/palaceStore';
import { useTransitionStore } from '../../stores/transitionStore';
import { Door } from './Door';
import type { LobbyDoor, Room } from '../../types/palace';

const LOBBY_SIZE = 12;
const LOBBY_HEIGHT = 5;

// Pre-load the microphone model
useGLTF.preload('/models/microphone.glb');

interface LobbyProps {
  lobbyDoors: LobbyDoor[];
  rooms: Room[];
  onEnterRoom: (roomId: string) => void;
  onEnterLobby?: () => void;
  onRoomContextMenu?: (roomId: string, screenX: number, screenY: number) => void;
}

// Compute door position on a wall, supporting multiple doors per wall via doorIndex.
// doorIndex=0 → centre door, doorIndex=1 → offset right, etc.
const DOOR_SPACING = 2.2; // horizontal offset between doors on the same wall

function wallDoorPosition(wall: string, doorIndex: number): [number, number, number] {
  const offset = (doorIndex - 0) * DOOR_SPACING; // first door centred, extras shift right
  switch (wall) {
    case 'north':
      return [LOBBY_SIZE / 2 + offset, 0, 0.06];
    case 'south':
      return [LOBBY_SIZE / 2 + offset, 0, LOBBY_SIZE - 0.06];
    case 'east':
      return [LOBBY_SIZE - 0.06, 0, LOBBY_SIZE / 2 + offset];
    case 'west':
      return [0.06, 0, LOBBY_SIZE / 2 + offset];
    default:
      return [LOBBY_SIZE / 2, 0, 0];
  }
}

export function Lobby({ lobbyDoors, rooms, onEnterRoom, onEnterLobby, onRoomContextMenu }: LobbyProps) {
  const isOverviewMode = useCameraStore(s => s.isOverviewMode);
  const highlightedDoorRoomId = usePalaceStore(s => s.highlightedLobbyDoorRoomId);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const micGLTF = useGLTF('/models/microphone.glb');

  // Load the grand ornate ceiling texture
  const ceilingTex = useTexture('/textures/lobby_ceiling_texture.png');
  // Load the simple stone floor texture
  const floorTex = useTexture('/textures/lobby_floor_texture.png');

  // Set tiling on floor texture
  if (floorTex) {
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);
  }

  const micScene = useMemo(() => {
    const clone = micGLTF.scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const oldMat = mesh.material as THREE.MeshStandardMaterial;
        mesh.material = new THREE.MeshBasicMaterial({
          color: oldMat.color,
          map: oldMat.map,
        });
      }
    });
    return clone;
  }, [micGLTF.scene]);

  return (
    <group>
      {/* ── Lights first so everything picks them up ─────────────────────── */}
      <ambientLight intensity={0.8} color="#b0b8ff" />

      {/* Grand central overhead point light */}
      <pointLight
        position={[LOBBY_SIZE / 2, LOBBY_HEIGHT - 1.0, LOBBY_SIZE / 2]}
        intensity={12}
        color="#ffffff"
        distance={30}
        decay={2.0}
      />

      {/* ── Floor ─────────────────────────────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LOBBY_SIZE / 2, 0, LOBBY_SIZE / 2]} receiveShadow>
        <planeGeometry args={[LOBBY_SIZE, LOBBY_SIZE]} />
        <meshStandardMaterial
          map={floorTex}
          color="#ffffff" // Fully white multiplier for max texture visibility
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* ── Ceiling ───────────────────────────────────────────────────────── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[LOBBY_SIZE / 2, LOBBY_HEIGHT, LOBBY_SIZE / 2]}>
        <planeGeometry args={[LOBBY_SIZE, LOBBY_SIZE]} />
        <meshStandardMaterial
          map={ceilingTex}
          metalness={0.9}
          roughness={0.1}
          emissive="#1a1a38"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* ── Walls (north / south) ─────────────────────────────────────────── */}
      {(['north', 'south'] as const).map((side) => (
        <mesh
          key={side}
          position={[LOBBY_SIZE / 2, LOBBY_HEIGHT / 2, side === 'north' ? 0 : LOBBY_SIZE]}
        >
          <planeGeometry args={[LOBBY_SIZE, LOBBY_HEIGHT]} />
          <meshStandardMaterial color="#1a1a45" side={2} roughness={0.6} metalness={0.1} />
        </mesh>
      ))}

      {/* ── Walls (east / west) ───────────────────────────────────────────── */}
      {(['east', 'west'] as const).map((side) => (
        <mesh
          key={side}
          rotation={[0, Math.PI / 2, 0]}
          position={[side === 'east' ? LOBBY_SIZE : 0, LOBBY_HEIGHT / 2, LOBBY_SIZE / 2]}
        >
          <planeGeometry args={[LOBBY_SIZE, LOBBY_HEIGHT]} />
          <meshStandardMaterial color="#1a1a45" side={2} roughness={0.6} metalness={0.1} />
        </mesh>
      ))}

      {/* ── Title text — facing camera ──────────── */}
      <Text
        position={[LOBBY_SIZE / 2, 3.8, LOBBY_SIZE - 0.15]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.85}
        color="#f0e0ff"
        anchorX="center"
        anchorY="middle"
        font="https://cdn.jsdelivr.net/fontsource/fonts/cinzel@5/latin-400-normal.woff"
        outlineColor="#d4af37" // Golden outline
        outlineWidth={0.03}
      >
        Memory Palace
      </Text>

      {/* On-wall "LOBBY" label (North wall) removed per user request */}

      {/* ── Centerpiece Microphone ────────────────────────────────────────── */}
      <group position={[LOBBY_SIZE / 2, 1.2, 3]}>
        {/* Slowly rotate or just place statically. For now, static in center of lobby */}
        <primitive
          object={micScene}
          scale={0.6}
          rotation={[0, Math.PI / 4, 0]}
        />
        <pointLight color="#8a5af9" intensity={3} distance={5} decay={2} />
      </group>

      {/* ── Doors to rooms ────────────────────────────────────────────────── */}
      {
        lobbyDoors.map((ld) => {
          const room = roomMap.get(ld.roomId);
          const pos = wallDoorPosition(ld.wallPosition, ld.doorIndex ?? 0);
          return (
            <Door
              key={ld.roomId}
              wall={ld.wallPosition}
              position={pos}
              targetRoomName={room?.name}
              onEnter={() => onEnterRoom(ld.roomId)}
              onContextMenu={(sx, sy) => onRoomContextMenu?.(ld.roomId, sx, sy)}
              highlighted={ld.roomId === highlightedDoorRoomId}
            />
          );
        })
      }

      {/* Bird's-eye Labeled Island visuals for Lobby */}
      {
        isOverviewMode && (
          <>
            {/* Overview LOBBY label removed per user request */}

            <mesh
              position={[LOBBY_SIZE / 2, LOBBY_HEIGHT / 2, LOBBY_SIZE / 2]}
              onClick={(e) => {
                e.stopPropagation();
                if (onEnterLobby) onEnterLobby();
                else {
                  // Default transition to lobby center
                  const { startTransition } = useTransitionStore.getState();
                  startTransition('enter', () => {
                    usePalaceStore.getState().setCurrentRoomId(null);
                    useCameraStore.getState().teleport({ x: 6, y: 1.7, z: 6 });
                    useCameraStore.getState().exitOverview();
                  });
                }
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <boxGeometry args={[LOBBY_SIZE + 1, LOBBY_HEIGHT + 2, LOBBY_SIZE + 1]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </>
        )
      }
    </group >
  );
}
