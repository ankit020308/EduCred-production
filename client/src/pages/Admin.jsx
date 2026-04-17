import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ShieldCheck, Loader2, Clock, CheckCircle2,
  Activity, X, Upload, ShieldAlert, ArrowRight, RefreshCcw,
  Zap, Cpu, Fingerprint, Database, Copy, ExternalLink, Check
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';
import StatusBadge from '../components/StatusBadge';
import { ToastProvider, useToast } from '../components/Toast';
import socket, { joinInstitutionalRoom } from '../services/socket.mjs';

// 💠 ANIMATION CONSTANTS
const viewTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

// ─── Inner component (needs access to toast context) ─────────────────────────
function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [universityStatus, setUniversityStatus] = useState(null);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, failed: 0 });
  const [copiedId, setCopiedId] = useState(null);

  const [formData, setFormData] = useState({
    studentName: '', studentEmail: '', studentPhone: '', course: '', file: null
  });
  const [issuedResult, setIssuedResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUniversityStatus();
    fetchLocalCerts();
    fetchStats();

    // ⚡ Socket.io Lifecycle
    if (user?.universityId) {
      socket.connect();
      joinInstitutionalRoom(user.universityId);

      socket.on('certificateIssued', (data) => {
        console.log('⚡ [SOCKET]: Certificate Issued', data);
        fetchLocalCerts();
        fetchStats();
        toast.info(`New ${data.certificateType} issued successfully.`);
      });

      socket.on('certificateConfirmed', (data) => {
        console.log('⚡ [SOCKET]: Certificate Anchored', data);
        fetchLocalCerts();
        fetchStats();
      });

      socket.on('certificateRevoked', (data) => {
        console.log('⚡ [SOCKET]: Certificate Revoked', data);
        fetchLocalCerts();
        fetchStats();
        toast.warning(`Certificate ${data.certificateId} has been revoked.`);
      });
    }

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user]);

  const fetchUniversityStatus = async () => {
    try {
      const res = await api.get('/api/auth/profile');
      setUniversityStatus(res.data.university?.status || 'PENDING');
    } catch (err) {
      console.error('Profile fetch failed:', err);
      setUniversityStatus('PENDING');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/certificates/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Stats fetch failed:', err);
    }
  };

  const fetchLocalCerts = async () => {
    try {
      const res = await api.get('/api/certificates');
      const data = res.data.data || [];
      setCerts(data);
    } catch (err) {
      console.error('Certificates fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!formData.file) return;
    setIssuing(true);
    setIssuedResult(null);
    try {
      const data = new FormData();
      data.append('studentName', formData.studentName);
      data.append('studentEmail', formData.studentEmail);
      data.append('studentPhone', formData.studentPhone);
      data.append('course', formData.course);
      data.append('file', formData.file);

      const res = await api.post('/api/certificates/issue', data);
      setIssuedResult(res.data);
      setFormData({ studentName: '', studentEmail: '', studentPhone: '', course: '', file: null });
      fetchLocalCerts();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Issuance failed. Please try again.');
    } finally {
      setIssuing(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Certificate ID copied to clipboard.');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const filtered = certs.filter(c =>
    c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    c.course?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#000000]">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="animate-spin text-cyan-400" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
          Synchronizing    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      {/* ── UNVERIFIED VIEW ────────────────────────────────────────── */}
      {universityStatus !== 'APPROVED' ? (
        <div className="h-screen flex items-center justify-center p-6 relative z-10">
          <motion.div {...viewTransition} className="bg-white max-w-lg w-full p-12 text-center space-y-8 border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-900/50 relative overflow-hidden">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm">
              <ShieldAlert size={36} />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                Account under <span className="text-amber-500">review.</span>
              </h1>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Your institution's application is being reviewed by our team.
                You will be notified once issuance rights are granted.
              </p>
            </div>
            <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-6">
              <div className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status: {universityStatus || 'PENDING'}
                </span>
              </div>
              <button
                onClick={() => { fetchUniversityStatus(); }}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all font-sans"
              >
                <RefreshCcw size={16} /> Sync Account Status
              </button>
            </div>
          </motion.div>
        </div>
      ) : (

        /* ── AUTHORIZED DASHBOARD ───────────────────────────────────── */
        <div className="container max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">

          {/* HEADER */}
          <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Institution Verified</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none uppercase">
                Issuer <span className="text-blue-500">Dashboard.</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <Database size={14} className="text-slate-600" /> {user?.universityName || 'Institutional Workspace'}
              </p>
            </div>
            <button
              onClick={() => setShowIssueModal(true)}
              className="btn-primary px-10 !shadow-blue-500/20"
            >
              Issue Certificate <Plus size={20} />
            </button>
          </motion.div>

          {/* INSIGHTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Activity, label: 'Total Issued', val: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { icon: ShieldCheck, label: 'Confirmed', val: stats.confirmed, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { icon: Clock, label: 'Pending Sync', val: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { icon: Zap, label: 'Revoked', val: stats.failed, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
            ].map((s, i) => (
              <motion.div
                key={i} {...viewTransition} transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/10 group hover:border-blue-500/30 transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.border} border mb-6 flex items-center justify-center shadow-sm`}>
                  <s.icon className={s.color} size={22} />
                </div>
                <span className="text-4xl font-black text-slate-900 tracking-tighter mb-2 block">{s.val}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* LEDGER TABLE */}
          <motion.div {...viewTransition} transition={{ delay: 0.3 }} className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <Database className="text-blue-600" size={24} />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Certificate History</h3>
              </div>
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  placeholder="SEARCH RECIPIENT..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-[10px] font-black text-slate-900 outline-none focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-8 py-5 border-b border-slate-100">Recipient</th>
                    <th className="px-8 py-5 border-b border-slate-100">Program</th>
                    <th className="px-8 py-5 border-b border-slate-100">Status</th>
                    <th className="px-8 py-5 border-b border-slate-100">Audit ID</th>
                    <th className="px-8 py-5 border-b border-slate-100 text-right">Issued Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-6 text-slate-300">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                            <Database size={32} />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest">No records found</p>
                          <button
                            onClick={() => setShowIssueModal(true)}
                            className="text-blue-600 font-bold hover:underline"
                          >
                            Generate First Certificate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cert) => (
                      <tr key={cert._id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-black border border-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all text-xs uppercase">
                              {cert.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-slate-900 font-black text-[11px] tracking-widest uppercase">{cert.studentName}</p>
                              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">{cert.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">{cert.course}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                             <StatusBadge status={cert.status} />
                             {cert.ipfsCid && (
                               <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-tighter rounded border border-blue-100">
                                 IPFS
                               </div>
                             )}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <button
                            onClick={() => copyToClipboard(cert.certificateHash || cert._id, cert._id)}
                            className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 group/copy hover:bg-white hover:border-blue-200 transition-all shadow-sm"
                          >
                            <span className="text-[10px] font-mono text-slate-400 group-hover/copy:text-blue-600 transition-colors truncate w-32">
                              {cert.certificateHash?.slice(0, 14) || cert._id.slice(0, 14)}...
                            </span>
                            {copiedId === cert._id
                              ? <Check size={12} className="text-emerald-500" />
                              : <Copy size={12} className="text-slate-300 group-hover/copy:text-blue-600 transition-colors" />
                            }
                          </button>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{new Date(cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── ISSUANCE MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="absolute inset-0 bg-[#0B132B]/60 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Issue <span className="text-blue-600">Certificate.</span></h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Secure Academic Registry</p>
                </div>
                <button onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="w-10 h-10 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                  <X size={18} />
                </button>
              </div>

              {issuedResult ? (
                  <div className="p-12 space-y-8 text-center relative overflow-hidden">
                    <div className="space-y-4 relative z-10">
                      <div className="w-20 h-20 bg-emerald-50 rounded-3xl mx-auto flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-xl shadow-emerald-500/10">
                        <CheckCircle2 size={36} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Record Anchored.</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                        The certificate has been securely registered on the blockchain.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4 relative z-10">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Public identifier</p>
                      <p className="text-blue-600 font-mono text-[11px] break-all tracking-tight bg-white py-3 px-4 rounded-xl border border-slate-100 select-all">{issuedResult.certificateId}</p>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => copyToClipboard(String(issuedResult.certificateId), 'result')}
                          className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                        >
                          {copiedId === 'result' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          Copy ID
                        </button>
                        <a
                          href={`/verify/${issuedResult.certificateId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                          <ExternalLink size={14} /> View Record
                        </a>
                      </div>
                    </div>

                    <button onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="btn-primary w-full">
                      Back to Dashboard
                    </button>
                  </div>
              ) : (
                <form onSubmit={handleIssue} className="p-10 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Full Name</label>
                      <input
                        required value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                        placeholder="E.G. JOHN DOE"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                         <input
                          type="email" required value={formData.studentEmail}
                          onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                          placeholder="EMAIL@UNIVERSITY.COM"
                        />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                         <input
                          type="tel" required value={formData.studentPhone}
                          onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                          placeholder="+91..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course / Program Title</label>
                       <input
                        required value={formData.course}
                        onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                        placeholder="E.G. BACHELOR OF COMPUTER SCIENCE"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => fileInputRef.current.click()}
                    className={`w-full h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group relative overflow-hidden
                      ${formData.file ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/5' : 'border-slate-200 bg-slate-50 hover:border-blue-500/30 hover:bg-white'}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    {formData.file ? (
                      <div className="flex flex-col items-center gap-3 text-blue-600 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <CheckCircle2 size={24} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest">{formData.file.name}</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-all shadow-sm">
                           <Upload size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500/60 transition-colors">Select certificate file</span>
                      </>
                    )}
                  </div>

                  <button
                    disabled={issuing || !formData.file}
                    className="btn-primary w-full mt-4 !py-5"
                  >
                    {issuing ? <Loader2 size={22} className="animate-spin" /> : <><ShieldCheck size={20} /> Finalize and Issue</>}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrap with ToastProvider
export default function Admin() {
  return (
    <ToastProvider>
      <AdminDashboard />
    </ToastProvider>
  );
}