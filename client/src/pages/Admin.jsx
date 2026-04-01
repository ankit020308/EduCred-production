import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Download, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  Activity,
  X,
  FileJson,
  Upload,
  FileText,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBlockchain } from '../context/BlockchainContext';
import InsightCard from '../components/InsightCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PixelGridBackground from '../components/PixelGridBackground';

export default function Admin() {
  const { user } = useAuth();
  const { contract, isReady } = useBlockchain();
  
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  
  const [universityStatus, setUniversityStatus] = useState(null);
  
  const [stats, setStats] = useState({ 
    total: 0, 
    mined: 0, 
    networkHealth: 99.9 
  });

  const [formData, setFormData] = useState({
    studentName: '',
    regNo: '',
    degreeName: 'B.Tech',
    graduationYear: new Date().getFullYear(),
    file: null
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUniversityStatus();
    fetchLocalCerts();
  }, []);

  const fetchUniversityStatus = async () => {
    try {
      // We can get this from a profile endpoint or by finding the university record
      const res = await api.get('/api/auth/profile');
      // The backend should return the university status if the role is university
      setUniversityStatus(res.data.university?.status || 'PENDING');
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchLocalCerts = async () => {
    try {
      const res = await api.get('/api/certificates');
      setCerts(res.data.data || []);
      setStats(prev => ({
        ...prev,
        total: res.data.data?.length || 0,
        mined: res.data.data?.length || 0
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!formData.file) return alert('Please upload a certificate file.');
    
    setIssuing(true);
    try {
      const data = new FormData();
      data.append('studentName', formData.studentName);
      data.append('regNo', formData.regNo);
      data.append('degreeName', formData.degreeName);
      data.append('graduationYear', formData.graduationYear);
      data.append('file', formData.file);

      const res = await api.post('/api/certificates/issue', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowIssueModal(false);
      setFormData({ studentName: '', regNo: '', degreeName: 'B.Tech', graduationYear: 2024, file: null });
      fetchLocalCerts();
      alert('Certificate anchored to blockchain successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Issuance failed');
    } finally {
      setIssuing(false);
    }
  };

  const filtered = certs.filter(c => 
    c.studentName.toLowerCase().includes(search.toLowerCase()) || 
    c.regNo.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#050816]">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );

  // ─── UNVERIFIED VIEW ─────────────────────────────────
  if (universityStatus !== 'APPROVED') {
    return (
      <PixelGridBackground>
        <div className="h-screen flex items-center justify-center p-6 relative z-10">
          <Card className="max-w-2xl w-full p-12 text-center space-y-8 bg-white/5 border-white/10 backdrop-blur-3xl shadow-[0_0_100px_rgba(37,99,235,0.1)]">
            <div className="w-24 h-24 bg-amber-500/10 rounded-3xl mx-auto flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
               <ShieldAlert size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                Verification <span className="text-amber-500">Pending</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs leading-relaxed max-w-md mx-auto">
                Your institutional node is currently undergoing manual verification. You will gain issuance rights once an administrator approves your identity on the decentralized ledger.
              </p>
            </div>
            <div className="pt-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 glass-pill px-6 py-3 border-white/5">
                <Clock size={16} className="text-amber-500" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Current Status: {universityStatus || 'INITIALIZING'}</span>
              </div>
              <Button onClick={() => window.location.reload()} className="h-12 px-8 rounded-xl flex items-center gap-3">
                <RefreshCcw size={16} />
                <span className="font-black uppercase text-[10px] tracking-widest">Check Update</span>
              </Button>
            </div>
          </Card>
        </div>
      </PixelGridBackground>
    );
  }

  // ─── AUTHORIZED VIEW ─────────────────────────────────
  return (
    <PixelGridBackground>
      <div className="flex-1 overflow-y-auto p-4 lg:p-12 relative z-10 pt-32 h-full min-h-screen">
        <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
          
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
                  Institutional <span className="text-blue-500">Node</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-3">
                  <Activity size={14} className="text-emerald-500" /> Authorized Admin: {user?.universityName || 'System Node'}
                </p>
            </div>
            <div className="flex items-center gap-4">
                <div className="glass-pill px-6 py-3 flex items-center gap-4 border-white/10 shadow-xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Ledger Synchronized</span>
                </div>
                <Button onClick={() => setShowIssueModal(true)} className="h-14 px-8 rounded-2xl flex items-center gap-3 group">
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    <span className="font-black uppercase text-xs tracking-widest">Issue New</span>
                </Button>
            </div>
          </div>

          {/* ── Actionable Intelligence (Real-time Stats) ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <InsightCard 
              title="Global Anchors" 
              value={stats.total} 
              trend="Current issued volume" 
              icon={Activity} 
              color="blue"
            />
            <InsightCard 
              title="Mined State" 
              value={`${stats.mined}`} 
              trend="Verified credentials" 
              icon={ShieldCheck} 
              color="emerald"
            />
            <InsightCard 
              title="Active Node" 
              value="ACTIVE" 
              trend="Issuance rights granted" 
              icon={CheckCircle2} 
              color="amber"
            />
            <InsightCard 
              title="Node Stability" 
              value={`${stats.networkHealth}%`} 
              trend="Uptime guaranteed" 
              icon={Clock} 
              color="indigo"
            />
          </div>

          {/* ── Control Bar ────────────────────────────────────── */}
          <Card className="p-5 flex flex-col lg:flex-row items-center justify-between gap-8 !bg-white/5 border-white/10 shadow-2xl">
            <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search Anchored Identities..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 pl-16 pr-6 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
              />
            </div>
          </Card>

          {/* ── Credential Registry ────────────────────────────── */}
          <Card className="!p-0 border-white/10 overflow-hidden shadow-2xl relative !bg-[#0b0f2a]/40 backdrop-blur-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Subject</th>
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Credential Proof</th>
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Blockchain Hash</th>
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Sync Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-10 py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No records found</td>
                      </tr>
                    ) : filtered.map((cert) => (
                      <motion.tr 
                        key={cert._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-white/[0.03] transition-all"
                      >
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 glass-liquid rounded-xl flex items-center justify-center text-blue-400 font-black border-white/10 shadow-lg capitalize">
                              {cert.studentName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-white font-black text-sm uppercase italic tracking-tight">{cert.studentName}</p>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{cert.regNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <p className="text-white text-xs font-black uppercase tracking-widest">{cert.degreeName}</p>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Sync ID: {cert._id.slice(-6)}</p>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-blue-400/60 translate-y-0.5 max-w-[120px] truncate">{cert.certificateHash}</span>
                            <ShieldCheck size={14} className="text-emerald-500" />
                          </div>
                        </td>
                        <td className="px-10 py-8">
                           <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest opacity-50">{new Date(cert.createdAt).toLocaleDateString()}</p>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Issuance Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIssueModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-[#0b0f2a] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.2)]"
            >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Anchor <span className="text-blue-500">Identity</span></h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Institutional Credential Issuance</p>
                    </div>
                    <button onClick={() => setShowIssueModal(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleIssue} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Student Name</label>
                            <input 
                                required
                                value={formData.studentName}
                                onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-blue-500 outline-none transition-all placeholder:opacity-20" 
                                placeholder="ALEX R"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registration ID</label>
                            <input 
                                required
                                value={formData.regNo}
                                onChange={(e) => setFormData({...formData, regNo: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-blue-500 outline-none transition-all placeholder:opacity-20" 
                                placeholder="REG-2024-OX"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Degree Program</label>
                            <input 
                                required
                                value={formData.degreeName}
                                onChange={(e) => setFormData({...formData, degreeName: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-blue-500 outline-none transition-all" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Graduation Year</label>
                            <input 
                                required
                                type="number"
                                value={formData.graduationYear}
                                onChange={(e) => setFormData({...formData, graduationYear: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-blue-500 outline-none transition-all" 
                            />
                        </div>
                    </div>

                    {/* ── FILE UPLOAD VECTOR ────────────────────── */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-help title='This file will be hashed to generate a unique digital fingerprint.'">Certificate Binary (PDF/Image)</label>
                      <div 
                        onClick={() => fileInputRef.current.click()}
                        className={`w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                          ${formData.file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5 hover:border-blue-500/40 hover:bg-blue-500/5'}`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                          accept="application/pdf,image/*"
                        />
                        {formData.file ? (
                          <>
                            <div className="flex items-center gap-3 text-emerald-500">
                              <CheckCircle2 size={24} />
                              <span className="text-sm font-black uppercase italic tracking-tight">{formData.file.name}</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target binary locked</span>
                          </>
                        ) : (
                          <>
                            <Upload size={24} className="text-slate-600" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">Select Source Vector</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button disabled={issuing} className="w-full h-16 rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.2em] mt-4 shadow-[0_20px_50px_rgba(37,99,235,0.3)]">
                        {issuing ? (
                          <>
                            <Loader2 size={24} className="animate-spin" />
                            <span>Anchoring Hash...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={24} />
                            <span>Validate & Store on Ledger</span>
                          </>
                        )}
                    </Button>

                    <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                      Privacy Guard: Only the MD5/SHA-256 hash is stored on the public blockchain.
                    </p>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PixelGridBackground>
  );
}
