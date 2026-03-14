/**
 * BookInstancedRenderer
 *
 * Renders all 'Document' (floating book) artifacts in a room by cloning the
 * full document.glb scene per artifact so its original textures and multi-mesh
 * materials are preserved.
 */

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Artifact as ArtifactData } from '../../types/palace';
import { usePalaceStore } from '../../stores/palaceStore';
import { registerArtifactCenter, artifactCenters } from '../palace/artifactCenters';

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
        datePart: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase(),
        timePart: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
    };
}

function DocumentItem({ artifact, onClick }: DocumentItemProps) {
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

    // Track bounding-box center so ArtifactConnectionLines can anchor at the true model center.
    const centerComputedRef = useRef(false);
    const centerFrameRef = useRef(0);
    useEffect(() => {
        centerComputedRef.current = false;
        centerFrameRef.current = 0;
        return () => { artifactCenters.delete(artifact.id); };
    }, [artifact.id]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const targetScale = hovered ? 2.6 : 2.4;
        const s = groupRef.current.scale.x;
        groupRef.current.scale.setScalar(s + (targetScale - s) * Math.min(delta * 10, 1));

        // Compute world-space bounding box center once after the first render
        // (skip frame 0: world matrices are updated by renderer.render(), which runs after useFrame)
        if (!centerComputedRef.current) {
            if (++centerFrameRef.current >= 2) {
                registerArtifactCenter(artifact.id, groupRef.current);
                centerComputedRef.current = true;
            }
        }
    });

    return (
        <>
            <group
                ref={groupRef}
                position={[artifact.position.x, artifact.position.y, artifact.position.z]}
                rotation={rotation}
                scale={2.4}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); usePalaceStore.getState().setHoveredArtifactId(artifact.id); }}
                onPointerOut={() => { setHovered(false); usePalaceStore.getState().setHoveredArtifactId(null); }}
                onClick={(e) => { e.stopPropagation(); onClick?.(artifact); }}
            >
                {/* T159: Model origin shift — model is centered, so we push it 10cm "forward" 
                    into the room so it doesn't intersect the wall. */}
                <group position={[0, 0, 0.1]}>
                    <primitive object={clonedScene} />
                </group>
            </group>

            {/* Date/time plaque — only when inside this artifact's room and not hovered */}
            {currentRoomId === artifact.roomId && !hovered && (
                <Html
                    position={[artifact.position.x, artifact.position.y + 0.15, artifact.position.z]}
                    center
                    distanceFactor={10}
                    zIndexRange={[10, 0]}
                    style={{ pointerEvents: 'none' }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                        backdropFilter: 'blur(16px) saturate(1.6)',
                        WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderTop: '1px solid rgba(255,255,255,0.32)',
                        borderRadius: '10px',
                        padding: '4px 10px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}>
                        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.70)', lineHeight: 1.4 }}>
                            {dateLabel.datePart}
                        </div>
                        <div style={{ fontSize: '8px', letterSpacing: '0.05em', color: 'rgba(0,0,0,0.45)', lineHeight: 1.3 }}>
                            {dateLabel.timePart}
                        </div>
                    </div>
                </Html>
            )}

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
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                            backdropFilter: 'blur(16px) saturate(1.6)',
                            WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            borderTop: '1px solid rgba(255,255,255,0.32)',
                            borderRadius: '14px',
                            padding: '8px 12px',
                            minWidth: '160px',
                            maxWidth: '220px',
                            textAlign: 'center',
                            fontFamily: 'system-ui, sans-serif',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 16px #60A8FF20, inset 0 1px 0 rgba(255,255,255,0.15)',
                        }}
                    >
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.75)', background: '#60A8FF18', borderRadius: '4px', padding: '2px 7px', marginBottom: '6px' }}>
                            Document
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.80)', lineHeight: 1.45, marginBottom: '6px' }}>
                            {artifact.title || artifact.summary}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.40)', letterSpacing: '0.04em' }}>
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
