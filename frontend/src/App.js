import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { GoogleSignIn } from './components/auth/GoogleSignIn';
import { PalacePage } from './pages/PalacePage';
import { fonts, colors } from './config/tokens';
// ── Auth Guard ────────────────────────────────────────────────────────────────
function AuthGuard({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx(LoadingScreen, {});
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
    return (_jsxs("div", { style: {
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.bg,
            flexDirection: 'column',
            gap: 16,
        }, children: [_jsx("div", { style: {
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `2px solid ${colors.primaryMuted}`,
                    borderTopColor: colors.primary,
                    animation: 'spin 0.85s linear infinite',
                } }), _jsx("span", { style: {
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: colors.textMuted,
                    letterSpacing: '0.03em',
                }, children: "Loading\u2026" })] }));
}
// ── Login Page ────────────────────────────────────────────────────────────────
function LoginPage() {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx(LoadingScreen, {});
    if (user)
        return _jsx(Navigate, { to: "/", replace: true });
    return (_jsxs("div", { style: loginWrapperStyle, children: [_jsx("div", { style: glowOrb1Style }), _jsx("div", { style: glowOrb2Style }), _jsxs("div", { style: loginCardStyle, children: [_jsx("div", { style: iconWrapperStyle, children: _jsxs("svg", { width: "40", height: "40", viewBox: "0 0 24 24", fill: "none", style: { display: 'block' }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "icon-grad", x1: "0", y1: "0", x2: "1", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#6366f1" }), _jsx("stop", { offset: "100%", stopColor: "#8b5cf6" })] }) }), _jsx("path", { d: "M3 9.5L12 3l9 6.5V21H3V9.5z", fill: "url(#icon-grad)", opacity: "0.9" }), _jsx("rect", { x: "9", y: "14", width: "6", height: "7", rx: "1", fill: "rgba(255,255,255,0.25)" }), _jsx("path", { d: "M12 3v18", stroke: "rgba(255,255,255,0.1)", strokeWidth: "0.5" })] }) }), _jsx("h1", { style: loginTitleStyle, children: "Rayan" }), _jsx("p", { style: loginSubtitleStyle, children: "Your AI-powered Memory Palace" }), _jsx("div", { style: dividerStyle }), _jsx(GoogleSignIn, {}), _jsx("p", { style: loginFootnoteStyle, children: "Sign in to access your memory rooms & artifacts" })] })] }));
}
// ── Placeholder ───────────────────────────────────────────────────────────────
function PlaceholderPage({ name }) {
    return (_jsxs("div", { style: {
            padding: '2rem',
            fontFamily: fonts.body,
            color: colors.textSecondary,
        }, children: [name, " \u2014 coming soon"] }));
}
// ── App Router ────────────────────────────────────────────────────────────────
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(AuthGuard, { children: _jsx(PalacePage, {}) }) }), _jsx(Route, { path: "/dashboard", element: _jsx(AuthGuard, { children: _jsx(PlaceholderPage, { name: "Dashboard" }) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
// ── Login Styles ──────────────────────────────────────────────────────────────
const loginWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%),
               radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.08) 0%, transparent 60%),
               ${colors.bg}`,
    overflow: 'hidden',
};
const glowOrb1Style = {
    position: 'absolute',
    top: '-10%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 600,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
    animation: 'glow-pulse 5s ease-in-out infinite',
};
const glowOrb2Style = {
    position: 'absolute',
    bottom: '5%',
    right: '10%',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
    animation: 'glow-pulse 7s ease-in-out infinite reverse',
};
const loginCardStyle = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(14,14,26,0.7)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(99,102,241,0.18)',
    borderRadius: 24,
    padding: '48px 44px 40px',
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
    animation: 'scaleIn 0.4s ease',
};
const iconWrapperStyle = {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    boxShadow: '0 0 20px rgba(99,102,241,0.2)',
};
const loginTitleStyle = {
    fontFamily: fonts.heading,
    fontSize: 34,
    fontWeight: 700,
    color: colors.white,
    letterSpacing: '-0.02em',
    margin: 0,
    textAlign: 'center',
    background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
};
const loginSubtitleStyle = {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    margin: 0,
    textAlign: 'center',
    letterSpacing: '0.01em',
};
const dividerStyle = {
    width: '100%',
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '8px 0',
};
const loginFootnoteStyle = {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.5,
    marginTop: 4,
};
