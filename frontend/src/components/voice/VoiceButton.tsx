/**
 * VoiceButton — push-to-talk microphone button.
 *
 * Visual states:
 *   idle       → mic icon, click to start recording
 *   listening  → red pulsing circle with stop icon
 *   processing → spinner
 *   responding → speaking icon (interrupt on click)
 *   error      → red exclamation
 */

import React from 'react';
import { useVoice } from '../../hooks/useVoice';

interface VoiceButtonProps {
    context: {
        currentRoomId: string | null;
        focusedArtifactId: string | null;
    };
    /** Optional extra CSS class */
    className?: string;
}

export function VoiceButton({ context, className = '' }: VoiceButtonProps) {
    const { status, startListening, stopListening, interrupt } = useVoice();

    const handleClick = async () => {
        if (status === 'idle' || status === 'error') {
            await startListening(context);
        } else if (status === 'listening') {
            stopListening();
        } else if (status === 'processing' || status === 'responding') {
            interrupt();
        }
    };

    const label =
        status === 'idle' ? 'Start voice query'
            : status === 'listening' ? 'Stop recording'
                : status === 'processing' ? 'Processing…'
                    : status === 'responding' ? 'Stop response'
                        : 'Voice error – retry';

    return (
        <button
            id="voice-button"
            onClick={handleClick}
            aria-label={label}
            title={label}
            className={`voice-button voice-button--${status} ${className}`}
            style={styles.button(status)}
        >
            <span style={styles.icon} aria-hidden="true">
                {status === 'idle' && <MicIcon />}
                {status === 'listening' && <StopIcon />}
                {status === 'processing' && <SpinnerIcon />}
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

function StopIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
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

// ── Inline styles ─────────────────────────────────────────────────────────────

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'responding' | 'error';

const BG_COLOR: Record<VoiceStatus, string> = {
    idle: 'rgba(255,255,255,0.15)',
    listening: 'rgba(239,68,68,0.9)',
    processing: 'rgba(99,102,241,0.85)',
    responding: 'rgba(34,197,94,0.85)',
    error: 'rgba(239,68,68,0.7)',
};

const styles = {
    button: (status: VoiceStatus): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: BG_COLOR[status],
        color: '#fff',
        boxShadow: status === 'listening'
            ? '0 0 0 6px rgba(239,68,68,0.3), 0 0 0 12px rgba(239,68,68,0.1)'
            : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'background 0.25s ease, box-shadow 0.25s ease',
        animation: status === 'listening' ? 'voice-pulse 1.2s ease-in-out infinite' : 'none',
    }),
    icon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    } satisfies React.CSSProperties,
};
