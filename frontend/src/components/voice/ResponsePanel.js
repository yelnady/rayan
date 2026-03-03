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
export function ResponsePanel() {
    const status = useVoiceStore((s) => s.status);
    const transcript = useVoiceStore((s) => s.transcript);
    const narration = useVoiceStore((s) => s.currentNarration);
    const bottomRef = useRef(null);
    const isVisible = status !== 'idle';
    // Auto-scroll to bottom as new text arrives
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, narration]);
    return (_jsxs("div", { id: "response-panel", role: "region", "aria-label": "Voice response", "aria-live": "polite", style: panelStyle(isVisible), children: [_jsxs("div", { style: headerStyle, children: [_jsx("span", { style: avatarDotStyle }), _jsx("span", { style: headerTitleStyle, children: "Rayan" }), status === 'processing' && _jsx("span", { style: subtitleStyle, children: "thinking\u2026" }), status === 'responding' && _jsx("span", { style: subtitleStyle, children: "speaking" }), status === 'error' && _jsx("span", { style: { ...subtitleStyle, color: '#f87171' }, children: "error" })] }), _jsxs("div", { style: bodyStyle, children: [narration?.summary && (_jsx("div", { style: summaryBlockStyle, children: _jsx("p", { style: summaryTextStyle, children: narration.summary }) })), transcript && (_jsx("p", { style: transcriptStyle, children: transcript })), status === 'processing' && !transcript && !narration && (_jsx("div", { style: placeholderStyle, children: _jsx(ThinkingDots, {}) })), narration?.relatedArtifacts && narration.relatedArtifacts.length > 0 && (_jsxs("div", { style: relatedSectionStyle, children: [_jsx("p", { style: relatedTitleStyle, children: "Related memories" }), narration.relatedArtifacts.map((rel) => (_jsx("div", { style: relatedChipStyle, children: _jsx("span", { style: relatedReasonStyle, children: rel.reason }) }, rel.artifactId)))] })), _jsx("div", { ref: bottomRef })] })] }));
}
// ── Sub-components ────────────────────────────────────────────────────────────
function ThinkingDots() {
    return (_jsxs("div", { style: { display: 'flex', gap: 5, alignItems: 'center' }, "aria-hidden": "true", children: [_jsx("style", { children: `
        @keyframes thinking-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      ` }), [0, 0.2, 0.4].map((delay, i) => (_jsx("div", { style: {
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'rgba(99,102,241,0.8)',
                    animation: `thinking-dot 1.2s ease-in-out ${delay}s infinite`,
                } }, i)))] }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const panelStyle = (visible) => ({
    position: 'fixed',
    right: visible ? 0 : -360,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 340,
    maxHeight: '65vh',
    background: 'rgba(12,12,18,0.88)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRight: 'none',
    borderRadius: '16px 0 0 16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'right 0.35s cubic-bezier(0.32,0,0.67,0)',
    zIndex: 150,
    boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Inter, system-ui, sans-serif',
    flex: 1,
};
const subtitleStyle = {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Inter, system-ui, sans-serif',
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
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
};
const transcriptStyle = {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 1.65,
    margin: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
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
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
};
const relatedChipStyle = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: '6px 10px',
};
const relatedReasonStyle = {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
};
