import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, 
  ShieldCheck, 
  Search, 
  Clock, 
  UserCheck, 
  XCircle, 
  FileWarning, 
  History,
  Activity,
  ArrowRight,
  Loader2,
  Cpu,
  Globe
} from 'lucide-react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import BlockchainBackground from '../components/BlockchainBackground';

// 💠 ANIMATION CONSTANTS (OBSIDIAN PROTOCOL)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

// ─── Refined Ledger logic for Obsidian ───
const typeConfig = {
  ISSUE:   { icon: ShieldCheck, color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  VERIFY:  { icon: Search,      color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  REQUEST: { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  APPROVE: { icon: UserCheck,   color: 'text-emerald-400',   bg: 'bg-emerald-400/10',   border: 'border-emerald-400/20' },
  REJECT:  { icon: XCircle,     color: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-400/20' },
  TAMPER:  { icon: FileWarning, color: 'text-rose-400',  bg: 'bg-rose-400/10',  border: 'border-rose-400/20' },
};

export default function Ledger() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/api/ledger')
      .then(r => setEvents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e =>
    (e.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.universityName || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.txHash || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 overflow-x-hidden selection:bg-blue-500/30 font-sans">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <div className="container max-w-5xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-sm">
              <Network className="text-blue-600" size={16} />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Global Audit Network</span>
            </div>
            <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              Public <span className="text-blue-500">History.</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] max-w-xl leading-relaxed">
              Transparent, immutable record of all certificate activities on the network.
            </p>
          </div>
          
          <div className="relative w-full md:w-96 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                placeholder="Search history..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-5 pl-16 pr-6 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all shadow-xl shadow-slate-200/50"
              />
          </div>
        </motion.div>

        {/* TIMELINE */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-10 top-0 bottom-0 w-px bg-slate-200 hidden md:block" />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-48 space-y-10">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[10px]">Updating Audit Logs</p>
            </div>
          ) : (
            <div className="space-y-12">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 text-center space-y-8">
                    <History className="text-slate-200" size={80} />
                    <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[10px]">No records found.</p>
                  </motion.div>
                ) : filtered.map((ev, i) => {
                  const conf = typeConfig[ev.type] || typeConfig.REQUEST;
                  const Icon = conf.icon;
                  return (
                    <motion.div 
                      key={ev._id} 
                      {...viewTransition}
                      transition={{ ...viewTransition.transition, delay: i * 0.05 }}
                      className="relative md:pl-28"
                    >
                      {/* Timeline Icon */}
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-20 h-20 rounded-[1.8rem] bg-white border border-slate-100 hidden md:flex items-center justify-center z-10 shadow-xl shadow-slate-200/50 transition-transform hover:scale-110 duration-500`}>
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${conf.bg.replace('/10', '/5')} ${conf.color.replace('cyan', 'blue').replace('emerald', 'green').replace('rose', 'red').replace('amber', 'orange')} shadow-inner`}>
                            <Icon size={24} />
                         </div>
                      </div>

                      {/* Main Card */}
                      <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 group relative hover:border-blue-500/20 transition-all duration-700 overflow-hidden">
                         
                         {/* Header Section */}
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10 mb-10 pb-10 border-b border-slate-50">
                            <div className="flex items-center gap-6">
                               <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-100 ${conf.color.replace('cyan', 'blue').replace('emerald', 'green').replace('rose', 'red').replace('amber', 'orange')}`}>
                                  {ev.type}
                               </div>
                               <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                  <Clock size={14} /> {new Date(ev.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                            {ev.txHash && (
                              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-sm truncate max-w-[300px]">
                                 <Activity size={14} className="text-blue-500" />
                                 <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight truncate">
                                    {ev.txHash}
                                 </span>
                              </div>
                            )}
                         </div>

                         {/* Content Section */}
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
                            <div className="space-y-4">
                               <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                  {ev.studentName || 'Confidential'}
                                </h3>
                               <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Issuing Institution</span>
                                  <div className="h-3 w-px bg-slate-100" />
                                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">{ev.universityName || 'EduCred Network'}</span>
                               </div>
                            </div>
                            
                            {ev.certificateId && (
                              <Link to={`/student/${ev.certificateId}`} className="btn-primary !px-10 !py-4 shadow-blue-500/10 shrink-0">
                                 Verification Proof
                                 <ArrowRight size={18} />
                              </Link>
                            )}
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* NETWORK FOOTER */}
        <footer className="pt-32 text-center space-y-8 relative z-10">
           <div className="h-px w-16 bg-slate-200 mx-auto" />
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] max-w-2xl mx-auto leading-relaxed opacity-60">
              Audit logs are synchronized in real-time with the global blockchain. All records are cryptographically secured and immutable.
           </p>
           <div className="flex justify-center gap-16 grayscale opacity-20 text-slate-400">
              <Globe size={18} />
              <Cpu size={18} />
              <Network size={18} />
           </div>
        </footer>

      </div>
    </div>
  );
}
