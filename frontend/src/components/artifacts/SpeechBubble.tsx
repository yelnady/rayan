import { useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';

interface SpeechBubbleProps {
  position: [number, number, number];
  color?: string;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export function SpeechBubble({
  position,
  onClick,
  onHover,
}: SpeechBubbleProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF('/models/chat_bubble_icon.glb');

  // Preserve the GLB's original materials so the white bubble + blue dots show correctly.
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
      }
    });
    return clone;
  }, [scene]);

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
    <group position={position}>
      <group
        ref={groupRef}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <group scale={0.22}>
          <primitive object={clonedScene} />
        </group>

      </group>
    </group>
  );
}

useGLTF.preload('/models/chat_bubble_icon.glb');
