import { useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import type { Room } from '../../types/palace';
import { getIsoTheme } from './isoThemes';
import { IsoRoomLabel } from './IsoRoomLabel';
import { PLATFORM_W, PLATFORM_D, PLATFORM_H } from './isoLayout';

interface IsoPlatformProps {
  room: Room;
  artifactCount: number;
  cx: number;
  cy: number;
  cz: number;
  index: number;
  isSelected: boolean;
  onClick: (room: Room) => void;
}

/**
 * Three-face CSS box representing one room platform.
 *
 * Three faces: top (horizontal), south (front-bottom), east (right-bottom).
 * Each face uses layered gradients for depth — light source from upper-left.
 */
export function IsoPlatform({ room, artifactCount, cx, cy, cz, isSelected, onClick }: IsoPlatformProps) {
  const theme = getIsoTheme(room.style);
  const containerRef = useRef<HTMLDivElement>(null);
  const floatTween = useRef<gsap.core.Tween | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!containerRef.current) return;
    floatTween.current?.kill();
    floatTween.current = gsap.to(containerRef.current, {
      y: -10,
      duration: 0.3,
      ease: 'power2.out',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!containerRef.current) return;
    floatTween.current?.kill();
    floatTween.current = gsap.to(containerRef.current, {
      y: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.6)',
    });
  }, []);

  const handleClick = useCallback(() => {
    if (!containerRef.current) return;
    floatTween.current?.kill();
    gsap.timeline()
      .to(containerRef.current, { y: 4, duration: 0.1, ease: 'power2.in' })
      .to(containerRef.current, { y: 0, duration: 0.2, ease: 'power2.out', onComplete: () => onClick(room) });
  }, [onClick, room]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        width: PLATFORM_W,
        height: PLATFORM_D,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${cx - PLATFORM_W / 2}px, ${cy - PLATFORM_D / 2}px, ${cz}px)`,
        cursor: 'pointer',
        willChange: 'transform',
      }}
    >
      {/* Drop shadow beneath the block */}
      <div
        style={{
          position: 'absolute',
          width: 130,
          height: 70,
          left: (PLATFORM_W - 130) / 2,
          top: (PLATFORM_D - 70) / 2,
          transform: 'rotateX(90deg) translateZ(-14px)',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Top face ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 6,
          background: [
            // Highlight shimmer top-left to mid
            `linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%)`,
            // Slight dark vignette on far edges
            `radial-gradient(ellipse at 70% 70%, rgba(0,0,0,0.08) 0%, transparent 65%)`,
            theme.topColor,
          ].join(', '),
          border: `1px solid rgba(255,255,255,0.6)`,
          // Outer glow/shadow from theme colour
          boxShadow: `0 0 0 1px rgba(0,0,0,0.08), 0 4px 18px ${theme.shadowColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
        }}
      >
        {/* Top-left edge highlight (simulates light catching the rim) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: '6px 6px 0 0',
            background: 'rgba(255,255,255,0.7)',
            pointerEvents: 'none',
          }}
        />

        {/* Theme icon top-left */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 10,
            fontSize: 16,
            opacity: 0.45,
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {theme.icon}
        </div>

        <IsoRoomLabel
          name={room.name}
          artifactCount={artifactCount}
          topColor={theme.topColor}
        />
      </div>

      {/* Selected ring over top face */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: 2,
            borderRadius: 5,
            border: `2px solid ${theme.sideColor}`,
            boxShadow: `0 0 0 4px ${theme.glowColor}, inset 0 0 8px ${theme.glowColor}`,
            pointerEvents: 'none',
            animation: 'selected-pulse 1.8s ease-in-out infinite',
          }}
        />
      )}

      {/* ── South face (front-bottom) ── */}
      <div
        style={{
          position: 'absolute',
          width: PLATFORM_W,
          height: PLATFORM_H,
          background: [
            // Lighter stripe at top edge (where top face meets side)
            `linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.1) 100%)`,
            theme.sideColor,
          ].join(', '),
          borderLeft: `1px solid rgba(255,255,255,0.15)`,
          borderRight: `1px solid rgba(0,0,0,0.15)`,
          borderBottom: `1px solid rgba(0,0,0,0.2)`,
          transform: `rotateX(-90deg) translateZ(-${PLATFORM_D / 2}px) translateY(${PLATFORM_H / 2}px)`,
          transformOrigin: '50% 100%',
          top: PLATFORM_D / 2 - PLATFORM_H / 2,
          left: 0,
        }}
      />

      {/* ── East face (right-bottom) ── */}
      <div
        style={{
          position: 'absolute',
          width: PLATFORM_H,
          height: PLATFORM_D,
          background: [
            // Darker — this face is in shadow relative to south
            `linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)`,
            theme.eastColor,
          ].join(', '),
          borderTop: `1px solid rgba(255,255,255,0.08)`,
          borderBottom: `1px solid rgba(0,0,0,0.2)`,
          borderRight: `1px solid rgba(0,0,0,0.15)`,
          transform: `rotateY(90deg) translateZ(-${PLATFORM_W / 2}px) translateX(${PLATFORM_H / 2}px)`,
          transformOrigin: '0% 50%',
          top: 0,
          left: PLATFORM_W / 2 - PLATFORM_H / 2,
        }}
      />
    </div>
  );
}
