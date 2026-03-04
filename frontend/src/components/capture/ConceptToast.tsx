import { useEffect, useRef, useState } from 'react';
import { useCaptureStore } from '../../stores/captureStore';

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
    <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 flex flex-col gap-2 z-toast pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-glass text-text-primary rounded-full px-5 py-2 text-sm font-semibold font-body backdrop-blur-md border border-primary-border shadow-[0_4px_20px_rgba(251,191,36,0.3)] animate-[fadeInUp_0.3s_ease]"
        >
          ✓ {t.concept}{' '}
          <span className="text-text-muted font-normal">
            ({Math.round(t.confidence * 100)}%)
          </span>
        </div>
      ))}
    </div>
  );
}
