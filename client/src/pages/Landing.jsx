import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6 backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={transition}
      className="rounded-[2rem] border border-white/8 bg-[#0b1220]/75 p-7 backdrop-blur-2xl"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
        <Icon size={20} />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
    </motion.div>
  );
}

export default function Landing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(fallbackStats);
  const [nodes, setNodes] = useState([]);
  const [ticker, setTicker] = useState([]);

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-slate-100">
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <BlockchainBackground />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#14345f_0%,#07111f_42%,#030712_100%)]" />

      <header className="relative z-10 px-6 pt-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] text-white">EduCred</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Academic trust layer</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-slate-300 transition hover:text-white">Features</a>
            <a href="#flow" className="text-sm text-slate-300 transition hover:text-white">Flow</a>
            <Link to="/verify" className="text-sm text-slate-300 transition hover:text-white">Verify</Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm text-slate-300 transition hover:text-white sm:block">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  Start now
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-6 pb-16 pt-20">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-sky-200">
                <Sparkles size={14} />
                Verify in seconds
              </div>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Tamper-proof academic credentials with a cleaner verification experience.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                EduCred turns certificate validation into a simple flow: upload, hash, anchor on blockchain, verify instantly.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/verify"
                  className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  Open verifier
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  Issue certificates
                </Link>
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...transition, delay: 0.1 }}
              className="rounded-[2rem] border border-white/10 bg-[#081423]/80 p-6 shadow-[0_40px_140px_rgba(3,7,18,0.6)] backdrop-blur-2xl"
            >
              <div className="rounded-[1.75rem] border border-white/8 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Live system</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Credential trust surface</h2>
                  </div>
                  <div className="rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-200">
                    {stats.blockchainMode}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <MetricCard label="Active nodes" value={stats.activeNodes} accent="text-white" />
                  <MetricCard label="Credentials secured" value={stats.credentialsSecured} accent="text-sky-300" />
                  <MetricCard label="Consensus speed" value={stats.avgBlockTime} accent="text-sky-200" />
                  <MetricCard label="Service uptime" value={stats.networkUptime} accent="text-white" />
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-slate-950/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-200">
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
          </div>
        </section>

        <section id="features" className="px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-300">Why EduCred</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
                Built for institutions that need trust, speed, and auditability.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section id="flow" className="px-6 py-16">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-8 backdrop-blur-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-300">Verification flow</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                One consistent path from upload to blockchain-backed verification.
              </h3>
              <div className="mt-8 space-y-4">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400 text-sm font-semibold text-slate-950">
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium text-slate-200">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/8 bg-[#081423]/80 p-8 backdrop-blur-2xl">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <Workflow className="text-sky-300" size={20} />
                  <h4 className="mt-4 text-lg font-semibold text-white">Instant audit trail</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Verification events, issuance results, and tamper alerts can all be tracked through the API and ledger view.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <Building2 className="text-cyan-300" size={20} />
                  <h4 className="mt-4 text-lg font-semibold text-white">Institution-ready flow</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    University dashboards can issue, monitor, and revoke credentials without leaving the product surface.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <Network className="text-sky-300" size={20} />
                  <h4 className="mt-4 text-lg font-semibold text-white">Live node visibility</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Approved institutions and network state are surfaced live instead of being hidden behind manual steps.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <FileCheck2 className="text-amber-300" size={20} />
                  <h4 className="mt-4 text-lg font-semibold text-white">Clear trust signals</h4>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Results distinguish between blockchain-backed verification and registry-only checks in local development.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-slate-950/50 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Approved nodes</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(nodes.length ? nodes.slice(0, 6) : [{ name: 'Awaiting local data', status: 'Pending' }]).map((node) => (
                    <span
                      key={node.name}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-200"
                    >
                      {node.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24 pt-12">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-white/10 bg-gradient-to-r from-sky-400 to-cyan-300 px-8 py-10 text-slate-950 shadow-[0_40px_120px_rgba(56,189,248,0.2)]">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900/70">Ready for demo</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight">
                  Launch the full certificate verification flow from one place.
                </h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/verify"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                >
                  Verify now
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-950/15 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/20"
                >
                  Create institution account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            © {new Date().getFullYear()} EduCred — Academic trust layer
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300">Privacy</Link>
            <Link to="/terms" className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300">Terms</Link>
            <Link to="/contact" className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
