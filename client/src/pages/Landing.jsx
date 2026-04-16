import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  Database,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import BlockchainBackground from '../components/BlockchainBackground';
import HyperCursor from '../components/HyperCursor';
import ProtocolBootSequence from '../components/ProtocolBootSequence';
import ProtocolSchematic from '../components/ProtocolSchematic';
import { useAuth } from '../context/AuthContext';
import {
  fetchNetworkNodes,
  fetchProtocolUpdates,
  fetchSystemStats,
} from '../services/api';

const transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] };

const fallbackStats = {
  activeNodes: '0',
  credentialsSecured: '0',
  avgBlockTime: 'not-available',
  networkUptime: '0.00h',
  blockchainMode: 'SIMULATION',
};

const features = [
  {
    icon: ShieldCheck,
    title: 'Tamper-proof verification',
    description: 'Every uploaded credential is hashed, anchored, and checked against the same verification logic.',
  },
  {
    icon: Clock3,
    title: 'Verify in seconds',
    description: 'Institutions and third parties can verify by file upload or certificate ID with clear results.',
  },
  {
    icon: Database,
    title: 'Chain + registry sync',
    description: 'Blockchain proof and application metadata stay aligned across the contract, API, and database.',
  },
];

const steps = [
  'Upload certificate',
  'Generate SHA-256 hash',
  'Anchor hash on blockchain',
  'Verify authenticity instantly',
];

