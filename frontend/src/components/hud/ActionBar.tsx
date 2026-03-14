/**
 * ActionBar — bottom-center HUD with two clearly labelled actions:
 *   1. "Capture Memories"  → capture (webcam recording)
 *   2. "Relive Your Memories" → voice conversation
 *
 * Renders as a single glassmorphic pill with a hairline divider between sections.
 * Each section has an animated icon button + label + state sub-label.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCapture } from '../../hooks/useCapture';
import { useCaptureStore } from '../../stores/captureStore';
import { useVoice } from '../../hooks/useVoice';
import { useVoiceStore } from '../../stores/voiceStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useTransitionStore } from '../../stores/transitionStore';
import { usePalaceStore } from '../../stores/palaceStore';
import { audioEngine } from '../../services/audioEngine';

// ─── Reset View button ────────────────────────────────────────────────────────

// ─── More button (Mobile Only) ────────────────────────────────────────────────

function MoreSection() {
    const [showMenu, setShowMenu] = useState(false);
    const [muted, setMuted] = useState(() => audioEngine.isMuted);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = useState({ bottom: 0, left: 0 });

    useEffect(() => {
        if (showMenu && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setMenuPos({
                bottom: window.innerHeight - r.top + 8,
                left: r.left,
            });
        }
    }, [showMenu]);

    const resetView = useCameraStore((s) => s.resetView);
    const exitOverview = useCameraStore((s) => s.exitOverview);
    const isOverviewMode = useCameraStore((s) => s.isOverviewMode);
    const enterOverview = useCameraStore((s) => s.enterOverview);

    const handleReset = () => {
        const { startTransition } = useTransitionStore.getState();
        startTransition('exit', () => {
            exitOverview();
            usePalaceStore.getState().setCurrentRoomId(null);
            resetView();
            setShowMenu(false);
        });
    };

    const handleMapClick = () => {
        const { startTransition } = useTransitionStore.getState();
        startTransition('enter', () => {
            if (isOverviewMode) exitOverview();
            else enterOverview();
            setShowMenu(false);
        });
    };

    const handleMusicClick = () => {
        if (audioEngine.isMuted) {
            audioEngine.unmute();
        } else {
            audioEngine.mute();
        }
        setMuted(audioEngine.isMuted);
    };

    return (
        <div className="relative flex sm:hidden">
            {showMenu && createPortal(
                <div style={{ position: 'fixed', bottom: menuPos.bottom, left: menuPos.left, zIndex: 99999 }} className="bg-glass backdrop-blur-xl border border-border rounded-2xl p-1.5 flex flex-col gap-1 shadow-xl animate-[fadeIn_0.2s_ease] min-w-[140px]">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl border-none bg-transparent text-text-primary hover:bg-[rgba(0,0,0,0.05)] cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center shrink-0">
                            <HomeIcon size={14} />
                        </div>
                        <span className="font-body text-[13px] font-medium">Reset View</span>
                    </button>
                    <button
                        onClick={handleMapClick}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl border-none bg-transparent text-text-primary hover:bg-[rgba(0,0,0,0.05)] cursor-pointer"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOverviewMode ? 'bg-primary' : 'bg-[rgba(0,0,0,0.04)]'}`}>
                            <MapIcon active={isOverviewMode} size={14} />
                        </div>
                        <span className="font-body text-[13px] font-medium">{isOverviewMode ? 'Exit Map' : 'Show Map'}</span>
                    </button>
                    <button
                        onClick={handleMusicClick}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl border-none bg-transparent text-text-primary hover:bg-[rgba(0,0,0,0.05)] cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center shrink-0">
                            <MusicIcon muted={muted} size={14} />
                        </div>
                        <span className="font-body text-[13px] font-medium">{muted ? 'Music off' : 'Music on'}</span>
                    </button>
                </div>,
                document.body
            )}
            <button
                ref={btnRef}
                onClick={() => setShowMenu(!showMenu)}
                aria-label="More actions"
                className="flex flex-row items-center gap-1.5 py-1.5 px-2 bg-transparent border-none rounded-full cursor-pointer text-text-primary transition-background duration-150 hover:bg-surface-hover group"
            >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center shrink-0 transition-all duration-150 group-hover:bg-[rgba(0,0,0,0.08)]">
                    <MoreIcon size={18} />
                </div>
                <span className="font-body text-[10px] text-text-muted tracking-[0.03em] leading-none">More</span>
            </button>
        </div>
    );
}

// ─── Reset View button ────────────────────────────────────────────────────────

function ResetViewSection() {
    const resetView = useCameraStore((s) => s.resetView);
    const exitOverview = useCameraStore((s) => s.exitOverview);

    const handleReset = () => {
        const { startTransition } = useTransitionStore.getState();
        startTransition('exit', () => {
            exitOverview();
            usePalaceStore.getState().setCurrentRoomId(null);
            resetView();
        });
    };

    return (
        <button
            onClick={handleReset}
            aria-label="Reset view to palace entrance"
            title="Reset View"
            className="hidden sm:flex flex-col items-center gap-1 py-1.5 px-1.5 sm:px-3.5 bg-transparent border-none rounded-full cursor-pointer text-text-primary transition-background duration-150 hover:bg-surface-hover group"
        >
            <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center shrink-0 transition-all duration-150 group-hover:bg-[rgba(0,0,0,0.08)] group-active:scale-95"
            >
                <HomeIcon size={16} />
            </div>
            <span className="hidden sm:block font-body text-[10px] text-text-muted tracking-[0.03em] leading-none">
                Reset
            </span>
        </button>
    );
}

// ─── Overview button ──────────────────────────────────────────────────────────

function OverviewSection() {
    const isOverviewMode = useCameraStore((s) => s.isOverviewMode);
    const enterOverview = useCameraStore((s) => s.enterOverview);
    const exitOverview = useCameraStore((s) => s.exitOverview);

    const handleClick = () => {
        const { startTransition } = useTransitionStore.getState();
        startTransition('enter', () => {
            if (isOverviewMode) exitOverview();
            else enterOverview();
        });
    };

    return (
        <button
            onClick={handleClick}
            aria-label={isOverviewMode ? 'Exit overview' : 'Show overview of all rooms'}
            title={isOverviewMode ? 'Exit Overview' : 'Overview'}
            className="hidden sm:flex flex-col items-center gap-1 py-1.5 px-1.5 sm:px-3.5 bg-transparent border-none rounded-full cursor-pointer text-text-primary transition-background duration-150 hover:bg-surface-hover group"
        >
            <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 group-hover:bg-[rgba(0,0,0,0.08)] group-active:scale-95 ${isOverviewMode ? 'bg-primary' : 'bg-[rgba(0,0,0,0.04)]'}`}
            >
                <MapIcon active={isOverviewMode} size={16} />
            </div>
            <span className="hidden sm:block font-body text-[10px] text-text-muted tracking-[0.03em] leading-none">
                {isOverviewMode ? 'Exit Map' : 'Map'}
            </span>
        </button>
    );
}

// ─── Capture half ─────────────────────────────────────────────────────────────

function CaptureSection() {
    const { startCapture, stopCapture } = useCapture();
    const status = useCaptureStore((s) => s.status);
    const concepts = useCaptureStore((s) => s.concepts);
    const voiceStatus = useVoiceStore((s) => s.status);
    const [selectedSource, setSelectedSource] = useState<'webcam' | 'screen_share' | 'voice'>('webcam');
    const [showMenu, setShowMenu] = useState(false);

    const isCapturing = status === 'capturing';
    const isProcessing = status === 'processing';
    const voiceActive = voiceStatus !== 'disconnected' && voiceStatus !== 'error';
    const disabled = isProcessing || voiceActive;

    function handleMainClick() {
        if (isCapturing) stopCapture();
        else setShowMenu(!showMenu);
    }

    function handleStart(source: 'webcam' | 'screen_share' | 'voice') {
        setSelectedSource(source);
        setShowMenu(false);
        startCapture(source);
    }

    const btnColor = isCapturing
        ? 'bg-error'
        : 'bg-primary';

    const btnGlow = isCapturing
        ? 'shadow-[0_0_0_6px_rgba(248,113,113,0.1),0_4px_16px_rgba(239,68,68,0.35)]'
        : 'shadow-[0_0_0_6px_rgba(99,102,241,0.12),0_4px_16px_rgba(99,102,241,0.35)]';

    const subLabel = voiceActive
        ? 'Unavailable during chat'
        : isProcessing
            ? 'Thinking…'
            : isCapturing
                ? concepts.length > 0
                    ? `${concepts.length} concept${concepts.length !== 1 ? 's' : ''} found`
                    : 'Listening…'
                : selectedSource === 'webcam' ? 'Webcam' : selectedSource === 'voice' ? 'Voice' : 'Screen Share';

    return (
        <div className="relative">
            {/* Source Selection Menu */}
            {!isCapturing && showMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-glass backdrop-blur-xl border border-border rounded-2xl p-1.5 flex flex-col gap-1 shadow-xl animate-[fadeIn_0.2s_ease]">
                    <SourceOption
                        onClick={() => handleStart('webcam')}
                        icon={<CamIcon size={16} />}
                        label="Webcam"
                        active={selectedSource === 'webcam'}
                    />
                    <SourceOption
                        onClick={() => handleStart('screen_share')}
                        icon={<MapIcon size={16} active={false} />}
                        label="Screen"
                        active={selectedSource === 'screen_share'}
                    />
                    <SourceOption
                        onClick={() => handleStart('voice')}
                        icon={<MicIcon size={16} color="rgba(0,0,0,0.6)" />}
                        label="Voice Only"
                        active={selectedSource === 'voice'}
                    />
                </div>
            )}

            <button
                onClick={handleMainClick}
                disabled={disabled}
                aria-label={isCapturing ? 'Stop capture' : 'Open capture menu'}
                className={`action-section-btn flex items-center gap-2 sm:gap-3 py-1 sm:py-1.5 pr-2.5 sm:pr-4 pl-1 sm:pl-2 bg-transparent border-none rounded-full text-text-primary text-left transition-background duration-150 min-w-[50px] sm:min-w-[190px] group ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover'}`}
            >
                {/* Icon */}
                <div
                    className="w-10 h-10 sm:w-[46px] sm:h-[46px] rounded-full flex items-center justify-center shrink-0 transition-all duration-200 action-icon-wrap relative"
                >
                    <div className={`absolute inset-0 rounded-full ${btnColor} ${btnGlow} transition-colors duration-200 ${isCapturing ? 'animate-[capture-pulse_1.6s_ease-in-out_infinite]' : ''}`} />
                    <div className="relative z-10 flex items-center justify-center">
                        {isProcessing ? <SpinnerIcon color="#111827" size={18} /> : isCapturing ? <StopIcon size={16} /> : selectedSource === 'voice' ? <MicIcon size={18} color="#111827" /> : selectedSource === 'screen_share' ? <MapIcon size={18} active={false} /> : <CamIcon size={18} />}
                    </div>
                </div>

                {/* Labels */}
                <div className="flex flex-col gap-0.5">
                    <span className="font-body font-semibold text-[10.5px] sm:text-sm text-text-primary tracking-[0.01em] leading-[1.2] whitespace-nowrap">Capture Memories</span>
                    <span
                        className={`font-body text-[10px] sm:text-[11px] tracking-[0.02em] leading-[1.2] transition-colors duration-150 ${isCapturing ? 'text-[rgba(248,113,113,0.9)]' : 'text-text-muted'}`}
                    >
                        {isProcessing ? (
                            <span className="animate-[pulse-opacity_1s_ease_infinite]">{subLabel}</span>
                        ) : (
                            subLabel
                        )}
                    </span>
                </div>
            </button>
        </div>
    );
}

