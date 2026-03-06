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

interface BookInstancedRendererProps {
    artifacts: ArtifactData[];
    onClick?: (artifact: ArtifactData) => void;
}

interface DocumentItemProps {
    artifact: ArtifactData;
    onClick?: (artifact: ArtifactData) => void;
}

function DocumentItem({ artifact, onClick }: DocumentItemProps) {
    const { scene } = useGLTF('/models/document.glb');
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    // Deep-clone the scene so each instance has its own transform/material state
    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        // Ensure all meshes in the clone cast shadows
        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).castShadow = true;
                (child as THREE.Mesh).receiveShadow = true;
            }
        });
        return clone;
    }, [scene]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        // Scale up slightly on hover
        const targetScale = hovered ? 0.6 : 0.5;
        const s = groupRef.current.scale.x;
        groupRef.current.scale.setScalar(s + (targetScale - s) * Math.min(delta * 10, 1));
    });

    return (
        <>
            <group
                ref={groupRef}
                position={[artifact.position.x, artifact.position.y, artifact.position.z]}
                scale={0.5}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
                onClick={(e) => { e.stopPropagation(); onClick?.(artifact); }}
            >
                <primitive object={clonedScene} />
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

export function BookInstancedRenderer({ artifacts, onClick }: BookInstancedRendererProps) {
    if (artifacts.length === 0) return null;

    return (
        <>
            {artifacts.map((artifact) => (
                <DocumentItem key={artifact.id} artifact={artifact} onClick={onClick} />
            ))}
        </>
    );
}

useGLTF.preload('/models/document.glb');
