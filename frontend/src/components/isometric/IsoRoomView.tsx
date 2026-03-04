import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { Artifact, ArtifactType, Room } from '../../types/palace';
import { IsoArtifactIcon } from './IsoArtifactIcon';
import { getIsoTheme } from './isoThemes';

interface IsoRoomViewProps {
  room: Room;
  artifacts: Artifact[];
  onArtifactClick: (artifact: Artifact) => void;
  onBack: () => void;
}

const FILTER_CHIPS: Array<{ type: ArtifactType | null; label: string }> = [
  { type: null, label: 'All' },
  { type: 'lecture', label: '📖 Lecture' },
  { type: 'document', label: '📄 Document' },
  { type: 'visual', label: '🖼 Visual' },
  { type: 'conversation', label: '💬 Conversation' },
  { type: 'enrichment', label: '🔮 Enrichment' },
];

/**
 * Fixed full-screen overlay showing artifacts in a selected room.
 * GSAP fade-in on mount + staggered artifact card entrance.
 */
export function IsoRoomView({ room, artifacts, onArtifactClick, onBack }: IsoRoomViewProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = getIsoTheme(room.style);
  const [activeFilter, setActiveFilter] = useState<ArtifactType | null>(null);

  const filteredArtifacts = activeFilter
    ? artifacts.filter((a) => a.type === activeFilter)
    : artifacts;

  useEffect(() => {
    const tl = gsap.timeline();
    if (overlayRef.current) {
      tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    }
    if (cardRef.current) {
      tl.fromTo(
        cardRef.current,
        { opacity: 0, y: 24, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' },
        '-=0.1',
      );
    }
    // Stagger artifact cards in
    tl.fromTo(
      '.iso-artifact-card',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, stagger: 0.05, duration: 0.22, ease: 'power2.out' },
      '-=0.05',
    );
  }, []);

  // Re-stagger when filter changes
  useEffect(() => {
    gsap.fromTo(
      '.iso-artifact-card',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, stagger: 0.05, duration: 0.22, ease: 'power2.out' },
    );
  }, [activeFilter]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-[rgba(0,0,0,0.55)] backdrop-blur-sm z-[500] flex items-center justify-center p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBack();
      }}
    >
      <div
        ref={cardRef}
        className="bg-surface border border-border rounded-xl w-full max-w-[680px] max-h-[80vh] flex flex-col overflow-hidden shadow-lg"
      >
        {/* Header */}
        <div
          className="px-5 pt-[18px] pb-3.5 border-b border-border-light flex items-center gap-3 shrink-0"
          style={{ background: `linear-gradient(135deg, ${theme.topColor}60 0%, transparent 60%)` }}
        >
          <button
            onClick={onBack}
            aria-label="Back to world"
            className="flex items-center gap-1.5 bg-transparent border border-border rounded-sm py-1.5 px-2.5 cursor-pointer font-body text-xs text-text-secondary shrink-0"
          >
            ← Back
          </button>

          <div className="flex-1">
            <h2 className="font-heading text-lg font-bold text-text-primary m-0 leading-[1.2]">
              {room.name}
            </h2>
            {room.style && (
              <span className="font-body text-[11px] text-text-muted capitalize">
                {room.style}
              </span>
            )}
          </div>

          <div className="font-body text-xs text-text-muted bg-surface-alt border border-border rounded-full py-1 px-2.5 shrink-0">
            {artifacts.length} {artifacts.length === 1 ? 'memory' : 'memories'}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-5 py-2.5 flex-wrap border-b border-border-light shrink-0">
          {FILTER_CHIPS.map((chip) => {
            const isActive = chip.type === activeFilter;
            return (
              <button
                key={chip.label}
                onClick={() => setActiveFilter(chip.type)}
                className={`font-body text-[11px] rounded-full px-2.5 py-1 cursor-pointer transition-all duration-150 ${isActive ? 'font-semibold border' : 'font-normal text-text-secondary bg-transparent border border-border'}`}
                style={{
                  color: isActive ? theme.sideColor : undefined,
                  background: isActive ? `${theme.topColor}80` : undefined,
                  borderColor: isActive ? theme.sideColor : undefined,
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Artifacts grid */}
        <div className="overflow-y-auto p-5 flex-1">
          {filteredArtifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span className="text-[48px]">🏛️</span>
              <p className="font-heading text-base font-semibold text-text-secondary m-0">
                This room is quiet
              </p>
              <p className="font-body text-[13px] text-text-faint m-0 text-center">
                {activeFilter
                  ? `No ${activeFilter} memories here yet.`
                  : 'Start a capture session to add memories here.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {filteredArtifacts.map((artifact) => (
                <div key={artifact.id} className="iso-artifact-card">
                  <IsoArtifactIcon
                    artifact={artifact}
                    onClick={onArtifactClick}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
