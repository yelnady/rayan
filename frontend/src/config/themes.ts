import type { RoomStyle } from '../types/palace';

export interface ThemeConfig {
  floorTexture: string;
  wallTexture: string;
  lightColor: string;
  lightIntensity: number;
  fogColor: string;
  particleColor: string;
  ambientIntensity: number;
}

export const THEMES: Record<RoomStyle, ThemeConfig> = {
  library: {
    floorTexture: '/textures/library/floor.jpg',
    wallTexture: '/textures/library/wall.jpg',
    lightColor: '#FFA500',
    lightIntensity: 0.8,
    fogColor: '#2A1810',
    particleColor: '#FFD700',
    ambientIntensity: 0.3,
  },
  lab: {
    floorTexture: '/textures/lab/floor.jpg',
    wallTexture: '/textures/lab/wall.jpg',
    lightColor: '#4A90D9',
    lightIntensity: 1.0,
    fogColor: '#1A2A3A',
    particleColor: '#00BFFF',
    ambientIntensity: 0.5,
  },
  gallery: {
    floorTexture: '/textures/gallery/floor.jpg',
    wallTexture: '/textures/gallery/wall.jpg',
    lightColor: '#FFFFFF',
    lightIntensity: 0.9,
    fogColor: '#F0F0F0',
    particleColor: '#E0E0E0',
    ambientIntensity: 0.6,
  },
  garden: {
    floorTexture: '/textures/garden/floor.jpg',
    wallTexture: '/textures/garden/wall.jpg',
    lightColor: '#90EE90',
    lightIntensity: 1.1,
    fogColor: '#1A3A1A',
    particleColor: '#32CD32',
    ambientIntensity: 0.5,
  },
  workshop: {
    floorTexture: '/textures/workshop/floor.jpg',
    wallTexture: '/textures/workshop/wall.jpg',
    lightColor: '#FFA07A',
    lightIntensity: 0.7,
    fogColor: '#2A2520',
    particleColor: '#FF6347',
    ambientIntensity: 0.25,
  },
};
