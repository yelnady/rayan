import { memo, useRef, useEffect } from 'react';
import { Detailed } from '@react-three/drei';
import { gsap } from 'gsap';
import type { Group } from 'three';

interface FloatingBookProps {
  position: [number, number, number];
  color?: string;
  hovered?: boolean;
  onClick?: () => void;
}

const BOOK_W = 0.65;
const BOOK_H = 0.9;
const BOOK_D = 0.18;

export const FloatingBook = memo(function FloatingBook({
  position,
  color = '#4A90D9',
  hovered = false,
  onClick,
}: FloatingBookProps) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: hovered ? 1.2 : 1, y: hovered ? 1.2 : 1, z: hovered ? 1.2 : 1, duration: 0.2 });
  }, [hovered]);

  return (
    // T155: LOD — full detail < 8 units, simplified 8–20 units, hidden > 20 units
    <Detailed distances={[0, 8, 20]} position={position}>
      {/* LOD 0: Full detail — book body + spine + glow (within 8 units) */}
      <group ref={groupRef}>
        <mesh
          castShadow
          onClick={onClick}
        >
          <boxGeometry args={[BOOK_W, BOOK_H, BOOK_D]} />
          <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
        </mesh>

        {/* Spine highlight */}
        <mesh position={[-BOOK_W / 2 + 0.005, 0, 0]}>
          <boxGeometry args={[0.01, BOOK_H, BOOK_D]} />
          <meshStandardMaterial color="#ffffff" opacity={0.25} transparent />
        </mesh>

        {/* Glow halo */}
        <pointLight color={color} intensity={0.4} distance={1.2} decay={2} />
      </group>

      {/* LOD 1: Mid-range — book body only, no spine/light (8–20 units) */}
      <group>
        <mesh castShadow onClick={onClick}>
          <boxGeometry args={[BOOK_W, BOOK_H, BOOK_D]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>

      {/* LOD 2: Far — invisible placeholder (> 20 units) */}
      <group />
    </Detailed>
  );
});
