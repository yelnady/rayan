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

// Map wall positions to world door positions
const WALL_DOOR_POSITION: Record<string, [number, number, number]> = {
  north: [LOBBY_SIZE / 2 - 0.75, 0, 0],
  south: [LOBBY_SIZE / 2 - 0.75, 0, LOBBY_SIZE],
  east: [LOBBY_SIZE - 0.06, 0, LOBBY_SIZE / 2 - 0.75],
  west: [0, 0, LOBBY_SIZE / 2 - 0.75],
};

export function Lobby({ lobbyDoors, rooms, onEnterRoom }: LobbyProps) {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LOBBY_SIZE / 2, 0, LOBBY_SIZE / 2]} receiveShadow>
        <planeGeometry args={[LOBBY_SIZE, LOBBY_SIZE]} />
        <meshStandardMaterial color="#1e1e3a" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[LOBBY_SIZE / 2, LOBBY_HEIGHT, LOBBY_SIZE / 2]}>
        <planeGeometry args={[LOBBY_SIZE, LOBBY_SIZE]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>

      {/* Walls */}
      {(['north', 'south'] as const).map((side) => (
        <mesh
          key={side}
          position={[LOBBY_SIZE / 2, LOBBY_HEIGHT / 2, side === 'north' ? 0 : LOBBY_SIZE]}
        >
          <planeGeometry args={[LOBBY_SIZE, LOBBY_HEIGHT]} />
          <meshStandardMaterial color="#252540" side={2} />
        </mesh>
      ))}
      {(['east', 'west'] as const).map((side) => (
        <mesh
          key={side}
          rotation={[0, Math.PI / 2, 0]}
          position={[side === 'east' ? LOBBY_SIZE : 0, LOBBY_HEIGHT / 2, LOBBY_SIZE / 2]}
        >
          <planeGeometry args={[LOBBY_SIZE, LOBBY_HEIGHT]} />
          <meshStandardMaterial color="#252540" side={2} />
        </mesh>
      ))}

      {/* Central pillar / title */}
      <Text
        position={[LOBBY_SIZE / 2, LOBBY_HEIGHT - 0.5, LOBBY_SIZE / 2]}
        fontSize={0.5}
        color="#c0a0ff"
        anchorX="center"
        anchorY="middle"
      >
        Memory Palace
      </Text>

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} color="#8080ff" />
      <pointLight position={[LOBBY_SIZE / 2, LOBBY_HEIGHT - 0.5, LOBBY_SIZE / 2]} intensity={1.2} color="#a090ff" distance={20} />

      {/* Doors to rooms */}
      {lobbyDoors.map((ld) => {
        const room = roomMap.get(ld.roomId);
        const pos = WALL_DOOR_POSITION[ld.wallPosition];
        if (!pos) return null;
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
