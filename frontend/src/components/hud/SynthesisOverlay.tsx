import { useState, useEffect } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';

// ── Keyframe styles injected once ─────────────────────────────────────────────
const STYLES = `
  @keyframes synth-orbit-a  { to { transform: rotateZ(360deg)  rotateX(65deg); } }
  @keyframes synth-orbit-b  { to { transform: rotateZ(-360deg) rotateX(35deg); } }
  @keyframes synth-orbit-c  { to { transform: rotateZ(360deg)  rotateX(80deg); } }
  @keyframes synth-core     { 0%,100%{ opacity:.7; transform:scale(.9); } 50%{ opacity:1; transform:scale(1.15); } }
  @keyframes synth-shimmer  { 0%{ background-position:-200% center; } 100%{ background-position:200% center; } }
  @keyframes synth-bar      { 0%{ transform:translateX(-100%); } 100%{ transform:translateX(400%); } }
  @keyframes synth-entry    { from{ opacity:0; transform:scale(.96) translateY(12px); } to{ opacity:1; transform:scale(1) translateY(0); } }
  @keyframes synth-reveal   { from{ opacity:0; transform:scale(.97); } to{ opacity:1; transform:scale(1); } }
  @keyframes synth-dot      { 0%,80%,100%{ opacity:0; } 40%{ opacity:1; } }

  .synth-title {
    background: linear-gradient(90deg, #c084fc 0%, #fbbf24 45%, #c084fc 70%, #a78bfa 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: synth-shimmer 2.4s linear infinite;
  }
`;

