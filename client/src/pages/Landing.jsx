import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ShieldCheck, Search, Zap, ArrowRight, CheckCircle2, Building2,
  Loader2, AlertCircle, FileCheck2, Fingerprint, Cpu, Network,
  Activity, Lock, Database, Globe2, Users, ChevronDown, Terminal,
  Server, Link as LinkIcon
} from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';

// ──────────────────────────────────────────────────────────────────────────
// 💠 ORCHESTRATED ANIMATION PHYSICS & VARIANTS
// ──────────────────────────────────────────────────────────────────────────
const springConfig = { type: "spring", stiffness: 100, damping: 20, mass: 1 };

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springConfig }
};

const scaleInVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: springConfig }
};

// ──────────────────────────────────────────────────────────────────────────
// 📊 STATIC DATA (Memoized implicitly by being outside component)
// ──────────────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  "TX_HASH: 0x8F...3A VERIFIED", "NODE_04 CONNECTED", "BLOCK #8921 MINED",
  "STANFORD_ALT SYNCED", "NEW CREDENTIAL ISSUED", "NETWORK LATENCY: 12ms",
  "TX_HASH: 0x2C...9F VERIFIED", "PROTOCOL V2.4 SECURE", "PEER DISCOVERY: ACTIVE",
  "BGP ROUTING: OPTIMAL"
];

const STATS_DATA = [
  { label: "Active Nodes", value: "2,408", icon: Server, color: "text-indigo-400" },
  { label: "Credentials Secured", value: "1.2M+", icon: ShieldCheck, color: "text-emerald-400" },
  { label: "Avg Block Time", value: "2.4s", icon: Zap, color: "text-amber-400" },
  { label: "Network Uptime", value: "99.999%", icon: Activity, color: "text-blue-400" }
];

const FAQ_DATA = [
  {
    question: "How does the zero-knowledge verification work?",
    answer: "Our protocol allows third parties to mathematically verify the authenticity and validity of a credential without the issuing institution needing to expose the underlying private data of the student. We use zk-SNARKs to prove possession of a valid ledger entry."
  },
  {
    question: "What happens if an issuing institution goes offline?",
    answer: "Because EduCred operates on a decentralized peer-to-peer mesh network, the cryptographic hash of the credential lives on the distributed ledger. As long as the network exists, the credential remains verifiable, independently of the original issuer's server status."
  },
  {
    question: "Is the network resistant to quantum computing threats?",
    answer: "We are currently implementing post-quantum cryptographic signatures (such as lattice-based cryptography) into our Layer 2 state channels to ensure long-term immutability against future computational advancements."
  }
];

