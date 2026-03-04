/**
 * ActionBar — bottom-center HUD with two clearly labelled actions:
 *   1. "Add to Memory"  → capture (webcam recording)
 *   2. "Chat with Memory" → voice conversation
 *
 * Renders as a single glassmorphic pill with a hairline divider between sections.
 * Each section has an animated icon button + label + state sub-label.
 */

import { useCapture } from '../../hooks/useCapture';
import { useCaptureStore } from '../../stores/captureStore';
import { useVoice } from '../../hooks/useVoice';
import { useCameraStore } from '../../stores/cameraStore';

// ─── Reset View button ────────────────────────────────────────────────────────

function ResetViewSection() {
    const resetView = useCameraStore((s) => s.resetView);
    return (
        <button
            onClick={resetView}
            aria-label="Reset view to palace entrance"
            title="Reset View"
            className="flex flex-col items-center gap-1 py-1.5 px-3.5 bg-transparent border-none rounded-full cursor-pointer text-text-primary transition-background duration-150 hover:bg-surface-hover group"
        >
            <div
                className="w-9 h-9 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center shrink-0 transition-all duration-150 group-hover:bg-[rgba(0,0,0,0.08)] group-active:scale-95"
            >
                <HomeIcon />
            </div>
            <span className="font-body text-[10px] text-text-muted tracking-[0.03em] leading-none">
                Reset
            </span>
        </button>
    );
}

// ─── Capture half ─────────────────────────────────────────────────────────────

function CaptureSection() {
    const { startCapture, stopCapture } = useCapture();
    const status = useCaptureStore((s) => s.status);
    const concepts = useCaptureStore((s) => s.concepts);

    const isCapturing = status === 'capturing';
    const isProcessing = status === 'processing';
    const disabled = isProcessing;

    function handleClick() {
        if (isCapturing) stopCapture();
        else startCapture('screen_share');
    }

    const btnColor = isCapturing
        ? 'bg-error'
        : 'bg-primary';

    const btnGlow = isCapturing
        ? 'shadow-[0_0_0_6px_rgba(248,113,113,0.1),0_4px_16px_rgba(239,68,68,0.35)]'
        : 'shadow-[0_0_0_6px_rgba(99,102,241,0.12),0_4px_16px_rgba(99,102,241,0.35)]';

    const subLabel = isProcessing
        ? 'Thinking…'
        : isCapturing
            ? concepts.length > 0
                ? `${concepts.length} concept${concepts.length !== 1 ? 's' : ''} found`
                : 'Listening…'
            : 'Webcam · Screen';

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            aria-label={isCapturing ? 'Stop capture' : 'Start capture'}
            className="action-section-btn flex items-center gap-3 py-1.5 pr-4 pl-2 bg-transparent border-none rounded-full cursor-pointer text-text-primary text-left transition-background duration-150 min-w-[190px] hover:bg-surface-hover group"
        >
            {/* Icon */}
            <div
                className={`w-[46px] h-[46px] rounded-full ${btnColor} ${btnGlow} flex items-center justify-center shrink-0 transition-all duration-200 action-icon-wrap ${isCapturing ? 'animate-[capture-pulse_1.6s_ease-in-out_infinite]' : ''}`}
            >
                {isProcessing ? <SpinnerIcon color="#111827" /> : isCapturing ? <StopIcon /> : <CamIcon />}
            </div>

            {/* Labels */}
            <div className="flex flex-col gap-0.5">
                <span className="font-body font-semibold text-sm text-text-primary tracking-[0.01em] leading-[1.2]">Add to Memory</span>
                <span
                    className={`font-body text-[11px] tracking-[0.02em] leading-[1.2] transition-colors duration-150 ${isCapturing ? 'text-[rgba(248,113,113,0.9)]' : 'text-text-muted'}`}
                >
                    {isProcessing ? (
                        <span className="animate-[pulse-opacity_1s_ease_infinite]">{subLabel}</span>
                    ) : (
                        subLabel
                    )}
                </span>
            </div>
        </button>
    );
}

// ─── Voice half ───────────────────────────────────────────────────────────────

