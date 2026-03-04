import { WallsWithDoors } from './WallsWithDoors';
import type { Room as RoomData } from '../../types/palace';
import type { DoorSpec } from '../../types/three';

interface RoomProps {
  room: RoomData;
  index: number;
  doors?: DoorSpec[];
  children?: React.ReactNode;
}

export function Room({ room, index, doors = [], children }: RoomProps) {
  // We determine the room theme based on its index
  const roomType = index % 3; // 0 = Comfort, 1 = Clarity, 2 = Imagination

  // Use dimensions from data, but we can override height for specific themes
  const w = room.dimensions.w;
  const d = room.dimensions.d;
  let h = room.dimensions.h;

  if (roomType === 0) h = 4; // Smaller, cocoon-like
  if (roomType === 1) h = 6; // Taller ceiling
  if (roomType === 2) h = 5; // Imagination

  return (
    <group position={[room.position.x, room.position.y, room.position.z]}>
      {roomType === 0 && <ComfortRoom w={w} d={d} h={h} />}
      {roomType === 1 && <ClarityRoom w={w} d={d} h={h} />}
      {roomType === 2 && <ImaginationRoom w={w} d={d} h={h} />}

      {/* We can still have walls with doors acting as invisible or themed cutouts if needed, but let's reuse normal WallsWithDoors with themed colors */}
      <WallsWithDoors
        width={w}
        depth={d}
        height={h}
        doors={doors}
        wallColor={
          roomType === 0 ? "#EFE7D8" :
            roomType === 1 ? "#F9F6F0" :
              "#EFE7D8" // Subtle change done within Room component
        }
      />

      {children}
    </group>
  );
}

function ComfortRoom({ w, d, h }: { w: number, d: number, h: number }) {
  // smaller, cocoon-like. 
  // Creamy fabric walls, warm beige sofa, floor lamp, no ceiling light.
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#D9BA9B" roughness={0.9} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[w / 2, h, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#EAE0D3" roughness={1} />
      </mesh>

      {/* Sofa (Abstract) */}
      <group position={[w / 2, 0, d / 2]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[3, 0.8, 1.2]} />
          <meshStandardMaterial color="#D1BFAe" roughness={1} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.9, -0.4]}>
          <boxGeometry args={[3, 1, 0.4]} />
          <meshStandardMaterial color="#D1BFAe" roughness={1} />
        </mesh>
      </group>

      {/* Floor lamp */}
      <group position={[w / 2 - 2, 0, d / 2 - 1]}>
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2]} />
          <meshStandardMaterial color="#888" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[0.3, 0.4, 0.6]} />
          <meshStandardMaterial color="#FFF1E6" roughness={1} transparent opacity={0.9} />
        </mesh>
        <pointLight position={[0, 2, 0]} intensity={3} color="#FFD1A9" distance={10} />
      </group>

      {/* Hidden cove light */}
      <rectAreaLight width={w} height={h} color="#FFD1A9" intensity={2} position={[w / 2, h - 0.5, d - 0.5]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

function ClarityRoom({ w, d, h }: { w: number, d: number, h: number }) {
  // taller ceiling, plaster walls, long wooden desk lit from below, large frosted window
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#E8DACB" roughness={0.8} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[w / 2, h, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#F9F6F0" roughness={1} />
      </mesh>

      {/* Floating Wooden Desk */}
      <group position={[w / 2, 1.2, d / 2 + 1]}>
        <mesh>
          <boxGeometry args={[4, 0.1, 1]} />
          <meshStandardMaterial color="#BCA38F" roughness={0.7} />
        </mesh>
        {/* Lit from below */}
        <pointLight position={[0, -0.5, 0]} intensity={2} color="#FFF5E1" distance={5} />
      </group>

      {/* Frosted Window (Glowing) */}
      <mesh position={[w / 2, h / 2, 0.05]}>
        <planeGeometry args={[w * 0.6, h * 0.5]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.6} roughness={0.2} emissive="#FFFFFF" emissiveIntensity={0.5} />
      </mesh>

      {/* Diffused daylight */}
      <ambientLight intensity={1.5} color="#F0F4F8" />
    </group>
  );
}

function ImaginationRoom({ w, d, h }: { w: number, d: number, h: number }) {
  // sloping ceiling, abstract sculptures, warm spotlights
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#E5C4A0" roughness={0.9} />
      </mesh>

      {/* Sloping Ceiling (Attic like) */}
      <mesh rotation={[Math.PI / 2, -Math.PI / 12, 0]} position={[w / 2, h, d / 2]}>
        <planeGeometry args={[w, d + 2]} />
        <meshStandardMaterial color="#FADBD8" roughness={1} />
      </mesh>

      {/* Abstract Sculpture */}
      <group position={[w / 2 + 1, 1.5, d / 2 - 1]}>
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <torusGeometry args={[0.5, 0.1, 16, 32]} />
          <meshStandardMaterial color="#D4A373" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh rotation={[-Math.PI / 4, 0, Math.PI / 4]} position={[0.2, 0.3, 0]}>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#FAEDCD" roughness={0.2} />
        </mesh>
      </group>

      {/* Warm Spotlights */}
      <spotLight position={[w / 2 - 2, h - 1, d / 2]} intensity={4} color="#FFC8A2" angle={0.5} penumbra={1} castShadow />
      <spotLight position={[w / 2 + 2, h - 1, d / 2 + 1]} intensity={3} color="#FFDAB9" angle={0.6} penumbra={1} castShadow />
    </group>
  );
}
