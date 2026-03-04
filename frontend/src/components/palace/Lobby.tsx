import { Text } from '@react-three/drei';
import { Door } from './Door';
import type { LobbyDoor, Room } from '../../types/palace';

const LOBBY_SIZE = 12;
const LOBBY_HEIGHT = 5;

interface LobbyProps {
  lobbyDoors: LobbyDoor[];
  rooms: Room[];
  onEnterRoom: (roomId: string) => void;
}

// Compute door position on a wall, supporting multiple doors per wall via doorIndex.
// doorIndex=0 → centre door, doorIndex=1 → offset right, etc.
const DOOR_SPACING = 2.2; // horizontal offset between doors on the same wall

function wallDoorPosition(wall: string, doorIndex: number): [number, number, number] {
  const offset = (doorIndex - 0) * DOOR_SPACING; // first door centred, extras shift right
  switch (wall) {
    case 'north':
      return [LOBBY_SIZE / 2 - 0.75 + offset, 0, 0.06];
    case 'south':
      return [LOBBY_SIZE / 2 - 0.75 + offset, 0, LOBBY_SIZE - 0.06];
    case 'east':
      return [LOBBY_SIZE - 0.06, 0, LOBBY_SIZE / 2 - 0.75 + offset];
    case 'west':
      return [0.06, 0, LOBBY_SIZE / 2 - 0.75 + offset];
    default:
      return [LOBBY_SIZE / 2, 0, 0];
  }
}

export function Lobby({ lobbyDoors, rooms, onEnterRoom }: LobbyProps) {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return (
    <group>
      {/* ── Lights first so everything picks them up ─────────────────────── */}
      {/* Bright white-ish ambient so nothing is pitch black */}
      <ambientLight intensity={2.5} color="#c8c0ff" />
      {/* Central overhead point light */}
      <pointLight
        position={[LOBBY_SIZE / 2, LOBBY_HEIGHT - 0.4, LOBBY_SIZE / 2]}
        intensity={8}
        color="#b8a8ff"
        distance={40}
        decay={2}
      />
      {/* Fill lights at each corner so walls are evenly lit */}
      <pointLight position={[1, 3, 1]} intensity={3} color="#9090ff" distance={20} decay={2} />
      <pointLight position={[11, 3, 1]} intensity={3} color="#9090ff" distance={20} decay={2} />
      <pointLight position={[1, 3, 11]} intensity={3} color="#9090ff" distance={20} decay={2} />
      <pointLight position={[11, 3, 11]} intensity={3} color="#9090ff" distance={20} decay={2} />

      {/* ── Floor ─────────────────────────────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LOBBY_SIZE / 2, 0, LOBBY_SIZE / 2]} receiveShadow>
        <planeGeometry args={[LOBBY_SIZE, LOBBY_SIZE]} />
        <meshStandardMaterial color="#2a2a5a" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* ── Ceiling ───────────────────────────────────────────────────────── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[LOBBY_SIZE / 2, LOBBY_HEIGHT, LOBBY_SIZE / 2]}>
        <planeGeometry args={[LOBBY_SIZE, LOBBY_SIZE]} />
        <meshStandardMaterial color="#1a1a38" />
      </mesh>

      {/* ── Walls (north / south) ─────────────────────────────────────────── */}
      {(['north', 'south'] as const).map((side) => (
        <mesh
          key={side}
          position={[LOBBY_SIZE / 2, LOBBY_HEIGHT / 2, side === 'north' ? 0 : LOBBY_SIZE]}
        >
          <planeGeometry args={[LOBBY_SIZE, LOBBY_HEIGHT]} />
          <meshStandardMaterial color="#383870" side={2} roughness={0.7} />
        </mesh>
      ))}

      {/* ── Walls (east / west) ───────────────────────────────────────────── */}
      {(['east', 'west'] as const).map((side) => (
        <mesh
          key={side}
          rotation={[0, Math.PI / 2, 0]}
          position={[side === 'east' ? LOBBY_SIZE : 0, LOBBY_HEIGHT / 2, LOBBY_SIZE / 2]}
        >
          <planeGeometry args={[LOBBY_SIZE, LOBBY_HEIGHT]} />
          <meshStandardMaterial color="#383870" side={2} roughness={0.7} />
        </mesh>
      ))}

      {/* ── Title text — at eye level, facing north (toward -Z) ──────────── */}
      {/* Positioned on the south wall (z=12) so you see it when looking ahead */}
      <Text
        position={[LOBBY_SIZE / 2, 2.2, LOBBY_SIZE - 0.1]}
        rotation={[0, Math.PI, 0]}   // face the camera (-Z direction)
        fontSize={0.7}
        color="#d0b8ff"
        anchorX="center"
        anchorY="middle"
        outlineColor="#6040c0"
        outlineWidth={0.02}
      >
        Memory Palace
      </Text>

      {/* ── Doors to rooms ────────────────────────────────────────────────── */}
      {lobbyDoors.map((ld) => {
        const room = roomMap.get(ld.roomId);
        const pos = wallDoorPosition(ld.wallPosition, ld.doorIndex ?? 0);
        return (
          <Door
            key={ld.roomId}
            wall={ld.wallPosition}
            position={pos}
            targetRoomName={room?.name}
            onEnter={() => onEnterRoom(ld.roomId)}
          />
        );
      })}
    </group>
  );
}
