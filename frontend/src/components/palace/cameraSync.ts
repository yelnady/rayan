import type * as THREE from 'three';

/** Mutable singleton shared between CameraSync (inside Canvas) and ArtifactConnectionLines (outside). */
export const cameraSync = {
  camera: null as THREE.Camera | null,
  leftOffset: 0,
};
