import { motion, AnimatePresence } from 'framer-motion';
import { usePalaceStore } from '../../stores/palaceStore';
import type { Room } from '../../types/palace';
import { MAP_SCALE } from './IslandCanvas';

interface IslandNodeProps {
    room: Room;
    isSelected: boolean;
    onSelect: (roomId: string) => void;
    onDeselect: () => void;
}

export function IslandNode({ room, isSelected, onSelect, onDeselect }: IslandNodeProps) {
    const artifacts = usePalaceStore((s) => s.artifacts[room.id]) || [];

    const WORLD_CENTER = 2500;
    const x = WORLD_CENTER + room.position.x * MAP_SCALE;
    const y = WORLD_CENTER + room.position.z * MAP_SCALE;

    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation(); // prevent parent pan from firing if we just want to select
        if (isSelected) {
            onDeselect();
        } else {
            onSelect(room.id);
        }
    };

    return (
        <motion.div
            layout
            style={{
                position: 'absolute',
                left: x,
                top: y,
                originX: 0.5,
                originY: 0.5,
                boxShadow: isSelected
                    ? '0 0 20px rgba(99, 102, 241, 0.4), 0 0 60px rgba(99, 102, 241, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.1)'
                    : '0 0 10px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.05)',
                borderRadius: isSelected ? '24px' : '50%',
                width: isSelected ? '320px' : '80px',
                height: isSelected ? 'auto' : '80px',
                minHeight: isSelected ? '400px' : '80px',
            }}
            initial={{ x: '-50%', y: '-50%', scale: 0 }}
            animate={{ x: '-50%', y: '-50%', scale: 1 }}
            className={`
        flex flex-col items-center justify-center
        border border-white/20
        backdrop-blur-xl
        cursor-pointer
        overflow-hidden
        transition-colors
        pointer-events-auto
        ${isSelected ? 'bg-indigo-900/40 z-50' : 'bg-slate-900/40 z-10 hover:bg-slate-800/60'}
      `}
            onPointerDown={handlePointerDown}
        >
            <motion.div layout="position" className="p-4 w-full flex flex-col items-center text-center">
                {/* If not selected, show simple icon or initial */}
                <AnimatePresence mode="popLayout">
                    {!isSelected && (
                        <motion.div
                            layoutId={`icon-${room.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-white/60 text-sm font-medium tracking-wider uppercase flex flex-col items-center gap-1"
                        >
                            <div className="w-4 h-4 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                            <div className="text-[10px] mt-1 line-clamp-1 break-all w-16 leading-tight">{room.name}</div>
                        </motion.div>
                    )}

                    {isSelected && (
                        <motion.div
                            layoutId={`content-${room.id}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: 0.1 }}
                            className="w-full flex flex-col"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] flex items-center justify-center text-white">
                                    ⟡
                                </div>
                                <h3 className="text-white text-lg font-semibold tracking-wide text-left flex-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                                    {room.name}
                                </h3>
                            </div>

                            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />

                            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 max-h-[250px] custom-scrollbar">
                                {artifacts.length === 0 ? (
                                    <p className="text-white/40 text-sm italic py-4">No memories captured here yet.</p>
                                ) : (
                                    artifacts.map((artifact) => (
                                        <div
                                            key={artifact.id}
                                            className="bg-white/5 border border-white/10 rounded-xl p-3 text-left hover:bg-white/10 transition-colors flex items-start flex-col gap-2 group"
                                        >
                                            <span className="text-white/80 text-sm line-clamp-2 leading-snug">{artifact.summary || 'A forgotten fragment'}</span>
                                            <span className="text-indigo-300/60 text-[10px] uppercase font-semibold group-hover:text-indigo-400 transition-colors">Recall</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Decorative base glow for expanded card */}
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-indigo-900/60 to-transparent pointer-events-none rounded-b-3xl" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
