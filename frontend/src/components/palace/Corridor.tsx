import type { ThreePosition } from '../../types/three';

interface CorridorProps {
  from: ThreePosition;
  to: ThreePosition;
}

export function Corridor({ from, to }: CorridorProps) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  const midX = (from.x + to.x) / 2;
  const midZ = (from.z + to.z) / 2;

  return (
    <group position={[midX, 0, midZ]} rotation={[0, angle, 0]}>
      {/* Floor strip (Light Oak) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2, length]} />
        <meshStandardMaterial color="#D9BA9B" roughness={0.8} />
      </mesh>

      {/* Left wall (Ivory Vanilla Limewash) */}
      <mesh position={[-1, 2, 0]}>
        <boxGeometry args={[0.1, 4, length]} />
        <meshStandardMaterial color="#F3EBE1" roughness={0.9} />
      </mesh>

      {/* Right wall (Ivory Vanilla Limewash) */}
      <mesh position={[1, 2, 0]}>
        <boxGeometry args={[0.1, 4, length]} />
        <meshStandardMaterial color="#F3EBE1" roughness={0.9} />
      </mesh>

      {/* Ceiling strip (Creamy) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 4, 0]}>
        <planeGeometry args={[2, length]} />
        <meshStandardMaterial color="#F9F6F0" roughness={1} />
      </mesh>

      {/* Corridor glow */}
      <pointLight position={[0, 3.5, 0]} intensity={2} color="#FFF5E1" distance={10} decay={2} />
    </group>
  );
}
