import type { CSSProperties } from 'react';

interface IsoStaircaseProps {
  fromCx: number;
  fromCy: number;
  fromCz: number;
  toCx: number;
  toCy: number;
  toCz: number;
}

const STEP_COUNT = 4;

/**
 * Stepped connector for rooms at different elevations.
 * Renders a series of flat steps going from fromCz to toCz.
 */
export function IsoStaircase({ fromCx, fromCy, fromCz, toCx, toCy, toCz }: IsoStaircaseProps) {
  const steps: CSSProperties[] = [];

  for (let i = 0; i < STEP_COUNT; i++) {
    const t = i / STEP_COUNT;
    const t1 = (i + 1) / STEP_COUNT;

    const x = fromCx + (toCx - fromCx) * ((t + t1) / 2);
    const y = fromCy + (toCy - fromCy) * ((t + t1) / 2);
    const z = fromCz + (toCz - fromCz) * ((t + t1) / 2);

    const dx = (toCx - fromCx) / STEP_COUNT;
    const dy = (toCy - fromCy) / STEP_COUNT;
    const segLength = Math.sqrt(dx * dx + dy * dy);
    const angleDeg = Math.atan2(toCy - fromCy, toCx - fromCx) * (180 / Math.PI);

    steps.push({
      position: 'absolute',
      width: segLength + 2,
      height: 8,
      background: `rgba(156,163,175,${0.3 + 0.1 * i})`,
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 2,
      transformStyle: 'preserve-3d',
      transform: `translate3d(${x - (segLength + 2) / 2}px, ${y - 4}px, ${z}px) rotateZ(${angleDeg}deg)`,
      pointerEvents: 'none',
      willChange: 'transform',
    });
  }

  return (
    <>
      {steps.map((style, i) => (
        <div key={i} style={style} />
      ))}
    </>
  );
}
