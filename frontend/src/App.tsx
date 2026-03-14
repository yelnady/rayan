import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { GoogleSignIn } from './components/auth/GoogleSignIn';
import { PalacePage } from './pages/PalacePage';
import { LandingPage } from './pages/LandingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { Logo } from './components/brand/Logo';

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
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg gap-6">
      <div className="relative">
        <Logo size={60} className="relative z-10" />
        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-primary-muted border-t-primary animate-spin" />
        <span className="font-body text-[13px] text-text-muted tracking-widest uppercase font-medium">
          Entering ...
        </span>
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────

function LoginPage() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/palace" replace />;

  return (
    <div className="relative flex items-center justify-center min-h-[100dvh] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.12)_0%,transparent_70%),radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(139,92,246,0.08)_0%,transparent_60%)] bg-bg overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_70%)] pointer-events-none animate-[glow-pulse_5s_ease-in-out_infinite]" />
      <div className="absolute bottom-[5%] right-[10%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,transparent_70%)] pointer-events-none animate-[glow-pulse_7s_ease-in-out_infinite_reverse]" />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-3 bg-[rgba(14,14,26,0.7)] backdrop-blur-xl border border-[rgba(99,102,241,0.18)] rounded-3xl pt-12 px-11 pb-10 w-full max-w-[380px] shadow-[0_32px_80px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.04)] animate-[scaleIn_0.4s_ease]">
        {/* Palace icon */}
        <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(99,102,241,0.15)] group transition-transform duration-500 hover:scale-105">
          <Logo size={48} className="drop-shadow-lg" />
        </div>

        {/* Heading */}
        <h1 className="font-heading text-[38px] font-bold tracking-tight m-0 text-center bg-[linear-gradient(135deg,#fff_30%,#a5b4fc_70%,#818cf8_100%)] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(99,102,241,0.3)]">
          Rayan
        </h1>
        <p className="font-body text-[13px] text-indigo-200/60 m-0 text-center tracking-[0.1em] uppercase font-medium">
          Your AI-powered Memory Palace
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(255,255,255,0.07)] my-2" />

        {/* Sign in */}
        <GoogleSignIn />

        {/* Footer note */}
        <div className="w-full pt-4 mt-4 border-t border-white/[0.04] flex flex-col items-center">
          <p className="font-body text-[12px] text-indigo-200/40 m-0 text-center leading-relaxed max-w-[260px]">
            Sign in to access your <br />
            <span className="text-white/60 font-medium tracking-wide">
              memory rooms &amp; artifacts
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── App Router ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/palace"
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
