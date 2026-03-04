import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ResponsePanel — sliding panel that displays the streamed voice response
 * transcript and narration summary.
 *
 * Slides in from the right when a query is active and slides back out on idle.
 * Text chunks stream in progressively as response_chunk messages arrive.
 * Artifact narration (artifact_recall) is shown with diagrams listed below.
 */
import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { colors, fonts, radii, shadows, transitions, zIndex } from '../../config/tokens';
export function ResponsePanel() {
    const status = useVoiceStore((s) => s.status);
    const transcript = useVoiceStore((s) => s.transcript);
    const narration = useVoiceStore((s) => s.currentNarration);
    const bottomRef = useRef(null);
    const isVisible = status !== 'disconnected';
    // Auto-scroll to bottom as new text arrives
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, narration]);
    return (_jsxs("div", { id: "response-panel", role: "region", "aria-label": "Voice response", "aria-live": "polite", style: panelStyle(isVisible), children: [_jsxs("div", { style: headerStyle, children: [_jsx("span", { style: avatarDotStyle }), _jsx("span", { style: headerTitleStyle, children: "Rayan" }), status === 'connecting' && _jsx("span", { style: subtitleStyle, children: "connecting\u2026" }), status === 'connected' && _jsx("span", { style: subtitleStyle, children: "listening" }), status === 'responding' && _jsx("span", { style: subtitleStyle, children: "speaking" }), status === 'error' && _jsx("span", { style: { ...subtitleStyle, color: colors.error }, children: "error" })] }), _jsxs("div", { style: bodyStyle, children: [narration?.summary && (_jsx("div", { style: summaryBlockStyle, children: _jsx("p", { style: summaryTextStyle, children: narration.summary }) })), transcript && (_jsx("p", { style: transcriptStyle, children: transcript })), status === 'connecting' && !transcript && !narration && (_jsx("div", { style: placeholderStyle, children: _jsx(ThinkingDots, {}) })), narration?.relatedArtifacts && narration.relatedArtifacts.length > 0 && (_jsxs("div", { style: relatedSectionStyle, children: [_jsx("p", { style: relatedTitleStyle, children: "Related memories" }), narration.relatedArtifacts.map((rel) => (_jsx("div", { style: relatedChipStyle, children: _jsx("span", { style: relatedReasonStyle, children: rel.reason }) }, rel.artifactId)))] })), _jsx("div", { ref: bottomRef })] })] }));
}
// ── Sub-components ────────────────────────────────────────────────────────────
function ThinkingDots() {
    return (_jsx("div", { style: { display: 'flex', gap: 5, alignItems: 'center' }, "aria-hidden": "true", children: [0, 0.2, 0.4].map((delay, i) => (_jsx("div", { style: {
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: colors.primaryGlow,
                animation: `thinking-dot 1.2s ease-in-out ${delay}s infinite`,
            } }, i))) }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const panelStyle = (visible) => ({
    position: 'fixed',
    right: visible ? 0 : -360,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 340,
    maxHeight: '65vh',
    background: colors.glass,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border}`,
    borderRight: 'none',
    borderRadius: `${radii.lg}px 0 0 ${radii.lg}px`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: `right ${transitions.slow}`,
    zIndex: zIndex.responsePanel,
    boxShadow: shadows.panel,
    pointerEvents: visible ? 'auto' : 'none',
});
const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
};
const avatarDotStyle = {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    flexShrink: 0,
};
const headerTitleStyle = {
    color: colors.white,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.heading,
    flex: 1,
};
const subtitleStyle = {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.body,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};
const bodyStyle = {
    overflowY: 'auto',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};
const summaryBlockStyle = {
    background: 'rgba(99,102,241,0.08)',
    borderLeft: '3px solid rgba(99,102,241,0.6)',
    borderRadius: '0 8px 8px 0',
    padding: '8px 12px',
};
const summaryTextStyle = {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
    fontFamily: fonts.body,
};
const transcriptStyle = {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 1.65,
    margin: 0,
    fontFamily: fonts.body,
};
const placeholderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 0',
};
const relatedSectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
};
const relatedTitleStyle = {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: 0,
    fontFamily: fonts.body,
};
const relatedChipStyle = {
    background: colors.surfaceHover,
    borderRadius: radii.md,
    padding: '6px 10px',
};
const relatedReasonStyle = {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.body,
};
