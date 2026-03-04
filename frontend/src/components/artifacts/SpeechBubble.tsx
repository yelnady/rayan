import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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

  // Generate a premium 3D speech bubble geometry out of an extruded 2D shape
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 0.8;
    const h = 0.5;
    const r = 0.12; // corner radius

    // Top edge
    shape.moveTo(-w / 2 + r, h / 2);
    shape.lineTo(w / 2 - r, h / 2);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
    // Right edge
    shape.lineTo(w / 2, -h / 2 + r);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2);

    // Bottom edge + Tail
    shape.lineTo(-w / 2 + r + 0.25, -h / 2); // anchor point of tail right
    // The tip of the tail extending downwards and slightly left
    shape.lineTo(-w / 2 + r + 0.05, -h / 2 - 0.2);
    // The anchor point of the tail left
    shape.lineTo(-w / 2 + r + 0.1, -h / 2);

    // Finish bottom edge
    shape.lineTo(-w / 2 + r, -h / 2);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r);
    // Left edge
    shape.lineTo(-w / 2, h / 2 - r);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2);

    const extrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center(); // Center the geometry around its local origin
    return geo;
  }, []);

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
      <group ref={groupRef}>
        {/* Main bubble body */}
        <mesh
          geometry={geometry}
          onClick={onClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {/* Glassmorphism/Holographic premium material */}
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            transparent
            opacity={0.85}
            roughness={0.1}
            metalness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* Dot pattern inside bubble (3 small dots like "typing...") */}
        {[-0.15, 0, 0.15].map((xOff, i) => (
          <mesh key={i} position={[xOff, 0.02, 0.11]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}

        <pointLight color={color} intensity={0.4} distance={2} decay={2} />
      </group>
    </group>
  );
}
