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
  color = '#A8D8EA',
  onClick,
  onHover,
}: SpeechBubbleProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF('/models/chat_bubble_icon.glb');

  // T164: Upgrade to MeshPhysicalMaterial for 'Premium' glass-like look.
  // It uses the global Environment map for reflections, so it's never pitch black.
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const material = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.15,
      roughness: 0.1,
      metalness: 0.2, // Low metalness + Environment = Glassy sheen
      clearcoat: 1, // Shiny protective layer
      transmission: 0.2, // Slight translucency for 'Premium' feel
      thickness: 0.5,
      side: THREE.DoubleSide,
    });

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = material;
        mesh.castShadow = true;
      }
    });
    return clone;
  }, [scene, color]);

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

        <pointLight color={color} intensity={0.4} distance={2} decay={2} />
      </group>
    </group>
  );
}

useGLTF.preload('/models/chat_bubble_icon.glb');
