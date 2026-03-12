import { useMemo, useState } from 'react';
import { usePalaceStore } from '../../stores/palaceStore';

// Accent color per room style — matches STYLE_THEMES in Room.tsx
const STYLE_DOT: Record<string, string> = {
  library:     '#D97706',
  lab:         '#38BDF8',
  gallery:     '#D1D5DB',
  garden:      '#4ADE80',
  workshop:    '#F97316',
  museum:      '#C8A45A',
  observatory: '#818CF8',
  sanctuary:   '#6EE7B7',
  studio:      '#FBBF24',
  dojo:        '#EF4444',
};

const MAP_W = 180;
const MAP_H = 120;
const PAD   = 10;
const LOBBY_WORLD = 12;

interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }

function toMini(wx: number, wz: number, b: Bounds, scale: number): [number, number] {
  return [PAD + (wx - b.minX) * scale, PAD + (wz - b.minZ) * scale];
}

interface PalaceMinimapProps {
  onEnterRoom: (roomId: string) => void;
  onEnterLobby: () => void;
}

export function PalaceMinimap({ onEnterRoom, onEnterLobby }: PalaceMinimapProps) {
  const { rooms, currentRoomId } = usePalaceStore();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const currentRoom = rooms.find(r => r.id === currentRoomId) ?? null;
  const label = currentRoomId === null ? 'Lobby' : (currentRoom?.name ?? '…');

  const { bounds, scale } = useMemo(() => {
    const allX = [0, LOBBY_WORLD, ...rooms.flatMap(r => [r.position.x, r.position.x + r.dimensions.w])];
    const allZ = [0, LOBBY_WORLD, ...rooms.flatMap(r => [r.position.z, r.position.z + r.dimensions.d])];
    const b: Bounds = {
      minX: Math.min(...allX), maxX: Math.max(...allX),
      minZ: Math.min(...allZ), maxZ: Math.max(...allZ),
    };
    const sx = (MAP_W - PAD * 2) / (b.maxX - b.minX || 1);
    const sz = (MAP_H - PAD * 2) / (b.maxZ - b.minZ || 1);
    return { bounds: b, scale: Math.min(sx, sz) };
  }, [rooms]);

  const [lx, lz] = toMini(0, 0, bounds, scale);
  const lw = Math.max(LOBBY_WORLD * scale, 10);
  const lh = Math.max(LOBBY_WORLD * scale, 10);
  const inLobby = currentRoomId === null;
  const lobbyHovered = hoveredId === '__lobby__';

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 50,
      background: 'rgba(5, 5, 18, 0.82)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      backdropFilter: 'blur(10px)',
      overflow: 'hidden',
      userSelect: 'none',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header / breadcrumb */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 10px',
          gap: 8,
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Palace Map
        </span>
        {/* Breadcrumb — show current location in a readable pill */}
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#fff',
          background: 'rgba(180,150,255,0.18)',
          border: '1px solid rgba(180,150,255,0.30)',
          borderRadius: 5,
          padding: '1px 7px',
          maxWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}>
          {label}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)' }}>{collapsed ? '▲' : '▼'}</span>
      </div>

      {!collapsed && (
        <svg
          width={MAP_W}
          height={MAP_H}
          style={{ display: 'block', cursor: 'default' }}
        >
          {/* Lobby */}
          <rect
            x={lx} y={lz} width={lw} height={lh} rx={2}
            fill={inLobby ? 'rgba(160,140,255,0.55)' : lobbyHovered ? 'rgba(130,110,230,0.45)' : 'rgba(70,60,130,0.38)'}
            stroke={inLobby ? '#c4b4ff' : lobbyHovered ? '#a090e0' : 'rgba(255,255,255,0.18)'}
            strokeWidth={inLobby ? 1.8 : lobbyHovered ? 1.2 : 0.8}
            style={{ cursor: inLobby ? 'default' : 'pointer', transition: 'fill 0.15s, stroke 0.15s' }}
            onClick={() => { if (!inLobby) onEnterLobby(); }}
            onMouseEnter={() => setHoveredId('__lobby__')}
            onMouseLeave={() => setHoveredId(null)}
          />
          <text
            x={lx + lw / 2} y={lz + lh / 2}
            textAnchor="middle" dominantBaseline="middle"
            fill="#ffffff"
            stroke="rgba(0,0,0,0.85)" strokeWidth={2.5}
            paintOrder="stroke"
            fontSize={7}
            style={{ pointerEvents: 'none' }}
          >
            Lobby
          </text>
          {inLobby && (
            <circle cx={lx + lw / 2} cy={lz + lh / 2} r={2.2} fill="#fff" style={{ pointerEvents: 'none' }}>
              <animate attributeName="r"       values="1.8;3.2;1.8" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.4;1"     dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Rooms */}
          {rooms.map(room => {
            const [rx, rz] = toMini(room.position.x, room.position.z, bounds, scale);
            const rw = Math.max(room.dimensions.w * scale, 8);
            const rh = Math.max(room.dimensions.d * scale, 8);
            const active = room.id === currentRoomId;
            const hov = hoveredId === room.id;
            const col = STYLE_DOT[room.style ?? 'library'] ?? '#888';
            const truncated = room.name.length > 11 ? room.name.slice(0, 10) + '…' : room.name;

            return (
              <g
                key={room.id}
                style={{ cursor: active ? 'default' : 'pointer' }}
                onClick={() => { if (!active) onEnterRoom(room.id); }}
                onMouseEnter={() => setHoveredId(room.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Hit-area slightly larger than the visual rect */}
                <rect x={rx - 2} y={rz - 2} width={rw + 4} height={rh + 4} fill="transparent" />

                <rect
                  x={rx} y={rz} width={rw} height={rh} rx={2}
                  fill={active ? `${col}99` : hov ? `${col}66` : `${col}33`}
                  stroke={active ? col : hov ? `${col}cc` : `${col}66`}
                  strokeWidth={active ? 1.8 : hov ? 1.2 : 0.8}
                  style={{ transition: 'fill 0.12s, stroke 0.12s' }}
                />

                {/* Room name — dark-outlined white text for contrast on any color */}
                {rh > 9 && (
                  <text
                    x={rx + rw / 2} y={rz + rh / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#ffffff"
                    stroke="rgba(0,0,0,0.90)" strokeWidth={2.5}
                    paintOrder="stroke"
                    fontSize={7}
                    fontWeight={active ? 700 : 400}
                    style={{ pointerEvents: 'none' }}
                  >
                    {truncated}
                  </text>
                )}

                {active && (
                  <circle cx={rx + rw / 2} cy={rz + rh / 2} r={2.2} fill="#fff" style={{ pointerEvents: 'none' }}>
                    <animate attributeName="r"       values="1.8;3.2;1.8" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.4;1"     dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Hover tooltip for short room labels when rect is tiny */}
                {hov && !active && rh <= 9 && (
                  <text
                    x={rx + rw / 2} y={rz - 4}
                    textAnchor="middle" dominantBaseline="auto"
                    fill="#ffffff"
                    stroke="rgba(0,0,0,0.90)" strokeWidth={2.5}
                    paintOrder="stroke"
                    fontSize={7}
                    style={{ pointerEvents: 'none' }}
                  >
                    {truncated}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
