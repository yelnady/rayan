import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { FirstPersonControls } from '../navigation/FirstPersonControls';
import { PalaceMinimap } from './PalaceMinimap';
import { CameraSync } from './CameraSync';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { Corridor } from './Corridor';
import { Artifact } from '../artifacts/Artifact';
import { usePalaceStore } from '../../stores/palaceStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useTransitionStore } from '../../stores/transitionStore';
import { palaceApi } from '../../services/palaceApi';
import type { Artifact as ArtifactData } from '../../types/palace';
import type { DoorSpec, WallSide } from '../../types/three';
import type { LobbyDoor, WallPosition } from '../../types/palace';
import type { RoomPortal } from './Room';

// ─── T156 (deferred): When texture assets are added, register KTX2Loader here:
//   import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
//   import { useKTX2 } from '@react-three/drei';
//   Add to <Canvas> gl prop: { onCreated: ({ gl }) => { gl.initGLContext?.(); } }
//   Then use: const floorTex = useKTX2('/textures/floor.ktx2') in theme decorators.

import { useTexture, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';


const CANVAS_BASE_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  background: '#060614',
  transition: 'left 0.3s ease',
};

const WALL_CYCLE: WallPosition[] = ['north', 'east', 'south', 'west'];

interface PalaceCanvasProps {
  onArtifactClick?: (artifact: ArtifactData) => void;
  leftOffset?: number;
}

// Global massive ground plane that sits slightly below all rooms
function PalaceGround() {
  const groundTex = useTexture('/textures/palace_ground_texture.png');
  const groundMaterial = useMemo(() => {
    const tex = groundTex.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(50, 50); // Tile it heavily so it looks detailed across a massive area
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: tex,
      color: '#A0A0A0', // Slightly darken it so it's a moody background, not overly bright
      roughness: 0.6,
      metalness: 0.2, // Give it a slight sheen
    });
  }, [groundTex]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]} // Just below the floors of the rooms (y=0)
      receiveShadow
    >
      <planeGeometry args={[500, 500]} />
      <primitive object={groundMaterial} attach="material" />
    </mesh>
  );
}

// Bird's-eye OrbitControls — positions the camera and explicitly syncs the
// controls' internal spherical state via useLayoutEffect (runs before the
// first useFrame so OrbitControls.update() never sees a stale position).
function OverviewControls({ centerX, centerZ }: { centerX: number; centerZ: number }) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  useLayoutEffect(() => {
    camera.position.set(centerX, 35, centerZ + 45);
    (camera as THREE.PerspectiveCamera).fov = 50;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(centerX, 0, centerZ);
      controls.update();
    } else {
      camera.lookAt(centerX, 0, centerZ);
    }
  }, [camera, centerX, centerZ]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.listenToKeyEvents(window);
    return () => controls.stopListenToKeyEvents?.();
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}

interface DoorContextMenu {
  roomId: string;
  x: number;
  y: number;
  confirmDelete: boolean;
}

