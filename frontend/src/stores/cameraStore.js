import { create } from 'zustand';
export const useCameraStore = create((set) => ({
    resetToken: 0,
    resetView: () => set((s) => ({ resetToken: s.resetToken + 1 })),
    teleportTarget: null,
    teleportToken: 0,
    teleport: (position) => set((s) => ({
        teleportTarget: position,
        teleportToken: s.teleportToken + 1
    })),
}));
