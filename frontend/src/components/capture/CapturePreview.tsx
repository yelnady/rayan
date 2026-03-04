import { useEffect, useRef } from 'react';
import { useCaptureStore } from '../../stores/captureStore';

export function CapturePreview() {
    const stream = useCaptureStore((s) => s.activeStream);
    const status = useCaptureStore((s) => s.status);
    const sourceType = useCaptureStore((s) => s.sourceType);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream || status !== 'capturing') {
        return null;
    }

    return (
        <div className="fixed bottom-[120px] right-6 w-[240px] aspect-video rounded-2xl overflow-hidden shadow-lg border-2 border-primary-border bg-surface z-hud animate-[scaleIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full bg-surface ${sourceType === 'webcam' ? 'object-cover -scale-x-100' : 'object-contain'}`}
            />

            {/* Recording Indicator */}
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error-solid shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-[pulse-opacity_1.5s_ease-in-out_infinite]" />
        </div>
    );
}