export function SynthesisOverlay() {
    const synthesisState = useVoiceStore(s => s.synthesisState);
    const imageUrl       = useVoiceStore(s => s.synthesisImageUrl);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Reset img-loaded flag when a new synthesis begins
    useEffect(() => {
        if (synthesisState === 'loading') setImgLoaded(false);
    }, [synthesisState]);

    if (synthesisState === 'idle') return null;

    function handleClose() {
        useVoiceStore.getState().setSynthesisState('idle');
        useVoiceStore.getState().setSynthesisImageUrl(null);
    }

    return (
        <>
            <style>{STYLES}</style>

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[500] flex items-center justify-center"
                style={{ background: 'rgba(4, 4, 16, 0.82)', backdropFilter: 'blur(10px)' }}
                onClick={synthesisState === 'done' ? handleClose : undefined}
            >
                {/* Card */}
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        animation: 'synth-entry 0.45s cubic-bezier(0.16,1,0.3,1) both',
                        background: 'linear-gradient(160deg, rgba(20,16,44,0.98) 0%, rgba(10,8,24,0.98) 100%)',
                        border: '1px solid rgba(167,139,250,0.18)',
                        borderRadius: 24,
                        boxShadow: '0 0 0 1px rgba(167,139,250,0.06), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.12)',
                        width: synthesisState === 'done' ? 'min(92vw, 720px)' : 360,
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {synthesisState === 'loading' && <LoadingPanel />}
                    {synthesisState === 'done' && imageUrl && (
                        <ResultPanel
                            url={imageUrl}
                            loaded={imgLoaded}
                            onLoad={() => setImgLoaded(true)}
                            onClose={handleClose}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

// ── Loading panel ──────────────────────────────────────────────────────────────

function LoadingPanel() {
    return (
        <div className="flex flex-col items-center px-10 py-10 gap-8">

            {/* Orbital rig */}
            <div className="relative flex items-center justify-center" style={{ width: 120, height: 120, perspective: 500 }}>
                {/* Ring A */}
                <div className="absolute inset-0 rounded-full"
                    style={{
                        border: '1.5px solid rgba(167,139,250,0.45)',
                        animation: 'synth-orbit-a 3.2s linear infinite',
                        transform: 'rotateX(65deg)',
                    }}
                />
                {/* Ring B */}
                <div className="absolute rounded-full"
                    style={{
                        inset: 14,
                        border: '1.5px solid rgba(251,191,36,0.35)',
                        animation: 'synth-orbit-b 2.1s linear infinite',
                        transform: 'rotateX(35deg)',
                    }}
                />
                {/* Ring C */}
                <div className="absolute rounded-full"
                    style={{
                        inset: 28,
                        border: '1px solid rgba(192,132,252,0.3)',
                        animation: 'synth-orbit-c 4.5s linear infinite',
                        transform: 'rotateX(80deg)',
                    }}
                />
                {/* Core orb */}
                <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #fde68a, #c084fc 55%, rgba(124,58,237,0.4) 100%)',
                    boxShadow: '0 0 18px rgba(251,191,36,0.55), 0 0 40px rgba(124,58,237,0.35)',
                    animation: 'synth-core 2s ease-in-out infinite',
                }} />
            </div>

            {/* Text */}
            <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="synth-title m-0 font-heading text-[14px] font-semibold tracking-[0.18em] uppercase">
                    Synthesizing
                </h2>
                <p className="m-0 font-body text-[12px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Weaving your memories into a mind map
                    <AnimatedDots />
                </p>
            </div>

            {/* Shimmer progress bar */}
            <div className="w-full relative overflow-hidden" style={{ height: 2, background: 'rgba(167,139,250,0.1)', borderRadius: 99 }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%', width: '45%',
                    background: 'linear-gradient(90deg, transparent, #c084fc, #fbbf24, #c084fc, transparent)',
                    animation: 'synth-bar 1.6s ease-in-out infinite',
                    borderRadius: 99,
                }} />
            </div>
        </div>
    );
}

function AnimatedDots() {
    return (
        <span className="inline-flex gap-[2px] ml-0.5" aria-hidden>
            {[0, 1, 2].map(i => (
                <span key={i} style={{
                    display: 'inline-block', width: 3, height: 3, borderRadius: '50%',
                    background: 'rgba(167,139,250,0.6)',
                    animation: `synth-dot 1.4s ${i * 0.22}s ease-in-out infinite`,
                }} />
            ))}
        </span>
    );
}

// ── Result panel ───────────────────────────────────────────────────────────────

function ResultPanel({ url, loaded, onLoad, onClose }: {
    url: string; loaded: boolean; onLoad: () => void; onClose: () => void;
}) {
    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
                <div className="flex items-center gap-3">
                    {/* Gold dot */}
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#fbbf24',
                        boxShadow: '0 0 8px rgba(251,191,36,0.7)',
                    }} />
                    <span className="synth-title font-heading text-[12px] font-semibold tracking-[0.16em] uppercase">
                        Mind Map Generated
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center rounded-full transition-colors"
                    style={{
                        width: 28, height: 28,
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 14,
                        cursor: 'pointer',
                    }}
                    title="Close"
                >
                    ✕
                </button>
            </div>

            {/* Image area */}
            <div className="relative flex-1 overflow-auto" style={{ minHeight: 200 }}>
                {/* Shimmer placeholder while image loads */}
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(10,8,24,0.9)' }}>
                        <div className="flex flex-col items-center gap-3">
                            <div className="rounded-full border-2 animate-spin"
                                style={{ width: 20, height: 20, borderColor: 'rgba(167,139,250,0.2)', borderTopColor: '#c084fc' }} />
                            <span className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                Rendering…
                            </span>
                        </div>
                    </div>
                )}
                <img
                    src={url}
                    onLoad={onLoad}
                    alt="Room synthesis mind map"
                    style={{
                        display: 'block', width: '100%', height: 'auto',
                        opacity: loaded ? 1 : 0,
                        transition: 'opacity 0.6s ease',
                        animation: loaded ? 'synth-reveal 0.5s ease both' : 'none',
                    }}
                />
                {/* Subtle inner glow overlay */}
                {loaded && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)',
                    }} />
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
                style={{ borderTop: '1px solid rgba(167,139,250,0.08)' }}>
                <span className="font-body text-[11px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                    Click outside to close
                </span>
                <button
                    onClick={onClose}
                    className="font-body text-[12px] transition-colors"
                    style={{ color: 'rgba(167,139,250,0.7)', cursor: 'pointer', background: 'none', border: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#c084fc')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(167,139,250,0.7)')}
                >
                    Dismiss
                </button>
            </div>
        </>
    );
}
