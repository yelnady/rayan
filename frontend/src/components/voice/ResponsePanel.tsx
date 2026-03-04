import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';

export function ResponsePanel() {
    const status = useVoiceStore((s) => s.status);
    const messages = useVoiceStore((s) => s.messages);
    const narration = useVoiceStore((s) => s.currentNarration);
    const bottomRef = useRef<HTMLDivElement>(null);

    const isVisible = status !== 'disconnected';

    // Auto-scroll to bottom as conversation grows
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, narration]);

    return (
        <div
            id="response-panel"
            role="region"
            aria-label="Voice conversation"
            aria-live="polite"
            className={`fixed top-1/2 -translate-y-1/2 w-[340px] max-h-[65vh] bg-glass backdrop-blur-xl border border-border border-r-0 rounded-l-2xl flex flex-col overflow-hidden transition-all duration-350 z-response-panel shadow-panel bg-surface ${isVisible ? 'right-0 pointer-events-auto' : '-right-[360px] pointer-events-none'}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shrink-0" />
                <span className="text-text-primary text-sm font-semibold font-heading flex-1">Conversation</span>
                {status === 'connecting' && <span className="text-text-muted text-[11px] font-body uppercase tracking-widest">connecting…</span>}
                {status === 'connected' && <span className="text-text-muted text-[11px] font-body uppercase tracking-widest">listening</span>}
                {status === 'responding' && <span className="text-text-muted text-[11px] font-body uppercase tracking-widest">speaking</span>}
                {status === 'error' && <span className="text-error text-[11px] font-body uppercase tracking-widest">error</span>}
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-3 py-3 flex flex-col gap-2">
                {/* Narration summary from artifact_recall */}
                {narration?.summary && (
                    <div className="bg-[rgba(99,102,241,0.08)] border-l-4 border-[rgba(99,102,241,0.6)] rounded-r-lg px-3 py-2">
                        <p className="text-text-primary text-[13px] leading-relaxed m-0 font-body">{narration.summary}</p>
                    </div>
                )}

                {/* Connecting placeholder */}
                {status === 'connecting' && messages.length === 0 && !narration && (
                    <div className="flex items-center justify-center py-4">
                        <ThinkingDots />
                    </div>
                )}

                {/* Chat messages */}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[82%] p-2 px-3 border ${msg.role === 'rayan' ? 'bg-[rgba(99,102,241,0.12)] border-[rgba(99,102,241,0.25)] rounded-r-md rounded-bl-md rounded-tl-sm' : 'bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.1)] rounded-l-md rounded-br-md rounded-tr-sm'}`}>
                            <span className={`block text-[10px] font-bold uppercase tracking-widest mb-[3px] font-body ${msg.role === 'rayan' ? 'text-[rgba(139,92,246,0.85)]' : 'text-[rgba(156,163,175,0.7)]'}`}>
                                {msg.role === 'rayan' ? 'Rayan' : 'You'}
                            </span>
                            <p className={`m-0 text-[13px] leading-relaxed font-body ${msg.role === 'rayan' ? 'text-text-primary' : 'text-text-secondary'}`}>{msg.text}</p>
                        </div>
                    </div>
                ))}

                {/* Related artifacts from narration */}
                {narration?.relatedArtifacts && narration.relatedArtifacts.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                        <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest m-0 font-body">Related memories</p>
                        {narration.relatedArtifacts.map((rel) => (
                            <div key={rel.artifactId} className="bg-[rgba(255,255,255,0.05)] rounded-md px-2.5 py-1.5">
                                <span className="text-text-secondary text-xs font-body leading-relaxed">{rel.reason}</span>
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
        <div className="flex gap-[5px] items-center" aria-hidden="true">
            {[0, 0.2, 0.4].map((delay, i) => (
                <div
                    key={i}
                    className="w-[7px] h-[7px] rounded-full bg-primary-glow animate-[thinking-dot_1.2s_ease-in-out_infinite]"
                    style={{ animationDelay: `${delay}s` }}
                />
            ))}
        </div>
    );
}
