import { create } from 'zustand';

interface TransitionState {
    isTransitioning: boolean;
    transitionType: 'enter' | 'exit' | null;
    startTransition: (type: 'enter' | 'exit', callback: () => void) => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
    isTransitioning: false,
    transitionType: null,
    startTransition: (type, callback) => {
        // Start black fade
        set({ isTransitioning: true, transitionType: type });

        // Wait for black fade to cover screen
        setTimeout(() => {
            callback(); // Actually move the camera
            // Wait a tiny bit then fade back in
            setTimeout(() => {
                set({ isTransitioning: false });
                setTimeout(() => set({ transitionType: null }), 1000);
            }, 300);
        }, 600);
    }
}));
