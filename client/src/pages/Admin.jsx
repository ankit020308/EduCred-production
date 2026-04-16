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
          Synchronizing Protocol...
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* ── UNVERIFIED VIEW ────────────────────────────────────────── */}
      {universityStatus !== 'APPROVED' ? (
        <div className="h-screen flex items-center justify-center p-6 relative z-10">
          <motion.div {...viewTransition} className="bg-[#050505]/90 backdrop-blur-3xl max-w-lg w-full p-12 text-center space-y-8 border border-white/5 rounded-[2rem] shadow-[0_0_100px_rgba(245,158,11,0.05)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent h-1 w-full animate-scan" />
            <div className="w-20 h-20 bg-amber-500/10 rounded-2xl mx-auto flex items-center justify-center text-amber-500 border border-amber-500/20">
              <ShieldAlert size={36} />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                Clearance <span className="text-amber-500">Pending.</span>
              </h1>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                Your institution is under review by the EduCred governance team.
                Issuance rights will be granted once approved.
              </p>
            </div>
            <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-6">
              <div className="px-5 py-2.5 rounded-xl bg-[#050505] border border-white/5 flex items-center gap-3 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Identity State: {universityStatus || 'PENDING'}
                </span>
              </div>
              <button
                onClick={() => { fetchUniversityStatus(); }}
                className="btn-command btn-outline w-full !py-4"
              >
                <RefreshCcw size={16} /> Sync Protocol Status
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
              <div className="flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full w-fit">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Authority Node Active</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none uppercase">
                Intelligence <span className="text-cyan-400">Hub.</span>
              </h1>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <Database size={14} className="text-slate-700" /> {user?.universityName || 'Institutional Dashboard'}
              </p>
            </div>
            <button
              onClick={() => setShowIssueModal(true)}
              className="btn-command btn-blue px-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            >
              Issue Certificate <ArrowRight size={16} />
            </button>
          </motion.div>

          {/* INSIGHTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Activity, label: 'Total Issued', val: stats.total, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
              { icon: ShieldCheck, label: 'Confirmed', val: stats.confirmed, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
              { icon: Clock, label: 'Pending', val: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              { icon: Zap, label: 'Revoked', val: stats.failed, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
            ].map((s, i) => (
              <motion.div
                key={i} {...viewTransition} transition={{ delay: i * 0.1 }}
                className="glass-pane p-8 rounded-[2.5rem] group hover:border-cyan-400/30 transition-all shadow-2xl"
              >
                <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.border} border mb-6 flex items-center justify-center shadow-inner`}>
                  <s.icon className={s.color} size={22} />
                </div>
                <span className="text-4xl font-black text-white tracking-tighter mb-2 block">{s.val}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* LEDGER TABLE */}
          <motion.div {...viewTransition} transition={{ delay: 0.3 }} className="glass-pane rounded-[2.5rem] overflow-hidden shadow-2xl scanline-overlay sm:border border-white/10">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#050505]/60">
              <div className="flex items-center gap-4">
                <Database className="text-cyan-400" size={24} />
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Institutional Ledger</h3>
              </div>
              <div className="relative group/search w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/search:text-cyan-400 transition-colors" size={16} />
                <input
                  placeholder="SEARCH IDENTITY OR COURSE..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-[10px] font-black text-white outline-none focus:border-cyan-400/40 transition-all placeholder:text-slate-800 uppercase tracking-widest shadow-inner focus:bg-[#080808]"
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
                      <td colSpan="5" className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-6 text-slate-800">
                          <div className="w-16 h-16 bg-white/[0.02] rounded-2xl flex items-center justify-center border border-white/5">
                            <Database size={32} className="opacity-20" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em]">
                            Global Ledger is Vacant
                          </p>
                          <button
                            onClick={() => setShowIssueModal(true)}
                            className="btn-command btn-outline px-10"
                          >
                            Initialize Issuance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cert) => (
                      <tr key={cert._id} className="group hover:bg-[#111111] transition-colors duration-300">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#050505] rounded-lg flex items-center justify-center text-slate-400 font-extrabold border border-white/5 group-hover:border-cyan-400/30 group-hover:text-cyan-400 transition-colors text-xs shadow-inner uppercase">
                              {cert.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-black text-[11px] tracking-widest uppercase">{cert.studentName}</p>
                              <p className="text-slate-700 text-[9px] font-black uppercase tracking-widest mt-1">{cert.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{cert.course}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={cert.status} />
                            {cert.ipfsCid && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded-md shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                                <span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter">Decentralized</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => copyToClipboard(cert.certificateHash || cert._id, cert._id)}
                            className="flex items-center gap-3 bg-[#050505] px-4 py-2 rounded-xl border border-white/5 hover:border-cyan-400/20 transition-all group/copy shadow-inner"
                          >
                            <span className="text-[10px] font-mono text-slate-700 group-hover/copy:text-cyan-400 transition-colors truncate w-32">
                              {cert.certificateHash?.slice(0, 14) || cert._id.slice(0, 14)}...
                            </span>
                            {copiedId === cert._id
                              ? <Check size={12} className="text-cyan-400" />
                              : <Copy size={12} className="text-slate-800 group-hover/copy:text-cyan-400 transition-colors" />
                            }
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-slate-700 text-[9px] font-black uppercase tracking-widest">{new Date(cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
              className="relative w-full max-w-xl glass-pane rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] scanline-overlay"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#050505]/80">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Issue <span className="text-cyan-400">Credential.</span></h2>
                  <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em] mt-2">Blockchain-Anchored Protocol</p>
                </div>
                <button onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="w-10 h-10 rounded-xl bg-[#080808] hover:bg-rose-500/10 border border-white/10 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-all">
                  <X size={18} />
                </button>
              </div>

              {issuedResult ? (
                /* ── SUCCESS STATE ── */
                  <div className="p-12 space-y-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan-400/10 blur-[80px] pointer-events-none" />
                    <div className="space-y-4 relative z-10">
                      <div className="w-20 h-20 bg-[#050505] rounded-3xl mx-auto flex items-center justify-center text-cyan-400 border border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
                        <CheckCircle2 size={36} />
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Identity Anchored.</h3>
                      <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em] max-w-xs mx-auto leading-relaxed">
                        Credential fingerprint has been permanently committed to the sovereign ledger.
                      </p>
                    </div>

                    {/* Certificate ID — copyable */}
                    <div className="bg-[#050505] border border-white/5 rounded-2xl p-6 space-y-4 relative z-10 shadow-inner">
                      <p className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em]">Protocol Identifier</p>
                      <p className="text-cyan-400 font-mono text-[11px] break-all tracking-tight bg-cyan-400/5 py-3 px-4 rounded-xl border border-cyan-400/10 select-all">{issuedResult.certificateId}</p>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => copyToClipboard(String(issuedResult.certificateId), 'result')}
                          className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#080808] border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white hover:border-white/20 transition-all shadow-xl"
                        >
                          {copiedId === 'result' ? <Check size={14} className="text-cyan-400" /> : <Copy size={14} />}
                          Copy ID
                        </button>
                        <a
                          href={`/verify/${issuedResult.certificateId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-4 bg-cyan-400/10 border border-cyan-400/20 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 hover:bg-cyan-400/20 transition-all shadow-xl"
                        >
                          <ExternalLink size={14} /> View Node
                        </a>
                      </div>
                    </div>

                    <button onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="btn-command btn-blue w-full">
                      Return to Command Deck
                    </button>
                  </div>
              ) : (
                /* ── UPLOAD FORM ── */
                <form onSubmit={handleIssue} className="p-10 space-y-6">
                  <div className="space-y-4">
                    <div className="relative group/field">
                      <input
                        placeholder="STUDENT IDENTIFIER (FULL NAME)" required value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 px-6 text-[11px] font-black text-white outline-none focus:border-cyan-400/50 transition-all placeholder:text-slate-800 uppercase tracking-widest shadow-inner"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        placeholder="NETWORK EMAIL" type="email" required value={formData.studentEmail}
                        onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 px-6 text-[11px] font-black text-white outline-none focus:border-cyan-400/50 transition-all placeholder:text-slate-800 uppercase tracking-widest shadow-inner"
                      />
                      <input
                        placeholder="TELEMETRY (+91...)" type="tel" required value={formData.studentPhone}
                        onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 px-6 text-[11px] font-black text-white outline-none focus:border-cyan-400/50 transition-all placeholder:text-slate-800 uppercase tracking-widest shadow-inner"
                      />
                    </div>
                    <input
                      placeholder="COURSE MODULE / PROGRAM" required value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 px-6 text-[11px] font-black text-white outline-none focus:border-cyan-400/50 transition-all placeholder:text-slate-800 uppercase tracking-widest shadow-inner"
                    />
                  </div>

                  {/* DROP ZONE */}
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className={`w-full h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group relative overflow-hidden
                      ${formData.file ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.15)] bg-cyan-400/[0.03]' : 'border-white/5 bg-[#050505] hover:border-cyan-400/40 hover:bg-[#080808]'}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    {formData.file ? (
                      <div className="flex flex-col items-center gap-3 text-cyan-400 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-cyan-400/10 flex items-center justify-center">
                          <CheckCircle2 size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{formData.file.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-800 group-hover:text-cyan-400 transition-colors" />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] group-hover:text-cyan-400/50 transition-colors">Relay Certificate File</span>
                      </>
                    )}
                  </div>

                  <button
                    disabled={issuing || !formData.file}
                    className="btn-command btn-blue w-full mt-4"
                  >
                    {issuing ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Initialize Anchor Protocol</>}
                  </button>
                  <p className="text-center text-[9px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center justify-center gap-2">
                    <ShieldCheck size={12} className="text-cyan-400/50" /> Sovereignty Protocol Engaged
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