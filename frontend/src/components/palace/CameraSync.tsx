import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type * as THREE from 'three';

/** Mutable singleton shared between CameraSync (inside Canvas) and ArtifactConnectionLines (outside). */
export const cameraSync = {
  camera: null as THREE.Camera | null,
  leftOffset: 0,
};

/** Mounted inside <Canvas>. Keeps cameraSync.camera pointing at the live Three.js camera. */
export function CameraSync({ leftOffset }: { leftOffset: number }) {
  const { camera } = useThree();
  useEffect(() => {
    cameraSync.camera = camera;
  }, [camera]);
  // leftOffset can change without a camera change, so assign every render
  cameraSync.leftOffset = leftOffset;
  return null;
}
