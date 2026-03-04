import { useCaptureStore } from '../../stores/captureStore';
import { colors, fonts, radii } from '../../config/tokens';

export function CaptureOverlay() {
  const status = useCaptureStore((s) => s.status);
  const concepts = useCaptureStore((s) => s.concepts);

  if (status === 'idle') return null;

  const statusLabel: Record<string, string> = {
    capturing: '● Recording',
    processing: '⏳ Processing…',
    complete: '✓ Done',
    error: '✗ Error',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        background: colors.glass,
        color: colors.white,
        borderRadius: radii.lg,
        padding: '12px 16px',
        minWidth: 220,
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, fontFamily: fonts.body, fontSize: 13 }}>
        {statusLabel[status] ?? status}
      </div>
      {concepts.length > 0 && (
        <div style={{ fontSize: 12, color: colors.textSecondary, fontFamily: fonts.body }}>
          {concepts.length} concept{concepts.length !== 1 ? 's' : ''} captured
        </div>
      )}
    </div>
  );
}
