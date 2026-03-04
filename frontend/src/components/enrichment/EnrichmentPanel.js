import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function EnrichmentPanel({ artifactId }) {
    const enrichments = useEnrichmentStore((s) => s.byArtifactId[artifactId] ?? []);
    const clearNewFlag = useEnrichmentStore((s) => s.clearNewFlag);
    React.useEffect(() => {
        clearNewFlag(artifactId);
    }, [artifactId, clearNewFlag]);
    if (enrichments.length === 0) {
        return (_jsxs("div", { style: emptyStyle, children: [_jsx("span", { style: emptyIconStyle, children: "\uD83D\uDD2E" }), _jsx("p", { style: emptyTextStyle, children: "Web enrichment in progress\u2026 Check back shortly." })] }));
    }
    return (_jsx("div", { style: containerStyle, children: enrichments.map((e) => (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: cardHeaderStyle, children: [_jsx(SourceAttribution, { url: e.sourceUrl, sourceName: e.sourceName }), typeof e.relevanceScore === 'number' && (_jsxs("span", { style: relevanceBadgeStyle(e.relevanceScore), children: [Math.round(e.relevanceScore * 100), "% relevant"] }))] }), _jsx("p", { style: previewStyle, children: e.preview }), e.images.length > 0 && (_jsx("div", { style: imagesGridStyle, children: e.images.map((img, i) => (_jsx(EnrichmentImage, { url: img.url, caption: img.caption }, i))) }))] }, e.id))) }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};
const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: radii.md,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: shadows.sm,
};
const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
};
const relevanceBadgeStyle = (score) => ({
    fontSize: 10,
    fontFamily: fonts.body,
    fontWeight: 600,
    color: score >= 0.7 ? '#34d399' : score >= 0.5 ? '#fbbf24' : colors.textFaint,
    background: score >= 0.7 ? 'rgba(52,211,153,0.1)' : score >= 0.5 ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${score >= 0.7 ? 'rgba(52,211,153,0.3)' : score >= 0.5 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: radii.sm,
    padding: '2px 6px',
});
const previewStyle = {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 1.65,
    margin: 0,
    fontFamily: fonts.body,
};
const imagesGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 8,
};
const emptyStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '24px 0',
};
const emptyIconStyle = {
    fontSize: 32,
    opacity: 0.5,
    animation: 'pulse 2s ease-in-out infinite',
};
const emptyTextStyle = {
    color: colors.textFaint,
    fontSize: 13,
    fontFamily: fonts.body,
    margin: 0,
    textAlign: 'center',
};
