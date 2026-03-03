import { useCaptureStore } from '../../stores/captureStore';

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
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 220,
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>
        {statusLabel[status] ?? status}
      </div>
      {concepts.length > 0 && (
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {concepts.length} concept{concepts.length !== 1 ? 's' : ''} captured
        </div>
      )}
    </div>
  );
}
