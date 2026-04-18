import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Send, Clock, User, Hexagon } from 'lucide-react';
import { fetchSystemStats } from '../services/api';

export default function DashboardLayout({ children, currentTab, setTab, pendingCount }) {
  const [status, setStatus] = useState({ mode: 'LIVE', label: 'LIVE (Mainnet)' });

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const res = await fetchSystemStats();
        const mode = res.data?.blockchainMode || 'OFFLINE';
        setStatus({
          mode,
          label: mode === 'LIVE' ? 'LIVE (Mainnet)' : 'OFFLINE (Safe Mode)'
        });
      } catch {
        setStatus({ mode: 'OFFLINE', label: 'OFFLINE (Safe Mode)' });
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 300000); // 5 min poll
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { key: 'wallet', label: 'My Credentials', icon: GraduationCap },
    { key: 'submit', label: 'Verify Document', icon: Send },
    { key: 'status', label: 'System Status', icon: Clock },
    { key: 'profile', label: 'Account Settings', icon: User },
  ];

  const isLive = status.mode === 'LIVE';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-hidden relative">

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />

      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0B132B] flex flex-col relative z-20 shadow-2xl">

        {/* LOGO HEADER */}
        <div className="p-8 flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Hexagon className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">Edu<span className="text-blue-500">Cred</span></h2>
            <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest mt-1.5">Portal</p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-6 flex flex-col gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`relative flex items-center justify-between w-full px-5 py-3.5 rounded-xl transition-all duration-200 group outline-none ${
                    isActive ? 'text-white bg-blue-600 shadow-lg shadow-blue-600/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="relative flex items-center gap-4 z-10">
                  <Icon size={18} className={isActive ? "text-white" : "group-hover:text-blue-400 transition-colors"} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                </div>

                {tab.key === 'status' && pendingCount > 0 && (
                  <div className="relative z-10 flex items-center justify-center px-2 py-0.5 bg-rose-500 text-white rounded-full">
                    <span className="text-[9px] font-black leading-none">{pendingCount}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* SYSTEM STATUS FOOTER */}
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-4 px-4 py-4 rounded-xl bg-white/5 border border-white/5">
            <div className="relative flex items-center justify-center">
              <div className={`absolute w-3 h-3 ${isLive ? 'bg-emerald-500/20' : 'bg-rose-500/20'} rounded-full animate-ping`} />
              <div className={`w-1.5 h-1.5 ${isLive ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full`} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">System Status</span>
              <span className={`text-[10px] font-black ${isLive ? 'text-emerald-500' : 'text-rose-500'} uppercase tracking-widest`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative z-10 overflow-y-auto bg-[#F8FAFC]">
        <div className="p-8 md:p-12 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}