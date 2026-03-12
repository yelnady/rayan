import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { WallSide } from '../../types/three';

interface PortalDoorProps {
  wall: WallSide;
  position: [number, number, number];
  targetRoomName: string;
  onEnter: () => void;
}

const PORTAL_W = 1.4;
const PORTAL_H = 2.4;

// Rotations that face the portal inward per wall (same convention as Door.tsx)
const WALL_ROTATION: Record<WallSide, [number, number, number]> = {
  north: [0, 0,          0],
  south: [0, Math.PI,    0],
  east:  [0, -Math.PI / 2, 0],
  west:  [0,  Math.PI / 2, 0],
};

export function PortalDoor({ wall, position, targetRoomName, onEnter }: PortalDoorProps) {
  const glowRef  = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const rimRef   = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    if (glowRef.current)
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + pulse * 0.16;
    if (rimRef.current)
      (rimRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + pulse * 0.35;
    if (lightRef.current)
      lightRef.current.intensity = 1.8 + pulse * 2.5;
  });

  return (
    <group position={position} rotation={WALL_ROTATION[wall]}>
      {/* Inner glow fill — click target */}
      <mesh
        ref={glowRef}
        position={[0, PORTAL_H / 2, 0.02]}
        onClick={(e) => { e.stopPropagation(); onEnter(); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={()  => { document.body.style.cursor = 'auto'; }}
      >
        <planeGeometry args={[PORTAL_W, PORTAL_H]} />
        <meshBasicMaterial color="#7755ee" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Left post */}
      <mesh position={[-PORTAL_W / 2, PORTAL_H / 2, 0.02]}>
        <boxGeometry args={[0.06, PORTAL_H, 0.06]} />
        <meshBasicMaterial color="#aa88ff" />
      </mesh>

      {/* Right post */}
      <mesh position={[PORTAL_W / 2, PORTAL_H / 2, 0.02]}>
        <boxGeometry args={[0.06, PORTAL_H, 0.06]} />
        <meshBasicMaterial color="#aa88ff" />
      </mesh>

      {/* Arch (torus half-circle) — torus is in XY plane by default */}
      <mesh ref={rimRef} position={[0, PORTAL_H, 0.02]} rotation={[0, 0, 0]}>
        <torusGeometry args={[PORTAL_W / 2, 0.045, 8, 24, Math.PI]} />
        <meshBasicMaterial color="#cc99ff" transparent opacity={0.8} />
      </mesh>

      {/* Pulsing glow light */}
      <pointLight
        ref={lightRef}
        position={[0, PORTAL_H / 2, 0.6]}
        color="#8866ee"
        intensity={2}
        distance={5}
        decay={2}
      />

      {/* Room label — Billboard ensures it always faces the camera */}
      <Billboard position={[0, PORTAL_H + PORTAL_W / 2 + 0.3, 0.1]} follow={true}>
        <Text
          fontSize={0.22}
          color="#e8d8ff"
          anchorX="center"
          anchorY="middle"
          outlineColor="#220044"
          outlineWidth={0.03}
          maxWidth={3}
          textAlign="center"
        >
          {targetRoomName}
        </Text>
      </Billboard>

    </group>
  );
}
