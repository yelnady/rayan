import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Text } from '@react-three/drei';
import { Door } from './Door';
const LOBBY_SIZE = 12;
const LOBBY_HEIGHT = 5;
// Map wall positions to world door positions
const WALL_DOOR_POSITION = {
    north: [LOBBY_SIZE / 2 - 0.75, 0, 0],
    south: [LOBBY_SIZE / 2 - 0.75, 0, LOBBY_SIZE],
    east: [LOBBY_SIZE - 0.06, 0, LOBBY_SIZE / 2 - 0.75],
    west: [0, 0, LOBBY_SIZE / 2 - 0.75],
};
export function Lobby({ lobbyDoors, rooms, onEnterRoom }) {
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    return (_jsxs("group", { children: [_jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [LOBBY_SIZE / 2, 0, LOBBY_SIZE / 2], receiveShadow: true, children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_SIZE] }), _jsx("meshStandardMaterial", { color: "#1e1e3a", roughness: 0.6, metalness: 0.3 })] }), _jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], position: [LOBBY_SIZE / 2, LOBBY_HEIGHT, LOBBY_SIZE / 2], children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_SIZE] }), _jsx("meshStandardMaterial", { color: "#0d0d1a" })] }), ['north', 'south'].map((side) => (_jsxs("mesh", { position: [LOBBY_SIZE / 2, LOBBY_HEIGHT / 2, side === 'north' ? 0 : LOBBY_SIZE], children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_HEIGHT] }), _jsx("meshStandardMaterial", { color: "#252540", side: 2 })] }, side))), ['east', 'west'].map((side) => (_jsxs("mesh", { rotation: [0, Math.PI / 2, 0], position: [side === 'east' ? LOBBY_SIZE : 0, LOBBY_HEIGHT / 2, LOBBY_SIZE / 2], children: [_jsx("planeGeometry", { args: [LOBBY_SIZE, LOBBY_HEIGHT] }), _jsx("meshStandardMaterial", { color: "#252540", side: 2 })] }, side))), _jsx(Text, { position: [LOBBY_SIZE / 2, LOBBY_HEIGHT - 0.5, LOBBY_SIZE / 2], fontSize: 0.5, color: "#c0a0ff", anchorX: "center", anchorY: "middle", children: "Memory Palace" }), _jsx("ambientLight", { intensity: 0.4, color: "#8080ff" }), _jsx("pointLight", { position: [LOBBY_SIZE / 2, LOBBY_HEIGHT - 0.5, LOBBY_SIZE / 2], intensity: 1.2, color: "#a090ff", distance: 20 }), lobbyDoors.map((ld) => {
                const room = roomMap.get(ld.roomId);
                const pos = WALL_DOOR_POSITION[ld.wallPosition];
                if (!pos)
                    return null;
                return (_jsx(Door, { wall: ld.wallPosition, position: pos, targetRoomName: room?.name, onEnter: () => onEnterRoom(ld.roomId) }, ld.roomId));
            })] }));
}
