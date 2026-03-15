import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useVoiceStore } from '../../stores/voiceStore';
import { useCaptureStore } from '../../stores/captureStore';

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

type Tab = 'capture' | 'recall';

export function ResponsePanel() {
    const [activeTab, setActiveTab] = useState<Tab>('capture');
    const [mobileExpanded, setMobileExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
    );
    const bottomRecallRef = useRef<HTMLDivElement>(null);
    const bottomCaptureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)');
        const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    // Voice state
    const voiceStatus = useVoiceStore((s) => s.status);
    const voiceMessages = useVoiceStore((s) => s.messages);
    const voiceShow = useVoiceStore((s) => s.showPanel);
    const voiceSetShow = useVoiceStore((s) => s.setShowPanel);

    // Capture state
    const captureStatus = useCaptureStore((s) => s.status);
    const captureMessages = useCaptureStore((s) => s.messages);
    const captureShow = useCaptureStore((s) => s.showPanel);
    const captureSetShow = useCaptureStore((s) => s.setShowPanel);

    const captureIsActive = captureShow && (
        captureStatus === 'capturing' || captureStatus === 'processing' ||
        captureStatus === 'complete' || captureMessages.length > 0
    );
    const panelVisible = voiceShow || captureIsActive;

    // Auto-switch to capture tab when capture becomes active; auto-expand on mobile
    useEffect(() => {
        if (captureIsActive) {
            setActiveTab('capture');
            setMobileExpanded(true);
        }
    }, [captureIsActive]);

    // Auto-switch to recall tab when voice session starts; auto-expand on mobile
    useEffect(() => {
        if (voiceShow && voiceStatus !== 'disconnected') {
            setActiveTab('recall');
            setMobileExpanded(true);
        }
    }, [voiceShow, voiceStatus]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRecallRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [voiceMessages]);
    useEffect(() => {
        bottomCaptureRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [captureMessages]);

    if (!panelVisible) return null;

    function closePanel() {
        voiceSetShow(false);
        captureSetShow(false);
        setMobileExpanded(false);
    }

    const recallStatusLabel =
        voiceStatus === 'connecting' ? 'connecting'
            : voiceStatus === 'connected' ? 'listening'
                : voiceStatus === 'responding' ? 'speaking'
                    : voiceStatus === 'error' ? 'error'
                        : 'offline';

    const captureStatusLabel =
        captureStatus === 'capturing' ? 'recording'
            : captureStatus === 'processing' ? 'processing'
                : captureStatus === 'complete' ? 'done'
                    : captureStatus === 'error' ? 'error'
                        : 'idle';

    // Capture is index 0 (left), Recall is index 1 (right)
    const translateX = activeTab === 'capture' ? 'translateX(0%)' : 'translateX(-100%)';

    const showContent = !isMobile || mobileExpanded;

    return (
        <div
            id="response-panel"
            role="region"
            aria-label="Memory palace panel"
            aria-live="polite"
            className="fixed z-response-panel flex flex-col animate-[fadeIn_0.25s_ease]"
            style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.68) 100%)',
                backdropFilter: 'blur(32px) saturate(160%) brightness(1.04)',
                WebkitBackdropFilter: 'blur(32px) saturate(160%) brightness(1.04)',
                ...(isMobile ? {
                    // Mobile: floating card above the ActionBar
                    left: '12px',
                    right: '12px',
                    bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
                    top: 'auto',
                    borderRadius: '18px',
                    height: mobileExpanded ? 'min(42vh, calc(100vh - 220px))' : 'auto',
                    transition: 'height 0.35s cubic-bezier(0.32,0.72,0,1)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                } : {
                    // Desktop: floating panel with padding all around
                    left: '8px',
                    top: '16px',
                    bottom: '16px',
                    width: '320px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.65)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
                }),
            }}
        >
            {/* Desktop-only header row */}
            {!isMobile && (
                <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 select-none">
                        Memory Palace
                    </span>
                    <button
                        onClick={closePanel}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-black/[0.06] transition-all duration-150"
                        title="Hide panel"
                    >
                        <CloseIcon />
                    </button>
                </div>
            )}

            {/* Segmented tab control */}
            <div className="px-4 pb-3 shrink-0" style={{ paddingTop: isMobile ? '10px' : undefined }}>
                <div className="relative flex p-1 rounded-[14px] gap-1" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.5)' }}>
                    {/* Sliding pill */}
                    <div
                        className="absolute top-1 bottom-1 rounded-[10px] transition-all duration-300 ease-out"
                        style={{
                            width: 'calc(50% - 6px)',
                            left: activeTab === 'capture' ? '4px' : 'calc(50% + 2px)',
                            background: 'linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
                            boxShadow: '0 1px 6px rgba(0,0,0,0.1), 0 0 0 0.5px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
                        }}
                    />
                    {/* Capture tab — left */}
                    <button
                        onClick={() => { setActiveTab('capture'); if (isMobile) setMobileExpanded(true); }}
                        className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2 rounded-[10px] transition-colors duration-200"
                    >
                        <StatusDot status={captureStatus} size="sm" />
                        <span className={`text-[11px] font-bold tracking-wide transition-colors duration-200 ${activeTab === 'capture' ? 'text-slate-800' : 'text-slate-600'}`}>
                            Capture
                        </span>
                        {captureIsActive && (
                            <span className={`text-[9px] font-semibold transition-all duration-200 ${activeTab === 'capture' ? 'text-indigo-500 opacity-100' : 'opacity-0'}`}>
                                · {captureStatusLabel}
                            </span>
                        )}
                    </button>
                    {/* Recall tab — right */}
                    <button
                        onClick={() => { setActiveTab('recall'); if (isMobile) setMobileExpanded(true); }}
                        className="relative z-10 flex-1 flex items-center justify-center gap-2 py-2 rounded-[10px] transition-colors duration-200"
                    >
                        <StatusDot status={voiceStatus} size="sm" />
                        <span className={`text-[11px] font-bold tracking-wide transition-colors duration-200 ${activeTab === 'recall' ? 'text-slate-800' : 'text-slate-600'}`}>
                            Recall
                        </span>
                        {voiceShow && voiceStatus !== 'disconnected' && (
                            <span className={`text-[9px] font-semibold transition-all duration-200 ${activeTab === 'recall' ? 'text-indigo-500 opacity-100' : 'opacity-0'}`}>
                                · {recallStatusLabel}
                            </span>
                        )}
                    </button>

                    {/* Mobile toggle — collapses/expands, never fully dismisses */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileExpanded(v => !v)}
                            aria-label={mobileExpanded ? 'Collapse' : 'Expand'}
                            className="relative z-10 w-9 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <ChevronIcon up={mobileExpanded} />
                        </button>
                    )}
                </div>
            </div>

            {/* Divider */}
            {showContent && <div className="h-px shrink-0" style={{ background: 'rgba(0,0,0,0.05)' }} />}

            {/* Tab content — Capture (index 0) left, Recall (index 1) right */}
            {showContent && (
                <div className="flex-1 overflow-hidden relative">
                    <div
                        className="absolute inset-0 flex transition-transform duration-300 ease-out"
                        style={{ transform: translateX }}
                    >
                        {/* Capture pane */}
                        <div className="w-full shrink-0 overflow-y-auto px-4 py-4 flex flex-col gap-2.5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
                            <MessageList
                                messages={captureMessages}
                                isStreaming={captureStatus === 'capturing'}
                                emptyStatus={captureStatus === 'capturing' ? 'capturing' : null}
                            />
                            <div ref={bottomCaptureRef} />
                        </div>

                        {/* Recall pane */}
                        <div className="w-full shrink-0 overflow-y-auto px-4 py-4 flex flex-col gap-2.5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
                            <MessageList
                                messages={voiceMessages}
                                isStreaming={voiceStatus === 'responding'}
                                emptyStatus={voiceStatus === 'connecting' ? 'connecting' : null}
                            />
                            <div ref={bottomRecallRef} />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer — desktop only (mobile has close in tab row) */}
            {!isMobile && (
                <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
                    <button
                        onClick={() => signOut(auth)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-150 text-[12px] font-semibold"
                    >
                        <SignOutIcon />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}

function MessageList({
    messages,
    isStreaming,
    emptyStatus,
}: {
    messages: { id: string; role: string; text: string; toolName?: string }[];
    isStreaming: boolean;
    emptyStatus: string | null;
}) {
    const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

    return (
        <>
            {emptyStatus && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <ThinkingDots status={emptyStatus} />
                </div>
            )}
            {messages.map((msg) => {
                const isLastStreaming = isStreaming && msg.id === lastMsgId;

                if (msg.role === 'tool') {
                    return (
                        <div
                            key={msg.id}
                            className="flex items-center justify-center my-1"
                            style={{ animation: 'fadeInUp 0.18s ease-out both' }}
                        >
                            <div className="flex items-center gap-1.5 rounded-full px-3.5 py-1 max-w-[95%]" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)' }}>
                                <span className="text-[12px] leading-none">{TOOL_ICONS[msg.toolName ?? ''] ?? '⚙️'}</span>
                                <span className="text-[10px] font-bold text-indigo-500 tracking-wide uppercase">{msg.text}</span>
                            </div>
                        </div>
                    );
                }

                if (msg.role === 'user') {
                    return (
                        <div
                            key={msg.id}
                            className="flex justify-end"
                            style={{ animation: 'fadeInUp 0.18s ease-out both' }}
                        >
                            <div className="max-w-[88%] rounded-2xl rounded-tr-sm px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <p className="m-0 text-[13.5px] leading-relaxed font-body text-slate-700 font-medium">
                                    {msg.text}
                                    {isLastStreaming && <StreamingCursor />}
                                </p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div
                        key={msg.id}
                        className="flex justify-start"
                        style={{ animation: 'fadeInUp 0.18s ease-out both' }}
                    >
                        <div className="max-w-[88%] rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.09) 100%)', border: '1px solid rgba(99,102,241,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                            <span className="block text-[9px] font-black uppercase tracking-[0.15em] mb-1 font-body" style={{ color: '#6366f1' }}>
                                Rayan
                            </span>
                            <p className="m-0 text-[13.5px] leading-relaxed font-body text-slate-800 font-medium">
                                {msg.text}
                                {isLastStreaming && <StreamingCursor />}
                            </p>
                        </div>
                    </div>
                );
            })}
        </>
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

function ChevronIcon({ up }: { up: boolean }) {
    return (
        <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.3s ease', transform: up ? 'rotate(0deg)' : 'rotate(180deg)' }}
        >
            <polyline points="18 15 12 9 6 15" />
        </svg>
    );
}

function SignOutIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
    const colorClass =
        status === 'connected' || status === 'capturing' ? 'bg-emerald-500'
            : status === 'responding' || status === 'processing' ? 'bg-indigo-500 animate-pulse'
                : status === 'connecting' || status === 'recording' ? 'bg-amber-500 animate-pulse'
                    : status === 'error' ? 'bg-rose-500'
                        : 'bg-slate-300';
    const sizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5';
    return <span className={`${sizeClass} rounded-full shrink-0 ${colorClass}`} />;
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
        <div className="flex flex-col items-center gap-3" aria-hidden="true">
            {isRecording ? (
                <>
                    <div className="flex gap-1 items-center">
                        {[0, 0.15, 0.3].map((delay, i) => (
                            <div
                                key={i}
                                className="w-1 rounded-full bg-amber-400 animate-[thinking-dot_0.9s_ease-in-out_infinite]"
                                style={{ animationDelay: `${delay}s`, height: `${12 + i * 4}px` }}
                            />
                        ))}
                    </div>
                    <span className="text-[11px] font-bold text-amber-500 tracking-widest uppercase">Recording</span>
                </>
            ) : (
                <>
                    <div className="flex gap-1.5 items-center">
                        {[0, 0.2, 0.4].map((delay, i) => (
                            <div
                                key={i}
                                className="w-2 h-2 rounded-full bg-indigo-300 animate-[thinking-dot_1.2s_ease-in-out_infinite]"
                                style={{ animationDelay: `${delay}s` }}
                            />
                        ))}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Connecting</span>
                </>
            )}
        </div>
    );
}
