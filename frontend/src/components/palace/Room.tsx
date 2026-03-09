import { memo, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture, Text } from '@react-three/drei';
import { useCameraStore } from '../../stores/cameraStore';
import { WallsWithDoors } from './WallsWithDoors';
import { BookInstancedRenderer } from '../artifacts/BookInstancedRenderer';
import { OrbInstancedRenderer } from '../artifacts/OrbInstancedRenderer';
import type { Room as RoomData, Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';

interface RoomProps {
  room: RoomData;
  index: number;
  doors?: DoorSpec[];
  /** T153: artifacts array so Room can render instanced books/orbs */
  artifacts?: ArtifactData[];
  onArtifactClick?: (artifact: ArtifactData) => void;
  onEnter?: () => void;
  children?: React.ReactNode;
}

// Three rich woody architecture themes cycling by room index
const THEMES = [
  { wallColor: '#3A2818', name: 'mahogany' }, // 0 – Dark Mahogany
  { wallColor: '#5C4033', name: 'oak' },      // 1 – Classic Oak
  { wallColor: '#8B5A2B', name: 'walnut' },   // 2 – Warm Walnut
];

export function Room({ room, index, doors = [], artifacts = [], onArtifactClick, onEnter, children }: RoomProps) {
  const isOverviewMode = useCameraStore(s => s.isOverviewMode);
  const themeIdx = index % 3;
  const theme = THEMES[themeIdx];

  const w = room.dimensions.w;
  const d = room.dimensions.d;
  const h = themeIdx === 0 ? 5 : themeIdx === 1 ? 4.5 : 5.5;

  const bookArtifacts = artifacts.filter((a) => a.visual === 'floating_book');
  const orbArtifacts = artifacts.filter((a) => a.visual === 'crystal_orb');

  return (
    <group position={[room.position.x, room.position.y, room.position.z]}>
      {themeIdx === 0 && <MahoganyLibraryDecor w={w} d={d} h={h} index={index} />}
      {themeIdx === 1 && <ClassicOakDecor w={w} d={d} h={h} index={index} />}
      {themeIdx === 2 && <WarmWalnutDecor w={w} d={d} h={h} index={index} />}

      <WallsWithDoors
        width={w}
        depth={d}
        height={h}
        doors={doors}
        wallColor={theme.wallColor}
      />

      <BookInstancedRenderer artifacts={bookArtifacts} onClick={onArtifactClick} />
      <OrbInstancedRenderer artifacts={orbArtifacts} onClick={onArtifactClick} />

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
          position={[
            w / 2,
            h * 0.82, // Higher up to avoid doors/decor
            themeIdx === 0 ? 0.46 : 0.05 // On bookshelf header for Mahogany
          ]}
          fontSize={0.5}
          color="#F0E0FF"
          anchorX="center"
          anchorY="middle"
          font="https://cdn.jsdelivr.net/fontsource/fonts/cinzel@5/latin-400-normal.woff"
          outlineColor="#D4AF37"
          outlineWidth={0.03}
        >
          {room.name.toUpperCase()}
        </Text>
      )}

      {children}
    </group>
  );
}

// ── Instanced Decorative Books ────────────────────────────────────────────────
const BOOK_COLORS_ROW1 = ['#5A1818', '#1A3A1A', '#B08D57', '#2A2A5A'] as const;
const BOOK_COLORS_ROW2 = ['#1A3A1A', '#B08D57', '#2A2A5A', '#5A1818'] as const;
const BX_POS = [-2.5, -1, 1, 2.5];
const BOOK_OFFSETS = [0, 0.15, 0.3, 0.45];

const _m4 = new THREE.Matrix4();

