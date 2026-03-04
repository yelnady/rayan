/**
 * Design tokens — single source of truth for all visual values in the app.
 *
 * Import from here instead of hardcoding colors, fonts, radii, or shadows.
 */

export const colors = {
    // ── Core palette ──────────────────────────────────────────────────────────
    primary: '#FBBF24',           // Amber-400 — main accent (Yellow/Gold)
    primaryLight: '#FDE68A',      // Amber-200 — lighter accent
    primaryGlow: 'rgba(251,191,36,0.3)',
    primaryMuted: 'rgba(251,191,36,0.15)',
    primaryBorder: 'rgba(251,191,36,0.4)',

    secondary: '#10B981',         // Emerald-500
    secondaryGlow: 'rgba(16,185,129,0.3)',

    // ── Surfaces & backgrounds ────────────────────────────────────────────────
    bg: '#F9FAFB',                // Page background
    surface: '#FFFFFF',           // Modal / panel surface
    surfaceAlt: '#F3F4F6',        // Alternative card background
    surfaceHover: 'rgba(0,0,0,0.04)',
    glass: 'rgba(255,255,255,0.95)', // Glassmorphic panel

    // ── Semantic states ───────────────────────────────────────────────────────
    error: '#ef4444',             // Red-500
    errorSolid: '#dc2626',        // Red-600
    errorMuted: 'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.3)',
    errorGlow: 'rgba(239,68,68,0.3)',

    success: '#10B981',           // Emerald-500
    successMuted: 'rgba(16,185,129,0.2)',

    warning: '#f59e0b',           // Amber-500

    // ── Text ──────────────────────────────────────────────────────────────────
    textPrimary: '#111827',       // Gray-900
    textSecondary: '#4B5563',     // Gray-600
    textMuted: '#6B7280',         // Gray-500
    textFaint: '#9CA3AF',         // Gray-400

    // ── Borders & overlays ────────────────────────────────────────────────────
    border: 'rgba(0,0,0,0.08)',
    borderLight: 'rgba(0,0,0,0.04)',
    overlay: 'rgba(0,0,0,0.4)',
    overlayLight: 'rgba(0,0,0,0.2)',

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
    sm: '0 2px 8px rgba(0,0,0,0.04)',
    md: '0 4px 16px rgba(0,0,0,0.06)',
    lg: '0 12px 32px rgba(0,0,0,0.08)',
    panel: '-4px 0 24px rgba(0,0,0,0.05)',
    primaryGlow: `0 0 16px rgba(251,191,36,0.3), 0 4px 12px rgba(0,0,0,0.05)`,
    errorGlow: '0 0 12px rgba(239,68,68,0.2)',
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
