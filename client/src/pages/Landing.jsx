import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  ShieldCheck, Search, Zap, ArrowRight, CheckCircle2,
  Loader2, AlertCircle, Fingerprint, Network, Database,
  Activity, Lock, Globe2, Users, ChevronDown, Terminal,
  Server, Link as LinkIcon, Hexagon, Cpu, Eye, Code, ArrowUpRight
} from 'lucide-react';

// IMPORT: The 3D component we built earlier. Ensure this path is correct.
import QuantumGlobe from '../components/QuantumGlobe';
import BlockchainBackground from '../components/BlockchainBackground';

// ──────────────────────────────────────────────────────────────────────────
// 💠 ORCHESTRATED ANIMATION PHYSICS & VARIANTS
// ──────────────────────────────────────────────────────────────────────────
const springConfig = { type: "spring", stiffness: 100, damping: 20, mass: 1 };
const snapSpring = { type: "spring", stiffness: 300, damping: 30 };

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: snapSpring }
};

const scaleInVariant = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(5px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: snapSpring }
};

const floatAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
  }
};

// ──────────────────────────────────────────────────────────────────────────
// 📚 DATA STORES
// ──────────────────────────────────────────────────────────────────────────
const FAQ_DATA = [
  {
    question: "How does the zero-knowledge verification work?",
    answer: "Our protocol allows third parties to mathematically verify the authenticity and validity of a credential without the issuing institution needing to expose the underlying private data of the student. We use zk-SNARKs (Zero-Knowledge Succinct Non-Interactive Argument of Knowledge) to prove possession of a valid ledger entry."
  },
  {
    question: "What happens if an issuing institution goes offline?",
    answer: "Because EduCred operates on a decentralized peer-to-peer mesh network, the cryptographic hash of the credential lives on the distributed ledger. As long as the network exists, the credential remains verifiable, independently of the original issuer's server status."
  },
  {
    question: "Is the network resistant to quantum computing threats?",
    answer: "We are currently implementing post-quantum cryptographic signatures (such as lattice-based cryptography) into our Layer 2 state channels to ensure long-term immutability against future computational advancements."
  },
  {
    question: "How is data privacy maintained under GDPR/CCPA?",
    answer: "We never store PII (Personally Identifiable Information) on the public ledger. The blockchain only stores a one-way cryptographic hash of the credential. The actual data remains with the student and the issuing university."
  }
];

// ──────────────────────────────────────────────────────────────────────────
// 🧱 ADVANCED SUB-COMPONENTS
// ──────────────────────────────────────────────────────────────────────────

