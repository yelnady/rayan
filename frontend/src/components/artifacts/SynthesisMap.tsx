import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh, Group } from 'three';

interface SynthesisMapProps {
  position?: [number, number, number];
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const GOLD = '#FFD700';
const GOLD_VEC = new THREE.Color(GOLD);
const RING_COLOR = new THREE.Color('#c084fc');
const INNER_COLOR = new THREE.Color('#0a0a2e');

/**
 * SynthesisMap — a large floating mind map portal.
 *
 * Renders a glowing golden canvas (1.6 × 1.2 units) with:
 *   - Animated prismatic frame rings
 *   - Pulsing inner surface with shifting emissive glow
 *   - Orbiting luminous particles
 *   - Slow hover scale on interact
 */
export function SynthesisMap({ position = [0, 0, 0], onClick, onHover }: SynthesisMapProps) {
  const groupRef = useRef<Group>(null);
  const innerRef = useRef<Mesh>(null);
  const ring1Ref = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const scaleRef = useRef(1.0);
  const targetScaleRef = useRef(1.0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Slow breathing pulse on the whole group
    if (groupRef.current) {
      const breathe = 1 + Math.sin(t * 0.8) * 0.015;
      const s = THREE.MathUtils.lerp(scaleRef.current, targetScaleRef.current * breathe, 0.08);
      scaleRef.current = s;
      groupRef.current.scale.setScalar(s);
    }

    // Inner surface: shift hue between gold → purple → teal
    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshPhysicalMaterial;
      const hue = (t * 0.04) % 1;
      mat.emissive.setHSL(hue, 0.8, 0.25 + Math.sin(t * 1.2) * 0.08);
      mat.emissiveIntensity = 0.6 + Math.sin(t * 1.5) * 0.2;
    }

    // Ring 1: slow clockwise spin
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.3;
      const mat = ring1Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(t * 1.1) * 0.2;
    }

    // Ring 2: counter-clockwise, different phase
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.18;
      const mat = ring2Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(t * 0.9 + 1.5) * 0.15;
    }

    // Particle orbit
    if (particlesRef.current) {
      particlesRef.current.rotation.z = t * 0.12;
    }
  });

  // Build orbiting particle geometry once
  const particleCount = 48;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const r = 0.95 + (i % 3) * 0.12;
    particlePositions[i * 3 + 0] = Math.cos(angle) * r;
    particlePositions[i * 3 + 1] = Math.sin(angle) * r * 0.75; // ellipse to match aspect
    particlePositions[i * 3 + 2] = 0.05;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  return (
    <group
      position={position}
      ref={groupRef}
      onClick={onClick}
      onPointerOver={() => { targetScaleRef.current = 1.06; onHover?.(true); }}
      onPointerOut={() => { targetScaleRef.current = 1.0; onHover?.(false); }}
    >
      {/* Outer glow halo — large translucent plane behind everything */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[2.4, 1.85]} />
        <meshBasicMaterial color={GOLD_VEC} transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/* Main frame — thick golden border */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.72, 1.30]} />
        <meshPhysicalMaterial
          color={GOLD_VEC}
          emissive={GOLD_VEC}
          emissiveIntensity={0.35}
          roughness={0.15}
          metalness={0.8}
          clearcoat={1}
        />
      </mesh>

      {/* Inner canvas surface */}
      <mesh position={[0, 0, 0.012]} ref={innerRef}>
        <planeGeometry args={[1.52, 1.10]} />
        <meshPhysicalMaterial
          color={INNER_COLOR}
          emissive={RING_COLOR}
          emissiveIntensity={0.6}
          roughness={0.7}
          metalness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Spinning ring 1 — golden ellipse */}
      <mesh position={[0, 0, 0.025]} ref={ring1Ref}>
        <ringGeometry args={[0.7, 0.74, 64]} />
        <meshBasicMaterial color={GOLD_VEC} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Spinning ring 2 — purple ellipse, slightly larger */}
      <mesh position={[0, 0, 0.026]} ref={ring2Ref}>
        <ringGeometry args={[0.82, 0.85, 64]} />
        <meshBasicMaterial color={RING_COLOR} transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Orbiting star particles */}
      <points ref={particlesRef} position={[0, 0, 0.03]}>
        <primitive object={particleGeo} />
        <pointsMaterial color="#FFD700" size={0.025} transparent opacity={0.75} depthWrite={false} />
      </points>

      {/* "MIND MAP" label in the center — HTML overlay */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.6, 0.18]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}
