import React, { Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, GradientTexture } from '@react-three/drei';
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
            colors={['#1e3a8a', '#3b82f6']}
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
        className="absolute inset-0 bg-blue-600/10 border border-blue-500/20 rounded-2xl"
        initial={false}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}

    <Icon
      size={18}
      className={`relative z-10 transition-colors duration-500 ${active ? 'text-blue-500' : 'group-hover:text-blue-400'}`}
    />

    <span className={`relative z-10 text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
      {label}
    </span>

    {count > 0 && (
      <span className="relative z-10 ml-auto bg-blue-500/20 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
        {count}
      </span>
    )}

    {active && !count && (
      <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="ml-auto">
        <ChevronRight size={14} className="text-blue-500/50" />
      </motion.div>
    )}
  </motion.button>
);// ──────────────────────────────────────────────────────────────────────────
// 🚀 MAIN DASHBOARD LAYOUT: THE ARCHITECTURAL SHELL
// ──────────────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children, currentTab, setTab, pendingCount = 0 }) {
  const { user, logout } = useAuth();

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
    <div className="flex h-screen w-full bg-[#000000] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden relative">

      {/* ── 🧊 SPATIAL BACKGROUND SYSTEM ── */}
      {/* Fixed 3D Canvas in the background to prevent layout shifts */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#3b82f6" />
          <Suspense fallback={null}>
            <SpatialAnchor />
          </Suspense>
        </Canvas>
      </div>

      {/* Ambient Gradient Vignette */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.05)_0%,transparent_50%)] pointer-events-none" />

      {/* ──────────────────────────────────────────────────────────────────
          🕋 LIQUID GLASS SIDEBAR: COMMAND INTERFACE
      ────────────────────────────────────────────────────────────────── */}
      <aside className="w-80 h-[calc(100vh-2.5rem)] m-5 z-20 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/[0.06] rounded-[2.5rem] p-10 flex flex-col gap-10 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden group">

        {/* Subtle top-glow accent */}
        <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-50" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none" />

        {/* ── SECTION: IDENTITY HEADER ── */}
        <div className="flex items-center gap-5 px-1 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#111111] border border-white/[0.06] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.1)] group-hover:border-blue-500/30 transition-all duration-700">
            <Hexagon size={28} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-2xl tracking-tighter text-white uppercase leading-none">EduCred</p>
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {isAdmin ? 'Institutional' : 'Student'}
            </p>
          </div>
        </div>

        {/* ── SECTION: PROTOCOL NAVIGATION ── */}
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
              {/* Node Sync Indicator */}
              <div className="flex items-center justify-between group/vitality">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-3 h-3 bg-blue-500/20 rounded-full animate-ping" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover/vitality:text-white transition-colors">Nodes Synced</span>
                </div>
                <span className="text-[9px] font-mono text-blue-500 font-bold">100%</span>
              </div>

              {/* Gas/Network Load Visualization */}
              <div className="p-5 rounded-2xl bg-[#050505] border border-white/[0.04] space-y-4 hover:border-blue-500/20 transition-all duration-500 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-blue-500" />
                    <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">Load Balance</span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-500 tracking-widest uppercase animate-pulse">Optimal</span>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-extrabold tracking-tighter text-white">24.8 <span className="text-[10px] text-slate-600 ml-1 font-bold uppercase tracking-widest">Gwei</span></p>
                  <div className="h-1 w-full bg-white/[0.02] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: '45%' }}
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ── SECTION: TERMINATE SESSION ── */}
        <div className="relative z-10 pt-4 border-t border-white/[0.04]">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 transition-all duration-500 group border border-transparent hover:border-rose-500/20 shadow-none hover:shadow-[0_0_30px_rgba(244,63,94,0.1)]"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform duration-500" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em]">Terminate Node</span>
          </button>
        </div>
      </aside>{/* ──────────────────────────────────────────────────────────────────
          🚀 MAIN VIEWPORT: THE CONTENT ENCLAVE
      ────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 h-screen overflow-y-auto z-10 py-12 px-8 md:px-20 custom-scrollbar relative">

        {/* ── SECTION: GLOBAL HEADER ── */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-20 relative z-20">

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Identity Breadcrumb */}
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">
                  {isAdmin ? 'Institutional Node' : 'Citizen Identity'} Active
                </span>
              </div>
              <div className="h-px w-8 bg-white/10" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Massive Typography Header */}
            <h1 className="text-6xl md:text-7xl xl:text-8xl font-extrabold tracking-tighter text-white leading-none uppercase">
              {isAdmin ? 'Intelligence' : 'Credential Hub'}<span className="text-blue-600">.</span>
            </h1>

            {/* Sub-Header / Identity Metadata */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-3 bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/[0.06] backdrop-blur-md">
                <UserIcon size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-300 tracking-wide">
                  {isAdmin
                    ? `Node ID: ${user?.universityName || 'Global Academic Authority'}`
                    : `Identity: ${user?.name || 'Authorized Citizen'}`
                  }
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/[0.06] backdrop-blur-md">
                <Activity size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-slate-300 tracking-wide uppercase tracking-widest">
                  Network Latency: <span className="text-blue-400">12ms</span>
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── SECTION: GLOBAL ACTIONS ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex items-center gap-4 self-start xl:self-center"
          >
            {/* Quick Search Module */}
            <div className="relative group hidden sm:block">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="SEARCH LEDGER..."
                className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-6 text-[10px] font-bold tracking-[0.2em] text-white outline-none focus:border-blue-500/50 w-64 uppercase transition-all shadow-inner"
              />
            </div>

            <button className="bg-[#111111] border border-white/[0.06] px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-xl">
              Explorer
            </button>

            {isAdmin && (
              <button
                onClick={() => setTab('issue')}
                className="bg-white text-black px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center gap-3"
              >
                <Database size={16} /> Anchor Identity
              </button>
            )}
          </motion.div>
        </header>

        {/* ── SECTION: PAGE CONTENT SLOT ── */}
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 min-h-[60vh]"
        >
          {/* Ambient section glow */}
          <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/[0.02] blur-[150px] pointer-events-none" />

          <div className="max-w-[1600px]">
            {children}
          </div>
        </motion.div>

        {/* ── SECTION: SYSTEM FOOTER ── */}
        <footer className="mt-32 pt-12 border-t border-white/[0.04] flex flex-col md:flex-row justify-between items-center gap-6 pb-12 relative z-20">
          <div className="flex items-center gap-6">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em]">Protocol Node v2.4.0</span>
            <div className="h-px w-8 bg-white/5" />
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em]">Mainnet Synchronization: OK</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-[9px] font-bold text-slate-700 hover:text-blue-500 uppercase tracking-widest transition-colors">Documentation</a>
            <a href="#" className="text-[9px] font-bold text-slate-700 hover:text-blue-500 uppercase tracking-widest transition-colors">Support Matrix</a>
          </div>
        </footer>

      </main>
    </div>
  );
}