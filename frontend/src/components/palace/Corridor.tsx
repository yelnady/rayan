import type { ThreePosition } from '../../types/three';

interface CorridorProps {
  from: ThreePosition;
  to: ThreePosition;
  color?: string;
}

export function Corridor({ from, to, color = '#888888' }: CorridorProps) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  const midX = (from.x + to.x) / 2;
  const midZ = (from.z + to.z) / 2;

  return (
    <group position={[midX, 0, midZ]} rotation={[0, angle, 0]}>
      {/* Floor strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2, length]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-1, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, length]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right wall */}
      <mesh position={[1, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, length]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Ceiling strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[2, length]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
