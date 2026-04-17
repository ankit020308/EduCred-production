import React, { Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  PlusSquare,
  History,
  Activity,
  Send,
  FileText,
  LogOut,
  Clock,
  Search,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Settings
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────
// 🔳 SIDEBAR ITEM: Professional Enterprise Nav
// ──────────────────────────────────────────────────────────────────────────
const SidebarItem = ({ icon: Icon, label, active = false, onClick, count }) => (
  <motion.button
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${active
        ? 'text-white bg-[#2C2F33] shadow-lg shadow-slate-900/10'
        : 'text-[#4B5563] hover:text-[#2C2F33] hover:bg-slate-50'
      }`}
  >
    <Icon
      size={18}
      className={`relative z-10 transition-colors duration-300 ${active ? 'text-white' : 'group-hover:text-[#60A5FA]'}`}
    />

    <span className={`relative z-10 text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
      {label}
    </span>

    {count > 0 && (
      <span className={`relative z-10 ml-auto text-[9px] font-black px-2 py-0.5 rounded-md border ${
        active 
          ? 'bg-white/20 text-white border-white/30' 
          : 'bg-blue-50 text-[#60A5FA] border-blue-100 shadow-sm'
      }`}>
        {count}
      </span>
    )}

    {active && !count && (
      <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="ml-auto">
        <ChevronRight size={14} className="text-white/50" />
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

  // 🛰️ DYNAMIC NAVIGATION
  const menuItems = useMemo(() => (
    isAdmin ? [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Overview', desc: 'Platform Analytics' },
      { id: 'issue', icon: PlusSquare, label: 'Issue Certificate', desc: 'Create New Record' },
      { id: 'requests', icon: Clock, label: 'Verification Queue', desc: 'Pending Validations', count: pendingCount },
      { id: 'history', icon: History, label: 'Activity History', desc: 'Audit Ledger' },
      { id: 'profile', icon: Settings, label: 'Institution Profile', desc: 'Account Settings' },
    ] : [
      { id: 'wallet', icon: Shield, label: 'My Certificates', desc: 'Verified Records' },
      { id: 'submit', icon: Send, label: 'New Request', desc: 'Verification Protocol' },
      { id: 'status', icon: FileText, label: 'Active Requests', desc: 'Track Progress' },
      { id: 'profile', icon: UserIcon, label: 'Personal Profile', desc: 'Account State' },
    ]
  ), [isAdmin, pendingCount]);

  return (
    <div className="flex h-screen w-full bg-[#F9FAFB] text-[#111827] font-sans selection:bg-blue-500/30 overflow-hidden relative">

      {/* 🕋 ENTERPRISE SIDEBAR */}
      <aside className="w-80 h-full z-20 bg-white p-8 flex flex-col gap-10 shadow-2xl relative overflow-hidden group border-r border-[#E5E7EB]">
        
        {/* Subtle radial glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />

        {/* ── BRANDING ── */}
        <div className="flex items-center gap-4 px-1 relative z-10 transition-transform duration-500">
          <div className="w-12 h-12 rounded-xl bg-[#2C2F33] flex items-center justify-center transition-all">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div className="space-y-0.5">
            <p className="font-black text-2xl tracking-tighter text-[#2C2F33] uppercase leading-none">Edu<span className="text-[#60A5FA]">Cred</span></p>
            <p className="text-[9px] font-black text-[#60A5FA]/60 uppercase tracking-[0.3em]">
              Enterprise
            </p>
          </div>
        </div>

        {/* ── NAVIGATION ── */}
        <nav className="flex flex-col gap-2 flex-1 relative z-10 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <p className="px-5 text-[9px] font-black text-[#4B5563] uppercase tracking-widest mb-4 opacity-50">
            {isAdmin ? 'Administration' : 'Credentials'}
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

          {/* ── SYSTEM STATUS ── */}
          <div className="mt-12 px-5 space-y-6">
            <p className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest opacity-50">System Status</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-3 h-3 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest">Network</span>
                </div>
                <span className="text-[9px] font-black text-emerald-600 tracking-widest uppercase">Operational</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-4 hover:border-[#60A5FA]/20 transition-all shadow-inner group/status">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#60A5FA]" />
                    <span className="text-[9px] font-black tracking-widest text-[#4B5563] uppercase">Latency</span>
                  </div>
                  <span className="text-[9px] font-black text-[#60A5FA] tracking-widest uppercase animate-pulse">12ms</span>
                </div>
                <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: '92%' }}
                      className="h-full bg-gradient-to-r from-[#2C2F33] to-[#60A5FA]"
                    />
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ── SIGN OUT ── */}
        <div className="relative z-10 pt-6 border-t border-[#E5E7EB]">
          <button
            onClick={handleLogout}
            className="w-full h-14 flex items-center gap-4 px-6 rounded-xl text-[#4B5563] hover:text-rose-600 hover:bg-rose-50 transition-all group"
          >
            <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 🚀 MAIN VIEWPORT */}
      <main className="flex-1 h-screen overflow-y-auto z-10 py-12 px-8 md:px-16 lg:px-24 custom-scrollbar relative bg-[#F9FAFB]">

        {/* ── GLOBAL HEADER ── */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-20 relative z-20">

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 flex items-center gap-2.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
                <span className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest">
                  {isAdmin ? 'Institutional' : 'Student'} Account Active
                </span>
              </div>
              <div className="h-px w-8 bg-slate-200" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-[#2C2F33] leading-none uppercase">
              {isAdmin ? 'Platform' : 'Credential'}<span className="text-[#60A5FA]"> Center.</span>
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-[#E5E7EB] shadow-sm group hover:border-[#60A5FA]/20 transition-all">
                <UserIcon size={16} className="text-[#4F5563] group-hover:text-[#60A5FA] transition-colors" />
                <span className="text-[10px] font-black text-[#111827] tracking-widest uppercase opacity-80">
                  {isAdmin
                    ? `${user?.universityName || 'University Administrator'}`
                    : `${user?.name || 'Authorized User'}`
                  }
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-[#E5E7EB] shadow-sm transition-all text-[#4B5563]">
                <Activity size={16} className="text-[#60A5FA]" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Status: <span className="text-emerald-600">Active</span>
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
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#D1D5DB] group-focus-within:text-[#60A5FA] transition-colors" size={16} />
              <input
                type="text"
                placeholder="SEARCH RECORDS..."
                className="bg-white border border-[#E5E7EB] rounded-2xl py-4.5 pl-14 pr-8 text-[10px] font-black tracking-[0.1em] text-[#111827] outline-none focus:border-[#60A5FA] w-64 uppercase transition-all shadow-sm"
              />
            </div>

            {isAdmin && (
              <button
                onClick={() => setTab('issue')}
                className="btn-primary h-14 !px-10 !shadow-slate-900/10 !bg-[#2C2F33]"
              >
                <PlusSquare size={18} /> Issue Certificate
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
          <div className="max-w-[1600px]">
            {children}
          </div>
        </motion.div>

        {/* ── SYSTEM FOOTER ── */}
        <footer className="mt-32 pt-12 border-t border-[#E5E7EB] flex flex-col md:flex-row justify-between items-center gap-6 pb-12 relative z-20">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-[#D1D5DB] uppercase tracking-widest italic">EduCred v2.5.0</span>
            <div className="h-px w-8 bg-[#E5E7EB]" />
            <span className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest">Global Status: Secure</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-[10px] font-black text-[#4B5563] hover:text-[#2C2F33] uppercase tracking-widest transition-colors">Internal Guides</a>
            <a href="#" className="text-[10px] font-black text-[#4B5563] hover:text-[#2C2F33] uppercase tracking-widest transition-colors">Support Center</a>
          </div>
        </footer>

      </main>
    </div>
  );
}