export function PalaceCanvas({ onArtifactClick, leftOffset = 0 }: PalaceCanvasProps) {
  const { palace, layout, rooms, artifacts, highlightedArtifactIds } = usePalaceStore();
  const isOverviewMode = useCameraStore((s) => s.isOverviewMode);

  // ── Door right-click context menu ───────────────────────────────────────────
  const [doorMenu, setDoorMenu] = useState<DoorContextMenu | null>(null);
  const [doorMenuDeleting, setDoorMenuDeleting] = useState(false);
  const doorMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doorMenu) return;
    const handler = (e: MouseEvent) => {
      if (doorMenuRef.current && !doorMenuRef.current.contains(e.target as Node)) {
        setDoorMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [doorMenu]);

  const handleDoorContextMenu = useCallback((roomId: string, screenX: number, screenY: number) => {
    setDoorMenu({ roomId, x: screenX, y: screenY, confirmDelete: false });
  }, []);

  const handleDoorDeleteConfirm = useCallback(async () => {
    if (!doorMenu) return;
    setDoorMenuDeleting(true);
    try {
      await palaceApi.deleteRoom(doorMenu.roomId);
      usePalaceStore.getState().removeRoom(doorMenu.roomId);
    } catch (err) {
      console.error('[PalaceCanvas] delete room failed:', err);
    } finally {
      setDoorMenuDeleting(false);
      setDoorMenu(null);
    }
  }, [doorMenu]);

  // Compute centroid of all rooms (+ lobby at 6,0,6) for overview camera target
  const overviewCenter = useMemo(() => {
    if (rooms.length === 0) return { x: 6, z: 6 };
    const xs = rooms.map((r) => r.position.x + r.dimensions.w / 2);
    const zs = rooms.map((r) => r.position.z + r.dimensions.d / 2);
    xs.push(6); zs.push(6); // include lobby center
    return {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      z: zs.reduce((a, b) => a + b, 0) / zs.length,
    };
  }, [rooms]);

  // Compute raw lobby doors (used in useMemo below — must happen before any hooks)
  const rawLobbyDoors = (() => {
    const base = layout?.lobbyDoors ?? [];
    if (base.length === 0 && rooms.length > 0) {
      return rooms.map((room, i): LobbyDoor => ({
        roomId: room.id,
        wallPosition: WALL_CYCLE[i % WALL_CYCLE.length],
        doorIndex: Math.floor(i / WALL_CYCLE.length),
      }));
    }
    return base;
  })();

  // T157: Memoize lobby doors to avoid unnecessary Lobby re-renders
  const lobbyDoors = useMemo(() => rawLobbyDoors, [JSON.stringify(rawLobbyDoors)]);

  // T157: Stable callback so Lobby/Door children don't re-render on every PalaceCanvas render
  const handleEnterRoom = useCallback((roomId: string) => {
    useTransitionStore.getState().startTransition('enter', () => {
      const state = usePalaceStore.getState();
      state.setCurrentRoomId(roomId);
      const targetRoom = state.rooms.find(r => r.id === roomId);
      const door = lobbyDoors.find(d => d.roomId === roomId);

      if (targetRoom) {
        useCameraStore.getState().exitOverview();

        const w = targetRoom.dimensions.w;
        const d = targetRoom.dimensions.d;
        const startX = targetRoom.position.x;
        const startZ = targetRoom.position.z;

        // Default: at the back (South), face North
        let entryX = startX + w / 2;
        let entryZ = startZ + d - 0.5;
        let lookX = entryX;
        let lookZ = startZ;

        // Adjust entry point and look-at based on which lobby wall the door is on.
        // If you walk through a North lobby door, you enter the South wall of the room.
        if (door) {
          switch (door.wallPosition) {
            case 'north': // Walk North -> Enter South looking North
              entryX = startX + w / 2;
              entryZ = startZ + d - 0.5;
              lookX = entryX;
              lookZ = startZ;
              break;
            case 'south': // Walk South -> Enter North looking South
              entryX = startX + w / 2;
              entryZ = startZ + 0.5;
              lookX = entryX;
              lookZ = startZ + d;
              break;
            case 'east': // Walk East -> Enter West looking East
              entryX = startX + 0.5;
              entryZ = startZ + d / 2;
              lookX = startX + w;
              lookZ = entryZ;
              break;
            case 'west': // Walk West -> Enter East looking West
              entryX = startX + w - 0.5;
              entryZ = startZ + d / 2;
              lookX = startX;
              lookZ = entryZ;
              break;
          }
        }

        useCameraStore.getState().teleport({ x: entryX, y: 1.7, z: entryZ });
        useCameraStore.getState().lookAt({ x: lookX, y: 1.7, z: lookZ });
        useCameraStore.getState().setFov(100);
      }
    });
  }, [lobbyDoors]);

  // T162: Stable callback to return to the center of the lobby
  const handleEnterLobby = useCallback(() => {
    useTransitionStore.getState().startTransition('enter', () => {
      usePalaceStore.getState().setCurrentRoomId(null);
      useCameraStore.getState().exitOverview();
      useCameraStore.getState().teleport({ x: 6, y: 1.7, z: 6 });
      useCameraStore.getState().lookAt({ x: 6, y: 1.7, z: 0 }); // Look North toward palace entrance
      useCameraStore.getState().setFov(75);
    });
  }, []);

  // Compute spatially adjacent room pairs (rooms one grid step apart, ~30 units)
  const roomPortals = useMemo(() => {
    const GRID_STEP = 30;
    const EPS = 8;
    const map: Record<string, RoomPortal[]> = {};
    const exitWallMap: Record<string, WallSide> = { north: 'south', south: 'north', east: 'west', west: 'east' };

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i], b = rooms[j];
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        let wallA: WallSide | null = null, wallB: WallSide | null = null;

        if (Math.abs(Math.abs(dx) - GRID_STEP) < EPS && Math.abs(dz) < EPS) {
          wallA = dx > 0 ? 'east' : 'west';
          wallB = dx > 0 ? 'west' : 'east';
        } else if (Math.abs(Math.abs(dz) - GRID_STEP) < EPS && Math.abs(dx) < EPS) {
          wallA = dz > 0 ? 'south' : 'north';
          wallB = dz > 0 ? 'north' : 'south';
        }
        if (!wallA || !wallB) continue;

        // Skip portal if it conflicts with the lobby exit door for that room
        const exitA = lobbyDoors.find(d => d.roomId === a.id);
        const exitB = lobbyDoors.find(d => d.roomId === b.id);
        const occupiedA = exitA ? exitWallMap[exitA.wallPosition] : null;
        const occupiedB = exitB ? exitWallMap[exitB.wallPosition] : null;
        if (wallA === occupiedA || wallB === occupiedB) continue;

        if (!map[a.id]) map[a.id] = [];
        if (!map[b.id]) map[b.id] = [];
        map[a.id].push({ wall: wallA, targetRoomId: b.id, targetRoomName: b.name });
        map[b.id].push({ wall: wallB, targetRoomId: a.id, targetRoomName: a.name });
      }
    }
    return map;
  }, [rooms, lobbyDoors]);

  // Direct room-to-room portal navigation (no lobby flythrough)
  const handlePortalEnter = useCallback((fromWall: WallSide, toRoomId: string) => {
    useTransitionStore.getState().startTransition('enter', () => {
      const palaceStore = usePalaceStore.getState();
      const target = palaceStore.rooms.find(r => r.id === toRoomId);
      if (!target) return;
      palaceStore.setCurrentRoomId(toRoomId);
      useCameraStore.getState().exitOverview();
      const { w, d } = target.dimensions;
      const { x: rx, z: rz } = target.position;
      // Enter from the wall opposite to the portal we came through
      const opposite: Record<WallSide, WallSide> = { east: 'west', west: 'east', north: 'south', south: 'north' };
      let ex = rx + w / 2, ez = rz + d / 2, lx = ex, lz = ez;
      switch (opposite[fromWall]) {
        case 'west':  ex = rx + 0.5;     ez = rz + d / 2; lx = rx + w;     lz = rz + d / 2; break;
        case 'east':  ex = rx + w - 0.5; ez = rz + d / 2; lx = rx;         lz = rz + d / 2; break;
        case 'north': ex = rx + w / 2;   ez = rz + d - 0.5; lx = rx + w / 2; lz = rz;       break;
        case 'south': ex = rx + w / 2;   ez = rz + 0.5;  lx = rx + w / 2; lz = rz + d;     break;
      }
      useCameraStore.getState().teleport({ x: ex, y: 1.7, z: ez });
      useCameraStore.getState().lookAt({ x: lx, y: 1.7, z: lz });
      useCameraStore.getState().setFov(100);
    });
  }, []);

  // Show nothing until the palace record itself exists (very brief flash at most)
  const canvasStyle = { ...CANVAS_BASE_STYLE, left: leftOffset };

  if (!palace) {
    return <div style={canvasStyle} />;
  }

  return (
    <>
      <Canvas
        style={canvasStyle}
        // T154: Tightened far plane (500→200) — all rooms are within ~100 units.
        // Three.js frustumCulled=true is the default on every mesh, so off-screen
        // geometry is already rejected by the GPU before rasterization.
        camera={{ fov: 75, near: 0.1, far: 200, position: [6, 1.7, 6] }}
        dpr={[1, 1.5]} // Caps pixel ratio on high-res screens (like Retina Macs) to prevent lag
        performance={{ min: 0.5 }} // Allows R3F to scale down performance if frame rate drops
        gl={{
          antialias: true,
          // T154: Hint the browser to favor the high-performance GPU on multi-GPU systems.
          powerPreference: 'high-performance',
        }}
      >
        <fog attach="fog" args={['#060614', isOverviewMode ? 60 : 20, isOverviewMode ? 200 : 80]} />

        <CameraSync leftOffset={leftOffset} />
        <ambientLight intensity={0.5} color="#fff8f0" />
        {/* T165: Global Environment — this is the #1 trick for 'premium' WebGL.
            It provides reflection/ambient light derived from a city map, so even
            in a 'shadow', objects reflect the city lights and never turn black. */}
        <Environment preset="city" />

        <Suspense fallback={null}>
          {/* Universal palace ground floor */}
          <PalaceGround />

          {/* Lobby — always rendered; doors are empty when layout hasn't loaded yet */}
          <Lobby
            lobbyDoors={lobbyDoors}
            rooms={rooms}
            onEnterRoom={handleEnterRoom}
            onEnterLobby={handleEnterLobby}
            onRoomContextMenu={handleDoorContextMenu}
          />

          {/* Rooms with their artifacts */}
          {rooms.map((room, index) => {
            // T157: doors array built per room
            // 1. Room-to-Room connections
            const roomDoors: DoorSpec[] = (room.connections ?? []).map((targetId, i) => ({
              wall: 'north',
              index: i + 1, // Start at index 1 to avoid overlap with potential exit door
              targetRoomId: targetId,
            }));

            // 2. Add Lobby Exit Door (mapped inverse from lobby door position)
            const lobbyDoor = lobbyDoors.find(d => d.roomId === room.id);
            if (lobbyDoor) {
              const exitWallMap: Record<string, WallPosition> = {
                'north': 'south',
                'south': 'north',
                'east': 'west',
                'west': 'east'
              };
              roomDoors.push({
                wall: exitWallMap[lobbyDoor.wallPosition] || 'south',
                index: 0, // Primary exit is always index 0
                targetRoomId: 'lobby'
              });
            }

            const roomArtifacts = artifacts[room.id] ?? [];

            // T153: books and orbs are now instanced inside Room via BookInstancedRenderer /
            // OrbInstancedRenderer — only pass the remaining types through children.
            const nonInstancedArtifacts = roomArtifacts.filter(
              (a) => a.visual !== 'floating_book' && a.visual !== 'crystal_orb',
            );

            return (
              <Room
                key={room.id}
                room={room}
                index={index}
                doors={roomDoors}
                portals={roomPortals[room.id] ?? []}
                artifacts={roomArtifacts}
                highlightedIds={highlightedArtifactIds}
                onArtifactClick={onArtifactClick}
                onEnter={() => handleEnterRoom(room.id)}
                onExitLobby={handleEnterLobby}
                onEnterPortal={handlePortalEnter}
              >
                {nonInstancedArtifacts.map((artifact) => (
                  <Artifact
                    key={artifact.id}
                    artifact={artifact}
                    onClick={onArtifactClick}
                    highlighted={highlightedArtifactIds.includes(artifact.id)}
                  />
                ))}
              </Room>
            );
          })}


          {/* Corridors */}
          {layout?.corridors?.map((c, i) => {
            const from = rooms.find((r) => r.id === c.fromRoomId)?.position;
            const to = rooms.find((r) => r.id === c.toRoomId)?.position;
            if (!from || !to) return null;
            return <Corridor key={i} from={from} to={to} />;
          })}

        </Suspense>

        {isOverviewMode
          ? <OverviewControls centerX={overviewCenter.x} centerZ={overviewCenter.z} />
          : <FirstPersonControls />
        }
      </Canvas>

      <PalaceMinimap onEnterRoom={handleEnterRoom} onEnterLobby={handleEnterLobby} />

      {/* Door right-click context menu */}
      {doorMenu && (() => {
        const menuRoom = rooms.find(r => r.id === doorMenu.roomId);
        return (
          <div
            ref={doorMenuRef}
            style={{
              position: 'fixed',
              top: doorMenu.y,
              left: doorMenu.x,
              zIndex: 200,
              background: 'rgba(10, 10, 28, 0.96)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 8,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              minWidth: 160,
              overflow: 'hidden',
              fontFamily: 'system-ui, sans-serif',
              userSelect: 'none',
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
              onClick={() => { setDoorMenu(null); handleEnterRoom(doorMenu.roomId); }}
              style={{
                display: 'block', width: '100%', padding: '8px 12px',
                background: 'none', border: 'none', textAlign: 'left',
                fontSize: 12, color: '#fff', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Enter Room
            </button>

            {/* Delete Room — two-step */}
            {!doorMenu.confirmDelete ? (
              <button
                onClick={() => setDoorMenu(m => m ? { ...m, confirmDelete: true } : null)}
                style={{
                  display: 'block', width: '100%', padding: '8px 12px',
                  background: 'none', border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'left', fontSize: 12, color: '#f87171', cursor: 'pointer',
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
                    onClick={handleDoorDeleteConfirm}
                    disabled={doorMenuDeleting}
                    style={{
                      flex: 1, padding: '5px 0',
                      background: doorMenuDeleting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.75)',
                      border: '1px solid rgba(239,68,68,0.5)',
                      borderRadius: 5, color: '#fff', fontSize: 11, fontWeight: 600,
                      cursor: doorMenuDeleting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {doorMenuDeleting ? '…' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setDoorMenu(null)}
                    style={{
                      flex: 1, padding: '5px 0',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 5, color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
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
