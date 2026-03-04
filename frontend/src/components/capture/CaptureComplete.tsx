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
      className="fixed inset-0 bg-overlay-light flex items-center justify-center z-modal backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-alt rounded-2xl py-8 px-10 text-text-primary min-w-[360px] max-w-[480px] border border-border shadow-lg animate-[scaleIn_0.25s_ease]">
        <h2 className="m-0 mb-5 text-[22px] font-heading">Capture Complete ✓</h2>

        <div className="flex flex-col gap-3 mb-6">
          <Stat label="Concepts captured" value={summary.conceptCount} />
          <Stat label="Artifacts created" value={summary.artifactsCreated.length} />
          <Stat label="Rooms affected" value={summary.roomsAffected.length} />
          {summary.newRoomsCreated.length > 0 && (
            <Stat label="New rooms created" value={summary.newRoomsCreated.length} />
          )}
        </div>

        <button
          onClick={onClose}
          className="bg-primary text-text-primary border-none rounded-md px-6 py-[11px] text-[15px] font-body font-medium cursor-pointer w-full shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
        >
          View in Palace
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between font-body">
      <span className="text-text-secondary">{label}</span>
      <span className="font-bold text-text-primary">{value}</span>
    </div>
  );
}
