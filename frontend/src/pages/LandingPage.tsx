import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, Search, Sparkles, Volume2, Layers, Map, ArrowRight,
  BookOpen, FlaskConical, Frame, Leaf, Wrench, Star, Landmark,
  Heart, Palette, Zap, Monitor, ImageIcon, MessageCircle, Globe,
  ChevronRight, Shield, Camera, MonitorPlay, AudioLines, Wand2,
  Navigation, Eye, PenLine, GraduationCap, Briefcase, Lightbulb, Users,
} from 'lucide-react';
import { Logo } from '../components/brand/Logo';

/* ─── helpers ───────────────────────────────────────────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 36, filter: 'blur(8px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const spring = (delay = 0) => ({
  type: 'spring' as const,
  stiffness: 80,
  damping: 18,
  delay,
});

const HEADING = "font-['Playfair_Display',serif]";

/* ─── DATA ──────────────────────────────────────────────────────────────── */

const CAPTURE_MODES = [
  { icon: Mic,         title: 'Voice',       desc: 'Just talk. Rayan listens, pulls out concepts, and builds your palace as you speak.' },
  { icon: MonitorPlay, title: 'Screen Share', desc: 'Share your screen. Rayan sees your slides, tabs, and documents. It screenshots key visuals on its own.' },
  { icon: Camera,      title: 'Camera',      desc: 'Point your webcam at a whiteboard or textbook. Rayan processes video frames alongside your voice.' },
];

const RECALL_TOOLS = [
  { icon: Navigation,  label: 'Navigate rooms by voice' },
  { icon: Eye,         label: 'Highlight artifacts' },
  { icon: Search,      label: 'Semantic search answers' },
  { icon: PenLine,     label: 'Create & edit memories' },
  { icon: Wand2,       label: 'Mind map synthesis' },
  { icon: Globe,       label: 'Web search enrichment' },
  { icon: Map,         label: "Bird's-eye palace view" },
  { icon: AudioLines,  label: 'Natural interruptions' },
];

