import { useCallback, useRef } from 'react';
import * as THREE from 'three';
export function useNavigation({ colliders = [], onRoomChange } = {}) {
    const positionRef = useRef(new THREE.Vector3());
    /** AABB collision check — prevent moving into walls. */
    const isColliding = useCallback((next, radius = 0.4) => {
        return colliders.some((box) => next.x + radius > box.minX &&
            next.x - radius < box.maxX &&
            next.z + radius > box.minZ &&
            next.z - radius < box.maxZ);
    }, [colliders]);
    const updatePosition = useCallback((pos) => {
        positionRef.current.copy(pos);
    }, []);
    /** Check if camera has crossed a room threshold and trigger onRoomChange. */
    const checkRoomTransition = useCallback((roomBounds) => {
        const pos = positionRef.current;
        for (const { roomId, bounds } of roomBounds) {
            if (pos.x > bounds.minX &&
                pos.x < bounds.maxX &&
                pos.z > bounds.minZ &&
                pos.z < bounds.maxZ) {
                onRoomChange?.(roomId);
                return;
            }
        }
        onRoomChange?.(null);
    }, [onRoomChange]);
    return { positionRef, isColliding, updatePosition, checkRoomTransition };
}
