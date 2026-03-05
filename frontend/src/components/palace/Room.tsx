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
      {themeIdx === 0 && <MahoganyLibraryDecor w={w} d={d} h={h} />}
      {themeIdx === 1 && <ClassicOakDecor w={w} d={d} h={h} />}
      {themeIdx === 2 && <WarmWalnutDecor w={w} d={d} h={h} />}

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

      {children}
    </group>
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
const MahoganyLibraryDecor = memo(function MahoganyLibraryDecor({ w, d, h }: { w: number; d: number; h: number }) {
  const cx = w / 2;
  const cz = d / 2;
  const { floorTexture } = usePalaceTextures();

  return (
    <group>
      <ambientLight intensity={0.8} color="#FFDAB9" />
      <pointLight position={[cx, h - 0.5, cz]} intensity={8} color="#FFB067" distance={w * 2} decay={2} castShadow />
      <pointLight position={[1.5, h * 0.5, 1.5]} intensity={3} color="#FFA07A" distance={10} decay={2} />
      <pointLight position={[w - 1.5, h * 0.5, d - 1.5]} intensity={3} color="#FFA07A" distance={10} decay={2} />

      {/* Floor — rich mahogany parquet, brightened base color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTexture} color="#A07A5F" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* Ceiling molding */}
      <mesh position={[cx, h - 0.1, 0.2]}>
        <boxGeometry args={[w * 0.9, 0.2, 0.4]} />
        <meshStandardMaterial color="#3A2818" roughness={0.8} />
      </mesh>

      {/* Grand bookshelf */}
      <group position={[cx, 0, 0.2]}>
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w * 0.8, h * 0.9, 0.4]} />
          <meshStandardMaterial color="#2E1A0F" roughness={0.7} />
        </mesh>
        {/* Books on the shelf */}
        {[-1.5, -0.5, 0.5, 1.5].map((bx, i) => (
          <mesh key={i} position={[bx, h * 0.4, -0.05]}>
            <boxGeometry args={[0.15, 0.8, 0.25]} />
            <meshStandardMaterial color={['#5A1818', '#1A3A1A', '#B08D57', '#2A2A5A'][i]} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
});

// ── Theme 1: Classic Oak Hall ───────────────────────────────────────────────
const ClassicOakDecor = memo(function ClassicOakDecor({ w, d, h }: { w: number; d: number; h: number }) {
  const cx = w / 2;
  const cz = d / 2;
  const { floorTexture } = usePalaceTextures();

  return (
    <group>
      <ambientLight intensity={1.2} color="#FFF8DC" />
      <pointLight position={[cx, h - 0.4, cz]} intensity={12} color="#FFE4B5" distance={w * 2.5} decay={2} castShadow />

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
const WarmWalnutDecor = memo(function WarmWalnutDecor({ w, d, h }: { w: number; d: number; h: number }) {
  const cx = w / 2;
  const cz = d / 2;
  const { floorTexture } = usePalaceTextures();

  return (
    <group>
      <ambientLight intensity={1.0} color="#FAEBD7" />
      <pointLight position={[cx, h - 0.6, cz]} intensity={10} color="#FFDAB9" distance={w * 2} decay={2} castShadow />

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
