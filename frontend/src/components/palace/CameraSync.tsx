import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { cameraSync } from './cameraSync';

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
