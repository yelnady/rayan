import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { GoogleSignIn } from './components/auth/GoogleSignIn';
import { PalacePage } from './pages/PalacePage';

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
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg gap-4">
      {/* Spinner */}
      <div className="w-8 h-8 rounded-full border-2 border-primary-muted border-t-primary animate-spin" />
      <span className="font-body text-[13px] text-text-muted tracking-wide">
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
    <div className="relative flex items-center justify-center min-h-[100dvh] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.12)_0%,transparent_70%),radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(139,92,246,0.08)_0%,transparent_60%)] bg-bg overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_70%)] pointer-events-none animate-[glow-pulse_5s_ease-in-out_infinite]" />
      <div className="absolute bottom-[5%] right-[10%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,transparent_70%)] pointer-events-none animate-[glow-pulse_7s_ease-in-out_infinite_reverse]" />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-3 bg-[rgba(14,14,26,0.7)] backdrop-blur-xl border border-[rgba(99,102,241,0.18)] rounded-3xl pt-12 px-11 pb-10 w-full max-w-[380px] shadow-[0_32px_80px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.04)] animate-[scaleIn_0.4s_ease]">
        {/* Palace icon */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.25)] flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            className="block"
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
        <h1 className="font-heading text-[34px] font-bold text-white tracking-tight m-0 text-center bg-[linear-gradient(135deg,#fff_0%,rgba(255,255,255,0.7)_100%)] bg-clip-text text-transparent">
          Rayan
        </h1>
        <p className="font-body text-sm text-text-muted m-0 text-center tracking-wide">
          Your AI-powered Memory Palace
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(255,255,255,0.07)] my-2" />

        {/* Sign in */}
        <GoogleSignIn />

        {/* Footer note */}
        <p className="font-body text-[11px] text-text-faint m-0 text-center leading-relaxed mt-1">
          Sign in to access your memory rooms &amp; artifacts
        </p>
      </div>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
