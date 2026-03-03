import { useMemo } from 'react';
import * as THREE from 'three';
import type { DoorSpec, WallSide } from '../../types/three';

const DOOR_WIDTH = 1.5;
const DOOR_HEIGHT = 2.5;

interface WallsWithDoorsProps {
  width: number;
  depth: number;
  height: number;
  doors: DoorSpec[];
  wallColor?: string;
}

function buildWallShape(wallLength: number, wallHeight: number, doorSpecs: DoorSpec[]): THREE.Shape {
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

interface WallProps {
  shape: THREE.Shape;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

function Wall({ shape, position, rotation, color }: WallProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.ShapeGeometry(shape);
    return geo;
  }, [shape]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function WallsWithDoors({
  width,
  depth,
  height,
  doors,
  wallColor = '#aaaaaa',
}: WallsWithDoorsProps) {
  const doorsPerWall = useMemo(() => {
    const map: Record<WallSide, DoorSpec[]> = { north: [], east: [], south: [], west: [] };
    doors.forEach((d) => map[d.wall].push(d));
    return map;
  }, [doors]);

  const walls = useMemo(
    () => [
      {
        side: 'north' as WallSide,
        shape: buildWallShape(width, height, doorsPerWall.north),
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
      {
        side: 'south' as WallSide,
        shape: buildWallShape(width, height, doorsPerWall.south),
        position: [0, 0, depth] as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number],
      },
      {
        side: 'east' as WallSide,
        shape: buildWallShape(depth, height, doorsPerWall.east),
        position: [width, 0, depth] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
      },
      {
        side: 'west' as WallSide,
        shape: buildWallShape(depth, height, doorsPerWall.west),
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
      },
    ],
    [width, depth, height, doorsPerWall],
  );

  return (
    <>
      {walls.map((w) => (
        <Wall
          key={w.side}
          shape={w.shape}
          position={w.position}
          rotation={w.rotation}
          color={wallColor}
        />
      ))}
    </>
  );
}
