import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Group } from 'three';

interface FramedImageProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  sourceMediaUrl?: string;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const IMG_W = 1.1;
const IMG_H = 0.8;
const BORDER = 0.08;

export function FramedImage({
  position,
  rotation = [0, 0, 0],
  color = '#C8A96E',
  sourceMediaUrl,
  onClick,
  onHover,
}: FramedImageProps) {
  const groupRef = useRef<Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [planeSize, setPlaneSize] = useState<[number, number]>([IMG_W, IMG_H]);

  useEffect(() => {
    if (!sourceMediaUrl) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      sourceMediaUrl,
      (tex) => {
        if (cancelled) return;
        const imgW = tex.image.width as number;
        const imgH = tex.image.height as number;
        if (imgW && imgH) {
          const imgAspect = imgW / imgH;
          const frameAspect = IMG_W / IMG_H;
          let w = IMG_W, h = IMG_H;
          if (imgAspect > frameAspect) {
            h = IMG_W / imgAspect;
          } else {
            w = IMG_H * imgAspect;
          }
          setPlaneSize([w, h]);
        }
        setTexture(tex);
      },
      undefined,
      (err) => { console.warn('FramedImage: texture load failed', err); },
    );
    return () => { cancelled = true; };
  }, [sourceMediaUrl]);

  function handlePointerOver() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.2 });
    onHover?.(true);
  }

  function handlePointerOut() {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
    onHover?.(false);
  }

  return (
    <group position={position} rotation={rotation}>
      <group ref={groupRef}>
        {/* Outer frame */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[IMG_W + BORDER * 2, IMG_H + BORDER * 2, 0.04]} />
          <meshPhysicalMaterial color={color} roughness={0.3} clearcoat={1} />
        </mesh>

        {/* Inner matte */}
        <mesh position={[0, 0, 0.021]} receiveShadow>
          <boxGeometry args={[IMG_W + BORDER * 0.6, IMG_H + BORDER * 0.6, 0.005]} />
          <meshPhysicalMaterial color="#F5F0E8" roughness={0.8} />
        </mesh>

        {/* Image surface — actual screenshot when loaded, placeholder otherwise */}
        <mesh
          position={[0, 0, 0.027]}
          onClick={onClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={planeSize} />
          {texture ? (
            <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
          ) : (
            <meshPhysicalMaterial color="#8BA8C8" side={THREE.DoubleSide} emissive="#ffffff" emissiveIntensity={0.05} />
          )}
        </mesh>

        {/* Subtle highlight on frame top edge */}
        <mesh position={[0, (IMG_H + BORDER * 2) / 2 - 0.005, 0.02]}>
          <boxGeometry args={[IMG_W + BORDER * 2, 0.01, 0.001]} />
          <meshBasicMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>

        {/* Wall mount shadow */}
        <mesh position={[0, 0, -0.021]}>
          <planeGeometry args={[IMG_W + BORDER * 2 + 0.04, IMG_H + BORDER * 2 + 0.04]} />
          <meshBasicMaterial color="#000000" opacity={0.15} transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
