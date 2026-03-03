import { Html } from '@react-three/drei';
import type { Artifact } from '../../types/palace';

interface ArtifactTooltipProps {
  artifact: Artifact;
}

const VISUAL_LABELS: Record<string, string> = {
  floating_book: 'Document',
  hologram_frame: 'Lecture',
  framed_image: 'Visual',
  speech_bubble: 'Conversation',
  crystal_orb: 'Enrichment',
};

export function ArtifactTooltip({ artifact }: ArtifactTooltipProps) {
  const label = VISUAL_LABELS[artifact.visual] ?? 'Memory';

  return (
    <Html
      position={[
        artifact.position.x,
        artifact.position.y + 0.5,
        artifact.position.z,
      ]}
      center
      distanceFactor={8}
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          maxWidth: '180px',
          textAlign: 'center',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.15)',
          whiteSpace: 'normal',
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '2px', color: '#a8d8ff' }}>{label}</div>
        <div style={{ opacity: 0.9 }}>{artifact.summary}</div>
      </div>
    </Html>
  );
}
