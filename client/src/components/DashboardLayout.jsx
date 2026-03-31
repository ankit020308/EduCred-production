import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Environment } from '@react-three/drei';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Database,
  History,
  HelpCircle,
  ChevronRight,
  Activity,
  Send,
  BookOpen,
  LogOut,
  Clock,
  User as UserIcon
} from 'lucide-react';
import PixelGridBackground from './PixelGridBackground';

/**
 * Spatial Backdrop: A subtle, interactive 3D element representing security.
 */
function SpatialElement() {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 100, 100]} scale={2.4}>
        <MeshDistortMaterial
          color="#3b82f6"
          attach="material"
          distort={0.4}
          speed={1.5}
          roughness={0}
          transparent
          opacity={0.05}
        />
      </Sphere>
    </Float>
  );
}

const SidebarItem = ({ icon: Icon, label, active = false, onClick, count }) => (
  <motion.button
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${active
        ? 'bg-blue-600/10 border border-blue-500/20 text-white font-semibold'
        : 'text-slate-500 hover:text-slate-300'
      }`}
  >
    <Icon size={18} className={active ? 'text-blue-400' : ''} />
    <span className="text-sm tracking-tight">{label}</span>
    {count > 0 && (
      <span className="ml-auto bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
        {count}
      </span>
    )}
    {active && !count && <ChevronRight size={14} className="ml-auto opacity-50" />}
  </motion.button>
);

export default function DashboardLayout({ children, currentTab, setTab, pendingCount = 0 }) {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'university';

  const menuItems = isAdmin ? [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Global Insights' },
    { id: 'issue', icon: Database, label: 'Identity Anchor' },
    { id: 'requests', icon: Clock, label: 'Pending Queue', count: pendingCount },
    { id: 'history', icon: History, label: 'Audit Ledger' },
    { id: 'profile', icon: UserIcon, label: 'Institution Profile' },
  ] : [
    { id: 'submit', icon: Send, label: 'Submit Credential' },
    { id: 'status', icon: BookOpen, label: 'My Requests' },
    { id: 'profile', icon: UserIcon, label: 'Student Profile' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#050816] text-white font-inter relative overflow-hidden">

      {/* ── Background System ── */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#050816] via-[#0B0F2A] to-[#151A3A]" />
      <PixelGridBackground baseOpacity={0.08} fadeIntensity={0.5} />

      {/* ── Floating Sidebar (Liquid Glass) ── */}
      <aside className="w-80 h-[calc(100vh-2.5rem)] m-5 z-10 glass-card p-10 flex flex-col gap-12 shadow-2xl relative overflow-hidden border-white/10">
        <div className="absolute top-0 left-0 w-full h-40 bg-blue-600/5 blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-5 px-2 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
            <Shield size={28} className="text-blue-400" />
          </div>
          <div>
            <p className="font-space font-black text-2xl tracking-tighter leading-none text-white italic">EduNode</p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2 font-space">
              {isAdmin ? 'Institutional' : 'Student'}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-4 flex-1 relative z-10">
          <p className="px-4 text-[11px] font-bold text-slate-600 uppercase tracking-[0.3em] mb-4 font-space opacity-60">
            {isAdmin ? 'Analytics & Intel' : 'Verification Center'}
          </p>

          <div className="space-y-1.5">
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

          <div className="mt-auto px-4 pb-4">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.3em] mb-5 font-space opacity-60">System Health</p>
            <div className="flex items-center gap-4 py-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse" />
              <span className="text-[12px] font-bold text-slate-400 font-space tracking-widest uppercase">Nodes Synced</span>
            </div>
          </div>
        </nav>

        <div className="flex flex-col gap-6 relative z-10">
          <div className="glass-card p-6 border-white/10 bg-white/[0.02] rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Activity size={16} className="text-blue-400" />
                <span className="text-[11px] font-bold tracking-[0.2em] text-slate-500 font-space uppercase">Gas</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-500 font-space tracking-widest uppercase">Optimal</span>
            </div>
            <p className="text-3xl font-space font-bold tracking-tighter text-white">24 <span className="text-sm text-slate-600 ml-1 font-medium">Gwei</span></p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-5 px-6 py-4 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-rose-400/5 transition-all duration-500 group"
          >
            <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[13px] font-bold font-space uppercase tracking-widest text-[#94a3b8]">Terminate</span>
          </button>
        </div>
      </aside>

      {/* ── Main Scroll View ── */}
      <main className="flex-1 h-screen overflow-y-auto z-10 py-12 px-20 custom-scrollbar scroll-smooth">
        <header className="flex justify-between items-center mb-20 pt-2">
          <div className="space-y-4">
            <h1 className="text-6xl font-space font-black tracking-tighter text-white leading-none uppercase">
              {isAdmin ? 'Intelligence' : 'Credential Hub'}
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide flex items-center gap-3 opacity-70">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {isAdmin
                ? `Node Identity: ${user?.institutionName || user?.name || 'Academic Institution'}`
                : `Student Identity: ${user?.name}`
              }
            </p>
          </div>
          <div className="flex gap-6 items-center">
            <button className="glass-pill px-8 py-3.5 text-xs font-bold font-space uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-white border-white/10 shadow-xl">Support</button>
            {isAdmin && (
              <button
                onClick={() => setTab('issue')}
                className="btn-blue px-10 py-4 text-xs tracking-[0.2em] rounded-xl shadow-2xl"
              >
                Anchor Identity
              </button>
            )}
          </div>
        </header>

        <div className="max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
