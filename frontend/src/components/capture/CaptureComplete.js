import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCaptureStore } from '../../stores/captureStore';
import { colors, fonts, radii, shadows } from '../../config/tokens';
export function CaptureComplete({ onClose }) {
    const summary = useCaptureStore((s) => s.summary);
    const status = useCaptureStore((s) => s.status);
    if (status !== 'complete' || !summary)
        return null;
    return (_jsx("div", { style: {
            position: 'fixed',
            inset: 0,
            background: colors.overlayLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
        }, onClick: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { style: {
                background: colors.surfaceAlt,
                borderRadius: radii.lg,
                padding: '32px 40px',
                color: colors.white,
                minWidth: 360,
                maxWidth: 480,
                border: `1px solid ${colors.border}`,
                boxShadow: shadows.lg,
                animation: 'scaleIn 0.25s ease',
            }, children: [_jsx("h2", { style: { margin: '0 0 20px', fontSize: 22, fontFamily: fonts.heading }, children: "Capture Complete \u2713" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }, children: [_jsx(Stat, { label: "Concepts captured", value: summary.conceptCount }), _jsx(Stat, { label: "Artifacts created", value: summary.artifactsCreated.length }), _jsx(Stat, { label: "Rooms affected", value: summary.roomsAffected.length }), summary.newRoomsCreated.length > 0 && (_jsx(Stat, { label: "New rooms created", value: summary.newRoomsCreated.length }))] }), _jsx("button", { onClick: onClose, style: {
                        background: colors.primary,
                        color: colors.white,
                        border: 'none',
                        borderRadius: radii.md,
                        padding: '11px 24px',
                        fontSize: 15,
                        fontFamily: fonts.body,
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        boxShadow: `0 4px 16px ${colors.primaryGlow}`,
                    }, children: "View in Palace" })] }) }));
}
function Stat({ label, value }) {
    return (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontFamily: fonts.body }, children: [_jsx("span", { style: { color: colors.textSecondary }, children: label }), _jsx("span", { style: { fontWeight: 700, color: colors.white }, children: value })] }));
}
