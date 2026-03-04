import { useCaptureStore } from '../../stores/captureStore';
import { colors, fonts, radii, shadows } from '../../config/tokens';

interface CaptureCompleteProps {
  onClose: () => void;
}

export function CaptureComplete({ onClose }: CaptureCompleteProps) {
  const summary = useCaptureStore((s) => s.summary);
  const status = useCaptureStore((s) => s.status);

  if (status !== 'complete' || !summary) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: colors.overlayLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: colors.surfaceAlt,
          borderRadius: radii.lg,
          padding: '32px 40px',
          color: colors.white,
          minWidth: 360,
          maxWidth: 480,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          animation: 'scaleIn 0.25s ease',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontFamily: fonts.heading }}>Capture Complete ✓</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <Stat label="Concepts captured" value={summary.conceptCount} />
          <Stat label="Artifacts created" value={summary.artifactsCreated.length} />
          <Stat label="Rooms affected" value={summary.roomsAffected.length} />
          {summary.newRoomsCreated.length > 0 && (
            <Stat label="New rooms created" value={summary.newRoomsCreated.length} />
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            background: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: radii.md,
            padding: '11px 24px',
            fontSize: 15,
            fontFamily: fonts.body,
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
            boxShadow: `0 4px 16px ${colors.primaryGlow}`,
          }}
        >
          View in Palace
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: fonts.body }}>
      <span style={{ color: colors.textSecondary }}>{label}</span>
      <span style={{ fontWeight: 700, color: colors.white }}>{value}</span>
    </div>
  );
}
