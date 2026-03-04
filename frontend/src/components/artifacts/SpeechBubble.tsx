import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';

interface SpeechBubbleProps {
  position: [number, number, number];
  color?: string;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const FLOAT_AMPLITUDE = 0.05;
const FLOAT_SPEED = 0.9;

export function SpeechBubble({
  position,
  color = '#A8D8EA',
  onClick,
  onHover,
}: SpeechBubbleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  const { scene } = useGLTF('/models/chat_bubble_icon.glb');

  const clonedScene = useMemo(() => {
    const clone = scene.clone();

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const oldMat = mesh.material as THREE.MeshStandardMaterial;
        // Use MeshBasicMaterial so the model shows its original baked colors
        // regardless of scene lighting.
        mesh.material = new THREE.MeshBasicMaterial({
          color: oldMat.color,
          map: oldMat.map,
        });
      }
    });

    return clone;
  }, [scene]);


  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta * FLOAT_SPEED;
    groupRef.current.position.y = Math.sin(timeRef.current) * FLOAT_AMPLITUDE;
    // Gentle sway
    groupRef.current.rotation.z = Math.sin(timeRef.current * 0.6) * 0.04;
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
    <group position={position}>
      <group
        ref={groupRef}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <group scale={0.5}>
          <primitive object={clonedScene} />
        </group>

        <pointLight color={color} intensity={0.4} distance={2} decay={2} />
      </group>
    </group>
  );
}

useGLTF.preload('/models/chat_bubble_icon.glb');
