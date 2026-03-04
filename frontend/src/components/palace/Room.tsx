import { memo } from 'react';
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
  children?: React.ReactNode;
}

// Three modern themes cycling by room index
const THEMES = [
  { wallColor: '#F0EBE3', name: 'warm' },   // 0 – Warm Study
  { wallColor: '#F4F4F4', name: 'bright' }, // 1 – Bright Studio
  { wallColor: '#1C1C2E', name: 'dark' },   // 2 – Night Lab
];

export function Room({ room, index, doors = [], artifacts = [], onArtifactClick, children }: RoomProps) {
  const themeIdx = index % 3;
  const theme = THEMES[themeIdx];

  const w = room.dimensions.w;
  const d = room.dimensions.d;
  // Give each theme a distinct ceiling height
  const h = themeIdx === 0 ? 4 : themeIdx === 1 ? 5.5 : 5;

  // T153: split artifacts by visual type so instanced renderers handle books/orbs
  const bookArtifacts = artifacts.filter((a) => a.visual === 'floating_book');
  const orbArtifacts = artifacts.filter((a) => a.visual === 'crystal_orb');

  return (
    <group position={[room.position.x, room.position.y, room.position.z]}>
      {/* Themed floor / ceiling / lights / decor */}
      {themeIdx === 0 && <WarmStudyDecor w={w} d={d} h={h} />}
      {themeIdx === 1 && <BrightStudioDecor w={w} d={d} h={h} />}
      {themeIdx === 2 && <NightLabDecor w={w} d={d} h={h} />}

      {/* Walls with door cutouts */}
      <WallsWithDoors
        width={w}
        depth={d}
        height={h}
        doors={doors}
        wallColor={theme.wallColor}
      />

      {/* T153: Instanced renderers for repeated geometry (one draw call per type per room) */}
      <BookInstancedRenderer artifacts={bookArtifacts} onClick={onArtifactClick} />
      <OrbInstancedRenderer artifacts={orbArtifacts} onClick={onArtifactClick} />

      {/* Non-instanced artifacts (hologram_frame, framed_image, speech_bubble) */}
      {children}
    </group>
  );
}

