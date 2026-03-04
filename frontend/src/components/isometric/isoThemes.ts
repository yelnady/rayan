import type { RoomStyle } from '../../types/palace';

export interface IsoTheme {
  topColor: string;
  sideColor: string;
  eastColor: string;
  shadowColor: string;
  glowColor: string;
  icon: string;
}

const THEMES: Record<RoomStyle | 'default', IsoTheme> = {
  library: {
    topColor: '#FDE68A',
    sideColor: '#F59E0B',
    eastColor: '#D97706',
    shadowColor: 'rgba(245,158,11,0.25)',
    glowColor: 'rgba(245,158,11,0.4)',
    icon: '📚',
  },
  lab: {
    topColor: '#BFDBFE',
    sideColor: '#3B82F6',
    eastColor: '#2563EB',
    shadowColor: 'rgba(59,130,246,0.25)',
    glowColor: 'rgba(59,130,246,0.4)',
    icon: '⚗️',
  },
  gallery: {
    topColor: '#F3F4F6',
    sideColor: '#9CA3AF',
    eastColor: '#6B7280',
    shadowColor: 'rgba(156,163,175,0.25)',
    glowColor: 'rgba(156,163,175,0.4)',
    icon: '🖼️',
  },
  garden: {
    topColor: '#BBF7D0',
    sideColor: '#22C55E',
    eastColor: '#16A34A',
    shadowColor: 'rgba(34,197,94,0.25)',
    glowColor: 'rgba(34,197,94,0.4)',
    icon: '🌿',
  },
  workshop: {
    topColor: '#FED7AA',
    sideColor: '#F97316',
    eastColor: '#EA580C',
    shadowColor: 'rgba(249,115,22,0.25)',
    glowColor: 'rgba(249,115,22,0.4)',
    icon: '⚙️',
  },
  default: {
    topColor: '#E9D5FF',
    sideColor: '#8B5CF6',
    eastColor: '#7C3AED',
    shadowColor: 'rgba(139,92,246,0.25)',
    glowColor: 'rgba(139,92,246,0.4)',
    icon: '✨',
  },
};

export function getIsoTheme(style?: string): IsoTheme {
  return THEMES[(style as RoomStyle) ?? 'default'] ?? THEMES.default;
}
