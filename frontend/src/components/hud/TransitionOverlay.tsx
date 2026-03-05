import { useEffect } from 'react';
import { useTransitionStore } from '../../stores/transitionStore';

export function playTransitionSound(type: 'enter' | 'exit') {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    // Attempt to resume or start context
    const ctx = new AudioContext();

    const now = ctx.currentTime;

    // Main chime oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Shimmer oscillator
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();

    osc.connect(gain);
    shimmer.connect(shimmerGain);

    gain.connect(ctx.destination);
    shimmerGain.connect(ctx.destination);

    // Setup volume envelope for both
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.2);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    osc.type = 'sine';
    shimmer.type = 'triangle';

    if (type === 'enter') {
        // Sweeping up (entering)
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.5); // A5

        shimmer.frequency.setValueAtTime(800, now);
        shimmer.frequency.exponentialRampToValueAtTime(1760, now + 0.5); // A6
    } else {
        // Sweeping down (exiting)
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.6);

        shimmer.frequency.setValueAtTime(1760, now);
        shimmer.frequency.exponentialRampToValueAtTime(800, now + 0.6);
    }

    osc.start(now);
    shimmer.start(now);

    osc.stop(now + 1.5);
    shimmer.stop(now + 1.5);
}

export function TransitionOverlay() {
    const isTransitioning = useTransitionStore(s => s.isTransitioning);
    const transitionType = useTransitionStore(s => s.transitionType);

    // Trigger sound exclusively when transition officially starts tracking
    useEffect(() => {
        if (isTransitioning && transitionType) {
            playTransitionSound(transitionType);
        }
    }, [isTransitioning, transitionType]);

    return (
        <div
            className={`fixed inset-0 bg-[#060614] z-[9999] pointer-events-none transition-opacity duration-500 ease-in-out flex items-center justify-center ${isTransitioning ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {/* Subtle glow or magical ring in the center */}
            <div className={`w-32 h-32 rounded-full border border-[rgba(255,255,255,0.1)] shadow-[0_0_80px_rgba(255,255,255,0.2)] transition-transform duration-1000 ${isTransitioning ? 'scale-150 opacity-100' : 'scale-50 opacity-0'
                }`} />
        </div>
    );
}
