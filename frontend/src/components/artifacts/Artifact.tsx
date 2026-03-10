import { memo, useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import type { Artifact as ArtifactData } from '../../types/palace';
import { HighlightGlow } from './HighlightGlow';
import { FloatingBook } from './FloatingBook';
import { HologramFrame } from './HologramFrame';
import { FramedImage } from './FramedImage';
import { SpeechBubble } from './SpeechBubble';
import { CrystalOrb } from './CrystalOrb';

const TYPE_LABELS: Record<string, string> = {
  floating_book: 'Document',
  hologram_frame: 'Lecture',
  framed_image: 'Visual',
  speech_bubble: 'Conversation',
  crystal_orb: 'Enrichment',
};

const TYPE_COLORS: Record<string, string> = {
  floating_book: '#60A8FF',
  hologram_frame: '#9B6FFF',
  framed_image: '#FF8C60',
  speech_bubble: '#60C8A0',
  crystal_orb: '#FF60B8',
};

interface ArtifactProps {
  artifact: ArtifactData;
  onClick?: (artifact: ArtifactData) => void;
  onHover?: (artifact: ArtifactData | null) => void;
  highlighted?: boolean;
}

/** Infer which wall the artifact is on from its stored position or explicit wall attribute.
 *  Wall identity determines the rotation to face into the room:
 *    west wall  → face +X (rotate Y +90°)
 *    east wall  → face -X (rotate Y -90°)
 *    south wall → face -Z (rotate Y 180°)
 *    north wall → face +Z (no rotation, default)
 *    else       → floating center
 */
function wallRotation(artifact: ArtifactData): [number, number, number] {
  if (artifact.wall === 'west') return [0, Math.PI / 2, 0];
  if (artifact.wall === 'east') return [0, -Math.PI / 2, 0];
  if (artifact.wall === 'south') return [0, Math.PI, 0];
  if (artifact.wall === 'north') return [0, 0, 0];

  // Fallback to spatial inference
  const { x, z } = artifact.position;
  if (x < 0.2) return [0, Math.PI / 2, 0];
  if (x > 7.8) return [0, -Math.PI / 2, 0];
  if (z > 7.8) return [0, Math.PI, 0];
  return [0, 0, 0];
}

export const Artifact = memo(function Artifact({ artifact, onClick, onHover, highlighted }: ArtifactProps) {
  const [hovered, setHovered] = useState(false);

  const pos = useMemo<[number, number, number]>(
    () => [artifact.position.x, artifact.position.y, artifact.position.z],
    [artifact.position.x, artifact.position.y, artifact.position.z],
  );

  const rot = useMemo(() => wallRotation(artifact), [artifact]);

  const color = useMemo(() => artifact.color ?? undefined, [artifact.color]);
  const label = useMemo(() => TYPE_LABELS[artifact.visual] ?? 'Memory', [artifact.visual]);
  const accentColor = useMemo(() => TYPE_COLORS[artifact.visual] ?? '#60A8FF', [artifact.visual]);

  const handleClick = () => onClick?.(artifact);

  const handleHover = (h: boolean) => {
    setHovered(h);
    onHover?.(h ? artifact : null);
  };

  // Each visual is rendered at [0,0,0] inside a positioned+rotated group
  // so it correctly faces into the room from whichever wall it's mounted on.
  const visual = (() => {
    const O: [number, number, number] = [0, 0, 0];
    switch (artifact.visual) {
      case 'floating_book':
        return <FloatingBook position={O} color={color} onClick={handleClick} onHover={handleHover} />;
      case 'hologram_frame':
        return <HologramFrame position={O} color={color} onClick={handleClick} onHover={handleHover} />;
      case 'framed_image':
        return <FramedImage position={O} color={color} thumbnailUrl={artifact.thumbnailUrl} onClick={handleClick} onHover={handleHover} />;
      case 'speech_bubble':
        return <SpeechBubble position={O} color={color} onClick={handleClick} onHover={handleHover} />;
      case 'crystal_orb':
        return <CrystalOrb position={O} color={color} onClick={handleClick} onHover={handleHover} />;
      default:
        return null;
    }
  })();

  return (
    <>
      <group position={pos} rotation={rot}>
        {/* T159: Small local shift to ensure mesh isn't submerged in wall 
            Local +Z faces INTO the room. */}
        <group position={[0, 0, 0.08]}>
          {visual}
          {highlighted && <HighlightGlow color={accentColor} />}
        </group>
      </group>

      {/* Invisible hover hitbox — much easier to target than the small artifact mesh */}
      <mesh
        position={pos}
        onPointerOver={() => handleHover(true)}
        onPointerOut={() => handleHover(false)}
        onClick={() => handleClick()}
      >
        <sphereGeometry args={[0.7, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Tooltip — rendered in the Room's coordinate space so position is correct */}
      {hovered && (
        <Html
          position={[pos[0], pos[1] + 0.75, pos[2]]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(10, 10, 20, 0.88)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${accentColor}44`,
              borderRadius: '10px',
              padding: '8px 12px',
              minWidth: '160px',
              maxWidth: '220px',
              textAlign: 'center',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: `0 0 16px ${accentColor}30`,
            }}
          >
            {/* Type badge */}
            <div
              style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: accentColor,
                background: `${accentColor}18`,
                borderRadius: '4px',
                padding: '2px 7px',
                marginBottom: '6px',
              }}
            >
              {label}
            </div>

            {/* Summary */}
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.90)',
                lineHeight: 1.45,
                marginBottom: '6px',
              }}
            >
              {artifact.summary}
            </div>

            {/* Click hint */}
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.04em',
              }}
            >
              Click to explore
            </div>
          </div>
        </Html>
      )}
    </>
  );
}, (prev: ArtifactProps, next: ArtifactProps) =>
  prev.artifact.id === next.artifact.id &&
  prev.artifact.visual === next.artifact.visual &&
  prev.highlighted === next.highlighted,
);
