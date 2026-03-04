import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FirstPersonControls } from '../navigation/FirstPersonControls';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { Corridor } from './Corridor';
import { Artifact } from '../artifacts/Artifact';
import { ArtifactTooltip } from '../artifacts/ArtifactTooltip';
import { usePalaceStore } from '../../stores/palaceStore';
import { useCameraStore } from '../../stores/cameraStore';
const CANVAS_STYLE = {
    position: 'fixed',
    inset: 0,
    background: '#060614',
};
const WALL_CYCLE = ['north', 'east', 'south', 'west'];
export function PalaceCanvas({ onArtifactClick }) {
    const { palace, layout, rooms, artifacts } = usePalaceStore();
    const [hoveredArtifact, setHoveredArtifact] = useState(null);
    // Show nothing until the palace record itself exists (very brief flash at most)
    if (!palace) {
        return _jsx("div", { style: CANVAS_STYLE });
    }
    // layout may be null if the palace was just created (no rooms yet) — render the
    // lobby anyway so the user never sees a black void.
    let lobbyDoors = layout?.lobbyDoors ?? [];
    // Auto-generate lobby doors when the layout has none but rooms exist.
    // This handles the common case where rooms were seeded but lobbyDoors
    // weren't written back to the layout document.
    if (lobbyDoors.length === 0 && rooms.length > 0) {
        lobbyDoors = rooms.map((room, i) => ({
            roomId: room.id,
            wallPosition: WALL_CYCLE[i % WALL_CYCLE.length],
            doorIndex: Math.floor(i / WALL_CYCLE.length),
        }));
    }
    return (_jsxs(Canvas, { style: CANVAS_STYLE, camera: { fov: 75, near: 0.1, far: 500, position: [6, 1.7, 6] }, shadows: true, gl: { antialias: true }, children: [_jsx("fog", { attach: "fog", args: ['#060614', 20, 80] }), _jsxs(Suspense, { fallback: null, children: [_jsx(Lobby, { lobbyDoors: lobbyDoors, rooms: rooms, onEnterRoom: (roomId) => {
                            const state = usePalaceStore.getState();
                            state.setCurrentRoomId(roomId);
                            const targetRoom = state.rooms.find(r => r.id === roomId);
                            if (targetRoom) {
                                useCameraStore.getState().teleport({
                                    x: targetRoom.position.x + targetRoom.dimensions.w / 2, // Centre of the room
                                    y: targetRoom.position.y,
                                    z: targetRoom.position.z + targetRoom.dimensions.d - 1 // Near the door inside
                                });
                            }
                        } }), rooms.map((room, index) => {
                        const doors = (room.connections ?? []).map((targetId, i) => ({
                            wall: 'north',
                            index: i,
                            targetRoomId: targetId,
                        }));
                        const roomArtifacts = artifacts[room.id] ?? [];
                        return (_jsx(Room, { room: room, index: index, doors: doors, children: roomArtifacts.map((artifact) => (_jsx(Artifact, { artifact: artifact, onClick: onArtifactClick, onHover: setHoveredArtifact }, artifact.id))) }, room.id));
                    }), hoveredArtifact && _jsx(ArtifactTooltip, { artifact: hoveredArtifact }), layout?.corridors?.map((c, i) => {
                        const from = rooms.find((r) => r.id === c.fromRoomId)?.position;
                        const to = rooms.find((r) => r.id === c.toRoomId)?.position;
                        if (!from || !to)
                            return null;
                        return _jsx(Corridor, { from: from, to: to }, i);
                    })] }), _jsx(FirstPersonControls, {})] }));
}