function SourceOption({ onClick, icon, label, active }: { onClick: () => void, icon: React.ReactNode, label: string, active: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl border-none cursor-pointer transition-colors w-full ${active ? 'bg-primary text-white' : 'bg-transparent text-text-primary hover:bg-[rgba(0,0,0,0.05)]'}`}
        >
            <div className="flex items-center justify-center shrink-0">{icon}</div>
            <span className="font-body text-[13px] font-medium whitespace-nowrap">{label}</span>
        </button>
    );
}

// ─── Voice half ───────────────────────────────────────────────────────────────

function VoiceSection() {
    const { status, muted, toggleMute, connect, disconnect } = useVoice();
    const captureStatus = useCaptureStore((s) => s.status);
    const showPanel = useVoiceStore((s) => s.showPanel);
    const setShowPanel = useVoiceStore((s) => s.setShowPanel);

    const handleClick = async () => {
        if (status === 'disconnected' || status === 'error') await connect();
        else if (status === 'connected' || status === 'responding') {
            if (!showPanel) setShowPanel(true);
            else toggleMute();
        }
    };

    const handleStop = () => {
        disconnect();
    };

    const isSessionActive = status !== 'disconnected' && status !== 'error' && status !== 'connecting';

    const isActive = status === 'connected' && !muted;
    const isResponding = status === 'responding';
    const isConnecting = status === 'connecting';
    const captureActive = captureStatus === 'capturing' || captureStatus === 'processing';
    const voiceDisabled = isConnecting || captureActive;

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

    const subLabel = captureActive
        ? 'Unavailable during capture'
        : status === 'disconnected' ? 'Tap to connect'
            : status === 'connecting' ? 'Connecting…'
                : status === 'error' ? 'Connection error'
                    : isResponding ? 'Rayan is speaking…'
                        : muted ? 'Muted — tap to unmute'
                            : 'Listening…';

    const ariaLabel =
        status === 'disconnected' ? 'Connect voice'
            : muted ? 'Unmute microphone'
                : 'Mute microphone';

    return (
        <button
            onClick={handleClick}
            disabled={voiceDisabled}
            aria-label={ariaLabel}
            className={`action-section-btn flex items-center gap-2 sm:gap-3 py-1 sm:py-1.5 sm:pr-4 pl-1 sm:pl-2 bg-transparent border-none rounded-full text-text-primary text-left transition-background duration-150 min-w-[50px] sm:min-w-[190px] group ${isSessionActive ? 'pr-1.5' : 'pr-2.5'} ${voiceDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover'}`}
        >
            {/* Icon */}
            <div
                className="w-10 h-10 sm:w-[46px] sm:h-[46px] rounded-full flex items-center justify-center shrink-0 transition-all duration-200 action-icon-wrap relative"
            >
                <div className={`absolute inset-0 rounded-full ${btnColor} ${btnGlow} transition-colors duration-200 ${isResponding ? 'animate-[voice-pulse_1.2s_ease-in-out_infinite]' : ''}`} />
                <div className="relative z-10 flex items-center justify-center">
                    {isConnecting ? (
                        <SpinnerIcon color="#111827" size={18} />
                    ) : isResponding ? (
                        <SpeakingIcon size={20} />
                    ) : isActive ? (
                        <MicIcon size={20} />
                    ) : status === 'error' ? (
                        <ErrorIcon size={20} />
                    ) : (
                        <MicOffIcon size={20} />
                    )}
                </div>
            </div>

            {/* Labels */}
            <div className="flex flex-col gap-0.5">
                <span className="font-body font-semibold text-[10.5px] sm:text-sm text-text-primary tracking-[0.01em] leading-[1.2] whitespace-nowrap">Relive Your Memories</span>
                <span
                    className={`font-body text-[10px] sm:text-[11px] tracking-[0.02em] leading-[1.2] transition-colors duration-150 ${isActive ? 'text-[rgba(74,222,128,0.9)]' : isResponding ? 'text-[rgba(167,139,250,0.9)]' : status === 'error' ? 'text-[rgba(248,113,113,0.9)]' : 'text-text-muted'}`}
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
                    className="w-5 h-5 sm:w-[26px] sm:h-[26px] rounded-full bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center cursor-pointer shrink-0 transition-background duration-150 ml-1 sm:ml-1 hover:bg-[rgba(239,68,68,0.2)]"
                >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="rgba(239,68,68,0.9)" className="sm:w-2.5 sm:h-2.5">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </div>
            )}
        </button>
    );
}

