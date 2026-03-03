import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCaptureStore } from '../../stores/captureStore';
export function CaptureOverlay() {
    const status = useCaptureStore((s) => s.status);
    const concepts = useCaptureStore((s) => s.concepts);
    if (status === 'idle')
        return null;
    const statusLabel = {
        capturing: '● Recording',
        processing: '⏳ Processing…',
        complete: '✓ Done',
        error: '✗ Error',
    };
    return (_jsxs("div", { style: {
            position: 'fixed',
            top: 16,
            right: 16,
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 16px',
            minWidth: 220,
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
        }, children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 8 }, children: statusLabel[status] ?? status }), concepts.length > 0 && (_jsxs("div", { style: { fontSize: 12, opacity: 0.85 }, children: [concepts.length, " concept", concepts.length !== 1 ? 's' : '', " captured"] }))] }));
}
