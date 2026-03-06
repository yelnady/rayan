import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';

const TOOL_ICONS: Record<string, string> = {
    navigate_to_room: '🧭',
    highlight_artifact: '✨',
    save_artifact: '💾',
    end_session: '👋',
};

export function ResponsePanel() {
    const status = useVoiceStore((s) => s.status);
    const messages = useVoiceStore((s) => s.messages);
    const bottomRef = useRef<HTMLDivElement>(null);

    const isVisible = status !== 'disconnected';

    // Auto-scroll to bottom as conversation grows
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!isVisible) return null;

    return (
        <div
            id="response-panel"
            role="region"
            aria-label="Voice conversation"
            aria-live="polite"
            className="fixed left-0 top-0 bottom-0 w-[300px] flex flex-col bg-[rgba(8,8,24,0.82)] backdrop-blur-xl border-r border-[rgba(255,255,255,0.07)] z-response-panel shadow-[4px_0_32px_rgba(0,0,0,0.5)]"
        >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)] shrink-0">
                <StatusDot status={status} />
                <span className="text-text-primary text-sm font-semibold font-heading flex-1">Conversation</span>
                <span className="text-text-muted text-[10px] font-body uppercase tracking-widest">
                    {status === 'connecting' ? 'connecting…'
                        : status === 'connected' ? 'listening'
                        : status === 'responding' ? 'speaking'
                        : status === 'error' ? 'error'
                        : ''}
                </span>
            </div>

            {/* Message log */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                {/* Connecting placeholder */}
                {status === 'connecting' && messages.length === 0 && (
                    <div className="flex items-center justify-center py-6">
                        <ThinkingDots />
                    </div>
                )}

                {messages.map((msg) => {
                    if (msg.role === 'tool') {
                        const icon = TOOL_ICONS[msg.toolName ?? ''] ?? '⚙️';
                        return (
                            <div key={msg.id} className="flex items-center justify-center my-1">
                                <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 max-w-[90%]">
                                    <span className="text-[12px] leading-none">{icon}</span>
                                    <span className="text-[11px] font-body text-text-muted tracking-wide">{msg.text}</span>
                                </div>
                            </div>
                        );
                    }

                    if (msg.role === 'user') {
                        return (
                            <div key={msg.id} className="flex justify-end">
                                <div className="max-w-[85%] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] rounded-l-xl rounded-br-xl rounded-tr-sm px-3 py-2">
                                    <span className="block text-[10px] font-bold uppercase tracking-widest mb-[3px] font-body text-[rgba(156,163,175,0.7)]">
                                        You
                                    </span>
                                    <p className="m-0 text-[13px] leading-relaxed font-body text-text-secondary">{msg.text}</p>
                                </div>
                            </div>
                        );
                    }

                    // rayan
                    return (
                        <div key={msg.id} className="flex justify-start">
                            <div className="max-w-[85%] bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.25)] rounded-r-xl rounded-bl-xl rounded-tl-sm px-3 py-2">
                                <span className="block text-[10px] font-bold uppercase tracking-widest mb-[3px] font-body text-[rgba(139,92,246,0.85)]">
                                    Rayan
                                </span>
                                <p className="m-0 text-[13px] leading-relaxed font-body text-text-primary">{msg.text}</p>
                            </div>
                        </div>
                    );
                })}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
    const colorClass =
        status === 'connected' ? 'bg-green-500'
        : status === 'responding' ? 'bg-indigo-500 animate-pulse'
        : status === 'connecting' ? 'bg-yellow-500 animate-pulse'
        : status === 'error' ? 'bg-red-500'
        : 'bg-gray-500';
    return <span className={`w-2 h-2 rounded-full shrink-0 ${colorClass}`} />;
}

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