// ─── Movement Section (Desktop Only) ──────────────────────────────────────────

function MovementSection() {
    const setMobileMovement = useCameraStore((s) => s.setMobileMovement);
    const [activeKeys, setActiveKeys] = useState({ w: false, a: false, s: false, d: false });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') setActiveKeys(prev => ({ ...prev, w: true }));
            if (k === 'a' || k === 'arrowleft') setActiveKeys(prev => ({ ...prev, a: true }));
            if (k === 's' || k === 'arrowdown') setActiveKeys(prev => ({ ...prev, s: true }));
            if (k === 'd' || k === 'arrowright') setActiveKeys(prev => ({ ...prev, d: true }));
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') setActiveKeys(prev => ({ ...prev, w: false }));
            if (k === 'a' || k === 'arrowleft') setActiveKeys(prev => ({ ...prev, a: false }));
            if (k === 's' || k === 'arrowdown') setActiveKeys(prev => ({ ...prev, s: false }));
            if (k === 'd' || k === 'arrowright') setActiveKeys(prev => ({ ...prev, d: false }));
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const startMove = (key: 'w' | 'a' | 's' | 'd') => {
        const next = { ...activeKeys, [key]: true };
        setActiveKeys(next);
        updateMovement(next);
    };

    const stopMove = (key: 'w' | 'a' | 's' | 'd') => {
        const next = { ...activeKeys, [key]: false };
        setActiveKeys(next);
        updateMovement(next);
    };

    const updateMovement = (keys: { w: boolean, a: boolean, s: boolean, d: boolean }) => {
        const x = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        const z = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
        setMobileMovement({ x, z });
    };

    return (
        <div className="hidden sm:flex flex-col items-center gap-1 py-1.5 px-3 border-r border-border-light">
            <div className="flex flex-col items-center gap-0.5">
                <KeyButton
                    active={activeKeys.w}
                    icon={<ArrowIcon direction="up" />}
                    onStart={() => startMove('w')}
                    onEnd={() => stopMove('w')}
                />
                <div className="flex gap-0.5">
                    <KeyButton
                        active={activeKeys.a}
                        icon={<ArrowIcon direction="left" />}
                        onStart={() => startMove('a')}
                        onEnd={() => stopMove('a')}
                    />
                    <KeyButton
                        active={activeKeys.s}
                        icon={<ArrowIcon direction="down" />}
                        onStart={() => startMove('s')}
                        onEnd={() => stopMove('s')}
                    />
                    <KeyButton
                        active={activeKeys.d}
                        icon={<ArrowIcon direction="right" />}
                        onStart={() => startMove('d')}
                        onEnd={() => stopMove('d')}
                    />
                </div>
            </div>
            <span className="font-body text-[9px] text-text-muted tracking-[0.05em] uppercase font-semibold leading-none">
                Move
            </span>
        </div>
    );
}