function MetricCard({ label, value, accent }) {
  return (
    <div className="glass-pane p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group shadow-2xl">
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <p className="text-[9px] font-black uppercase tracking-[0.4em] font-mono text-cyan-400/60">{label}</p>
      <p className={`mt-4 text-4xl font-black tracking-tighter uppercase ${accent}`}>{value}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...transition, type: "spring", stiffness: 300, damping: 20 }}
      className="group relative rounded-[2.5rem] border border-white/8 bg-[#030303]/80 p-10 backdrop-blur-3xl glow-border-animated scanline-overlay overflow-hidden"
    >
      <div style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }} className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 transition-all duration-500 group-hover:bg-cyan-400 group-hover:text-black group-hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">
        <Icon size={28} />
      </div>
      <div style={{ transform: "translateZ(50px)" }}>
        <h3 className="mt-10 text-3xl font-bold tracking-tighter text-white">{title}</h3>
        <p className="mt-5 text-lg leading-relaxed text-slate-400 font-medium">{description}</p>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(fallbackStats);
  const [nodes, setNodes] = useState([]);
  const [ticker, setTicker] = useState([]);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [statsRes, nodesRes, tickerRes] = await Promise.all([
          fetchSystemStats(),
          fetchNetworkNodes(),
          fetchProtocolUpdates(),
        ]);

        if (!mounted) return;

        setStats(statsRes.data?.data || fallbackStats);
        setNodes(nodesRes.data?.network || []);
        setTicker(tickerRes.data?.ticker || []);
      } catch {
        if (!mounted) return;
        setStats(fallbackStats);
        setNodes([]);
        setTicker(['LOCAL MODE ACTIVE', 'READY FOR BLOCKCHAIN DEPLOYMENT']);
      }
    };

    load();
    const intervalId = window.setInterval(load, 30000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const headlineTicker = useMemo(
    () => (ticker.length ? ticker.slice(0, 4) : ['BLOCKCHAIN MODE: SIMULATION']),
    [ticker]
  );

  const heroScroll = useScroll();
  const heroY = useTransform(heroScroll.scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(heroScroll.scrollY, [0, 300], [1, 0]);

  const splitHeadline = "Tamper-proof academic credentials with a cleaner verification experience.".split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: transition.ease } }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#000000] text-slate-100 selection:bg-cyan-400 selection:text-black font-sans">
      <ProtocolBootSequence onComplete={() => setIsBooting(false)} />
      <HyperCursor />
      
      <AnimatePresence>
        {!isBooting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div className="fixed inset-0 opacity-40 pointer-events-none">
              <BlockchainBackground />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#14345f_0%,#000000_42%,#000000_100%)]" />


      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-7xl px-6">
        <div className="flex items-center justify-between rounded-full border border-white/12 bg-black/40 px-8 py-5 backdrop-blur-2xl">
          <Link to="/" className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white leading-none">EduCred</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.4em] font-mono text-cyan-400/80">Public protocol</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" data-text="Features" className="text-sm text-slate-300 transition hover:text-white text-glitch">Features</a>
            <a href="#flow" data-text="Flow" className="text-sm text-slate-300 transition hover:text-white text-glitch">Flow</a>
            <Link to="/verify" data-text="Verify" className="text-sm text-slate-300 transition hover:text-white text-glitch">Verify</Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-command btn-outline !px-6 !py-3 flex items-center gap-3"
                >
                  <LayoutDashboard size={14} />
                  Terminal
                </button>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="btn-command btn-blue !px-6 !py-3 flex items-center gap-3"
                >
                  <LogOut size={14} />
                  Terminate
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400/60 hover:text-white transition-colors">
                  Authorize
                </Link>
                <Link
                  to="/signup"
                  className="btn-command btn-blue !px-8 !py-3.5 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                >
                  Initialize <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative px-6 pb-24 pt-32 min-h-[90vh] flex items-center">
          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="mx-auto grid max-w-7xl gap-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
              className="relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-cyan-200">
                <Sparkles size={14} />
                Verify in seconds
              </div>

              <motion.h1 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-8 max-w-4xl text-5xl font-bold tracking-tighter text-white md:text-8xl leading-[0.9]"
              >
                {splitHeadline.map((word, i) => (
                  <motion.span key={i} variants={itemVariants} className="inline-block mr-4">
                    {word}
                  </motion.span>
                ))}
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="mt-8 max-w-2xl text-xl leading-relaxed text-slate-400 font-medium"
              >
                EduCred turns certificate validation into a simple flow: upload, hash, anchor on blockchain, verify instantly.
              </motion.p>

              <div className="mt-12 flex flex-wrap gap-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/verify"
                    className="btn-command btn-blue !px-10 !py-5 text-[10px] shadow-[0_0_50px_rgba(59,130,246,0.4)]"
                  >
                    Authorize Node <ArrowRight size={18} />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/signup"
                    className="btn-command btn-outline !px-10 !py-5 text-[10px]"
                  >
                    Deploy Protocol
                  </Link>
                </motion.div>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {headlineTicker.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...transition, delay: 0.4 }}
              className="relative rounded-[3rem] border border-white/12 bg-[#030303]/60 p-8 shadow-[0_0_100px_rgba(34,211,238,0.1)] backdrop-blur-3xl"
            >
              <div className="rounded-[2.5rem] border border-white/8 bg-gradient-to-br from-white/[0.05] to-transparent p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] font-mono text-cyan-400">Live system</p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tighter text-white">Trust surface</h2>
                  </div>
                  <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                    {stats.blockchainMode}
                  </div>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2">
                  <MetricCard label="Active Nodes" value={stats.activeNodes} accent="text-white" />
                  <MetricCard label="Proofs Secured" value={stats.credentialsSecured} accent="text-cyan-400" />
                  <MetricCard label="Consensus Speed" value={stats.avgBlockTime} accent="text-blue-500" />
                  <MetricCard label="Protocol Uptime" value={stats.networkUptime} accent="text-white" />
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-slate-950/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                      <BadgeCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Verification outcome</p>
                      <p className="text-sm text-slate-400">Valid, revoked, or tampered results are returned with explicit source context.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="features" className="px-6 py-32">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={transition}
              className="max-w-2xl mb-20"
            >
              <p className="inline-block rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                Core infrastructure
              </p>
              <h2 className="mt-8 text-5xl font-bold tracking-tighter text-white md:text-6xl">
                Built for institutions that need trust, speed, and auditability.
              </h2>
            </motion.div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section id="flow" className="px-6 py-32">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1fr] items-center">
            <motion.div 
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={transition}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.4em] font-mono text-cyan-400">03 // System architecture</p>
              <h3 className="mt-8 text-6xl font-bold tracking-tighter text-white">
                One consistent path from upload to verification.
              </h3>
              <p className="mt-8 text-xl leading-relaxed text-slate-400 max-w-xl">
                The EduCred protocol utilizes a decentralized hashing pipeline to ensure that every credential is immutable and publicly verifiable.
              </p>
              
              <div className="mt-12 space-y-4">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-6 group">
                     <span className="text-[12px] font-mono text-cyan-500/40">0{index + 1}</span>
                     <p className="text-lg font-bold text-slate-300 group-hover:text-cyan-400 transition-colors uppercase tracking-widest">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ ...transition, delay: 0.2 }}
              className="relative"
            >
              <ProtocolSchematic />
              
              <div className="mt-8 grid gap-4 grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 backdrop-blur-xl">
                  <Workflow className="text-cyan-400" size={20} />
                  <h4 className="mt-4 text-sm font-bold text-white uppercase tracking-widest">Audit Trail</h4>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Verification events are tracked via immutable ledger sequences.</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 backdrop-blur-xl">
                  <Building2 className="text-indigo-400" size={20} />
                  <h4 className="mt-4 text-sm font-bold text-white uppercase tracking-widest">Issuer Nodes</h4>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Authorised institutions manage credentials via private keys.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 🏛️ TRUSTED INSTITUTIONS SECTION */}
        <section className="px-6 py-32 border-t border-white/5">
          <div className="mx-auto max-w-7xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20 text-center"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.5em] font-mono text-indigo-400">Protocol Adoption</p>
              <h2 className="mt-6 text-5xl font-bold tracking-tighter text-white">Trusted by Global Registries</h2>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-4">
               {[
                 'Global Academic Registry',
                 'Ivy Protocol Board',
                 'Digital Credentials Alliance',
                 'Network of Universities'
               ].map((partner, i) => (
                 <motion.div 
                   key={i}
                   whileHover={{ scale: 1.02 }}
                   className="group relative flex h-32 items-center justify-center rounded-3xl border border-white/8 bg-white/[0.02] p-6 text-center backdrop-blur-xl transition-all hover:bg-white/[0.04] holographic-edge"
                 >
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-white transition-colors">{partner}</p>
                   <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 </motion.div>
               ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-32 pt-12">
          <div className="mx-auto max-w-7xl relative overflow-hidden rounded-[3rem] border border-white/5 bg-[#050505] p-16 md:p-24 shadow-[0_0_100px_rgba(34,211,238,0.1)] scanline-overlay">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full" />
            
            <div className="relative z-10 flex flex-col gap-14 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-6">
                <p className="inline-block rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400">
                  Ready for deployment
                </p>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase leading-none">
                  Establish Your <span className="text-cyan-400">Node.</span>
                </h2>
                <p className="text-xl text-cyan-400/60 font-bold uppercase tracking-widest max-w-lg leading-relaxed">
                  Launch the full certificate verification flow within the high-fidelity sovereign enclave.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <Link
                  to="/verify"
                  className="btn-command btn-blue px-12 !py-6 text-[11px] shadow-[0_0_40px_rgba(59,130,246,0.2)]"
                >
                  Authorize Node <ArrowRight size={18} />
                </Link>
                <Link
                  to="/signup"
                  className="btn-command btn-outline px-12 !py-6 text-[11px]"
                >
                  Initialize Protocol
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/8 px-6 py-12 bg-black/20 backdrop-blur-3xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
              © {new Date().getFullYear()} EduCred Protocol
            </p>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Mainnet node status: Online
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Link to="/privacy" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:text-cyan-400">Privacy</Link>
            <Link to="/terms" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:text-cyan-400">Terms</Link>
            <Link to="/contact" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:text-cyan-400">Contact</Link>
          </div>
        </div>
      </footer>
    </motion.div>
    )}
    </AnimatePresence>
  </div>
  );
}
