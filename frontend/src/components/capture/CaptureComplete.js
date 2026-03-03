import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCaptureStore } from '../../stores/captureStore';
export function CaptureComplete({ onClose }) {
    const summary = useCaptureStore((s) => s.summary);
    const status = useCaptureStore((s) => s.status);
    if (status !== 'complete' || !summary)
        return null;
    return (_jsx("div", { style: {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
        }, onClick: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { style: {
                background: '#1e1e2e',
                borderRadius: 16,
                padding: '32px 40px',
                color: '#fff',
                minWidth: 360,
                maxWidth: 480,
            }, children: [_jsx("h2", { style: { margin: '0 0 20px', fontSize: 22 }, children: "Capture Complete \u2713" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }, children: [_jsx(Stat, { label: "Concepts captured", value: summary.conceptCount }), _jsx(Stat, { label: "Artifacts created", value: summary.artifactsCreated.length }), _jsx(Stat, { label: "Rooms affected", value: summary.roomsAffected.length }), summary.newRoomsCreated.length > 0 && (_jsx(Stat, { label: "New rooms created", value: summary.newRoomsCreated.length }))] }), _jsx("button", { onClick: onClose, style: {
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 24px',
                        fontSize: 15,
                        cursor: 'pointer',
                        width: '100%',
                    }, children: "View in Palace" })] }) }));
}
function Stat({ label, value }) {
    return (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { style: { opacity: 0.7 }, children: label }), _jsx("span", { style: { fontWeight: 700 }, children: value })] }));
}
