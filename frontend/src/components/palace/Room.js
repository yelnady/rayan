import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEMES } from '../../config/themes';
import { WallsWithDoors } from './WallsWithDoors';
import { Lighting } from './Lighting';
export function Room({ room, doors = [], children }) {
    const { w, d, h } = room.dimensions;
    const theme = THEMES[room.style];
    return (_jsxs("group", { position: [room.position.x, room.position.y, room.position.z], children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [w / 2, 0, d / 2], receiveShadow: true, children: [_jsx("planeGeometry", { args: [w, d] }), _jsx("meshStandardMaterial", { color: theme.lightColor, roughness: 0.8, metalness: 0.1 })] }), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], position: [w / 2, h, d / 2], children: [_jsx("planeGeometry", { args: [w, d] }), _jsx("meshStandardMaterial", { color: "#1a1a2e", roughness: 1 })] }), _jsx(WallsWithDoors, { width: w, depth: d, height: h, doors: doors, wallColor: "#2a2a4a" }), _jsx(Lighting, { theme: theme, roomWidth: w, roomHeight: h, roomDepth: d }), children] }));
}
