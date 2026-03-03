import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { AABB } from '../types/three';

interface UseNavigationOptions {
  /** Bounding boxes to collide against (walls, room bounds). */
  colliders?: AABB[];
  onRoomChange?: (roomId: string | null) => void;
}

export function useNavigation({ colliders = [], onRoomChange }: UseNavigationOptions = {}) {
  const positionRef = useRef(new THREE.Vector3());

  /** AABB collision check — prevent moving into walls. */
  const isColliding = useCallback(
    (next: THREE.Vector3, radius = 0.4): boolean => {
      return colliders.some(
        (box) =>
          next.x + radius > box.minX &&
          next.x - radius < box.maxX &&
          next.z + radius > box.minZ &&
          next.z - radius < box.maxZ,
      );
    },
    [colliders],
  );

  const updatePosition = useCallback(
    (pos: THREE.Vector3) => {
      positionRef.current.copy(pos);
    },
    [],
  );

  /** Check if camera has crossed a room threshold and trigger onRoomChange. */
  const checkRoomTransition = useCallback(
    (roomBounds: Array<{ roomId: string; bounds: AABB }>) => {
      const pos = positionRef.current;
      for (const { roomId, bounds } of roomBounds) {
        if (
          pos.x > bounds.minX &&
          pos.x < bounds.maxX &&
          pos.z > bounds.minZ &&
          pos.z < bounds.maxZ
        ) {
          onRoomChange?.(roomId);
          return;
        }
      }
      onRoomChange?.(null);
    },
    [onRoomChange],
  );

  return { positionRef, isColliding, updatePosition, checkRoomTransition };
}
