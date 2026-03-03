import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
const BUBBLE_W = 0.5;
const BUBBLE_H = 0.3;
const FLOAT_AMPLITUDE = 0.05;
const FLOAT_SPEED = 0.9;
export function SpeechBubble({ position, color = '#A8D8EA', onClick, onHover, }) {
    const groupRef = useRef(null);
    const timeRef = useRef(Math.random() * Math.PI * 2);
    useFrame((_, delta) => {
        if (!groupRef.current)
            return;
        timeRef.current += delta * FLOAT_SPEED;
        groupRef.current.position.y = Math.sin(timeRef.current) * FLOAT_AMPLITUDE;
        // Gentle sway
        groupRef.current.rotation.z = Math.sin(timeRef.current * 0.6) * 0.04;
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
    return (_jsx("group", { position: position, children: _jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { onClick: onClick, onPointerOver: handlePointerOver, onPointerOut: handlePointerOut, children: [_jsx("capsuleGeometry", { args: [BUBBLE_H * 0.5, BUBBLE_W * 0.5, 4, 12] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 0.2, opacity: 0.75, transparent: true, roughness: 0.2, metalness: 0.1 })] }), _jsxs("mesh", { position: [BUBBLE_W * 0.25, -BUBBLE_H * 0.5, 0], rotation: [0, 0, -0.5], children: [_jsx("coneGeometry", { args: [0.06, 0.15, 6] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 0.2, opacity: 0.75, transparent: true })] }), [-0.1, 0, 0.1].map((xOff, i) => (_jsxs("mesh", { position: [xOff, 0, 0.05], children: [_jsx("sphereGeometry", { args: [0.03, 8, 8] }), _jsx("meshStandardMaterial", { color: "#ffffff", opacity: 0.8, transparent: true, emissive: "#ffffff", emissiveIntensity: 0.4 })] }, i))), _jsx("pointLight", { color: color, intensity: 0.3, distance: 1.2, decay: 2 })] }) }));
}
