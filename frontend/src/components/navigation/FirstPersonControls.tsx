import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStore } from '../../stores/cameraStore';

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
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const bobTimer = useRef(0);

    // Mouse-drag look state (right-click drag)
    const isDragging = useRef(false);
    const yaw = useRef(Math.PI); // start looking toward -Z (into the lobby)
    const pitch = useRef(0);

    // Apply initial camera orientation
    useEffect(() => {
        camera.position.copy(SPAWN);
        (camera as THREE.PerspectiveCamera).fov = DEFAULT_FOV;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
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
        (camera as THREE.PerspectiveCamera).fov = DEFAULT_FOV;
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

    // LookAt — rotate camera toward a world-space position
    const lookAtToken = useCameraStore((s) => s.lookAtToken);
    const lookAtTarget = useCameraStore((s) => s.lookAtTarget);
    useEffect(() => {
        if (lookAtToken === 0 || !lookAtTarget) return;
        const dx = lookAtTarget.x - camera.position.x;
        const dy = lookAtTarget.y - camera.position.y;
        const dz = lookAtTarget.z - camera.position.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        yaw.current = Math.atan2(dx, dz);
        pitch.current = Math.max(
            -Math.PI / 2 + 0.05,
            Math.min(Math.PI / 2 - 0.05, -Math.atan2(dy, horizontalDist)),
        );
        camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
    }, [lookAtToken, lookAtTarget, camera]);

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
        function onContextMenu(e: Event) {
            e.preventDefault(); // suppress right-click menu on canvas
        }

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        canvas.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('contextmenu', onContextMenu);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            canvas.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('contextmenu', onContextMenu);
        };
    }, [gl]);

    useFrame((_, delta) => {
        // Apply camera rotation from yaw/pitch
        camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));

        const { w, a, s, d } = keysRef.current;

        // Damping
        velocity.current.x -= velocity.current.x * DAMPING * delta;
        velocity.current.z -= velocity.current.z * DAMPING * delta;

        // Direction
        direction.current.z = Number(w) - Number(s);
        direction.current.x = Number(d) - Number(a);
        direction.current.normalize();

        if (w || s) velocity.current.z -= direction.current.z * MOVE_SPEED * delta;
        if (a || d) velocity.current.x -= direction.current.x * MOVE_SPEED * delta;

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

        // Dynamic FOV
        const targetFov = DEFAULT_FOV + Math.min(speed / MAX_VELOCITY, 1.0) * MAX_SPEED_FOV_BOOST;
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, delta * 5);
        cam.updateProjectionMatrix();

        onPositionChange?.(camera.position);
    });

    return null;
}
