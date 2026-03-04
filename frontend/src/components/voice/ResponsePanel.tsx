/**
 * ResponsePanel — sliding panel that displays the streamed voice response
 * transcript and narration summary.
 *
 * Slides in from the right when a query is active and slides back out on idle.
 * Text chunks stream in progressively as response_chunk messages arrive.
 * Artifact narration (artifact_recall) is shown with diagrams listed below.
 */

import React, { useEffect, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { colors, fonts, radii, shadows, transitions, zIndex } from '../../config/tokens';

export function ResponsePanel() {
    const status = useVoiceStore((s) => s.status);
    const transcript = useVoiceStore((s) => s.transcript);
    const narration = useVoiceStore((s) => s.currentNarration);
    const bottomRef = useRef<HTMLDivElement>(null);

    const isVisible = status !== 'disconnected';

    // Auto-scroll to bottom as new text arrives
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, narration]);

    return (
        <div
            id="response-panel"
            role="region"
            aria-label="Voice response"
            aria-live="polite"
            style={panelStyle(isVisible)}
        >
            <div style={headerStyle}>
                <span style={avatarDotStyle} />
                <span style={headerTitleStyle}>Rayan</span>
                {status === 'connecting' && <span style={subtitleStyle}>connecting…</span>}
                {status === 'connected' && <span style={subtitleStyle}>listening</span>}
                {status === 'responding' && <span style={subtitleStyle}>speaking</span>}
                {status === 'error' && <span style={{ ...subtitleStyle, color: colors.error }}>error</span>}
            </div>

            <div style={bodyStyle}>
                {/* Narration summary (from artifact_recall) */}
                {narration?.summary && (
                    <div style={summaryBlockStyle}>
                        <p style={summaryTextStyle}>{narration.summary}</p>
                    </div>
                )}

                {/* Streaming transcript (from response_chunk) — attributed to Rayan */}
                {transcript && (
                    <div>
                        <p style={speakerLabelStyle}>Rayan</p>
                        <p style={transcriptStyle}>{transcript}</p>
                    </div>
                )}

                {/* Placeholder while connecting */}
                {status === 'connecting' && !transcript && !narration && (
                    <div style={placeholderStyle}>
                        <ThinkingDots />
                    </div>
                )}

                {/* Related artifacts from narration */}
                {narration?.relatedArtifacts && narration.relatedArtifacts.length > 0 && (
                    <div style={relatedSectionStyle}>
                        <p style={relatedTitleStyle}>Related memories</p>
                        {narration.relatedArtifacts.map((rel) => (
                            <div key={rel.artifactId} style={relatedChipStyle}>
                                <span style={relatedReasonStyle}>{rel.reason}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThinkingDots() {
    return (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} aria-hidden="true">
            {[0, 0.2, 0.4].map((delay, i) => (
                <div
                    key={i}
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: colors.primaryGlow,
                        animation: `thinking-dot 1.2s ease-in-out ${delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const panelStyle = (visible: boolean): React.CSSProperties => ({
    position: 'fixed',
    right: visible ? 0 : -360,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 340,
    maxHeight: '65vh',
    background: colors.glass,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border}`,
    borderRight: 'none',
    borderRadius: `${radii.lg}px 0 0 ${radii.lg}px`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: `right ${transitions.slow}`,
    zIndex: zIndex.responsePanel,
    boxShadow: shadows.panel,
    pointerEvents: visible ? 'auto' : 'none',
});

const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
};

const avatarDotStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    flexShrink: 0,
};

const headerTitleStyle: React.CSSProperties = {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.heading,
    flex: 1,
};

const subtitleStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.body,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const bodyStyle: React.CSSProperties = {
    overflowY: 'auto',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const summaryBlockStyle: React.CSSProperties = {
    background: 'rgba(99,102,241,0.08)',
    borderLeft: '3px solid rgba(99,102,241,0.6)',
    borderRadius: '0 8px 8px 0',
    padding: '8px 12px',
};

const summaryTextStyle: React.CSSProperties = {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
    fontFamily: fonts.body,
};

const speakerLabelStyle: React.CSSProperties = {
    color: 'rgba(139,92,246,0.8)', // subtle purple matching Rayan's accent
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    margin: '0 0 4px',
    fontFamily: fonts.body,
};

const transcriptStyle: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 1.65,
    margin: 0,
    fontFamily: fonts.body,
};

const placeholderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 0',
};

const relatedSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
};

const relatedTitleStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: 0,
    fontFamily: fonts.body,
};

const relatedChipStyle: React.CSSProperties = {
    background: colors.surfaceHover,
    borderRadius: radii.md,
    padding: '6px 10px',
};

const relatedReasonStyle: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.body,
};
