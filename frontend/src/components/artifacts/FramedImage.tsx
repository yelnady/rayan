import { useRef } from 'react';
import { gsap } from 'gsap';
import type { Group } from 'three';

interface FramedImageProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  thumbnailUrl?: string;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const IMG_W = 0.7;
const IMG_H = 0.5;
const BORDER = 0.05;

export function FramedImage({
  position,
  rotation = [0, 0, 0],
  color = '#C8A96E',
  onClick,
  onHover,
}: FramedImageProps) {
  const groupRef = useRef<Group>(null);

  function handlePointerOver() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.2 });
    onHover?.(true);
  }

  function handlePointerOut() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
    onHover?.(false);
  }

  return (
    <group position={position} rotation={rotation}>
      <group ref={groupRef}>
        {/* Outer frame */}
        <mesh>
          <boxGeometry args={[IMG_W + BORDER * 2, IMG_H + BORDER * 2, 0.04]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
        </mesh>

        {/* Inner matte */}
        <mesh position={[0, 0, 0.021]}>
          <boxGeometry args={[IMG_W + BORDER * 0.6, IMG_H + BORDER * 0.6, 0.005]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.9} />
        </mesh>

        {/* Image surface (solid color placeholder for when no texture) */}
        <mesh
          position={[0, 0, 0.027]}
          onClick={onClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[IMG_W, IMG_H]} />
          <meshStandardMaterial color="#8BA8C8" roughness={0.8} />
        </mesh>

        {/* Subtle highlight on frame top edge */}
        <mesh position={[0, (IMG_H + BORDER * 2) / 2 - 0.005, 0.02]}>
          <boxGeometry args={[IMG_W + BORDER * 2, 0.01, 0.001]} />
          <meshBasicMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>

        {/* Wall mount shadow */}
        <mesh position={[0, 0, -0.021]}>
          <planeGeometry args={[IMG_W + BORDER * 2 + 0.04, IMG_H + BORDER * 2 + 0.04]} />
          <meshBasicMaterial color="#000000" opacity={0.15} transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
