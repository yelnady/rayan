import { jsx as _jsx } from "react/jsx-runtime";
import { FloatingBook } from './FloatingBook';
import { HologramFrame } from './HologramFrame';
import { FramedImage } from './FramedImage';
import { SpeechBubble } from './SpeechBubble';
import { CrystalOrb } from './CrystalOrb';
export function Artifact({ artifact, onClick, onHover }) {
    const pos = [
        artifact.position.x,
        artifact.position.y,
        artifact.position.z,
    ];
    const color = artifact.color ?? undefined;
    const handleClick = () => onClick?.(artifact);
    const handleHover = (hovered) => onHover?.(hovered ? artifact : null);
    switch (artifact.visual) {
        case 'floating_book':
            return (_jsx(FloatingBook, { position: pos, color: color, onClick: handleClick, onHover: handleHover }));
        case 'hologram_frame':
            return (_jsx(HologramFrame, { position: pos, color: color, onClick: handleClick, onHover: handleHover }));
        case 'framed_image':
            return (_jsx(FramedImage, { position: pos, color: color, thumbnailUrl: artifact.thumbnailUrl, onClick: handleClick, onHover: handleHover }));
        case 'speech_bubble':
            return (_jsx(SpeechBubble, { position: pos, color: color, onClick: handleClick, onHover: handleHover }));
        case 'crystal_orb':
            return (_jsx(CrystalOrb, { position: pos, color: color, onClick: handleClick, onHover: handleHover }));
        default:
            return null;
    }
}
