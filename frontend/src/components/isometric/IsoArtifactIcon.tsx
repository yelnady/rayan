import { useState } from 'react';
import type { Artifact, ArtifactVisual } from '../../types/palace';

const VISUAL_EMOJI: Record<ArtifactVisual, string> = {
  floating_book: '📖',
  hologram_frame: '🔷',
  framed_image: '🖼',
  speech_bubble: '💬',
  crystal_orb: '🔮',
};

interface IsoArtifactIconProps {
  artifact: Artifact;
  onClick: (artifact: Artifact) => void;
}

export function IsoArtifactIcon({ artifact, onClick }: IsoArtifactIconProps) {
  const [hovered, setHovered] = useState(false);
  const emoji = VISUAL_EMOJI[artifact.visual] ?? '📄';

  return (
    <button
      onClick={() => onClick(artifact)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col items-center gap-1.5 py-3 px-3.5 rounded-2xl cursor-pointer w-[120px] transition-all duration-150 ${hovered ? 'bg-surface-alt border-primary -translate-y-1 shadow-[0_8px_24px_rgba(0,0,0,0.1),0_0_0_2px_rgba(99,102,241,0.3)]' : 'bg-surface border-border translate-y-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'} border`}
    >
      <span className="text-[28px] leading-none">{emoji}</span>
      <span className="text-text-secondary font-body text-[11px] text-center leading-[1.35] line-clamp-2 break-words">
        {artifact.summary}
      </span>
    </button>
  );
}
