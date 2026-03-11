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

// Per-style palette — keyed to RoomStyle.
// ⚠ Toon shading tip: sideWall must be a mid-tone (RGB ≥ 80 in at least one channel)
// or it will render near-black. Lighter = more visible under the 4-step gradient.
const STYLE_THEMES = {
  library: {
    sideWall: '#7A5230',   // Warm mahogany (mid-tone brown)
    accentWall: '#A06840', // Lighter amber back wall
    floorLight: '#C8A882', // Warm wood plank A
    floorDark: '#A0805A',  // Warm wood plank B
    ambientColor: '#FFA040',
    ambientIntensity: 2.0,
    bookColors: ['#D97706', '#B45309', '#92400E', '#78350F'],
  },
  lab: {
    sideWall: '#2A5F8A',   // Medium navy-blue
    accentWall: '#38A0D0', // Bright cyan accent
    floorLight: '#CBD5E1', // Cool slate plank A
    floorDark: '#94A3B8',  // Slightly deeper plank B
    ambientColor: '#7DD3FC',
    ambientIntensity: 2.2,
    bookColors: ['#38BDF8', '#818CF8', '#34D399', '#F472B6'],
  },
  gallery: {
    sideWall: '#D8D0C8',   // Warm off-white (visible but clean)
    accentWall: '#C0B8B0', // Slightly deeper off-white
    floorLight: '#F5F0EB', // Light warm plank A
    floorDark: '#E0DAD3',  // Slightly deeper plank B
    ambientColor: '#FFF8F0',
    ambientIntensity: 3.2,
    bookColors: ['#6B7280', '#374151', '#111827', '#9CA3AF'],
  },
  garden: {
    sideWall: '#2D6E4E',   // Medium forest green
    accentWall: '#4A9A70', // Lighter green accent
    floorLight: '#74C69D', // Light sage plank A
    floorDark: '#52B788',  // Deeper sage plank B
    ambientColor: '#B7E4C7',
    ambientIntensity: 2.2,
    bookColors: ['#40916C', '#52B788', '#95D5B2', '#D8F3DC'],
  },
  workshop: {
    sideWall: '#7A4520',   // Medium burnt sienna
    accentWall: '#A85A28', // Warmer rust accent
    floorLight: '#C68642', // Worn oak plank A
    floorDark: '#A0522D',  // Sienna plank B
    ambientColor: '#FDBA74',
    ambientIntensity: 1.8,
    bookColors: ['#F97316', '#EA580C', '#DC2626', '#B45309'],
  },
  museum: {
    sideWall: '#8A7255',   // Warm sandstone (mid-tone)
    accentWall: '#B09A78', // Lighter ochre accent
    floorLight: '#D4C5A9', // Pale marble plank A
    floorDark: '#B8A88A',  // Deeper sandstone plank B
    ambientColor: '#FFD89B',
    ambientIntensity: 2.0,
    bookColors: ['#C8A45A', '#A07840', '#8B6530', '#6B4C20'],
  },
  observatory: {
    sideWall: '#1E4B8B',   // Deep indigo-blue (mid-dark but visible)
    accentWall: '#4A90D9', // Bright sky-blue accent
    floorLight: '#2A5080', // Midnight blue plank A
    floorDark: '#1A3860',  // Deeper midnight plank B
    ambientColor: '#60D0FF',
    ambientIntensity: 2.0,
    bookColors: ['#38BDF8', '#818CF8', '#C084FC', '#E879F9'],
  },
  sanctuary: {
    sideWall: '#7B9E87',   // Soft sage (already good)
    accentWall: '#A8C5A0', // Lighter sage accent
    floorLight: '#F0E6D3', // Warm cream plank A
    floorDark: '#E2D4BC',  // Deeper cream plank B
    ambientColor: '#D1FAE5',
    ambientIntensity: 2.6,
    bookColors: ['#6EE7B7', '#34D399', '#A7F3D0', '#6EE7B7'],
  },
  studio: {
    sideWall: '#9A5030',   // Medium terracotta
    accentWall: '#C87848', // Warm burnt orange accent
    floorLight: '#DEB887', // Burlywood plank A
    floorDark: '#CD853F',  // Peru plank B
    ambientColor: '#FFCC80',
    ambientIntensity: 2.0,
    bookColors: ['#FBBF24', '#F59E0B', '#D97706', '#B45309'],
  },
  dojo: {
    sideWall: '#6B2A1A',   // Medium dark crimson-cedar
    accentWall: '#9A1A1A', // Deep crimson accent
    floorLight: '#8B6020', // Warm dark wood plank A
    floorDark: '#6A4810',  // Deeper plank B
    ambientColor: '#FF8C42',
    ambientIntensity: 1.8,
    bookColors: ['#DC2626', '#B91C1C', '#F97316', '#7F1D1D'],
  },
} as const;

type Theme = typeof STYLE_THEMES[keyof typeof STYLE_THEMES];

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
  const theme = STYLE_THEMES[(room.style ?? 'library') as keyof typeof STYLE_THEMES] ?? STYLE_THEMES.library;
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

          <Text
            position={[w / 2, h + 1.2, d / 2]}
            fontSize={0.6}
            color="rgba(255,255,255,0.7)"
            anchorX="center"
            anchorY="middle"
          >
            {`${room.artifactCount} MEMORIES${room.firstMemoryAt ? ` | ${new Date(room.firstMemoryAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${room.lastMemoryAt && room.lastMemoryAt !== room.firstMemoryAt ? ` — ${new Date(room.lastMemoryAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}` : ''}`}
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
