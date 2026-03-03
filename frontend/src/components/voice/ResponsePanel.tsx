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

export function ResponsePanel() {
    const status = useVoiceStore((s) => s.status);
    const transcript = useVoiceStore((s) => s.transcript);
    const narration = useVoiceStore((s) => s.currentNarration);
    const bottomRef = useRef<HTMLDivElement>(null);

    const isVisible = status !== 'idle';

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
                {status === 'processing' && <span style={subtitleStyle}>thinking…</span>}
                {status === 'responding' && <span style={subtitleStyle}>speaking</span>}
                {status === 'error' && <span style={{ ...subtitleStyle, color: '#f87171' }}>error</span>}
            </div>

            <div style={bodyStyle}>
                {/* Narration summary (from artifact_recall) */}
                {narration?.summary && (
                    <div style={summaryBlockStyle}>
                        <p style={summaryTextStyle}>{narration.summary}</p>
                    </div>
                )}

                {/* Streaming transcript (from response_chunk) */}
                {transcript && (
                    <p style={transcriptStyle}>{transcript}</p>
                )}

                {/* Placeholder while processing */}
                {status === 'processing' && !transcript && !narration && (
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
            <style>{`
        @keyframes thinking-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
            {[0, 0.2, 0.4].map((delay, i) => (
                <div
                    key={i}
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'rgba(99,102,241,0.8)',
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
    background: 'rgba(12,12,18,0.88)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRight: 'none',
    borderRadius: '16px 0 0 16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'right 0.35s cubic-bezier(0.32,0,0.67,0)',
    zIndex: 150,
    boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Inter, system-ui, sans-serif',
    flex: 1,
};

const subtitleStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'Inter, system-ui, sans-serif',
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
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
};

const transcriptStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 1.65,
    margin: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
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
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
};

const relatedChipStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: '6px 10px',
};

const relatedReasonStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
};