function VoiceSection() {
    const { status, muted, toggleMute, interrupt, connect, disconnect } = useVoice();

    const handleClick = async () => {
        if (status === 'disconnected' || status === 'error') await connect();
        else if (status === 'connected') toggleMute();
        else if (status === 'responding') {
            if (!muted) toggleMute();
            interrupt();
        }
    };

    const handleStop = () => {
        disconnect();
    };

    const isSessionActive = status !== 'disconnected' && status !== 'error' && status !== 'connecting';

    const isActive = status === 'connected' && !muted;
    const isResponding = status === 'responding';
    const isConnecting = status === 'connecting';

    const btnColor = isResponding
        ? 'bg-secondary'
        : isActive
            ? 'bg-success'
            : status === 'error'
                ? 'bg-error'
                : 'bg-[rgba(0,0,0,0.04)]';

    const btnGlow = isActive
        ? 'shadow-[0_0_0_6px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.3)]'
        : isResponding
            ? 'shadow-[0_0_0_6px_rgba(167,139,250,0.15),0_4px_16px_rgba(139,92,246,0.3)]'
            : 'shadow-none';

    const subLabel =
        status === 'disconnected' ? 'Tap to connect'
            : status === 'connecting' ? 'Connecting…'
                : status === 'error' ? 'Connection error'
                    : isResponding ? 'Tap to interrupt'
                        : muted ? 'Muted — tap to unmute'
                            : 'Listening…';

    const ariaLabel =
        status === 'disconnected' ? 'Connect voice'
            : status === 'responding' ? 'Interrupt response'
                : muted ? 'Unmute microphone'
                    : 'Mute microphone';

    return (
        <button
            onClick={handleClick}
            disabled={isConnecting}
            aria-label={ariaLabel}
            className="action-section-btn flex items-center gap-3 py-1.5 pr-4 pl-2 bg-transparent border-none rounded-full cursor-pointer text-text-primary text-left transition-background duration-150 min-w-[190px] hover:bg-surface-hover group"
        >
            {/* Icon */}
            <div
                className={`w-[46px] h-[46px] rounded-full ${btnColor} ${btnGlow} flex items-center justify-center shrink-0 transition-all duration-200 action-icon-wrap ${isResponding ? 'animate-[voice-pulse_1.2s_ease-in-out_infinite]' : ''}`}
            >
                {isConnecting ? (
                    <SpinnerIcon color="#111827" />
                ) : isResponding ? (
                    <SpeakingIcon />
                ) : isActive ? (
                    <MicIcon />
                ) : status === 'error' ? (
                    <ErrorIcon />
                ) : (
                    <MicOffIcon />
                )}
            </div>

            {/* Labels */}
            <div className="flex flex-col gap-0.5">
                <span className="font-body font-semibold text-sm text-text-primary tracking-[0.01em] leading-[1.2]">Chat with Memory</span>
                <span
                    className={`font-body text-[11px] tracking-[0.02em] leading-[1.2] transition-colors duration-150 ${isActive ? 'text-[rgba(74,222,128,0.9)]' : isResponding ? 'text-[rgba(167,139,250,0.9)]' : status === 'error' ? 'text-[rgba(248,113,113,0.9)]' : 'text-text-muted'}`}
                >
                    {subLabel}
                </span>
            </div>

            {/* Stop button — only shown when session is active */}
            {isSessionActive && (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleStop(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleStop(); } }}
                    aria-label="Stop voice session"
                    title="Stop session"
                    className="w-[26px] h-[26px] rounded-full bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center cursor-pointer shrink-0 transition-background duration-150 ml-1 hover:bg-[rgba(239,68,68,0.2)]"
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(239,68,68,0.9)">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </div>
            )}
        </button>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ActionBar() {
    return (
        <>
            {/* Keyframes injected once */}
            <style>{`
        @keyframes capture-pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.18), 0 4px 20px rgba(239,68,68,0.35); }
          50%       { box-shadow: 0 0 0 14px rgba(239,68,68,0.06), 0 4px 20px rgba(239,68,68,0.2); }
        }
        @keyframes voice-pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(139,92,246,0.22), 0 4px 20px rgba(139,92,246,0.4); }
          50%       { box-shadow: 0 0 0 15px rgba(139,92,246,0.06), 0 4px 20px rgba(139,92,246,0.2); }
        }
        @keyframes pulse-opacity {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes bar-appear {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .action-section-btn:hover .action-icon-wrap {
          transform: scale(1.08);
        }
        .action-section-btn:active .action-icon-wrap {
          transform: scale(0.96);
        }
      `}</style>

            <div
                role="toolbar"
                aria-label="Memory actions"
                className="fixed bottom-7 left-1/2 -translate-x-1/2 z-hud flex items-center bg-glass backdrop-blur-xl border border-border rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] px-2.5 py-2.5 gap-0 animate-[bar-appear_0.4s_cubic-bezier(0.32,0,0.67,0)_both]"
            >
                <ResetViewSection />

                {/* Divider */}
                <div
                    aria-hidden="true"
                    className="w-px h-12 bg-border-light mx-1 shrink-0"
                />

                <CaptureSection />

                {/* Divider */}
                <div
                    aria-hidden="true"
                    className="w-px h-12 bg-border-light mx-1 shrink-0"
                />

                <VoiceSection />
            </div>
        </>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(0,0,0,0.6)">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
    );
}

function CamIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#111827">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M17 3H7L4.5 6H2a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2.5L17 3zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
        </svg>
    );
}

function StopIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
            <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
    );
}

function MicIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-2 4v6a2 2 0 0 0 4 0V5a2 2 0 0 0-4 0zm-4 6H4a8 8 0 0 0 16 0h-2a6 6 0 0 1-12 0zm6 8v2H9v2h6v-2h-3v-2z" />
        </svg>
    );
}

function MicOffIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(0,0,0,0.4)">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
        </svg>
    );
}

function SpeakingIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            <path d="M18.5 12c0-2.93-1.73-5.45-4.5-6.32V5.6c3.39.9 5.5 3.65 5.5 6.4s-2.11 5.5-5.5 6.4v-.08c2.77-.87 4.5-3.39 4.5-6.32z" opacity="0.5" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
    );
}

function SpinnerIcon({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.8s"
                    repeatCount="indefinite"
                />
            </path>
        </svg>
    );
}
