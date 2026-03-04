/**
 * EnrichmentPanel — detailed view of all enrichments for an artifact.
 *
 * T128: Shows a scrollable list of enrichment cards. Each card displays:
 *   - Source site name + link (SourceAttribution)
 *   - Extracted content preview
 *   - Images (EnrichmentImage)
 *
 * Props:
 *   artifactId — the artifact whose enrichments to display
 *
 * Data: reads from enrichmentStore; REST data is loaded once by
 * ArtifactDetailModal before rendering this panel.
 */

import React from 'react';
import { useEnrichmentStore } from '../../stores/enrichmentStore';
import { EnrichmentImage } from './EnrichmentImage';
import { SourceAttribution } from './SourceAttribution';
import { colors, fonts, radii, shadows } from '../../config/tokens';

interface EnrichmentPanelProps {
    artifactId: string;
}

const EMPTY_ENRICHMENTS: never[] = [];

export function EnrichmentPanel({ artifactId }: EnrichmentPanelProps) {
    const enrichments = useEnrichmentStore(
        (s) => s.byArtifactId[artifactId] ?? EMPTY_ENRICHMENTS,
    );
    const clearNewFlag = useEnrichmentStore((s) => s.clearNewFlag);

    React.useEffect(() => {
        clearNewFlag(artifactId);
    }, [artifactId, clearNewFlag]);

    if (enrichments.length === 0) {
        return (
            <div style={emptyStyle}>
                <span style={emptyIconStyle}>🔮</span>
                <p style={emptyTextStyle}>
                    Web enrichment in progress… Check back shortly.
                </p>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {enrichments.map((e) => (
                <div key={e.id} style={cardStyle}>
                    {/* Card header */}
                    <div style={cardHeaderStyle}>
                        <SourceAttribution url={e.sourceUrl} sourceName={e.sourceName} />
                        {typeof e.relevanceScore === 'number' && (
                            <span style={relevanceBadgeStyle(e.relevanceScore)}>
                                {Math.round(e.relevanceScore * 100)}% relevant
                            </span>
                        )}
                    </div>

                    {/* Preview text */}
                    <p style={previewStyle}>{e.preview}</p>

                    {/* Images */}
                    {e.images.length > 0 && (
                        <div style={imagesGridStyle}>
                            {e.images.map((img, i) => (
                                <EnrichmentImage key={i} url={img.url} caption={img.caption} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: radii.md,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: shadows.sm,
};

const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
};

const relevanceBadgeStyle = (score: number): React.CSSProperties => ({
    fontSize: 10,
    fontFamily: fonts.body,
    fontWeight: 600,
    color: score >= 0.7 ? '#34d399' : score >= 0.5 ? '#fbbf24' : colors.textFaint,
    background: score >= 0.7 ? 'rgba(52,211,153,0.1)' : score >= 0.5 ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${score >= 0.7 ? 'rgba(52,211,153,0.3)' : score >= 0.5 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: radii.sm,
    padding: '2px 6px',
});

const previewStyle: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 1.65,
    margin: 0,
    fontFamily: fonts.body,
};

const imagesGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 8,
};

const emptyStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '24px 0',
};

const emptyIconStyle: React.CSSProperties = {
    fontSize: 32,
    opacity: 0.5,
    animation: 'pulse 2s ease-in-out infinite',
};

const emptyTextStyle: React.CSSProperties = {
    color: colors.textFaint,
    fontSize: 13,
    fontFamily: fonts.body,
    margin: 0,
    textAlign: 'center',
};
