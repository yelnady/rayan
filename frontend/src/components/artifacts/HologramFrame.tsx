import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Detailed } from '@react-three/drei';
import { gsap } from 'gsap';
import type { Group, Mesh } from 'three';

interface HologramFrameProps {
  position: [number, number, number];
  color?: string;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const FRAME_W = 0.6;
const FRAME_H = 0.4;
const FRAME_DEPTH = 0.02;
const BORDER = 0.04;
const PULSE_SPEED = 1.8;

export const HologramFrame = memo(function HologramFrame({
  position,
  color = '#00BFFF',
  onClick,
  onHover,
}: HologramFrameProps) {
  const groupRef = useRef<Group>(null);
  const screenRef = useRef<Mesh>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!screenRef.current) return;
    timeRef.current += delta * PULSE_SPEED;

    // Screen flicker opacity
    const mat = screenRef.current.material as { opacity: number };
    mat.opacity = 0.55 + Math.sin(timeRef.current * 3.1) * 0.12;
  });

  function handlePointerOver() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.2 });
    onHover?.(true);
  }

  function handlePointerOut() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
    onHover?.(false);
  }

  return (
    // T155: LOD — full detail < 12 units, flat plane 12–28 units, hidden > 28 units
    <Detailed distances={[0, 12, 28]} position={position}>
      {/* LOD 0: Full detail — 4 border bars + screen + scanline + light (within 12 units) */}
      <group ref={groupRef}>
        {/* Top bar */}
        <mesh position={[0, FRAME_H / 2 + BORDER / 2, 0]}>
          <boxGeometry args={[FRAME_W + BORDER * 2, BORDER, FRAME_DEPTH]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        {/* Bottom bar */}
        <mesh position={[0, -(FRAME_H / 2 + BORDER / 2), 0]}>
          <boxGeometry args={[FRAME_W + BORDER * 2, BORDER, FRAME_DEPTH]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        {/* Left bar */}
        <mesh position={[-(FRAME_W / 2 + BORDER / 2), 0, 0]}>
          <boxGeometry args={[BORDER, FRAME_H, FRAME_DEPTH]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        {/* Right bar */}
        <mesh position={[(FRAME_W / 2 + BORDER / 2), 0, 0]}>
          <boxGeometry args={[BORDER, FRAME_H, FRAME_DEPTH]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>

        {/* Holographic screen */}
        <mesh
          ref={screenRef}
          onClick={onClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[FRAME_W, FRAME_H]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            opacity={0.55}
            transparent
            depthWrite={false}
          />
        </mesh>

        {/* Scanline overlay */}
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[FRAME_W, FRAME_H]} />
          <meshBasicMaterial
            color="#000000"
            opacity={0.08}
            transparent
            depthWrite={false}
          />
        </mesh>

        <pointLight color={color} intensity={0.5} distance={1.5} decay={2} />
      </group>

      {/* LOD 1: Mid-range — single emissive plane only (12–28 units) */}
      <group>
        <mesh onClick={onClick}>
          <planeGeometry args={[FRAME_W + BORDER * 2, FRAME_H + BORDER * 2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.4}
            opacity={0.6}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* LOD 2: Far — invisible placeholder (> 28 units) */}
      <group />
    </Detailed>
  );
});
