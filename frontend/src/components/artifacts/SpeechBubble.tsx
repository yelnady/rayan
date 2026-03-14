import { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';

interface SpeechBubbleProps {
  position: [number, number, number];
  color?: string;
  hovered?: boolean;
  onClick?: () => void;
}

export function SpeechBubble({
  position,
  hovered = false,
  onClick,
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

  useEffect(() => {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: hovered ? 1.15 : 1, y: hovered ? 1.15 : 1, z: hovered ? 1.15 : 1, duration: 0.2 });
  }, [hovered]);

  return (
    <group position={position}>
      <group
        ref={groupRef}
        onClick={onClick}
      >
        <group scale={0.22}>
          <primitive object={clonedScene} />
        </group>

      </group>
    </group>
  );
}

useGLTF.preload('/models/chat_bubble_icon.glb');
