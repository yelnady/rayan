import { motion } from 'framer-motion';
import { Mic, Search, Sparkles, Volume2, Layers, Map, ArrowRight, Brain } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const FEATURES = [
  {
    icon: Mic,
    title: 'Capture',
    desc: 'Share your screen, speak your thoughts, or upload content. Gemini AI extracts key concepts in real time.',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Layers,
    title: 'Organize',
    desc: 'Concepts are semantically clustered into themed rooms — a Library for lectures, a Lab for research, a Garden for growth.',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    icon: Map,
    title: 'Explore',
    desc: 'Walk through your memories in immersive first-person 3D. Every artifact is a doorway back into what you learned.',
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  {
    icon: Search,
    title: 'Recall',
    desc: 'Ask anything with your voice. Rayan searches your palace and responds with grounded answers from your own knowledge.',
    iconBg: 'bg-fuchsia-500/15 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
];

const ROOMS = [
  { name: 'Library', emoji: '📚', desc: 'Lectures & documents' },
  { name: 'Lab', emoji: '🔬', desc: 'Research & experiments' },
  { name: 'Gallery', emoji: '🖼', desc: 'Visual & creative work' },
  { name: 'Garden', emoji: '🌿', desc: 'Personal growth' },
  { name: 'Workshop', emoji: '🔧', desc: 'Projects & skills' },
  { name: 'Observatory', emoji: '🔭', desc: 'Big ideas & visions' },
  { name: 'Museum', emoji: '🏛', desc: 'History & milestones' },
  { name: 'Sanctuary', emoji: '🕊', desc: 'Emotions & reflections' },
  { name: 'Studio', emoji: '🎨', desc: 'Creative sessions' },
  { name: 'Dojo', emoji: '⚔', desc: 'Skills & discipline' },
];

const ARTIFACTS = [
  { name: 'Floating Book', icon: '📖', desc: 'Lectures, lessons, documents', gradientFrom: 'from-amber-500/20', gradientTo: 'to-orange-600/10', borderColor: 'border-amber-500/30' },
  { name: 'Hologram Frame', icon: '💠', desc: 'Insights, goals, milestones', gradientFrom: 'from-cyan-500/20', gradientTo: 'to-blue-600/10', borderColor: 'border-cyan-500/30' },
  { name: 'Framed Image', icon: '🖼', desc: 'Visual memories, media', gradientFrom: 'from-rose-500/20', gradientTo: 'to-pink-600/10', borderColor: 'border-rose-500/30' },
  { name: 'Speech Bubble', icon: '💬', desc: 'Conversations, opinions', gradientFrom: 'from-green-500/20', gradientTo: 'to-emerald-600/10', borderColor: 'border-green-500/30' },
  { name: 'Crystal Orb', icon: '🔮', desc: 'Dreams, emotions, ideas', gradientFrom: 'from-violet-500/20', gradientTo: 'to-purple-600/10', borderColor: 'border-violet-500/30' },
];

const AGENTS = [
  {
    icon: Mic,
    name: 'Capture Agent',
    subtitle: 'Real-time extraction',
    desc: 'Watches your screen, listens as you speak, and reads uploaded content — turning raw sessions into structured memories that populate your palace automatically.',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    subtitleColor: 'text-indigo-400',
    features: ['Screen & camera capture', 'Voice transcription', 'Auto-classification by type'],
  },
  {
    icon: Search,
    name: 'Recall Agent',
    subtitle: 'Voice-powered search',
    desc: 'Ask anything in natural language. Semantic vector search finds the most relevant artifacts in your palace and delivers a grounded, cited answer from your own knowledge.',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
    iconColor: 'text-violet-400',
    subtitleColor: 'text-violet-400',
    features: ['Semantic vector search', 'Grounded citations', 'Highlights related artifacts'],
  },
  {
    icon: Sparkles,
    name: 'Enrichment Agent',
    subtitle: 'Deep research on demand',
    desc: 'Click any artifact and the Enrichment Agent scours verified sources to add context, images, and related knowledge — expanding what you know around what you captured.',
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    iconColor: 'text-purple-400',
    subtitleColor: 'text-purple-400',
    features: ['Live web research', 'Image sourcing', 'Source attribution'],
  },
  {
    icon: Volume2,
    name: 'Narrator Agent',
    subtitle: 'Voice + visual narration',
    desc: 'Select any artifact and hear it explained aloud. The Narrator generates diagrams, surface connections between memories, and an audio walkthrough — completely hands-free.',
    iconBg: 'bg-fuchsia-500/15 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
    subtitleColor: 'text-fuchsia-400',
    features: ['Audio narration', 'Diagram generation', 'Connected artifact trail'],
  },
];

const FLOATING_ROOMS = [
  { label: 'Library', left: '12%', top: '28%', delay: 0 },
  { label: 'Lab', left: '58%', top: '18%', delay: 0.2 },
  { label: 'Garden', left: '22%', top: '56%', delay: 0.4 },
  { label: 'Workshop', left: '60%', top: '52%', delay: 0.6 },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060614] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[rgba(6,6,20,0.8)] backdrop-blur-xl border-b border-white/5">
        <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>Rayan</span>
        <div className="flex items-center gap-6">
          <a href="/how-it-works" className="text-white/50 hover:text-white text-sm transition-colors">How It Works</a>
          <a href="/palace" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-medium transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            Enter Palace
          </a>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Ambient glow orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-2 mb-10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-300 font-medium">AI-Powered Memory Palace</span>
            </motion.div>

            {/* Title */}
            <h1
              className="text-[90px] md:text-[130px] font-bold tracking-tight mb-6 leading-none"
              style={{
                fontFamily: 'Cinzel, serif',
                background: 'linear-gradient(135deg, #fff 30%, #a5b4fc 70%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 24px rgba(99,102,241,0.3))',
              }}
            >
              Rayan
            </h1>

            <p className="text-xl md:text-2xl text-indigo-200/70 max-w-3xl mx-auto mb-4 leading-relaxed">
              Walk through your own mind. Every idea you have ever captured lives in a 3D palace — beautifully organized, always retrievable.
            </p>
            <p className="text-sm text-white/30 mb-12 tracking-widest uppercase">
              Powered by Gemini 2.5 Flash &nbsp;&middot;&nbsp; Built with Three.js
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/palace"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-semibold text-lg transition-all duration-200"
                style={{ boxShadow: '0 0 30px rgba(99,102,241,0.45)' }}
                whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(99,102,241,0.6)' }}
                whileTap={{ scale: 0.98 }}
              >
                Enter Your Palace <ArrowRight className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="/how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-semibold text-lg transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                How It Works
              </motion.a>
            </div>
          </motion.div>

          {/* Floating memory previews */}
          <motion.div
            className="mt-20 flex flex-wrap gap-3 justify-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 0.55, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {[
              '📚 Quantum Physics Lecture',
              '💡 System Design Insight',
              '🎯 Q4 Growth Goals',
              '💬 Team Retrospective',
              '🔮 Creative Vision',
            ].map((label, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-indigo-200/80 backdrop-blur"
              >
                {label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/25 text-xs tracking-widest uppercase">
          <span>Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/25 to-transparent" />
        </div>
      </section>

      {/* ── WHAT IS RAYAN ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-4xl md:text-5xl font-bold mb-5 text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              Your Mind, Made Visible
            </h2>
            <p className="text-xl text-indigo-200/55 max-w-2xl mx-auto leading-relaxed">
              Rayan transforms how you capture, organize, and revisit what you learn through a living, breathing 3D world.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, iconBg, iconColor }, i) => (
              <motion.div
                key={title}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/[0.07] hover:border-white/15 transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-12 h-12 rounded-xl ${iconBg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE PALACE ────────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(30,27,75,0.18), transparent)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                Ten Themed Rooms for Every Domain
              </h2>
              <p className="text-lg text-white/45 mb-10 leading-relaxed">
                Each room holds a universe of related memories. Rayan automatically places your ideas where they belong — and you can walk between them in first-person 3D.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {ROOMS.map(({ name, emoji, desc }, i) => (
                  <motion.div
                    key={name}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.07] transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="text-xl leading-none mt-0.5">{emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{name}</p>
                      <p className="text-xs text-white/35">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* 3D Palace mockup */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div
                className="relative bg-[#0a0a22] border border-indigo-500/20 rounded-3xl overflow-hidden aspect-square max-w-md mx-auto"
                style={{ boxShadow: '0 0 80px rgba(99,102,241,0.18), inset 0 0 0 1px rgba(255,255,255,0.04)' }}
              >
                {/* Inner glow */}
                <div className="absolute inset-0"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.14) 0%, transparent 70%)' }} />

                {/* Grid floor perspective */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2 opacity-15"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(99,102,241,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.6) 1px, transparent 1px)',
                    backgroundSize: '36px 36px',
                    transform: 'perspective(500px) rotateX(55deg)',
                    transformOrigin: 'bottom',
                  }}
                />

                {/* Floating room labels */}
                {FLOATING_ROOMS.map(({ label, left, top, delay }) => (
                  <motion.div
                    key={label}
                    className="absolute bg-indigo-500/20 border border-indigo-400/40 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-200 backdrop-blur"
                    style={{ left, top }}
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 3 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {label}
                  </motion.div>
                ))}

                {/* Central lobby glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-2xl"
                  style={{ background: 'rgba(99,102,241,0.35)' }} />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-indigo-400"
                  style={{ boxShadow: '0 0 25px rgba(99,102,241,0.9)' }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />

                {/* Corner label */}
                <div className="absolute top-4 right-4 text-[10px] text-indigo-400/50 font-mono tracking-wider uppercase">
                  3D Palace View
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ARTIFACTS ─────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-4xl md:text-5xl font-bold mb-5 text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              Every Memory Takes a Form
            </h2>
            <p className="text-xl text-white/45 max-w-2xl mx-auto leading-relaxed">
              Artifacts materialize in your palace as interactive 3D objects — each shape chosen to match the nature of the memory inside.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-5">
            {ARTIFACTS.map(({ name, icon, desc, gradientFrom, gradientTo, borderColor }, i) => (
              <motion.div
                key={name}
                className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} border ${borderColor} rounded-2xl p-6 text-center`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.05, y: -4 }}
              >
                <div className="text-5xl mb-4 leading-none">{icon}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{name}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI AGENTS ─────────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(30,27,75,0.18), transparent)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-4xl md:text-5xl font-bold mb-5 text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              Four AI Agents, One Palace
            </h2>
            <p className="text-xl text-white/45 max-w-2xl mx-auto leading-relaxed">
              Specialized Gemini agents work behind the scenes — making your palace alive, intelligent, and always growing.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {AGENTS.map(({ icon: Icon, name, subtitle, desc, iconBg, iconColor, subtitleColor, features }, i) => (
              <motion.div
                key={name}
                className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:border-white/20 transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <div className={`w-14 h-14 rounded-2xl ${iconBg} border flex items-center justify-center mb-5`}>
                  <Icon className={`w-7 h-7 ${iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{name}</h3>
                <p className={`text-sm ${subtitleColor} mb-4 font-medium`}>{subtitle}</p>
                <p className="text-white/45 leading-relaxed mb-6">{desc}</p>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span key={f} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/55">
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH CALLOUT ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="bg-white/[0.04] border border-white/10 rounded-3xl p-10 text-center backdrop-blur-xl"
            {...fadeUp}
          >
            <Brain className="w-10 h-10 text-indigo-400 mx-auto mb-5" />
            <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              Built on State-of-the-Art AI
            </h3>
            <p className="text-white/45 max-w-2xl mx-auto leading-relaxed mb-8">
              Rayan runs on Gemini 2.5 Flash for all reasoning and the Gemini Live API for real-time voice interaction — all grounded by Vertex AI Vector Search for precise semantic retrieval across your palace.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Gemini 2.5 Flash', 'Gemini Live API', 'Vertex AI Vector Search', 'Firebase + Firestore', 'Three.js WebGL', 'FastAPI'].map((tech) => (
                <span key={tech} className="text-sm bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 text-indigo-300">
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-36 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.16) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div {...fadeUp}>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
              Build Your Palace
            </h2>
            <p className="text-xl text-white/45 mb-12 leading-relaxed">
              Every idea deserves a home. Start capturing today and watch your personal palace grow — one memory at a time.
            </p>
            <motion.a
              href="/palace"
              className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-bold text-xl transition-colors"
              style={{ boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 60px rgba(99,102,241,0.6)' }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-6 h-6" />
              Enter Rayan
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-indigo-400/70 font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>Rayan</p>
            <p className="text-white/20 text-sm mt-1">Your AI-Powered Memory Palace</p>
          </div>
          <p className="text-white/15 text-xs text-center italic max-w-xs">
            "The art of memory is the art of attention." — Samuel Johnson
          </p>
          <div className="flex gap-6 text-sm text-white/30">
            <a href="/how-it-works" className="hover:text-white/60 transition-colors">How It Works</a>
            <a href="/palace" className="hover:text-white/60 transition-colors">Sign In</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
