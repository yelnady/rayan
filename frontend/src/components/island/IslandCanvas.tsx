import { useEffect, useRef } from 'react';
import { useTransformContext } from 'react-zoom-pan-pinch';
import { usePalaceStore } from '../../stores/palaceStore';

// We scale the 3D '1 unit' to 150px layout space
export const MAP_SCALE = 150;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
}

export function IslandCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rooms = usePalaceStore((s) => s.rooms);
    // Get the current zoom/pan state from react-zoom-pan-pinch to align the canvas
    const transform = useTransformContext();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        // Handle high-DPI scaling
        const updateCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        // Initialize particles
        const particles: Particle[] = Array.from({ length: 150 }).map(() => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.2, // very slow drift
            vy: (Math.random() - 0.5) * 0.2,
            size: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.5 + 0.1,
        }));

        const render = () => {
            // Clear screen
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw particle starfield (static to viewport)
            ctx.fillStyle = '#ffffff';
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = window.innerWidth;
                if (p.x > window.innerWidth) p.x = 0;
                if (p.y < 0) p.y = window.innerHeight;
                if (p.y > window.innerHeight) p.y = 0;

                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            // Apply pan and zoom transform exactly as react-zoom-pan-pinch does to the wrapper
            ctx.save();
            const state = transform.transformState;
            // Note: context state translation
            ctx.translate(state.positionX, state.positionY);
            ctx.scale(state.scale, state.scale);

            // Draw connection lines between rooms
            // Get all unique pairs based on room.connections
            const connectionsDrawn = new Set<string>();

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#60a5fa'; // tailwind blue-400
            ctx.shadowColor = '#3b82f6'; // tailwind blue-500
            ctx.shadowBlur = 15;
            ctx.lineCap = 'round';

            rooms.forEach((room) => {
                room.connections?.forEach((targetId) => {
                    const pairKey = [room.id, targetId].sort().join('-');
                    if (connectionsDrawn.has(pairKey)) return;
                    connectionsDrawn.add(pairKey);

                    const target = rooms.find((r) => r.id === targetId);
                    if (!target) return;

                    // Our top-down 2D coords map `x` to `x`, and `z` to `y` 
                    // Center of the wrapper is assumed to be `0,0` for the nodes.
                    // Wait, react-zoom-pan-pinch wrapper origin is top left.
                    const WORLD_CENTER = 2500;

                    const startX = WORLD_CENTER + room.position.x * MAP_SCALE;
                    const startY = WORLD_CENTER + room.position.z * MAP_SCALE; // z is depth in 3D -> Y in 2D

                    const endX = WORLD_CENTER + target.position.x * MAP_SCALE;
                    const endY = WORLD_CENTER + target.position.z * MAP_SCALE;

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);

                    // Add a subtle curve to the line
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;
                    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                    // Control point offset perpendicular to the line
                    const angle = Math.atan2(endY - startY, endX - startX);
                    const cpX = midX + Math.cos(angle + Math.PI / 2) * (dist * 0.2);
                    const cpY = midY + Math.sin(angle + Math.PI / 2) * (dist * 0.2);

                    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
                    ctx.stroke();

                    // Draw multiple strokes for intense glow
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#ffffff';
                    ctx.shadowBlur = 5;
                    ctx.stroke();

                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#60a5fa';
                    ctx.shadowBlur = 20;
                    ctx.stroke();
                });
            });

            ctx.restore();

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [rooms, transform.transformState]); // re-run if rooms or transform completely changes ref context, though state mutation should be polled if it doesn't trigger effect

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            // Style ensures it sits exactly behind everything
            style={{ zIndex: 0 }}
        />
    );
}
