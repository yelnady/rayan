import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
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
  initialOpen?: boolean;
  highlighted?: boolean;
}

export function Door({ wall, position, targetRoomName, onEnter, initialOpen = false, highlighted = false }: DoorProps) {
  const groupRef = useRef<Group>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [hovered, setHovered] = useState(false);

  // Auto-open the door when highlighted (agent is about to enter)
  useEffect(() => {
    if (highlighted) setIsOpen(true);
  }, [highlighted]);

  // Load the "nano banana" door texture
  const doorTex = useTexture('/textures/door_texture.png');
  const doorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: doorTex,
      roughness: 0.4,
      metalness: 0.1,
    });
  }, [doorTex]);

  const frameMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#3D2B1F', // Darker wood for the frame
      roughness: 0.8,
    });
  }, []);

  const handleMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#D4AF37', // Gold/Brass handle
      metalness: 0.9,
      roughness: 0.1,
    });
  }, []);

  // Smoothly animate door open/close + pulse glow when highlighted
  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const target = isOpen ? OPEN_ANGLE : 0;
    groupRef.current.rotation.y +=
      (target - groupRef.current.rotation.y) * Math.min(1, delta * 6);

    if (highlighted && glowLightRef.current) {
      const t = clock.getElapsedTime();
      glowLightRef.current.intensity = 5 + Math.sin(t * 3.5) * 2.5;
    }
  });

  function handleClick(e: any) {
    if (e) e.stopPropagation();
    onEnter?.();
    setIsOpen((prev) => !prev);
  }

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  let rotation: [number, number, number] = [0, 0, 0];
  switch (wall) {
    case 'north': rotation = [0, 0, 0]; break;
    case 'south': rotation = [0, Math.PI, 0]; break;
    case 'east': rotation = [0, -Math.PI / 2, 0]; break;
    case 'west': rotation = [0, Math.PI / 2, 0]; break;
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Shift entire door left by DOOR_WIDTH/2 so it's centered on position */}
      <group position={[-DOOR_WIDTH / 2, 0, 0]}>
        {/* Door panel — pivot at left edge */}
        <group ref={groupRef}>
          <group position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <mesh castShadow>
              <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.08]} />
              <primitive object={doorMaterial} attach="material" />
            </mesh>

            {/* Brass Handle */}
            <mesh position={[DOOR_WIDTH / 2 - 0.2, 0, 0.06]} castShadow>
              <sphereGeometry args={[0.06, 16, 16]} />
              <primitive object={handleMaterial} attach="material" />
            </mesh>
          </group>
        </group>

        {/* Door frame */}
        <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, -0.04]}>
          <boxGeometry args={[DOOR_WIDTH + 0.1, DOOR_HEIGHT + 0.1, 0.1]} />
          <primitive object={frameMaterial} attach="material" />
        </mesh>

        {/* Room label above door */}
        {targetRoomName && (
          <Text
            position={[DOOR_WIDTH / 2, DOOR_HEIGHT + 0.35, 0.05]}
            fontSize={0.2}
            color={hovered ? '#D4AF37' : '#C1AA9A'}
            anchorX="center"
            anchorY="bottom"
          >
            {targetRoomName}
          </Text>
        )}

        {/* Highlight glow: golden pulsing light + emissive overlay around the frame */}
        {highlighted && (
          <>
            <pointLight
              ref={glowLightRef}
              position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0.6]}
              color="#D4AF37"
              intensity={5}
              distance={7}
              decay={2}
            />
            {/* Golden shimmer overlay on the frame */}
            <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0.06]}>
              <boxGeometry args={[DOOR_WIDTH + 0.3, DOOR_HEIGHT + 0.3, 0.02]} />
              <meshBasicMaterial color="#D4AF37" transparent opacity={0.2} depthWrite={false} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}
