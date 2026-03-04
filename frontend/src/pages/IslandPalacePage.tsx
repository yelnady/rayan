import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { usePalaceStore } from '../stores/palaceStore';
import { usePalace } from '../hooks/usePalace';
import { useWS } from '../hooks/useWS';
import { IslandCanvas } from '../components/island/IslandCanvas';
import { IslandNode } from '../components/island/IslandNode';
import { ActionBar } from '../components/hud/ActionBar';
import { useNavigate } from 'react-router-dom';

export function IslandPalacePage() {
    const { loading, error, reload } = usePalace();
    const rooms = usePalaceStore(s => s.rooms);

    // Start WebSocket connection to receive artifacts
    useWS();

    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const navigate = useNavigate();

    // Dark radial gradient background for cinematic feel
    const pageStyle = {
        background: 'radial-gradient(ellipse at bottom, #0d1b2a 0%, #000000 100%)',
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white bg-slate-900">
                <div className="p-8 bg-slate-800 rounded-3xl text-center border border-red-500/30">
                    <h2 className="text-xl font-bold mb-4 text-red-400">Can't reach the palace</h2>
                    <p className="mb-6 opacity-70">{error}</p>
                    <button onClick={reload} className="px-6 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors">Try again</button>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle} className="w-screen h-screen relative overflow-hidden text-white flex">
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-indigo-500 border-r-2 border-r-transparent mb-4" />
                    <p className="tracking-widest uppercase text-xs opacity-50 ml-4 font-mono">Loading Mindscape...</p>
                </div>
            )}

            {/* Main Map Navigation */}
            <div className="flex-1 w-full h-full relative">
                <TransformWrapper
                    initialScale={0.8}
                    initialPositionX={-2500 + window.innerWidth / 2}
                    initialPositionY={-2500 + window.innerHeight / 2}
                    minScale={0.1}
                    maxScale={3}
                    limitToBounds={false}
                    wheel={{ step: 0.1 }}
                >
                    <TransformComponent wrapperClass="!w-full !h-full absolute inset-0" contentClass="w-[5000px] h-[5000px] relative">

                        {/* Canvas layered at the very back inside the transform component */}
                        <IslandCanvas />

                        {/* Render nodes */}
                        {rooms.map((room) => (
                            <IslandNode
                                key={room.id}
                                room={room}
                                isSelected={selectedRoomId === room.id}
                                onSelect={setSelectedRoomId}
                                onDeselect={() => setSelectedRoomId(null)}
                            />
                        ))}

                    </TransformComponent>
                </TransformWrapper>
            </div>

            {/* Temporary Switcher Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-white/5 border border-white/20 hover:bg-white/10 rounded-full backdrop-blur-md text-xs font-semibold tracking-wider uppercase flex items-center gap-2 transition-all shadow-xl"
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    Switch to 3D View
                </button>
            </div>

            {/* Standard HUD */}
            {!loading && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 text-xs text-white/50 tracking-widest uppercase">
                        Drag to pan • Scroll to zoom • Click node to expand
                    </div>
                </div>
            )}

            {/* HUD — bottom-center: unified action bar */}
            <ActionBar />
        </div>
    );
}
