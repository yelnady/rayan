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
}));
