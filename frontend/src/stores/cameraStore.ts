import { create } from 'zustand';

/** Minimal store that lets HUD components trigger a camera reset
 *  without needing a direct ref into the Three.js scene. */
interface CameraState {
    /** Incremented each time resetView() is called. */
    resetToken: number;
    resetView: () => void;
    /** Triggers teleportation to a specific position */
    teleportTarget: { x: number, y: number, z: number } | null;
    teleportToken: number;
    teleport: (position: { x: number, y: number, z: number }) => void;
    /** Triggers camera rotation to look at a world-space position */
    lookAtTarget: { x: number; y: number; z: number } | null;
    lookAtToken: number;
    lookAt: (position: { x: number; y: number; z: number }) => void;
    /** Smooth cinematic fly-to: glides camera to position while rotating to face lookAt */
    flyToTarget: { position: { x: number; y: number; z: number }; lookAt: { x: number; y: number; z: number } } | null;
    flyToToken: number;
    onFlyComplete: (() => void) | null;
    flyTo: (position: { x: number; y: number; z: number }, lookAt: { x: number; y: number; z: number }, onComplete?: () => void) => void;
    clearFlyTo: () => void;
    /** Bird's-eye overview mode */
    isOverviewMode: boolean;
    enterOverview: () => void;
    exitOverview: () => void;
    /** Mobile-specific movement vector (from joystick) */
    mobileMovement: { x: number; z: number };
    setMobileMovement: (movement: { x: number; z: number }) => void;
    /** Target FOV for the camera */
    fov: number;
    setFov: (fov: number) => void;
    /** Bird's-eye pan toward a world XZ position, then fire callback */
    overviewFlyTarget: { x: number; z: number } | null;
    overviewFlyToken: number;
    onOverviewFlyComplete: (() => void) | null;
    overviewFlyTo: (x: number, z: number, onComplete?: () => void) => void;
    clearOverviewFly: () => void;
}

export const useCameraStore = create<CameraState>((set) => ({
    resetToken: 0,
    resetView: () => set((s) => ({ resetToken: s.resetToken + 1 })),
    teleportTarget: null,
    teleportToken: 0,
    teleport: (position) => set((s) => ({
        teleportTarget: position,
        teleportToken: s.teleportToken + 1
    })),
    lookAtTarget: null,
    lookAtToken: 0,
    lookAt: (position) => set((s) => ({
        lookAtTarget: position,
        lookAtToken: s.lookAtToken + 1,
    })),
    flyToTarget: null,
    flyToToken: 0,
    onFlyComplete: null,
    flyTo: (position, lookAt, onComplete) => set((s) => ({
        flyToTarget: { position, lookAt },
        flyToToken: s.flyToToken + 1,
        onFlyComplete: onComplete ?? null,
    })),
    clearFlyTo: () => set({ flyToTarget: null, onFlyComplete: null }),
    isOverviewMode: false,
    enterOverview: () => set({ isOverviewMode: true }),
    exitOverview: () => set({ isOverviewMode: false }),
    mobileMovement: { x: 0, z: 0 },
    setMobileMovement: (movement) => set({ mobileMovement: movement }),
    fov: 75,
    setFov: (fov) => set({ fov }),
    overviewFlyTarget: null,
    overviewFlyToken: 0,
    onOverviewFlyComplete: null,
    overviewFlyTo: (x, z, onComplete) => set((s) => ({
        overviewFlyTarget: { x, z },
        overviewFlyToken: s.overviewFlyToken + 1,
        onOverviewFlyComplete: onComplete ?? null,
    })),
    clearOverviewFly: () => set({ overviewFlyTarget: null, onOverviewFlyComplete: null }),
}));
