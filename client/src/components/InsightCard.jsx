import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export default function InsightCard({ title, value, icon: Icon, trend, color = 'blue' }) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-600/10 border-blue-500/20',
    emerald: 'text-emerald-500 bg-emerald-600/10 border-emerald-500/20',
    amber: 'text-amber-500 bg-amber-600/10 border-amber-500/20',
    indigo: 'text-indigo-500 bg-indigo-600/10 border-indigo-500/20',
    rose: 'text-rose-500 bg-rose-600/10 border-rose-500/20',
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card group flex flex-col justify-between h-full relative p-8 rounded-[24px]"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] pointer-events-none group-hover:opacity-20 transition-all duration-700 ${color === 'emerald' ? 'bg-emerald-600/5' : 'bg-blue-600/5'}`} />
      
      <div className="space-y-6 relative z-10 mb-8">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shadow-lg transition-all duration-500 ${selectedColor}`}>
            <Icon size={28} />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            <span className="small-text font-black uppercase tracking-[0.2em] text-slate-400 text-[9px]">Node Sync</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="small-text font-bold text-slate-500 uppercase tracking-[0.3em] text-[10px]">{title}</h3>
          <p className="text-3xl font-black text-white leading-tight opacity-90 group-hover:opacity-100 transition-opacity italic">
            {value}
          </p>
        </div>
      </div>
      
      <div className="pt-6 mt-auto flex items-center justify-between relative z-10 border-t border-white/5">
        <div className="flex items-center gap-3">
            <TrendingUp size={14} className={color === 'rose' ? 'text-rose-500' : 'text-emerald-500'} />
            <span className="small-text font-bold text-slate-400 uppercase tracking-widest text-[9px]">{trend || 'Optimal Output'}</span>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent group-hover:via-blue-500/40 transition-all opacity-0 group-hover:opacity-100 ${color === 'emerald' ? 'via-emerald-500/20' : ''}`} />
    </motion.div>
  );
}
