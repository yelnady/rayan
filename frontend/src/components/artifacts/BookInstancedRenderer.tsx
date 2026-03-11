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
import { usePalaceStore } from '../../stores/palaceStore';

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

function formatDate(iso?: string): { datePart: string; timePart: string } {
    const d = new Date(iso ?? Date.now());
    return {
        datePart: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
        timePart: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
}

function DocumentItem({ artifact, onClick, highlighted }: DocumentItemProps) {
    const { scene } = useGLTF('/models/document.glb');
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const rotation = useMemo(() => wallRotation(artifact), [artifact]);
    const dateLabel = useMemo(() => formatDate(artifact.capturedAt ?? artifact.createdAt), [artifact.capturedAt, artifact.createdAt]);
    const currentRoomId = usePalaceStore((s) => s.currentRoomId);

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
        const targetScale = hovered ? 2.6 : 2.4;
        const s = groupRef.current.scale.x;
        groupRef.current.scale.setScalar(s + (targetScale - s) * Math.min(delta * 10, 1));
    });

    return (
        <>
            <group
                ref={groupRef}
                position={[artifact.position.x, artifact.position.y, artifact.position.z]}
                rotation={rotation}
                scale={2.4}
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

            {/* Date/time plaque — only when inside this artifact's room */}
            {currentRoomId === artifact.roomId && <Html
                position={[artifact.position.x, artifact.position.y + 0.15, artifact.position.z]}
                center
                distanceFactor={10}
                zIndexRange={[10, 0]}
                style={{ pointerEvents: 'none' }}
            >
                <div style={{
                    background: 'rgba(5, 5, 18, 0.72)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid #60A8FF50',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 #60A8FF20',
                }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', color: '#60A8FF', lineHeight: 1.4 }}>
                        {dateLabel.datePart}
                    </div>
                    <div style={{ fontSize: '9px', letterSpacing: '0.05em', color: '#60A8FF', opacity: 0.55, lineHeight: 1.3 }}>
                        {dateLabel.timePart}
                    </div>
                </div>
            </Html>}

            {hovered && (
                <Html
                    position={[
                        artifact.position.x,
                        artifact.position.y + 1.4,
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
