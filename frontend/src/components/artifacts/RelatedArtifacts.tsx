/**
 * RelatedArtifacts — displays a list of related memory connections.
 *
 * Two data sources:
 *   1. `relatedArtifactIds` — array of artifact IDs from the REST response
 *      (just IDs, no room or reason; shown as compact chips)
 *   2. `narrationRelated` — richer entries from the artifact_recall WebSocket
 *      message (includes roomId and reason string)
 */

interface NarrationRelated {
    artifactId: string;
    roomId: string;
    reason: string;
}

interface RelatedArtifactsProps {
    /** Bare artifact IDs from the REST artifact response. */
    relatedArtifactIds: string[];
    /** Richer entries from artifact_recall WebSocket message. */
    narrationRelated: NarrationRelated[];
}

export function RelatedArtifacts({ relatedArtifactIds, narrationRelated }: RelatedArtifactsProps) {
    // Prefer narration (richer) entries if available; fall back to bare IDs
    const hasNarration = narrationRelated.length > 0;

    if (!hasNarration && relatedArtifactIds.length === 0) {
        return <p className="text-text-muted text-[12px] font-body m-0">No related memories found.</p>;
    }

    return (
        <div id="related-artifacts-list" className="flex flex-col gap-2">
            {hasNarration
                ? narrationRelated.map((rel) => (
                    <NarrationCard key={rel.artifactId} rel={rel} />
                ))
                : relatedArtifactIds.map((id) => (
                    <BareIdCard key={id} artifactId={id} />
                ))}
        </div>
    );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function NarrationCard({ rel }: { rel: NarrationRelated }) {
    return (
        <div className="bg-surface-hover border border-border rounded-md py-2.5 px-3" title={`Room: ${rel.roomId}`}>
            <div className="flex items-center justify-end mb-1.5">
                <span className="bg-primary-muted text-primary-light text-[10px] font-semibold capitalize py-0.5 px-1.5 rounded-[4px] font-body">{rel.roomId.replace('room_', '').replace(/_/g, ' ')}</span>
            </div>
            <p className="text-text-secondary text-[12px] leading-[1.5] m-0 font-body">{rel.reason}</p>
        </div>
    );
}

function BareIdCard(_props: { artifactId: string }) {
    return (
        <div className="inline-flex items-center gap-1.5 bg-surface-hover border border-border rounded-md py-1.5 px-2.5">
            <span className="text-primary text-[12px]">↗</span>
            <span className="text-text-muted text-[11px] font-mono">Related Memory</span>
        </div>
    );
}
