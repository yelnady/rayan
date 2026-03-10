import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore } from '../../stores/cameraStore';
import { usePalaceStore } from '../../stores/palaceStore';

const LOBBY_SIZE = 12;
const WALL_MARGIN = 0.5; // camera stays this far from each wall

const MOVE_SPEED = 30;
const MAX_VELOCITY = 6;
const CAMERA_HEIGHT = 1.7;
const SPAWN = new THREE.Vector3(6, CAMERA_HEIGHT, 6);
const DEFAULT_FOV = 75;
const MAX_SPEED_FOV_BOOST = 10;
const DAMPING = 8.0;
const MOUSE_SENSITIVITY = 0.002;

interface FirstPersonControlsProps {
    onPositionChange?: (pos: THREE.Vector3) => void;
}

export function FirstPersonControls({ onPositionChange }: FirstPersonControlsProps) {
    const { camera, gl } = useThree();
    const keysRef = useRef({ w: false, a: false, s: false, d: false });
    const isOverviewMode = useCameraStore((s) => s.isOverviewMode);
    const currentRoomId = usePalaceStore((s) => s.currentRoomId);
    const rooms = usePalaceStore((s) => s.rooms);
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const bobTimer = useRef(0);

    // Mouse-drag look state (right-click drag)
    const isDragging = useRef(false);
    const yaw = useRef(Math.PI); // start looking toward -Z (into the lobby)
    const pitch = useRef(0);

    // Cinematic fly-to state
    const isCinematic = useRef(false);
    const cinematicDest = useRef(new THREE.Vector3());
    const cinematicYaw = useRef(0);
    const cinematicPitch = useRef(0);
    // Zoom state
    const zoomFov = useRef(DEFAULT_FOV);
    const MIN_FOV = 30; // Max zoom in
    const MAX_FOV = 100; // Max zoom out

    // Apply initial camera orientation
    useEffect(() => {
        (camera as THREE.PerspectiveCamera).fov = zoomFov.current;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        // yaw and pitch are already initialized correctly, so we just set camera rotation once
        camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
    }, [camera]);

    // Reset view
    const resetToken = useCameraStore((s) => s.resetToken);
    useEffect(() => {
        if (resetToken === 0) return;
        camera.position.copy(SPAWN);
        yaw.current = Math.PI;
        pitch.current = 0;
        camera.quaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0, 'YXZ'));
        zoomFov.current = DEFAULT_FOV;
        (camera as THREE.PerspectiveCamera).fov = zoomFov.current;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        velocity.current.set(0, 0, 0);
    }, [resetToken, camera]);

    // Teleport
    const teleportToken = useCameraStore((s) => s.teleportToken);
    const teleportTarget = useCameraStore((s) => s.teleportTarget);
    useEffect(() => {
        if (teleportToken === 0 || !teleportTarget) return;
        camera.position.set(teleportTarget.x, CAMERA_HEIGHT, teleportTarget.z);
        velocity.current.set(0, 0, 0);
    }, [teleportToken, teleportTarget, camera]);

    // FlyTo — smooth cinematic glide to position + face target
    const flyToToken = useCameraStore((s) => s.flyToToken);
    useEffect(() => {
        if (flyToToken === 0) return;
        const { flyToTarget } = useCameraStore.getState();
        if (!flyToTarget) return;

        const { position, lookAt: lt } = flyToTarget;
        cinematicDest.current.set(position.x, CAMERA_HEIGHT, position.z);

        const dx = lt.x - position.x;
        const dy = lt.y - CAMERA_HEIGHT;
        const dz = lt.z - position.z;
        const hdist = Math.sqrt(dx * dx + dz * dz);
        cinematicYaw.current = Math.atan2(dx, dz) + Math.PI;
        cinematicPitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, -Math.atan2(dy, hdist)));
        isCinematic.current = true;
    }, [flyToToken]);

    // LookAt — rotate camera toward a world-space position
    const lookAtToken = useCameraStore((s) => s.lookAtToken);
    const lookAtTarget = useCameraStore((s) => s.lookAtTarget);
    useEffect(() => {
        if (lookAtToken === 0 || !lookAtTarget) return;

        // T161: If we are teleporting in the same frame, use the target position 
        // for rotation math, otherwise atan2 uses the PRE-teleport lobby position.
        const currentX = teleportTarget ? teleportTarget.x : camera.position.x;
        const currentZ = teleportTarget ? teleportTarget.z : camera.position.z;

        const dx = lookAtTarget.x - currentX;
        const dy = lookAtTarget.y - camera.position.y;
        const dz = lookAtTarget.z - currentZ;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        // T163: Standard Three.js camera (0,0,0) faces -Z. 
        // Rotation PI faces +Z. So we add PI to the raw angle to face the target.
        yaw.current = Math.atan2(dx, dz) + Math.PI;
        pitch.current = Math.max(
            -Math.PI / 2 + 0.05,
            Math.min(Math.PI / 2 - 0.05, -Math.atan2(dy, horizontalDist)),
        );
        camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
    }, [lookAtToken, lookAtTarget, teleportTarget, camera]);

    // Keyboard + mouse drag listeners
    useEffect(() => {
        const canvas = gl.domElement;

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

        function onMouseDown(e: MouseEvent) {
            // Right-click or left-click on canvas to drag-look
            if (e.button === 0 || e.button === 2) {
                isDragging.current = true;
            }
        }
        function onMouseUp() {
            isDragging.current = false;
        }
        function onMouseMove(e: MouseEvent) {
            if (!isDragging.current) return;
            yaw.current -= e.movementX * MOUSE_SENSITIVITY;
            pitch.current -= e.movementY * MOUSE_SENSITIVITY;
            // Clamp pitch to avoid flipping
            pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));
        }
        function onWheel(e: WheelEvent) {
            // Scroll forward/backward — same physics as W/S arrow keys
            const SCROLL_SPEED = 0.15;
            velocity.current.z += e.deltaY * SCROLL_SPEED;
            velocity.current.z = Math.max(-MAX_VELOCITY * 2, Math.min(MAX_VELOCITY * 2, velocity.current.z));
        }
        function onContextMenu(e: Event) {
            e.preventDefault(); // suppress right-click menu on canvas
        }

        // ─── Touch Support ──────────────────────────────────────────────────────
        const touchState = {
            isRotating: false,
            lastX: 0,
            lastY: 0
        };

        function onTouchStart(e: TouchEvent) {
            // Only handle single-finger touch for rotation
            if (e.touches.length === 1) {
                touchState.isRotating = true;
                touchState.lastX = e.touches[0].clientX;
                touchState.lastY = e.touches[0].clientY;
            }
        }

        function onTouchMove(e: TouchEvent) {
            if (!touchState.isRotating || e.touches.length !== 1) return;

            const touch = e.touches[0];
            const dx = touch.clientX - touchState.lastX;
            const dy = touch.clientY - touchState.lastY;

            // Adjust sensitivity for touch (feels better slightly higher than mouse usually)
            const TOUCH_SENSITIVITY = 0.003;
            yaw.current -= dx * TOUCH_SENSITIVITY;
            pitch.current -= dy * TOUCH_SENSITIVITY;
            pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));

            touchState.lastX = touch.clientX;
            touchState.lastY = touch.clientY;
        }

        function onTouchEnd() {
            touchState.isRotating = false;
        }

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        canvas.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('wheel', onWheel, { passive: true });
        canvas.addEventListener('contextmenu', onContextMenu);

        // Mobile touch listeners
        canvas.addEventListener('touchstart', onTouchStart);
        canvas.addEventListener('touchmove', onTouchMove);
        canvas.addEventListener('touchend', onTouchEnd);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            canvas.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('contextmenu', onContextMenu);

            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
    }, [gl]);

    const mobileMovement = useCameraStore((s) => s.mobileMovement);
    const storeFov = useCameraStore((s) => s.fov);

    // Sync internal zoom ref when store FOV changes programmatically
    useEffect(() => {
        zoomFov.current = storeFov;
    }, [storeFov]);

    useFrame((_, delta) => {
        // Skip movement in overview mode
        if (isOverviewMode) return;

        // Cinematic fly-to: smooth glide overrides all normal movement
        if (isCinematic.current) {
            const SPEED = 3.5;
            camera.position.lerp(cinematicDest.current, delta * SPEED);

            // Lerp yaw/pitch via shortest angular path
            const yawDiff = ((cinematicYaw.current - yaw.current + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
            yaw.current += yawDiff * Math.min(delta * SPEED * 1.5, 1);
            pitch.current += (cinematicPitch.current - pitch.current) * Math.min(delta * SPEED * 1.5, 1);
            camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));

            const fov = camera as THREE.PerspectiveCamera;
            fov.fov = THREE.MathUtils.lerp(fov.fov, zoomFov.current, delta * 5);
            fov.updateProjectionMatrix();

            if (camera.position.distanceTo(cinematicDest.current) < 0.1) {
                camera.position.copy(cinematicDest.current);
                isCinematic.current = false;
                const state = useCameraStore.getState();
                const cb = state.onFlyComplete;
                state.clearFlyTo();
                cb?.();
            }
            return;
        }

        // Apply camera rotation from yaw/pitch
        camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));

        const { w, a, s, d } = keysRef.current;

        // Damping
        velocity.current.x -= velocity.current.x * DAMPING * delta;
        velocity.current.z -= velocity.current.z * DAMPING * delta;

        // Direction - combine keyboard and mobile joystick
        direction.current.z = (Number(w) - Number(s)) + mobileMovement.z;
        direction.current.x = (Number(d) - Number(a)) + mobileMovement.x;

        // Only normalize if we have actual input to avoid NaN
        if (direction.current.lengthSq() > 0) {
            direction.current.normalize();
        }

        if (w || s || Math.abs(mobileMovement.z) > 0.01) {
            velocity.current.z -= direction.current.z * MOVE_SPEED * delta;
        }
        if (a || d || Math.abs(mobileMovement.x) > 0.01) {
            velocity.current.x -= direction.current.x * MOVE_SPEED * delta;
        }

        // Move along camera's horizontal facing direction
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        camera.position.addScaledVector(forward, -velocity.current.z * delta);
        camera.position.addScaledVector(right, -velocity.current.x * delta);

        // Head bob
        const speed = Math.sqrt(velocity.current.x ** 2 + velocity.current.z ** 2);
        if (speed > 0.5) {
            bobTimer.current += delta * speed * 2.5;
            camera.position.y = CAMERA_HEIGHT + Math.sin(bobTimer.current) * 0.05;
        } else {
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, CAMERA_HEIGHT, delta * 5);
            bobTimer.current = 0;
        }

        // Dynamic FOV + Scroll Zoom
        const targetFov = zoomFov.current + Math.min(speed / MAX_VELOCITY, 1.0) * MAX_SPEED_FOV_BOOST;
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, delta * 10); // slightly faster lerp for zoom responsiveness
        cam.updateProjectionMatrix();

        // ── Collision clamping ──────────────────────────────────────────────────
        if (currentRoomId) {
            const room = rooms.find((r) => r.id === currentRoomId);
            if (room) {
                const minX = room.position.x + WALL_MARGIN;
                const maxX = room.position.x + room.dimensions.w - WALL_MARGIN;
                const minZ = room.position.z + WALL_MARGIN;
                const maxZ = room.position.z + room.dimensions.d - WALL_MARGIN;
                camera.position.x = Math.max(minX, Math.min(maxX, camera.position.x));
                camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
            }
        } else {
            // In lobby — clamp to lobby bounds
            camera.position.x = Math.max(WALL_MARGIN, Math.min(LOBBY_SIZE - WALL_MARGIN, camera.position.x));
            camera.position.z = Math.max(WALL_MARGIN, Math.min(LOBBY_SIZE - WALL_MARGIN, camera.position.z));
        }

        onPositionChange?.(camera.position);
    });

    return null;
}
