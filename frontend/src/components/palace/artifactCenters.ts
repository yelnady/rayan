import * as THREE from 'three';

/**
 * World-space visual center for each artifact, keyed by artifactId.
 * Populated by artifact renderers (BookInstancedRenderer, Artifact) in useFrame
 * after the first render so world matrices are up to date.
 * Read by ArtifactConnectionLines to anchor dots at the true model center.
 */
export const artifactCenters = new Map<string, THREE.Vector3>();

const _box = new THREE.Box3();
const _vec = new THREE.Vector3();

export function registerArtifactCenter(id: string, object: THREE.Object3D): void {
  _box.setFromObject(object);
  if (_box.isEmpty()) return;
  _box.getCenter(_vec);
  const existing = artifactCenters.get(id);
  if (existing) {
    existing.copy(_vec);
  } else {
    artifactCenters.set(id, _vec.clone());
  }
}
