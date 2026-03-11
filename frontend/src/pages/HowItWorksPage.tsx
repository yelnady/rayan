import { motion } from 'framer-motion';
import { Mic, Layers, Map, Search, Sparkles, Volume2, ArrowRight, Brain, Database, Zap, Globe } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 } as object,
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const STEPS = [
  {
    number: '01',
    icon: Mic,
    title: 'Start a Capture Session',
    subtitle: 'Screen, camera, voice, or text — Gemini listens.',
    description:
      'Open Rayan and start a session. Share your screen while watching a lecture, speak your thoughts aloud, or paste in an article. The Capture Agent monitors everything in real time via the Gemini Live API — extracting concepts, facts, insights, and classifying them as they emerge.',
    detail: 'Every extracted concept becomes an artifact candidate with a type, summary, and placement suggestion. Nothing is missed.',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    numberColor: 'text-indigo-500/40',
    visual: [
      { label: 'Screen Share', color: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' },
      { label: 'Voice Input', color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
      { label: 'Text Upload', color: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
    ],
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI Builds Your Palace',
    subtitle: 'Semantic clustering into themed 3D rooms.',
    description:
      'Gemini analyzes each artifact and decides where it belongs. Related memories are clustered together, each cluster becoming a room. The room style — Library, Lab, Garden, Observatory — is chosen to match the semantic theme of its contents.',
    detail: 'Your palace is a spatial map of your knowledge. New rooms grow as your interests expand. Corridors form between rooms that share ideas.',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
    iconColor: 'text-violet-400',
    numberColor: 'text-violet-500/40',
    visual: [
      { label: 'Semantic Clustering', color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
      { label: 'Room Style Selection', color: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
      { label: 'Corridor Generation', color: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' },
    ],
  },
  {
    number: '03',
    icon: Map,
    title: 'Walk Your Palace',
    subtitle: 'First-person 3D exploration of your memories.',
    description:
      'Step inside your palace. Walk through a grand lobby and enter any room through its doors. Inside, artifacts float around you — glowing books, hologram frames, crystal orbs, framed images. Each one represents a memory. Click any artifact to open its full content.',
    detail: 'Switch to overview mode to see the full palace from above. Every room you have ever known, laid out like a living map.',
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    iconColor: 'text-purple-400',
    numberColor: 'text-purple-500/40',
    visual: [
      { label: 'First-Person Navigation', color: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
      { label: 'Artifact Interaction', color: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' },
      { label: 'Palace Overview Mode', color: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
    ],
  },
  {
    number: '04',
    icon: Search,
    title: 'Recall with Your Voice',
    subtitle: 'Ask anything — get answers grounded in your palace.',
    description:
      'Press the recall button and ask a question in natural language. The Recall Agent encodes your query and searches the Vertex AI Vector Store for the most semantically relevant artifacts. It then synthesizes a spoken answer — grounded in your actual captured memories, with references.',
    detail: 'Matching artifacts glow in the palace as the agent speaks. You always know exactly where the answer came from.',
    iconBg: 'bg-fuchsia-500/15 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
    numberColor: 'text-fuchsia-500/40',
    visual: [
      { label: 'Vector Semantic Search', color: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' },
      { label: 'Grounded Citations', color: 'bg-rose-500/20 border-rose-500/40 text-rose-300' },
      { label: 'Artifact Highlighting', color: 'bg-pink-500/20 border-pink-500/40 text-pink-300' },
    ],
  },
  {
    number: '05',
    icon: Sparkles,
    title: 'Enrich What You Know',
    subtitle: 'The Enrichment Agent goes deeper, on demand.',
    description:
      'Open any artifact and trigger enrichment. The Enrichment Agent researches verified sources on the web, finds relevant images, extracts supporting evidence, and attaches it all directly to the artifact — with full source attribution. Your memory just got richer.',
    detail: 'The Narrator Agent can then read any artifact aloud, generate a visual diagram of its connections, and walk you through related memories hands-free.',
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    iconColor: 'text-amber-400',
    numberColor: 'text-amber-500/40',
    visual: [
      { label: 'Web Research', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
      { label: 'Image Sourcing', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
      { label: 'Audio Narration', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
    ],
  },
];

const TECH_STACK = [
  {
    icon: Brain,
    title: 'Gemini 2.5 Flash',
    desc: 'Powers every reasoning task — concept extraction, room classification, enrichment research, and response generation.',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Mic,
    title: 'Gemini Live API',
    desc: 'Real-time streaming audio for the Capture Agent (watching and listening) and the Recall Agent (voice queries).',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    icon: Database,
    title: 'Vertex AI Vector Search',
    desc: 'Stores artifact embeddings for millisecond-latency semantic search across your entire palace during recall.',
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  {
    icon: Globe,
    title: 'Firebase + Firestore',
    desc: 'Real-time palace state, artifact storage, user authentication, and media via Cloud Storage.',
    iconBg: 'bg-fuchsia-500/15 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
  {
    icon: Layers,
    title: 'Three.js + React Three Fiber',
    desc: 'The entire 3D palace — rooms, corridors, artifacts, lighting, and first-person navigation — rendered in WebGL.',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Zap,
    title: 'FastAPI + ADK',
    desc: 'Python backend with the Google Agent Development Kit orchestrating all four Gemini agents over WebSocket.',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
];

export function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#060614] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[rgba(6,6,20,0.8)] backdrop-blur-xl border-b border-white/5">
        <a href="/landing" className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>Rayan</a>
        <div className="flex items-center gap-6">
          <a href="/landing" className="text-white/50 hover:text-white text-sm transition-colors">About</a>
          <a href="/palace" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-medium transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            Enter Palace
          </a>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-2 mb-8">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-300 font-medium">From Capture to Recall</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Cinzel, serif' }}>
              How Rayan Works
            </h1>
            <p className="text-xl text-indigo-200/55 max-w-2xl mx-auto leading-relaxed">
              Five steps from a raw idea to a fully navigable, searchable, enriched memory — inside a palace that is entirely yours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── STEPS ─────────────────────────────────────────────────────────── */}
      <section className="py-10 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {STEPS.map(({ number, icon: Icon, title, subtitle, description, detail, iconBg, iconColor, numberColor, visual }, i) => (
            <motion.div
              key={number}
              className="relative bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden hover:border-white/15 transition-all duration-300"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              {/* Step number watermark */}
              <div
                className={`absolute top-4 right-6 text-[72px] font-bold leading-none select-none pointer-events-none ${numberColor}`}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {number}
              </div>

              <div className="relative z-10 p-8 md:p-10">
                <div className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
                  {/* Left: content */}
                  <div>
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-12 h-12 rounded-xl ${iconBg} border flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{title}</h3>
                        <p className="text-sm text-white/45">{subtitle}</p>
                      </div>
                    </div>

                    <p className="text-white/60 leading-relaxed mb-4">{description}</p>
                    <p className="text-sm text-indigo-300/60 italic leading-relaxed border-l-2 border-indigo-500/30 pl-4">{detail}</p>
                  </div>

                  {/* Right: visual badges */}
                  <div className="flex flex-col gap-3 md:min-w-[200px]">
                    {visual.map(({ label, color }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${color} backdrop-blur`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FLOW DIAGRAM ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(30,27,75,0.2), transparent)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              The Full Pipeline
            </h2>
            <p className="text-white/45 max-w-xl mx-auto">From raw input to navigable memory in seconds.</p>
          </motion.div>

          <motion.div
            className="flex flex-col md:flex-row items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {[
              { label: 'Your Input', sublabel: 'Screen / Voice / Text', icon: Mic, color: 'border-indigo-500/40 bg-indigo-500/10' },
              { label: 'Capture Agent', sublabel: 'Gemini Live API', icon: Brain, color: 'border-violet-500/40 bg-violet-500/10' },
              { label: 'Your Palace', sublabel: 'Firestore + Vector DB', icon: Layers, color: 'border-purple-500/40 bg-purple-500/10' },
              { label: 'Recall Agent', sublabel: 'Semantic Search', icon: Search, color: 'border-fuchsia-500/40 bg-fuchsia-500/10' },
              { label: 'Spoken Answer', sublabel: 'Grounded + Cited', icon: Volume2, color: 'border-amber-500/40 bg-amber-500/10' },
            ].map(({ label, sublabel, icon: Icon, color }, i, arr) => (
              <div key={label} className="flex items-center gap-2">
                <motion.div
                  className={`flex flex-col items-center gap-2 border ${color} rounded-2xl px-5 py-4 text-center min-w-[130px] backdrop-blur`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Icon className="w-6 h-6 text-white/70" />
                  <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[11px] text-white/35 leading-tight">{sublabel}</p>
                </motion.div>

                {i < arr.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-white/20 flex-shrink-0" />
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              The Technology Inside
            </h2>
            <p className="text-white/45 max-w-xl mx-auto">
              Every layer of Rayan is built on production-grade, state-of-the-art infrastructure.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECH_STACK.map(({ icon: Icon, title, desc, iconBg, iconColor }, i) => (
              <motion.div
                key={title}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-300"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -3 }}
              >
                <div className={`w-11 h-11 rounded-xl ${iconBg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROOM THEMES ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(to bottom, transparent, rgba(30,27,75,0.18), transparent)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              Room Themes
            </h2>
            <p className="text-white/45 max-w-xl mx-auto">
              Each theme has a unique aesthetic — different lighting, fog, materials, and particle effects — so every room feels like a different world.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Library', emoji: '📚', light: '#FFA500', mood: 'Warm amber glow, ancient wood' },
              { name: 'Lab', emoji: '🔬', light: '#4A90D9', mood: 'Cold blue, sterile precision' },
              { name: 'Gallery', emoji: '🖼', light: '#FFFFFF', mood: 'Clean white, art-gallery bright' },
              { name: 'Garden', emoji: '🌿', light: '#90EE90', mood: 'Soft green, natural sunlight' },
              { name: 'Workshop', emoji: '🔧', light: '#FFA07A', mood: 'Warm orange, industrial grit' },
              { name: 'Museum', emoji: '🏛', light: '#FFD89B', mood: 'Golden heritage lighting' },
              { name: 'Observatory', emoji: '🔭', light: '#4FC3F7', mood: 'Deep space, cool starlight' },
              { name: 'Sanctuary', emoji: '🕊', light: '#D1FAE5', mood: 'Soft mint, serene peace' },
              { name: 'Studio', emoji: '🎨', light: '#FFCC80', mood: 'Creative warmth, open air' },
              { name: 'Dojo', emoji: '⚔', light: '#FF8C42', mood: 'Intense red-orange, raw power' },
            ].map(({ name, emoji, light, mood }, i) => (
              <motion.div
                key={name}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-center hover:bg-white/[0.07] transition-colors"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="text-3xl mb-2">{emoji}</div>
                <p className="text-sm font-semibold text-white mb-1">{name}</p>
                <div className="w-full h-1 rounded-full mb-2 opacity-70" style={{ background: `linear-gradient(to right, transparent, ${light}, transparent)` }} />
                <p className="text-[10px] text-white/30 leading-tight">{mood}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.14) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div {...fadeUp}>
            <h2 className="text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
              Ready to Start?
            </h2>
            <p className="text-xl text-white/45 mb-12 leading-relaxed">
              Your palace is waiting. Sign in to begin capturing your first memory.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/palace"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-bold text-lg transition-colors"
                style={{ boxShadow: '0 0 35px rgba(99,102,241,0.4)' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Enter Rayan <ArrowRight className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="/landing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-semibold text-lg hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                About Rayan
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-indigo-400/70 font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>Rayan</p>
            <p className="text-white/20 text-sm mt-1">AI-Powered Memory Palace</p>
          </div>
          <p className="text-white/15 text-xs text-center italic max-w-xs">
            "Memory is the treasury and guardian of all things." — Cicero
          </p>
          <div className="flex gap-6 text-sm text-white/30">
            <a href="/landing" className="hover:text-white/60 transition-colors">About</a>
            <a href="/palace" className="hover:text-white/60 transition-colors">Sign In</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
