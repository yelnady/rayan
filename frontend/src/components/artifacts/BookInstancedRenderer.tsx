/**
 * BookInstancedRenderer
 *
 * Renders all 'Document' (floating book) artifacts in a room by cloning the
 * full document.glb scene per artifact so its original textures and multi-mesh
 * materials are preserved.
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Artifact as ArtifactData } from '../../types/palace';
import { HighlightGlow } from './HighlightGlow';

interface BookInstancedRendererProps {
    artifacts: ArtifactData[];
    onClick?: (artifact: ArtifactData) => void;
    highlightedIds?: string[];
}

interface DocumentItemProps {
    artifact: ArtifactData;
    onClick?: (artifact: ArtifactData) => void;
    highlighted?: boolean;
}

function wallRotation(artifact: ArtifactData): [number, number, number] {
    if (artifact.wall === 'west') return [0, Math.PI / 2, 0];
    if (artifact.wall === 'east') return [0, -Math.PI / 2, 0];
    if (artifact.wall === 'south') return [0, Math.PI, 0];
    if (artifact.wall === 'north') return [0, 0, 0];

    const { x, z } = artifact.position;
    if (x < 0.2) return [0, Math.PI / 2, 0];
    if (x > 7.8) return [0, -Math.PI / 2, 0];
    if (z > 7.8) return [0, Math.PI, 0];
    return [0, 0, 0];
}

function DocumentItem({ artifact, onClick, highlighted }: DocumentItemProps) {
    const { scene } = useGLTF('/models/document.glb');
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const rotation = useMemo(() => wallRotation(artifact), [artifact]);

    // T164: Upgrade to MeshPhysicalMaterial for 'Premium' glossy document look.
    // Reflections from Environment map will keep details visible in shadows.
    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        const material = new THREE.MeshPhysicalMaterial({
            side: THREE.DoubleSide,
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: 0.1, // Slight base glow to maintain texture 
            clearcoat: 0.8, // Glossy paper/ink look
            roughness: 0.3,
        });

        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                if (mesh.material) {
                    const oldMat = mesh.material as THREE.MeshStandardMaterial;
                    mesh.material = material.clone();
                    if (oldMat.map) (mesh.material as THREE.MeshPhysicalMaterial).map = oldMat.map;
                    if (oldMat.color) (mesh.material as THREE.MeshPhysicalMaterial).color = oldMat.color;
                }
            }
        });
        return clone;
    }, [scene]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const targetScale = hovered ? 0.6 : 0.5;
        const s = groupRef.current.scale.x;
        groupRef.current.scale.setScalar(s + (targetScale - s) * Math.min(delta * 10, 1));
    });

    return (
        <>
            <group
                ref={groupRef}
                position={[artifact.position.x, artifact.position.y, artifact.position.z]}
                rotation={rotation}
                scale={0.5}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
                onClick={(e) => { e.stopPropagation(); onClick?.(artifact); }}
            >
                {/* T159: Model origin shift — model is centered, so we push it 10cm "forward" 
                    into the room so it doesn't intersect the wall. */}
                <group position={[0, 0, 0.1]}>
                    <primitive object={clonedScene} />
                </group>
                {highlighted && <HighlightGlow color="#60A8FF" />}
            </group>

            {hovered && (
                <Html
                    position={[
                        artifact.position.x,
                        artifact.position.y + 0.75,
                        artifact.position.z,
                    ]}
                    center
                    distanceFactor={10}
                    zIndexRange={[100, 0]}
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        style={{
                            background: 'rgba(10,10,20,0.88)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid #60A8FF44',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            minWidth: '160px',
                            maxWidth: '220px',
                            textAlign: 'center',
                            fontFamily: 'system-ui, sans-serif',
                            boxShadow: '0 0 16px #60A8FF30',
                        }}
                    >
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#60A8FF', background: '#60A8FF18', borderRadius: '4px', padding: '2px 7px', marginBottom: '6px' }}>
                            Document
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.90)', lineHeight: 1.45, marginBottom: '6px' }}>
                            {artifact.summary}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
                            Click to explore
                        </div>
                    </div>
                </Html>
            )}
        </>
    );
}

export function BookInstancedRenderer({ artifacts, onClick, highlightedIds }: BookInstancedRendererProps) {
    if (artifacts.length === 0) return null;

    return (
        <>
            {artifacts.map((artifact) => (
                <DocumentItem
                    key={artifact.id}
                    artifact={artifact}
                    onClick={onClick}
                    highlighted={highlightedIds?.includes(artifact.id)}
                />
            ))}
        </>
    );
}

useGLTF.preload('/models/document.glb');
