import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  ShieldCheck, 
  Loader2, 
  Clock,
  CheckCircle2,
  Activity,
  X,
  Upload,
  ShieldAlert,
  ArrowRight,
  RefreshCcw,
  Zap,
  Cpu
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

export default function Admin() {
  const { user } = useAuth();
  
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [universityStatus, setUniversityStatus] = useState(null);
  const [stats, setStats] = useState({ total: 0, mined: 0, health: 99.9 });

  const [formData, setFormData] = useState({ studentName: '', course: '', file: null });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUniversityStatus();
    fetchLocalCerts();
  }, []);

  const fetchUniversityStatus = async () => {
    try {
      const res = await api.get('/api/auth/profile');
      setUniversityStatus(res.data.university?.status || 'PENDING');
    } catch (err) { console.error(err); }
  };

  const fetchLocalCerts = async () => {
    try {
      const res = await api.get('/api/certificates');
      const data = res.data.data || [];
      setCerts(data);
      setStats(prev => ({ ...prev, total: data.length, mined: data.length }));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!formData.file) return;
    setIssuing(true);
    try {
      const data = new FormData();
      data.append('studentName', formData.studentName);
      data.append('course', formData.course);
      data.append('file', formData.file);
      await api.post('/api/certificates/issue', data);
      setShowIssueModal(false);
      setFormData({ studentName: '', course: '', file: null });
      fetchLocalCerts();
    } catch (err) { alert(err.response?.data?.error || 'Issuance failed'); } finally { setIssuing(false); }
  };

  const filtered = certs.filter(c => 
    c.studentName.toLowerCase().includes(search.toLowerCase()) || 
    c.course.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#010409]">
      <Loader2 className="animate-spin text-indigo-500" size={48} />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND */}
      <BlockchainBackground />

      {/* ── UNVERIFIED VIEW ───────────────────────────────── */}
      {universityStatus !== 'APPROVED' ? (
        <div className="h-screen flex items-center justify-center p-6 relative z-10">
          <motion.div {...viewTransition} className="glass-card max-w-xl w-full p-12 text-center space-y-8 border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl mx-auto flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-xl shadow-amber-500/10 animate-levitate">
               <ShieldAlert size={40} />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-white tracking-tighter">Identity <span className="text-amber-500">Pending.</span></h1>
              <p className="text-slate-500 text-sm font-medium leading-relaxed italic">
                Your institutional node is currently undergoing manual verification by the EduCred network. 
                Full issuance rights will be granted upon consensus.
              </p>
            </div>
            <div className="pt-6 flex flex-col items-center gap-4">
              <div className="px-6 py-2 rounded-full bg-white/[0.03] border border-white/5 flex items-center gap-3">
                <Clock size={14} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status: {universityStatus}</span>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="bg-white text-black px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={14} /> Synchronize Update
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        /* ── AUTHORIZED DASHBOARD ─────────────────────────────── */
        <div className="container max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">
          
          {/* HEADER */}
          <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-none">
                  Authority <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-glow-emissive">Node.</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                  <Activity size={14} className="text-emerald-500 animate-pulse" /> {user?.universityName || 'Institutional Admin'}
                </p>
            </div>
            <div className="flex items-center gap-5">
                <div className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Sync Active</span>
                </div>
                <button 
                  onClick={() => setShowIssueModal(true)}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Issue Protocol
                </button>
            </div>
          </motion.div>

          {/* INSIGHTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Activity, label: "Total Anchors", val: stats.total, color: "text-indigo-400" },
              { icon: ShieldCheck, label: "Mined Proofs", val: stats.mined, color: "text-emerald-400" },
              { icon: Zap, label: "Network State", val: "ACTIVE", color: "text-amber-400" },
              { icon: Cpu, label: "Node Vitality", val: `${stats.health}%`, color: "text-purple-400" }
            ].map((s, i) => (
              <motion.div 
                key={i}
                {...viewTransition}
                transition={{ ...viewTransition.transition, delay: i * 0.05 }}
                className="glass-card p-8 border border-white/5 flex flex-col items-center text-center animate-levitate"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <s.icon className={`mb-6 ${s.color}`} size={28} />
                <span className="text-3xl font-black text-white tracking-tighter mb-1">{s.val}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* REGISTRY */}
          <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }}>
            <div className="glass-card !p-0 border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Institutional Ledger Registry</h3>
                <div className="relative group/search">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/search:text-indigo-500 transition-colors" size={14} />
                  <input 
                    placeholder="SEARCH PROTOCOL..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-6 text-[10px] font-bold tracking-widest text-white outline-none focus:border-indigo-500/40 w-64 uppercase"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600">
                      <th className="px-10 py-6">Identity Subject</th>
                      <th className="px-10 py-6">Course / Mapping</th>
                      <th className="px-10 py-6 text-center">Cryptographic Proof</th>
                      <th className="px-10 py-6 text-right">Anchor Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((cert) => (
                      <tr key={cert._id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-10 py-7">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-bold border border-white/5 shadow-inner">
                              {cert.studentName.charAt(0)}
                            </div>
                            <span className="text-white font-bold text-xs tracking-tight uppercase">{cert.studentName}</span>
                          </div>
                        </td>
                        <td className="px-10 py-7">
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{cert.course}</span>
                        </td>
                        <td className="px-10 py-7">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-[9px] font-mono text-indigo-400/50 truncate max-w-[120px]">{cert.certificateHash}</span>
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          </div>
                        </td>
                        <td className="px-10 py-7 text-right">
                          <span className="text-slate-600 text-[10px] font-bold italic">{new Date(cert.createdAt).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ISSUANCE MODAL */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowIssueModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="relative w-full max-w-xl glass-card border border-white/10 overflow-hidden shadow-3xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div>
                   <h2 className="text-2xl font-bold text-white tracking-tighter">Issue <span className="text-indigo-500">Asset.</span></h2>
                   <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">Institutional Proof Integration</p>
                </div>
                <button onClick={() => setShowIssueModal(false)} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-600 transition-colors">
                   <X size={20} />
                </button>
              </div>

              <form onSubmit={handleIssue} className="p-10 space-y-6">
                <div className="space-y-5">
                  <input 
                    placeholder="FULL IDENTITY NAME"
                    required
                    value={formData.studentName}
                    onChange={(e) => setFormData({...formData, studentName: e.target.value.toUpperCase()})}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none focus:border-indigo-500/50"
                  />
                  <input 
                    placeholder="COURSE / PROGRAM MAPPING"
                    required
                    value={formData.course}
                    onChange={(e) => setFormData({...formData, course: e.target.value.toUpperCase()})}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none focus:border-indigo-500/50"
                  />
                  
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className={`w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
                      ${formData.file ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 bg-white/[0.01] hover:border-indigo-500/30 hover:bg-white/[0.03]'}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={(e) => setFormData({...formData, file: e.target.files[0]})} className="hidden" />
                    {formData.file ? (
                      <div className="flex items-center gap-3 text-emerald-500">
                        <CheckCircle2 size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{formData.file.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-600" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] underline decoration-indigo-500 decoration-2 underline-offset-4">Select Binary Source</span>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  disabled={issuing || !formData.file}
                  className="w-full bg-white text-black py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-slate-200 active:scale-95 shadow-xl shadow-white/5 disabled:opacity-50"
                >
                  {issuing ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Anchor to Ledger'}
                </button>
                <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-widest grayscale mt-4">
                  Privacy Guard: Only the cryptographically recomputed hash is anchored for consensus.
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
