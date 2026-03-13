import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePalaceStore } from '../../stores/palaceStore';
import { cameraSync } from './CameraSync';
import { artifactCenters } from './artifactCenters';

// Mirrors TYPE_COLORS in Artifact.tsx — keyed by artifact.visual
const VISUAL_COLORS: Record<string, string> = {
  floating_book:  '#60A8FF',
  hologram_frame: '#9B6FFF',
  framed_image:   '#FF8C60',
  speech_bubble:  '#60C8A0',
  crystal_orb:    '#FF60B8',
  synthesis_map:  '#FFD700',
  lesson:         '#7EC8E3',
  brain:          '#C084FC',
  question:       '#FCD34D',
  coffee:         '#D97706',
  milestone:      '#34D399',
  heart:          '#F87171',
  dream:          '#A78BFA',
  tree:           '#4ADE80',
  opinion:        '#FB923C',
  headphones:     '#38BDF8',
  cash_stack:     '#FBBF24',
};

const _v = new THREE.Vector3();

function projectToScreen(wx: number, wy: number, wz: number): [number, number] | null {
  const { camera, leftOffset } = cameraSync;
  if (!camera) return null;
  _v.set(wx, wy, wz).project(camera);
  // z > 1 means the point is behind the camera
  if (_v.z > 1) return null;
  const canvasW = window.innerWidth - leftOffset;
  return [
    leftOffset + (_v.x * 0.5 + 0.5) * canvasW,
    (-_v.y * 0.5 + 0.5) * window.innerHeight,
  ];
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  ctrl: [number, number],
  to: [number, number],
  color: string,
  opacity: number,
  isExplicit: boolean,
) {
  const alpha = opacity * (isExplicit ? 1 : 0.4);

  // Outer glow pass
  ctx.save();
  ctx.globalAlpha = alpha * 0.30;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.quadraticCurveTo(ctrl[0], ctrl[1], to[0], to[1]);
  ctx.stroke();
  ctx.restore();

  // Core line
  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.quadraticCurveTo(ctrl[0], ctrl[1], to[0], to[1]);
  ctx.stroke();
  ctx.restore();

  // Endpoint dot at target
  ctx.save();
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(to[0], to[1], 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function ArtifactConnectionLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const opacityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

      const { hoveredArtifactId, artifacts, currentRoomId, rooms } = usePalaceStore.getState();
      const hasHover = !!hoveredArtifactId && !!currentRoomId;

      // Animate opacity in/out
      const target = hasHover ? 1 : 0;
      opacityRef.current += (target - opacityRef.current) * 0.10;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (opacityRef.current < 0.01) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const roomArtifacts = artifacts[currentRoomId!] ?? [];
      const hovered = roomArtifacts.find(a => a.id === hoveredArtifactId);
      if (!hovered) { rafRef.current = requestAnimationFrame(tick); return; }

      const room = rooms.find(r => r.id === currentRoomId);
      if (!room) { rafRef.current = requestAnimationFrame(tick); return; }

      const ox = room.position.x, oy = room.position.y, oz = room.position.z;
      const rw = room.dimensions.w, rd = room.dimensions.d;
      const roomCx = ox + rw / 2, roomCz = oz + rd / 2;

      // Prefer the bounding-box center registered by the artifact's own renderer
      // (accurate for every GLB model regardless of its internal origin/scale).
      // Fall back to a manually-offset estimate only when not yet computed.
      const WALL_DEPTH: Partial<Record<string, number>> = {
        floating_book: 0.25,
        crystal_orb:   0.15,
      };
      const DEFAULT_DEPTH = 0.1;

      const worldOf = (a: typeof hovered): [number, number, number] => {
        const center = artifactCenters.get(a.id);
        if (center) return [center.x, center.y, center.z];

        // Fallback: push the mount point away from the wall by an estimated depth
        const depth = WALL_DEPTH[a.visual] ?? DEFAULT_DEPTH;
        let dx = 0, dz = 0;
        const wall = a.wall ?? (a.position.x < 0.2 ? 'west' : a.position.x > rw - 0.2 ? 'east' : a.position.z > rd - 0.2 ? 'south' : a.position.z < 0.2 ? 'north' : null);
        if (wall === 'west')  dx = +depth;
        else if (wall === 'east')  dx = -depth;
        else if (wall === 'south') dz = -depth;
        else if (wall === 'north') dz = +depth;
        return [
          ox + a.position.x + dx,
          oy + (a.position.y > 0 ? a.position.y : 1.3),
          oz + a.position.z + dz,
        ];
      };

      const fromWorld = worldOf(hovered);
      const fromScreen = projectToScreen(...fromWorld);
      if (!fromScreen) { rafRef.current = requestAnimationFrame(tick); return; }

      const color = VISUAL_COLORS[hovered.visual] ?? '#60A8FF';

      // Determine which artifacts to connect to
      const explicitIds = new Set(hovered.relatedArtifacts ?? []);
      const hasExplicit = explicitIds.size > 0;

      const targets = hasExplicit
        ? roomArtifacts.filter(a => explicitIds.has(a.id) && a.id !== hovered.id)
        : roomArtifacts
            .filter(a => a.id !== hovered.id)
            .sort((a, b) => {
              const da = Math.hypot(a.position.x - hovered.position.x, a.position.z - hovered.position.z);
              const db = Math.hypot(b.position.x - hovered.position.x, b.position.z - hovered.position.z);
              return da - db;
            })
            .slice(0, 2);

      for (const rel of targets) {
        const toWorld = worldOf(rel);
        const toScreen = projectToScreen(...toWorld);
        if (!toScreen) continue;

        // Bezier control point: midpoint raised upward, pulled slightly toward room center
        const ctrlWx = ((fromWorld[0] + toWorld[0]) / 2) + (roomCx - (fromWorld[0] + toWorld[0]) / 2) * 0.2;
        const ctrlWy = Math.max(fromWorld[1], toWorld[1]) + 1.5;
        const ctrlWz = ((fromWorld[2] + toWorld[2]) / 2) + (roomCz - (fromWorld[2] + toWorld[2]) / 2) * 0.2;
        const ctrlScreen = projectToScreen(ctrlWx, ctrlWy, ctrlWz);
        if (!ctrlScreen) continue;

        drawConnection(ctx, fromScreen, ctrlScreen, toScreen, color, opacityRef.current, hasExplicit);
      }

      // Source dot (brightest)
      ctx.save();
      ctx.globalAlpha = opacityRef.current * 0.90;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(fromScreen[0], fromScreen[1], 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2 }}
    />
  );
}
