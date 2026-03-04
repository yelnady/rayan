
interface IsoBridgeProps {
  fromCx: number;
  fromCy: number;
  fromCz: number;
  toCx: number;
  toCy: number;
  toCz: number;
}

/**
 * Thin connector strip between two platforms at the same elevation.
 * Renders as a narrow rectangle positioned and rotated between the two centres.
 */
export function IsoBridge({ fromCx, fromCy, fromCz, toCx, toCy, toCz }: IsoBridgeProps) {
  const midCx = (fromCx + toCx) / 2;
  const midCy = (fromCy + toCy) / 2;
  const midCz = (fromCz + toCz) / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Angle of the connector in the XY plane
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  if (length < 1) return null;

  return (
    <div
      style={{
        position: 'absolute',
        width: length,
        height: 8,
        background: 'rgba(156,163,175,0.5)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 4,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${midCx - length / 2}px, ${midCy - 4}px, ${midCz}px) rotateZ(${angleDeg}deg)`,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    />
  );
}
