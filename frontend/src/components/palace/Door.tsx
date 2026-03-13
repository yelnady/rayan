import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Text } from '@react-three/drei';
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
  onContextMenu?: (screenX: number, screenY: number) => void;
  initialOpen?: boolean;
  highlighted?: boolean;
}

export function Door({ wall, position, targetRoomName, onEnter, onContextMenu, initialOpen = false, highlighted = false }: DoorProps) {
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
      glowLightRef.current.intensity = 1.2 + Math.sin(t * 3.5) * 0.6;
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
          <group
            position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]}
            onClick={handleClick}
            onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent.clientX, e.nativeEvent.clientY); }}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
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


        {/* Nameplate above door */}
        {targetRoomName && (
          <group position={[DOOR_WIDTH / 2, DOOR_HEIGHT + 0.44, 0]}>
            {/* Thin border frame */}
            <mesh position={[0, 0, 0.008]}>
              <boxGeometry args={[DOOR_WIDTH + 0.28, 0.50, 0.018]} />
              <meshStandardMaterial
                color={hovered ? '#C8A020' : '#A07820'}
                metalness={0.7}
                roughness={0.3}
                emissive={hovered ? '#6B4A00' : '#1A0E00'}
                emissiveIntensity={hovered ? 0.8 : 0.2}
              />
            </mesh>
            {/* Panel background */}
            <mesh position={[0, 0, 0.022]}>
              <boxGeometry args={[DOOR_WIDTH + 0.18, 0.40, 0.016]} />
              <meshStandardMaterial
                color="#0E1018"
                metalness={0.1}
                roughness={0.9}
              />
            </mesh>
            {/* Room name text */}
            <Text
              position={[0, 0, 0.034]}
              fontSize={0.13}
              font="https://cdn.jsdelivr.net/fontsource/fonts/cinzel@5/latin-700-normal.woff"
              letterSpacing={0.08}
              color={hovered ? '#FFFFFF' : '#E8D9B0'}
              anchorX="center"
              anchorY="middle"
              maxWidth={DOOR_WIDTH + 0.1}
              textAlign="center"
              overflowWrap="break-word"
            >
              {targetRoomName.toUpperCase()}
            </Text>
            {/* Subtle glow */}
            <pointLight
              color="#B8943A"
              intensity={hovered ? 0.4 : 0.05}
              distance={2.0}
              decay={2}
            />
          </group>
        )}

        {/* Highlight glow: golden pulsing light + emissive overlay around the frame */}
        {highlighted && (
          <>
            <pointLight
              ref={glowLightRef}
              position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0.6]}
              color="#D4AF37"
              intensity={1.2}
              distance={5}
              decay={2}
            />
            {/* Golden shimmer overlay on the frame */}
            <mesh position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0.06]}>
              <boxGeometry args={[DOOR_WIDTH + 0.3, DOOR_HEIGHT + 0.3, 0.02]} />
              <meshBasicMaterial color="#D4AF37" transparent opacity={0.10} depthWrite={false} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}
