/**
 * ActionBar — bottom-center HUD with two clearly labelled actions:
 *   1. "Add to Memory"  → capture (webcam recording)
 *   2. "Chat with Memory" → voice conversation
 *
 * Renders as a single glassmorphic pill with a hairline divider between sections.
 * Each section has an animated icon button + label + state sub-label.
 */

import React from 'react';
import { useCapture } from '../../hooks/useCapture';
import { useCaptureStore } from '../../stores/captureStore';
import { useVoice } from '../../hooks/useVoice';
import { useCameraStore } from '../../stores/cameraStore';
import { colors, fonts, radii, transitions, zIndex } from '../../config/tokens';

// ─── Reset View button ────────────────────────────────────────────────────────

function ResetViewSection() {
    const resetView = useCameraStore((s) => s.resetView);
    return (
        <button
            onClick={resetView}
            aria-label="Reset view to palace entrance"
            title="Reset View"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '6px 14px',
                background: 'transparent',
                border: 'none',
                borderRadius: radii.pill,
                cursor: 'pointer',
                color: colors.textPrimary,
                transition: `background ${transitions.fast}`,
            }}
        >
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.pill,
                    background: 'rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: `background ${transitions.fast}, transform ${transitions.fast}`,
                }}
            >
                <HomeIcon />
            </div>
            <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, letterSpacing: '0.03em', lineHeight: 1 }}>
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
        ? colors.error
        : colors.primary;

    const btnGlow = isCapturing
        ? `0 0 0 6px ${colors.errorMuted}, 0 4px 16px ${colors.errorGlow}`
        : `0 0 0 6px ${colors.primaryMuted}, 0 4px 16px ${colors.primaryGlow}`;

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
            style={sectionBtn}
        >
            {/* Icon */}
            <div
                style={{
                    width: 46,
                    height: 46,
                    borderRadius: radii.pill,
                    background: btnColor,
                    boxShadow: btnGlow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: `background ${transitions.normal}, box-shadow ${transitions.normal}`,
                    animation: isCapturing ? 'capture-pulse 1.6s ease-in-out infinite' : 'none',
                }}
            >
                {isProcessing ? <SpinnerIcon color="#111827" /> : isCapturing ? <StopIcon /> : <CamIcon />}
            </div>

            {/* Labels */}
            <div style={labelStack}>
                <span style={labelPrimary}>Add to Memory</span>
                <span
                    style={{
                        ...labelSub,
                        color: isCapturing ? 'rgba(248,113,113,0.9)' : colors.textMuted,
                    }}
                >
                    {isProcessing ? (
                        <span style={{ animation: 'pulse-opacity 1s ease infinite' }}>{subLabel}</span>
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
    const { status, muted, toggleMute, interrupt, connect } = useVoice();

    const handleClick = async () => {
        if (status === 'disconnected' || status === 'error') await connect();
        else if (status === 'connected') toggleMute();
        else if (status === 'responding') {
            if (!muted) toggleMute();
            interrupt();
        }
    };

    const isActive = status === 'connected' && !muted;
    const isResponding = status === 'responding';
    const isConnecting = status === 'connecting';

    const btnColor = isResponding
        ? colors.secondary
        : isActive
            ? colors.success
            : status === 'error'
                ? colors.error
                : 'rgba(0,0,0,0.04)';

    const btnGlow = isActive
        ? '0 0 0 6px rgba(16, 185, 129, 0.15), 0 4px 16px rgba(16, 185, 129, 0.3)'
        : isResponding
            ? `0 0 0 6px ${colors.secondaryGlow}, 0 4px 16px ${colors.secondaryGlow}`
            : 'none';

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
            style={sectionBtn}
        >
            {/* Icon */}
            <div
                style={{
                    width: 46,
                    height: 46,
                    borderRadius: radii.pill,
                    background: btnColor,
                    boxShadow: btnGlow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: `background ${transitions.normal}, box-shadow ${transitions.normal}`,
                    animation: isResponding ? 'voice-pulse 1.2s ease-in-out infinite' : 'none',
                }}
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
            <div style={labelStack}>
                <span style={labelPrimary}>Chat with Memory</span>
                <span
                    style={{
                        ...labelSub,
                        color: isActive
                            ? 'rgba(74,222,128,0.9)'
                            : isResponding
                                ? 'rgba(167,139,250,0.9)'
                                : status === 'error'
                                    ? 'rgba(248,113,113,0.9)'
                                    : colors.textMuted,
                    }}
                >
                    {subLabel}
                </span>
            </div>
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
                style={{
                    position: 'fixed',
                    bottom: 28,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: zIndex.hud,
                    display: 'flex',
                    alignItems: 'center',
                    background: colors.glass,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.pill,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.5) inset',
                    padding: '10px 10px',
                    gap: 0,
                    animation: 'bar-appear 0.4s cubic-bezier(0.32,0,0.67,0) both',
                }}
            >
                <ResetViewSection />

                {/* Divider */}
                <div
                    aria-hidden="true"
                    style={{
                        width: 1,
                        height: 48,
                        background: colors.borderLight,
                        margin: '0 4px',
                        flexShrink: 0,
                    }}
                />

                <CaptureSection />

                {/* Divider */}
                <div
                    aria-hidden="true"
                    style={{
                        width: 1,
                        height: 48,
                        background: colors.borderLight,
                        margin: '0 4px',
                        flexShrink: 0,
                    }}
                />

                <VoiceSection />
            </div>
        </>
    );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const sectionBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '6px 16px 6px 8px',
    background: 'transparent',
    border: 'none',
    borderRadius: radii.pill,
    cursor: 'pointer',
    color: colors.textPrimary,
    textAlign: 'left',
    transition: `background ${transitions.fast}`,
    minWidth: 190,
};

const labelStack: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
};

const labelPrimary: React.CSSProperties = {
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
};

const labelSub: React.CSSProperties = {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: '0.02em',
    lineHeight: 1.2,
    transition: `color ${transitions.fast}`,
};

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
