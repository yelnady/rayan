import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useCameraStore } from '../../stores/cameraStore';
import { WallsWithDoors } from './WallsWithDoors';
import { BookInstancedRenderer } from '../artifacts/BookInstancedRenderer';
import { OrbInstancedRenderer } from '../artifacts/OrbInstancedRenderer';
import type { Room as RoomData, Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';

// 4-step toon gradient — gives richer mid-tones and a sharper highlight
const TOON_GRADIENT = (() => {
  const data = new Uint8Array([40, 100, 180, 240]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  return tex;
})();

import { Door } from './Door';

interface RoomProps {
  room: RoomData;
  index: number;
  doors?: DoorSpec[];
  /** T153: artifacts array so Room can render instanced books/orbs */
  artifacts?: ArtifactData[];
  highlightedIds?: string[];
  onArtifactClick?: (artifact: ArtifactData) => void;
  onEnter?: () => void;
  onExitLobby?: () => void;
  onEnterRoom?: (roomId: string) => void;
  children?: React.ReactNode;
}

// Bruno Simon–inspired palette
const THEMES = [
  {
    name: 'studio',
    sideWall: '#4C1D95', // Rich deep purple
    accentWall: '#BE185D', // Bold rose-pink (north / back wall)
    floorLight: '#FDE68A', // Warm honey-wood plank A
    floorDark: '#FCD34D', // Warm honey-wood plank B
    shelfFrame: '#2E1065', // Near-black purple
    ambientColor: '#E879F9',
    ambientIntensity: 2.2,
    bookColors: ['#10B981', '#F97316', '#3B82F6', '#EF4444'],
  },
  {
    name: 'lounge',
    sideWall: '#7C3AED', // Medium purple
    accentWall: '#0F172A', // Near-black deep indigo (dramatic contrast)
    floorLight: '#DDD6FE', // Soft lavender plank A
    floorDark: '#C4B5FD', // Slightly deeper lavender plank B
    shelfFrame: '#3B0764',
    ambientColor: '#C084FC',
    ambientIntensity: 2.0,
    bookColors: ['#FCD34D', '#60A5FA', '#34D399', '#F87171'],
  },
  {
    name: 'lab',
    sideWall: '#818CF8', // Indigo-blue
    accentWall: '#EAB308', // Golden yellow
    floorLight: '#E2E8F0', // Cool slate plank A
    floorDark: '#CBD5E1', // Slightly deeper plank B
    shelfFrame: '#6366F1',
    ambientColor: '#FEF08A',
    ambientIntensity: 1.8,
    bookColors: ['#A855F7', '#22C55E', '#EF4444', '#F97316'],
  },
] as const;

type Theme = typeof THEMES[number];

const ROOM_HEIGHT = 4.5;

// Compute door position on a room wall
function wallDoorPosition(wall: string, doorIndex: number, w: number, d: number): [number, number, number] {
  const spacing = 2.2;
  const offset = doorIndex * spacing;
  switch (wall) {
    case 'north': return [w / 2 + offset, 0, 0.06];
    case 'south': return [w / 2 + offset, 0, d - 0.06];
    case 'east': return [w - 0.06, 0, d / 2 + offset];
    case 'west': return [0.06, 0, d / 2 + offset];
    default: return [w / 2, 0, 0];
  }
}

export function Room({ room, index, doors = [], artifacts = [], highlightedIds, onArtifactClick, onEnter, onExitLobby, onEnterRoom, children }: RoomProps) {
  const isOverviewMode = useCameraStore(s => s.isOverviewMode);
  const themeIdx = index % THEMES.length;
  const theme = THEMES[themeIdx];
  const h = ROOM_HEIGHT;
  const w = room.dimensions.w;
  const d = room.dimensions.d;

  const bookArtifacts = artifacts.filter((a) => a.visual === 'floating_book');
  const orbArtifacts = artifacts.filter((a) => a.visual === 'crystal_orb');

  return (
    <group position={[room.position.x, room.position.y, room.position.z]}>
      <RoomDecor w={w} d={d} h={h} theme={theme} />

      <WallsWithDoors
        width={w}
        depth={d}
        height={h}
        doors={doors}
        wallColor={theme.sideWall}
        accentWallColor={theme.accentWall}
      />

      {/* Render physical doors in walls */}
      {doors.map((ds, i) => {
        const pos = wallDoorPosition(ds.wall, ds.index, w, d);
        const isLobby = ds.targetRoomId === 'lobby';
        return (
          <Door
            key={i}
            wall={ds.wall}
            position={pos}
            targetRoomName={isLobby ? undefined : 'Room'}
            onEnter={() => isLobby ? onExitLobby?.() : onEnterRoom?.(ds.targetRoomId!)}
            initialOpen={false}
          />
        );
      })}

      <BookInstancedRenderer artifacts={bookArtifacts} onClick={onArtifactClick} highlightedIds={highlightedIds} />
      <OrbInstancedRenderer artifacts={orbArtifacts} onClick={onArtifactClick} highlightedIds={highlightedIds} />

      {/* Bird's-eye Labeled Island visuals */}
      {isOverviewMode && (
        <>
          <Text
            position={[w / 2, h + 2.5, d / 2]}
            fontSize={1.4}
            letterSpacing={0.15}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            font="https://cdn.jsdelivr.net/fontsource/fonts/cinzel@5/latin-400-normal.woff"
            outlineWidth={0.06}
            outlineColor="#000000"
          >
            {room.name.toUpperCase()}
          </Text>

          {/* Invisible click target covering the island volume */}
          <mesh
            position={[w / 2, h / 2, d / 2]}
            onClick={(e) => {
              e.stopPropagation();
              onEnter?.();
            }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <boxGeometry args={[w + 1, h + 2, d + 1]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* On-wall Room Label (First Person) */}
      {!isOverviewMode && (
        <Text
          position={[w / 2, h * 0.78, 0.1]}
          fontSize={0.5}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          font="https://cdn.jsdelivr.net/fontsource/fonts/cinzel@5/latin-400-normal.woff"
          outlineColor="#000000"
          outlineWidth={0.04}
        >
          {room.name.toUpperCase()}
        </Text>
      )}

      {children}
    </group>
  );
}


// ── Plank Floor ───────────────────────────────────────────────────────────────
const PLANK_GAP = 0.025;
const PLANK_WIDTH = 0.55;

function PlankFloor({ w, d, colorA, colorB }: { w: number; d: number; colorA: string; colorB: string }) {
  const matA = useMemo(() => new THREE.MeshToonMaterial({ color: colorA, gradientMap: TOON_GRADIENT }), [colorA]);
  const matB = useMemo(() => new THREE.MeshToonMaterial({ color: colorB, gradientMap: TOON_GRADIENT }), [colorB]);
  const count = Math.ceil(w / PLANK_WIDTH);
  const planks = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: i * PLANK_WIDTH + PLANK_WIDTH / 2,
      mat: i % 2 === 0 ? matA : matB,
    })),
    [count, matA, matB],
  );
  return (
    <group>
      {planks.map(({ x, mat }, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, d / 2]} material={mat}>
          <planeGeometry args={[PLANK_WIDTH - PLANK_GAP, d]} />
        </mesh>
      ))}
    </group>
  );
}

// ── Unified Room Decor (lighting + floor + shelf) ─────────────────────────────
const RoomDecor = memo(function RoomDecor({ w, d, h, theme }: { w: number; d: number; h: number; theme: Theme }) {
  const cx = w / 2;
  const cz = d / 2;


  return (
    <group>
      {/* Lighting: soft ambient + single directional from top-left */}
      <ambientLight intensity={theme.ambientIntensity} color={theme.ambientColor} />
      <directionalLight position={[cx - 4, h + 3, cz + 4]} intensity={2.5} color="#FFFFFF" castShadow />

      {/* Plank floor */}
      <PlankFloor w={w} d={d} colorA={theme.floorLight} colorB={theme.floorDark} />

      {/* Shelf on the back (north) wall */}
      {/* Decorative shelf removed per user request */}
    </group>
  );
});