const ROOMS = [
  { name: 'Library',     icon: BookOpen,     color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  { name: 'Lab',         icon: FlaskConical, color: 'text-cyan-600',    bg: 'bg-cyan-50 border-cyan-200' },
  { name: 'Gallery',     icon: Frame,        color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200' },
  { name: 'Garden',      icon: Leaf,         color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { name: 'Workshop',    icon: Wrench,       color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
  { name: 'Observatory', icon: Star,         color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  { name: 'Museum',      icon: Landmark,     color: 'text-yellow-600',  bg: 'bg-yellow-50 border-yellow-200' },
  { name: 'Sanctuary',   icon: Heart,        color: 'text-pink-600',    bg: 'bg-pink-50 border-pink-200' },
  { name: 'Studio',      icon: Palette,      color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200' },
  { name: 'Dojo',        icon: Zap,          color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
];

const ARTIFACTS = [
  { name: 'Floating Book',  icon: BookOpen,      desc: 'Lectures, lessons',       from: 'from-amber-50',  to: 'to-orange-50',  border: 'border-amber-200',  iconColor: 'text-amber-600',  iconBg: 'bg-amber-100' },
  { name: 'Hologram Frame', icon: Monitor,       desc: 'Insights, goals',         from: 'from-cyan-50',   to: 'to-blue-50',    border: 'border-cyan-200',   iconColor: 'text-cyan-600',   iconBg: 'bg-cyan-100' },
  { name: 'Framed Image',   icon: ImageIcon,     desc: 'Screenshots, mind maps',  from: 'from-rose-50',   to: 'to-pink-50',    border: 'border-rose-200',   iconColor: 'text-rose-600',   iconBg: 'bg-rose-100' },
  { name: 'Speech Bubble',  icon: MessageCircle, desc: 'Conversations, opinions', from: 'from-green-50',  to: 'to-emerald-50', border: 'border-green-200',  iconColor: 'text-green-600',  iconBg: 'bg-green-100' },
  { name: 'Crystal Orb',    icon: Globe,         desc: 'Dreams, emotions',        from: 'from-violet-50', to: 'to-purple-50',  border: 'border-violet-200', iconColor: 'text-violet-600', iconBg: 'bg-violet-100' },
];

const USE_CASES = [
  {
    icon: GraduationCap, title: 'Learning', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', glow: 'rgba(99,102,241,0.08)',
    items: ['Capture lectures. Palace fills with searchable concepts.', 'Screen-share a textbook. Ideas cluster by topic.', 'Walk your palace before exams. Ask Recall to quiz you.', 'Capture vocabulary in context for language learning.'],
  },
  {
    icon: Briefcase, title: 'Work', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', glow: 'rgba(139,92,246,0.08)',
    items: ['Capture meetings. Action items auto-extracted.', 'Room per direct report. Recall surfaces last discussion.', 'Capture architecture decisions. Recall answers "why?" months later.', 'Client onboarding. Recall knows context as well as you.'],
  },
  {
    icon: Lightbulb, title: 'Creative', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', glow: 'rgba(168,85,247,0.08)',
    items: ['Capture sources. Recall helps cite while writing.', 'Worldbuilding. Recall keeps your fiction consistent.', 'Brainstorm. Recall finds patterns across messy ideas.', 'Walk research palace before recording a podcast.'],
  },
  {
    icon: Users, title: 'Personal', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 border-fuchsia-200', glow: 'rgba(217,70,239,0.08)',
    items: ['Travel recs. Recall answers "what was that restaurant?"', 'Doctor visits. Grounded answers from your own notes.', 'Birthdays, preferences. Remember what matters to people.', 'Learn any skill over weeks. Palace builds the curriculum.'],
  },
];

const GOOGLE_STACK = [
  { label: 'Gemini Live API',         sub: 'gemini-live-2.5-flash-native-audio', desc: 'Real-time voice agents with affective dialogue' },
  { label: 'Gemini 2.5 Flash',        sub: 'gemini-2.5-flash',                   desc: 'Categorization, narration, room clustering' },
  { label: 'Gemini Image',            sub: 'gemini-2.5-flash-image',             desc: 'Creative mind map synthesis for room walls' },
  { label: 'Vertex AI Embeddings',    sub: 'text-embedding-005',                 desc: '768-dim semantic search and grounding' },
  { label: 'Google Search Grounding', sub: 'Built-in Gemini tool',               desc: 'Live web search injected into agent context mid-session' },
  { label: 'Google ADK',              sub: 'Agent Development Kit',              desc: 'Multi-agent orchestration — Capture, Recall, Narrator' },
  { label: 'Cloud Firestore',         sub: '',                                   desc: 'Rooms, artifacts, sessions, users' },
  { label: 'Cloud Storage',           sub: '',                                   desc: 'Screenshots, mind maps, media' },
  { label: 'Cloud Run',               sub: 'Session affinity',                   desc: 'Containerized FastAPI backend' },
  { label: 'Cloud Build',             sub: 'CI/CD',                              desc: 'Automated Docker image builds on every push' },
  { label: 'Firebase Auth',           sub: '',                                   desc: 'Google Sign-In, token verification' },
  { label: 'Firebase Hosting',        sub: '',                                   desc: 'Frontend CDN with SSL' },
  { label: 'Terraform',               sub: 'Single apply',                       desc: 'Full infrastructure as code' },
];

const FLOATING_ROOMS = [
  { label: 'Library',  left: '12%', top: '28%', delay: 0 },
  { label: 'Lab',      left: '58%', top: '18%', delay: 0.2 },
  { label: 'Garden',   left: '22%', top: '56%', delay: 0.4 },
  { label: 'Workshop', left: '60%', top: '52%', delay: 0.6 },
];

/* ─── CalloutCard ───────────────────────────────────────────────────────── */

function CalloutCard({ icon: Icon, iconBg, iconColor, title, children, index = 0 }: {
  icon: React.ElementType; iconBg: string; iconColor: string; title: string; children: React.ReactNode; index?: number;
}) {
  return (
    <motion.div
      className="rounded-2xl p-6 sm:p-8 border bg-white h-full"
      style={{ borderColor: 'rgba(0,0,0,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={spring(index * 0.1)}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }}
    >
      <div className={`w-11 h-11 rounded-xl ${iconBg} border flex items-center justify-center mb-4`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <h3 className={`text-xl sm:text-2xl font-bold text-gray-900 mb-3 ${HEADING}`}>{title}</h3>
      {children}
    </motion.div>
  );
}

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */

export function LandingPage() {
  useEffect(() => {}, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 backdrop-blur-xl border-b border-gray-100" style={{ background: 'rgba(255,255,255,0.95)' }}>
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <span className={`text-gray-900 font-bold text-xl sm:text-2xl tracking-wide ${HEADING}`}>Rayan</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <a href="/how-it-works" className="hidden sm:block text-gray-500 hover:text-gray-900 text-sm transition-colors">
            How It Works
          </a>
          <a
            href="/palace"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 20px rgba(99,102,241,0.25)' }}
          >
            Enter Palace
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-14 bg-white">
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[400px] sm:h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)' }} />

        <div className="relative z-10 text-center px-5 sm:px-6 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>

            {/* Logo mark */}
            <motion.div className="flex justify-center mb-5" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.6 }}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-indigo-100"
                style={{ background: 'rgba(99,102,241,0.08)', boxShadow: '0 0 40px rgba(99,102,241,0.12)' }}>
                <Logo size={40} />
              </div>
            </motion.div>

            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 sm:mb-8 border border-indigo-200 bg-indigo-50"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-sm sm:text-base text-indigo-700 font-semibold tracking-wide uppercase">Voice-First AI Memory Palace</span>
            </motion.div>

            {/* Title */}
            <h1
              className={`text-6xl sm:text-8xl md:text-9xl lg:text-[160px] font-bold tracking-tight mb-5 leading-none ${HEADING}`}
              style={{
                background: 'linear-gradient(135deg, #111827 20%, #4338ca 65%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 24px rgba(99,102,241,0.15))',
                paddingBottom: '0.18em',
              }}
            >
              Rayan
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-800 max-w-2xl mx-auto mb-3 leading-relaxed">
              A 3D memory palace that listens, remembers, and speaks back.
            </p>
            <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto mb-4 leading-relaxed">
              Two Gemini Live voice agents run in the background. One captures everything you hear and see.
              The other lets you walk through your memories and talk to them.
            </p>
            <p className="text-[11px] sm:text-xs text-gray-400 mb-8 sm:mb-10 tracking-[0.2em] uppercase font-medium">
              Gemini Live API &middot; Vertex AI &middot; Three.js &middot; Google Cloud
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.a
                href="/palace"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-base sm:text-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 36px rgba(99,102,241,0.30)' }}
                whileHover={{ scale: 1.04, boxShadow: '0 0 56px rgba(99,102,241,0.50)' }}
                whileTap={{ scale: 0.96 }}
              >
                Enter Your Palace <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.a>
              <motion.a
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-gray-700 font-semibold text-base sm:text-lg transition-all border border-gray-200 bg-gray-50"
                whileHover={{ scale: 1.03, background: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.14)' }}
                whileTap={{ scale: 0.96 }}
              >
                How It Works <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-gray-300 text-[10px] tracking-[0.2em] uppercase">
          <span>Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent" />
        </div>
      </section>

      {/* ── THE PROBLEM ─────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.p
            className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 leading-snug"
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            We forget things.{' '}
            <span className="text-gray-400">All the time.</span>
          </motion.p>

          <motion.p
            className="text-base sm:text-lg text-gray-500 leading-relaxed"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Not in some big philosophical way. In the most basic, embarrassing way.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center text-sm sm:text-base text-gray-500 italic"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="px-4 py-2 rounded-xl border border-gray-200 bg-white">What did you eat yesterday?</span>
            <span className="px-4 py-2 rounded-xl border border-gray-200 bg-white">That person's name at the conference?</span>
            <span className="px-4 py-2 rounded-xl border border-gray-200 bg-white">What your manager said two Fridays back?</span>
          </motion.div>

          <motion.div
            className="pt-4 border-t border-gray-200 space-y-3"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-lg sm:text-xl text-gray-800 font-medium">
              The problem isn't capture.
            </p>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-xl mx-auto">
              We have more capture tools than ever. The problem is{' '}
              <span className="text-indigo-600 font-semibold">retrieval</span>.
              Our memories are flat, unsearchable, disconnected from each other.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 ${HEADING}`}>How It Works</h2>
            <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto">Four steps. No keyboard. Your palace builds itself.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { icon: Mic,    num: '01', title: 'Capture',  desc: 'Start a session. Rayan listens to your voice, screen, or camera and extracts concepts in real time.' },
              { icon: Layers, num: '02', title: 'Organize', desc: 'The Memory Architect categorizes every concept by semantic similarity and places it in the right room.' },
              { icon: Map,    num: '03', title: 'Explore',  desc: 'Walk through your palace in first-person 3D. Rooms, walls, glowing artifacts. Spatial memory does the rest.' },
              { icon: Search, num: '04', title: 'Recall',   desc: 'Ask anything by voice. Every answer is grounded in your actual memories. Zero hallucination by design.' },
            ].map(({ icon: Icon, num, title, desc }, i) => (
              <motion.div
                key={title}
                className="group rounded-2xl p-5 sm:p-6 border bg-white transition-all duration-300 cursor-default relative overflow-hidden"
                style={{ borderColor: 'rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={spring(i * 0.1)}
                whileHover={{ y: -6, scale: 1.02, boxShadow: '0 12px 40px rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }}
              >
                <span className={`absolute top-3 right-4 text-5xl sm:text-6xl font-bold text-black/[0.04] leading-none ${HEADING}`}>{num}</span>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPTURE AGENT ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Text */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border border-indigo-200 bg-indigo-50 mb-5 text-xs sm:text-sm font-semibold text-indigo-600">
                <Mic className="w-3.5 h-3.5" /> Capture Agent
              </div>
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-5 text-gray-900 ${HEADING}`}>
                Your Always-On Memory Companion
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-3 leading-relaxed">
                Start a capture session and Rayan opens a persistent Gemini Live connection. It listens, sees your screen, and silently extracts what matters. New 3D artifacts appear on your palace walls in real time.
              </p>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                You control how aggressively it captures. Near-duplicates (similarity &ge; 0.90) are merged automatically. Your palace stays clean.
              </p>

              <p className="text-[11px] sm:text-xs text-gray-400 uppercase tracking-[0.15em] font-medium mb-3">Three Input Modes</p>
              <div className="space-y-3">
                {CAPTURE_MODES.map(({ icon: Icon, title, desc }, i) => (
                  <motion.div
                    key={title}
                    className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 bg-white"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={spring(i * 0.12)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Capture visual */}
            <motion.div className="relative" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div
                className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[3/4] sm:aspect-[4/5] max-w-[320px] sm:max-w-sm mx-auto border border-indigo-100"
                style={{
                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  boxShadow: '0 0 60px rgba(99,102,241,0.12)',
                }}
              >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 65%)' }} />

                {[
                  { text: 'Attention mechanisms', top: '12%', delay: 0 },
                  { text: 'Backpropagation', top: '32%', delay: 1.5 },
                  { text: 'Loss functions', top: '52%', delay: 3 },
                  { text: 'Gradient descent', top: '72%', delay: 4.5 },
                ].map(({ text, top, delay }) => (
                  <motion.div
                    key={text}
                    className="absolute left-3 right-3 sm:left-5 sm:right-5 rounded-lg px-3 py-2 sm:py-2.5 border border-indigo-200 bg-white/80 backdrop-blur-sm"
                    style={{ top }}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: [0, 1, 1, 0], x: [-16, 0, 0, 16] }}
                    transition={{ duration: 4, delay, repeat: Infinity, repeatDelay: 12, ease: 'easeInOut' }}
                  >
                    <p className="text-[9px] sm:text-[10px] text-indigo-500 font-semibold mb-0.5">EXTRACTED</p>
                    <p className="text-[11px] sm:text-sm text-gray-700">{text}</p>
                  </motion.div>
                ))}

                <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
                  <motion.div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center"
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Mic className="w-4 h-4 text-indigo-600" />
                  </motion.div>
                  <span className="text-[8px] sm:text-[9px] text-indigo-400 font-mono tracking-wider uppercase">Listening</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── RECALL AGENT ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Recall visual */}
            <motion.div className="relative order-2 md:order-1" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div
                className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-square max-w-[320px] sm:max-w-sm mx-auto border border-violet-100"
                style={{
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                  boxShadow: '0 0 60px rgba(139,92,246,0.10)',
                }}
              >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 65%)' }} />

                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2 opacity-10"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(139,92,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.8) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    transform: 'perspective(500px) rotateX(55deg)',
                    transformOrigin: 'bottom',
                  }}
                />

                {FLOATING_ROOMS.map(({ label, left, top, delay }) => (
                  <motion.div
                    key={label}
                    className="absolute rounded-md px-2 py-1 text-[10px] sm:text-xs font-semibold text-violet-700 bg-violet-100 border border-violet-200"
                    style={{ left, top }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {label}
                  </motion.div>
                ))}

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 sm:w-24 h-20 sm:h-24 rounded-full blur-3xl"
                  style={{ background: 'rgba(139,92,246,0.15)' }} />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-violet-500"
                  style={{ boxShadow: '0 0 20px rgba(139,92,246,0.6)' }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />

                {/* Conversation */}
                <motion.div
                  className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 rounded-xl p-3 sm:p-4 border border-violet-200 bg-white/80 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-[9px] sm:text-[10px] text-violet-500 font-semibold mb-0.5">YOU</p>
                  <p className="text-[11px] sm:text-sm text-gray-700 mb-2">"What did I learn about attention?"</p>
                  <p className="text-[9px] sm:text-[10px] text-violet-500 font-semibold mb-0.5">RAYAN</p>
                  <p className="text-[11px] sm:text-sm text-gray-600 italic">"From your ML Library, you captured that..."</p>
                </motion.div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div className="order-1 md:order-2" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border border-violet-200 bg-violet-50 mb-5 text-xs sm:text-sm font-semibold text-violet-600">
                <Search className="w-3.5 h-3.5" /> Recall Agent
              </div>
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-5 text-gray-900 ${HEADING}`}>
                Talk to Your Memories
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-3 leading-relaxed">
                Walk through your 3D palace and ask anything by voice. The Recall Agent searches your memories semantically, grounds every answer in what you've actually captured, and speaks back. It navigates rooms, highlights artifacts, and pulls up connections as it talks.
              </p>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Interrupt Rayan mid-sentence and it recovers naturally. It matches your tone through affective dialogue. The grounding context updates as you move, so answers are always fresh.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RECALL_TOOLS.map(({ icon: Icon, label }, i) => (
                  <motion.div
                    key={label}
                    className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-xs sm:text-sm text-gray-700"
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={spring(i * 0.06)}
                  >
                    <Icon className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                    <span>{label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ───────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <CalloutCard index={0} icon={Shield} iconBg="bg-emerald-50 border-emerald-200" iconColor="text-emerald-600" title="Zero Hallucination by Design">
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-3">
              Every Recall answer is grounded by Vertex AI <code className="text-emerald-600 text-sm bg-emerald-50 px-1 rounded">text-embedding-005</code>. Your query is embedded into a 768-dimensional vector, cosine-compared against every stored artifact, and the top 8 most relevant memories are injected into the live system prompt.
            </p>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
              On every room navigation and artifact highlight, the search re-runs and fresh memories are injected mid-conversation. No reconnection. Always current.
            </p>
          </CalloutCard>

          <CalloutCard index={1} icon={Wand2} iconBg="bg-fuchsia-50 border-fuchsia-200" iconColor="text-fuchsia-600" title="AI Mind Map Synthesis">
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-3">
              Say "synthesize this room" and <code className="text-fuchsia-600 text-sm bg-fuchsia-50 px-1 rounded">gemini-2.5-flash-image</code> generates a creative visual summary of every memory in the current room. Not a diagram — a styled piece of art rendered directly on your 3D palace wall.
            </p>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
              Library rooms get warm parchment. Lab rooms get holographic panels. Gallery rooms get painterly brushstrokes.
            </p>
          </CalloutCard>

          <CalloutCard index={2} icon={Volume2} iconBg="bg-amber-50 border-amber-200" iconColor="text-amber-600" title="Narrator Agent">
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-3">
              Click any artifact and the Narrator brings it to life. It finds the 5 most related memories, generates a personalized narration, and speaks it to you. It can also generate visual diagrams when the content calls for it.
            </p>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
              Not a verbatim reading. A warm, synthesized explanation that connects the memory to related things you've captured.
            </p>
          </CalloutCard>

          <CalloutCard index={3} icon={Heart} iconBg="bg-pink-50 border-pink-200" iconColor="text-pink-600" title="Affective Dialogue">
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-3">
              Both agents use <code className="text-pink-600 text-sm bg-pink-50 px-1 rounded">enable_affective_dialog=True</code>. Rayan adjusts its tone, pacing, and empathy based on your emotional cues. When you're excited, it matches that energy. When you're focused, it stays subdued.
            </p>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
              The difference between a tool and a companion. You actually want to talk to it.
            </p>
          </CalloutCard>
        </div>
      </section>

      {/* ── ROOMS ───────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 ${HEADING}`}>Ten Themed Rooms</h2>
            <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto">
              The Memory Architect categorizes every concept and places it where it belongs. You never organize manually.
            </p>
          </motion.div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {ROOMS.map(({ name, icon: Icon, color, bg }, i) => (
              <motion.div
                key={name}
                className="flex flex-col items-center text-center p-2.5 sm:p-4 rounded-xl border bg-white transition-all cursor-default"
                style={{ borderColor: 'rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={spring(i * 0.055)}
                whileHover={{ y: -5, scale: 1.06, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${bg} border flex items-center justify-center mb-1.5 sm:mb-2`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                </div>
                <p className="text-[11px] sm:text-sm font-semibold text-gray-800">{name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARTIFACTS ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 ${HEADING}`}>Every Memory Takes a Form</h2>
            <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto">
              16+ distinct 3D artifact types. Each shape matches the nature of the memory inside.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {ARTIFACTS.map(({ name, icon: Icon, desc, from, to, border, iconColor, iconBg }, i) => (
              <motion.div
                key={name}
                className={`bg-gradient-to-br ${from} ${to} border ${border} rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center cursor-default`}
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                initial={{ opacity: 0, y: 32, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={spring(i * 0.08)}
                whileHover={{ scale: 1.06, y: -6, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${iconBg} border ${border} flex items-center justify-center mx-auto mb-3 sm:mb-5`}>
                  <Icon className={`w-5 h-5 sm:w-7 sm:h-7 ${iconColor}`} />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-gray-900 mb-1">{name}</h3>
                <p className="text-[10px] sm:text-sm text-gray-600">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 ${HEADING}`}>How People Use Rayan</h2>
            <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto">
              Not a productivity app you try once. A persistent second brain you build over months.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {USE_CASES.map(({ icon: Icon, title, items, color, bg, glow }, i) => (
              <motion.div
                key={title}
                className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 border bg-white transition-all duration-300 cursor-default"
                style={{ borderColor: 'rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={spring(i * 0.1)}
                whileHover={{ y: -6, scale: 1.01, boxShadow: `0 20px 56px ${glow}`, borderColor: 'rgba(0,0,0,0.12)' }}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${bg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                </div>
                <h3 className={`text-lg sm:text-xl font-bold text-gray-900 mb-3 ${HEADING}`}>{title}</h3>
                <div className="space-y-2.5">
                  {items.map((item, j) => (
                    <p key={j} className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-gray-200">
                      {item}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GOOGLE CLOUD STACK ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-gray-900 ${HEADING}`}>Built Entirely on Google Cloud</h2>
            <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto">
              Every hop from microphone to memory is Google-to-Google. No cross-cloud latency. One <code className="text-indigo-600 text-sm bg-indigo-50 px-1 rounded">terraform apply</code>.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {GOOGLE_STACK.map(({ label, sub, desc }, i) => (
              <motion.div
                key={label}
                className="rounded-xl p-4 sm:p-5 border bg-white transition-all cursor-default"
                style={{ borderColor: 'rgba(0,0,0,0.08)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={spring(i * 0.05)}
                whileHover={{ boxShadow: '0 6px 24px rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.20)', y: -2 }}
              >
                <p className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">{label}</p>
                {sub && <p className="text-[10px] sm:text-xs text-indigo-500 font-mono mb-1.5">{sub}</p>}
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 sm:mt-10 text-center" {...fadeUp}>
            <p className="text-[11px] sm:text-xs text-gray-400 uppercase tracking-[0.15em] font-medium mb-3">Also built with</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['TypeScript', 'Three.js', 'React Three Fiber', 'React 18', 'Zustand', 'FastAPI', 'WebSockets', 'AudioWorklet', 'GSAP', 'Framer Motion', 'Tailwind CSS'].map((tech) => (
                <span key={tech} className="text-xs sm:text-sm rounded-full px-3 py-1 border border-gray-200 bg-white text-gray-600">
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-36 px-4 sm:px-6 text-center relative overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.div {...fadeUp}>
            <h2 className={`text-4xl sm:text-6xl md:text-7xl font-bold text-gray-900 mb-5 ${HEADING}`}>Build Your Palace</h2>
            <p className="text-base sm:text-xl text-gray-500 mb-10 sm:mb-12 leading-relaxed">
              Start a capture session and speak. Watch your 3D palace build itself. Then switch to Recall and walk through your memories.
            </p>
            <motion.a
              href="/palace"
              className="inline-flex items-center gap-2.5 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl text-white font-bold text-lg sm:text-2xl transition-all"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 44px rgba(99,102,241,0.30)' }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 70px rgba(99,102,241,0.50)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              Enter Rayan
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 sm:py-12 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-center sm:text-left">
            <p className={`text-indigo-600 font-bold text-lg ${HEADING}`}>Rayan</p>
            <p className="text-gray-400 text-sm mt-0.5">Voice-First AI Memory Palace</p>
          </div>
          <p className="text-gray-400 text-sm text-center italic max-w-xs hidden md:block">
            "The art of memory is the art of attention."
          </p>
          <div className="flex gap-5 text-sm text-gray-500">
            <a href="/how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="/palace" className="hover:text-gray-900 transition-colors">Sign In</a>
            <a href="https://github.com/yelnady/rayan" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
