import { motion } from 'framer-motion';
import { GraduationCap, Send, Clock, User, Hexagon } from 'lucide-react';

export default function DashboardLayout({ children, currentTab, setTab, pendingCount }) {
  const tabs = [
    { key: 'wallet', label: 'Identity Wallet', icon: GraduationCap },
    { key: 'submit', label: 'Submit Proof', icon: Send },
    { key: 'status', label: 'Network Status', icon: Clock },
    { key: 'profile', label: 'Node Profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden relative">

      {/* AMBIENT GLOW FOR ENTIRE DASHBOARD */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0A0A0A]/80 backdrop-blur-3xl border-r border-white/[0.04] flex flex-col relative z-20 shadow-[20px_0_60px_rgba(0,0,0,0.5)]">

        {/* LOGO HEADER */}
        <div className="p-8 border-b border-white/[0.04] flex items-center gap-4 bg-[#050505]/50">
          <div className="w-12 h-12 bg-[#111111] border border-white/[0.06] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:border-blue-500/30 transition-colors">
            <Hexagon className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight leading-none">EduCred</h2>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.4em] mt-1.5">Student Node</p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-6 flex flex-col gap-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`relative flex items-center justify-between w-full px-5 py-4 rounded-2xl transition-all duration-300 group outline-none ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {/* BUTTERY SMOOTH ACTIVE TAB BACKGROUND (Framer Motion) */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#111111] border border-white/[0.06] rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <div className="relative flex items-center gap-4 z-10">
                  <Icon size={18} className={isActive ? "text-blue-500" : "group-hover:text-blue-400 transition-colors"} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{tab.label}</span>
                </div>

                {/* GLOWING PENDING BADGE */}
                {tab.key === 'status' && pendingCount > 0 && (
                  <div className="relative z-10 flex items-center justify-center px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <span className="text-[9px] font-black text-blue-400 leading-none">{pendingCount}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* SYSTEM STATUS FOOTER */}
        <div className="p-6 border-t border-white/[0.04] bg-[#050505]/50">
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#111111] border border-white/[0.04] shadow-inner">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-3 h-3 bg-blue-500/20 rounded-full animate-ping" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-0.5">Network Sync</span>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative z-10 overflow-y-auto custom-scrollbar">
        <div className="p-8 md:p-12 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}