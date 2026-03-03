import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useVoiceStore } from '../../stores/voiceStore';
export function VoiceIndicator() {
    const status = useVoiceStore((s) => s.status);
    if (status === 'idle')
        return null;
    return (_jsxs("div", { id: "voice-indicator", style: containerStyle, role: "status", "aria-live": "polite", children: [status === 'listening' && (_jsxs(_Fragment, { children: [_jsx(WaveformBars, {}), _jsx("span", { style: labelStyle, children: "Listening\u2026" })] })), status === 'processing' && (_jsxs(_Fragment, { children: [_jsx(SpinnerRing, {}), _jsx("span", { style: labelStyle, children: "Thinking\u2026" })] })), status === 'responding' && (_jsxs(_Fragment, { children: [_jsx(SpeakingPulse, {}), _jsx("span", { style: labelStyle, children: "Rayan is speaking\u2026" })] })), status === 'error' && (_jsx("span", { style: { ...labelStyle, color: '#f87171' }, children: "Voice error. Try again." }))] }));
}
// ── Sub-components ────────────────────────────────────────────────────────────
function WaveformBars() {
    const BAR_COUNT = 7;
    return (_jsxs("div", { style: waveformContainerStyle, "aria-hidden": "true", children: [Array.from({ length: BAR_COUNT }, (_, i) => (_jsx("div", { style: {
                    ...barStyle,
                    animationDelay: `${(i * 0.12).toFixed(2)}s`,
                } }, i))), _jsx("style", { children: `
        @keyframes voice-bar {
          0%, 100% { height: 6px; opacity: 0.5; }
          50% { height: 22px; opacity: 1; }
        }
        @keyframes voice-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(239,68,68,0.3), 0 0 0 12px rgba(239,68,68,0.1); }
          50% { box-shadow: 0 0 0 10px rgba(239,68,68,0.2), 0 0 0 20px rgba(239,68,68,0.05); }
        }
      ` })] }));
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
    background: 'rgba(15,15,20,0.75)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '8px 18px',
    pointerEvents: 'none',
    zIndex: 200,
};
const labelStyle = {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: 'Inter, system-ui, sans-serif',
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
    borderRadius: 3,
    background: '#ef4444',
    animation: 'voice-bar 0.9s ease-in-out infinite',
};
const speakingDotStyle = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(34,197,94,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'voice-pulse 1.4s ease-in-out infinite',
};
const innerDotStyle = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#22c55e',
};
