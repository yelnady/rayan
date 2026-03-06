import { useState, useRef, useEffect, useCallback } from 'react';
import { useCameraStore } from '../../stores/cameraStore';

export function Joystick() {
    const setMobileMovement = useCameraStore((s) => s.setMobileMovement);
    const [isDragging, setIsDragging] = useState(false);
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const JOYSTICK_SIZE = 120;
    const HANDLE_SIZE = 50;
    const MAX_DISTANCE = JOYSTICK_SIZE / 2;

    const handleStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        handleMove(e);
    };

    const handleMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const angle = Math.atan2(dy, dx);
        const cappedDistance = Math.min(distance, MAX_DISTANCE);

        const newX = Math.cos(angle) * cappedDistance;
        const newY = Math.sin(angle) * cappedDistance;

        setStickPos({ x: newX, y: newY });

        // Normalize velocity for the store
        // In 3D: -newY is forward/backward (Z), newX is left/right (X)
        setMobileMovement({
            x: newX / MAX_DISTANCE,
            z: -newY / MAX_DISTANCE
        });
    }, [isDragging, MAX_DISTANCE, setMobileMovement]);

    const handleEnd = useCallback(() => {
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
        setMobileMovement({ x: 0, z: 0 });
    }, [setMobileMovement]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('touchend', handleEnd);
            // We use passive: false to prevent scrolling while using the joystick
            const onTouchMove = (e: TouchEvent) => {
                e.preventDefault();
                // @ts-ignore
                handleMove(e);
            };
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            return () => {
                window.removeEventListener('touchend', handleEnd);
                window.removeEventListener('touchmove', onTouchMove);
            };
        }
    }, [isDragging, handleMove, handleEnd]);

    return (
        <div
            className="fixed bottom-32 left-8 z-joystick select-none touch-none"
            style={{ width: JOYSTICK_SIZE, height: JOYSTICK_SIZE }}
        >
            {/* Joystick Base */}
            <div
                ref={containerRef}
                onTouchStart={handleStart}
                className="w-full h-full rounded-full bg-glass backdrop-blur-md border border-[rgba(255,255,255,0.2)] shadow-xl flex items-center justify-center relative overflow-hidden"
            >
                {/* Subtle radial gradient for depth */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />

                {/* Joystick Handle */}
                <div
                    className="rounded-full bg-primary shadow-lg transition-transform duration-75 ease-out"
                    style={{
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        boxShadow: `0 4px 12px rgba(99,102,241,0.4), inset 0 2px 4px rgba(255,255,255,0.3)`
                    }}
                >
                    <div className="w-full h-full rounded-full flex items-center justify-center opacity-40">
                        {/* Optional icon or texture on stick */}
                        <div className="w-4 h-4 rounded-full border border-white" />
                    </div>
                </div>
            </div>
        </div>
    );
}
