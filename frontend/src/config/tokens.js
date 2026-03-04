/**
 * Design tokens — single source of truth for all visual values in the app.
 *
 * Import from here instead of hardcoding colors, fonts, radii, or shadows.
 */
export const colors = {
    // ── Core palette ──────────────────────────────────────────────────────────
    primary: '#6366f1', // Indigo-500 — main accent
    primaryLight: '#818cf8', // Indigo-400 — lighter accent
    primaryGlow: 'rgba(99,102,241,0.35)',
    primaryMuted: 'rgba(99,102,241,0.15)',
    primaryBorder: 'rgba(99,102,241,0.4)',
    secondary: '#8b5cf6', // Violet-500
    secondaryGlow: 'rgba(139,92,246,0.3)',
    // ── Surfaces & backgrounds ────────────────────────────────────────────────
    bg: '#060614', // Page background
    surface: 'rgba(12,12,20,0.97)', // Modal / panel surface
    surfaceAlt: '#1a1a2e', // Alternative card background
    surfaceHover: 'rgba(255,255,255,0.04)',
    glass: 'rgba(12,12,18,0.88)', // Glassmorphic panel
    // ── Semantic states ───────────────────────────────────────────────────────
    error: '#f87171', // Red-400
    errorSolid: '#ef4444', // Red-500
    errorMuted: 'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.3)',
    errorGlow: 'rgba(239,68,68,0.3)',
    success: '#22c55e', // Green-500
    successMuted: 'rgba(34,197,94,0.2)',
    warning: '#f59e0b', // Amber-500
    // ── Text ──────────────────────────────────────────────────────────────────
    textPrimary: 'rgba(255,255,255,0.92)',
    textSecondary: 'rgba(255,255,255,0.65)',
    textMuted: 'rgba(255,255,255,0.35)',
    textFaint: 'rgba(255,255,255,0.2)',
    // ── Borders & overlays ────────────────────────────────────────────────────
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.12)',
    overlay: 'rgba(0,0,0,0.7)',
    overlayLight: 'rgba(0,0,0,0.6)',
    // ── Other ─────────────────────────────────────────────────────────────────
    white: '#ffffff',
};
export const fonts = {
    heading: "'Outfit', 'Space Grotesk', 'Inter', system-ui, sans-serif",
    body: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
};
export const radii = {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 16,
    xl: 20,
    pill: 9999,
};
export const shadows = {
    sm: '0 4px 12px rgba(0,0,0,0.25)',
    md: '0 8px 24px rgba(0,0,0,0.35)',
    lg: '0 24px 64px rgba(0,0,0,0.6)',
    panel: '-8px 0 32px rgba(0,0,0,0.4)',
    primaryGlow: `0 0 20px rgba(99,102,241,0.4), 0 4px 16px rgba(0,0,0,0.4)`,
    errorGlow: '0 0 12px rgba(239,68,68,0.3)',
};
export const transitions = {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.35s cubic-bezier(0.32,0,0.67,0)',
};
export const zIndex = {
    hud: 20,
    overlay: 50,
    toast: 1100,
    modal: 1000,
    roomModal: 1300,
    captureOverlay: 1000,
    captureComplete: 1200,
    responsePanel: 150,
    voiceIndicator: 200,
};
