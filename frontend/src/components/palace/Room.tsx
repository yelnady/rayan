import { THEMES } from '../../config/themes';
import { WallsWithDoors } from './WallsWithDoors';
import { Lighting } from './Lighting';
import type { Room as RoomData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';

interface RoomProps {
  room: RoomData;
  doors?: DoorSpec[];
  children?: React.ReactNode;
}

export function Room({ room, doors = [], children }: RoomProps) {
  const { w, d, h } = room.dimensions;
  const theme = THEMES[room.style];

  return (
    <group position={[room.position.x, room.position.y, room.position.z]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={theme.lightColor} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[w / 2, h, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#1a1a2e" roughness={1} />
      </mesh>

      <WallsWithDoors width={w} depth={d} height={h} doors={doors} wallColor="#2a2a4a" />

      <Lighting theme={theme} roomWidth={w} roomHeight={h} roomDepth={d} />

      {children}
    </group>
  );
}
