import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { GoogleSignIn } from './components/auth/GoogleSignIn';
import { PalacePage } from './pages/PalacePage';
import { fonts, colors } from './config/tokens';

// ── Auth Guard ────────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── Loading Screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `2px solid ${colors.primaryMuted}`,
          borderTopColor: colors.primary,
          animation: 'spin 0.85s linear infinite',
        }}
      />
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.textMuted,
          letterSpacing: '0.03em',
        }}
      >
        Loading…
      </span>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────

function LoginPage() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return (
    <div style={loginWrapperStyle}>
      {/* Ambient glow orbs */}
      <div style={glowOrb1Style} />
      <div style={glowOrb2Style} />

      {/* Card */}
      <div style={loginCardStyle}>
        {/* Palace icon */}
        <div style={iconWrapperStyle}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: 'block' }}
          >
            <defs>
              <linearGradient id="icon-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <path
              d="M3 9.5L12 3l9 6.5V21H3V9.5z"
              fill="url(#icon-grad)"
              opacity="0.9"
            />
            <rect x="9" y="14" width="6" height="7" rx="1" fill="rgba(255,255,255,0.25)" />
            <path d="M12 3v18" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Heading */}
        <h1 style={loginTitleStyle}>Rayan</h1>
        <p style={loginSubtitleStyle}>Your AI-powered Memory Palace</p>

        {/* Divider */}
        <div style={dividerStyle} />

        {/* Sign in */}
        <GoogleSignIn />

        {/* Footer note */}
        <p style={loginFootnoteStyle}>
          Sign in to access your memory rooms &amp; artifacts
        </p>
      </div>
    </div>
  );
}

// ── Placeholder ───────────────────────────────────────────────────────────────

function PlaceholderPage({ name }: { name: string }) {
  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: fonts.body,
        color: colors.textSecondary,
      }}
    >
      {name} — coming soon
    </div>
  );
}

// ── App Router ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <PalacePage />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <PlaceholderPage name="Dashboard" />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Login Styles ──────────────────────────────────────────────────────────────

const loginWrapperStyle: React.CSSProperties = {
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

const glowOrb1Style: React.CSSProperties = {
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

const glowOrb2Style: React.CSSProperties = {
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

const loginCardStyle: React.CSSProperties = {
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

const iconWrapperStyle: React.CSSProperties = {
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

const loginTitleStyle: React.CSSProperties = {
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

const loginSubtitleStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 14,
  color: colors.textMuted,
  margin: 0,
  textAlign: 'center',
  letterSpacing: '0.01em',
};

const dividerStyle: React.CSSProperties = {
  width: '100%',
  height: 1,
  background: 'rgba(255,255,255,0.07)',
  margin: '8px 0',
};

const loginFootnoteStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 11,
  color: colors.textFaint,
  margin: 0,
  textAlign: 'center',
  lineHeight: 1.5,
  marginTop: 4,
};
