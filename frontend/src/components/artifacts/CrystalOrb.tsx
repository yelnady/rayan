import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
import type { Group, Mesh } from 'three';

interface CrystalOrbProps {
  position: [number, number, number];
  color?: string;
  pulsing?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const ORB_RADIUS = 0.18;
const FLOAT_SPEED = 1.1;
const FLOAT_AMPLITUDE = 0.05;
const ORBIT_RADIUS = 0.3;
const ORBIT_SPEED = 1.4;
const PARTICLE_COUNT = 6;

export function CrystalOrb({
  position,
  color = '#9B59B6',
  pulsing = false,
  onClick,
  onHover,
}: CrystalOrbProps) {
  const groupRef = useRef<Group>(null);
  const orbRef = useRef<Mesh>(null);
  const particlesRef = useRef<Group>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta * FLOAT_SPEED;

    // Float up/down
    groupRef.current.position.y = Math.sin(timeRef.current) * FLOAT_AMPLITUDE;

    // Orb slow spin
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * 0.4;
      orbRef.current.rotation.x += delta * 0.15;
    }

    // Orbit particles around the orb
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * ORBIT_SPEED;
      particlesRef.current.rotation.x += delta * ORBIT_SPEED * 0.5;
    }

    // Pulsing effect when enrichment arrives
    if (pulsing && orbRef.current) {
      const scale = 1 + Math.sin(timeRef.current * 4) * 0.1;
      orbRef.current.scale.setScalar(scale);
    }
  });

  function handlePointerOver() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.2 });
    onHover?.(true);
  }

  function handlePointerOut() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
    onHover?.(false);
  }

  // Pre-compute particle positions (evenly around a circle)
  const particleAngles = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
    (i / PARTICLE_COUNT) * Math.PI * 2,
  );

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Main orb */}
        <mesh
          ref={orbRef}
          onClick={onClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <icosahedronGeometry args={[ORB_RADIUS, 2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            roughness={0.05}
            metalness={0.8}
            opacity={0.85}
            transparent
          />
        </mesh>

        {/* Inner glow core */}
        <mesh>
          <sphereGeometry args={[ORB_RADIUS * 0.55, 16, 16]} />
          <meshBasicMaterial
            color={color}
            opacity={0.4}
            transparent
            depthWrite={false}
          />
        </mesh>

        {/* Orbiting particles */}
        <group ref={particlesRef}>
          {particleAngles.map((angle, i) => (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * ORBIT_RADIUS,
                Math.sin(angle * 0.5) * ORBIT_RADIUS * 0.4,
                Math.sin(angle) * ORBIT_RADIUS,
              ]}
            >
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
        </group>

        <pointLight color={color} intensity={0.8} distance={2} decay={2} />
      </group>
    </group>
  );
}
