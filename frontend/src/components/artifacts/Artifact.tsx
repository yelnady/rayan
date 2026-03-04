import { useState } from 'react';
import { Html } from '@react-three/drei';
import type { Artifact as ArtifactData } from '../../types/palace';
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
}

export function Artifact({ artifact, onClick, onHover }: ArtifactProps) {
  const [hovered, setHovered] = useState(false);

  const pos: [number, number, number] = [
    artifact.position.x,
    artifact.position.y,
    artifact.position.z,
  ];

  const color = artifact.color ?? undefined;
  const label = TYPE_LABELS[artifact.visual] ?? 'Memory';
  const accentColor = TYPE_COLORS[artifact.visual] ?? '#60A8FF';

  const handleClick = () => onClick?.(artifact);

  const handleHover = (h: boolean) => {
    setHovered(h);
    onHover?.(h ? artifact : null);
  };

  const visual = (() => {
    switch (artifact.visual) {
      case 'floating_book':
        return <FloatingBook position={pos} color={color} onClick={handleClick} onHover={handleHover} />;
      case 'hologram_frame':
        return <HologramFrame position={pos} color={color} onClick={handleClick} onHover={handleHover} />;
      case 'framed_image':
        return <FramedImage position={pos} color={color} thumbnailUrl={artifact.thumbnailUrl} onClick={handleClick} onHover={handleHover} />;
      case 'speech_bubble':
        return <SpeechBubble position={pos} color={color} onClick={handleClick} onHover={handleHover} />;
      case 'crystal_orb':
        return <CrystalOrb position={pos} color={color} onClick={handleClick} onHover={handleHover} />;
      default:
        return null;
    }
  })();

  return (
    <>
      {visual}

      {/* Invisible hover hitbox — much easier to target than the small artifact mesh */}
      <mesh
        position={pos}
        onPointerOver={() => handleHover(true)}
        onPointerOut={() => handleHover(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Tooltip — rendered in the Room's coordinate space so position is correct */}
      {hovered && (
        <Html
          position={[pos[0], pos[1] + 0.75, pos[2]]}
          center
          distanceFactor={6}
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
}
