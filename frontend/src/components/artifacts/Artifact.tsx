import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import type { Group } from 'three';
import type { Artifact as ArtifactData, ArtifactVisual } from '../../types/palace';
import { usePalaceStore } from '../../stores/palaceStore';
import { registerArtifactCenter, artifactCenters } from '../palace/artifactCenters';
import { SpeechBubble } from './SpeechBubble';
import { CrystalOrb } from './CrystalOrb';
import { SynthesisMap } from './SynthesisMap';

const TYPE_LABELS: Record<string, string> = {
  floating_book: 'Document',
  hologram_frame: 'Lecture',
  framed_image: 'Visual',
  speech_bubble: 'Conversation',
  crystal_orb: 'Enrichment',
  synthesis_map: 'Mind Map',
  lesson: 'Lesson',
  brain: 'Insight',
  question: 'Question',
  coffee: 'Moment',
  milestone: 'Milestone',
  heart: 'Emotion',
  dream: 'Dream',
  tree: 'Habit',
  opinion: 'Opinion',
  headphones: 'Media',
  cash_stack: 'Goal',
  exam: 'Exam',
};

const TYPE_COLORS: Record<string, string> = {
  floating_book: '#60A8FF',
  hologram_frame: '#9B6FFF',
  framed_image: '#FF8C60',
  speech_bubble: '#1A6B48',
  crystal_orb: '#FF60B8',
  synthesis_map: '#FFD700',
  lesson: '#7EC8E3',
  brain: '#C084FC',
  question: '#FCD34D',
  coffee: '#D97706',
  milestone: '#34D399',
  heart: '#F87171',
  dream: '#A78BFA',
  tree: '#4ADE80',
  opinion: '#FB923C',
  headphones: '#38BDF8',
  cash_stack: '#FBBF24',
  exam: '#F43F5E',
};

/** GLB file path for each model-based visual. */
const GLB_PATHS: Partial<Record<ArtifactVisual, string>> = {
  floating_book: '/models/Book.glb',
  hologram_frame: '/models/lecture.glb',
  framed_image: '/models/Photo.glb',
  lesson: '/models/lesson.glb',
  brain: '/models/Brain.glb',
  question: '/models/question.glb',
  coffee: '/models/Memory.glb',
  milestone: '/models/Milestone.glb',
  heart: '/models/heart.glb',
  dream: '/models/Dream.glb',
  tree: '/models/Tree.glb',
  opinion: '/models/Opinion.glb',
  headphones: '/models/Headphones.glb',
  cash_stack: '/models/Cash Stack.glb',
  exam: '/models/Exams.glb',
};

/**
 * Per-model Y rotation (radians) to correct each GLB's resting orientation so its
 * "forward" axis aligns with local +Z (facing into the room from the wall).
 * Only needed when a model's native forward differs from +Z.
 */
const GLB_ROTATIONS: Partial<Record<ArtifactVisual, [number, number, number]>> = {
  lesson: [0, -Math.PI / 2, 0],
};

/** Models that need their material colors darkened (multiplier 0–1). */
const GLB_DARKEN: Partial<Record<ArtifactVisual, number>> = {
};

/**
 * Per-model scale to normalise each GLB to ~0.55 units (matching FloatingBook height).
 * Derived from bounding-box analysis of each file.
 */
const GLB_SCALES: Partial<Record<ArtifactVisual, number>> = {
  floating_book: 0.5,
  hologram_frame: 0.5,
  framed_image: 0.5,
  lesson: 0.014,
  brain: 0.030,
  question: 0.052,
  coffee: 0.019,
  milestone: 13.5,
  heart: 0.0015,
  dream: 0.001,
  tree: 0.001,
  opinion: 0.003,
  headphones: 0.050,
  cash_stack: 0.9,
  exam: 0.3,
};

/** Y offset (local space) from artifact origin to the date plaque. Override per visual as needed. */
const DATE_Y_OFFSETS: Partial<Record<ArtifactVisual | string, number>> = {
  opinion: -0.22,
  tree: -0.08,
};
const DEFAULT_DATE_Y_OFFSET = -0.45;

// Preload all GLB models so they're ready when a room loads
Object.values(GLB_PATHS).forEach((p) => useGLTF.preload(p));

function GlbArtifact({
  path,
  scale,
  rotation,
  darken,
  onClick,
  onHover,
}: {
  path: string;
  scale: number;
  rotation?: [number, number, number];
  darken?: number;
  onClick?: () => void;
  onHover?: (h: boolean) => void;
}) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const c = scene.clone();
    if (darken !== undefined) {
      c.traverse((obj: any) => {
        if (obj.isMesh && obj.material) {
          const mats: any[] = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((mat) => {
            if (mat.color) mat.color.multiplyScalar(darken);
          });
        }
      });
    }
    return c;
  }, [scene, darken]);
  return (
    <primitive
      object={cloned}
      scale={scale}
      rotation={rotation}
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
  if (artifact.wall === 'center') return [0, Math.PI, 0]; // face entrance

  // Fallback to spatial inference
  const { x, z } = artifact.position;
  if (x < 0.2) return [0, Math.PI / 2, 0];
  if (x > 7.8) return [0, -Math.PI / 2, 0];
  if (z > 7.8) return [0, Math.PI, 0];
  return [0, 0, 0];
}

