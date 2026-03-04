import { useRef, useCallback, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import type { Room } from '../../types/palace';
import { usePalaceStore } from '../../stores/palaceStore';
import { IsoPlatform } from './IsoPlatform';
import { IsoBridge } from './IsoBridge';
import { IsoStaircase } from './IsoStaircase';
import {
  roomToIsoPosition,
  computeSyntheticElevation,
  computeSceneOffset,
  PLATFORM_W,
  PLATFORM_D,
} from './isoLayout';

interface IsoWorldProps {
  onRoomClick: (room: Room) => void;
  selectedRoomId?: string;
}

// Four cloud ellipses at different positions and drift timings
const CLOUDS = [
  { left: '10%', top: '30%', width: 220, height: 80, delay: 0 },
  { left: '55%', top: '15%', width: 180, height: 65, delay: 3.5 },
  { left: '70%', top: '60%', width: 240, height: 90, delay: 7 },
  { left: '25%', top: '65%', width: 160, height: 60, delay: 11 },
];

/**
 * CSS 3D isometric world scene.
 *
 * Outer div: perspective container
 * Inner div (.scene): rotateX(55deg) rotateZ(-45deg) → isometric projection
 * Children: platforms + connectors at translate3d positions
 */
export function IsoWorld({ onRoomClick, selectedRoomId }: IsoWorldProps) {
  const rooms = usePalaceStore((s) => s.rooms);
  const artifacts = usePalaceStore((s) => s.artifacts);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomInitialized = useRef(false);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  // Precompute stable positions
  const syntheticElevations = computeSyntheticElevation(rooms);
  const { offsetX, offsetY } = computeSceneOffset(rooms, syntheticElevations);

  // Auto-zoom on first load so the whole palace fits the viewport
  useEffect(() => {
    if (zoomInitialized.current || rooms.length === 0) return;
    zoomInitialized.current = true;

    const positions = rooms.map((r) =>
      roomToIsoPosition(r, syntheticElevations.get(r.id) ?? 0),
    );
    const xs = positions.map((p) => p.cx);
    const ys = positions.map((p) => p.cy);
    const spanX = Math.max(...xs) - Math.min(...xs) + PLATFORM_W;
    const spanY = Math.max(...ys) - Math.min(...ys) + PLATFORM_D;

    // Approximate isometric screen footprint after rotateX(55°) rotateZ(-45°)
    const screenW = (spanX + spanY) * 0.707;
    const screenH = screenW * 0.574;

    const fill = 0.78;
    const initial = Math.min(
      (window.innerWidth * fill) / screenW,
      (window.innerHeight * fill) / screenH,
    );
    setZoom(Math.min(2.2, Math.max(0.4, initial)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  const getPos = useCallback(
    (room: Room) => roomToIsoPosition(room, syntheticElevations.get(room.id) ?? 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms],
  );

  // Entrance animation: fade + scale in
  useEffect(() => {
    if (!sceneRef.current) return;
    gsap.fromTo(
      sceneRef.current,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' },
    );
  }, []);

  // Collect all connection pairs (deduplicated)
  const connections: Array<{ fromId: string; toId: string }> = [];
  const seen = new Set<string>();
  for (const room of rooms) {
    for (const connId of room.connections ?? []) {
      const key = [room.id, connId].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        connections.push({ fromId: room.id, toId: connId });
      }
    }
  }

  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return (
    <>
      {/* Dot-grid background — behind the perspective container */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Cloud mist — absolute layer behind perspective, in front of dot grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {CLOUDS.map((cloud, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cloud.left,
              top: cloud.top,
              width: cloud.width,
              height: cloud.height,
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 65%)',
              animation: `cloud-drift ${10 + i * 1.5}s ease-in-out ${cloud.delay}s infinite alternate`,
              borderRadius: '50%',
            }}
          />
        ))}
      </div>

      {/* Perspective container */}
      <div
        onWheel={handleWheel}
        style={{
          position: 'absolute',
          inset: 0,
          perspective: 1200,
          perspectiveOrigin: '50% 40%',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        {/* Isometric scene root */}
        <div
          ref={sceneRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transformStyle: 'preserve-3d',
            transform: `translate(${offsetX}px, ${offsetY}px) rotateX(55deg) rotateZ(-45deg) scale(${zoom})`,
            willChange: 'transform, opacity',
          }}
        >
          {/* Connectors (rendered first so platforms appear on top) */}
          {connections.map(({ fromId, toId }) => {
            const fromRoom = roomMap.get(fromId);
            const toRoom = roomMap.get(toId);
            if (!fromRoom || !toRoom) return null;

            const from = getPos(fromRoom);
            const to = getPos(toRoom);
            const elevDiff = Math.abs(from.cz - to.cz);

            if (elevDiff < 5) {
              return (
                <IsoBridge
                  key={`${fromId}-${toId}`}
                  fromCx={from.cx}
                  fromCy={from.cy}
                  fromCz={from.cz}
                  toCx={to.cx}
                  toCy={to.cy}
                  toCz={to.cz}
                />
              );
            } else {
              return (
                <IsoStaircase
                  key={`${fromId}-${toId}`}
                  fromCx={from.cx}
                  fromCy={from.cy}
                  fromCz={from.cz}
                  toCx={to.cx}
                  toCy={to.cy}
                  toCz={to.cz}
                />
              );
            }
          })}

          {/* Platforms */}
          {rooms.map((room, i) => {
            const { cx, cy, cz } = getPos(room);
            const roomArtifacts = artifacts[room.id] ?? [];
            return (
              <IsoPlatform
                key={room.id}
                room={room}
                artifactCount={room.artifactCount ?? roomArtifacts.length}
                cx={cx}
                cy={cy}
                cz={cz}
                index={i}
                isSelected={room.id === selectedRoomId}
                onClick={onRoomClick}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
