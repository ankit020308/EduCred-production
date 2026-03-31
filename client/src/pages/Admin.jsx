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
  FileJson
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
  
  const [stats, setStats] = useState({ 
    total: 0, 
    accepted: 0, 
    pending: 0, 
    rejected: 0, 
    acceptanceRate: 0, 
    networkHealth: 99.9 
  });

  const [formData, setFormData] = useState({
    studentName: '',
    regNo: '',
    degreeName: 'B.Tech',
    branch: 'Computer Science',
    graduationYear: new Date().getFullYear(),
    cgpa: ''
  });

  // ─── Real-Time Blockchain Sync ───────────────────────
  useEffect(() => {
    if (!contract || !isReady) return;

    // 1. Initial Fetch (Sync state with Chain)
    const syncStats = async () => {
        try {
            const count = await contract.getApplicationsCount();
            let accepted = 0;
            let rejected = 0;
            let pending = 0;

            for (let i = 0; i < Number(count); i++) {
                const app = await contract.applications(i);
                if (app.status === 0) pending++;
                else if (app.status === 1) accepted++;
                else if (app.status === 2) rejected++;
            }

            setStats(prev => ({
                ...prev,
                pending,
                accepted,
                rejected,
                total: Number(count), // Total Application Events
                acceptanceRate: Number(count) > 0 ? ((accepted / (accepted + rejected || 1)) * 100).toFixed(1) : 0
            }));
        } catch (err) {
            console.error("Sync Error:", err);
        }
    };

    syncStats();

    // 2. Real-time Event Listeners (Reactive UI)
    const handleIssued = (hash) => {
        console.log("🔔 New Certificate Anchored:", hash);
        // We can't easily get the count of issued certs without a mapping iteration or a counter
        // For this demo, we'll just refresh local list
        fetchLocalCerts();
    };

    const handleStatusUpdate = (id, status) => {
        console.log(`🔔 Application ${id} status updated to ${status}`);
        syncStats(); // Refresh stats when application status changes
    };

    contract.on("CertificateIssued", handleIssued);
    contract.on("ApplicationStatusUpdated", handleStatusUpdate);

    return () => {
        contract.off("CertificateIssued", handleIssued);
        contract.off("ApplicationStatusUpdated", handleStatusUpdate);
    };
  }, [contract, isReady]);

  useEffect(() => {
    fetchLocalCerts();
  }, []);

  const fetchLocalCerts = async () => {
    try {
      const res = await api.get('/api/certificates');
      setCerts(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setIssuing(true);
    try {
      const res = await api.post('/api/certificates/issue', formData);
      
      // Auto-download the credential JSON
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.credential));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${formData.studentName}_Credential.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      setShowIssueModal(false);
      setFormData({ studentName: '', regNo: '', degreeName: 'B.Tech', branch: 'Computer Science', graduationYear: 2024, cgpa: '' });
      fetchLocalCerts();
    } catch (err) {
      alert(err.response?.data?.details || 'Issuance failed');
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
              value={certs.length} 
              trend="Current issued volume" 
              icon={Activity} 
              color="blue"
            />
            <InsightCard 
              title="Acceptance Yield" 
              value={`${stats.acceptanceRate}%`} 
              trend="Verified credentials" 
              icon={TrendingUp} 
              color="emerald"
            />
            <InsightCard 
              title="Active Applications" 
              value={stats.pending} 
              trend="Pending verification" 
              icon={Clock} 
              color="amber"
            />
            <InsightCard 
              title="Node Stability" 
              value={`${stats.networkHealth}%`} 
              trend="Uptime guaranteed" 
              icon={ShieldCheck} 
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
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{cert.branch}</p>
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
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-blue-500 outline-none transition-all" 
                                placeholder="ALEXR"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registration ID</label>
                            <input 
                                required
                                value={formData.regNo}
                                onChange={(e) => setFormData({...formData, regNo: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-blue-500 outline-none transition-all" 
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
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic CGPA</label>
                            <input 
                                required
                                type="number"
                                step="0.01"
                                value={formData.cgpa}
                                onChange={(e) => setFormData({...formData, cgpa: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:border-blue-500 outline-none transition-all" 
                                placeholder="9.8"
                            />
                        </div>
                    </div>

                    <Button disabled={issuing} className="w-full h-16 rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.2em] mt-4">
                        {issuing ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                <span>Anchoring to Mainnet...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={24} />
                                <span>Validate & Issue Credential</span>
                            </>
                        )}
                    </Button>

                    <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                        This action will anchor only the cryptographic hash to the ledger.
                    </p>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PixelGridBackground>
  );
}

