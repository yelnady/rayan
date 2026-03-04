import { useVoiceStore } from '../../stores/voiceStore';

export function VoiceIndicator() {
    const status = useVoiceStore((s) => s.status);

    if (status === 'disconnected') return null;

    return (
        <div
            id="voice-indicator"
            className="fixed bottom-[88px] left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-glass backdrop-blur-md border border-border rounded-full px-4.5 py-2 pointer-events-none z-voice-indicator shadow-sm"
            role="status"
            aria-live="polite"
        >
            {status === 'connecting' && (
                <>
                    <SpinnerRing />
                    <span className="text-text-primary text-[13px] font-body font-medium tracking-wide whitespace-nowrap">Connecting…</span>
                </>
            )}
            {status === 'connected' && (
                <>
                    <WaveformBars />
                    <span className="text-text-primary text-[13px] font-body font-medium tracking-wide whitespace-nowrap">Listening…</span>
                </>
            )}
            {status === 'responding' && (
                <>
                    <SpeakingPulse />
                    <span className="text-text-primary text-[13px] font-body font-medium tracking-wide whitespace-nowrap">Rayan is speaking…</span>
                </>
            )}
            {status === 'error' && (
                <span className="text-error text-[13px] font-body font-medium tracking-wide whitespace-nowrap">Voice error. Try again.</span>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WaveformBars() {
    const BAR_COUNT = 7;
    return (
        <div className="flex items-center gap-[3px] h-7" aria-hidden="true">
            {Array.from({ length: BAR_COUNT }, (_, i) => (
                <div
                    key={i}
                    className="w-[3px] h-1.5 rounded-sm bg-error-solid animate-[voice-bar_0.9s_ease-in-out_infinite]"
                    style={{ animationDelay: `${(i * 0.12).toFixed(2)}s` }}
                />
            ))}
        </div>
    );
}

function SpinnerRing() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
            <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(99,102,241,0.3)" strokeWidth="2.5" />
            <path
                d="M14 3 A11 11 0 0 1 25 14"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
            >
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 14 14"
                    to="360 14 14"
                    dur="0.85s"
                    repeatCount="indefinite"
                />
            </path>
        </svg>
    );
}

function SpeakingPulse() {
    return (
        <div className="w-7 h-7 rounded-full bg-success-muted flex items-center justify-center animate-[voice-pulse_1.4s_ease-in-out_infinite]" aria-hidden="true">
            <div className="w-3 h-3 rounded-full bg-success" />
        </div>
    );
}
