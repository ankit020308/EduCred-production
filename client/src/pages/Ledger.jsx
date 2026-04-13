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

// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

// ─── Refined Ledger logic for Sapphire ───
const typeConfig = {
  ISSUE:   { icon: ShieldCheck, color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-white/10' },
  VERIFY:  { icon: Search,      color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-white/10' },
  REQUEST: { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-white/10' },
  APPROVE: { icon: UserCheck,   color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-white/10' },
  REJECT:  { icon: XCircle,     color: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-white/10' },
  TAMPER:  { icon: FileWarning, color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-white/10' },
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
    <div className="relative min-h-screen bg-[#000000] text-slate-300 overflow-x-hidden selection:bg-blue-500/30 font-sans">
      
      <BlockchainBackground />

      <div className="container max-w-5xl mx-auto px-6 pt-40 pb-24 relative z-10 space-y-16">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md animate-levitate shadow-xl shadow-blue-500/5">
              <Network className="text-blue-400" size={16} />
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em]">Global Protocol Consensus</span>
            </div>
            <h1 className="text-6xl md:text-[5.5rem] font-bold text-white tracking-tighter leading-none">
              Public <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent glow-blue">Ledger.</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl leading-relaxed">
              Live cryptographic event stream across the decentralized network of nodes.
            </p>
          </div>
          
          <div className="relative w-full md:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                placeholder="SEARCH TRANSMISSION..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-[10px] font-bold tracking-widest text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-800 uppercase"
              />
          </div>
        </motion.div>

        {/* TIMELINE */}
        <div className="relative">
          <div className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-white/5 to-transparent hidden md:block" />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-48 space-y-8 animate-pulse">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <p className="text-slate-600 font-bold uppercase tracking-[0.5em] text-[10px] italic">Synchronizing Ledger Consensus</p>
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

                      <div className="glass-pane p-10 border border-white/5 group relative hover:border-blue-500/20 transition-all duration-700">
                         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[100px] pointer-events-none group-hover:bg-blue-600/10 transition-all duration-1000" />
                         
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10 mb-10 pb-8 border-b border-white/5">
                            <div className="flex items-center gap-6">
                               <div className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] ${conf.bg} ${conf.color}`}>
                                  {ev.type}
                               </div>
                               <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                                  <Clock size={12} /> {new Date(ev.createdAt).toLocaleString()}
                               </span>
                            </div>
                            {ev.txHash && (
                              <div className="flex items-center gap-4 group/tx cursor-help">
                                 <Activity size={14} className="text-blue-500/40 group-hover/tx:text-blue-400 group-hover/tx:animate-pulse transition-colors" />
                                 <span className="text-[10px] font-mono text-blue-500/20 group-hover/tx:text-blue-400 transition-colors uppercase tracking-[0.2em] italic truncate max-w-[280px]">
                                    TXID: {ev.txHash.slice(0, 48)}...
                                 </span>
                              </div>
                            )}
                         </div>

                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
                            <div className="space-y-4">
                               <p className="text-3xl font-bold text-white tracking-tighter uppercase italic leading-none">
                                  {ev.studentName || 'PROTOCOL SECRET'}
                                </p>
                               <div className="flex items-center gap-4 text-slate-500">
                                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">Issuer Authority</span>
                                  <div className="h-4 w-px bg-white/5" />
                                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{ev.universityName || 'Network Hub'}</span>
                               </div>
                            </div>
                            
                            {ev.certificateId && (
                              <Link to={`/student/${ev.certificateId}`}>
                                 <button className="flex items-center gap-5 px-8 pt-4 pb-3.5 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all duration-500 group/btn shadow-[0_0_40px_rgba(255,255,255,0.05)] border border-transparent active:scale-95">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Audit Proof</span>
                                    <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" />
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
