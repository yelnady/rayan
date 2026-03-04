/**
 * T153 – BookInstancedRenderer
 *
 * Renders ALL floating books in a room as a single InstancedMesh draw call,
 * replacing N individual book meshes (N separate GPU draw calls) with one.
 *
 * Architecture note:
 *   - The Book body (main visible mesh) is instanced once per artifact.
 *   - The spine highlight uses a second InstancedMesh (parallel array).
 *   - Per-instance colour is encoded via instanceColor (setColorAt).
 *   - Hover/click is handled by event.instanceId from the onPointerMove/onClick
 *     events on THREE.InstancedMesh, which R3F surfaces automatically.
 *   - Individual animation (float + spin) is driven in useFrame over all instances.
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Artifact as ArtifactData } from '../../types/palace';

const BOOK_W = 0.22;
const BOOK_H = 0.3;
const BOOK_D = 0.06;
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

const BOOK_GEO = new THREE.BoxGeometry(BOOK_W, BOOK_H, BOOK_D);
const SPINE_GEO = new THREE.BoxGeometry(0.01, BOOK_H, BOOK_D);
const DUMMY = new THREE.Object3D();

const DEFAULT_BOOK_COLOR = '#60A8FF';

/**
 * Helper: parse a CSS hex color string to a THREE.Color, falling back gracefully.
 */
function toColor(c?: string): THREE.Color {
    try {
        return new THREE.Color(c ?? DEFAULT_BOOK_COLOR);
    } catch {
        return new THREE.Color(DEFAULT_BOOK_COLOR);
    }
}

export function BookInstancedRenderer({ artifacts, onClick }: BookInstancedRendererProps) {
    const count = artifacts.length;

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

    const bodyRef = useRef<THREE.InstancedMesh>(null);
    const spineRef = useRef<THREE.InstancedMesh>(null);
    const timesRef = useRef<Float32Array>(new Float32Array(count));
    const rotationsRef = useRef<Float32Array>(new Float32Array(count));
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    // Initialise per-instance colors and phase offsets
    useEffect(() => {
        if (!bodyRef.current || !spineRef.current) return;
        timesRef.current = new Float32Array(entries.map((e) => e.phaseOffset));
        rotationsRef.current = new Float32Array(count);

        entries.forEach((entry, i) => {
            const col = toColor(entry.color);
            bodyRef.current!.setColorAt(i, col);
            spineRef.current!.setColorAt(i, new THREE.Color('#ffffff'));
        });
        bodyRef.current.instanceColor!.needsUpdate = true;
        spineRef.current.instanceColor!.needsUpdate = true;
    }, [entries, count]);

    // Drive animation for all instances
    useFrame((_, delta) => {
        if (!bodyRef.current || !spineRef.current) return;

        entries.forEach((entry, i) => {
            timesRef.current[i] += delta * FLOAT_SPEED;
            rotationsRef.current[i] += delta * SPIN_SPEED;

            const { x, z } = entry.artifact.position;
            const baseY = entry.artifact.position.y;
            const floatY = baseY + Math.sin(timesRef.current[i]) * FLOAT_AMPLITUDE;

            DUMMY.position.set(x, floatY, z);
            DUMMY.rotation.y = rotationsRef.current[i];

            // Scale up hovered instance
            const s = hoveredIdx === i ? 1.2 : 1;
            DUMMY.scale.setScalar(s);
            DUMMY.updateMatrix();
            bodyRef.current!.setMatrixAt(i, DUMMY.matrix);

            // Spine sits at -X edge of the book
            DUMMY.position.set(x - BOOK_W / 2 + 0.005, floatY, z);
            DUMMY.updateMatrix();
            spineRef.current!.setMatrixAt(i, DUMMY.matrix);
        });

        bodyRef.current.instanceMatrix.needsUpdate = true;
        spineRef.current.instanceMatrix.needsUpdate = true;
    });

    if (count === 0) return null;

    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, vertexColors: true });
    const spineMat = new THREE.MeshStandardMaterial({ color: '#ffffff', opacity: 0.25, transparent: true, vertexColors: false });

    return (
        <>
            {/* Main book bodies */}
            <instancedMesh
                ref={bodyRef}
                args={[BOOK_GEO, bodyMat, count]}
                castShadow
                onPointerMove={(e) => {
                    e.stopPropagation();
                    setHoveredIdx(e.instanceId ?? null);
                }}
                onPointerLeave={() => setHoveredIdx(null)}
                onClick={(e) => {
                    e.stopPropagation();
                    const idx = e.instanceId;
                    if (idx !== undefined && entries[idx]) {
                        onClick?.(entries[idx].artifact);
                    }
                }}
            />

            {/* Spine highlights */}
            <instancedMesh
                ref={spineRef}
                args={[SPINE_GEO, spineMat, count]}
            />

            {/* Hovering tooltip — rendered at the hovered artifact's base position */}
            {hoveredIdx !== null && entries[hoveredIdx] && (
                <Html
                    position={[
                        entries[hoveredIdx].artifact.position.x,
                        entries[hoveredIdx].artifact.position.y + 0.75,
                        entries[hoveredIdx].artifact.position.z,
                    ]}
                    center
                    distanceFactor={6}
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