// ── Theme 0: Warm Study ───────────────────────────────────────────────────────
// Honey-wood floor, cream ceiling, warm pendant lights, soft bookshelf accent
const WarmStudyDecor = memo(function WarmStudyDecor({ w, d, h }: { w: number; d: number; h: number }) {
  const cx = w / 2;
  const cz = d / 2;
  return (
    <group>
      {/* Ambient fill */}
      <ambientLight intensity={1.2} color="#FFF5E6" />

      {/* Main ceiling pendant */}
      <pointLight position={[cx, h - 0.3, cz]} intensity={12} color="#FFE8C0" distance={w * 2} decay={2} castShadow />
      {/* Corner fill lights */}
      <pointLight position={[1, h * 0.6, 1]} intensity={3} color="#FFD8A0" distance={10} decay={2} />
      <pointLight position={[w - 1, h * 0.6, d - 1]} intensity={3} color="#FFD8A0" distance={10} decay={2} />

      {/* Floor — warm honey oak */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#C08B4A" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Ceiling pendant fixture (visual) */}
      <mesh position={[cx, h - 0.05, cz]}>
        <cylinderGeometry args={[0.25, 0.35, 0.12, 16]} />
        <meshStandardMaterial color="#C8A870" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Pendant cord */}
      <mesh position={[cx, h - 0.45, cz]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
        <meshStandardMaterial color="#8B6A3E" roughness={0.9} />
      </mesh>
      {/* Shade glow */}
      <mesh position={[cx, h - 0.7, cz]}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshStandardMaterial color="#FFF0C8" emissive="#FFC060" emissiveIntensity={1.2} roughness={1} transparent opacity={0.85} />
      </mesh>

      {/* Bookshelf on north wall */}
      <group position={[cx, 0, 0.12]}>
        {/* Shelf body */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[Math.min(w * 0.55, 4), 2.4, 0.3]} />
          <meshStandardMaterial color="#8B6344" roughness={0.8} />
        </mesh>
        {/* Books — decorative row */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((bx, i) => (
          <mesh key={i} position={[bx, 0.55, -0.05]}>
            <boxGeometry args={[0.12, 0.9 + i * 0.08, 0.22]} />
            <meshStandardMaterial
              color={['#B85C38', '#4A7A6D', '#D4A843', '#6B5B8B', '#3E6B8B'][i]}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* Side table */}
      <group position={[w - 1.2, 0, cz]}>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 24]} />
          <meshStandardMaterial color="#9B7B52" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
          <meshStandardMaterial color="#7A5C38" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
});

// ── Theme 1: Bright Studio ────────────────────────────────────────────────────
// Polished concrete floor, white walls, LED ceiling grid, minimalist desk
const BrightStudioDecor = memo(function BrightStudioDecor({ w, d, h }: { w: number; d: number; h: number }) {
  const cx = w / 2;
  const cz = d / 2;

  // Build a small grid of LED panel positions
  const ledRows = 2;
  const ledCols = 3;
  const ledPanels: [number, number][] = [];
  for (let r = 0; r < ledRows; r++) {
    for (let c = 0; c < ledCols; c++) {
      ledPanels.push([
        (w / (ledCols + 1)) * (c + 1),
        (d / (ledRows + 1)) * (r + 1),
      ]);
    }
  }

  return (
    <group>
      {/* Bright clean ambient */}
      <ambientLight intensity={1.8} color="#F0F6FF" />
      {/* Central overhead */}
      <pointLight position={[cx, h - 0.2, cz]} intensity={14} color="#FFFFFF" distance={w * 2.5} decay={2} castShadow />
      {/* Secondary fills */}
      <pointLight position={[1.5, h * 0.8, 1.5]} intensity={4} color="#E8F0FF" distance={12} decay={2} />
      <pointLight position={[w - 1.5, h * 0.8, d - 1.5]} intensity={4} color="#E8F0FF" distance={12} decay={2} />

      {/* Floor — polished light concrete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#D8D8D8" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* LED panels in ceiling — thin emissive boxes */}
      {ledPanels.map(([px, pz], i) => (
        <mesh key={i} position={[px, h - 0.03, pz]}>
          <boxGeometry args={[0.6, 0.04, 0.25]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#FFFFFF"
            emissiveIntensity={2.5}
            roughness={1}
          />
        </mesh>
      ))}

      {/* Minimalist floating desk */}
      <group position={[cx, 0, d - 1.6]}>
        {/* Desk top */}
        <mesh position={[0, 0.78, 0]}>
          <boxGeometry args={[Math.min(w * 0.5, 3.5), 0.05, 0.8]} />
          <meshStandardMaterial color="#EBEBEB" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Desk legs — two thin bars */}
        {[-0.6, 0.6].map((lx, i) => (
          <mesh key={i} position={[lx * Math.min(w * 0.5 / 2.2, 0.85), 0.39, 0]}>
            <boxGeometry args={[0.05, 0.78, 0.05]} />
            <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Minimalist wall shelf on east wall */}
      <mesh position={[w - 0.18, h * 0.55, cz]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.0, 0.04, 0.2]} />
        <meshStandardMaterial color="#D0D0D0" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
});

// ── Theme 2: Night Lab ────────────────────────────────────────────────────────
// Dark charcoal walls, slate floor, teal accent strips, geometric decor
const NightLabDecor = memo(function NightLabDecor({ w, d, h }: { w: number; d: number; h: number }) {
  const cx = w / 2;
  const cz = d / 2;
  return (
    <group>
      {/* Dim ambient so the accent lights stand out */}
      <ambientLight intensity={0.4} color="#8BBFFF" />
      {/* Dramatic overhead */}
      <pointLight position={[cx, h - 0.4, cz]} intensity={8} color="#A0C8FF" distance={w * 2} decay={2} castShadow />
      {/* Teal accent fill */}
      <pointLight position={[1, 1.5, 1]} intensity={5} color="#00D4CC" distance={8} decay={2} />
      <pointLight position={[w - 1, 1.5, d - 1]} intensity={5} color="#7060FF" distance={8} decay={2} />

      {/* Floor — dark slate with slight shimmer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#1E1E30" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Teal glow strip along floor — north wall */}
      <mesh position={[cx, 0.04, 0.12]}>
        <boxGeometry args={[w * 0.85, 0.06, 0.04]} />
        <meshStandardMaterial color="#00D4CC" emissive="#00D4CC" emissiveIntensity={3} roughness={1} />
      </mesh>
      {/* Teal glow strip along floor — south wall */}
      <mesh position={[cx, 0.04, d - 0.12]}>
        <boxGeometry args={[w * 0.85, 0.06, 0.04]} />
        <meshStandardMaterial color="#7060FF" emissive="#7060FF" emissiveIntensity={3} roughness={1} />
      </mesh>

      {/* Ceiling accent strip */}
      <mesh position={[cx, h - 0.08, 0.2]}>
        <boxGeometry args={[w * 0.7, 0.04, 0.06]} />
        <meshStandardMaterial color="#40A0FF" emissive="#40A0FF" emissiveIntensity={2} roughness={1} />
      </mesh>

      {/* Geometric sculpture — corner accent */}
      <group position={[w - 1.2, 1.2, 1.2]}>
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <torusGeometry args={[0.45, 0.06, 16, 32]} />
          <meshStandardMaterial color="#00D4CC" emissive="#00D4CC" emissiveIntensity={0.6} roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh>
          <octahedronGeometry args={[0.28]} />
          <meshStandardMaterial color="#7060FF" emissive="#7060FF" emissiveIntensity={0.4} roughness={0.1} metalness={0.9} />
        </mesh>
      </group>

      {/* Floating display panel on west wall */}
      <mesh position={[0.12, h * 0.5, cz]}>
        <boxGeometry args={[0.06, h * 0.4, w * 0.28]} />
        <meshStandardMaterial color="#0A2040" roughness={0.1} metalness={0.7} emissive="#001830" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.09, h * 0.5, cz]}>
        <boxGeometry args={[0.02, h * 0.38, w * 0.26]} />
        <meshStandardMaterial color="#00D4CC" emissive="#00D4CC" emissiveIntensity={0.4} roughness={1} transparent opacity={0.6} />
      </mesh>
    </group>
  );
});
