import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { Group } from 'three';
import type { WallSide } from '../../types/three';

const DOOR_WIDTH = 1.5;
const DOOR_HEIGHT = 2.5;
const OPEN_ANGLE = -Math.PI / 2;

interface DoorProps {
  wall: WallSide;
  position: [number, number, number];
  targetRoomName?: string;
  onEnter?: () => void;
}

export function Door({ position, targetRoomName, onEnter }: DoorProps) {
  const groupRef = useRef<Group>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Smoothly animate door open/close
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = isOpen ? OPEN_ANGLE : 0;
    groupRef.current.rotation.y +=
      (target - groupRef.current.rotation.y) * Math.min(1, delta * 6);
  });

  function handleClick() {
    setIsOpen((prev) => !prev);
    if (!isOpen) onEnter?.();
  }

  return (
    <group position={position}>
      {/* Door panel — pivot at left edge */}
      <group ref={groupRef}>
        <mesh
          position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.06]} />
          <meshStandardMaterial color={hovered ? '#EAE0D3' : '#D1BFAe'} roughness={0.9} />
        </mesh>
      </group>

      {/* Door frame */}
      <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, -0.04]}>
        <boxGeometry args={[DOOR_WIDTH + 0.1, DOOR_HEIGHT + 0.1, 0.04]} />
        <meshStandardMaterial color="#C1AA9A" roughness={0.8} />
      </mesh>

      {/* Room label above door */}
      {targetRoomName && (
        <Text
          position={[DOOR_WIDTH / 2, DOOR_HEIGHT + 0.25, 0]}
          fontSize={0.18}
          color="#8B7355"
          anchorX="center"
          anchorY="bottom"
        >
          {targetRoomName}
        </Text>
      )}
    </group>
  );
}
