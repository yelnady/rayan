import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
    margin: 0,
};
const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '10px 12px',
};
const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
};
const artifactIdStyle = {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'monospace',
};
const roomTagStyle = {
    background: 'rgba(99,102,241,0.15)',
    color: 'rgba(99,102,241,0.8)',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'capitalize',
    padding: '2px 7px',
    borderRadius: 5,
    fontFamily: 'Inter, system-ui, sans-serif',
};
const reasonStyle = {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 1.5,
    margin: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
};
const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '6px 10px',
};
const chipIconStyle = {
    color: 'rgba(99,102,241,0.7)',
    fontSize: 12,
};
const chipTextStyle = {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontFamily: 'monospace',
};
