import { memo } from 'react';
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

// ── Corner Lighting Helper ───────────────────────────────────────────────────
interface CornerLightingProps {
  w: number;
  d: number;
  h: number;
  index: number;
}

const CORNER_COLORS = [
  '#4A90E2', // Blue
  '#F5A623', // Orange
  '#7ED321', // Green
  '#BD10E0', // Purple
  '#50E3C2', // Teal
  '#F8E71C', // Yellow
  '#FF69B4', // Hot Pink
  '#00CED1', // Dark Turquoise
];

const CornerLighting = memo(function CornerLighting({ w, d, h, index }: CornerLightingProps) {
  const inset = 0.5;
  const lightHeight = h * 0.7; // Position lights at 70% of wall height

  // Pick 4 colors based on room index
  const colors = [
    CORNER_COLORS[(index * 4 + 0) % CORNER_COLORS.length],
    CORNER_COLORS[(index * 4 + 1) % CORNER_COLORS.length],
    CORNER_COLORS[(index * 4 + 2) % CORNER_COLORS.length],
    CORNER_COLORS[(index * 4 + 3) % CORNER_COLORS.length],
  ];

  return (
    <group>
      {/* Corner 1: [inset, lightHeight, inset] */}
      <pointLight
        position={[inset, lightHeight, inset]}
        color={colors[0]}
        intensity={3}
        distance={w}
        decay={2}
      />
      {/* Corner 2: [w - inset, lightHeight, inset] */}
      <pointLight
        position={[w - inset, lightHeight, inset]}
        color={colors[1]}
        intensity={3}
        distance={w}
        decay={2}
      />
      {/* Corner 3: [inset, lightHeight, d - inset] */}
      <pointLight
        position={[inset, lightHeight, d - inset]}
        color={colors[2]}
        intensity={3}
        distance={w}
        decay={2}
      />
      {/* Corner 4: [w - inset, lightHeight, d - inset] */}
      <pointLight
        position={[w - inset, lightHeight, d - inset]}
        color={colors[3]}
        intensity={3}
        distance={w}
        decay={2}
      />
    </group>
  );
});

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
      <pointLight position={[cx, h - 1, cz]} intensity={6} color="#FFB067" distance={w * 2} decay={2} castShadow />

      <CornerLighting w={w} d={d} h={h} index={index} />

      {/* Internal Bookshelf Glow - makes the "dark something" readable */}
      <pointLight position={[cx, h * 0.5, 0.6]} intensity={4} color="#FFE4B5" distance={5} decay={2} />

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

        {/* Decorative Books */}
        {[-2.5, -1, 1, 2.5].map((bx, i) => (
          <group key={i} position={[bx, h * 0.23, 0.15]}>
            {[0, 0.15, 0.3, 0.45].map((offset, j) => (
              <mesh key={j} position={[offset, 0, 0]}>
                <boxGeometry args={[0.12, 0.7, 0.3]} />
                <meshStandardMaterial
                  color={['#5A1818', '#1A3A1A', '#B08D57', '#2A2A5A'][(i + j) % 4]}
                  roughness={0.4}
                  metalness={0.1}
                />
              </mesh>
            ))}
          </group>
        ))}
        {/* Second row of books */}
        {[-2.5, -1, 1, 2.5].map((bx, i) => (
          <group key={i + 10} position={[bx, h * 0.43, 0.15]}>
            {[0, 0.15, 0.3, 0.45].map((offset, j) => (
              <mesh key={j} position={[offset, 0, 0]}>
                <boxGeometry args={[0.12, 0.7, 0.3]} />
                <meshStandardMaterial
                  color={['#1A3A1A', '#B08D57', '#2A2A5A', '#5A1818'][(i + j) % 4]}
                  roughness={0.4}
                />
              </mesh>
            ))}
          </group>
        ))}
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
      <pointLight position={[cx, h - 0.4, cz]} intensity={12} color="#FFE4B5" distance={w * 2.5} decay={2} castShadow />

      <CornerLighting w={w} d={d} h={h} index={index} />

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

      {/* Display pedestal */}
      <group position={[cx, 0, d - 2]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#4A3018" roughness={0.7} />
        </mesh>
      </group>
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
      <pointLight position={[cx, h - 0.6, cz]} intensity={10} color="#FFDAB9" distance={w * 2} decay={2} castShadow />

      <CornerLighting w={w} d={d} h={h} index={index} />

      {/* Floor — rich walnut parquet, brightened base color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTexture} color="#B58B66" roughness={0.35} metalness={0.08} />
      </mesh>

      {/* Decorative wall paneling */}
      <mesh position={[0.2, h / 2, cz]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d * 0.8, h * 0.8]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.8} />
      </mesh>

      {/* Cozy wooden table */}
      <group position={[cx, 0, cz + 1]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
          <meshStandardMaterial color="#5C4033" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.2, 0.6, 16]} />
          <meshStandardMaterial color="#3A2818" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
});
