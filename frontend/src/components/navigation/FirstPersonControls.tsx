import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCameraStore } from '../../stores/cameraStore';

const MOVE_SPEED = 30; // Base acceleration
const MAX_VELOCITY = 6; // Used for FOV scaling
const CAMERA_HEIGHT = 1.7; // metres
const SPAWN = new THREE.Vector3(6, CAMERA_HEIGHT, 6); // lobby start position
const DEFAULT_FOV = 75;
const MAX_SPEED_FOV_BOOST = 10;
const DAMPING = 8.0; // Friction

interface FirstPersonControlsProps {
  /** Called every frame with the current world position */
  onPositionChange?: (pos: THREE.Vector3) => void;
}

export function FirstPersonControls({ onPositionChange }: FirstPersonControlsProps) {
  const { camera } = useThree();
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const bobTimer = useRef(0);
  const controlsRef = useRef<any>(null);

  // Set initial camera position and force look-direction to straight-ahead (-Z)
  useEffect(() => {
    camera.position.copy(SPAWN);
    camera.lookAt(SPAWN.x, SPAWN.y, SPAWN.z - 1); // look toward -Z (straight into the lobby)
    (camera as THREE.PerspectiveCamera).fov = DEFAULT_FOV;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera]);

  // ── Reset view whenever resetToken is bumped ─────────────────────────────────
  const resetToken = useCameraStore((s) => s.resetToken);
  useEffect(() => {
    if (resetToken === 0) return; // skip initial mount
    camera.position.copy(SPAWN);
    camera.lookAt(SPAWN.x, SPAWN.y, SPAWN.z - 1);
    (camera as THREE.PerspectiveCamera).fov = DEFAULT_FOV;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    velocity.current.set(0, 0, 0);
  }, [resetToken, camera]);

  // ── Teleport view whenever teleportToken is bumped ───────────────────────────
  const teleportToken = useCameraStore((s) => s.teleportToken);
  const teleportTarget = useCameraStore((s) => s.teleportTarget);
  useEffect(() => {
    if (teleportToken === 0 || !teleportTarget) return;
    camera.position.set(teleportTarget.x, CAMERA_HEIGHT, teleportTarget.z);
    camera.lookAt(teleportTarget.x, CAMERA_HEIGHT, teleportTarget.z - 1);
    velocity.current.set(0, 0, 0);
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

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Initial click to lock on the body instead of canvas, allowing better capture
    function onClick() {
      if (controlsRef.current && !controlsRef.current.isLocked) {
        controlsRef.current.lock();
      }
    }
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('click', onClick);
    };
  }, []);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (!controlsRef.current.isLocked) {
      // Only apply damping if not locked, to glide to a stop instead of instant stop
      velocity.current.x -= velocity.current.x * DAMPING * delta;
      velocity.current.z -= velocity.current.z * DAMPING * delta;
    } else {
      const { w, a, s, d } = keysRef.current;

      // Apply damping (friction)
      velocity.current.x -= velocity.current.x * DAMPING * delta;
      velocity.current.z -= velocity.current.z * DAMPING * delta;

      // Calculate direction along X and Z
      direction.current.z = Number(w) - Number(s);
      direction.current.x = Number(d) - Number(a);
      direction.current.normalize(); // Ensure consistent diagonal movement

      // Apply acceleration based on input keys
      if (w || s) velocity.current.z -= direction.current.z * MOVE_SPEED * delta;
      if (a || d) velocity.current.x -= direction.current.x * MOVE_SPEED * delta;
    }

    // Apply velocity to controls (moves camera in its local horizontal space)
    controlsRef.current.moveRight(-velocity.current.x * delta);
    controlsRef.current.moveForward(-velocity.current.z * delta);

    // Force camera vertical position to account for bobbing
    const speed = Math.sqrt(velocity.current.x ** 2 + velocity.current.z ** 2);

    // threshold for applying bobbing (prevents micro bobbing when nearly stopped)
    if (speed > 0.5) {
      bobTimer.current += delta * speed * 2.5;
      camera.position.y = CAMERA_HEIGHT + Math.sin(bobTimer.current) * 0.05;
    } else {
      // Smoothly return to center height
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, CAMERA_HEIGHT, delta * 5);
      bobTimer.current = 0; // reset phase when stopped
    }

    // Dynamic FOV based on speed
    const targetFov = DEFAULT_FOV + Math.min(speed / MAX_VELOCITY, 1.0) * MAX_SPEED_FOV_BOOST;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, delta * 5);
    cam.updateProjectionMatrix();

    onPositionChange?.(camera.position);
  });

  return <PointerLockControls ref={controlsRef} selector="#root" />;
}
