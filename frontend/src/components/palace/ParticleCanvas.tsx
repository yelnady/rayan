import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  radius: number;
  alpha: number;
  alphaSpeed: number;
}

const COUNT = 90;

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vy: -(0.08 + Math.random() * 0.22),
      vx: (Math.random() - 0.5) * 0.1,
      radius: 0.7 + Math.random() * 1.3,
      alpha: Math.random(),
      alphaSpeed: 0.003 + Math.random() * 0.004,
    }));

    let raf: number;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        p.alpha += p.alphaSpeed;
        if (p.alpha >= 1) { p.alpha = 1; p.alphaSpeed = -Math.abs(p.alphaSpeed); }
        if (p.alpha <= 0) { p.alpha = 0; p.alphaSpeed =  Math.abs(p.alphaSpeed); }
        if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }

        // Soft glow: draw a larger blurred halo then the bright core
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glow.addColorStop(0, `rgba(200, 180, 255, ${p.alpha * 0.45})`);
        glow.addColorStop(1, 'rgba(200, 180, 255, 0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 220, 255, ${p.alpha * 0.8})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
