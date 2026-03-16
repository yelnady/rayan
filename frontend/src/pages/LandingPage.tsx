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
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.55 },
};

const HEADING = "font-['Playfair_Display',serif]";

/* ─── DATA ──────────────────────────────────────────────────────────────── */

const CAPTURE_MODES = [
  { icon: Mic,         title: 'Voice',        desc: 'Just talk. Rayan listens, pulls out concepts, and builds your palace as you speak.' },
  { icon: MonitorPlay, title: 'Screen Share',  desc: 'Share your screen. Rayan sees your slides, tabs, and documents. It screenshots key visuals on its own.' },
  { icon: Camera,      title: 'Camera',       desc: 'Point your webcam at a whiteboard or textbook. Rayan processes video frames alongside your voice.' },
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
  { name: 'Library',     icon: BookOpen,     color: 'text-amber-300',   bg: 'bg-amber-500/15 border-amber-500/25' },
  { name: 'Lab',         icon: FlaskConical, color: 'text-cyan-300',    bg: 'bg-cyan-500/15 border-cyan-500/25' },
  { name: 'Gallery',     icon: Frame,        color: 'text-rose-300',    bg: 'bg-rose-500/15 border-rose-500/25' },
  { name: 'Garden',      icon: Leaf,         color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/25' },
  { name: 'Workshop',    icon: Wrench,       color: 'text-orange-300',  bg: 'bg-orange-500/15 border-orange-500/25' },
  { name: 'Observatory', icon: Star,         color: 'text-blue-300',    bg: 'bg-blue-500/15 border-blue-500/25' },
  { name: 'Museum',      icon: Landmark,     color: 'text-yellow-300',  bg: 'bg-yellow-500/15 border-yellow-500/25' },
  { name: 'Sanctuary',   icon: Heart,        color: 'text-pink-300',    bg: 'bg-pink-500/15 border-pink-500/25' },
  { name: 'Studio',      icon: Palette,      color: 'text-violet-300',  bg: 'bg-violet-500/15 border-violet-500/25' },
  { name: 'Dojo',        icon: Zap,          color: 'text-red-300',     bg: 'bg-red-500/15 border-red-500/25' },
];

const ARTIFACTS = [
  { name: 'Floating Book',  icon: BookOpen,      desc: 'Lectures, lessons',         from: 'from-amber-500/15',  to: 'to-orange-600/5', border: 'border-amber-400/25',  iconColor: 'text-amber-300',  iconBg: 'bg-amber-500/15' },
  { name: 'Hologram Frame', icon: Monitor,       desc: 'Insights, goals',           from: 'from-cyan-500/15',   to: 'to-blue-600/5',   border: 'border-cyan-400/25',   iconColor: 'text-cyan-300',   iconBg: 'bg-cyan-500/15' },
  { name: 'Framed Image',   icon: ImageIcon,     desc: 'Screenshots, mind maps',    from: 'from-rose-500/15',   to: 'to-pink-600/5',   border: 'border-rose-400/25',   iconColor: 'text-rose-300',   iconBg: 'bg-rose-500/15' },
  { name: 'Speech Bubble',  icon: MessageCircle, desc: 'Conversations, opinions',   from: 'from-green-500/15',  to: 'to-emerald-600/5', border: 'border-green-400/25', iconColor: 'text-green-300',  iconBg: 'bg-green-500/15' },
  { name: 'Crystal Orb',    icon: Globe,         desc: 'Dreams, emotions',          from: 'from-violet-500/15', to: 'to-purple-600/5', border: 'border-violet-400/25', iconColor: 'text-violet-300', iconBg: 'bg-violet-500/15' },
];

const USE_CASES = [
  {
    icon: GraduationCap, title: 'Learning', color: 'text-indigo-300', bg: 'bg-indigo-500/15 border-indigo-400/25', glow: 'rgba(99,102,241,0.12)',
    items: ['Capture lectures. Palace fills with searchable concepts.', 'Screen-share a textbook. Ideas cluster by topic.', 'Walk your palace before exams. Ask Recall to quiz you.', 'Capture vocabulary in context for language learning.'],
  },
  {
    icon: Briefcase, title: 'Work', color: 'text-violet-300', bg: 'bg-violet-500/15 border-violet-400/25', glow: 'rgba(139,92,246,0.12)',
    items: ['Capture meetings. Action items auto-extracted.', 'Room per direct report. Recall surfaces last discussion.', 'Capture architecture decisions. Recall answers "why?" months later.', 'Client onboarding. Recall knows context as well as you.'],
  },
  {
    icon: Lightbulb, title: 'Creative', color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-400/25', glow: 'rgba(168,85,247,0.12)',
    items: ['Capture sources. Recall helps cite while writing.', 'Worldbuilding. Recall keeps your fiction consistent.', 'Brainstorm. Recall finds patterns across messy ideas.', 'Walk research palace before recording a podcast.'],
  },
  {
    icon: Users, title: 'Personal', color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/15 border-fuchsia-400/25', glow: 'rgba(217,70,239,0.12)',
    items: ['Travel recs. Recall answers "what was that restaurant?"', 'Doctor visits. Grounded answers from your own notes.', 'Birthdays, preferences. Remember what matters to people.', 'Learn any skill over weeks. Palace builds the curriculum.'],
  },
];

const GOOGLE_STACK = [
  { label: 'Gemini Live API',       sub: 'gemini-live-2.5-flash-native-audio', desc: 'Real-time voice agents with affective dialogue' },
  { label: 'Gemini 2.5 Flash',      sub: 'gemini-2.5-flash',                   desc: 'Categorization, narration, room clustering' },
  { label: 'Gemini Image',          sub: 'gemini-2.5-flash-image',             desc: 'Creative mind map synthesis for room walls' },
  { label: 'Vertex AI Embeddings',  sub: 'text-embedding-005',                 desc: '768-dim semantic search and grounding' },
  { label: 'Cloud Firestore',       sub: '',                                   desc: 'Rooms, artifacts, sessions, users' },
  { label: 'Cloud Storage',         sub: '',                                   desc: 'Screenshots, mind maps, media' },
  { label: 'Cloud Run',             sub: 'Session affinity',                   desc: 'Containerized FastAPI backend' },
  { label: 'Firebase Auth',         sub: '',                                   desc: 'Google Sign-In, token verification' },
  { label: 'Firebase Hosting',      sub: '',                                   desc: 'Frontend CDN with SSL' },
  { label: 'Terraform',             sub: 'Single apply',                       desc: 'Full infrastructure as code' },
];

const FLOATING_ROOMS = [
  { label: 'Library',  left: '12%', top: '28%', delay: 0 },
  { label: 'Lab',      left: '58%', top: '18%', delay: 0.2 },
  { label: 'Garden',   left: '22%', top: '56%', delay: 0.4 },
  { label: 'Workshop', left: '60%', top: '52%', delay: 0.6 },
];

const HERO_CHIPS = [
  { icon: BookOpen,      label: 'Lectures' },
  { icon: MessageCircle, label: 'Meetings' },
  { icon: Search,        label: 'Research' },
  { icon: Palette,       label: 'Creative work' },
  { icon: Zap,           label: 'Exam prep' },
  { icon: Globe,         label: 'Life notes' },
];

const BG = 'linear-gradient(160deg, #1a2f72 0%, #1e3580 40%, #16266a 100%)';

/* ─── CalloutCard ───────────────────────────────────────────────────────── */

function CalloutCard({ icon: Icon, iconBg, iconColor, title, children }: {
  icon: React.ElementType; iconBg: string; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <section className="py-10 sm:py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="rounded-2xl sm:rounded-3xl p-6 sm:p-10 border backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
          {...fadeUp}
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${iconBg} border flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor}`} />
            </div>
            <div>
              <h3 className={`text-xl sm:text-2xl font-bold text-white mb-3 ${HEADING}`}>{title}</h3>
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */

export function LandingPage() {
  useEffect(() => {}, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: BG }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 backdrop-blur-xl border-b border-white/[0.08]" style={{ background: 'rgba(22,40,100,0.92)' }}>
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <span className={`text-white font-bold text-xl sm:text-2xl tracking-wide ${HEADING}`}>Rayan</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <a href="/how-it-works" className="hidden sm:block text-white/50 hover:text-white/90 text-sm transition-colors">
            How It Works
          </a>
          <a
            href="/palace"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
          >
            Enter Palace
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-14">
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[400px] sm:h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, rgba(124,58,237,0.12) 40%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)' }} />

        <div className="relative z-10 text-center px-5 sm:px-6 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>

            {/* Logo mark */}
            <motion.div className="flex justify-center mb-5" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.6 }}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border"
                style={{ background: 'rgba(99,102,241,0.14)', borderColor: 'rgba(99,102,241,0.30)', boxShadow: '0 0 40px rgba(99,102,241,0.25)' }}>
                <Logo size={40} />
              </div>
            </motion.div>

            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 sm:mb-8 border"
              style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)' }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs sm:text-sm text-indigo-300 font-semibold tracking-wide uppercase">Voice-First AI Memory Palace</span>
            </motion.div>

            {/* Title */}
            <h1
              className={`text-6xl sm:text-8xl md:text-9xl lg:text-[160px] font-bold tracking-tight mb-5 leading-none ${HEADING}`}
              style={{
                background: 'linear-gradient(135deg, #fff 25%, #c7d2fe 60%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 32px rgba(99,102,241,0.4))',
              }}
            >
              Rayan
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-slate-300/80 max-w-2xl mx-auto mb-3 leading-relaxed">
              A 3D memory palace that listens, remembers, and speaks back.
            </p>
            <p className="text-sm sm:text-base text-slate-400/60 max-w-xl mx-auto mb-4 leading-relaxed">
              Two Gemini Live voice agents run in the background. One captures everything you hear and see.
              The other lets you walk through your memories and talk to them.
            </p>
            <p className="text-[11px] sm:text-xs text-white/30 mb-10 sm:mb-12 tracking-[0.2em] uppercase font-medium">
              Gemini Live API &middot; Vertex AI &middot; Three.js &middot; Google Cloud
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.a
                href="/palace"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-semibold text-base sm:text-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 36px rgba(99,102,241,0.45)' }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 56px rgba(99,102,241,0.65)' }}
                whileTap={{ scale: 0.97 }}
              >
                Enter Your Palace <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.a>
              <motion.a
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white/80 font-semibold text-base sm:text-lg transition-all border"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' }}
                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.09)' }}
                whileTap={{ scale: 0.97 }}
              >
                How It Works <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.a>
            </div>
          </motion.div>

          {/* Use-case chips */}
          <motion.div
            className="mt-10 sm:mt-14 flex flex-wrap gap-2 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <p className="w-full text-center text-[11px] sm:text-xs text-white/25 uppercase tracking-[0.2em] mb-1 font-medium">Used for</p>
            {HERO_CHIPS.map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs sm:text-sm text-slate-300/70"
                style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.20)' }}
              >
                <Icon className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/20 text-[10px] tracking-[0.2em] uppercase">
          <span>Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-white ${HEADING}`}>How It Works</h2>
            <p className="text-base sm:text-xl text-slate-400 max-w-xl mx-auto">Four steps. No keyboard. Your palace builds itself.</p>
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
                className="group rounded-2xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 cursor-default relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                whileHover={{ y: -4, background: 'rgba(255,255,255,0.07)' }}
              >
                <span className={`absolute top-3 right-4 text-5xl sm:text-6xl font-bold text-white/[0.04] leading-none ${HEADING}`}>{num}</span>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPTURE AGENT ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(30,53,128,0.25), transparent)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Text */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border mb-5 text-xs sm:text-sm font-semibold text-indigo-300"
                style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.30)' }}>
                <Mic className="w-3.5 h-3.5" /> Capture Agent
              </div>
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-5 text-white ${HEADING}`}>
                Your Always-On Memory Companion
              </h2>
              <p className="text-base sm:text-lg text-slate-400 mb-3 leading-relaxed">
                Start a capture session and Rayan opens a persistent Gemini Live connection. It listens, sees your screen, and silently extracts what matters. New 3D artifacts appear on your palace walls in real time.
              </p>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                You control how aggressively it captures. Near-duplicates (similarity &ge; 0.90) are merged automatically. Your palace stays clean.
              </p>

              <p className="text-[11px] sm:text-xs text-white/30 uppercase tracking-[0.15em] font-medium mb-3">Three Input Modes</p>
              <div className="space-y-3">
                {CAPTURE_MODES.map(({ icon: Icon, title, desc }, i) => (
                  <motion.div
                    key={title}
                    className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Capture visual */}
            <motion.div className="relative" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div
                className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[3/4] sm:aspect-[4/5] max-w-[320px] sm:max-w-sm mx-auto border"
                style={{
                  background: 'linear-gradient(135deg, #1e3475 0%, #192d6a 100%)',
                  borderColor: 'rgba(99,102,241,0.25)',
                  boxShadow: '0 0 60px rgba(99,102,241,0.15)',
                }}
              >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 65%)' }} />

                {[
                  { text: 'Attention mechanisms', top: '12%', delay: 0 },
                  { text: 'Backpropagation', top: '32%', delay: 1.5 },
                  { text: 'Loss functions', top: '52%', delay: 3 },
                  { text: 'Gradient descent', top: '72%', delay: 4.5 },
                ].map(({ text, top, delay }) => (
                  <motion.div
                    key={text}
                    className="absolute left-3 right-3 sm:left-5 sm:right-5 rounded-lg px-3 py-2 sm:py-2.5 border backdrop-blur-sm"
                    style={{ top, background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.35)' }}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: [0, 1, 1, 0], x: [-16, 0, 0, 16] }}
                    transition={{ duration: 4, delay, repeat: Infinity, repeatDelay: 12, ease: 'easeInOut' }}
                  >
                    <p className="text-[9px] sm:text-[10px] text-indigo-400 font-semibold mb-0.5">EXTRACTED</p>
                    <p className="text-[11px] sm:text-sm text-slate-300">{text}</p>
                  </motion.div>
                ))}

                <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
                  <motion.div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center"
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Mic className="w-4 h-4 text-indigo-300" />
                  </motion.div>
                  <span className="text-[8px] sm:text-[9px] text-indigo-400/60 font-mono tracking-wider uppercase">Listening</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── RECALL AGENT ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Recall visual */}
            <motion.div className="relative order-2 md:order-1" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div
                className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-square max-w-[320px] sm:max-w-sm mx-auto border"
                style={{
                  background: 'linear-gradient(135deg, #1e3475 0%, #192d6a 100%)',
                  borderColor: 'rgba(139,92,246,0.25)',
                  boxShadow: '0 0 60px rgba(139,92,246,0.15)',
                }}
              >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.18) 0%, transparent 65%)' }} />

                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(139,92,246,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.7) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    transform: 'perspective(500px) rotateX(55deg)',
                    transformOrigin: 'bottom',
                  }}
                />

                {FLOATING_ROOMS.map(({ label, left, top, delay }) => (
                  <motion.div
                    key={label}
                    className="absolute rounded-md px-2 py-1 text-[10px] sm:text-xs font-semibold text-violet-200 backdrop-blur border"
                    style={{ left, top, background: 'rgba(139,92,246,0.2)', borderColor: 'rgba(139,92,246,0.4)' }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {label}
                  </motion.div>
                ))}

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 sm:w-24 h-20 sm:h-24 rounded-full blur-3xl"
                  style={{ background: 'rgba(139,92,246,0.4)' }} />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-violet-300"
                  style={{ boxShadow: '0 0 24px rgba(139,92,246,1)' }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />

                {/* Conversation */}
                <motion.div
                  className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 rounded-xl p-3 sm:p-4 border backdrop-blur-sm"
                  style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.30)' }}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-[9px] sm:text-[10px] text-violet-400 font-semibold mb-0.5">YOU</p>
                  <p className="text-[11px] sm:text-sm text-slate-300 mb-2">"What did I learn about attention?"</p>
                  <p className="text-[9px] sm:text-[10px] text-violet-400 font-semibold mb-0.5">RAYAN</p>
                  <p className="text-[11px] sm:text-sm text-slate-400 italic">"From your ML Library, you captured that..."</p>
                </motion.div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div className="order-1 md:order-2" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border mb-5 text-xs sm:text-sm font-semibold text-violet-300"
                style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.30)' }}>
                <Search className="w-3.5 h-3.5" /> Recall Agent
              </div>
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-5 text-white ${HEADING}`}>
                Talk to Your Memories
              </h2>
              <p className="text-base sm:text-lg text-slate-400 mb-3 leading-relaxed">
                Walk through your 3D palace and ask anything by voice. The Recall Agent searches your memories semantically, grounds every answer in what you've actually captured, and speaks back. It navigates rooms, highlights artifacts, and pulls up connections as it talks.
              </p>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Interrupt Rayan mid-sentence and it recovers naturally. It matches your tone through affective dialogue. The grounding context updates as you move, so answers are always fresh.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RECALL_TOOLS.map(({ icon: Icon, label }, i) => (
                  <motion.div
                    key={label}
                    className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg border text-xs sm:text-sm text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Icon className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                    <span>{label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ZERO HALLUCINATION ──────────────────────────────────────────── */}
      <CalloutCard icon={Shield} iconBg="bg-emerald-500/20 border-emerald-400/30" iconColor="text-emerald-300" title="Zero Hallucination by Design">
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-3">
          Every Recall answer is grounded by Vertex AI <code className="text-emerald-400 text-xs sm:text-sm">text-embedding-005</code>. Your query gets embedded into a 768-dimensional vector, cosine-compared against every stored artifact, and the top 8 most relevant memories are injected into the live system prompt. Rayan cannot invent information that isn't in your palace.
        </p>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          On every room navigation and artifact highlight, the search re-runs and fresh memories are injected mid-conversation. No reconnection. Always current.
        </p>
      </CalloutCard>

      {/* ── CREATIVE SYNTHESIS ──────────────────────────────────────────── */}
      <CalloutCard icon={Wand2} iconBg="bg-fuchsia-500/20 border-fuchsia-400/30" iconColor="text-fuchsia-300" title="AI Mind Map Synthesis">
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-3">
          Say "synthesize this room" and <code className="text-fuchsia-400 text-xs sm:text-sm">gemini-2.5-flash-image</code> generates a creative visual summary of every memory in the current room. Not a diagram. A styled piece of art rendered directly on your 3D palace wall.
        </p>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Each synthesis matches the room's theme. Library rooms get warm parchment. Lab rooms get holographic panels. Gallery rooms get painterly brushstrokes.
        </p>
      </CalloutCard>

      {/* ── NARRATOR ────────────────────────────────────────────────────── */}
      <CalloutCard icon={Volume2} iconBg="bg-amber-500/20 border-amber-400/30" iconColor="text-amber-300" title="Narrator Agent">
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-3">
          Click any artifact and the Narrator brings it to life. It finds the 5 most related memories, generates a personalized narration, and speaks it to you. It can also generate visual diagrams when the content calls for it.
        </p>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Not a verbatim reading. A warm, synthesized explanation that connects the memory to related things you've captured.
        </p>
      </CalloutCard>

      {/* ── AFFECTIVE DIALOG ───────────────────────────────────────────── */}
      <CalloutCard icon={Heart} iconBg="bg-pink-500/20 border-pink-400/30" iconColor="text-pink-300" title="Affective Dialogue">
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-3">
          Both agents use <code className="text-pink-400 text-xs sm:text-sm">enable_affective_dialog=True</code>. Rayan adjusts its tone, pacing, and empathy based on your emotional cues. When you're excited, it matches that energy. When you're focused, it stays subdued.
        </p>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          The difference between a tool and a companion. You actually want to talk to it.
        </p>
      </CalloutCard>

      {/* ── ROOMS ───────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-white ${HEADING}`}>Ten Themed Rooms</h2>
            <p className="text-base sm:text-xl text-slate-400 max-w-xl mx-auto">
              The Memory Architect categorizes every concept and places it where it belongs. You never organize manually.
            </p>
          </motion.div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {ROOMS.map(({ name, icon: Icon, color, bg }, i) => (
              <motion.div
                key={name}
                className="flex flex-col items-center text-center p-2.5 sm:p-4 rounded-xl border transition-all cursor-default"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3, background: 'rgba(255,255,255,0.07)' }}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${bg} border flex items-center justify-center mb-1.5 sm:mb-2`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                </div>
                <p className="text-[11px] sm:text-sm font-semibold text-white">{name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARTIFACTS ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(30,53,128,0.25), transparent)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-white ${HEADING}`}>Every Memory Takes a Form</h2>
            <p className="text-base sm:text-xl text-slate-400 max-w-xl mx-auto">
              16+ distinct 3D artifact types. Each shape matches the nature of the memory inside.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
            {ARTIFACTS.map(({ name, icon: Icon, desc, from, to, border, iconColor, iconBg }, i) => (
              <motion.div
                key={name}
                className={`bg-gradient-to-br ${from} ${to} border ${border} rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center cursor-default`}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.04, y: -4 }}
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${iconBg} border ${border} flex items-center justify-center mx-auto mb-3 sm:mb-5`}>
                  <Icon className={`w-5 h-5 sm:w-7 sm:h-7 ${iconColor}`} />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-white mb-1">{name}</h3>
                <p className="text-[10px] sm:text-sm text-slate-400">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-white ${HEADING}`}>How People Use Rayan</h2>
            <p className="text-base sm:text-xl text-slate-400 max-w-xl mx-auto">
              Not a productivity app you try once. A persistent second brain you build over months.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {USE_CASES.map(({ icon: Icon, title, items, color, bg, glow }, i) => (
              <motion.div
                key={title}
                className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 border backdrop-blur-xl transition-all duration-300 cursor-default"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.16)', boxShadow: `0 16px 48px ${glow}` }}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${bg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                </div>
                <h3 className={`text-lg sm:text-xl font-bold text-white mb-3 ${HEADING}`}>{title}</h3>
                <div className="space-y-2.5">
                  {items.map((item, j) => (
                    <p key={j} className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-3 border-l-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
      <section className="py-16 sm:py-28 px-4 sm:px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(30,53,128,0.25), transparent)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className={`text-3xl sm:text-5xl md:text-6xl font-bold mb-4 text-white ${HEADING}`}>Built Entirely on Google Cloud</h2>
            <p className="text-base sm:text-xl text-slate-400 max-w-xl mx-auto">
              Every hop from microphone to memory is Google-to-Google. No cross-cloud latency. One <code className="text-indigo-400 text-sm">terraform apply</code>.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {GOOGLE_STACK.map(({ label, sub, desc }, i) => (
              <motion.div
                key={label}
                className="rounded-xl p-4 sm:p-5 border transition-all cursor-default"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <p className="text-sm sm:text-base font-semibold text-white mb-0.5">{label}</p>
                {sub && <p className="text-[10px] sm:text-xs text-indigo-400 font-mono mb-1.5">{sub}</p>}
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 sm:mt-10 text-center" {...fadeUp}>
            <p className="text-[11px] sm:text-xs text-white/25 uppercase tracking-[0.15em] font-medium mb-3">Also built with</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Three.js', 'React Three Fiber', 'React 18', 'Zustand', 'FastAPI', 'WebSockets', 'Framer Motion', 'Tailwind CSS'].map((tech) => (
                <span key={tech} className="text-xs sm:text-sm rounded-full px-3 py-1 border text-slate-400" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-36 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.20) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.div {...fadeUp}>
            <h2 className={`text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-5 ${HEADING}`}>Build Your Palace</h2>
            <p className="text-base sm:text-xl text-slate-400 mb-10 sm:mb-12 leading-relaxed">
              Start a capture session and speak. Watch your 3D palace build itself. Then switch to Recall and walk through your memories.
            </p>
            <motion.a
              href="/palace"
              className="inline-flex items-center gap-2.5 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl text-white font-bold text-lg sm:text-2xl transition-all"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 44px rgba(99,102,241,0.45)' }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 70px rgba(99,102,241,0.65)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              Enter Rayan
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t py-8 sm:py-12 px-4 sm:px-6" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-center sm:text-left">
            <p className={`text-indigo-400 font-bold text-lg ${HEADING}`}>Rayan</p>
            <p className="text-slate-600 text-sm mt-0.5">Voice-First AI Memory Palace</p>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm text-center italic max-w-xs hidden md:block">
            "The art of memory is the art of attention."
          </p>
          <div className="flex gap-5 text-sm text-slate-600">
            <a href="/how-it-works" className="hover:text-slate-400 transition-colors">How It Works</a>
            <a href="/palace" className="hover:text-slate-400 transition-colors">Sign In</a>
            <a href="https://github.com/yelnady/rayan" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
