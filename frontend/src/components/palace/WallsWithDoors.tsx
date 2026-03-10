import { useMemo } from 'react';
import * as THREE from 'three';
import type { DoorSpec, WallSide } from '../../types/three';

// 4-step toon gradient — richer mid-tones, sharper highlight
const TOON_GRADIENT = (() => {
  const data = new Uint8Array([40, 100, 180, 240]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  return tex;
})();

const DOOR_WIDTH = 1.5;
const DOOR_HEIGHT = 2.5;
const WALL_THICKNESS = 0.55;

interface WallsWithDoorsProps {
  width: number;
  depth: number;
  height: number;
  doors: DoorSpec[];
  wallColor?: string;
  /** Accent color applied to the north (back/facing) wall only */
  accentWallColor?: string;
}

interface WallSegment {
  position: [number, number, number];
  scale: [number, number, number];
}

/**
 * Builds the BoxGeometry segments for a single wall, leaving gaps for doors.
 * The wall starts at x=0 and extends to x=wallLength along the local X axis.
 * It is positioned such that its inner face is at z=0 and its outer face is at z=-thickness.
 */
function buildWallSegments(wallLength: number, wallHeight: number, doorSpecs: DoorSpec[]): WallSegment[] {
  const segments: WallSegment[] = [];

  // Sort doors by position along the wall
  const sortedDoors = [...doorSpecs].sort((a, b) => a.index - b.index);

  let currentX = 0;

  // Create solid wall segments between doors
  sortedDoors.forEach((d) => {
    // Offset calculation matches original ShapeGeometry logic
    const centerOffset = (d.index + 1) * (wallLength / (doorSpecs.length + 1));
    const doorStartX = centerOffset - DOOR_WIDTH / 2;
    const doorEndX = centerOffset + DOOR_WIDTH / 2;

    // 1. Bottom-to-top segment *before* the door
    if (doorStartX > currentX) {
      const segWidth = doorStartX - currentX;
      segments.push({
        position: [currentX + segWidth / 2, wallHeight / 2, -WALL_THICKNESS / 2],
        scale: [segWidth, wallHeight, WALL_THICKNESS],
      });
    }

    // 2. Top segment *above* the door
    if (wallHeight > DOOR_HEIGHT) {
      const topHeight = wallHeight - DOOR_HEIGHT;
      segments.push({
        position: [currentX + DOOR_WIDTH / 2 + (doorStartX - currentX), DOOR_HEIGHT + topHeight / 2, -WALL_THICKNESS / 2],
        scale: [DOOR_WIDTH, topHeight, WALL_THICKNESS],
      });
    }

    currentX = doorEndX;
  });

  // 3. Final segment after the last door (or full wall if no doors)
  if (currentX < wallLength) {
    const segWidth = wallLength - currentX;
    segments.push({
      position: [currentX + segWidth / 2, wallHeight / 2, -WALL_THICKNESS / 2],
      scale: [segWidth, wallHeight, WALL_THICKNESS],
    });
  }

  return segments;
}

interface WallProps {
  segments: WallSegment[];
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

function Wall({ segments, position, rotation, color }: WallProps) {
  const material = useMemo(
    () => new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRADIENT }),
    [color],
  );
  return (
    <group position={position} rotation={rotation}>
      {segments.map((seg, i) => (
        <mesh key={i} position={seg.position} material={material}>
          <boxGeometry args={seg.scale} />
        </mesh>
      ))}
    </group>
  );
}

export function WallsWithDoors({
  width,
  depth,
  height,
  doors,
  wallColor = '#C4B5FD',
  accentWallColor,
}: WallsWithDoorsProps) {
  const accent = accentWallColor ?? wallColor;
  const doorsPerWall = useMemo(() => {
    const map: Record<WallSide, DoorSpec[]> = { north: [], east: [], south: [], west: [] };
    doors.forEach((d) => map[d.wall].push(d));
    return map;
  }, [doors]);

  const walls = useMemo(
    () => [
      {
        side: 'north' as WallSide,
        color: accent,
        segments: buildWallSegments(width, height, doorsPerWall.north),
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
      {
        side: 'south' as WallSide,
        color: wallColor,
        segments: buildWallSegments(width, height, doorsPerWall.south),
        position: [width, 0, depth] as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number],
      },
      {
        side: 'east' as WallSide,
        color: wallColor,
        segments: buildWallSegments(depth, height, doorsPerWall.east),
        position: [width, 0, 0] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
      },
      {
        side: 'west' as WallSide,
        color: wallColor,
        segments: buildWallSegments(depth, height, doorsPerWall.west),
        position: [0, 0, depth] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
      },
    ],
    [width, depth, height, doorsPerWall, wallColor, accent],
  );

  const ceilingMaterial = useMemo(
    () => new THREE.MeshToonMaterial({ color: wallColor, gradientMap: TOON_GRADIENT }),
    [wallColor],
  );

  return (
    <>
      {walls.map((w) => (
        <Wall key={w.side} segments={w.segments} position={w.position} rotation={w.rotation} color={w.color} />
      ))}
      <mesh position={[width / 2, height + WALL_THICKNESS / 2, depth / 2]} material={ceilingMaterial}>
        <boxGeometry args={[width + WALL_THICKNESS * 2, WALL_THICKNESS, depth + WALL_THICKNESS * 2]} />
      </mesh>
    </>
  );
}