function KeyButton({ active, icon, onStart, onEnd }: { active: boolean, icon: React.ReactNode, onStart: () => void, onEnd: () => void }) {
    return (
        <div
            onMouseDown={onStart}
            onMouseUp={onEnd}
            onMouseLeave={onEnd}
            onTouchStart={onStart}
            onTouchEnd={onEnd}
            className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center transition-all duration-75 ${active ? 'bg-primary text-white scale-90 shadow-sm' : 'bg-[rgba(0,0,0,0.04)] text-text-primary hover:bg-[rgba(0,0,0,0.08)]'
                } cursor-pointer select-none`}
        >
            {icon}
        </div>
    );
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
    const rotations = {
        up: '0deg',
        down: '180deg',
        left: '270deg',
        right: '90deg'
    };
    return (
        <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{
                transform: `rotate(${rotations[direction]})`,
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            <path d="M12 5l-8 11h16z" />
        </svg>
    );
}

// ─── Music toggle ─────────────────────────────────────────────────────────────

function MusicSection() {
    const [muted, setMuted] = useState(() => audioEngine.isMuted);

    const handleClick = () => {
        if (audioEngine.isMuted) {
            audioEngine.unmute();
        } else {
            audioEngine.mute();
        }
        setMuted(audioEngine.isMuted);
    };

    return (
        <button
            onClick={handleClick}
            aria-label={muted ? 'Unmute music' : 'Mute music'}
            title={muted ? 'Unmute music' : 'Mute music'}
            className="hidden sm:flex flex-col items-center gap-1 py-1.5 px-1.5 sm:px-3.5 bg-transparent border-none rounded-full cursor-pointer text-text-primary transition-background duration-150 hover:bg-surface-hover group"
        >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center shrink-0 transition-all duration-150 group-hover:bg-[rgba(0,0,0,0.08)] group-active:scale-95">
                <MusicIcon muted={muted} size={16} />
            </div>
            <span className="hidden sm:block font-body text-[10px] text-text-muted tracking-[0.03em] leading-none">
                {muted ? 'Music off' : 'Music'}
            </span>
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
                className="fixed bottom-safe left-1/2 -translate-x-1/2 z-hud flex items-center bg-glass backdrop-blur-xl border border-border rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] px-1 sm:px-2.5 py-1 sm:py-2.5 gap-0 animate-[bar-appear_0.4s_cubic-bezier(0.32,0,0.67,0)_both] max-w-[98vw] sm:max-w-none"
            >
                <MovementSection />
                <MoreSection />
                <ResetViewSection />

                {/* Divider - hidden when MoreSection is shown */}
                <div
                    aria-hidden="true"
                    className="hidden sm:block w-px h-10 sm:h-12 bg-border-light mx-0.5 sm:mx-1 shrink-0"
                />

                <OverviewSection />
                <MusicSection />

                {/* Divider */}
                <div
                    aria-hidden="true"
                    className="w-px h-10 sm:h-12 bg-border-light mx-0.5 sm:mx-1 shrink-0"
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

function MoreIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(0,0,0,0.6)">
            <circle cx="12" cy="7" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="17" r="1.5" />
        </svg>
    );
}

function HomeIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(0,0,0,0.6)">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
    );
}

function MapIcon({ active, size = 18 }: { active: boolean, size?: number }) {
    const fill = active ? '#ffffff' : 'rgba(0,0,0,0.6)';
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
            <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
        </svg>
    );
}

function CamIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#111827">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M17 3H7L4.5 6H2a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2.5L17 3zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
        </svg>
    );
}

function StopIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#ffffff">
            <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
    );
}

function MicIcon({ size = 20, color = "#ffffff" }: { size?: number, color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-2 4v6a2 2 0 0 0 4 0V5a2 2 0 0 0-4 0zm-4 6H4a8 8 0 0 0 16 0h-2a6 6 0 0 1-12 0zm6 8v2H9v2h6v-2h-3v-2z" />
        </svg>
    );
}

function MicOffIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(0,0,0,0.4)">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
        </svg>
    );
}

function SpeakingIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#ffffff">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            <path d="M18.5 12c0-2.93-1.73-5.45-4.5-6.32V5.6c3.39.9 5.5 3.65 5.5 6.4s-2.11 5.5-5.5 6.4v-.08c2.77-.87 4.5-3.39 4.5-6.32z" opacity="0.5" />
        </svg>
    );
}

function ErrorIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
    );
}

function MusicIcon({ muted, size = 18 }: { muted: boolean; size?: number }) {
    const fill = 'rgba(0,0,0,0.6)';
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            {muted && (
                <line x1="3" y1="3" x2="21" y2="21" stroke="rgba(239,68,68,0.85)" strokeWidth="2.5" strokeLinecap="round" />
            )}
        </svg>
    );
}

function SpinnerIcon({ color, size = 20 }: { color: string, size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
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
