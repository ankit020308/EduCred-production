import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export default function InsightCard({ title, value, icon: Icon, trend, color = 'blue' }) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-600/10 border-blue-500/20',
    amber: 'text-amber-500 bg-amber-600/10 border-amber-500/20',
    indigo: 'text-indigo-500 bg-indigo-600/10 border-indigo-500/20',
    rose: 'text-rose-500 bg-rose-600/10 border-rose-500/20',
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white group flex flex-col justify-between h-full relative p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/[0.03] hover:shadow-slate-900/10 transition-all duration-500"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] pointer-events-none group-hover:opacity-30 transition-all duration-700 opacity-10 ${color === 'rose' ? 'bg-rose-500' : 'bg-blue-500'}`} />
      
      <div className="space-y-8 relative z-10 mb-8">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm transition-all duration-500 ${selectedColor} group-hover:scale-110`}>
            <Icon size={26} />
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${color === 'rose' ? 'bg-rose-500' : 'bg-blue-500'}`} />
            <span className="small-text font-black uppercase tracking-widest text-slate-400 text-[9px]">Verified</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="small-text font-black text-slate-400 uppercase tracking-widest text-[10px]">{title}</h3>
          <p className="text-4xl font-black text-slate-900 leading-tight opacity-90 group-hover:opacity-100 transition-opacity tracking-tighter">
            {value}
          </p>
        </div>
      </div>
      
      <div className="pt-8 mt-auto flex items-center justify-between relative z-10 border-t border-slate-50">
        <div className="flex items-center gap-3">
            <TrendingUp size={14} className={color === 'rose' ? 'text-rose-500' : 'text-blue-600'} />
            <span className="small-text font-black text-slate-400 uppercase tracking-widest text-[9px]">{trend || 'System Secure'}</span>
        </div>
      </div>

      <div className={`absolute bottom-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent group-hover:via-blue-500/40 transition-all opacity-0 group-hover:opacity-100`} />
    </motion.div>
  );
}
