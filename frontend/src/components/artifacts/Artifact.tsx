import type { Artifact as ArtifactData } from '../../types/palace';
import { FloatingBook } from './FloatingBook';
import { HologramFrame } from './HologramFrame';
import { FramedImage } from './FramedImage';
import { SpeechBubble } from './SpeechBubble';
import { CrystalOrb } from './CrystalOrb';

interface ArtifactProps {
  artifact: ArtifactData;
  onClick?: (artifact: ArtifactData) => void;
  onHover?: (artifact: ArtifactData | null) => void;
}

export function Artifact({ artifact, onClick, onHover }: ArtifactProps) {
  const pos: [number, number, number] = [
    artifact.position.x,
    artifact.position.y,
    artifact.position.z,
  ];

  const color = artifact.color ?? undefined;
  const handleClick = () => onClick?.(artifact);
  const handleHover = (hovered: boolean) => onHover?.(hovered ? artifact : null);

  switch (artifact.visual) {
    case 'floating_book':
      return (
        <FloatingBook
          position={pos}
          color={color}
          onClick={handleClick}
          onHover={handleHover}
        />
      );

    case 'hologram_frame':
      return (
        <HologramFrame
          position={pos}
          color={color}
          onClick={handleClick}
          onHover={handleHover}
        />
      );

    case 'framed_image':
      return (
        <FramedImage
          position={pos}
          color={color}
          thumbnailUrl={artifact.thumbnailUrl}
          onClick={handleClick}
          onHover={handleHover}
        />
      );

    case 'speech_bubble':
      return (
        <SpeechBubble
          position={pos}
          color={color}
          onClick={handleClick}
          onHover={handleHover}
        />
      );

    case 'crystal_orb':
      return (
        <CrystalOrb
          position={pos}
          color={color}
          onClick={handleClick}
          onHover={handleHover}
        />
      );

    default:
      return null;
  }
}
