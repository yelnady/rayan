import { memo, useMemo, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import type { Artifact as ArtifactData, ArtifactVisual } from '../../types/palace';
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
  lesson:     'Lesson',
  brain:      'Insight',
  question:   'Question',
  coffee:     'Moment',
  milestone:  'Milestone',
  heart:      'Emotion',
  dream:      'Dream',
  tree:       'Habit',
  opinion:    'Opinion',
  headphones: 'Media',
  cash_stack: 'Goal',
};

const TYPE_COLORS: Record<string, string> = {
  floating_book: '#60A8FF',
  hologram_frame: '#9B6FFF',
  framed_image: '#FF8C60',
  speech_bubble: '#60C8A0',
  crystal_orb: '#FF60B8',
  lesson:     '#7EC8E3',
  brain:      '#C084FC',
  question:   '#FCD34D',
  coffee:     '#D97706',
  milestone:  '#34D399',
  heart:      '#F87171',
  dream:      '#A78BFA',
  tree:       '#4ADE80',
  opinion:    '#FB923C',
  headphones: '#38BDF8',
  cash_stack: '#FBBF24',
};

/** GLB file path for each model-based visual. */
const GLB_PATHS: Partial<Record<ArtifactVisual, string>> = {
  lesson:     '/models/lesson.glb',
  brain:      '/models/Brain.glb',
  question:   '/models/question.glb',
  coffee:     '/models/coffee.glb',
  milestone:  '/models/Milestone.glb',
  heart:      '/models/heart.glb',
  dream:      '/models/Dream.glb',
  tree:       '/models/Tree.glb',
  opinion:    '/models/Opinion.glb',
  headphones: '/models/Headphones.glb',
  cash_stack: '/models/Cash Stack.glb',
};

/**
 * Per-model scale to normalise each GLB to ~0.55 units (matching FloatingBook height).
 * Derived from bounding-box analysis of each file.
 */
const GLB_SCALES: Partial<Record<ArtifactVisual, number>> = {
  lesson:     0.004,
  brain:      0.030,
  question:   0.052,
  coffee:     0.019,
  milestone:  13.5,
  heart:      0.275,
  dream:      0.001,
  tree:       0.001,
  opinion:    0.003,
  headphones: 0.050,
  cash_stack: 12.5,
};

// Preload all GLB models so they're ready when a room loads
Object.values(GLB_PATHS).forEach((p) => useGLTF.preload(p));

function GlbArtifact({
  path,
  scale,
  onClick,
  onHover,
}: {
  path: string;
  scale: number;
  onClick?: () => void;
  onHover?: (h: boolean) => void;
}) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => scene.clone(), [scene]);
  return (
    <primitive
      object={cloned}
      scale={scale}
      onClick={onClick}
      onPointerOver={() => onHover?.(true)}
      onPointerOut={() => onHover?.(false)}
    />
  );
}

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
      default: {
        const glbPath = GLB_PATHS[artifact.visual as ArtifactVisual];
        const glbScale = GLB_SCALES[artifact.visual as ArtifactVisual] ?? 0.3;
        if (glbPath) {
          return <GlbArtifact path={glbPath} scale={glbScale} onClick={handleClick} onHover={handleHover} />;
        }
        return null;
      }
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

            {/* Date */}
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '8px',
              }}
            >
              {new Date(artifact.capturedAt || artifact.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
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
