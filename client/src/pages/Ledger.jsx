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
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import PixelGridBackground from '../components/PixelGridBackground';

const typeConfig = {
  ISSUE:   { icon: ShieldCheck, color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-500/20' },
  VERIFY:  { icon: Search,      color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20' },
  REQUEST: { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/20' },
  APPROVE: { icon: UserCheck,   color: 'text-green-400',   bg: 'bg-green-400/10',   border: 'border-green-500/20' },
  REJECT:  { icon: XCircle,     color: 'text-rose-400',    bg: 'bg-rose-400/10',    border: 'border-rose-500/20' },
  TAMPER:  { icon: FileWarning, color: 'text-violet-400',  bg: 'bg-violet-400/10',  border: 'border-violet-500/20' },
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
    <PixelGridBackground>
      <div className="flex-1 overflow-y-auto px-6 py-20 relative z-10 pt-32 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-16">
          
          {/* Header ── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Network className="text-blue-500" size={24} />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Global Protocol Consensus</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-none">
                Public <span className="text-blue-500">Ledger</span>
              </h1>
              <p className="text-slate-500 text-lg font-medium tracking-tight">
                Live cryptographic event stream across all institutional nodes.
              </p>
            </div>
            
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  placeholder="SEARCH ID, NODE, OR HASH..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white text-xs font-black tracking-widest outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800"
                />
            </div>
          </div>

          <div className="relative">
            {/* Timeline Vertical Axis */}
            <div className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-white/5 to-transparent hidden md:block" />

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 space-y-6">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Blockchain State</p>
              </div>
            ) : (
              <div className="space-y-12">
                <AnimatePresence>
                  {filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                      <History className="text-slate-800" size={64} />
                      <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">No entries detected in the consensus layer.</p>
                    </motion.div>
                  ) : filtered.map((ev, i) => {
                    const conf = typeConfig[ev.type] || typeConfig.REQUEST;
                    const Icon = conf.icon;
                    return (
                      <motion.div 
                        key={ev._id} 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.05 }}
                        className="relative md:pl-28"
                      >
                        {/* Status Hub (Floating Node) */}
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-20 h-20 rounded-[1.5rem] bg-[#050816] border hidden md:flex items-center justify-center z-10 shadow-2xl transition-transform hover:scale-110 duration-500 ${conf.border}`}>
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${conf.bg} ${conf.color}`}>
                              <Icon size={24} />
                           </div>
                        </div>

                        <Card className="p-8 md:p-10 !bg-[#0b0f2a]/40 backdrop-blur-3xl border-white/10 group relative transition-all duration-700 hover:border-white/20">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] pointer-events-none group-hover:bg-blue-600/10 transition-all duration-1000" />
                           
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 mb-8 pb-8 border-b border-white/5">
                              <div className="flex items-center gap-4">
                                 <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-inner ${conf.bg} ${conf.color}`}>
                                    {ev.type}
                                 </div>
                                 <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12} /> {new Date(ev.createdAt).toLocaleString()}
                                 </span>
                              </div>
                              {ev.txHash && (
                                <div className="flex items-center gap-3">
                                   <Activity size={14} className="text-blue-500 animate-pulse" />
                                   <span className="text-[10px] font-black font-space text-blue-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                                      TX: {ev.txHash.slice(0, 32)}...
                                   </span>
                                </div>
                              )}
                           </div>

                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                              <div className="space-y-4">
                                 <p className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                                    {ev.studentName || 'Identity Secret'}
                                 </p>
                                 <div className="flex items-center gap-3 text-slate-500">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Institutional Anchor:</span>
                                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest italic">{ev.universityName || 'Global Node'}</span>
                                 </div>
                              </div>
                              
                              {ev.certificateId && (
                                <Link to={`/student/${ev.certificateId}`}>
                                   <button className="flex items-center gap-4 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all duration-500 group/btn">
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">View Proof</span>
                                      <ArrowRight size={16} className="group-hover/btn:translate-x-2 transition-transform" />
                                   </button>
                                </Link>
                              )}
                           </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
          
          <footer className="pt-20 text-center space-y-8">
             <div className="h-px w-32 bg-white/5 mx-auto" />
             <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em] max-w-xl mx-auto leading-loose italic">
                Consensus achieved across 512+ global institutional nodes. All entries are hashed with SHA-256 for permanent cryptographic auditability. Distributed by EduCred Network.
             </p>
          </footer>
        </div>
      </div>
    </PixelGridBackground>
  );
}
