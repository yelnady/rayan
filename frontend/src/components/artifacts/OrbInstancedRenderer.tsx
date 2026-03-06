/**
 * T153 – OrbInstancedRenderer
 *
 * Renders ALL crystal orbs in a room as two InstancedMesh draw calls:
 *   1. Main icosahedron orbs (one per artifact)
 *   2. Orbiting particles  (PARTICLE_COUNT per artifact, one instanced mesh)
 *
 * This replaces N × (orb + core + 6 particles + light) with just 2 draw calls.
 *
 * Limitations vs individual CrystalOrb:
 *   - Inner glow core is omitted (would require a third mesh; negligible visual impact at distance)
 *   - Point lights per-orb are omitted (too expensive; use scene ambient/room lights instead)
 *   - Pulsing enrichment effect: the hovered or pulsing instance scales up in useFrame
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Artifact as ArtifactData } from '../../types/palace';
import { useEnrichmentStore } from '../../stores/enrichmentStore';

const ORB_RADIUS = 0.18;
const FLOAT_SPEED = 1.1;
const ORBIT_RADIUS = 0.3;
const ORBIT_SPEED = 1.4;
const PARTICLE_COUNT = 6;

// Pre-computed particle angle offsets (module level, shared across all instances)
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
    (i / PARTICLE_COUNT) * Math.PI * 2,
);

const ORB_GEO = new THREE.IcosahedronGeometry(ORB_RADIUS, 2);
const PARTICLE_GEO = new THREE.SphereGeometry(0.025, 6, 6);
const DUMMY = new THREE.Object3D();

const DEFAULT_ORB_COLOR = '#FF60B8';

function toColor(c?: string): THREE.Color {
    try {
        return new THREE.Color(c ?? DEFAULT_ORB_COLOR);
    } catch {
        return new THREE.Color(DEFAULT_ORB_COLOR);
    }
}

interface OrbEntry {
    artifact: ArtifactData;
    color: string;
    phaseOffset: number;
}

interface OrbInstancedRendererProps {
    artifacts: ArtifactData[];
    onClick?: (artifact: ArtifactData) => void;
}

export function OrbInstancedRenderer({ artifacts, onClick }: OrbInstancedRendererProps) {
    const count = artifacts.length;
    const particleTotal = count * PARTICLE_COUNT;
    const newEnrichmentIds = useEnrichmentStore((s) => s.newEnrichmentArtifactIds);

    const entries = useMemo<OrbEntry[]>(
        () =>
            artifacts.map((artifact) => ({
                artifact,
                color: artifact.color ?? DEFAULT_ORB_COLOR,
                phaseOffset: Math.random() * Math.PI * 2,
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [artifacts.map((a) => a.id).join(',')],
    );

    const orbRef = useRef<THREE.InstancedMesh>(null);
    const particleRef = useRef<THREE.InstancedMesh>(null);
    const timesRef = useRef<Float32Array>(new Float32Array(count));
    const orbitAnglesRef = useRef<Float32Array>(new Float32Array(count)); // per-orb orbit rotation
    const orbSpinsRef = useRef<{ ry: number; rx: number }[]>(
        Array.from({ length: count }, () => ({ ry: 0, rx: 0 })),
    );
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    // Initialise colors
    useEffect(() => {
        if (!orbRef.current || !particleRef.current) return;
        timesRef.current = new Float32Array(entries.map((e) => e.phaseOffset));
        orbitAnglesRef.current = new Float32Array(count);

        entries.forEach((entry, i) => {
            const col = toColor(entry.color);
            orbRef.current!.setColorAt(i, col);
            // Same color for all particles belonging to this orb
            for (let p = 0; p < PARTICLE_COUNT; p++) {
                particleRef.current!.setColorAt(i * PARTICLE_COUNT + p, col);
            }
        });
        orbRef.current.instanceColor!.needsUpdate = true;
        particleRef.current.instanceColor!.needsUpdate = true;
    }, [entries, count]);

    useFrame((_, delta) => {
        if (!orbRef.current || !particleRef.current) return;

        entries.forEach((entry, i) => {
            timesRef.current[i] += delta * FLOAT_SPEED;
            orbitAnglesRef.current[i] += delta * ORBIT_SPEED;
            orbSpinsRef.current[i].ry += delta * 0.4;
            orbSpinsRef.current[i].rx += delta * 0.15;

            const { x, z } = entry.artifact.position;
            const baseY = entry.artifact.position.y;

            const isPulsing = newEnrichmentIds.has(entry.artifact.id);
            const pulseScale = isPulsing
                ? 1 + Math.sin(timesRef.current[i] * 4) * 0.1
                : 1;
            const hoverScale = hoveredIdx === i ? 1.2 : 1;

            DUMMY.position.set(x, baseY, z);
            DUMMY.rotation.y = orbSpinsRef.current[i].ry;
            DUMMY.rotation.x = orbSpinsRef.current[i].rx;
            DUMMY.scale.setScalar(pulseScale * hoverScale);
            DUMMY.updateMatrix();
            orbRef.current!.setMatrixAt(i, DUMMY.matrix);

            // Place particles in an orbit around the orb
            const orbitRotY = orbitAnglesRef.current[i];
            const orbitRotX = orbitAnglesRef.current[i] * 0.5;

            PARTICLE_ANGLES.forEach((angle, p) => {
                // Compute particle local position in the orbit plane
                const lx = Math.cos(angle) * ORBIT_RADIUS;
                const ly = Math.sin(angle * 0.5) * ORBIT_RADIUS * 0.4;
                const lz = Math.sin(angle) * ORBIT_RADIUS;

                // Rotate the orbit ring around Y then X
                const cosY = Math.cos(orbitRotY), sinY = Math.sin(orbitRotY);
                const rx2 = lx * cosY - lz * sinY;
                const rz2 = lx * sinY + lz * cosY;
                const cosX = Math.cos(orbitRotX), sinX = Math.sin(orbitRotX);
                const ry2 = ly * cosX - rz2 * sinX;
                const rz3 = ly * sinX + rz2 * cosX;

                DUMMY.position.set(x + rx2, baseY + ry2, z + rz3);
                DUMMY.rotation.set(0, 0, 0);
                DUMMY.scale.setScalar(1);
                DUMMY.updateMatrix();
                particleRef.current!.setMatrixAt(i * PARTICLE_COUNT + p, DUMMY.matrix);
            });
        });

        orbRef.current.instanceMatrix.needsUpdate = true;
        particleRef.current.instanceMatrix.needsUpdate = true;
    });

    if (count === 0) return null;

    const orbMat = new THREE.MeshStandardMaterial({
        roughness: 0.05,
        metalness: 0.8,
        opacity: 0.85,
        transparent: true,
        vertexColors: true,
    });
    const particleMat = new THREE.MeshBasicMaterial({ vertexColors: true });

    return (
        <>
            {/* Orb bodies */}
            <instancedMesh
                ref={orbRef}
                args={[ORB_GEO, orbMat, count]}
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

            {/* Orbiting particles */}
            <instancedMesh
                ref={particleRef}
                args={[PARTICLE_GEO, particleMat, particleTotal]}
            />

            {/* Hover tooltip */}
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
                            border: `1px solid #FF60B844`,
                            borderRadius: '10px',
                            padding: '8px 12px',
                            minWidth: '160px',
                            maxWidth: '220px',
                            textAlign: 'center',
                            fontFamily: 'system-ui, sans-serif',
                            boxShadow: '0 0 16px #FF60B830',
                        }}
                    >
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FF60B8', background: '#FF60B818', borderRadius: '4px', padding: '2px 7px', marginBottom: '6px' }}>
                            Enrichment
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
