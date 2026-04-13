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
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600">
          Syncing Ledger...
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden">

      {/* 🌌 INTERACTIVE BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-20 mix-blend-screen pointer-events-none">
        <BlockchainBackground />
      </div>

      {/* AMBIENT GLOW */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* ── UNVERIFIED VIEW ────────────────────────────────────────── */}
      {universityStatus !== 'APPROVED' ? (
        <div className="h-screen flex items-center justify-center p-6 relative z-10">
          <motion.div {...viewTransition} className="bg-[#050505]/90 backdrop-blur-3xl max-w-lg w-full p-12 text-center space-y-8 border border-white/5 rounded-[2rem] shadow-[0_0_100px_rgba(245,158,11,0.05)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent h-1 w-full animate-scan" />
            <div className="w-20 h-20 bg-amber-500/10 rounded-2xl mx-auto flex items-center justify-center text-amber-500 border border-amber-500/20">
              <ShieldAlert size={36} />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Clearance <span className="text-amber-500">Pending</span>
              </h1>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                Your institution is under review by the EduCred governance team.
                Issuance rights will be granted once approved.
              </p>
            </div>
            <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-6">
              <div className="px-5 py-2.5 rounded-xl bg-[#111111] border border-white/5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Status: {universityStatus || 'PENDING'}
                </span>
              </div>
              <button
                onClick={() => { fetchUniversityStatus(); }}
                className="w-full bg-white text-black py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
              >
                <RefreshCcw size={16} /> Sync Status
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
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Issuance Node Active</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter leading-none">
                Authority <span className="text-blue-500">Node.</span>
              </h1>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                <Database size={14} className="text-slate-500" /> {user?.universityName || 'Institutional Dashboard'}
              </p>
            </div>
            <button
              onClick={() => setShowIssueModal(true)}
              className="bg-white text-black px-8 py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-3 group"
            >
              Issue Certificate <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* INSIGHTS GRID — real data from API */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Activity, label: 'Total Issued', val: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { icon: ShieldCheck, label: 'Confirmed', val: stats.confirmed, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { icon: Clock, label: 'Pending', val: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              { icon: Zap, label: 'Failed', val: stats.failed, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
            ].map((s, i) => (
              <motion.div
                key={i} {...viewTransition} transition={{ delay: i * 0.1 }}
                className="bg-[#0A0A0A]/80 backdrop-blur-xl p-8 rounded-[1.5rem] border border-white/[0.04] flex flex-col items-start hover:bg-[#111111] transition-colors group relative overflow-hidden"
              >
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
                <div className={`p-3 rounded-xl ${s.bg} ${s.border} border mb-6`}>
                  <s.icon className={s.color} size={22} />
                </div>
                <span className="text-3xl font-extrabold text-white tracking-tighter mb-2">{s.val}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* LEDGER TABLE */}
          <motion.div {...viewTransition} transition={{ delay: 0.3 }} className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#050505]/50">
              <div className="flex items-center gap-4">
                <Fingerprint className="text-slate-500" size={24} />
                <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] text-white">Institutional Ledger</h3>
              </div>
              <div className="relative group/search w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/search:text-blue-500 transition-colors" size={16} />
                <input
                  placeholder="Search student or course..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#111111] border border-white/[0.06] rounded-xl py-3 pl-12 pr-4 text-[11px] font-medium text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#020202] text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-8 py-5">Student</th>
                    <th className="px-8 py-5">Course</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5">Hash Fingerprint</th>
                    <th className="px-8 py-5 text-right">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-700">
                          <Database size={36} className="opacity-30" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">
                            No certificates issued yet
                          </p>
                          <button
                            onClick={() => setShowIssueModal(true)}
                            className="mt-2 px-6 py-2.5 bg-blue-600/20 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600/30 transition-colors"
                          >
                            Issue First Certificate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cert) => (
                      <tr key={cert._id} className="group hover:bg-[#111111] transition-colors duration-300">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#161616] rounded-lg flex items-center justify-center text-slate-300 font-bold border border-white/5 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-colors text-sm">
                              {cert.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-bold text-xs tracking-wide uppercase">{cert.studentName}</p>
                              <p className="text-slate-600 text-[10px] mt-0.5">{cert.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{cert.course}</span>
                        </td>
                        <td className="px-8 py-5">
                          <StatusBadge status={cert.status} />
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => copyToClipboard(cert.certificateHash || cert._id, cert._id)}
                            className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-md border border-white/5 hover:border-white/20 transition-colors group/copy"
                          >
                            <span className="text-[10px] font-mono text-slate-500 group-hover/copy:text-blue-400 transition-colors truncate w-28">
                              {cert.certificateHash?.slice(0, 14) || '—'}...
                            </span>
                            {copiedId === cert._id
                              ? <Check size={12} className="text-blue-500" />
                              : <Copy size={12} className="text-slate-700 group-hover/copy:text-blue-400 transition-colors" />
                            }
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-slate-500 text-[10px]">{new Date(cert.createdAt).toLocaleDateString()}</span>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-[#0A0A0A] border border-white/[0.08] rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="p-8 border-b border-white/[0.06] flex items-center justify-between bg-[#050505]">
                <div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Issue <span className="text-blue-500">Certificate.</span></h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Blockchain-Anchored Issuance</p>
                </div>
                <button onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="w-10 h-10 rounded-xl bg-[#111111] hover:bg-[#161616] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                  <X size={18} />
                </button>
              </div>

              {issuedResult ? (
                /* ── SUCCESS STATE ── */
                <div className="p-12 space-y-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-[80px] pointer-events-none" />
                  <div className="space-y-4 relative z-10">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-2xl mx-auto flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                      <ShieldCheck size={36} />
                    </div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">Certificate Issued.</h3>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-[0.15em] max-w-xs mx-auto leading-relaxed">
                      Hash anchored. Blockchain confirmation in progress.
                    </p>
                  </div>

                  {/* Certificate ID — copyable */}
                  <div className="bg-[#050505] border border-white/[0.06] rounded-2xl p-6 space-y-3 relative z-10">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Certificate ID</p>
                    <p className="text-blue-400 font-mono text-xs break-all">{issuedResult.certificateId}</p>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => copyToClipboard(String(issuedResult.certificateId), 'result')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#111111] border border-white/[0.06] rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/20 transition-all"
                      >
                        {copiedId === 'result' ? <Check size={14} className="text-blue-400" /> : <Copy size={14} />}
                        Copy ID
                      </button>
                      <a
                        href={`/verify/${issuedResult.certificateId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600/20 border border-blue-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:bg-blue-600/30 transition-all"
                      >
                        <ExternalLink size={14} /> Verify Link
                      </a>
                    </div>
                  </div>

                  <button onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="w-full bg-white text-black py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95">
                    Close & Return to Ledger
                  </button>
                </div>
              ) : (
                /* ── UPLOAD FORM ── */
                <form onSubmit={handleIssue} className="p-8 space-y-5">
                  <div className="space-y-4">
                    <input
                      placeholder="Student Full Name" required value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full bg-[#111111] border border-white/[0.06] rounded-xl py-3.5 px-5 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        placeholder="Student Email" type="email" required value={formData.studentEmail}
                        onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                        className="w-full bg-[#111111] border border-white/[0.06] rounded-xl py-3.5 px-5 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                      />
                      <input
                        placeholder="Phone (+91...)" type="tel" required value={formData.studentPhone}
                        onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                        className="w-full bg-[#111111] border border-white/[0.06] rounded-xl py-3.5 px-5 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                      />
                    </div>
                    <input
                      placeholder="Course / Program" required value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full bg-[#111111] border border-white/[0.06] rounded-xl py-3.5 px-5 text-white text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>

                  {/* DROP ZONE */}
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className={`w-full h-36 border border-dashed rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group
                      ${formData.file ? 'border-blue-500/40 bg-blue-500/[0.03]' : 'border-white/10 bg-[#111111] hover:border-blue-500/40'}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    {formData.file ? (
                      <div className="flex flex-col items-center gap-2 text-blue-400">
                        <CheckCircle2 size={28} />
                        <span className="text-[11px] font-bold text-blue-500">{formData.file.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={22} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                        <span className="text-[11px] font-medium text-slate-500">Upload Certificate (PDF, JPG, PNG)</span>
                      </>
                    )}
                  </div>

                  <button
                    disabled={issuing || !formData.file}
                    className="w-full bg-white text-black py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {issuing ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Anchor to Ledger</>}
                  </button>
                  <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <ShieldCheck size={12} /> Privacy Guard Active
                  </p>
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