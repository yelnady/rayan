import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Corridor({ from, to, color = '#888888' }) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const midX = (from.x + to.x) / 2;
    const midZ = (from.z + to.z) / 2;
    return (_jsxs("group", { position: [midX, 0, midZ], rotation: [0, angle, 0], children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.01, 0], children: [_jsx("planeGeometry", { args: [2, length] }), _jsx("meshStandardMaterial", { color: color })] }), _jsxs("mesh", { position: [-1, 1.5, 0], children: [_jsx("boxGeometry", { args: [0.1, 3, length] }), _jsx("meshStandardMaterial", { color: color })] }), _jsxs("mesh", { position: [1, 1.5, 0], children: [_jsx("boxGeometry", { args: [0.1, 3, length] }), _jsx("meshStandardMaterial", { color: color })] }), _jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 3, 0], children: [_jsx("planeGeometry", { args: [2, length] }), _jsx("meshStandardMaterial", { color: color })] })] }));
}
