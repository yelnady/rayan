import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Text } from '@react-three/drei';
import { Door } from './Door';
const LOBBY_SIZE = 12;
const LOBBY_HEIGHT = 5;
// Compute door position on a wall, supporting multiple doors per wall via doorIndex.
// doorIndex=0 → centre door, doorIndex=1 → offset right, etc.
const DOOR_SPACING = 2.2; // horizontal offset between doors on the same wall
function wallDoorPosition(wall, doorIndex) {
    const offset = (doorIndex - 0) * DOOR_SPACING; // first door centred, extras shift right
    switch (wall) {
        case 'north':
            return [LOBBY_SIZE / 2 - 0.75 + offset, 0, 0.06];
        case 'south':
            return [LOBBY_SIZE / 2 - 0.75 + offset, 0, LOBBY_SIZE - 0.06];
        case 'east':
            return [LOBBY_SIZE - 0.06, 0, LOBBY_SIZE / 2 - 0.75 + offset];
        case 'west':
            return [0.06, 0, LOBBY_SIZE / 2 - 0.75 + offset];
        default:
            return [LOBBY_SIZE / 2, 0, 0];
    }
}
export function Lobby({ lobbyDoors, rooms, onEnterRoom }) {
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    return (_jsxs("group", { children: [_jsx("ambientLight", { intensity: 2.5, color: "#c8c0ff" }), _jsx("pointLight", { position: [LOBBY_SIZE / 2, LOBBY_HEIGHT - 0.4, LOBBY_SIZE / 2], intensity: 8, color: "#b8a8ff", distance: 40, decay: 2 }), _jsx("pointLight", { position: [1, 3, 1], intensity: 3, color: "#9090ff", distance: 20, decay: 2 }), _jsx("pointLight", { position: [11, 3, 1], intensity: 3, color: "#9090ff", distance: 20, decay: 2 }), _jsx("pointLight", { position: [1, 3, 11], intensity: 3, color: "#9090ff", distance: 20, decay: 2 }), _jsx("pointLight", { position: [11, 3, 11], intensity: 3, color: "#9090ff", distance: 20, decay: 2 }), _jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [LOBBY_SIZE / 2, 0, LOBBY_SIZE / 2], receiveShadow: true, children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_SIZE] }), _jsx("meshStandardMaterial", { color: "#2a2a5a", roughness: 0.5, metalness: 0.4 })] }), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], position: [LOBBY_SIZE / 2, LOBBY_HEIGHT, LOBBY_SIZE / 2], children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_SIZE] }), _jsx("meshStandardMaterial", { color: "#1a1a38" })] }), ['north', 'south'].map((side) => (_jsxs("mesh", { position: [LOBBY_SIZE / 2, LOBBY_HEIGHT / 2, side === 'north' ? 0 : LOBBY_SIZE], children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_HEIGHT] }), _jsx("meshStandardMaterial", { color: "#383870", side: 2, roughness: 0.7 })] }, side))), ['east', 'west'].map((side) => (_jsxs("mesh", { rotation: [0, Math.PI / 2, 0], position: [side === 'east' ? LOBBY_SIZE : 0, LOBBY_HEIGHT / 2, LOBBY_SIZE / 2], children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_HEIGHT] }), _jsx("meshStandardMaterial", { color: "#383870", side: 2, roughness: 0.7 })] }, side))), _jsx(Text, { position: [LOBBY_SIZE / 2, 2.2, LOBBY_SIZE - 0.1], rotation: [0, Math.PI, 0], fontSize: 0.7, color: "#d0b8ff", anchorX: "center", anchorY: "middle", outlineColor: "#6040c0", outlineWidth: 0.02, children: "Memory Palace" }), lobbyDoors.map((ld) => {
                const room = roomMap.get(ld.roomId);
                const pos = wallDoorPosition(ld.wallPosition, ld.doorIndex ?? 0);
                return (_jsx(Door, { wall: ld.wallPosition, position: pos, targetRoomName: room?.name, onEnter: () => onEnterRoom(ld.roomId) }, ld.roomId));
            })] }));
}
