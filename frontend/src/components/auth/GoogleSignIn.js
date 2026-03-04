import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { colors, fonts, shadows, transitions } from '../../config/tokens';
const provider = new GoogleAuthProvider();
export function GoogleSignIn() {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSignIn() {
        setError(null);
        setLoading(true);
        try {
            await signInWithPopup(auth, provider);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { style: wrapperStyle, children: [_jsx("button", { onClick: handleSignIn, disabled: loading, id: "google-sign-in-button", "aria-label": "Sign in with Google", style: btnStyle(loading), onMouseEnter: (e) => {
                    if (!loading) {
                        const t = e.currentTarget;
                        t.style.background = 'rgba(99,102,241,0.14)';
                        t.style.borderColor = 'rgba(99,102,241,0.55)';
                        t.style.boxShadow = shadows.primaryGlow;
                        t.style.transform = 'translateY(-1px)';
                    }
                }, onMouseLeave: (e) => {
                    const t = e.currentTarget;
                    t.style.background = 'rgba(255,255,255,0.05)';
                    t.style.borderColor = 'rgba(255,255,255,0.12)';
                    t.style.boxShadow = shadows.sm;
                    t.style.transform = 'translateY(0)';
                }, children: loading ? (_jsxs(_Fragment, { children: [_jsx("div", { style: spinnerStyle }), _jsx("span", { style: btnTextStyle, children: "Signing in\u2026" })] })) : (_jsxs(_Fragment, { children: [_jsx(GoogleLogo, {}), _jsx("span", { style: btnTextStyle, children: "Sign in with Google" })] })) }), error && (_jsx("p", { style: errorStyle, children: error }))] }));
}
// ── Google Logo SVG ───────────────────────────────────────────────────────────
function GoogleLogo() {
    return (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", style: { flexShrink: 0 }, children: [_jsx("path", { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z", fill: "#4285F4" }), _jsx("path", { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }), _jsx("path", { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z", fill: "#FBBC05" }), _jsx("path", { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" })] }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const wrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
};
const btnStyle = (loading) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '11px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.65 : 1,
    boxShadow: shadows.sm,
    transition: `background ${transitions.normal}, border-color ${transitions.normal}, box-shadow ${transitions.normal}, transform ${transitions.normal}`,
    transform: 'translateY(0)',
});
const btnTextStyle = {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
    letterSpacing: '0.01em',
};
const spinnerStyle = {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: `2px solid ${colors.primaryMuted}`,
    borderTopColor: colors.primary,
    animation: 'spin 0.85s linear infinite',
    flexShrink: 0,
};
const errorStyle = {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.5,
};
