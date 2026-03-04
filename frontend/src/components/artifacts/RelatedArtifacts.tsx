/**
 * RelatedArtifacts — displays a list of related memory connections.
 *
 * Two data sources:
 *   1. `relatedArtifactIds` — array of artifact IDs from the REST response
 *      (just IDs, no room or reason; shown as compact chips)
 *   2. `narrationRelated` — richer entries from the artifact_recall WebSocket
 *      message (includes roomId and reason string)
 */

import React from 'react';
import { colors, fonts, radii } from '../../config/tokens';

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
        return <p style={emptyStyle}>No related memories found.</p>;
    }

    return (
        <div id="related-artifacts-list" style={containerStyle}>
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
        <div style={cardStyle} title={`Room: ${rel.roomId}`}>
            <div style={cardHeaderStyle}>
                <span style={artifactIdStyle}>{rel.artifactId.slice(0, 16)}…</span>
                <span style={roomTagStyle}>{rel.roomId.replace('room_', '').replace(/_/g, ' ')}</span>
            </div>
            <p style={reasonStyle}>{rel.reason}</p>
        </div>
    );
}

function BareIdCard({ artifactId }: { artifactId: string }) {
    return (
        <div style={chipStyle}>
            <span style={chipIconStyle}>↗</span>
            <span style={chipTextStyle}>{artifactId.slice(0, 18)}…</span>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
};

const emptyStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.body,
    margin: 0,
};

const cardStyle: React.CSSProperties = {
    background: colors.surfaceHover,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    padding: '10px 12px',
};

const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
};

const artifactIdStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.mono,
};

const roomTagStyle: React.CSSProperties = {
    background: colors.primaryMuted,
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'capitalize',
    padding: '2px 7px',
    borderRadius: radii.xs,
    fontFamily: fonts.body,
};

const reasonStyle: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
    margin: 0,
    fontFamily: fonts.body,
};

const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: colors.surfaceHover,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    padding: '6px 10px',
};

const chipIconStyle: React.CSSProperties = {
    color: colors.primary,
    fontSize: 12,
};

const chipTextStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.mono,
};
