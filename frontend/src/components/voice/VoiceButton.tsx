import { useVoice } from '../../hooks/useVoice';

export function VoiceButton({ className = '' }: { className?: string }) {
    const { status, muted, connect, disconnect } = useVoice();

    const handleClick = async () => {
        if (status === 'disconnected' || status === 'error') {
            await connect();
        } else if (status === 'connected' || status === 'responding') {
            disconnect();
        }
    };

    const label =
        status === 'disconnected' ? 'Chat with memory'
            : status === 'connecting' ? 'Connecting…'
                : status === 'connected'
                    ? 'End voice session'
                    : status === 'responding'
                        ? 'Stop and disconnect'
                        : 'Voice error – retry';

    const getBgColorClass = () => {
        if (status === 'connected' && muted) return 'bg-[rgba(255,255,255,0.15)]';
        if (status === 'connected') return 'bg-success';
        if (status === 'responding') return 'bg-primary';
        if (status === 'connecting') return 'bg-primary';
        if (status === 'error') return 'bg-[rgba(239,68,68,0.7)]';
        return 'bg-[rgba(255,255,255,0.15)]';
    };

    const getShadowClass = () => {
        if (status === 'connected' && !muted) return 'shadow-[0_0_0_6px_rgba(34,197,94,0.2),0_0_0_12px_rgba(34,197,94,0.05)]';
        return 'shadow-sm';
    };

    const getAnimationClass = () => {
        if (status === 'responding') return 'animate-[voice-pulse_1.2s_ease-in-out_infinite]';
        return '';
    };

    return (
        <button
            id="voice-button"
            onClick={handleClick}
            aria-label={label}
            title={label}
            className={`flex items-center justify-center w-[52px] h-[52px] rounded-full border-none text-white transition-all duration-250 ${status === 'connecting' ? 'cursor-wait' : 'cursor-pointer'} ${getBgColorClass()} ${getShadowClass()} ${getAnimationClass()} ${className}`}
            disabled={status === 'connecting'}
        >
            <span className="flex items-center justify-center" aria-hidden="true">
                {status === 'disconnected' && <MicOffIcon />}
                {status === 'connecting' && <SpinnerIcon />}
                {status === 'connected' && !muted && <MicIcon />}
                {status === 'connected' && muted && <MicOffIcon />}
                {status === 'responding' && <SpeakingIcon />}
                {status === 'error' && <ErrorIcon />}
            </span>
        </button>
    );
}

// ── Icons (inline SVG) ────────────────────────────────────────────────────────

function MicIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-2 4v6a2 2 0 0 0 4 0V5a2 2 0 0 0-4 0zm-4 6H4a8 8 0 0 0 16 0h-2a6 6 0 0 1-12 0zm6 8v2H9v2h6v-2h-3v-2z" />
        </svg>
    );
}

function MicOffIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
        </svg>
    );
}

function SpinnerIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.9s"
                    repeatCount="indefinite"
                />
            </path>
        </svg>
    );
}

function SpeakingIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            <path d="M18.5 12c0-2.93-1.73-5.45-4.5-6.32V5.6c3.39.9 5.5 3.65 5.5 6.4s-2.11 5.5-5.5 6.4v-.08c2.77-.87 4.5-3.39 4.5-6.32z" opacity="0.5" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
    );
}
