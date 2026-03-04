import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore } from '../../stores/cameraStore';

const MOVE_SPEED = 5; // m/s
const CAMERA_HEIGHT = 1.7; // metres
const SPAWN = new THREE.Vector3(6, CAMERA_HEIGHT, 6); // lobby start position
const DEFAULT_FOV = 75;
const MIN_FOV = 20;
const MAX_FOV = 100;

interface FirstPersonControlsProps {
  /** Called every frame with the current world position */
  onPositionChange?: (pos: THREE.Vector3) => void;
}

export function FirstPersonControls({ onPositionChange }: FirstPersonControlsProps) {
  const { camera, gl } = useThree();
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const isDragging = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  // Set initial camera position and force look-direction to straight-ahead (-Z)
  useEffect(() => {
    camera.position.copy(SPAWN);
    euler.current.set(0, 0, 0); // look toward -Z (straight into the lobby)
    camera.quaternion.setFromEuler(euler.current);
    (camera as THREE.PerspectiveCamera).fov = DEFAULT_FOV;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera]);

  // ── Reset view whenever resetToken is bumped ─────────────────────────────────
  const resetToken = useCameraStore((s) => s.resetToken);
  useEffect(() => {
    if (resetToken === 0) return; // skip initial mount
    camera.position.copy(SPAWN);
    euler.current.set(0, 0, 0);
    camera.quaternion.setFromEuler(euler.current);
    (camera as THREE.PerspectiveCamera).fov = DEFAULT_FOV;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [resetToken, camera]);

  // ── Teleport view whenever teleportToken is bumped ───────────────────────────
  const teleportToken = useCameraStore((s) => s.teleportToken);
  const teleportTarget = useCameraStore((s) => s.teleportTarget);
  useEffect(() => {
    if (teleportToken === 0 || !teleportTarget) return;
    camera.position.set(teleportTarget.x, CAMERA_HEIGHT, teleportTarget.z);
    euler.current.set(0, 0, 0); // optional: reset look direction, or you can point towards center
    camera.quaternion.setFromEuler(euler.current);
  }, [teleportToken, teleportTarget, camera]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keysRef.current.w = true;
      if (k === 'a' || k === 'arrowleft') keysRef.current.a = true;
      if (k === 's' || k === 'arrowdown') keysRef.current.s = true;
      if (k === 'd' || k === 'arrowright') keysRef.current.d = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keysRef.current.w = false;
      if (k === 'a' || k === 'arrowleft') keysRef.current.a = false;
      if (k === 's' || k === 'arrowdown') keysRef.current.s = false;
      if (k === 'd' || k === 'arrowright') keysRef.current.d = false;
    }

    // Drag-to-look handlers
    // Note: we do NOT use setPointerCapture here. setPointerCapture routes all
    // future pointer events to this element, which prevents Three.js's raycaster
    // from resolving onClick on 3D meshes (like doors). Instead we track dragging
    // manually and use a movement threshold to distinguish clicks from drags.
    let totalMovement = 0;
    function onPointerDown(e: PointerEvent) {
      console.log(`[Controls] Pointer Down: button=${e.button}, target=${(e.target as any)?.tagName}`);
      if (e.button === 0) {
        isDragging.current = false; // will only become true after movement threshold
        totalMovement = 0;
      }
    }
    function onPointerUp(_e: PointerEvent) {
      isDragging.current = false;
      totalMovement = 0;
    }
    function onPointerMove(e: PointerEvent) {
      if (e.buttons !== 1) return; // left button must be held

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      totalMovement += Math.abs(movementX) + Math.abs(movementY);

      // Only start rotating after 8px of movement (avoids eating click events on artifacts)
      if (totalMovement < 8) return;
      isDragging.current = true;

      euler.current.y -= movementX * 0.002;
      euler.current.x -= movementY * 0.002;

      // Clamp vertical look to not break your neck
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));

      camera.quaternion.setFromEuler(euler.current);
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const cam = camera as THREE.PerspectiveCamera;
      cam.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, cam.fov + e.deltaY * 0.05));
      cam.updateProjectionMatrix();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);

      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl]);

  const dirVec = useRef(new THREE.Vector3());
  const sideVec = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const { w, a, s, d } = keysRef.current;
    if (!w && !a && !s && !d) return;

    // Forward direction (ignore vertical component)
    camera.getWorldDirection(dirVec.current);
    dirVec.current.y = 0;
    dirVec.current.normalize();

    sideVec.current.crossVectors(dirVec.current, new THREE.Vector3(0, 1, 0));

    const speed = MOVE_SPEED * delta;
    if (w) camera.position.addScaledVector(dirVec.current, speed);
    if (s) camera.position.addScaledVector(dirVec.current, -speed);
    if (d) camera.position.addScaledVector(sideVec.current, speed);
    if (a) camera.position.addScaledVector(sideVec.current, -speed);

    // Lock vertical height
    camera.position.y = CAMERA_HEIGHT;

    onPositionChange?.(camera.position);
  });

  return null;
}