export const Artifact = memo(function Artifact({ artifact, onClick, onHover }: ArtifactProps) {
  const [hovered, setHovered] = useState(false);
  const currentRoomId = usePalaceStore((s) => s.currentRoomId);
  // Register the world-space bounding-box center so ArtifactConnectionLines
  // can anchor dots at the true visual center of each model.
  const groupRef = useRef<Group>(null);
  const centerComputedRef = useRef(false);
  const centerFrameRef = useRef(0);
  useEffect(() => {
    centerComputedRef.current = false;
    centerFrameRef.current = 0;
    return () => { artifactCenters.delete(artifact.id); };
  }, [artifact.id]);
  useFrame(() => {
    if (centerComputedRef.current || !groupRef.current) return;
    if (++centerFrameRef.current >= 2) {
      registerArtifactCenter(artifact.id, groupRef.current);
      centerComputedRef.current = true;
    }
  });

  const pos = useMemo<[number, number, number]>(
    () => [artifact.position.x, artifact.position.y, artifact.position.z],
    [artifact.position.x, artifact.position.y, artifact.position.z],
  );

  const rot = useMemo(() => wallRotation(artifact), [artifact]);

  const color = useMemo(() => artifact.color ?? undefined, [artifact.color]);
  const label = useMemo(() => TYPE_LABELS[artifact.visual] ?? 'Memory', [artifact.visual]);
  const accentColor = useMemo(() => TYPE_COLORS[artifact.visual] ?? '#60A8FF', [artifact.visual]);

  const dateLabel = useMemo(() => {
    const d = new Date(artifact.capturedAt ?? artifact.createdAt);
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    return { datePart, timePart };
  }, [artifact.capturedAt, artifact.createdAt]);

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
      case 'hologram_frame':
        return <GlbArtifact path="/models/lecture.glb" scale={1.5} rotation={[0, -Math.PI / 2, 0]} onClick={handleClick} />;
      case 'framed_image':
        return <GlbArtifact path="/models/Photo.glb" scale={0.5} rotation={[0, Math.PI, 0]} onClick={handleClick} />;
      case 'speech_bubble':
        return <SpeechBubble position={O} color={color ?? accentColor} hovered={hovered} onClick={handleClick} />;
      case 'crystal_orb':
        return <CrystalOrb position={O} color={color ?? accentColor} hovered={hovered} onClick={handleClick} />;
      case 'synthesis_map':
        return <SynthesisMap position={O} imageUrl={artifact.sourceMediaUrl} onClick={handleClick} />;
      default: {
        const glbPath = GLB_PATHS[artifact.visual as ArtifactVisual];
        const glbScale = GLB_SCALES[artifact.visual as ArtifactVisual] ?? 0.3;
        const glbRotation = GLB_ROTATIONS[artifact.visual as ArtifactVisual];
        const glbDarken = GLB_DARKEN[artifact.visual as ArtifactVisual];
        if (glbPath) {
          return <GlbArtifact path={glbPath} scale={glbScale} rotation={glbRotation} darken={glbDarken} onClick={handleClick} />;
        }
        return null;
      }
    }
  })();

  return (
    <>
      <group ref={groupRef} position={pos} rotation={rot}>
        {/* T159: Small local shift to ensure mesh isn't submerged in wall 
            Local +Z faces INTO the room. */}
        <group position={[0, 0, 0.08]}>
          {visual}

          {/* ── Date/time plaque — only when inside this artifact's room and not hovered ── */}
          {currentRoomId === artifact.roomId && !hovered && (
            <Html
              position={[0, DATE_Y_OFFSETS[artifact.visual] ?? DEFAULT_DATE_Y_OFFSET, 0.12]}
              center
              distanceFactor={10}
              zIndexRange={[10, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                backdropFilter: 'blur(16px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderTop: '1px solid rgba(255,255,255,0.32)',
                borderRadius: '10px',
                padding: '4px 10px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                boxShadow: `0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}>
                <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.70)', lineHeight: 1.4 }}>
                  {dateLabel.datePart}
                </div>
                <div style={{ fontSize: '8px', letterSpacing: '0.05em', color: 'rgba(0,0,0,0.45)', lineHeight: 1.3 }}>
                  {dateLabel.timePart}
                </div>
              </div>
            </Html>
          )}

        </group>
      </group>

      {/* Invisible hover hitbox — depthWrite:false so it never clips Html/geometry below it */}
      <mesh
        position={pos}
        onPointerOver={() => handleHover(true)}
        onPointerOut={() => handleHover(false)}
        onClick={() => handleClick()}
      >
        <sphereGeometry args={[0.7, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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
              background: `linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)`,
              backdropFilter: 'blur(16px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
              border: `1px solid rgba(255,255,255,0.18)`,
              borderTop: `1px solid rgba(255,255,255,0.32)`,
              borderRadius: '14px',
              padding: '8px 12px',
              minWidth: '160px',
              maxWidth: '220px',
              textAlign: 'center',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 16px ${accentColor}20, inset 0 1px 0 rgba(255,255,255,0.15)`,
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
                color: 'rgba(0,0,0,0.75)',
                background: `${accentColor}18`,
                borderRadius: '4px',
                padding: '2px 7px',
                marginBottom: '6px',
              }}
            >
              {label}
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(0,0,0,0.80)',
                lineHeight: 1.45,
                marginBottom: '6px',
              }}
            >
              {artifact.title || artifact.summary}
            </div>

            {/* Click hint */}
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(0,0,0,0.40)',
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
  prev.artifact.title === next.artifact.title &&
  prev.artifact.summary === next.artifact.summary &&
  prev.highlighted === next.highlighted,
);
