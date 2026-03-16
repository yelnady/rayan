import { motion } from 'framer-motion';
import {
  Mic, Layers, Map, Search, Sparkles, Volume2, ArrowRight,
  Brain, Database, Zap, Globe, Camera, Wand2, Shield,
  BookOpen, FlaskConical, Frame, Leaf, Wrench, Star, Landmark,
  Heart, Palette,
} from 'lucide-react';
import { Logo } from '../components/brand/Logo';

const HEADING = "font-['Playfair_Display',serif]";

const fadeUp = {
  initial: { opacity: 0, y: 36, filter: 'blur(8px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

const spring = (delay = 0) => ({
  type: 'spring' as const,
  stiffness: 80,
  damping: 18,
  delay,
});

const STEPS = [
  {
    number: '01',
    icon: Mic,
    title: 'Start a Capture Session',
    subtitle: 'Voice, screen, or camera. Gemini listens live.',
    description:
      'Open Rayan and start a session. Share your screen during a lecture, speak your thoughts aloud, or point your camera at a whiteboard. The Capture Agent opens a persistent Gemini Live connection and silently extracts concepts, facts, and insights as they emerge in real time.',
    detail: 'Every extracted concept becomes a typed artifact with a summary and room placement. Nothing is missed, nothing requires your attention.',
    iconBg: 'bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-600',
    numberColor: 'text-indigo-200',
    visual: [
      { label: 'Voice Input',   color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
      { label: 'Screen Share',  color: 'bg-violet-50 border-violet-200 text-violet-700' },
      { label: 'Camera Feed',   color: 'bg-purple-50 border-purple-200 text-purple-700' },
    ],
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI Builds Your Palace',
    subtitle: 'Semantic clustering into themed 3D rooms.',
    description:
      'The Memory Architect (Gemini 2.5 Flash) analyzes each artifact and decides where it belongs. Related memories cluster together, each cluster becoming a room. The room style is chosen to match the semantic theme of its contents.',
    detail: 'Your palace is a spatial map of your knowledge. New rooms grow as your interests expand. The architect runs automatically after every capture.',
    iconBg: 'bg-violet-50 border-violet-200',
    iconColor: 'text-violet-600',
    numberColor: 'text-violet-200',
    visual: [
      { label: 'Semantic Clustering',  color: 'bg-violet-50 border-violet-200 text-violet-700' },
      { label: 'Room Style Selection', color: 'bg-purple-50 border-purple-200 text-purple-700' },
      { label: 'Auto-Organization',    color: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700' },
    ],
  },
  {
    number: '03',
    icon: Map,
    title: 'Walk Your Palace',
    subtitle: 'First-person 3D exploration of your memories.',
    description:
      'Step inside your palace. Walk through a grand lobby and enter any room through its doors. Inside, artifacts float around you: glowing books, hologram frames, crystal orbs, framed images. Each one represents a memory. Click any artifact to open its full content.',
    detail: 'Switch to overview mode to see the full palace from above. Every room you have ever known, laid out like a living map.',
    iconBg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
    numberColor: 'text-purple-200',
    visual: [
      { label: 'First-Person Navigation', color: 'bg-purple-50 border-purple-200 text-purple-700' },
      { label: 'Artifact Interaction',    color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
      { label: 'Palace Overview Mode',    color: 'bg-violet-50 border-violet-200 text-violet-700' },
    ],
  },
  {
    number: '04',
    icon: Search,
    title: 'Recall with Your Voice',
    subtitle: 'Ask anything and get answers grounded in your palace.',
    description:
      'Press the recall button and ask a question in natural language. The Recall Agent embeds your query, runs cosine similarity search over your stored artifact embeddings, and injects the top 8 most relevant memories into its live system prompt before speaking a single word.',
    detail: 'Matching artifacts glow in the palace as the agent speaks. You always know exactly where the answer came from.',
    iconBg: 'bg-fuchsia-50 border-fuchsia-200',
    iconColor: 'text-fuchsia-600',
    numberColor: 'text-fuchsia-200',
    visual: [
      { label: 'Vector Semantic Search', color: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700' },
      { label: 'Grounded Citations',     color: 'bg-rose-50 border-rose-200 text-rose-700' },
      { label: 'Artifact Highlighting',  color: 'bg-pink-50 border-pink-200 text-pink-700' },
    ],
  },
  {
    number: '05',
    icon: Sparkles,
    title: 'Synthesize and Narrate',
    subtitle: 'AI mind maps and artifact narration on demand.',
    description:
      'Say "synthesize this room" and Gemini Image generates a styled visual summary of every memory in the room, rendered directly on your 3D palace wall. Click any artifact and the Narrator Agent finds the 5 most related memories and speaks a warm, synthesized explanation.',
    detail: 'Each synthesis matches the room theme. Library rooms get warm parchment. Lab rooms get holographic panels. Not a diagram, a piece of art.',
    iconBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    numberColor: 'text-amber-200',
    visual: [
      { label: 'AI Mind Map Image', color: 'bg-amber-50 border-amber-200 text-amber-700' },
      { label: 'Artifact Narration', color: 'bg-orange-50 border-orange-200 text-orange-700' },
      { label: 'Affective Dialogue', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    ],
  },
];

const TECH_STACK = [
  {
    icon: Mic,
    title: 'Gemini Live API',
    desc: 'Real-time streaming audio for both the Capture Agent (listening and watching) and the Recall Agent (voice queries and answers). Uses gemini-live-2.5-flash-native-audio with affective dialogue enabled.',
    iconBg: 'bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Brain,
    title: 'Gemini 2.5 Flash',
    desc: 'Powers the Memory Architect for concept categorization and room clustering, and the Narrator Agent for personalized artifact narration and connection synthesis.',
    iconBg: 'bg-violet-50 border-violet-200',
    iconColor: 'text-violet-600',
  },
  {
    icon: Wand2,
    title: 'Gemini 2.5 Flash Image',
    desc: 'Generates creative styled mind map images for each room on synthesis. Each image is themed to the room: parchment for Library, holographic for Lab, painterly for Gallery.',
    iconBg: 'bg-fuchsia-50 border-fuchsia-200',
    iconColor: 'text-fuchsia-600',
  },
  {
    icon: Database,
    title: 'Vertex AI Embeddings',
    desc: 'gemini-embedding-2-preview generates 768-dimensional vectors for every artifact. Cosine similarity search grounds every Recall answer in real captured memories with zero hallucination.',
    iconBg: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    icon: Globe,
    title: 'Google Search Grounding',
    desc: "Built-in Gemini tool that injects live web search results into agent context mid-session. No external API key needed. Recall can surface current information alongside your stored memories.",
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    icon: Shield,
    title: 'Google ADK',
    desc: 'Agent Development Kit orchestrates all agents (Capture, Recall, Narrator, Memory Architect) over a persistent WebSocket connection with tool-calling and session management.',
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Layers,
    title: 'Three.js + React Three Fiber',
    desc: 'The entire 3D palace: rooms, corridors, artifacts, lighting, and first-person navigation rendered in WebGL. 16 distinct artifact types with unique 3D geometry.',
    iconBg: 'bg-cyan-50 border-cyan-200',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Zap,
    title: 'FastAPI + Cloud Run',
    desc: 'Python backend deployed on Cloud Run with session affinity, 2 vCPU, 2 GiB memory, and WebSocket support for persistent agent connections.',
    iconBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
  },
  {
    icon: Camera,
    title: 'Firebase + Firestore',
    desc: 'Google Sign-In authentication, real-time palace state, artifact and embedding storage in Firestore, and media (screenshots, mind maps) in Cloud Storage.',
    iconBg: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-600',
  },
];

export function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 backdrop-blur-xl border-b border-gray-100" style={{ background: 'rgba(255,255,255,0.95)' }}>
        <a href="/" className="flex items-center gap-2">
          <Logo size={26} />
          <span className={`text-gray-900 font-bold text-xl sm:text-2xl tracking-wide ${HEADING}`}>Rayan</span>
        </a>
        <div className="flex items-center gap-3 sm:gap-5">
          <a href="/" className="hidden sm:block text-gray-500 hover:text-gray-900 text-sm transition-colors">Home</a>
          <a
            href="/palace"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 20px rgba(99,102,241,0.25)' }}
          >
            Enter Palace
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-36 pb-20 px-6 text-center overflow-hidden bg-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2 mb-8">
              <Volume2 className="w-4 h-4 text-indigo-500" />
              <span className="text-sm text-indigo-600 font-medium">From Capture to Recall</span>
            </div>
            <h1 className={`text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight ${HEADING}`}>
              How Rayan Works
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Five steps from a raw idea to a fully navigable, searchable memory inside a palace that is entirely yours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-10 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-6">
          {STEPS.map(({ number, icon: Icon, title, subtitle, description, detail, iconBg, iconColor, numberColor, visual }, i) => (
            <motion.div
              key={number}
              className="relative bg-white border border-gray-100 rounded-3xl overflow-hidden transition-all duration-300"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={spring(i * 0.08)}
              whileHover={{ boxShadow: '0 8px 32px rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.20)' }}
            >
              <div className={`absolute bottom-3 right-6 text-[80px] font-bold leading-none select-none pointer-events-none ${numberColor} ${HEADING}`}>
                {number}
              </div>

              <div className="relative z-10 p-8 md:p-10">
                <div className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
                  <div>
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-12 h-12 rounded-xl ${iconBg} border flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold text-gray-900 ${HEADING}`}>{title}</h3>
                        <p className="text-sm text-gray-500">{subtitle}</p>
                      </div>
                    </div>
                    <p className="text-base text-gray-700 leading-relaxed mb-4">{description}</p>
                    <p className="text-sm text-indigo-600 leading-relaxed border-l-2 border-indigo-200 pl-4">{detail}</p>
                  </div>

                  <div className="flex flex-col gap-3 md:min-w-[200px]">
                    {visual.map(({ label, color }) => (
                      <div key={label} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${color}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
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

      {/* FLOW DIAGRAM */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <h2 className={`text-4xl font-bold text-gray-900 mb-4 ${HEADING}`}>The Full Pipeline</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From raw input to navigable memory in seconds.</p>
          </motion.div>

          <motion.div
            className="flex flex-col md:flex-row items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {[
              { label: 'Your Input',    sublabel: 'Screen / Voice / Camera', icon: Mic,     color: 'border-indigo-200 bg-indigo-50',   text: 'text-indigo-700' },
              { label: 'Capture Agent', sublabel: 'Gemini Live API',          icon: Brain,   color: 'border-violet-200 bg-violet-50',   text: 'text-violet-700' },
              { label: 'Your Palace',   sublabel: 'Firestore + Embeddings',   icon: Layers,  color: 'border-purple-200 bg-purple-50',   text: 'text-purple-700' },
              { label: 'Recall Agent',  sublabel: 'Semantic Search',          icon: Search,  color: 'border-fuchsia-200 bg-fuchsia-50', text: 'text-fuchsia-700' },
              { label: 'Spoken Answer', sublabel: 'Grounded + Cited',         icon: Volume2, color: 'border-amber-200 bg-amber-50',     text: 'text-amber-700' },
            ].map(({ label, sublabel, icon: Icon, color, text }, i, arr) => (
              <div key={label} className="flex items-center gap-2">
                <motion.div
                  className={`flex flex-col items-center gap-2 border ${color} rounded-2xl px-5 py-4 text-center min-w-[130px]`}
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Icon className={`w-6 h-6 ${text}`} />
                  <p className={`text-sm font-semibold leading-tight ${text}`}>{label}</p>
                  <p className="text-[11px] text-gray-400 leading-tight">{sublabel}</p>
                </motion.div>
                {i < arr.length - 1 && <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <h2 className={`text-4xl font-bold text-gray-900 mb-4 ${HEADING}`}>The Technology Inside</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every layer of Rayan is built on production-grade Google infrastructure.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECH_STACK.map(({ icon: Icon, title, desc, iconBg, iconColor }, i) => (
              <motion.div
                key={title}
                className="bg-white border border-gray-100 rounded-2xl p-6 transition-all duration-300"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                initial={{ opacity: 0, y: 25, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={spring(i * 0.07)}
                whileHover={{ y: -4, boxShadow: '0 8px 28px rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.20)' }}
              >
                <div className={`w-11 h-11 rounded-xl ${iconBg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROOM THEMES */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <h2 className={`text-4xl font-bold text-gray-900 mb-4 ${HEADING}`}>Room Themes</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Each theme has a unique aesthetic: different lighting, fog, materials, and particle effects. Every room feels like a different world.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Library',     icon: BookOpen,     color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',   light: '#FFA500', mood: 'Warm amber glow, ancient wood' },
              { name: 'Lab',         icon: FlaskConical, color: 'text-cyan-600',    bg: 'bg-cyan-50 border-cyan-200',     light: '#4A90D9', mood: 'Cold blue, sterile precision' },
              { name: 'Gallery',     icon: Frame,        color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',     light: '#FFFFFF', mood: 'Clean white, art-gallery bright' },
              { name: 'Garden',      icon: Leaf,         color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', light: '#90EE90', mood: 'Soft green, natural sunlight' },
              { name: 'Workshop',    icon: Wrench,       color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200', light: '#FFA07A', mood: 'Warm orange, industrial grit' },
              { name: 'Museum',      icon: Landmark,     color: 'text-yellow-600',  bg: 'bg-yellow-50 border-yellow-200', light: '#FFD89B', mood: 'Golden heritage lighting' },
              { name: 'Observatory', icon: Star,         color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',     light: '#4FC3F7', mood: 'Deep space, cool starlight' },
              { name: 'Sanctuary',   icon: Heart,        color: 'text-pink-600',    bg: 'bg-pink-50 border-pink-200',     light: '#D1FAE5', mood: 'Soft mint, serene peace' },
              { name: 'Studio',      icon: Palette,      color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200', light: '#FFCC80', mood: 'Creative warmth, open air' },
              { name: 'Dojo',        icon: Zap,          color: 'text-red-600',     bg: 'bg-red-50 border-red-200',       light: '#FF8C42', mood: 'Intense red-orange, raw power' },
            ].map(({ name, icon: Icon, color, bg, light, mood }, i) => (
              <motion.div
                key={name}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-center transition-all"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={spring(i * 0.05)}
                whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
              >
                <div className={`w-9 h-9 rounded-lg ${bg} border flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{name}</p>
                <div className="w-full h-1 rounded-full mb-2" style={{ background: `linear-gradient(to right, transparent, ${light}, transparent)` }} />
                <p className="text-[10px] text-gray-400 leading-tight">{mood}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden bg-gray-50">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div {...fadeUp}>
            <h2 className={`text-5xl font-bold text-gray-900 mb-6 ${HEADING}`}>Ready to Start?</h2>
            <p className="text-xl text-gray-500 mb-12 leading-relaxed">
              Your palace is waiting. Sign in to begin capturing your first memory.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/palace"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 35px rgba(99,102,241,0.30)' }}
                whileHover={{ scale: 1.04, boxShadow: '0 0 56px rgba(99,102,241,0.50)' }}
                whileTap={{ scale: 0.97 }}
              >
                Enter Rayan <ArrowRight className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 rounded-2xl text-gray-700 font-semibold text-lg hover:border-gray-300 transition-colors"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Back to Home
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className={`text-indigo-600 font-bold text-lg ${HEADING}`}>Rayan</p>
            <p className="text-gray-400 text-sm mt-1">Voice-First AI Memory Palace</p>
          </div>
          <p className="text-gray-400 text-xs text-center italic max-w-xs">
            "Memory is the treasury and guardian of all things." Cicero
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="/" className="hover:text-gray-900 transition-colors">Home</a>
            <a href="/palace" className="hover:text-gray-900 transition-colors">Sign In</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
