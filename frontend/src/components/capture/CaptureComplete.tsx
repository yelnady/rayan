import { useCaptureStore } from '../../stores/captureStore';

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
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#1e1e2e',
          borderRadius: 16,
          padding: '32px 40px',
          color: '#fff',
          minWidth: 360,
          maxWidth: 480,
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 22 }}>Capture Complete ✓</h2>

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
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 15,
            cursor: 'pointer',
            width: '100%',
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
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
