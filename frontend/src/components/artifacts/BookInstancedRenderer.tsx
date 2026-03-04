/**
 * T153 – BookInstancedRenderer
 *
 * Renders ALL 'Document' (floating book) artifacts in a room using the 
 * provided document.glb model via <Instances /> and <Instance /> from drei.
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import type { Artifact as ArtifactData } from '../../types/palace';

const FLOAT_AMPLITUDE = 0.06;
const FLOAT_SPEED = 1.2;
const SPIN_SPEED = 0.3;

interface BookEntry {
    artifact: ArtifactData;
    color: string;
    phaseOffset: number;
}

interface BookInstancedRendererProps {
    artifacts: ArtifactData[];
    onClick?: (artifact: ArtifactData) => void;
}

const DEFAULT_BOOK_COLOR = '#60A8FF';

export function BookInstancedRenderer({ artifacts, onClick }: BookInstancedRendererProps) {
    const count = artifacts.length;

    // Load the provided document model once
    const { nodes } = useGLTF('/models/document.glb') as any;

    // Stable per-instance data: color + random phase offset (computed once on mount)
    const entries = useMemo<BookEntry[]>(
        () =>
            artifacts.map((artifact) => ({
                artifact,
                color: artifact.color ?? DEFAULT_BOOK_COLOR,
                phaseOffset: Math.random() * Math.PI * 2,
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [artifacts.map((a) => a.id).join(',')],
    );

    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const timesRef = useRef<Float32Array>(new Float32Array(count));
    const rotationsRef = useRef<Float32Array>(new Float32Array(count));

    // Arrays of ref objects to drive each Instance individually
    const instanceRefs = useRef<(THREE.Object3D | null)[]>([]);

    // Init phase offsets
    useMemo(() => {
        timesRef.current = new Float32Array(entries.map((e) => e.phaseOffset));
        rotationsRef.current = new Float32Array(count);
    }, [entries, count]);


    // Drive animation for all instances
    useFrame((_, delta) => {
        entries.forEach((entry, i) => {
            const inst = instanceRefs.current[i];
            if (!inst) return;

            timesRef.current[i] += delta * FLOAT_SPEED;
            rotationsRef.current[i] += delta * SPIN_SPEED;

            const { x, z } = entry.artifact.position;
            const baseY = entry.artifact.position.y;
            const floatY = baseY + Math.sin(timesRef.current[i]) * FLOAT_AMPLITUDE;

            inst.position.set(x, floatY, z);
            inst.rotation.y = rotationsRef.current[i];

            // Scale up hovered instance
            const s = hoveredIdx === i ? 0.6 : 0.5; // Base scale is 0.5
            inst.scale.setScalar(s);
        });
    });

    if (count === 0) return null;

    // Find the primary mesh inside the GLTF to use as the base for the Instances component
    // Assuming the document.glb has at least one mesh child. We use its geometry and material properties.
    const primaryNode = Object.values(nodes).find((n: any) => n.isMesh) as THREE.Mesh | undefined;

    // Fallback just in case the GLTF fails to load an immediate mesh
    const geometry = primaryNode?.geometry || new THREE.BoxGeometry(0.2, 0.3, 0.05);

    return (
        <>
            <Instances
                range={count}
                geometry={geometry}
                castShadow
                receiveShadow
            >
                {/* 
                  Instead of copying the original material perfectly, we use a StandardMaterial 
                  on the Instances wrapper to allow per-instance coloring (`color="..."`) to work!
                */}
                <meshBasicMaterial />

                {entries.map((entry, i) => (
                    <Instance
                        key={entry.artifact.id}
                        ref={(el) => (instanceRefs.current[i] = el as THREE.Object3D | null)}
                        color={entry.color}
                        onPointerMove={(e) => {
                            e.stopPropagation();
                            setHoveredIdx(i);
                        }}
                        onPointerLeave={() => setHoveredIdx(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick?.(entry.artifact);
                        }}
                    />
                ))}
            </Instances>

            {/* Hovering tooltip — rendered at the hovered artifact's base position */}
            {hoveredIdx !== null && entries[hoveredIdx] && (
                <Html
                    position={[
                        entries[hoveredIdx].artifact.position.x,
                        entries[hoveredIdx].artifact.position.y + 0.75,
                        entries[hoveredIdx].artifact.position.z,
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
                            border: `1px solid #60A8FF44`,
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
                            {entries[hoveredIdx].artifact.summary}
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

useGLTF.preload('/models/document.glb');
