import type { Room } from '../../types/palace';

export const TILE_SIZE = 120; // px per 30-unit grid cell
export const HEIGHT_SCALE = 40; // px per y-unit of elevation
export const PLATFORM_W = 110;
export const PLATFORM_D = 110;
export const PLATFORM_H = 24;

export interface IsoPosition {
  cx: number; // isometric X offset (right-down diagonal)
  cy: number; // isometric Y offset (left-down diagonal)
  cz: number; // elevation (up)
}

/** Convert room 3D position to isometric CSS translation offsets */
export function roomToIsoPosition(room: Room, syntheticElevation: number): IsoPosition {
  const cx = (room.position.x / 30) * TILE_SIZE;
  const cy = (room.position.z / 30) * TILE_SIZE;
  const cz = room.position.y * HEIGHT_SCALE + syntheticElevation;
  return { cx, cy, cz };
}

/**
 * If all rooms share y=0, assign synthetic staggered elevation
 * so platforms visually separate in z and don't overlap perfectly.
 */
export function computeSyntheticElevation(rooms: Room[]): Map<string, number> {
  const map = new Map<string, number>();
  const allSameY = rooms.every((r) => r.position.y === 0);

  if (!allSameY) {
    rooms.forEach((r) => map.set(r.id, 0));
    return map;
  }

  // Assign elevations 0, 20, 40, 0, 20, ... cycling through rooms
  // to create visual interest without a fixed grid constraint
  const steps = [0, 20, 40, 10, 30];
  rooms.forEach((r, i) => {
    map.set(r.id, steps[i % steps.length]);
  });
  return map;
}

/**
 * Compute scene offset so that the centroid of all platforms is centered
 * in the viewport before any GSAP animation.
 */
export function computeSceneOffset(
  rooms: Room[],
  syntheticElevations: Map<string, number>,
): { offsetX: number; offsetY: number } {
  if (rooms.length === 0) return { offsetX: 0, offsetY: 0 };

  const positions = rooms.map((r) => roomToIsoPosition(r, syntheticElevations.get(r.id) ?? 0));
  const avgCx = positions.reduce((s, p) => s + p.cx, 0) / positions.length;
  const avgCy = positions.reduce((s, p) => s + p.cy, 0) / positions.length;

  return { offsetX: -avgCx, offsetY: -avgCy };
}
