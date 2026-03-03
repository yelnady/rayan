import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { FirstPersonControls } from '../navigation/FirstPersonControls';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { Corridor } from './Corridor';
import { Artifact } from '../artifacts/Artifact';
import { ArtifactTooltip } from '../artifacts/ArtifactTooltip';
import { usePalaceStore } from '../../stores/palaceStore';
const CANVAS_STYLE = {
    position: 'fixed',
    inset: 0,
    background: '#060614',
};
export function PalaceCanvas({ onArtifactClick }) {
    const { palace, layout, rooms, artifacts } = usePalaceStore();
    const [hoveredArtifact, setHoveredArtifact] = useState(null);
    if (!palace || !layout) {
        return (_jsx("div", { style: { ...CANVAS_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }, children: "Loading palace\u2026" }));
    }
    return (_jsxs(Canvas, { style: CANVAS_STYLE, camera: { fov: 75, near: 0.1, far: 500, position: [6, 1.7, 6] }, shadows: true, gl: { antialias: true }, children: [_jsx("fog", { attach: "fog", args: ['#060614', 20, 80] }), _jsxs(Suspense, { fallback: null, children: [_jsx(Lobby, { lobbyDoors: layout.lobbyDoors, rooms: rooms, onEnterRoom: (roomId) => usePalaceStore.getState().setCurrentRoomId(roomId) }), rooms.map((room) => {
                        const doors = (room.connections ?? []).map((targetId, i) => ({
                            wall: 'north',
                            index: i,
                            targetRoomId: targetId,
                        }));
                        const roomArtifacts = artifacts[room.id] ?? [];
                        return (_jsx(Room, { room: room, doors: doors, children: roomArtifacts.map((artifact) => (_jsx(Artifact, { artifact: artifact, onClick: onArtifactClick, onHover: setHoveredArtifact }, artifact.id))) }, room.id));
                    }), hoveredArtifact && _jsx(ArtifactTooltip, { artifact: hoveredArtifact }), layout.corridors?.map((c, i) => {
                        const from = rooms.find((r) => r.id === c.fromRoomId)?.position;
                        const to = rooms.find((r) => r.id === c.toRoomId)?.position;
                        if (!from || !to)
                            return null;
                        return _jsx(Corridor, { from: from, to: to }, i);
                    })] }), _jsx(FirstPersonControls, {}), import.meta.env.DEV && _jsx(Stats, {})] }));
}
