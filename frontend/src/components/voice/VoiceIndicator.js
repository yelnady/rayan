import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useVoiceStore } from '../../stores/voiceStore';
import { colors, fonts, radii, shadows, zIndex } from '../../config/tokens';
export function VoiceIndicator() {
    const status = useVoiceStore((s) => s.status);
    if (status === 'disconnected')
        return null;
    return (_jsxs("div", { id: "voice-indicator", style: containerStyle, role: "status", "aria-live": "polite", children: [status === 'connecting' && (_jsxs(_Fragment, { children: [_jsx(SpinnerRing, {}), _jsx("span", { style: labelStyle, children: "Connecting\u2026" })] })), status === 'connected' && (_jsxs(_Fragment, { children: [_jsx(WaveformBars, {}), _jsx("span", { style: labelStyle, children: "Listening\u2026" })] })), status === 'responding' && (_jsxs(_Fragment, { children: [_jsx(SpeakingPulse, {}), _jsx("span", { style: labelStyle, children: "Rayan is speaking\u2026" })] })), status === 'error' && (_jsx("span", { style: { ...labelStyle, color: colors.error }, children: "Voice error. Try again." }))] }));
}
// ── Sub-components ────────────────────────────────────────────────────────────
function WaveformBars() {
    const BAR_COUNT = 7;
    return (_jsx("div", { style: waveformContainerStyle, "aria-hidden": "true", children: Array.from({ length: BAR_COUNT }, (_, i) => (_jsx("div", { style: {
                ...barStyle,
                animationDelay: `${(i * 0.12).toFixed(2)}s`,
            } }, i))) }));
}
function SpinnerRing() {
    return (_jsxs("svg", { width: "28", height: "28", viewBox: "0 0 28 28", "aria-hidden": "true", style: { flexShrink: 0 }, children: [_jsx("circle", { cx: "14", cy: "14", r: "11", fill: "none", stroke: "rgba(99,102,241,0.3)", strokeWidth: "2.5" }), _jsx("path", { d: "M14 3 A11 11 0 0 1 25 14", fill: "none", stroke: "#6366f1", strokeWidth: "2.5", strokeLinecap: "round", children: _jsx("animateTransform", { attributeName: "transform", type: "rotate", from: "0 14 14", to: "360 14 14", dur: "0.85s", repeatCount: "indefinite" }) })] }));
}
function SpeakingPulse() {
    return (_jsx("div", { style: speakingDotStyle, "aria-hidden": "true", children: _jsx("div", { style: innerDotStyle }) }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const containerStyle = {
    position: 'fixed',
    bottom: 88,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: colors.glass,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${colors.border}`,
    borderRadius: radii.pill,
    padding: '8px 18px',
    pointerEvents: 'none',
    zIndex: zIndex.voiceIndicator,
    boxShadow: shadows.sm,
};
const labelStyle = {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 500,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
};
const waveformContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    height: 28,
};
const barStyle = {
    width: 3,
    height: 6,
    borderRadius: radii.sm,
    background: colors.errorSolid,
    animation: 'voice-bar 0.9s ease-in-out infinite',
};
const speakingDotStyle = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: colors.successMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'voice-pulse 1.4s ease-in-out infinite',
};
const innerDotStyle = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: colors.success,
};