function BookInstances({ color, positions }: { color: string; positions: [number, number, number][] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    positions.forEach((p, i) => {
      _m4.makeTranslation(p[0], p[1], p[2]);
      ref.current.setMatrixAt(i, _m4);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]}>
      <boxGeometry args={[0.12, 0.7, 0.3]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
    </instancedMesh>
  );
}

function DecorativeBookShelf({ h }: { h: number }) {
  const groups = useMemo(() => {
    const map = new Map<string, [number, number, number][]>();
    const add = (color: string, x: number, y: number) => {
      if (!map.has(color)) map.set(color, []);
      map.get(color)!.push([x, y, 0.15]);
    };
    BX_POS.forEach((bx, i) => {
      BOOK_OFFSETS.forEach((off, j) => {
        add(BOOK_COLORS_ROW1[(i + j) % 4], bx + off, h * 0.23);
        add(BOOK_COLORS_ROW2[(i + j) % 4], bx + off, h * 0.43);
      });
    });
    return Array.from(map.entries());
  }, [h]);

  return (
    <>
      {groups.map(([color, positions]) => (
        <BookInstances key={color} color={color} positions={positions} />
      ))}
    </>
  );
}

// ── Theme Decor Helpers ───────────────────────────────────────────────────────
// We'll create a shared hook for the textures so they're only loaded once per room type
function usePalaceTextures() {
  const floorTexture = useTexture('/textures/floor_texture.png');
  // Optional: tweak repeating if needed based on room size
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(4, 4);
  return { floorTexture };
}

// ── Theme 0: Dark Mahogany Library ──────────────────────────────────────────
const MahoganyLibraryDecor = memo(function MahoganyLibraryDecor({ w, d, h, index }: { w: number; d: number; h: number; index: number }) {
  const cx = w / 2;
  const cz = d / 2;
  const { floorTexture } = usePalaceTextures();

  return (
    <group>
      <ambientLight intensity={0.6} color="#FFDAB9" />
      <pointLight position={[cx, h - 1, cz]} intensity={6} color="#FFB067" distance={w * 2} decay={2} />

      {/* Floor — rich mahogany parquet, brightened base color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTexture} color="#A07A5F" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* Grand Bookshelf Feature */}
      <group position={[cx, 0, 0.25]}>
        {/* Bookshelf Outer Frame */}
        <mesh position={[0, h * 0.45, 0]}>
          <boxGeometry args={[w * 0.85, h * 0.9, 0.45]} />
          <meshStandardMaterial color="#3D2110" roughness={0.4} metalness={0.2} />
        </mesh>

        {/* Bookshelf Top Molding / Header (where the label sits) */}
        <mesh position={[0, h * 0.85, 0.05]}>
          <boxGeometry args={[w * 0.87, 0.4, 0.55]} />
          <meshStandardMaterial color="#2A1508" roughness={0.3} metalness={0.3} />
        </mesh>

        {/* Horizontal Shelves */}
        {[0.2, 0.4, 0.6].map((yh) => (
          <mesh key={yh} position={[0, h * yh, 0.05]}>
            <boxGeometry args={[w * 0.8, 0.08, 0.4]} />
            <meshStandardMaterial color="#2A1508" roughness={0.5} />
          </mesh>
        ))}

        {/* Vertical Dividers */}
        {[-1.5, 0, 1.5].map((xv) => (
          <mesh key={xv} position={[xv, h * 0.4, 0.02]}>
            <boxGeometry args={[0.08, h * 0.8, 0.38]} />
            <meshStandardMaterial color="#2A1508" roughness={0.5} />
          </mesh>
        ))}

        <DecorativeBookShelf h={h} />
      </group>
    </group>
  );
});

// ── Theme 1: Classic Oak Hall ───────────────────────────────────────────────
const ClassicOakDecor = memo(function ClassicOakDecor({ w, d, h, index }: { w: number; d: number; h: number; index: number }) {
  const cx = w / 2;
  const cz = d / 2;
  const { floorTexture } = usePalaceTextures();

  return (
    <group>
      <ambientLight intensity={1.2} color="#FFF8DC" />
      <pointLight position={[cx, h - 0.4, cz]} intensity={12} color="#FFE4B5" distance={w * 2.5} decay={2} />

      {/* Floor — honey oak parquet, brightened base color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTexture} color="#D2B48C" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Wooden pillars */}
      {[1, w - 1].map((px, i) => (
        <mesh key={i} position={[px, h / 2, d - 1]}>
          <cylinderGeometry args={[0.2, 0.2, h, 16]} />
          <meshStandardMaterial color="#5C4033" roughness={0.6} />
        </mesh>
      ))}

    </group>
  );
});

// ── Theme 2: Warm Walnut Lounge ─────────────────────────────────────────────
const WarmWalnutDecor = memo(function WarmWalnutDecor({ w, d, h, index }: { w: number; d: number; h: number; index: number }) {
  const cx = w / 2;
  const cz = d / 2;
  const { floorTexture } = usePalaceTextures();

  return (
    <group>
      <ambientLight intensity={1.0} color="#FAEBD7" />
      <pointLight position={[cx, h - 0.6, cz]} intensity={10} color="#FFDAB9" distance={w * 2} decay={2} />

      {/* Floor — rich walnut parquet, brightened base color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTexture} color="#B58B66" roughness={0.35} metalness={0.08} />
      </mesh>

    </group>
  );
});
