import { PLATFORM_W } from './isoLayout';

interface IsoRoomLabelProps {
  name: string;
  artifactCount: number;
  topColor: string;
}

/**
 * Room name + artifact count badge.
 * Counter-rotated so text faces the viewer (undoes the scene rotation).
 * rotateZ(45deg) rotateX(-55deg) is the inverse of the scene transform.
 */
export function IsoRoomLabel({ name, artifactCount, topColor }: IsoRoomLabelProps) {
  return (
    <div
      className="absolute top-1/2 left-1/2 flex flex-col items-center gap-1 pointer-events-none"
      style={{
        transform: 'translate(-50%, -50%) rotateZ(45deg) rotateX(-55deg)',
        width: PLATFORM_W - 16,
        transformStyle: 'preserve-3d',
      }}
    >
      <span className="font-body text-[11px] font-bold text-gray-900 text-center leading-[1.2] tracking-wide max-w-full overflow-hidden text-ellipsis whitespace-nowrap opacity-85">
        {name}
      </span>
      {artifactCount > 0 && (
        <span
          className="font-body text-[9px] font-bold text-gray-900 border border-[rgba(0,0,0,0.12)] rounded-full px-1.5 py-[1px] leading-[1.4]"
          style={{ background: topColor }}
        >
          {artifactCount}
        </span>
      )}
    </div>
  );
}
