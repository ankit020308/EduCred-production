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
    <div className="relative min-h-screen bg-[#000000] text-slate-300 overflow-x-hidden selection:bg-cyan-500/30 font-sans">
      
      <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
        <BlockchainBackground />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      <div className="container max-w-5xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <Network className="text-cyan-400" size={16} />
              <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Global Protocol Consensus</span>
            </div>
            <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              Distributed <span className="text-cyan-400">Ledger.</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] max-w-xl leading-relaxed">
              Real-time cryptographic heartbeat of the sovereign identity network.
            </p>
          </div>
          
          <div className="relative w-full md:w-96 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input 
                placeholder="SEARCH TRANSMISSION..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#050505] border border-white/10 rounded-[1.5rem] py-6 pl-16 pr-6 text-[10px] font-black tracking-[0.2em] text-white outline-none focus:border-cyan-400/40 transition-all placeholder:text-slate-900 uppercase shadow-inner"
              />
          </div>
        </motion.div>

        {/* TIMELINE */}
        <div className="relative">
          <div className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-white/5 to-transparent hidden md:block" />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-48 space-y-10">
              <Loader2 className="animate-spin text-cyan-400" size={48} />
              <p className="text-slate-800 font-black uppercase tracking-[0.5em] text-[10px]">Synchronizing Protocol State</p>
            </div>
          ) : (
            <div className="space-y-12">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 text-center space-y-8 opacity-40">
                    <History className="text-slate-800" size={80} />
                    <p className="text-slate-600 font-black uppercase tracking-[0.5em] text-[10px]">No ledger events resolved in this cycle.</p>
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
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-20 h-20 rounded-[1.8rem] bg-[#050505] border hidden md:flex items-center justify-center z-10 shadow-3xl transition-transform hover:scale-110 duration-500 ${conf.border}`}>
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${conf.bg} ${conf.color} shadow-inner`}>
                            <Icon size={24} />
                         </div>
                      </div>

                      <div className="glass-pane p-12 rounded-[2.5rem] border border-white/5 group relative hover:border-cyan-400/20 transition-all duration-700 scanline-overlay">
                         <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/5 blur-[100px] pointer-events-none group-hover:bg-cyan-400/10 transition-all duration-1000" />
                         
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10 mb-12 pb-10 border-b border-white/5 bg-[#050505]/40 rounded-t-[1.5rem] -mt-12 -mx-12 p-12">
                            <div className="flex items-center gap-8">
                               <div className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.4em] shadow-inner ${conf.bg} ${conf.color} border ${conf.border}`}>
                                  {ev.type}
                               </div>
                               <span className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                  <Clock size={14} /> {new Date(ev.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                            {ev.txHash && (
                              <div className="flex items-center gap-4 group/tx cursor-help bg-[#080808] px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                                 <Activity size={14} className="text-cyan-400/40 group-hover/tx:text-cyan-400 transition-colors" />
                                 <span className="text-[10px] font-mono text-slate-800 group-hover/tx:text-cyan-400 transition-colors uppercase tracking-[0.1em] truncate max-w-[280px]">
                                    {ev.txHash.slice(0, 40)}...
                                 </span>
                              </div>
                            )}
                         </div>

                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10 p-4">
                            <div className="space-y-4">
                               <p className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                                  {ev.studentName || 'PROTOCOL SECRET'}
                                </p>
                               <div className="flex items-center gap-4 text-slate-500">
                                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800">Origin Authority</span>
                                  <div className="h-4 w-px bg-white/5" />
                                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{ev.universityName || 'Network Hub'}</span>
                               </div>
                            </div>
                            
                            {ev.certificateId && (
                              <Link to={`/student/${ev.certificateId}`}>
                                 <button className="btn-command btn-blue px-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Audit Proof</span>
                                    <ArrowRight size={18} />
                                 </button>
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
        <footer className="pt-32 text-center space-y-10 relative z-10">
           <div className="h-px w-24 bg-white/10 mx-auto" />
           <p className="text-slate-700 text-[10px] font-bold uppercase tracking-[0.5em] max-w-2xl mx-auto leading-loose italic opacity-60">
              Consensus achieved via decentralized verification nodes. All broadcasted hashes are strictly immutable and stored across the EduCred consensus layer.
           </p>
           <div className="flex justify-center gap-20 grayscale opacity-20">
              <Globe size={18} />
              <Cpu size={18} />
              <Network size={18} />
           </div>
        </footer>

      </div>
    </div>
  );
}