// 1. Interactive FAQ Accordion
const FAQItem = ({ faq, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1, ...springConfig }}
      className="border border-white/[0.04] bg-[#0A0A0A]/50 backdrop-blur-xl hover:bg-[#111111] rounded-[1.5rem] overflow-hidden transition-all duration-500 group"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none"
      >
        <span className="text-lg font-bold text-slate-200 tracking-tight group-hover:text-blue-400 transition-colors">{faq.question}</span>
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ${isOpen ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 rotate-180 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-[#161616] text-slate-500 border-white/[0.04]'}`}>
          <ChevronDown size={18} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div className="px-6 md:px-8 pb-8 pt-0 text-slate-400 leading-relaxed text-sm md:text-base border-t border-white/[0.04] mt-2">
              <div className="pt-6">{faq.answer}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 2. Floating Glass Mockup Card (For Hero Section)
const FloatingMockup = ({ delay, rotate, x, y, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: rotate - 10 }}
      animate={{ opacity: 1, scale: 1, rotate: rotate }}
      transition={{ duration: 1.5, delay, ...springConfig }}
      className="absolute hidden lg:block z-0 pointer-events-none"
      style={{ top: y, left: x }}
    >
      <motion.div variants={floatAnimation} initial="initial" animate="animate" className="bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/[0.06] p-4 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] w-72">
        {children}
      </motion.div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 🚀 MAIN APPLICATION COMPONENT
// ──────────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();

  // Parallax constraints for Hero & Mockups
  const smoothY = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const heroY = useTransform(smoothY, [0, 1], ['0%', '40%']);
  const heroOpacity = useTransform(smoothY, [0, 0.4], [1, 0]);
  const floatingCardsY1 = useTransform(smoothY, [0, 1], ['0%', '-60%']);
  const floatingCardsY2 = useTransform(smoothY, [0, 1], ['0%', '-100%']);

  // Terminal State
  const [searchId, setSearchId] = useState('');
  const [verifyState, setVerifyState] = useState('idle'); // idle, connecting, hashing, verified, error
  const [verificationResult, setVerificationResult] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const terminalRef = useRef(null);

  // Dynamic System Stats State
  const [networkStats, setNetworkStats] = useState({
    activeNodes: "2,408",
    credentialsSecured: "1.2M",
    avgBlockTime: "12ms",
    networkUptime: "99.99%"
  });

  const [networkMap, setNetworkMap] = useState([]);
  const [tickerItems, setTickerItems] = useState(["AUTHENTICATING PROTOCOL V2.4...", "PEER_DISCOVERY: ACTIVE", "LEDGER_SYNC: OPTIMAL", "ZERO_KNOWLEDGE_PROOFS: ONLINE"]);

  const dynamicStats = [
    { label: "Active Institutional Nodes", value: networkStats.activeNodes, icon: Server, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Cryptographic Proofs Secured", value: networkStats.credentialsSecured, icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Consensus Avg Time", value: networkStats.avgBlockTime, icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Network Vitality", value: networkStats.networkUptime, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" }
  ];

  const isProcessing = verifyState === 'connecting' || verifyState === 'hashing';

  // Effects & Lifecycle
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [terminalLogs]);

  useEffect(() => {
    let isMounted = true;
    const fetchSystemMetrics = async () => {
      try {
        const statsRes = await fetch('http://localhost:5001/api/system/stats');
        const statsData = await statsRes.json();
        
        const mapRes = await fetch('http://localhost:5001/api/system/map');
        const mapData = await mapRes.json();
        
        if (isMounted) {
          if (statsData.success) setNetworkStats(statsData.data);
          if (mapData.success) setNetworkMap(mapData.network);
        }
      } catch (error) {
        if (isMounted) {
          console.warn("Using offline fallback data for visuals.");
          setNetworkMap([
            { name: "MIT Node", location: "US-EAST", status: "SYNCED" },
            { name: "IIT Bombay Node", location: "AP-SOUTH", status: "SYNCED" },
            { name: "Oxford Node", location: "EU-WEST", status: "SYNCED" }
          ]);
        }
      }
    };
    
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleNetworkQuery = useCallback((e) => {
    e.preventDefault();
    if (!searchId || verifyState !== 'idle') return;

    setVerifyState('connecting');
    setVerificationResult(null);
    setTerminalLogs([`> INITIATING SECURE HANDSHAKE FOR ID: ${searchId}...`]);

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
      setTerminalLogs(prev => [...prev, "> QUERYING SMART CONTRACT: 0x5FbDB231567..."]);
    }, 3000);

    setTimeout(() => {
      if (searchId === 'EDU-STUDENT-99X') {
        setVerifyState('verified');
        setVerificationResult({
          metadata: {
            studentName: "Ankit Aman",
            course: "B.Tech Computer Science",
            issuer: "SRM Institute of Science and Technology"
          },
          timestamp: new Date().toISOString(),
          hash: "0x8f3c...9a4b2e1f8c3d7a6b5e4f3c2d1a0b9e8f7c6d5e4f3c2d1a0b",
          ledgerProof: { transactionHash: "0xabc123...def456" }
        });
        setTerminalLogs(prev => [...prev, "> CONSENSUS REACHED. PAYLOAD SECURED."]);
      } else {
        setVerifyState('error');
        setTerminalLogs(prev => [...prev, "> FATAL: RECORD NOT FOUND ON LEDGER."]);
      }
    }, 4000);
  }, [searchId, verifyState]);

  const resetTerminal = () => {
    setVerifyState('idle');
    setSearchId('');
    setTerminalLogs([]);
    setVerificationResult(null);
  }; return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden">

      {/* 🌌 DEEP AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none" aria-hidden="true">
        <BlockchainBackground isSurging={isProcessing} />
      </div>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_80%)] pointer-events-none" />

      {/* ──────────────────────────────────────────────────────────────────
          📱 NAVIGATION (FAANG-grade Glassmorphism)
      ────────────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#050505]/40 backdrop-blur-3xl transition-all duration-300">
        <div className="container max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* LEFT: LOGO */}
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-[#111111] border border-white/[0.06] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:border-blue-500/30 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-500">
              <Hexagon className="text-blue-500" size={20} />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Edu<span className="text-blue-500">Cred</span>
            </span>
          </div>

          {/* CENTER: NAV LINKS */}
          <nav className="hidden md:flex items-center gap-10 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#ecosystem" className="hover:text-white transition-colors">Ecosystem</a>
            <a href="#terminal" className="hover:text-white transition-colors">Ledger Terminal</a>
          </nav>

          {/* RIGHT: ACTIONS */}
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/login')} className="hidden sm:block text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              Log In
            </button>
            <button onClick={() => navigate('/issue')} className="bg-white text-black hover:bg-slate-200 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95">
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ──────────────────────────────────────────────────────────────────
            🚀 HERO SECTION: Immersive Parallax & Massive Typography
        ────────────────────────────────────────────────────────────────── */}
        <section className="relative min-h-[110vh] flex flex-col items-center justify-center pt-32 px-6 z-10" aria-label="Introduction">

          {/* FLOATING UI MOCKUPS (FAANG Aesthetic) */}
          <FloatingMockup delay={0.2} rotate={-5} x="10%" y={floatingCardsY1}>
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><ShieldCheck size={14} className="text-blue-400" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Consensus Check</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-2 w-full bg-[#111111] rounded-full overflow-hidden"><div className="h-full w-[85%] bg-blue-500" /></div>
              <div className="h-2 w-[70%] bg-[#111111] rounded-full" />
              <div className="h-2 w-[40%] bg-[#111111] rounded-full" />
            </div>
          </FloatingMockup>

          <FloatingMockup delay={0.5} rotate={8} x="75%" y={floatingCardsY2}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-500" /></div>
              <div>
                <div className="text-xs font-bold text-white mb-1">Anchored to Ledger</div>
                <div className="text-[8px] font-mono text-slate-500">0x8f3c...9a4b2e</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Block Confirmed</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">12ms ago</span>
            </div>
          </FloatingMockup>

          {/* MAIN HERO CONTENT */}
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden="true">
            <div className="absolute w-[800px] h-[800px] bg-blue-600/15 blur-[150px] rounded-full mix-blend-screen" />
            <div className="absolute w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen translate-x-1/3 -translate-y-1/3" />
          </motion.div>

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="container max-w-6xl mx-auto flex flex-col items-center text-center relative z-20">

            <motion.div variants={fadeUpVariant} className="mb-10 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#111111] border border-white/[0.04] backdrop-blur-xl shadow-[0_0_30px_rgba(59,130,246,0.1)] cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">EduCred Protocol V2.4 Active</span>
            </motion.div>

            <motion.h1 variants={fadeUpVariant} className="text-6xl md:text-[7rem] lg:text-[8.5rem] font-extrabold text-white tracking-tighter leading-[0.9] mb-8 uppercase">
              Absolute <br className="hidden md:block" />
              <span className="relative inline-block mt-2">
                <span className="absolute -inset-4 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 blur-3xl opacity-40 animate-pulse"></span>
                <span className="relative bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent pb-4">
                  Integrity.
                </span>
              </span>
            </motion.h1>

            <motion.p variants={fadeUpVariant} className="max-w-3xl text-lg md:text-xl text-slate-400 leading-relaxed mb-14 font-medium tracking-wide">
              The global cryptographic standard for decentralized academic truth.
              We replace forgeable PDFs with mathematically undeniable, zero-knowledge verifiable credentials.
            </motion.p>

            <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
              <button onClick={() => document.getElementById('terminal').scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto group relative bg-white text-black px-12 py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]">
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Query Public Ledger
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button onClick={() => navigate('/signup')} className="w-full sm:w-auto group relative bg-[#0A0A0A] text-white border border-white/[0.08] px-12 py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:bg-[#111111] hover:border-white/[0.15] active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <Database size={18} className="text-blue-500 group-hover:text-blue-400 transition-colors" />
                Institutional Sign Up
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────
            ⚡ LIVE TICKER BAR & STATS ROW (Glassmorphic)
        ────────────────────────────────────────────────────────────────── */}
        <div className="relative z-20 bg-[#050505]/80 backdrop-blur-3xl border-y border-white/[0.04]">
          <div className="overflow-hidden py-4 border-b border-white/[0.02] bg-[#000000]">
            <div className="flex whitespace-nowrap animate-[marquee_40s_linear_infinite]" aria-hidden="true">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <div key={i} className="flex items-center gap-6 mx-8 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="container max-w-7xl mx-auto px-6 py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/[0.04]">
              {dynamicStats.map((stat, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className={`flex flex-col items-center text-center ${idx !== 0 ? 'pl-8' : ''}`}>
                  <div className={`p-4 rounded-2xl ${stat.bg} border border-white/[0.04] mb-6`}>
                    <stat.icon size={24} className={`${stat.color}`} />
                  </div>
                  <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-2">
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            🧱 ARCHITECTURE OF TRUST (Cinematic Bento Grid)
        ────────────────────────────────────────────────────────────────── */}
        <section id="architecture" className="py-40 relative z-20">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="text-center mb-24 max-w-4xl mx-auto">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">
                System Architecture
              </motion.div>
              <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tighter uppercase">Engineered for Truth.</h2>
              <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
                A robust convergence of peer-to-peer networking, advanced cryptography, and resilient node discovery protocols built for global institutional scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[380px]">

              {/* CARD 1: Mesh Network (Span 8) */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant} className="md:col-span-8 relative group rounded-[2.5rem] bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/[0.04] p-12 overflow-hidden hover:border-blue-500/30 transition-all duration-700">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 group-hover:bg-blue-500/15 transition-colors duration-700 pointer-events-none" />
                <Network size={48} className="text-blue-500 mb-10 relative z-10" />
                <h3 className="text-4xl font-extrabold text-white mb-6 tracking-tight relative z-10">Decentralized Mesh Topology</h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-2xl relative z-10">
                  By utilizing rapid gossip protocols and dynamic BGP routing, credential state is propagated across hundreds of global institutional nodes in milliseconds. No single point of failure. Absolute resilience.
                </p>
              </motion.div>

              {/* CARD 2: Zero-Knowledge (Span 4) */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant} transition={{ delay: 0.1 }} className="md:col-span-4 relative group rounded-[2.5rem] bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/[0.04] p-12 overflow-hidden hover:border-emerald-500/30 transition-all duration-700">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 group-hover:bg-emerald-500/15 transition-colors duration-700 pointer-events-none" />
                <Lock size={40} className="text-emerald-400 mb-10 relative z-10" />
                <h3 className="text-3xl font-extrabold text-white mb-4 tracking-tight relative z-10">Zero-Knowledge</h3>
                <p className="text-slate-400 leading-relaxed text-base relative z-10">
                  Verify the validity of a degree without exposing underlying personal identifying information to the public ledger.
                </p>
              </motion.div>

              {/* CARD 3: Cryptography (Span 4) */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant} transition={{ delay: 0.2 }} className="md:col-span-4 relative group rounded-[2.5rem] bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/[0.04] p-12 overflow-hidden hover:border-violet-500/30 transition-all duration-700">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 group-hover:bg-violet-500/15 transition-colors duration-700 pointer-events-none" />
                <Fingerprint size={40} className="text-violet-400 mb-10 relative z-10" />
                <h3 className="text-3xl font-extrabold text-white mb-4 tracking-tight relative z-10">SHA-256 Hashing</h3>
                <p className="text-slate-400 leading-relaxed text-base relative z-10">
                  Every certificate generates a unique cryptographic fingerprint anchored permanently to the distributed ledger.
                </p>
              </motion.div>

              {/* CARD 4: Immutability (Span 8) */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariant} transition={{ delay: 0.3 }} className="md:col-span-8 relative group rounded-[2.5rem] bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/[0.04] p-12 overflow-hidden hover:border-amber-500/30 transition-all duration-700 flex flex-col justify-end">
                <div className="absolute top-10 right-10 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 pointer-events-none">
                  <Database size={240} className="text-amber-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-4xl font-extrabold text-white mb-6 tracking-tight">Immutable Storage</h3>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                    Once a credential block is mined and consensus is reached, it becomes a permanent part of the historical record. Data cannot be deleted, tampered with, or revoked without explicit cryptographic authorization from the origin node.
                  </p>
                </div>
              </motion.div>

            </div>
          </div>
        </section>{/* ──────────────────────────────────────────────────────────────────
            🌐 THE GLOBAL ECOSYSTEM & 3D NODE MAP
        ────────────────────────────────────────────────────────────────── */}
        <section id="ecosystem" className="py-40 relative z-20 border-t border-white/[0.02] bg-[#000000]">
          {/* Deep ambient background for the 3D section */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />

          <div className="container max-w-[90rem] mx-auto px-6">
            <div className="flex flex-col xl:flex-row gap-16 items-center">

              {/* Text & Stats Column */}
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={springConfig} className="flex-1 space-y-10 xl:max-w-xl relative z-10">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#111111] border border-white/[0.06] text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                  <Globe2 size={14} className="text-blue-500" /> Global Ecosystem
                </div>

                <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter leading-[1.1] uppercase">
                  Beyond Data.<br />
                  <span className="text-blue-500">Building Deep Trust.</span>
                </h2>

                <div className="space-y-6 text-slate-400 text-lg leading-relaxed font-medium">
                  <p>
                    When the authenticity of a person's background is mathematically guaranteed, the friction of mistrust vanishes. EduCred is not just a database; it is a foundation for fostering deeper, more authentic human connections across borders.
                  </p>
                  <p>
                    By removing bureaucratic barriers and eliminating fraud, we allow universities, employers, and scholars to connect instantly—creating a global community anchored in undeniable truth.
                  </p>
                </div>

                <div className="flex items-center gap-8 pt-10 border-t border-white/[0.06]">
                  <div className="flex -space-x-4">
                    {networkMap.length > 0 ? (
                      networkMap.slice(0, 4).map((node, i) => (
                        <div key={i} title={node.name} className={`w-16 h-16 rounded-full border-[3px] border-[#000000] bg-gradient-to-br from-[#111111] to-[#1a1a1a] flex items-center justify-center shadow-2xl relative z-[${10 - i}] group/avatar hover:-translate-y-2 transition-transform duration-300`}>
                          <Server size={20} className="text-blue-400" />
                          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-[#111111] border border-white/[0.06] px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity z-50 shadow-xl">
                            {node.name}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="w-16 h-16 rounded-full border-[3px] border-[#000000] bg-[#111111] flex items-center justify-center">
                        <Loader2 size={20} className="text-slate-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-white font-extrabold text-3xl tracking-tight">{networkStats.activeNodes}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">Live Nodes Connected</span>
                  </div>
                </div>
              </motion.div>

              {/* 3D GLOBE & TELEMETRY UI */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={springConfig} className="flex-[1.5] w-full relative">

                {/* The massive glass container for the Globe */}
                <div className="relative h-[600px] md:h-[800px] w-full bg-[#050505]/80 backdrop-blur-3xl border border-white/[0.06] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden group">

                  {/* ✨ THE 3D QUANTUM GLOBE ENGINE ✨ */}
                  <div className="absolute inset-0 z-0">
                    <QuantumGlobe />
                  </div>

                  {/* Telemetry Overlays (These sit on top of the 3D canvas) */}
                  <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10 pointer-events-none">
                    <div className="bg-[#000000]/60 backdrop-blur-xl border border-white/[0.06] p-4 rounded-2xl flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Telemetry Target</span>
                      <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Earth Orbit Sync
                      </span>
                    </div>
                    <div className="bg-[#000000]/60 backdrop-blur-xl border border-white/[0.06] p-4 rounded-2xl text-right">
                      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.3em] block mb-1">Live Node Feed</span>
                      <div className="space-y-2 mt-2">
                        {networkMap.slice(0, 3).map((node, idx) => (
                          <div key={idx} className="flex items-center justify-end gap-3 text-[10px] font-mono text-slate-300">
                            <span className="opacity-50">{node.location || 'GLOBAL'}</span>
                            <span>{node.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Crosshairs & Scanning Elements */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/10 rounded-full flex items-center justify-center">
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                    </div>
                    <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-[scan_6s_ease-in-out_infinite]" />
                  </div>

                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────
            🧪 THE PUBLIC LEDGER TERMINAL (Massive Interactive Verification)
        ────────────────────────────────────────────────────────────────── */}
        <section id="terminal" className="py-40 relative z-20 bg-[#020202]">
          <div className="container max-w-[80rem] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[3rem] bg-[#0A0A0A]/90 backdrop-blur-3xl border border-white/[0.06] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden"
            >

              {/* Terminal Header Bar */}
              <div className="bg-[#050505] border-b border-white/[0.06] px-8 py-5 flex items-center justify-between relative z-20">
                <div className="flex items-center gap-4">
                  <Terminal size={18} className="text-slate-500" />
                  <h2 className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">EduCred Command Interface v2.4</h2>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-rose-500/80 transition-colors cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-amber-500/80 transition-colors cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-emerald-500/80 transition-colors cursor-pointer" />
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-8 md:p-20 relative z-10">

                {/* Search Header */}
                <div className="text-center mb-16">
                  <h3 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tighter uppercase">Query The Ledger</h3>
                  <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">Input a verifiable credential ID to simulate decentralized node consensus and cryptographic verification.</p>
                  <p className="text-[11px] text-blue-400 mt-6 font-mono font-bold bg-blue-500/10 border border-blue-500/20 inline-block px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    [ TEST PAYLOAD: 'EDU-STUDENT-99X' ]
                  </p>
                </div>

                <div className="max-w-4xl mx-auto">

                  {/* The Massive Input Form */}
                  <form onSubmit={handleNetworkQuery} className="relative z-10 mb-12">
                    <div className={`relative group rounded-[2rem] transition-all duration-500 bg-[#050505] border border-white/[0.06] ${isProcessing ? 'shadow-[0_0_50px_rgba(59,130,246,0.15)] border-blue-500/50' : 'hover:border-white/[0.15] hover:shadow-2xl'}`}>
                      <Search className={`absolute left-8 top-1/2 -translate-y-1/2 w-7 h-7 transition-colors ${searchId ? 'text-blue-500' : 'text-slate-600'}`} />
                      <input
                        type="text"
                        placeholder="ENTER CREDENTIAL HASH OR ID..."
                        className="w-full bg-transparent py-8 pl-20 pr-56 text-white text-xl md:text-2xl font-bold tracking-[0.15em] outline-none transition-all placeholder:text-slate-700 uppercase font-mono"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                        disabled={verifyState !== 'idle' && verifyState !== 'error'}
                        aria-label="Credential Search Input"
                      />
                      <button
                        type="submit"
                        disabled={verifyState !== 'idle' && verifyState !== 'error' || !searchId}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black hover:bg-slate-200 h-[calc(100%-2rem)] px-10 rounded-[1.5rem] font-extrabold text-[11px] tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center min-w-[160px] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95"
                      >
                        {verifyState === 'idle' || verifyState === 'error' ? 'Execute Query' :
                          verifyState === 'connecting' ? <Loader2 className="animate-spin" size={24} /> :
                            <span className="flex items-center gap-2"><Cpu size={16} className="animate-pulse" /> Hashing...</span>}
                      </button>
                    </div>
                  </form>

                  {/* High-Fidelity Terminal Logs Overlay */}
                  <AnimatePresence>
                    {terminalLogs.length > 0 && verifyState !== 'verified' && verifyState !== 'error' && (
                      <motion.div
                        ref={terminalRef}
                        initial={{ opacity: 0, height: 0, y: 20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }}
                        className="bg-[#050505] border border-white/[0.06] rounded-3xl p-8 md:p-10 font-mono text-sm md:text-base text-blue-400 space-y-4 mb-10 overflow-y-auto max-h-[400px] shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]"
                      >
                        {terminalLogs.map((log, index) => (
                          <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="flex gap-4">
                            <span className="opacity-40 select-none">[{new Date().toISOString().split('T')[1].slice(0, -1)}]</span>
                            <span>{log}</span>
                          </motion.div>
                        ))}
                        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2.5 h-6 bg-blue-500 inline-block mt-2 align-middle shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* MASSIVE SUCCESS RESULT CARD */}
                  <AnimatePresence mode="wait">
                    {verifyState === 'verified' && verificationResult && (
                      <motion.div variants={scaleInVariant} initial="hidden" animate="visible" exit="hidden" className="relative mt-8">
                        {/* Glowing backdrop */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 rounded-[3rem] blur-xl opacity-20 animate-pulse pointer-events-none" />

                        <div className="bg-[#050505] rounded-[2.5rem] p-10 md:p-16 border border-emerald-500/30 shadow-2xl relative overflow-hidden z-10">
                          {/* Giant background watermark */}
                          <ShieldCheck className="absolute -right-20 -bottom-20 w-[400px] h-[400px] text-emerald-500/[0.02] rotate-12 pointer-events-none" />

                          <div className="relative z-20">
                            {/* Card Header */}
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 pb-10 border-b border-white/[0.06] gap-8">
                              <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                                  <CheckCircle2 size={40} />
                                </div>
                                <div>
                                  <h4 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tighter uppercase">Authentic Record</h4>
                                  <div className="flex items-center gap-3">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-[0.3em]">Cryptographic Consensus Confirmed</p>
                                  </div>
                                </div>
                              </div>
                              <button onClick={resetTerminal} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-[#111111] border border-white/[0.08] px-8 py-4 rounded-xl hover:bg-white/10 hover:border-white/[0.2] transition-all duration-300">
                                Terminate Session
                              </button>
                            </div>

                            {/* Data Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                              <div className="space-y-3">
                                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500 flex items-center gap-2"><User size={12} /> Subject Identity</span>
                                <span className="text-white font-extrabold text-2xl block tracking-tight">{verificationResult.metadata.studentName}</span>
                              </div>
                              <div className="space-y-3 lg:col-span-2">
                                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500 flex items-center gap-2"><FileText size={12} /> Credential Payload</span>
                                <span className="text-blue-400 font-extrabold text-2xl block tracking-tight uppercase">{verificationResult.metadata.course}</span>
                              </div>
                              <div className="space-y-3">
                                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500 flex items-center gap-2"><Database size={12} /> Issuing Node</span>
                                <span className="text-white font-bold text-lg block leading-tight">{verificationResult.metadata.issuer}</span>
                              </div>

                              {/* Cryptographic Proof Section (Full Width) */}
                              <div className="lg:col-span-4 mt-4 bg-[#0A0A0A] p-8 md:p-10 rounded-3xl border border-white/[0.04] shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-1000" />

                                <div className="flex items-center gap-3 text-emerald-500 mb-8 pb-4 border-b border-white/[0.04]">
                                  <Lock size={18} />
                                  <span className="text-[10px] font-extrabold uppercase tracking-[0.3em]">Immutable Blockchain Proof</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                  <div className="space-y-3">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600">Protocol Hash (SHA-256)</span>
                                    <div className="bg-[#050505] border border-white/[0.04] p-4 rounded-xl">
                                      <span className="text-emerald-400 font-mono text-[11px] md:text-xs block break-all leading-relaxed">
                                        {verificationResult.hash}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600">Network Transaction Ledger</span>
                                    <div className="bg-[#050505] border border-white/[0.04] p-4 rounded-xl flex items-center justify-between">
                                      <span className="text-blue-400 font-mono text-[11px] md:text-xs block break-all">
                                        {verificationResult.ledgerProof.transactionHash}
                                      </span>
                                      <ArrowUpRight size={16} className="text-slate-500 flex-shrink-0 cursor-pointer hover:text-white transition-colors" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* MASSIVE ERROR CARD */}
                    {verifyState === 'error' && (
                      <motion.div variants={scaleInVariant} initial="hidden" animate="visible" exit="hidden" className="mt-8 p-12 md:p-20 rounded-[3rem] bg-rose-500/[0.02] border border-rose-500/20 shadow-[0_0_80px_rgba(244,63,94,0.05)] flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(244,63,94,0.02)_10px,rgba(244,63,94,0.02)_20px)] pointer-events-none" />
                        <ShieldAlert size={64} className="text-rose-500 mb-8 drop-shadow-[0_0_30px_rgba(244,63,94,0.4)] relative z-10" />
                        <h4 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tighter uppercase relative z-10">Query Failed.</h4>
                        <p className="text-xs md:text-sm text-rose-400 font-bold tracking-[0.3em] uppercase mb-12 relative z-10">Record Not Found On Global Ledger</p>
                        <button onClick={resetTerminal} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-[#111111] border border-white/[0.1] px-10 py-5 rounded-xl hover:bg-white/10 hover:border-white/[0.2] transition-all duration-300 relative z-10">
                          Acknowledge & Re-Initialize
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
            ❓ FAQ SECTION (Interactive & Polished)
        ────────────────────────────────────────────────────────────────── */}
        <section className="py-40 relative z-20 border-t border-white/[0.04] bg-[#000000]">
          <div className="container max-w-4xl mx-auto px-6">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">
                Documentation
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tighter uppercase">Protocol Specifications</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">Technical mechanics and frequently asked questions regarding the decentralized network architecture.</p>
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
          🏁 FAANG-GRADE MASSIVE FOOTER (Clean, Precise, Dense)
      ────────────────────────────────────────────────────────────────── */}
      <footer className="pt-32 pb-12 border-t border-white/[0.04] bg-[#020202] relative z-20 overflow-hidden">
        {/* Ambient footer glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-blue-600/5 blur-[150px] rounded-[100%] pointer-events-none" />

        <div className="container max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-8 mb-24">

            {/* Column 1: Brand & Mission (Span 4) */}
            <div className="lg:col-span-4 pr-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[#111111] border border-white/[0.08] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Hexagon className="text-blue-500" size={24} />
                </div>
                <span className="text-3xl font-extrabold text-white tracking-tight">Edu<span className="text-blue-500">Cred</span></span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                Establishing the global cryptographic standard for decentralized academic truth. We replace trust in institutions with trust in immutable mathematics.
              </p>

              <div className="space-y-4">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em]">Network Status</span>
                <div className="flex items-center gap-3 bg-[#0A0A0A] border border-white/[0.04] w-fit px-4 py-2.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">All Systems Operational</span>
                </div>
              </div>
            </div>

            {/* Column 2: Protocol (Span 2) */}
            <div className="lg:col-span-2 lg:col-start-6">
              <h4 className="text-white text-[11px] font-bold mb-8 tracking-[0.2em] uppercase">Protocol</h4>
              <ul className="space-y-5 text-sm font-medium text-slate-500">
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Architecture Whitepaper</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Node Operating Guide</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Consensus Mechanics</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Smart Contracts</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Bug Bounty</a></li>
              </ul>
            </div>

            {/* Column 3: Ecosystem (Span 2) */}
            <div className="lg:col-span-2">
              <h4 className="text-white text-[11px] font-bold mb-8 tracking-[0.2em] uppercase">Ecosystem</h4>
              <ul className="space-y-5 text-sm font-medium text-slate-500">
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Issuing Institutions</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Student Identity Wallet</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Governance DAO</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Developer API</a></li>
                <li><a href="#" className="hover:text-blue-400 hover:translate-x-1 inline-block transition-all">Brand Assets</a></li>
              </ul>
            </div>

            {/* Column 4: Newsletter/Updates (Span 3) */}
            <div className="lg:col-span-3">
              <h4 className="text-white text-[11px] font-bold mb-8 tracking-[0.2em] uppercase">Developer Updates</h4>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">Receive architectural updates and mainnet deployment notices directly to your inbox.</p>
              <form className="relative group">
                <input
                  type="email"
                  placeholder="IDENTITY@DOMAIN.COM"
                  className="w-full bg-[#0A0A0A] border border-white/[0.06] rounded-xl py-4 pl-5 pr-14 text-white text-[10px] font-bold tracking-[0.1em] outline-none focus:border-blue-500 transition-colors uppercase placeholder:text-slate-700"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] text-slate-500 font-bold tracking-[0.15em] uppercase">
            <p>© {new Date().getFullYear()} EduCred Decentralized Foundation. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Security Audit</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}