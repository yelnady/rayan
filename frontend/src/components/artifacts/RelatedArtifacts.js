import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { colors, fonts, radii } from '../../config/tokens';
export function RelatedArtifacts({ relatedArtifactIds, narrationRelated }) {
    // Prefer narration (richer) entries if available; fall back to bare IDs
    const hasNarration = narrationRelated.length > 0;
    if (!hasNarration && relatedArtifactIds.length === 0) {
        return _jsx("p", { style: emptyStyle, children: "No related memories found." });
    }
    return (_jsx("div", { id: "related-artifacts-list", style: containerStyle, children: hasNarration
            ? narrationRelated.map((rel) => (_jsx(NarrationCard, { rel: rel }, rel.artifactId)))
            : relatedArtifactIds.map((id) => (_jsx(BareIdCard, { artifactId: id }, id))) }));
}
// ── Cards ─────────────────────────────────────────────────────────────────────
function NarrationCard({ rel }) {
    return (_jsxs("div", { style: cardStyle, title: `Room: ${rel.roomId}`, children: [_jsxs("div", { style: cardHeaderStyle, children: [_jsxs("span", { style: artifactIdStyle, children: [rel.artifactId.slice(0, 16), "\u2026"] }), _jsx("span", { style: roomTagStyle, children: rel.roomId.replace('room_', '').replace(/_/g, ' ') })] }), _jsx("p", { style: reasonStyle, children: rel.reason })] }));
}
function BareIdCard({ artifactId }) {
    return (_jsxs("div", { style: chipStyle, children: [_jsx("span", { style: chipIconStyle, children: "\u2197" }), _jsxs("span", { style: chipTextStyle, children: [artifactId.slice(0, 18), "\u2026"] })] }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
};
const emptyStyle = {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.body,
    margin: 0,
};
const cardStyle = {
    background: colors.surfaceHover,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    padding: '10px 12px',
};
const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
};
const artifactIdStyle = {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.mono,
};
const roomTagStyle = {
    background: colors.primaryMuted,
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'capitalize',
    padding: '2px 7px',
    borderRadius: radii.xs,
    fontFamily: fonts.body,
};
const reasonStyle = {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
    margin: 0,
    fontFamily: fonts.body,
};
const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: colors.surfaceHover,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.md,
    padding: '6px 10px',
};
const chipIconStyle = {
    color: colors.primary,
    fontSize: 12,
};
const chipTextStyle = {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.mono,
};
