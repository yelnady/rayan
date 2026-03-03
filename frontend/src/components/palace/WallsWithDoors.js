import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import * as THREE from 'three';
const DOOR_WIDTH = 1.5;
const DOOR_HEIGHT = 2.5;
function buildWallShape(wallLength, wallHeight, doorSpecs) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(wallLength, 0);
    shape.lineTo(wallLength, wallHeight);
    shape.lineTo(0, wallHeight);
    shape.lineTo(0, 0);
    // Cut a hole for each door on this wall
    doorSpecs.forEach((d) => {
        const offset = (d.index + 1) * (wallLength / (doorSpecs.length + 1));
        const dx = offset - DOOR_WIDTH / 2;
        const hole = new THREE.Path();
        hole.moveTo(dx, 0);
        hole.lineTo(dx + DOOR_WIDTH, 0);
        hole.lineTo(dx + DOOR_WIDTH, DOOR_HEIGHT);
        hole.lineTo(dx, DOOR_HEIGHT);
        hole.lineTo(dx, 0);
        shape.holes.push(hole);
    });
    return shape;
}
function Wall({ shape, position, rotation, color }) {
    const geometry = useMemo(() => {
        const geo = new THREE.ShapeGeometry(shape);
        return geo;
    }, [shape]);
    return (_jsx("mesh", { geometry: geometry, position: position, rotation: rotation, children: _jsx("meshStandardMaterial", { color: color, side: THREE.DoubleSide }) }));
}
export function WallsWithDoors({ width, depth, height, doors, wallColor = '#aaaaaa', }) {
    const doorsPerWall = useMemo(() => {
        const map = { north: [], east: [], south: [], west: [] };
        doors.forEach((d) => map[d.wall].push(d));
        return map;
    }, [doors]);
    const walls = useMemo(() => [
        {
            side: 'north',
            shape: buildWallShape(width, height, doorsPerWall.north),
            position: [0, 0, 0],
            rotation: [0, 0, 0],
        },
        {
            side: 'south',
            shape: buildWallShape(width, height, doorsPerWall.south),
            position: [0, 0, depth],
            rotation: [0, Math.PI, 0],
        },
        {
            side: 'east',
            shape: buildWallShape(depth, height, doorsPerWall.east),
            position: [width, 0, depth],
            rotation: [0, -Math.PI / 2, 0],
        },
        {
            side: 'west',
            shape: buildWallShape(depth, height, doorsPerWall.west),
            position: [0, 0, 0],
            rotation: [0, Math.PI / 2, 0],
        },
    ], [width, depth, height, doorsPerWall]);
    return (_jsx(_Fragment, { children: walls.map((w) => (_jsx(Wall, { shape: w.shape, position: w.position, rotation: w.rotation, color: wallColor }, w.side))) }));
}
