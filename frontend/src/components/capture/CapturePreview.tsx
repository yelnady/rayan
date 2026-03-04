import { useEffect, useRef } from 'react';
import { useCaptureStore } from '../../stores/captureStore';
import { colors, radii, shadows, zIndex } from '../../config/tokens';

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
        <div
            style={{
                position: 'fixed',
                bottom: 120,
                right: 24,
                width: 240,
                aspectRatio: '16/9',
                borderRadius: radii.lg,
                overflow: 'hidden',
                boxShadow: shadows.lg,
                border: `2px solid ${colors.primaryBorder}`,
                backgroundColor: colors.surface,
                zIndex: zIndex.hud,
                animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: sourceType === 'webcam' ? 'cover' : 'contain',
                    transform: sourceType === 'webcam' ? 'scaleX(-1)' : 'none',
                    backgroundColor: colors.surface,
                }}
            />

            {/* Recording Indicator */}
            <div
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: radii.pill,
                    backgroundColor: colors.errorSolid,
                    boxShadow: colors.errorGlow,
                    animation: 'pulse-opacity 1.5s ease-in-out infinite',
                }}
            />
        </div>
    );
}
