import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
const MOVE_SPEED = 5; // m/s
const CAMERA_HEIGHT = 1.7; // metres
export function FirstPersonControls({ onPositionChange }) {
    const { camera } = useThree();
    const controlsRef = useRef(null);
    const keysRef = useRef({ w: false, a: false, s: false, d: false });
    // Set initial camera height
    useEffect(() => {
        camera.position.y = CAMERA_HEIGHT;
    }, [camera]);
    useEffect(() => {
        function onKeyDown(e) {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup')
                keysRef.current.w = true;
            if (k === 'a' || k === 'arrowleft')
                keysRef.current.a = true;
            if (k === 's' || k === 'arrowdown')
                keysRef.current.s = true;
            if (k === 'd' || k === 'arrowright')
                keysRef.current.d = true;
        }
        function onKeyUp(e) {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup')
                keysRef.current.w = false;
            if (k === 'a' || k === 'arrowleft')
                keysRef.current.a = false;
            if (k === 's' || k === 'arrowdown')
                keysRef.current.s = false;
            if (k === 'd' || k === 'arrowright')
                keysRef.current.d = false;
        }
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);
    const dirVec = useRef(new THREE.Vector3());
    const sideVec = useRef(new THREE.Vector3());
    useFrame((_, delta) => {
        const controls = controlsRef.current;
        if (!controls?.isLocked)
            return;
        const { w, a, s, d } = keysRef.current;
        if (!w && !a && !s && !d)
            return;
        // Forward direction (ignore vertical component)
        controls.getDirection(dirVec.current);
        dirVec.current.y = 0;
        dirVec.current.normalize();
        sideVec.current.crossVectors(dirVec.current, new THREE.Vector3(0, 1, 0));
        const speed = MOVE_SPEED * delta;
        if (w)
            camera.position.addScaledVector(dirVec.current, speed);
        if (s)
            camera.position.addScaledVector(dirVec.current, -speed);
        if (d)
            camera.position.addScaledVector(sideVec.current, speed);
        if (a)
            camera.position.addScaledVector(sideVec.current, -speed);
        // Lock vertical height
        camera.position.y = CAMERA_HEIGHT;
        onPositionChange?.(camera.position);
    });
    return _jsx(PointerLockControls, { ref: controlsRef });
}
