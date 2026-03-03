import type { ThemeConfig } from '../../config/themes';

interface LightingProps {
  theme: ThemeConfig;
  roomWidth?: number;
  roomHeight?: number;
  roomDepth?: number;
}

export function Lighting({
  theme,
  roomWidth = 8,
  roomHeight = 4,
  roomDepth = 8,
}: LightingProps) {
  return (
    <>
      <ambientLight color={theme.lightColor} intensity={theme.ambientIntensity} />
      {/* Main ceiling light */}
      <pointLight
        position={[roomWidth / 2, roomHeight - 0.3, roomDepth / 2]}
        color={theme.lightColor}
        intensity={theme.lightIntensity}
        distance={roomWidth * 2.5}
        decay={2}
        castShadow
      />
      {/* Fill light from below */}
      <pointLight
        position={[roomWidth / 2, 0.3, roomDepth / 2]}
        color={theme.lightColor}
        intensity={theme.lightIntensity * 0.15}
        distance={roomWidth}
        decay={2}
      />
    </>
  );
}
