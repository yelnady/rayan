import { useEffect, useRef, useState } from 'react';
import { useCaptureStore } from '../../stores/captureStore';
import { colors, fonts, radii } from '../../config/tokens';

interface ToastItem {
  id: number;
  concept: string;
  confidence: number;
}

let nextId = 0;

export function ConceptToast() {
  const concepts = useCaptureStore((s) => s.concepts);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prevLenRef = useRef(0);

  // Show a new toast whenever a concept is added
  useEffect(() => {
    if (concepts.length <= prevLenRef.current) return;
    const latest = concepts[concepts.length - 1];
    prevLenRef.current = concepts.length;

    const id = nextId++;
    setToasts((prev) => [...prev, { id, concept: latest.concept, confidence: latest.confidence }]);

    const timer = setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
    return () => clearTimeout(timer);
  }, [concepts]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1100,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: colors.glass,
            color: colors.white,
            borderRadius: radii.pill,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: fonts.body,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${colors.primaryBorder}`,
            boxShadow: `0 4px 20px ${colors.primaryGlow}`,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          ✓ {t.concept}{' '}
          <span style={{ color: colors.textMuted, fontWeight: 400 }}>
            ({Math.round(t.confidence * 100)}%)
          </span>
        </div>
      ))}
    </div>
  );
}
