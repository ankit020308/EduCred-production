import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Loader2,
  RefreshCcw,
  ExternalLink,
  ShieldAlert,
  Activity,
  Zap,
  Globe
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export default function SystemAdmin() {
  const { user } = useAuth();
  
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/universities/all');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await api.post(`/api/universities/${action}/${id}`);
      fetchUniversities();
    } catch (err) {
      alert(`Action failed: ${err.response?.data?.error || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = universities.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'ALL' || u.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: universities.length,
    pending: universities.filter(u => u.status === 'PENDING').length,
    approved: universities.filter(u => u.status === 'APPROVED').length,
    rejected: universities.filter(u => u.status === 'REJECTED').length
  };

  if (loading && universities.length === 0) return (
    <div className="h-screen flex items-center justify-center bg-[#010409]">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-600 font-bold uppercase tracking-[0.5em] text-[10px] italic">Synchronizing Governance Matrix</p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND: Neural-Link Mesh */}
      <BlockchainBackground />

      {/* AMBIENT GLOWS */}
      <div className="absolute inset-x-0 top-0 h-[600px] z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-indigo-600/5 blur-[200px] rounded-full" />
      </div>

      <div className="container max-w-[1400px] mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">
        
        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-none italic uppercase">
                Governance <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-glow-emissive">Node.</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <ShieldCheck size={14} className="text-indigo-400" /> Root Authority: {user?.name || 'System Sovereign'}
              </p>
          </div>
          <button 
            onClick={fetchUniversities} 
            className="h-14 px-8 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md flex items-center gap-4 text-white hover:bg-white/[0.08] transition-all group"
          >
              <RefreshCcw size={20} className={`${loading ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform`} />
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Sync Registry</span>
          </button>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Consolidated Nodes", val: stats.total, icon: Users, color: "text-indigo-400" },
            { label: "Awaiting Trust", val: stats.pending, icon: Clock, color: "text-amber-400" },
            { label: "Authorized Issuers", val: stats.approved, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Deny Listed", val: stats.rejected, icon: ShieldAlert, color: "text-rose-400" }
          ].map((s, i) => (
            <motion.div 
              key={i}
              {...viewTransition}
              transition={{ ...viewTransition.transition, delay: i * 0.05 }}
              className="glass-card p-10 border border-white/5 animate-levitate text-center flex flex-col items-center"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <s.icon className={`mb-6 ${s.color}`} size={28} />
              <span className="text-4xl font-bold text-white tracking-tighter mb-1">{s.val}</span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* REGISTRY WORKSPACE */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="space-y-8">
          
          {/* CONTROLS */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/5 shadow-2xl">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                    ${filter === f ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-96 group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/search:text-indigo-500 transition-colors" size={20} />
              <input 
                placeholder="SEARCH PUBLIC KEYS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-[11px] font-bold tracking-widest text-white outline-none focus:border-indigo-500/40 transition-all uppercase placeholder:text-slate-800"
              />
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="glass-card !p-0 border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600 bg-white/[0.01]">
                    <th className="px-10 py-8">Institutional Identity</th>
                    <th className="px-10 py-8">Protocol Status</th>
                    <th className="px-10 py-8">Application Context</th>
                    <th className="px-10 py-8 text-right">Execute Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-10 py-32 text-center text-slate-700 font-bold uppercase tracking-[0.5em] text-[10px]">No ledger mappings found in this cycle</td>
                      </tr>
                    ) : filtered.map((uni) => (
                      <motion.tr 
                        key={uni._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-10 py-10">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold border border-white/5 shadow-inner transition-transform group-hover:scale-105
                              ${uni.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 
                                uni.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {uni.name.charAt(0)}
                            </div>
                            <div className="space-y-1">
                                <p className="text-white font-bold text-sm tracking-tight uppercase italic flex items-center gap-3">
                                  {uni.name}
                                  {uni.isFlagged && <ShieldAlert size={16} className="text-rose-500 animate-pulse" />}
                                </p>
                                <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">
                                  {uni.email}
                                </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-10">
                          <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md
                            ${uni.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                              uni.status === 'REJECTED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                            {uni.status === 'PENDING' && <Clock size={12} className="animate-pulse" />}
                            {uni.status === 'APPROVED' && <CheckCircle2 size={12} />}
                            {uni.status === 'REJECTED' && <XCircle size={12} />}
                            {uni.status}
                          </div>
                      </td>
                        <td className="px-10 py-10">
                          <div className="max-w-xs space-y-4">
                            <p className="text-slate-500 text-[10px] font-medium leading-relaxed italic line-clamp-2">
                               {uni.description || 'No institutional context provided.'}
                            </p>
                            {uni.documents?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {uni.documents.map((doc, idx) => (
                                  <a key={idx} href={doc} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border-b border-indigo-400/30 transition-all">
                                    <ExternalLink size={10} /> Manifest-{idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-10 text-right">
                           <div className="flex items-center justify-end gap-4">
                              {uni.status === 'PENDING' ? (
                                <>
                                  <button 
                                    onClick={() => handleAction(uni._id, 'approve')}
                                    disabled={processingId === uni._id}
                                    className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                  >
                                    {processingId === uni._id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                  </button>
                                  <button 
                                    onClick={() => handleAction(uni._id, 'reject')}
                                    disabled={processingId === uni._id}
                                    className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                  >
                                    {processingId === uni._id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={20} />}
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-3 text-slate-700">
                                   <Zap size={14} className="opacity-20" />
                                   <span className="text-[9px] font-black uppercase tracking-[0.3em] italic">Finalized Action</span>
                                </div>
                              )}
                           </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* NETWORK STATUS FOOTER */}
        <footer className="pt-24 text-center space-y-10 relative z-10">
           <div className="h-px w-24 bg-white/10 mx-auto" />
           <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.5em] max-w-2xl mx-auto leading-loose italic opacity-40">
              Protocol Governance achieved via distributed consensus. All administrative actions are recorded with SHA-256 for permanent auditability.
           </p>
           <div className="flex justify-center gap-16 grayscale opacity-10">
              <Globe size={18} />
              <Activity size={18} />
              <Globe size={18} />
           </div>
        </footer>

      </div>
    </div>
  );
}
