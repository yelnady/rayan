import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useCaptureStore } from '../../stores/captureStore';
let nextId = 0;
export function ConceptToast() {
    const concepts = useCaptureStore((s) => s.concepts);
    const [toasts, setToasts] = useState([]);
    const prevLenRef = useRef(0);
    // Show a new toast whenever a concept is added
    useEffect(() => {
        if (concepts.length <= prevLenRef.current)
            return;
        const latest = concepts[concepts.length - 1];
        prevLenRef.current = concepts.length;
        const id = nextId++;
        setToasts((prev) => [...prev, { id, concept: latest.concept, confidence: latest.confidence }]);
        const timer = setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
        return () => clearTimeout(timer);
    }, [concepts]);
    if (toasts.length === 0)
        return null;
    return (_jsx("div", { style: {
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 1100,
            pointerEvents: 'none',
        }, children: toasts.map((t) => (_jsxs("div", { style: {
                background: 'rgba(25,118,210,0.92)',
                color: '#fff',
                borderRadius: 20,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 600,
                backdropFilter: 'blur(6px)',
                animation: 'fadeInUp 0.3s ease',
            }, children: ["\u2713 ", t.concept, ' ', _jsxs("span", { style: { opacity: 0.7, fontWeight: 400 }, children: ["(", Math.round(t.confidence * 100), "%)"] })] }, t.id))) }));
}
