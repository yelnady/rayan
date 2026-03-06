import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useWS } from '../../hooks/useWS';
import { stopVoiceSession } from '../../hooks/useVoice';

const TOOL_ICONS: Record<string, string> = {
    navigate_to_room: '🧭',
    highlight_artifact: '✨',
    save_artifact: '💾',
    end_session: '👋',
    capture_concept: '🧠',
};

export function ResponsePanel() {
    const status = useVoiceStore((s) => s.status);
    const messages = useVoiceStore((s) => s.messages);
    const showPanel = useVoiceStore((s) => s.showPanel);
    const setShowPanel = useVoiceStore((s) => s.setShowPanel);
    const clearMessages = useVoiceStore((s) => s.clearMessages);
    const bottomRef = useRef<HTMLDivElement>(null);
    const ws = useWS();

    // Auto-scroll to bottom as conversation grows
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleClear = () => {
        clearMessages();
        stopVoiceSession();
        ws.sendLiveSessionEnd();
    };

    if (!showPanel) return null;

    return (
        <div
            id="response-panel"
            role="region"
            aria-label="Voice conversation"
            aria-live="polite"
            className="fixed left-0 top-0 bottom-0 w-[320px] flex flex-col bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl border-r border-[rgba(0,0,0,0.08)] z-response-panel shadow-[0_0_40px_rgba(0,0,0,0.1)] transition-all duration-300 animate-[fadeIn_0.3s_ease]"
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(0,0,0,0.05)] shrink-0">
                <StatusDot status={status} />
                <span className="text-slate-900 text-sm font-bold font-heading flex-1 tracking-tight">Conversation</span>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mr-1">
                        {status === 'connecting' ? 'connecting'
                            : status === 'connected' ? 'listening'
                                : status === 'responding' ? 'speaking'
                                    : status === 'error' ? 'error'
                                        : 'offline'}
                    </span>
                    <button
                        onClick={handleClear}
                        className="p-1.5 rounded-full hover:bg-[rgba(0,0,0,0.05)] text-slate-400 hover:text-rose-500 transition-colors"
                        title="Clear conversation"
                    >
                        <TrashIcon />
                    </button>
                    <button
                        onClick={() => setShowPanel(false)}
                        className="p-1.5 rounded-full hover:bg-[rgba(0,0,0,0.05)] text-slate-400 hover:text-slate-600 transition-colors"
                        title="Hide conversation"
                    >
                        <CloseIcon />
                    </button>
                </div>
            </div>

            {/* Message log */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {/* Connecting placeholder */}
                {status === 'connecting' && messages.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                        <ThinkingDots />
                    </div>
                )}

                {messages.map((msg) => {
                    if (msg.role === 'tool') {
                        const icon = TOOL_ICONS[msg.toolName ?? ''] ?? '⚙️';
                        return (
                            <div key={msg.id} className="flex items-center justify-center my-1.5">
                                <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] rounded-full px-4 py-1.5 max-w-[95%]">
                                    <span className="text-[13px] leading-none">{icon}</span>
                                    <span className="text-[11px] font-semibold text-slate-500 tracking-wide">{msg.text}</span>
                                </div>
                            </div>
                        );
                    }

                    if (msg.role === 'user') {
                        return (
                            <div key={msg.id} className="flex justify-end">
                                <div className="max-w-[90%] bg-slate-100 border border-slate-200 rounded-l-2xl rounded-br-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                                    <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1 font-body text-slate-400">
                                        You
                                    </span>
                                    <p className="m-0 text-[14px] leading-relaxed font-body text-slate-800 font-medium">{msg.text}</p>
                                </div>
                            </div>
                        );
                    }

                    // rayan
                    return (
                        <div key={msg.id} className="flex justify-start">
                            <div className="max-w-[90%] bg-indigo-50 border border-indigo-100 rounded-r-2xl rounded-bl-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                                <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1 font-body text-indigo-500">
                                    Rayan
                                </span >
                                <p className="m-0 text-[14px] leading-relaxed font-body text-slate-900 font-medium">{msg.text}</p>
                            </div>
                        </div>
                    );
                })}

                <div ref={bottomRef} />
            </div>
        </div >
    );
}

// ── Icons ────────────────────────────────────────────────────────────

function CloseIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
    const colorClass =
        status === 'connected' ? 'bg-emerald-500'
            : status === 'responding' ? 'bg-indigo-500 animate-pulse'
                : status === 'connecting' ? 'bg-amber-500 animate-pulse'
                    : status === 'error' ? 'bg-rose-500'
                        : 'bg-slate-300';
    return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorClass}`} />;
}

function ThinkingDots() {
    return (
        <div className="flex gap-1.5 items-center" aria-hidden="true">
            {[0, 0.2, 0.4].map((delay, i) => (
                <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-[thinking-dot_1.2s_ease-in-out_infinite]"
                    style={{ animationDelay: `${delay}s` }}
                />
            ))}
        </div>
    );
}
