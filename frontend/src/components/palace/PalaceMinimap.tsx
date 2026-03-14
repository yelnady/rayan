import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePalaceStore } from '../../stores/palaceStore';
import { palaceApi } from '../../services/palaceApi';

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

interface ContextMenu {
  roomId: string;
  x: number;
  y: number;
  confirmDelete: boolean;
}

export function PalaceMinimap({ onEnterRoom, onEnterLobby }: PalaceMinimapProps) {
  const { rooms, currentRoomId } = usePalaceStore();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const openMenu = useCallback((roomId: string, clientX: number, clientY: number) => {
    setContextMenu({ roomId, x: clientX, y: clientY, confirmDelete: false });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!contextMenu) return;
    setDeleting(true);
    try {
      await palaceApi.deleteRoom(contextMenu.roomId);
      usePalaceStore.getState().removeRoom(contextMenu.roomId);
    } catch (err) {
      console.error('[PalaceMinimap] delete room failed:', err);
    } finally {
      setDeleting(false);
      setContextMenu(null);
    }
  }, [contextMenu]);

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
    <>
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
            const words = room.name.split(' ');
            const midpoint = Math.ceil(words.length / 2);
            const line1 = words.slice(0, midpoint).join(' ').toUpperCase();
            const line2 = words.slice(midpoint).join(' ').toUpperCase();
            const labelY = rz + rh / 2 + (line2 ? -4 : 0);

            return (
              <g
                key={room.id}
                style={{ cursor: active ? 'default' : 'pointer' }}
                onClick={() => { if (!active) onEnterRoom(room.id); }}
                onContextMenu={(e) => { e.preventDefault(); openMenu(room.id, e.clientX, e.clientY); }}
                onMouseEnter={() => setHoveredId(room.id)}
                onMouseLeave={() => setHoveredId(null)}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  longPressRef.current = setTimeout(() => {
                    openMenu(room.id, touch.clientX, touch.clientY);
                  }, 500);
                }}
                onTouchEnd={() => {
                  if (longPressRef.current) clearTimeout(longPressRef.current);
                }}
                onTouchMove={() => {
                  if (longPressRef.current) clearTimeout(longPressRef.current);
                }}
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

                {/* Room name — always visible, split into two lines if multi-word */}
                <text
                  x={rx + rw / 2} y={labelY}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={col}
                  stroke="rgba(0,0,0,0.95)" strokeWidth={3}
                  paintOrder="stroke"
                  fontSize={7}
                  fontWeight={700}
                  letterSpacing="0.06em"
                  style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
                >
                  {line1}
                </text>
                {line2 && (
                  <text
                    x={rx + rw / 2} y={labelY + 9}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={col}
                    stroke="rgba(0,0,0,0.95)" strokeWidth={3}
                    paintOrder="stroke"
                    fontSize={7}
                    fontWeight={700}
                    letterSpacing="0.06em"
                    style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
                  >
                    {line2}
                  </text>
                )}

                {active && (
                  <circle cx={rx + rw / 2} cy={rz + rh / 2 + (line2 ? 5 : 0)} r={2.2} fill="#fff" style={{ pointerEvents: 'none' }}>
                    <animate attributeName="r"       values="1.8;3.2;1.8" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.4;1"     dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      )}

    </div>

    {/* Right-click / long-press context menu — rendered outside overflow:hidden so it isn't clipped */}
    {contextMenu && (() => {
        const menuRoom = rooms.find(r => r.id === contextMenu.roomId);
        return (
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 200,
              background: 'rgba(10, 10, 28, 0.96)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 8,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              minWidth: 160,
              overflow: 'hidden',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {/* Room name header */}
            <div style={{
              padding: '7px 12px 5px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {menuRoom?.name ?? 'Room'}
            </div>

            {/* Enter Room */}
            <button
              onClick={() => { setContextMenu(null); onEnterRoom(contextMenu.roomId); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: 12,
                color: '#fff',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Enter Room
            </button>

            {/* Delete Room — two-step confirm */}
            {!contextMenu.confirmDelete ? (
              <button
                onClick={() => setContextMenu(m => m ? { ...m, confirmDelete: true } : null)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'left',
                  fontSize: 12,
                  color: '#f87171',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Delete Room…
              </button>
            ) : (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 12px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 7, lineHeight: 1.4 }}>
                  Delete this room and all its memories?
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      background: deleting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.75)',
                      border: '1px solid rgba(239,68,68,0.5)',
                      borderRadius: 5,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: deleting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deleting ? '…' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setContextMenu(null)}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 5,
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
