import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Corridor({ from, to }) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const midX = (from.x + to.x) / 2;
    const midZ = (from.z + to.z) / 2;
    return (_jsxs("group", { position: [midX, 0, midZ], rotation: [0, angle, 0], children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.01, 0], children: [_jsx("planeGeometry", { args: [2, length] }), _jsx("meshStandardMaterial", { color: "#D9BA9B", roughness: 0.8 })] }), _jsxs("mesh", { position: [-1, 2, 0], children: [_jsx("boxGeometry", { args: [0.1, 4, length] }), _jsx("meshStandardMaterial", { color: "#F3EBE1", roughness: 0.9 })] }), _jsxs("mesh", { position: [1, 2, 0], children: [_jsx("boxGeometry", { args: [0.1, 4, length] }), _jsx("meshStandardMaterial", { color: "#F3EBE1", roughness: 0.9 })] }), _jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 4, 0], children: [_jsx("planeGeometry", { args: [2, length] }), _jsx("meshStandardMaterial", { color: "#F9F6F0", roughness: 1 })] }), _jsx("pointLight", { position: [0, 3.5, 0], intensity: 2, color: "#FFF5E1", distance: 10, decay: 2 })] }));
}
