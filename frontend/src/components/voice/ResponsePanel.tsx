import { useEffect, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useCaptureStore } from '../../stores/captureStore';
import { useWS } from '../../hooks/useWS';
import { stopVoiceSession } from '../../hooks/useVoice';
import { stopCapture } from '../../hooks/useCapture';

const TOOL_ICONS: Record<string, string> = {
    navigate_to_room: '🧭',
    navigate_to_map_view: '🗺️',
    navigate_horizontal: '↔️',
    highlight_artifact: '✨',
    save_artifact: '💾',
    create_artifact: '💾',
    create_room: '🏛️',
    edit_artifact: '✏️',
    delete_artifact: '🗑️',
    end_session: '👋',
    web_search: '🔍',
    memory_search: '🔮',
    capture_concept: '🧠',
    take_screenshot: '📸',
    session_start: '🎙️',
    session_end: '🏁',
};

type PanelMode = 'voice' | 'capture' | null;

function usePanelMode(): PanelMode {
    const voiceShow = useVoiceStore((s) => s.showPanel);
    const captureShow = useCaptureStore((s) => s.showPanel);
    const captureStatus = useCaptureStore((s) => s.status);

    // Prioritize capture when active or just completed
    if (captureShow && (captureStatus === 'capturing' || captureStatus === 'processing' || captureStatus === 'complete')) {
        return 'capture';
    }
    if (voiceShow) {
        return 'voice';
    }
    return null;
}

