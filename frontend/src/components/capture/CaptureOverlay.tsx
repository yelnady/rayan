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
    <div className="fixed top-4 right-4 bg-glass text-white rounded-2xl px-4 py-3 min-w-[220px] z-capture-overlay backdrop-blur-md border border-border shadow-[0_4px_24px_rgba(0,0,0,0.4)] animate-[fadeIn_0.2s_ease]">
      <div className="font-bold mb-2 font-body text-[13px]">
        {statusLabel[status] ?? status}
      </div>
      {concepts.length > 0 && (
        <div className="text-xs text-text-secondary font-body">
          {concepts.length} concept{concepts.length !== 1 ? 's' : ''} captured
        </div>
      )}
    </div>
  );
}
