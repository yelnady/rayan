import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
const FRAME_W = 0.6;
const FRAME_H = 0.4;
const FRAME_DEPTH = 0.02;
const BORDER = 0.04;
const PULSE_SPEED = 1.8;
export function HologramFrame({ position, color = '#00BFFF', onClick, onHover, }) {
    const groupRef = useRef(null);
    const screenRef = useRef(null);
    const timeRef = useRef(Math.random() * Math.PI * 2);
    useFrame((_, delta) => {
        if (!groupRef.current || !screenRef.current)
            return;
        timeRef.current += delta * PULSE_SPEED;
        // Gentle bob
        groupRef.current.position.y = Math.sin(timeRef.current * 0.7) * 0.04;
        // Screen flicker opacity
        const mat = screenRef.current.material;
        mat.opacity = 0.55 + Math.sin(timeRef.current * 3.1) * 0.12;
    });
    function handlePointerOver() {
        if (!groupRef.current)
            return;
        gsap.to(groupRef.current.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.2 });
        onHover?.(true);
    }
    function handlePointerOut() {
        if (!groupRef.current)
            return;
        gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
        onHover?.(false);
    }
    return (_jsx("group", { position: position, children: _jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { position: [0, FRAME_H / 2 + BORDER / 2, 0], children: [_jsx("boxGeometry", { args: [FRAME_W + BORDER * 2, BORDER, FRAME_DEPTH] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 0.6 })] }), _jsxs("mesh", { position: [0, -(FRAME_H / 2 + BORDER / 2), 0], children: [_jsx("boxGeometry", { args: [FRAME_W + BORDER * 2, BORDER, FRAME_DEPTH] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 0.6 })] }), _jsxs("mesh", { position: [-(FRAME_W / 2 + BORDER / 2), 0, 0], children: [_jsx("boxGeometry", { args: [BORDER, FRAME_H, FRAME_DEPTH] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 0.6 })] }), _jsxs("mesh", { position: [(FRAME_W / 2 + BORDER / 2), 0, 0], children: [_jsx("boxGeometry", { args: [BORDER, FRAME_H, FRAME_DEPTH] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 0.6 })] }), _jsxs("mesh", { ref: screenRef, onClick: onClick, onPointerOver: handlePointerOver, onPointerOut: handlePointerOut, children: [_jsx("planeGeometry", { args: [FRAME_W, FRAME_H] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 0.3, opacity: 0.55, transparent: true, depthWrite: false })] }), _jsxs("mesh", { position: [0, 0, 0.001], children: [_jsx("planeGeometry", { args: [FRAME_W, FRAME_H] }), _jsx("meshBasicMaterial", { color: "#000000", opacity: 0.08, transparent: true, depthWrite: false })] }), _jsx("pointLight", { color: color, intensity: 0.5, distance: 1.5, decay: 2 })] }) }));
}
