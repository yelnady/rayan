import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh, Group } from 'three';

interface SynthesisMapProps {
  position?: [number, number, number];
  imageUrl?: string;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const GOLD = '#FFD700';
const GOLD_VEC = new THREE.Color(GOLD);
const RING_COLOR = new THREE.Color('#c084fc');
const INNER_COLOR = new THREE.Color('#0a0a2e');

/**
 * SynthesisMap — a large mind map canvas mounted on the wall.
 *
 * Renders a glowing golden frame (1.6 × 1.2 units) with:
 *   - The actual GCS mind-map image when available
 *   - Animated prismatic frame rings
 *   - Pulsing inner surface (fallback while image loads or on error)
 *   - Orbiting luminous particles
 *   - Slow hover scale on interact
 */
export function SynthesisMap({ position = [0, 0, 0], imageUrl, onClick, onHover }: SynthesisMapProps) {
  const groupRef = useRef<Group>(null);
  const innerRef = useRef<Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [planeSize, setPlaneSize] = useState<[number, number]>([1.52, 1.10]);

  // Load the GCS image without throwing — errors are swallowed, fallback canvas shows instead.
  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      imageUrl,
      (tex) => {
        if (cancelled) return;
        // Fit the image inside the max inner bounds (1.52 × 1.10) preserving aspect ratio.
        const imgW = tex.image.width as number;
        const imgH = tex.image.height as number;
        if (imgW && imgH) {
          const maxW = 1.52, maxH = 1.10;
          const imageAspect = imgW / imgH;
          const frameAspect = maxW / maxH;
          let w = maxW, h = maxH;
          if (imageAspect > frameAspect) {
            h = maxW / imageAspect; // wider than frame → constrain by width
          } else {
            w = maxH * imageAspect; // taller than frame → constrain by height
          }
          setPlaneSize([w, h]);
        }
        setTexture(tex);
      },
      undefined,
      (err) => { console.warn('SynthesisMap: texture load failed', err); },
    );
    return () => { cancelled = true; };
  }, [imageUrl]);

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

    // Inner surface animation — only active when no texture is loaded
    if (!texture && innerRef.current) {
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

      {/* Inner canvas surface — shows the real image once loaded, animated glow otherwise */}
      <mesh position={[0, 0, 0.012]} ref={texture ? null : innerRef}>
        <planeGeometry args={planeSize} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshPhysicalMaterial
            color={INNER_COLOR}
            emissive={RING_COLOR}
            emissiveIntensity={0.6}
            roughness={0.7}
            metalness={0.1}
            transparent
            opacity={0.95}
          />
        )}
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
