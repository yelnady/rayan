import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { WallsWithDoors } from './WallsWithDoors';
export function Room({ room, index, doors = [], children }) {
    // We determine the room theme based on its index
    const roomType = index % 3; // 0 = Comfort, 1 = Clarity, 2 = Imagination
    // Use dimensions from data, but we can override height for specific themes
    const w = room.dimensions.w;
    const d = room.dimensions.d;
    let h = room.dimensions.h;
    if (roomType === 0)
        h = 4; // Smaller, cocoon-like
    if (roomType === 1)
        h = 6; // Taller ceiling
    if (roomType === 2)
        h = 5; // Imagination
    return (_jsxs("group", { position: [room.position.x, room.position.y, room.position.z], children: [roomType === 0 && _jsx(ComfortRoom, { w: w, d: d, h: h }), roomType === 1 && _jsx(ClarityRoom, { w: w, d: d, h: h }), roomType === 2 && _jsx(ImaginationRoom, { w: w, d: d, h: h }), _jsx(WallsWithDoors, { width: w, depth: d, height: h, doors: doors, wallColor: roomType === 0 ? "#EFE7D8" :
                    roomType === 1 ? "#F9F6F0" :
                        "#EFE7D8" // Subtle change done within Room component
             }), children] }));
}
function ComfortRoom({ w, d, h }) {
    // smaller, cocoon-like. 
    // Creamy fabric walls, warm beige sofa, floor lamp, no ceiling light.
    return (_jsxs("group", { children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [w / 2, 0, d / 2], children: [_jsx("planeGeometry", { args: [w, d] }), _jsx("meshStandardMaterial", { color: "#D9BA9B", roughness: 0.9 })] }), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], position: [w / 2, h, d / 2], children: [_jsx("planeGeometry", { args: [w, d] }), _jsx("meshStandardMaterial", { color: "#EAE0D3", roughness: 1 })] }), _jsxs("group", { position: [w / 2, 0, d / 2], children: [_jsxs("mesh", { position: [0, 0.4, 0], children: [_jsx("boxGeometry", { args: [3, 0.8, 1.2] }), _jsx("meshStandardMaterial", { color: "#D1BFAe", roughness: 1 })] }), _jsxs("mesh", { position: [0, 0.9, -0.4], children: [_jsx("boxGeometry", { args: [3, 1, 0.4] }), _jsx("meshStandardMaterial", { color: "#D1BFAe", roughness: 1 })] })] }), _jsxs("group", { position: [w / 2 - 2, 0, d / 2 - 1], children: [_jsxs("mesh", { position: [0, 1, 0], children: [_jsx("cylinderGeometry", { args: [0.05, 0.05, 2] }), _jsx("meshStandardMaterial", { color: "#888", roughness: 0.5 })] }), _jsxs("mesh", { position: [0, 2, 0], children: [_jsx("cylinderGeometry", { args: [0.3, 0.4, 0.6] }), _jsx("meshStandardMaterial", { color: "#FFF1E6", roughness: 1, transparent: true, opacity: 0.9 })] }), _jsx("pointLight", { position: [0, 2, 0], intensity: 3, color: "#FFD1A9", distance: 10 })] }), _jsx("rectAreaLight", { width: w, height: h, color: "#FFD1A9", intensity: 2, position: [w / 2, h - 0.5, d - 0.5], rotation: [-Math.PI / 2, 0, 0] })] }));
}
function ClarityRoom({ w, d, h }) {
    // taller ceiling, plaster walls, long wooden desk lit from below, large frosted window
    return (_jsxs("group", { children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [w / 2, 0, d / 2], children: [_jsx("planeGeometry", { args: [w, d] }), _jsx("meshStandardMaterial", { color: "#E8DACB", roughness: 0.8 })] }), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], position: [w / 2, h, d / 2], children: [_jsx("planeGeometry", { args: [w, d] }), _jsx("meshStandardMaterial", { color: "#F9F6F0", roughness: 1 })] }), _jsxs("group", { position: [w / 2, 1.2, d / 2 + 1], children: [_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [4, 0.1, 1] }), _jsx("meshStandardMaterial", { color: "#BCA38F", roughness: 0.7 })] }), _jsx("pointLight", { position: [0, -0.5, 0], intensity: 2, color: "#FFF5E1", distance: 5 })] }), _jsxs("mesh", { position: [w / 2, h / 2, 0.05], children: [_jsx("planeGeometry", { args: [w * 0.6, h * 0.5] }), _jsx("meshStandardMaterial", { color: "#FFFFFF", transparent: true, opacity: 0.6, roughness: 0.2, emissive: "#FFFFFF", emissiveIntensity: 0.5 })] }), _jsx("ambientLight", { intensity: 1.5, color: "#F0F4F8" })] }));
}
function ImaginationRoom({ w, d, h }) {
    // sloping ceiling, abstract sculptures, warm spotlights
    return (_jsxs("group", { children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [w / 2, 0, d / 2], children: [_jsx("planeGeometry", { args: [w, d] }), _jsx("meshStandardMaterial", { color: "#E5C4A0", roughness: 0.9 })] }), _jsxs("mesh", { rotation: [Math.PI / 2, -Math.PI / 12, 0], position: [w / 2, h, d / 2], children: [_jsx("planeGeometry", { args: [w, d + 2] }), _jsx("meshStandardMaterial", { color: "#FADBD8", roughness: 1 })] }), _jsxs("group", { position: [w / 2 + 1, 1.5, d / 2 - 1], children: [_jsxs("mesh", { rotation: [Math.PI / 4, Math.PI / 4, 0], children: [_jsx("torusGeometry", { args: [0.5, 0.1, 16, 32] }), _jsx("meshStandardMaterial", { color: "#D4A373", roughness: 0.4, metalness: 0.6 })] }), _jsxs("mesh", { rotation: [-Math.PI / 4, 0, Math.PI / 4], position: [0.2, 0.3, 0], children: [_jsx("octahedronGeometry", { args: [0.4] }), _jsx("meshStandardMaterial", { color: "#FAEDCD", roughness: 0.2 })] })] }), _jsx("spotLight", { position: [w / 2 - 2, h - 1, d / 2], intensity: 4, color: "#FFC8A2", angle: 0.5, penumbra: 1, castShadow: true }), _jsx("spotLight", { position: [w / 2 + 2, h - 1, d / 2 + 1], intensity: 3, color: "#FFDAB9", angle: 0.6, penumbra: 1, castShadow: true })] }));
}
