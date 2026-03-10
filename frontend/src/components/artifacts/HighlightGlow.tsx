import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HighlightGlowProps {
  color: string;
  position?: [number, number, number];
}

/**
 * Pulsing glow beacon rendered at the given position (defaults to [0,0,0]).
 * Renders a translucent expanding/contracting sphere + a point light.
 * Intended to be mounted when `highlighted` is true — unmounted after timeout.
 */
export function HighlightGlow({ color, position = [0, 0, 0] }: HighlightGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.75 + Math.sin(t * 3.5) * 0.25;
    if (meshRef.current) meshRef.current.scale.setScalar(pulse);
    if (lightRef.current) lightRef.current.intensity = 1.8 + Math.sin(t * 3.5) * 1.0;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.65, 12, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} side={THREE.FrontSide} />
      </mesh>
      <pointLight ref={lightRef} color={color} intensity={2} distance={4} decay={2} />
    </group>
  );
}
