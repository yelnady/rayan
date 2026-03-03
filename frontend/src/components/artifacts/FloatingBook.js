import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
const BOOK_W = 0.22;
const BOOK_H = 0.3;
const BOOK_D = 0.06;
const FLOAT_AMPLITUDE = 0.06;
const FLOAT_SPEED = 1.2;
export function FloatingBook({ position, color = '#4A90D9', onClick, onHover, }) {
    const groupRef = useRef(null);
    const timeRef = useRef(Math.random() * Math.PI * 2); // phase offset per book
    useFrame((_, delta) => {
        if (!groupRef.current)
            return;
        timeRef.current += delta * FLOAT_SPEED;
        groupRef.current.position.y = Math.sin(timeRef.current) * FLOAT_AMPLITUDE;
        groupRef.current.rotation.y += delta * 0.3;
    });
    function handlePointerOver() {
        if (!groupRef.current)
            return;
        gsap.to(groupRef.current.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.2 });
        onHover?.(true);
    }
    function handlePointerOut() {
        if (!groupRef.current)
            return;
        gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
        onHover?.(false);
    }
    return (_jsx("group", { position: position, children: _jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { castShadow: true, onClick: onClick, onPointerOver: handlePointerOver, onPointerOut: handlePointerOut, children: [_jsx("boxGeometry", { args: [BOOK_W, BOOK_H, BOOK_D] }), _jsx("meshStandardMaterial", { color: color, roughness: 0.6, metalness: 0.1 })] }), _jsxs("mesh", { position: [-BOOK_W / 2 + 0.005, 0, 0], children: [_jsx("boxGeometry", { args: [0.01, BOOK_H, BOOK_D] }), _jsx("meshStandardMaterial", { color: "#ffffff", opacity: 0.25, transparent: true })] }), _jsx("pointLight", { color: color, intensity: 0.4, distance: 1.2, decay: 2 })] }) }));
}
