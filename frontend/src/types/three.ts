import type { Vector3 } from 'three';

/** World-space 3D position (metres). */
export interface ThreePosition {
  x: number;
  y: number;
  z: number;
}

/** Room bounding box (metres). */
export interface ThreeDimensions {
  w: number;
  d: number;
  h: number;
}

/** Euler angles in radians. */
export interface ThreeRotation {
  x: number;
  y: number;
  z: number;
}

/** Named wall sides used for door placement. */
export type WallSide = 'north' | 'east' | 'south' | 'west';

/** A door opening in a wall. */
export interface DoorSpec {
  wall: WallSide;
  index: number;
  targetRoomId: string;
}

/** Camera pose snapshot used for position restore. */
export interface CameraPose {
  position: Vector3;
  yaw: number;
  pitch: number;
}

/** Bounding box used for collision detection. */
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
