import { useCaptureStore } from '../../stores/captureStore';
import type { CaptureCompleteArtifact, CaptureCompleteRoom } from '../../services/websocket';

const ARTIFACT_TYPE_ICON: Record<string, string> = {
  lecture: '🎓', document: '📄', lesson: '📚', insight: '💡', question: '❓',
  moment: '☕', milestone: '🏆', emotion: '❤️', dream: '✨', habit: '🌳',
  conversation: '💬', opinion: '💭', visual: '🖼️', media: '🎧',
  goal: '🎯', enrichment: '🔮',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  webcam: 'Webcam', screen_share: 'Screen share', upload: 'File upload',
  text_input: 'Text input', voice: 'Voice',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

interface CaptureCompleteProps {
  onClose: () => void;
  onArtifactClick?: (artifactId: string, roomId: string) => void;
}

export function CaptureComplete({ onClose, onArtifactClick }: CaptureCompleteProps) {
  const summary = useCaptureStore((s) => s.summary);
  const status = useCaptureStore((s) => s.status);

  if (status !== 'complete' || !summary) return null;

  const newRoomCount = summary.rooms.filter((r) => r.isNew).length;
  const existingRoomCount = summary.rooms.length - newRoomCount;

  return (
    <div
      className="fixed inset-0 bg-overlay-light flex items-center justify-center z-modal backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-alt rounded-2xl py-7 px-9 text-text-primary min-w-[400px] max-w-[540px] w-full border border-border shadow-lg animate-[scaleIn_0.25s_ease]">

        {/* Header */}
        <h2 className="m-0 mb-4 text-[22px] font-heading">Session Complete</h2>

        {/* Session meta row */}
        <div className="flex flex-wrap gap-3 mb-5">
          <MetaBadge label={`${summary.conceptCount} memor${summary.conceptCount !== 1 ? 'ies' : 'y'}`} />
          {summary.rooms.length > 0 && (
            <MetaBadge
              label={`${summary.rooms.length} room${summary.rooms.length !== 1 ? 's' : ''}${newRoomCount > 0 ? ` · ${newRoomCount} new` : ''}`}
              highlight={newRoomCount > 0}
            />
          )}
          {summary.durationSeconds != null && (
            <MetaBadge label={formatDuration(summary.durationSeconds)} />
          )}
          {summary.sourceType && (
            <MetaBadge label={SOURCE_TYPE_LABEL[summary.sourceType] ?? summary.sourceType} />
          )}
        </div>

        {/* Per-room artifact list */}
        {summary.rooms.length > 0 ? (
          <div className="flex flex-col gap-3 mb-6 max-h-[360px] overflow-y-auto pr-1">
            {summary.rooms.map((room) => (
              <RoomGroup
                key={room.id}
                room={room}
                artifacts={summary.artifacts.filter((a) => a.roomId === room.id)}
                onArtifactClick={onArtifactClick}
              />
            ))}
          </div>
        ) : (
          <p className="text-text-secondary font-heading text-sm mb-6">No memories were captured this session.</p>
        )}

        <button
          onClick={onClose}
          className="bg-primary text-text-primary border-none rounded-md px-6 py-[11px] text-[15px] font-heading font-medium cursor-pointer w-full shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
        >
          View in Palace
        </button>
      </div>
    </div>
  );
}

function MetaBadge({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <span
      className={`text-xs font-heading font-medium px-3 py-1 rounded-full border ${
        highlight
          ? 'bg-primary/15 border-primary/40 text-primary'
          : 'bg-surface border-border text-text-secondary'
      }`}
    >
      {label}
    </span>
  );
}

function RoomGroup({
  room,
  artifacts,
  onArtifactClick,
}: {
  room: CaptureCompleteRoom;
  artifacts: CaptureCompleteArtifact[];
  onArtifactClick?: (artifactId: string, roomId: string) => void;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Room header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface border-b border-border">
        <span className="text-sm font-heading text-text-primary">{room.name}</span>
        {room.isNew && (
          <span className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wide">
            New
          </span>
        )}
        <span className="ml-auto text-xs text-text-secondary font-heading">
          {room.artifactCount} memor{room.artifactCount !== 1 ? 'ies' : 'y'}
        </span>
      </div>
      {/* Artifact rows */}
      <div className="flex flex-col divide-y divide-border">
        {artifacts.map((a) => (
          <button
            key={a.id}
            onClick={() => onArtifactClick?.(a.id, room.id)}
            className="flex items-center gap-3 px-4 py-2.5 w-full text-left bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors duration-100"
          >
            <span className="text-base leading-none shrink-0">{ARTIFACT_TYPE_ICON[a.type] ?? '📌'}</span>
            <span className="text-sm font-heading text-text-primary flex-1 min-w-0 truncate">{a.title}</span>
            <span className="text-[11px] text-text-secondary font-heading shrink-0 capitalize">{a.type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