export function ResponsePanel() {
    const panelMode = usePanelMode();
    const ws = useWS();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Voice state
    const voiceStatus = useVoiceStore((s) => s.status);
    const voiceMessages = useVoiceStore((s) => s.messages);
    const voiceSetShow = useVoiceStore((s) => s.setShowPanel);
    const voiceClearMessages = useVoiceStore((s) => s.clearMessages);

    // Capture state
    const captureStatus = useCaptureStore((s) => s.status);
    const captureMessages = useCaptureStore((s) => s.messages);
    const captureSetShow = useCaptureStore((s) => s.setShowPanel);
    const captureClearMessages = useCaptureStore((s) => s.clearMessages);

    // Determine active mode state
    const status = panelMode === 'voice' ? voiceStatus : captureStatus;
    const messages = panelMode === 'voice' ? voiceMessages : captureMessages;
    const setShowPanel = panelMode === 'voice' ? voiceSetShow : captureSetShow;
    const clearMessages = panelMode === 'voice' ? voiceClearMessages : captureClearMessages;
    const modeLabel = panelMode === 'voice' ? 'Conversation' : 'Capture Session';

    const isStreaming =
        (panelMode === 'voice' && voiceStatus === 'responding') ||
        (panelMode === 'capture' && captureStatus === 'capturing');
    const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

    // Auto-scroll to bottom as conversation grows
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleClear = () => {
        clearMessages();
        if (panelMode === 'voice') {
            stopVoiceSession();
            ws.sendLiveSessionEnd();
        } else {
            stopCapture();
        }
    };

    if (!panelMode) return null;

    // Status label logic
    const statusLabel = panelMode === 'voice'
        ? (voiceStatus === 'connecting' ? 'connecting'
            : voiceStatus === 'connected' ? 'listening'
                : voiceStatus === 'responding' ? 'speaking'
                    : voiceStatus === 'error' ? 'error'
                        : 'offline')
        : (captureStatus === 'capturing' ? 'recording'
            : captureStatus === 'processing' ? 'processing'
                : captureStatus === 'complete' ? 'done'
                    : captureStatus === 'error' ? 'error'
                        : 'idle');

    return (
        <div
            id="response-panel"
            role="region"
            aria-label={panelMode === 'voice' ? "Voice conversation" : "Capture session"}
            aria-live="polite"
            className="fixed z-response-panel flex flex-col bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.1)] transition-all duration-300 animate-[fadeIn_0.3s_ease] max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:h-[50vh] max-sm:rounded-t-2xl max-sm:border-t max-sm:border-[rgba(0,0,0,0.08)] sm:left-0 sm:top-0 sm:bottom-0 sm:w-[320px] sm:border-r sm:border-[rgba(0,0,0,0.08)]"
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(0,0,0,0.05)] shrink-0">
                <StatusDot status={status} />
                <span className="text-slate-900 text-sm font-bold font-heading flex-1 tracking-tight">{modeLabel}</span>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mr-1">
                        {statusLabel}
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
                        title="Hide panel"
                    >
                        <CloseIcon />
                    </button>
                </div>
            </div>

            {/* Message log */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
                {/* Connecting/Recording placeholder */}
                {(status === 'connecting' || status === 'capturing') && messages.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                        <ThinkingDots status={status} />
                    </div>
                )}

                {messages.map((msg) => {
                    const isLastStreaming = isStreaming && msg.id === lastMsgId;

                    if (msg.role === 'tool') {
                        return (
                            <div
                                key={msg.id}
                                className="flex items-center justify-center my-1.5"
                                style={{ animation: 'fadeInUp 0.2s ease-out both' }}
                            >
                                <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] rounded-full px-4 py-1.5 max-w-[95%]">
                                    <span className="text-[13px] leading-none">{TOOL_ICONS[msg.toolName ?? ''] ?? '⚙️'}</span>
                                    <span className="text-[11px] font-semibold text-slate-500 tracking-wide">{msg.text}</span>
                                </div>
                            </div>
                        );
                    }

                    if (msg.role === 'user') {
                        return (
                            <div
                                key={msg.id}
                                className="flex justify-end"
                                style={{ animation: 'fadeInUp 0.2s ease-out both' }}
                            >
                                <div className="max-w-[90%] bg-slate-100 border border-slate-200 rounded-l-2xl rounded-br-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                                    <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1 font-body text-slate-400">
                                        You
                                    </span>
                                    <p className="m-0 text-[14px] leading-relaxed font-body text-slate-800 font-medium">
                                        {msg.text}
                                        {isLastStreaming && <StreamingCursor />}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    // rayan
                    return (
                        <div
                            key={msg.id}
                            className="flex justify-start"
                            style={{ animation: 'fadeInUp 0.2s ease-out both' }}
                        >
                            <div className="max-w-[90%] bg-indigo-50 border border-indigo-100 rounded-r-2xl rounded-bl-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                                <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1 font-body text-indigo-500">
                                    Rayan
                                </span>
                                <p className="m-0 text-[14px] leading-relaxed font-body text-slate-900 font-medium">
                                    {msg.text}
                                    {isLastStreaming && <StreamingCursor />}
                                </p>
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
        status === 'connected' || status === 'capturing' ? 'bg-emerald-500'
            : status === 'responding' || status === 'processing' ? 'bg-indigo-500 animate-pulse'
                : status === 'connecting' || status === 'recording' ? 'bg-amber-500 animate-pulse'
                    : status === 'error' ? 'bg-rose-500'
                        : 'bg-slate-300';
    return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorClass}`} />;
}

function StreamingCursor() {
    return (
        <span
            aria-hidden="true"
            style={{
                display: 'inline-block',
                width: '2px',
                height: '0.85em',
                background: 'currentColor',
                borderRadius: '1px',
                marginLeft: '2px',
                verticalAlign: '-0.1em',
                opacity: 0.5,
                animation: 'cursor-blink 0.9s ease-in-out infinite',
            }}
        />
    );
}

function ThinkingDots({ status }: { status: string }) {
    const isRecording = status === 'capturing' || status === 'recording';
    return (
        <div className="flex gap-1.5 items-center" aria-hidden="true">
            {isRecording ? (
                <span className="text-amber-500 text-[11px] font-semibold">● Recording...</span>
            ) : (
                [0, 0.2, 0.4].map((delay, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-indigo-400 animate-[thinking-dot_1.2s_ease-in-out_infinite]"
                        style={{ animationDelay: `${delay}s` }}
                    />
                ))
            )}
        </div>
    );
}
