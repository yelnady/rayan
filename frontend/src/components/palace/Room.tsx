import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useCameraStore } from '../../stores/cameraStore';
import { WallsWithDoors } from './WallsWithDoors';
import { BookInstancedRenderer } from '../artifacts/BookInstancedRenderer';
import { OrbInstancedRenderer } from '../artifacts/OrbInstancedRenderer';
import type { Room as RoomData, Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec, WallSide } from '../../types/three';

// 4-step toon gradient — gives richer mid-tones and a sharper highlight
const TOON_GRADIENT = (() => {
  const data = new Uint8Array([40, 100, 180, 240]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  return tex;
})();


export interface RoomPortal {
  wall: WallSide;
  targetRoomId: string;
  targetRoomName: string;
}

interface RoomProps {
  room: RoomData;
  index: number;
  doors?: DoorSpec[];
  portals?: RoomPortal[];
  /** T153: artifacts array so Room can render instanced books/orbs */
  artifacts?: ArtifactData[];
  highlightedIds?: string[];
  onArtifactClick?: (artifact: ArtifactData) => void;
  onEnter?: () => void;
  onExitLobby?: () => void;
  onEnterRoom?: (roomId: string) => void;
  onEnterPortal?: (wall: WallSide, targetRoomId: string) => void;
  children?: React.ReactNode;
}

// Per-style palette — keyed to RoomStyle.
// ⚠ Toon shading tip: wall colors must be mid-tones (RGB ≥ 80 in at least one channel)
// or they will render near-black under the 4-step gradient.
const STYLE_THEMES = {
  library: {
    northWall: '#A06840', // Amber
    southWall: '#7A5230', // Mahogany
    eastWall:  '#8B3A20', // Reddish-brown
    westWall:  '#8A5828', // Darker golden-brown
    floorLight: '#C8A882',
    floorDark: '#A0805A',
    ambientColor: '#FFA040',
    ambientIntensity: 2.0,
    bookColors: ['#D97706', '#B45309', '#92400E', '#78350F'],
  },
  lab: {
    northWall: '#1C6A90', // Deep cyan-blue
    southWall: '#2A5F8A', // Navy blue
    eastWall:  '#1A3A6A', // Deep indigo
    westWall:  '#207888', // Dark teal
    floorLight: '#CBD5E1',
    floorDark: '#94A3B8',
    ambientColor: '#7DD3FC',
    ambientIntensity: 2.2,
    bookColors: ['#38BDF8', '#818CF8', '#34D399', '#F472B6'],
  },
  gallery: {
    northWall: '#7A6045', // Dark warm tan
    southWall: '#506070', // Dark slate blue-gray
    eastWall:  '#785848', // Dark dusty rose-brown
    westWall:  '#607055', // Dark muted olive
    floorLight: '#F5F0EB',
    floorDark: '#E0DAD3',
    ambientColor: '#C8B89A',
    ambientIntensity: 2.0,
    bookColors: ['#6B7280', '#374151', '#111827', '#9CA3AF'],
  },
  garden: {
    northWall: '#3A7850', // Medium forest green
    southWall: '#2D6E4E', // Deep forest green
    eastWall:  '#1A5038', // Dark emerald
    westWall:  '#3A7850', // Medium green
    floorLight: '#74C69D',
    floorDark: '#52B788',
    ambientColor: '#B7E4C7',
    ambientIntensity: 2.2,
    bookColors: ['#40916C', '#52B788', '#95D5B2', '#D8F3DC'],
  },
  workshop: {
    northWall: '#A85A28', // Rust
    southWall: '#7A4520', // Burnt sienna
    eastWall:  '#5A3018', // Dark chocolate
    westWall:  '#885030', // Deep golden rust
    floorLight: '#C68642',
    floorDark: '#A0522D',
    ambientColor: '#FDBA74',
    ambientIntensity: 1.8,
    bookColors: ['#F97316', '#EA580C', '#DC2626', '#B45309'],
  },
  museum: {
    northWall: '#786040', // Dark ochre
    southWall: '#8A7255', // Sandstone
    eastWall:  '#6A5840', // Deep khaki
    westWall:  '#887050', // Muted sand
    floorLight: '#D4C5A9',
    floorDark: '#B8A88A',
    ambientColor: '#FFD89B',
    ambientIntensity: 2.0,
    bookColors: ['#C8A45A', '#A07840', '#8B6530', '#6B4C20'],
  },
  observatory: {
    northWall: '#1A5898', // Deep sky blue
    southWall: '#1E4B8B', // Indigo
    eastWall:  '#2A1A6A', // Deep purple
    westWall:  '#3A5098', // Dark periwinkle
    floorLight: '#2A5080',
    floorDark: '#1A3860',
    ambientColor: '#60D0FF',
    ambientIntensity: 2.0,
    bookColors: ['#38BDF8', '#818CF8', '#C084FC', '#E879F9'],
  },
  sanctuary: {
    northWall: '#4A6850', // Deep sage
    southWall: '#7B9E87', // Sage
    eastWall:  '#5A8070', // Teal-sage
    westWall:  '#507A60', // Medium-dark mint
    floorLight: '#F0E6D3',
    floorDark: '#E2D4BC',
    ambientColor: '#D1FAE5',
    ambientIntensity: 2.6,
    bookColors: ['#6EE7B7', '#34D399', '#A7F3D0', '#6EE7B7'],
  },
  studio: {
    northWall: '#904830', // Deep burnt orange
    southWall: '#9A5030', // Terracotta
    eastWall:  '#703820', // Dark sienna
    westWall:  '#804828', // Deep amber-brown
    floorLight: '#DEB887',
    floorDark: '#CD853F',
    ambientColor: '#FFCC80',
    ambientIntensity: 2.0,
    bookColors: ['#FBBF24', '#F59E0B', '#D97706', '#B45309'],
  },
  dojo: {
    northWall: '#9A1A1A', // Crimson
    southWall: '#6B2A1A', // Cedar
    eastWall:  '#4A1010', // Deep maroon
    westWall:  '#B03030', // Medium red
    floorLight: '#8B6020',
    floorDark: '#6A4810',
    ambientColor: '#FF8C42',
    ambientIntensity: 1.8,
    bookColors: ['#DC2626', '#B91C1C', '#F97316', '#7F1D1D'],
  },
} as const;

type Theme = typeof STYLE_THEMES[keyof typeof STYLE_THEMES];

const ROOM_HEIGHT = 4.5;

const WALL_COUNT = 8;   // per wall
const WALL_OFFSET = 0.07;

const WALL_CONFIGS = [
  { fa: 2, fv: (_w: number, _d: number) => WALL_OFFSET,     va: 0, vm: (w: number) => w }, // north
  { fa: 2, fv: (_w: number,  d: number) => d - WALL_OFFSET, va: 0, vm: (w: number) => w }, // south
  { fa: 0, fv: (_w: number, _d: number) => WALL_OFFSET,     va: 2, vm: (_: number, d: number) => d }, // west
  { fa: 0, fv: ( w: number, _d: number) => w - WALL_OFFSET, va: 2, vm: (_: number, d: number) => d }, // east
] as const;

function WallParticles({ w, d, h }: { w: number; d: number; h: number }) {
  const total = WALL_COUNT * 4;

  const { positions, colors, velocities, alphas, alphaSpeeds } = useMemo(() => {
    const positions   = new Float32Array(total * 3);
    const colors      = new Float32Array(total * 3);
    const velocities  = new Float32Array(total);
    const alphas      = new Float32Array(total);
    const alphaSpeeds = new Float32Array(total);

    for (let wall = 0; wall < 4; wall++) {
      const cfg = WALL_CONFIGS[wall];
      for (let i = 0; i < WALL_COUNT; i++) {
        const idx = wall * WALL_COUNT + i;
        positions[idx*3 + cfg.fa] = cfg.fv(w, d);
        positions[idx*3 + cfg.va] = Math.random() * cfg.vm(w, d);
        positions[idx*3 + 1]      = Math.random() * h;
        velocities[idx]  = 0.0008 + Math.random() * 0.0012;
        alphas[idx]      = Math.random();
        alphaSpeeds[idx] = 0.003 + Math.random() * 0.004;
        colors[idx*3]   = 0.90;
        colors[idx*3+1] = 0.86;
        colors[idx*3+2] = 1.00;
      }
    }
    return { positions, colors, velocities, alphas, alphaSpeeds };
  }, [w, d, h, total]);

  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,    'rgba(230, 220, 255, 1)');
    g.addColorStop(0.25, 'rgba(200, 180, 255, 0.55)');
    g.addColorStop(1,    'rgba(200, 180, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  const posAttrRef = useRef<THREE.BufferAttribute>(null);
  const colAttrRef = useRef<THREE.BufferAttribute>(null);

  useFrame(() => {
    if (!posAttrRef.current || !colAttrRef.current) return;

    for (let i = 0; i < total; i++) {
      positions[i*3 + 1] += velocities[i];

      alphas[i] += alphaSpeeds[i];
      if (alphas[i] >= 1) { alphas[i] = 1; alphaSpeeds[i] = -Math.abs(alphaSpeeds[i]); }
      if (alphas[i] <= 0) { alphas[i] = 0; alphaSpeeds[i] =  Math.abs(alphaSpeeds[i]); }

      const a = alphas[i];
      colors[i*3]   = 0.90 * a;
      colors[i*3+1] = 0.86 * a;
      colors[i*3+2] = 1.00 * a;

      if (positions[i*3 + 1] > h) {
        positions[i*3 + 1] = 0;
        const cfg = WALL_CONFIGS[Math.floor(i / WALL_COUNT)];
        positions[i*3 + cfg.va] = Math.random() * cfg.vm(w, d);
      }
    }

    posAttrRef.current.needsUpdate = true;
    colAttrRef.current.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute ref={posAttrRef} attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute ref={colAttrRef} attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        map={texture}
        alphaMap={texture}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Room({ room, doors = [], artifacts = [], highlightedIds, onArtifactClick, onEnter, children }: RoomProps) {
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
      <WallParticles w={w} d={d} h={h} />

      <WallsWithDoors
        width={w}
        depth={d}
        height={h}
        doors={doors}
        northColor={theme.northWall}
        southColor={theme.southWall}
        eastColor={theme.eastWall}
        westColor={theme.westWall}
      />


      <BookInstancedRenderer artifacts={bookArtifacts} onClick={onArtifactClick} highlightedIds={highlightedIds} />
      <OrbInstancedRenderer artifacts={orbArtifacts} onClick={onArtifactClick} highlightedIds={highlightedIds} />

      {/* Bird's-eye Labeled Island visuals */}
      {isOverviewMode && (
        <>
          <Billboard position={[w / 2, h + 2.5, d / 2]} follow={true}>
            <Text
              fontSize={1.4}
              letterSpacing={0.15}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              maxWidth={w}
              textAlign="center"
              overflowWrap="break-word"
              font="https://cdn.jsdelivr.net/fontsource/fonts/cinzel@5/latin-400-normal.woff"
              outlineWidth={0.06}
              outlineColor="#000000"
            >
              {room.name.toUpperCase()}
            </Text>
          </Billboard>

          <Billboard position={[w / 2, h + 1.2, d / 2]} follow={true}>
            <Text
              fontSize={0.6}
              color="rgba(255,255,255,0.7)"
              anchorX="center"
              anchorY="middle"
            >
              {`${room.artifactCount} MEMORIES${room.firstMemoryAt ? ` | ${new Date(room.firstMemoryAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${room.lastMemoryAt && room.lastMemoryAt !== room.firstMemoryAt ? ` — ${new Date(room.lastMemoryAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}` : ''}`}
            </Text>
          </Billboard>

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

      {/* Room Label (First Person) — always faces the camera */}
      {!isOverviewMode && (
        <Billboard position={[w / 2, h * 0.78, d / 2]} follow={true}>
          <Text
            fontSize={0.5}
            maxWidth={Math.min(w, d) - 1}
            textAlign="center"
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            font="https://cdn.jsdelivr.net/fontsource/fonts/cinzel@5/latin-400-normal.woff"
            outlineColor="#000000"
            outlineWidth={0.04}
          >
            {room.name.toUpperCase()}
          </Text>
        </Billboard>
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
