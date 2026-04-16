import React, { Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, GradientTexture } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Database,
  History,
  Activity,
  Send,
  BookOpen,
  LogOut,
  Clock,
  Search,
  User as UserIcon,
  ChevronRight,
  Hexagon,
  Cpu,
  Zap
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────
// 💠 SPATIAL ANCHOR: Interactive 3D Background Element
// ──────────────────────────────────────────────────────────────────────────
function SpatialAnchor() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 100, 100]} scale={2.2}>
        <MeshDistortMaterial
          distort={0.4}
          speed={2}
          roughness={0}
          metalness={1}
          transparent
          opacity={0.08}
        >
          <GradientTexture
            stops={[0, 1]}
            colors={['#0891b2', '#22d3ee']}
          />
        </MeshDistortMaterial>
      </Sphere>
    </Float>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 🔳 SIDEBAR ITEM: FAANG-Grade Interactive Nav
// ──────────────────────────────────────────────────────────────────────────
const SidebarItem = ({ icon: Icon, label, active = false, onClick, count }) => (
  <motion.button
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-500 group relative overflow-hidden ${active
        ? 'text-white'
        : 'text-slate-500 hover:text-slate-300'
      }`}
  >
    {/* Active Glow Indicator */}
    {active && (
      <motion.div
        layoutId="activeNavGlow"
        className="absolute inset-0 bg-cyan-400/10 border border-cyan-400/20 rounded-2xl"
        initial={false}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}

    <Icon
      size={18}
      className={`relative z-10 transition-colors duration-500 ${active ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`}
    />

    <span className={`relative z-10 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
      {label}
    </span>

    {count > 0 && (
      <span className="relative z-10 ml-auto bg-cyan-400/20 text-cyan-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
        {count}
      </span>
    )}

    {active && !count && (
      <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="ml-auto">
        <ChevronRight size={14} className="text-cyan-400/50" />
      </motion.div>
    )}
  </motion.button>
);

// ──────────────────────────────────────────────────────────────────────────
// 🚀 MAIN DASHBOARD LAYOUT: THE ARCHITECTURAL SHELL
// ──────────────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children, currentTab, setTab, pendingCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 🛡️ ROLE-BASED ACCESS CONTROL (RBAC)
  const isAdmin = user?.role === 'university';

  // 🛰️ DYNAMIC PROTOCOL NAVIGATION
  const menuItems = useMemo(() => (
    isAdmin ? [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Global Insights', desc: 'Real-time Analytics' },
      { id: 'issue', icon: Database, label: 'Identity Anchor', desc: 'Mint New Credentials' },
      { id: 'requests', icon: Clock, label: 'Pending Queue', desc: 'Validation Pipeline', count: pendingCount },
      { id: 'history', icon: History, label: 'Audit Ledger', desc: 'Historical Proofs' },
      { id: 'profile', icon: UserIcon, label: 'Institution Node', desc: 'Metadata Config' },
    ] : [
      { id: 'wallet', icon: Shield, label: 'Identity Wallet', desc: 'Secured Proofs' },
      { id: 'submit', icon: Send, label: 'Submit Protocol', desc: 'New Request' },
      { id: 'status', icon: BookOpen, label: 'Request Logic', desc: 'Sync Progress' },
      { id: 'profile', icon: UserIcon, label: 'Personal Node', desc: 'Account State' },
    ]
  ), [isAdmin, pendingCount]);

  return (
    <div className="flex h-screen w-full bg-[#000000] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-hidden relative">

      {/* ── 🧊 SPATIAL BACKGROUND SYSTEM ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#22d3ee" />
          <Suspense fallback={null}>
            <SpatialAnchor />
          </Suspense>
        </Canvas>
      </div>

      {/* Ambient Gradient Vignette */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.05)_0%,transparent_50%)] pointer-events-none" />

      {/* 🕋 LIQUID GLASS SIDEBAR: COMMAND INTERFACE */}
      <aside className="w-80 h-[calc(100vh-2.5rem)] m-5 z-20 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col gap-10 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden group">

        <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-50" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-400/5 blur-[100px] pointer-events-none" />

        {/* ── IDENTITY HEADER ── */}
        <div className="flex items-center gap-5 px-1 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#050505] border border-cyan-400/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.1)] group-hover:border-cyan-400/50 transition-all duration-700">
            <Hexagon size={28} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-2xl tracking-tighter text-white uppercase leading-none">Edu<span className="text-cyan-400">Cred</span></p>
            <p className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.4em] mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {isAdmin ? 'Institutional' : 'Student'}
            </p>
          </div>
        </div>

        {/* ── PROTOCOL NAVIGATION ── */}
        <nav className="flex flex-col gap-2 flex-1 relative z-10 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <p className="px-5 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4 opacity-60">
            {isAdmin ? 'Network Operations' : 'Verification Enclave'}
          </p>

          <div className="space-y-1">
            {menuItems.map(item => (
              <SidebarItem
                key={item.id}
                active={currentTab === item.id}
                onClick={() => setTab(item.id)}
                icon={item.icon}
                label={item.label}
                count={item.count}
              />
            ))}
          </div>

          {/* ── SYSTEM VITALITY MODULE ── */}
          <div className="mt-12 px-5 space-y-6">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] opacity-60">System Vitality</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between group/vitality">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-3 h-3 bg-cyan-500/20 rounded-full animate-ping" />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover/vitality:text-white transition-colors">Sync State</span>
                </div>
                <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Stable</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#050505] border border-white/5 space-y-4 hover:border-cyan-500/20 transition-all duration-500 shadow-inner group/balance">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-cyan-400" />
                    <span className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase">Load Balance</span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-500 tracking-widest uppercase animate-pulse">Optimal</span>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black tracking-tighter text-white">24.8 <span className="text-[9px] text-slate-600 ml-1 font-black uppercase tracking-widest">Gwei</span></p>
                  <div className="h-1 w-full bg-white/[0.02] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: '45%' }}
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 group-hover/balance:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-shadow"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ── TERMINATE SESSION ── */}
        <div className="relative z-10 pt-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all duration-500 group border border-transparent hover:border-rose-500/20 shadow-none hover:shadow-[0_0_30px_rgba(244,63,94,0.1)]"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform duration-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Terminate Node</span>
          </button>
        </div>
      </aside>

      {/* 🚀 MAIN VIEWPORT: THE CONTENT ENCLAVE */}
      <main className="flex-1 h-screen overflow-y-auto z-10 py-12 px-8 md:px-20 custom-scrollbar relative">

        {/* ── GLOBAL HEADER ── */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-20 relative z-20">

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2.5 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">
                  {isAdmin ? 'Institutional Node' : 'Citizen Identity'} Active
                </span>
              </div>
              <div className="h-px w-8 bg-white/5" />
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl xl:text-8xl font-black tracking-tighter text-white leading-none uppercase">
              {isAdmin ? 'Intelligence' : 'Credential Hub'}<span className="text-cyan-400">.</span>
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-3 bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/5 backdrop-blur-md group hover:border-cyan-400/20 transition-all">
                <UserIcon size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                  {isAdmin
                    ? `Node: ${user?.universityName || 'Global Authority'}`
                    : `Identity: ${user?.name || 'Authorized Citizen'}`
                  }
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/5 backdrop-blur-md group hover:border-blue-400/20 transition-all">
                <Activity size={16} className="text-blue-500" />
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                  Latency: <span className="text-blue-400">12ms</span>
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── GLOBAL ACTIONS ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex items-center gap-4 self-start xl:self-center"
          >
            <div className="relative group hidden sm:block">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
              <input
                type="text"
                placeholder="SEARCH LEDGER..."
                className="bg-[#050505] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-[10px] font-black tracking-[0.2em] text-white outline-none focus:border-cyan-400/50 w-64 uppercase transition-all shadow-inner"
              />
            </div>

            <button className="bg-[#0A0A0A] border border-white/10 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:border-white/20 transition-all">
              Explorer
            </button>

            {isAdmin && (
              <button
                onClick={() => setTab('issue')}
                className="btn-command btn-blue px-10 shadow-[0_0_40px_rgba(59,130,246,0.2)]"
              >
                <Database size={16} /> Anchor Identity
              </button>
            )}
          </motion.div>
        </header>

        {/* ── PAGE CONTENT SLOT ── */}
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 min-h-[60vh]"
        >
          <div className="absolute top-0 left-0 w-full h-[500px] bg-cyan-400/[0.02] blur-[150px] pointer-events-none" />

          <div className="max-w-[1600px]">
            {children}
          </div>
        </motion.div>

        {/* ── SYSTEM FOOTER ── */}
        <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 pb-12 relative z-20">
          <div className="flex items-center gap-6">
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Protocol Node v2.4.0</span>
            <div className="h-px w-8 bg-white/5" />
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Mainnet Synchronization: OK</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-[9px] font-black text-slate-800 hover:text-cyan-400 uppercase tracking-[0.4em] transition-colors">Documentation</a>
            <a href="#" className="text-[9px] font-black text-slate-800 hover:text-cyan-400 uppercase tracking-[0.4em] transition-colors">Support Matrix</a>
          </div>
        </footer>

      </main>
    </div>
  );
}
