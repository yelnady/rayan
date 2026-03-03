import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { gsap } from 'gsap';
const IMG_W = 0.7;
const IMG_H = 0.5;
const BORDER = 0.05;
export function FramedImage({ position, rotation = [0, 0, 0], color = '#C8A96E', onClick, onHover, }) {
    const groupRef = useRef(null);
    function handlePointerOver() {
        if (!groupRef.current)
            return;
        gsap.to(groupRef.current.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.2 });
        onHover?.(true);
    }
    function handlePointerOut() {
        if (!groupRef.current)
            return;
        gsap.to(groupRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
        onHover?.(false);
    }
    return (_jsx("group", { position: position, rotation: rotation, children: _jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [IMG_W + BORDER * 2, IMG_H + BORDER * 2, 0.04] }), _jsx("meshStandardMaterial", { color: color, roughness: 0.5, metalness: 0.3 })] }), _jsxs("mesh", { position: [0, 0, 0.021], children: [_jsx("boxGeometry", { args: [IMG_W + BORDER * 0.6, IMG_H + BORDER * 0.6, 0.005] }), _jsx("meshStandardMaterial", { color: "#F5F0E8", roughness: 0.9 })] }), _jsxs("mesh", { position: [0, 0, 0.027], onClick: onClick, onPointerOver: handlePointerOver, onPointerOut: handlePointerOut, children: [_jsx("planeGeometry", { args: [IMG_W, IMG_H] }), _jsx("meshStandardMaterial", { color: "#8BA8C8", roughness: 0.8 })] }), _jsxs("mesh", { position: [0, (IMG_H + BORDER * 2) / 2 - 0.005, 0.02], children: [_jsx("boxGeometry", { args: [IMG_W + BORDER * 2, 0.01, 0.001] }), _jsx("meshBasicMaterial", { color: "#ffffff", opacity: 0.3, transparent: true })] }), _jsxs("mesh", { position: [0, 0, -0.021], children: [_jsx("planeGeometry", { args: [IMG_W + BORDER * 2 + 0.04, IMG_H + BORDER * 2 + 0.04] }), _jsx("meshBasicMaterial", { color: "#000000", opacity: 0.15, transparent: true, depthWrite: false })] })] }) }));
}
