import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ShieldCheck, Loader2, Clock, CheckCircle2,
  Activity, X, Upload, ShieldAlert, ArrowRight, RefreshCcw,
  Zap, Fingerprint, Database, Copy, ExternalLink, Check,
  FileText, History, Settings
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
    studentName: '', studentEmail: '', studentPhone: '', course: '', 
    certificateType: 'Degree Certificate', branch: '', graduationYear: new Date().getFullYear(),
    studentEnrollmentNumber: '', cgpa: '', file: null
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

      const onPending = (data) => {
        toast.info(`Certificate ${data.certificateId} is being anchored to blockchain...`);
      };
      const onSuccess = (data) => {
        fetchLocalCerts();
        fetchStats();
        toast.success(`Certificate ${data.certificateId} anchored successfully.`);
      };
      const onFailed = (data) => {
        fetchLocalCerts();
        fetchStats();
        toast.error(`Blockchain anchoring failed for ${data.certificateId}. Use Confirm Issuance to retry.`);
      };

      socket.on('anchoring:pending', onPending);
      socket.on('anchoring:success', onSuccess);
      socket.on('anchoring:failed', onFailed);

      return () => {
        socket.off('anchoring:pending', onPending);
        socket.off('anchoring:success', onSuccess);
        socket.off('anchoring:failed', onFailed);
        if (socket.connected) {
          socket.disconnect();
        }
      };
    }

    return undefined;
  }, [user]);

  const fetchUniversityStatus = async () => {
    try {
      const res = await api.get('/api/auth/profile');
      setUniversityStatus(res.data.university?.status || 'PENDING');
    } catch (err) {
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
      data.append('certificateType', formData.certificateType);
      data.append('branch', formData.branch);
      data.append('graduationYear', formData.graduationYear);
      data.append('studentEnrollmentNumber', formData.studentEnrollmentNumber);
      data.append('cgpa', formData.cgpa);
      data.append('file', formData.file);

      const res = await api.post('/api/certificates/issue', data);
      setIssuedResult(res.data);
      setFormData({ 
        studentName: '', studentEmail: '', studentPhone: '', course: '', 
        certificateType: 'Degree Certificate', branch: '', graduationYear: new Date().getFullYear(),
        studentEnrollmentNumber: '', cgpa: '', file: null 
      });
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
      toast.success('Certificate ID copied.');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy.');
    }
  };

  const filtered = certs.filter(c =>
    c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    c.course?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Updating Portal Data...
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      
      {/* ── UNVERIFIED VIEW ────────────────────────────────────────── */}
      {universityStatus !== 'APPROVED' ? (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <motion.div {...viewTransition} className="bg-white max-w-lg w-full p-12 text-center space-y-8 border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-900/[0.03]">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm">
              <ShieldAlert size={36} />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">
                Institution portal under <span className="text-amber-500">review.</span>
              </h1>
              <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest leading-relaxed opacity-60">
                Your institution's application is being reviewed.
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
                onClick={fetchUniversityStatus}
                className="w-full h-14 flex items-center justify-center gap-3 px-6 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                <RefreshCcw size={16} /> Update Status
              </button>
            </div>
          </motion.div>
        </div>
      ) : (

        /* ── AUTHORIZED DASHBOARD ───────────────────────────────────── */
        <div className="space-y-12">

          {/* HEADER */}
          <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-6 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Portal Verified</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none uppercase">
                Institution <span className="text-blue-600">Portal.</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <Database size={14} className="text-blue-600" /> {user?.universityName || 'Institution Dashboard'}
              </p>
            </div>
            <button
              onClick={() => setShowIssueModal(true)}
              className="flex items-center gap-3 h-14 px-8 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 shrink-0"
            >
              <Plus size={18} /> Issue Certificate
            </button>
          </motion.div>

          {/* INSIGHTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: FileText, label: 'Total Secured', val: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { icon: CheckCircle2, label: 'On-Chain', val: stats.confirmed, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { icon: Clock, label: 'Processing', val: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { icon: ShieldAlert, label: 'Revoked', val: stats.failed, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
            ].map((s, i) => (
              <motion.div
                key={i} {...viewTransition} transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/[0.03] group hover:border-blue-500/30 transition-all hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.border} border mb-8 flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:border-blue-600 transition-all`}>
                  <s.icon className={`${s.color} group-hover:text-white transition-colors`} size={22} />
                </div>
                <span className="text-6xl font-black text-slate-900 tracking-tighter mb-2 block leading-none">{s.val}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 block">{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* LEDGER TABLE */}
          <motion.div {...viewTransition} transition={{ delay: 0.3 }} className="bg-white rounded-[3rem] shadow-2xl shadow-slate-900/[0.04] border border-slate-100 overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <History className="text-blue-600" size={24} />
                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">Issuance Records</h3>
              </div>
              <div className="relative group w-full md:w-96">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  placeholder="SEARCH RECIPIENTS..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-14 bg-white border border-slate-200 rounded-2xl py-2 pl-16 pr-6 text-[11px] font-black text-slate-900 outline-none focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-10 py-6">Recipient</th>
                    <th className="px-10 py-6">Program</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6">Certificate ID</th>
                    <th className="px-10 py-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-10 py-24 text-center">
                        <div className="flex flex-col items-center gap-8 text-slate-200">
                          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 shadow-inner">
                            <Database size={40} />
                          </div>
                          <div className="space-y-2">
                             <p className="text-[12px] font-black uppercase tracking-widest text-slate-300">No records found</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 opacity-60">Start by issuing a new certificate</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cert) => (
                      <tr key={cert.id} className="group hover:bg-slate-50 transition-all">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black border border-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all text-sm uppercase">
                              {cert.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-slate-900 font-black text-[12px] tracking-widest uppercase">{cert.studentName}</p>
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">{cert.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">{cert.course}</span>
                        </td>
                        <td className="px-10 py-6">
                           <StatusBadge status={cert.status} />
                        </td>
                        <td className="px-10 py-6">
                          <button
                            onClick={() => copyToClipboard(cert.certificateId || cert.id, cert.id)}
                            className="flex items-center gap-4 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100 group/copy hover:bg-white hover:border-blue-200 transition-all shadow-sm"
                          >
                            <span className="text-[10px] font-black text-slate-400 group-hover/copy:text-blue-600 transition-colors truncate w-32 uppercase tracking-tight">
                              {cert.certificateId || cert.id}
                            </span>
                            {copiedId === cert.id
                               ? <Check size={14} className="text-emerald-500" />
                               : <Copy size={14} className="text-slate-300 group-hover/copy:text-blue-600 transition-colors" />
                            }
                          </button>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-60 italic">{new Date(cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!issuing) { setShowIssueModal(false); setIssuedResult(null); } }} className="absolute inset-0 bg-[#0B132B]/60 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Secure <span className="text-blue-600">Issuance.</span></h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-3 underline decoration-blue-500/30 underline-offset-4">Blockchain Verification Engine</p>
                </div>
                <button 
                  onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} 
                  disabled={issuing}
                  className="w-12 h-12 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              {issuedResult ? (
                  <div className="p-14 space-y-10 text-center relative overflow-hidden">
                    <div className="space-y-6 relative z-10">
                      <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] mx-auto flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-xl shadow-emerald-500/10">
                        <CheckCircle2 size={40} />
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Anchor <span className="text-emerald-600">Complete.</span></h3>
                      <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest max-w-xs mx-auto leading-relaxed italic">
                        The academic record has been successfully verified and secured on-chain.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 space-y-4 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certificate ID</p>
                      <p className="text-blue-600 font-bold text-[12px] break-all tracking-tight bg-white py-4 px-6 rounded-2xl border border-slate-100 select-all uppercase">{issuedResult.certificateId}</p>
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => copyToClipboard(String(issuedResult.certificateId), 'result')}
                          className="flex-1 flex items-center justify-center gap-3 h-14 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
                        >
                          {copiedId === 'result' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          Copy ID
                        </button>
                        <a
                          href={`/verify/${issuedResult.certificateId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-3 h-14 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-sans"
                        >
                          <ExternalLink size={16} /> View Finalized Record
                        </a>
                      </div>
                    </div>

                    <button onClick={() => { setShowIssueModal(false); setIssuedResult(null); }} className="inline-flex items-center justify-center gap-3 w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                      Return to Dashboard
                    </button>
                  </div>
              ) : (
                <form onSubmit={handleIssue} className="p-12 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Legal Name</label>
                      <input
                        required value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                        placeholder="E.G. JOHN ALEXANDER SMITH"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                         <input
                          type="email" required value={formData.studentEmail}
                          onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                          placeholder="RECIPIENT@UNIVERSITY.EDU"
                        />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                         <input
                          type="tel" required value={formData.studentPhone}
                          onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                          placeholder="+91..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Certificate Type</label>
                         <select
                          required value={formData.certificateType}
                          onChange={(e) => setFormData({ ...formData, certificateType: e.target.value })}
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                        >
                          <option>Degree Certificate</option>
                          <option>Provisional Certificate</option>
                          <option>Consolidated Marks Sheet</option>
                          <option>Migration Certificate</option>
                          <option>Transfer Certificate</option>
                          <option>Character Certificate</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program / Course</label>
                         <input
                          required value={formData.course}
                          onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                          placeholder="E.G. B.TECH COMPUTER SCIENCE"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch / Major</label>
                         <input
                          value={formData.branch}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                          placeholder="CS / IT / MECH"
                        />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Graduation Year</label>
                         <input
                          type="number" required value={formData.graduationYear}
                          onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                        />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Final CGPA</label>
                         <input
                          value={formData.cgpa}
                          onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Enrollment / Roll Number</label>
                       <input
                        required value={formData.studentEnrollmentNumber}
                        onChange={(e) => setFormData({ ...formData, studentEnrollmentNumber: e.target.value })}
                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-[11px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                        placeholder="E.G. 2024CS101"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => fileInputRef.current.click()}
                    className={`w-full h-44 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-5 transition-all cursor-pointer group relative overflow-hidden
                      ${formData.file ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/5' : 'border-slate-200 bg-slate-50 hover:border-blue-500/30 hover:bg-white'}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    {formData.file ? (
                      <div className="flex flex-col items-center gap-4 text-blue-600 relative z-10 px-8 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <CheckCircle2 size={28} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest truncate max-w-full">{formData.file.name}</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-all shadow-sm">
                           <Upload size={28} />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500/60 transition-colors">Select certificate file</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">PDF, JPG, or PNG supported</p>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    disabled={issuing || !formData.file}
                    className="w-full h-16 bg-blue-600 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center gap-4"
                  >
                    {issuing ? <Loader2 size={24} className="animate-spin text-white/50" /> : <><ShieldCheck size={22} /> Finalize and Secure Record</>}
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

export default function Admin() {
  return (
    <ToastProvider>
      <AdminDashboard />
    </ToastProvider>
  );
}