// ──────────────────────────────────────────────────────────────────────────
// 🧱 SUB-COMPONENTS
// ──────────────────────────────────────────────────────────────────────────
const FAQItem = ({ faq, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-bold text-white">{faq.question}</span>
        <ChevronDown className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={20} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-6 pt-0 text-slate-400 leading-relaxed border-t border-white/5 mt-2">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  // Parallax constraints
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Terminal State
  const [searchId, setSearchId] = useState('');
  const [verifyState, setVerifyState] = useState('idle'); // idle, connecting, hashing, verified, error
  const [demoResult, setDemoResult] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const terminalRef = useRef(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 🔌 EFFECTS & LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Auto-scroll terminal logs to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 💻 TERMINAL LOGIC & SIMULATION
  // ──────────────────────────────────────────────────────────────────────────
  const handleDemoVerify = useCallback((e) => {
    e.preventDefault();
    if (!searchId || verifyState !== 'idle') return;

    setVerifyState('connecting');
    setDemoResult(null);
    setTerminalLogs([`> INITIATING SECURE HANDSHAKE FOR ID: ${searchId}...`]);

    // Simulated multi-stage verification pipeline
    setTimeout(() => {
      setVerifyState('hashing');
      setTerminalLogs(prev => [...prev, "> PEER-TO-PEER GOSSIP PROTOCOL ENGAGED..."]);
    }, 800);

    setTimeout(() => {
      setTerminalLogs(prev => [...prev, "> LOCATING NODE CLUSTERS VIA BGP ROUTES..."]);
    }, 1500);

    setTimeout(() => {
      setTerminalLogs(prev => [...prev, "> COMPUTING SHA-256 MERKLE ROOT..."]);
    }, 2200);

    setTimeout(() => {
      setTerminalLogs(prev => [...prev, "> COMPARING LOCAL HASH AGAINST GLOBAL LEDGER STATE..."]);
    }, 3000);

    setTimeout(() => {
      if (searchId.length >= 5 && searchId !== 'ERROR') {
        setTerminalLogs(prev => [...prev, "> MATCH FOUND. DECRYPTING PUBLIC PAYLOAD..."]);
        setTimeout(() => {
          setVerifyState('verified');
          setDemoResult({
            name: 'ANONYMOUS SCHOLAR',
            degree: 'M.SC. DISTRIBUTED CRYPTOGRAPHY',
            node: 'EDU-NODE-ALPHA-7B',
            hash: '0x' + Math.random().toString(16).slice(2, 14).toUpperCase() + '...4F2A',
            timestamp: new Date().toISOString(),
            issuer: 'GlobalTech Institute'
          });
        }, 500);
      } else {
        setTerminalLogs(prev => [...prev, "> FATAL: NO CRYPTOGRAPHIC MATCH FOUND ON LEDGER."]);
        setTimeout(() => setVerifyState('error'), 500);
      }
    }, 3800);
  }, [searchId, verifyState]);

  const resetDemo = useCallback(() => {
    setVerifyState('idle');
    setSearchId('');
    setDemoResult(null);
    setTerminalLogs([]);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 🧱 RENDER HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  const isProcessing = useMemo(() =>
    verifyState === 'connecting' || verifyState === 'hashing',
    [verifyState]);

  return (
    <div className="relative min-h-screen bg-[#020408] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-x-hidden">

      {/* 🌌 DEEP SPACE MESH BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none" aria-hidden="true">
        <BlockchainBackground isSurging={isProcessing} />
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          NAVIGATION BAR (NEW)
      ────────────────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-[#020408]/80 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
        <div className="container max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">Edu<span className="text-indigo-400">Cred</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold tracking-widest uppercase text-slate-400">
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#network" className="hover:text-white transition-colors">Network</a>
            <a href="#terminal" className="hover:text-white transition-colors">Terminal</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/verify')}
              className="hidden sm:block text-sm font-bold text-white hover:text-indigo-300 transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/issue')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full text-sm font-bold border border-white/10 transition-all backdrop-blur-md"
            >
              Issue Credentials
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ──────────────────────────────────────────────────────────────────
            🚀 HERO SECTION: Immersive Parallax & Massive Typography
        ────────────────────────────────────────────────────────────────── */}
        <motion.section
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative min-h-[100vh] flex flex-col items-center justify-center pt-32 px-6 z-10"
          aria-label="Introduction"
        >
          {/* Ambient Lighting */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden="true">
            <div className="absolute w-[800px] h-[800px] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
            <div className="absolute w-[600px] h-[600px] bg-violet-600/10 blur-[120px] rounded-full mix-blend-screen translate-x-1/3 -translate-y-1/3" />
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="container max-w-7xl mx-auto flex flex-col items-center text-center relative z-20"
          >
            <motion.div variants={fadeUpVariant} className="mb-8 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(99,102,241,0.1)] hover:bg-white/[0.05] transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-200">Mainnet v2.4 Active</span>
            </motion.div>

            <motion.h1
              variants={fadeUpVariant}
              className="text-6xl md:text-[7rem] lg:text-[9rem] font-extrabold text-white tracking-tighter leading-[0.85] mb-8"
            >
              Absolute <br className="hidden md:block" />
              <span className="relative inline-block mt-2">
                <span className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 blur-3xl opacity-20 animate-pulse"></span>
                <span className="relative bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent pb-4">
                  Integrity.
                </span>
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUpVariant}
              className="max-w-3xl text-lg md:text-2xl text-slate-400 leading-relaxed mb-12 font-medium"
            >
              The global standard for decentralized academic credentials.
              We replace forgeable PDFs with mathematically undeniable, cryptographically secured truth.
            </motion.p>

            <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
              <button
                onClick={() => navigate('/verify')}
                className="w-full sm:w-auto group relative bg-white text-black px-10 py-5 rounded-2xl font-bold text-lg tracking-wide transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Access Public Ledger
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button
                onClick={() => navigate('/issue')}
                className="w-full sm:w-auto group relative bg-black/20 text-white border border-white/20 px-10 py-5 rounded-2xl font-bold text-lg tracking-wide transition-all hover:bg-white/10 hover:border-white/40 active:scale-95 flex items-center justify-center gap-3 backdrop-blur-md"
              >
                <Database size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                Issue as Institution
              </button>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ──────────────────────────────────────────────────────────────────
            ⚡ LIVE TICKER BAR & STATS ROW
        ────────────────────────────────────────────────────────────────── */}
        <div className="relative z-20 bg-[#05070E] border-y border-white/10">
          {/* Ticker */}
          <div className="overflow-hidden py-3 border-b border-white/5 bg-black/40">
            <div className="flex whitespace-nowrap animate-[marquee_40s_linear_infinite]" aria-hidden="true">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <div key={i} className="flex items-center gap-6 mx-6 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-pulse" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="container max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
              {STATS_DATA.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex flex-col items-center text-center ${idx !== 0 ? 'pl-8' : ''}`}
                >
                  <stat.icon size={24} className={`${stat.color} mb-3 opacity-80`} />
                  <span className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-1">{stat.value}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            🧱 ARCHITECTURE OF TRUST (Expanded Bento Grid)
        ────────────────────────────────────────────────────────────────── */}
        <section id="architecture" className="py-32 relative z-20">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="text-center mb-20 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6"
              >
                System Architecture
              </motion.div>
              <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tighter">Engineered for Truth.</h2>
              <p className="text-slate-400 text-lg md:text-xl leading-relaxed">
                A robust convergence of peer-to-peer networking, advanced cryptography, and resilient node discovery protocols built for global institutional scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[320px]">

              {/* CARD 1: Mesh Network (Span 8) */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant}
                className="md:col-span-8 relative group rounded-[2rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] p-10 overflow-hidden hover:border-indigo-500/30 transition-all duration-500"
              >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-500/10 transition-colors duration-700" />
                <Network size={40} className="text-indigo-400 mb-6 relative z-10" />
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight relative z-10">Decentralized Mesh Topology</h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-xl relative z-10">
                  By utilizing rapid gossip protocols and dynamic BGP routing, credential state is propagated across hundreds of global institutional nodes in milliseconds. No single point of failure. Absolute resilience.
                </p>
              </motion.div>

              {/* CARD 2: Zero-Knowledge (Span 4) */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant} transition={{ delay: 0.1 }}
                className="md:col-span-4 relative group rounded-[2rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] p-10 overflow-hidden hover:border-emerald-500/30 transition-all duration-500"
              >
                <Lock size={36} className="text-emerald-400 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Zero-Knowledge</h3>
                <p className="text-slate-400 leading-relaxed">
                  Verify the validity of a degree without exposing underlying personal identifying information. Privacy is mathematically guaranteed.
                </p>
              </motion.div>

              {/* CARD 3: Cryptography (Span 4) */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant} transition={{ delay: 0.2 }}
                className="md:col-span-4 relative group rounded-[2rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] p-10 overflow-hidden hover:border-violet-500/30 transition-all duration-500"
              >
                <Fingerprint size={36} className="text-violet-400 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">SHA-256 Hashing</h3>
                <p className="text-slate-400 leading-relaxed">
                  Every certificate generates a unique cryptographic fingerprint anchored permanently to the ledger. Unalterable and unforgeable.
                </p>
              </motion.div>

              {/* CARD 4: Immutability (Span 8) */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant} transition={{ delay: 0.3 }}
                className="md:col-span-8 relative group rounded-[2rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] p-10 overflow-hidden hover:border-blue-500/30 transition-all duration-500 flex flex-col justify-end"
              >
                <div className="absolute top-10 right-10 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:scale-110 group-hover:rotate-3">
                  <Database size={160} className="text-blue-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Immutable Storage</h3>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                    Once a credential block is mined and consensus is reached, it becomes a permanent part of the historical record. Data cannot be deleted, tampered with, or revoked without explicit cryptographic authorization.
                  </p>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────
            🌐 THE COMMUNITY & ECOSYSTEM (The Human Element)
        ────────────────────────────────────────────────────────────────── */}
        <section className="py-32 relative z-20 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <motion.div
                initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="flex-1 space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold uppercase tracking-widest">
                  Ecosystem
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter leading-tight">
                  Beyond credentials.<br />Building deep human trust.
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  When the authenticity of a person's background is mathematically guaranteed, the friction of mistrust vanishes. EduCred isn't just a database; it is a foundation for fostering deeper, more authentic human connections across borders.
                </p>
                <p className="text-slate-400 text-lg leading-relaxed">
                  By removing bureaucratic barriers, we allow universities, employers, and scholars to connect instantly—creating a global community anchored in undeniable truth.
                </p>

                <div className="flex gap-4 pt-4">
                  <div className="flex -space-x-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`w-12 h-12 rounded-full border-2 border-[#020408] bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-lg z-[${4 - i}]`}>
                        <Users size={20} className="text-white/70" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col justify-center pl-4 border-l border-white/10">
                    <span className="text-white font-bold">10,000+ Institutions</span>
                    <span className="text-xs text-slate-500 uppercase tracking-widest">Joined the network</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="flex-1 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 blur-[100px] rounded-full" />
                <div className="relative bg-[#0A0D14]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                    <span className="text-sm font-bold text-white">Network Topology</span>
                    <Globe2 className="text-indigo-400" size={24} />
                  </div>
                  <div className="space-y-4">
                    {['Node Alpha (Tokyo)', 'Node Beta (London)', 'Node Gamma (New York)'].map((node, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-sm font-medium text-slate-300">{node}</span>
                        </div>
                        <span className="text-xs font-mono text-emerald-400">SYNCED</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────
            🧪 MASSIVE INTERACTIVE DEMO CONSOLE (Terminal Expansion)
        ────────────────────────────────────────────────────────────────── */}
        <section id="terminal" className="py-32 relative z-20">
          <div className="container max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[2.5rem] bg-[#05070E] border border-white/10 shadow-2xl overflow-hidden"
            >
              {/* Terminal Header */}
              <div className="bg-[#0A0D14] border-b border-white/5 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Terminal size={24} className="text-slate-400" />
                  <h2 className="text-xl font-bold text-white tracking-wide">Public Ledger Terminal</h2>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-700" />
                  <div className="w-3 h-3 rounded-full bg-slate-700" />
                  <div className="w-3 h-3 rounded-full bg-slate-700" />
                </div>
              </div>

              <div className="p-8 md:p-16">
                <div className="text-center mb-12">
                  <h3 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tighter">Query The Network</h3>
                  <p className="text-slate-400">Enter a known verifiable credential ID to simulate node consensus.</p>
                  <p className="text-xs text-indigo-400 mt-2 font-mono">Hint: Try 'EDU-STUDENT-99X'</p>
                </div>

                <div className="max-w-3xl mx-auto">
                  <form onSubmit={handleDemoVerify} className="relative z-10 mb-8">
                    <div className={`relative group rounded-2xl transition-all duration-500 ${isProcessing ? 'ring-2 ring-indigo-500/50 ring-offset-4 ring-offset-[#05070E]' : ''}`}>
                      <Search className={`absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors ${searchId ? 'text-indigo-400' : 'text-slate-600'}`} />
                      <input
                        type="text"
                        placeholder="ENTER CREDENTIAL ID..."
                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-6 pl-16 pr-48 text-white text-lg md:text-xl font-bold tracking-[0.1em] outline-none focus:border-indigo-500 focus:bg-black/80 transition-all placeholder:text-slate-700 uppercase font-mono"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                        disabled={verifyState !== 'idle' && verifyState !== 'error'}
                        aria-label="Credential Search Input"
                      />
                      <button
                        type="submit"
                        disabled={verifyState !== 'idle' && verifyState !== 'error' || !searchId}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white h-[calc(100%-1.5rem)] px-8 rounded-xl font-black text-sm tracking-widest uppercase transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center min-w-[140px]"
                      >
                        {verifyState === 'idle' || verifyState === 'error' ? 'Execute' :
                          verifyState === 'connecting' ? <Loader2 className="animate-spin" size={20} /> :
                            <span className="animate-pulse">Hashing...</span>}
                      </button>
                    </div>
                  </form>

                  {/* Simulated Terminal Output Logs */}
                  <AnimatePresence>
                    {terminalLogs.length > 0 && verifyState !== 'verified' && verifyState !== 'error' && (
                      <motion.div
                        ref={terminalRef}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-black/60 border border-white/5 rounded-xl p-6 font-mono text-sm text-indigo-300 space-y-2 mb-8 overflow-y-auto max-h-[300px] terminal-scrollbar"
                        role="status"
                        aria-live="polite"
                      >
                        {terminalLogs.map((log, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {log}
                          </motion.div>
                        ))}
                        <motion.div
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="w-2 h-4 bg-indigo-400 inline-block mt-2"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* MASSIVE RESULT CARD */}
                  <AnimatePresence mode="wait">
                    {verifyState === 'verified' && demoResult && (
                      <motion.div
                        variants={scaleInVariant} initial="hidden" animate="visible" exit="hidden"
                        className="p-1 relative rounded-[2rem] bg-gradient-to-b from-emerald-500/30 to-transparent"
                      >
                        <div className="bg-[#0A0D14] rounded-[1.9rem] p-8 md:p-12 border border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.1)] overflow-hidden relative">
                          <ShieldCheck className="absolute -right-16 -bottom-16 w-80 h-80 text-emerald-500/5 rotate-12 pointer-events-none" />

                          <div className="relative z-10">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 border-b border-white/10 pb-8 gap-6">
                              <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 size={32} />
                                </div>
                                <div>
                                  <h4 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Verified Authentic</h4>
                                  <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em]">Cryptographic Consensus Reached</p>
                                </div>
                              </div>
                              <button onClick={resetDemo} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors border border-white/10 px-5 py-2.5 rounded-xl hover:bg-white/5">
                                Reset Terminal
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                              <div className="space-y-2">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Subject Identity</span>
                                <span className="text-white font-extrabold text-lg block">{demoResult.name}</span>
                              </div>
                              <div className="space-y-2 lg:col-span-2">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Credential Payload</span>
                                <span className="text-indigo-300 font-extrabold text-lg block">{demoResult.degree}</span>
                              </div>
                              <div className="space-y-2">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Issuing Node</span>
                                <span className="text-white font-bold text-base block">{demoResult.issuer}</span>
                              </div>
                              <div className="space-y-2 lg:col-span-4 bg-black/40 p-5 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Ledger Hash Record</span>
                                  <span className="text-[10px] font-mono text-slate-500">{demoResult.timestamp}</span>
                                </div>
                                <span className="text-emerald-400 font-mono text-sm md:text-base block break-all">{demoResult.hash}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {verifyState === 'error' && (
                      <motion.div
                        variants={scaleInVariant} initial="hidden" animate="visible" exit="hidden"
                        className="p-8 md:p-12 rounded-[2rem] bg-rose-500/5 border border-rose-500/20 flex flex-col items-center text-center"
                      >
                        <AlertCircle size={40} className="text-rose-500 mb-6" />
                        <h4 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Verification Failed</h4>
                        <p className="text-sm text-rose-400 font-bold tracking-widest uppercase mb-8">Record Not Found On Public Ledger</p>
                        <button onClick={resetDemo} className="text-xs font-bold uppercase tracking-widest text-white bg-white/5 border border-white/10 px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
                          Acknowledge & Retry
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────
            ❓ FAQ SECTION (Interactive Accordions)
        ────────────────────────────────────────────────────────────────── */}
        <section className="py-24 relative z-20 border-t border-white/5">
          <div className="container max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-white mb-4">Protocol Specifications</h2>
              <p className="text-slate-400">Frequently asked questions regarding network mechanics.</p>
            </div>

            <div className="space-y-4">
              {FAQ_DATA.map((faq, index) => (
                <FAQItem key={index} faq={faq} index={index} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ──────────────────────────────────────────────────────────────────
          🏁 EXPANDED FOOTER (INDUSTRY GRADE)
      ────────────────────────────────────────────────────────────────── */}
      <footer className="py-20 border-t border-white/10 bg-[#010204] relative z-20">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                  <ShieldCheck className="text-white" size={20} />
                </div>
                <span className="text-2xl font-extrabold text-white tracking-tight">Edu<span className="text-indigo-400">Cred</span></span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed mb-8">
                Establishing the global cryptographic standard for decentralized academic truth. Building trust through mathematics.
              </p>
              <div className="flex gap-4">
                {/* Social placeholders */}
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                    <LinkIcon size={16} className="text-slate-400" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Protocol</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Architecture Whitepaper</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Node Operating Guidelines</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Consensus Mechanics</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Network Explorer</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Ecosystem</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Issuing Institutions</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Student Wallet (iOS/Android)</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Community Governance</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Developer API</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
            <p>© {new Date().getFullYear()} EduCred Foundation. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}