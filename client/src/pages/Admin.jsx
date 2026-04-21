import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ShieldCheck, Loader2, Clock, CheckCircle2,
  X, ShieldAlert, RefreshCcw, Database, Copy, ExternalLink,
  Check, FileText, History, Trash2, ChevronDown, ChevronUp,
  LogOut, Edit2, AlertTriangle, RotateCcw, Lock, User,
  Upload, Download, CheckCircle, XCircle,
} from 'lucide-react';
import Papa from 'papaparse';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ToastProvider, useToast } from '../components/Toast';
import socket, { joinInstitutionalRoom } from '../services/socket.mjs';
import { useNavigate } from 'react-router-dom';

const vt = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

const emptySubject = () => ({ code: '', marks: '' });
const emptySemester = (n) => ({ semester: n, sgpa: '', subjects: [emptySubject()] });
const INPUT = 'w-full h-11 bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 text-sm text-[#202020] font-medium outline-none focus:bg-white focus:border-[#ea2804] transition-all placeholder:text-[#bbbbbb]';

const STATUS_CONFIG = {
  CONFIRMED: { label: 'On-Chain', bg: 'bg-[#2b9a66]/10', text: 'text-[#2b9a66]', border: 'border-[#2b9a66]/20', dot: 'bg-[#2b9a66]' },
  PENDING_REVIEW: { label: 'Pending Review', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
  PROCESSING: { label: 'Under Review', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
  ANCHOR_FAILED: { label: 'Anchor Failed', bg: 'bg-[#ea2804]/10', text: 'text-[#ea2804]', border: 'border-[#ea2804]/20', dot: 'bg-[#ea2804]' },
  REVOKED: { label: 'Revoked', bg: 'bg-[#202020]/5', text: 'text-[#202020]', border: 'border-[#202020]/10', dot: 'bg-[#202020]' },
  REJECTED: { label: 'Rejected', bg: 'bg-[#ea2804]/10', text: 'text-[#ea2804]', border: 'border-[#ea2804]/20', dot: 'bg-[#ea2804]' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-[#f6f6f6]', text: 'text-[#646464]', border: 'border-[#e0e0e0]', dot: 'bg-[#646464]' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [uniStatus, setUniStatus] = useState(null);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, failed: 0 });
  const [copiedId, setCopiedId] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [issuedResult, setIssuedResult] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [editingCert, setEditingCert] = useState(null);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchFile, setBatchFile] = useState(null);
  const [batchPreview, setBatchPreview] = useState([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchDragOver, setBatchDragOver] = useState(false);
  const batchFileRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = (showModal || showBatchModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal, showBatchModal]);

  const [form, setForm] = useState({
    studentName: '', email: '', rollNumber: '', program: '', branch: '', finalCGPA: '',
    semesters: [emptySemester(1)],
  });

  const fetchUniStatus = useCallback(async () => {
    try {
      const r = await api.get('/api/auth/profile');
      setUniStatus(r.data.university?.status || r.data.user?.universityStatus || 'PENDING');
    } catch { setUniStatus('PENDING'); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const r = await api.get('/api/certificates/stats');
      setStats(r.data);
    } catch { /* ignore */ }
  }, []);

  const fetchCerts = useCallback(async () => {
    try {
      const r = await api.get('/api/certificates');
      setCerts(r.data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchUniStatus(); fetchCerts(); fetchStats();
    if (user?.universityId) {
      socket.connect();
      joinInstitutionalRoom(user.universityId);
      const onPending = (d) => toast.info(`Anchoring ${d.certificateId}…`);
      const onSuccess = (d) => { fetchCerts(); fetchStats(); toast.success(`${d.certificateId} anchored ✓`); };
      const onFailed = (d) => { fetchCerts(); fetchStats(); toast.error(`Anchoring failed: ${d.certificateId}`); };
      socket.on('anchoring:pending', onPending);
      socket.on('anchoring:success', onSuccess);
      socket.on('anchoring:failed', onFailed);
      return () => {
        socket.off('anchoring:pending', onPending);
        socket.off('anchoring:success', onSuccess);
        socket.off('anchoring:failed', onFailed);
        if (socket.connected) socket.disconnect();
      };
    }
    return undefined;
  }, [user, fetchUniStatus, fetchCerts, fetchStats]);

  // Semester helpers
  const addSemester = () => setForm(p => ({ ...p, semesters: [...p.semesters, emptySemester(p.semesters.length + 1)] }));
  const removeSemester = (i) => setForm(p => ({ ...p, semesters: p.semesters.filter((_, j) => j !== i) }));
  const setSem = (i, field, val) => setForm(p => { const s = [...p.semesters]; s[i] = { ...s[i], [field]: val }; return { ...p, semesters: s }; });
  const addSubject = (si) => setForm(p => { const s = [...p.semesters]; s[si] = { ...s[si], subjects: [...s[si].subjects, emptySubject()] }; return { ...p, semesters: s }; });
  const removeSubject = (si, xi) => setForm(p => { const s = [...p.semesters]; s[si] = { ...s[si], subjects: s[si].subjects.filter((_, j) => j !== xi) }; return { ...p, semesters: s }; });
  const setSub = (si, xi, field, val) => setForm(p => { const s = [...p.semesters]; const subs = [...s[si].subjects]; subs[xi] = { ...subs[xi], [field]: val }; s[si] = { ...s[si], subjects: subs }; return { ...p, semesters: s }; });

  const handleIssue = async (e) => {
    e.preventDefault();
    setIssuing(true); setIssuedResult(null);
    try {
      const payload = {
        studentName: form.studentName, email: form.email, rollNumber: form.rollNumber,
        program: form.program, branch: form.branch, finalCGPA: parseFloat(form.finalCGPA),
        semesters: form.semesters.map(s => ({
          semester: s.semester, sgpa: parseFloat(s.sgpa),
          subjects: s.subjects.map(sub => ({ code: sub.code.trim(), marks: parseFloat(sub.marks) })),
        })),
      };
      const res = await api.post('/api/certificates/issue', payload);
      setIssuedResult(res.data);
      setForm({ studentName: '', email: '', rollNumber: '', program: '', branch: '', finalCGPA: '', semesters: [emptySemester(1)] });
      fetchCerts(); fetchStats();
      toast.success('Certificate submitted for admin review.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Issuance failed.');
    } finally { setIssuing(false); }
  };

  const handleRetryAnchor = async (certId, dbId) => {
    setRetrying(dbId);
    try {
      await api.post(`/api/certificates/${dbId}/retry-anchor`);
      toast.info(`Retry anchoring started for ${certId}.`);
      fetchCerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Retry failed.');
    } finally { setRetrying(null); }
  };

  const openEdit = (cert) => {
    setEditingCert(cert);
    setForm({
      studentName: cert.studentName || '',
      email: cert.studentEmail || '',
      rollNumber: cert.metadata?.studentEnrollmentNumber || '',
      program: cert.course || '',
      branch: cert.metadata?.branch || '',
      finalCGPA: cert.metadata?.finalCGPA || '',
      semesters: [emptySemester(1)],
    });
    setShowModal(true);
    setIssuedResult(null);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIssuing(true);
    try {
      await api.put(`/api/certificates/${editingCert.id}/edit`, {
        studentName: form.studentName, email: form.email,
        rollNumber: form.rollNumber, program: form.program,
        branch: form.branch, finalCGPA: parseFloat(form.finalCGPA),
        semesters: form.semesters.map(s => ({
          semester: s.semester, sgpa: parseFloat(s.sgpa),
          subjects: s.subjects.map(sub => ({ code: sub.code.trim(), marks: parseFloat(sub.marks) })),
        })),
      });
      toast.success('Record updated. Awaiting admin review.');
      setShowModal(false); setEditingCert(null);
      fetchCerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Edit failed.');
    } finally { setIssuing(false); }
  };

  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); toast.success('Copied.'); setTimeout(() => setCopiedId(null), 2000); }
    catch { toast.error('Copy failed.'); }
  };

  const handleBatchFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { toast.error('Please select a .csv file.'); return; }
    setBatchFile(file);
    setBatchResults(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => setBatchPreview(data.slice(0, 5)),
    });
  };

  const downloadTemplate = () => {
    const csv = 'studentName,email,rollNumber,program,branch,finalCGPA,graduationYear,phone\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'educred-batch-template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const handleBatchIssue = async () => {
    if (!batchFile) return;
    setBatchUploading(true);
    setBatchResults(null);
    try {
      const fd = new FormData();
      fd.append('file', batchFile);
      const res = await api.post('/api/certificates/batch', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBatchResults(res.data);
      fetchCerts(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Batch upload failed.');
    } finally {
      setBatchUploading(false);
    }
  };

  const closeBatchModal = () => {
    if (batchUploading) return;
    setShowBatchModal(false);
    setBatchFile(null);
    setBatchPreview([]);
    setBatchResults(null);
  };

  const filtered = certs.filter(c =>
    c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    c.course?.toLowerCase().includes(search.toLowerCase()) ||
    c.metadata?.studentEnrollmentNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6]">
      <div className="flex flex-col items-center gap-5">
        <Loader2 className="animate-spin text-[#ea2804]" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">Loading portal…</p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#f6f6f6] text-[#202020] font-sans">

      {/* ── Persistent Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#e0e0e0] h-14 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-7 h-7 bg-[#ea2804] rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white" size={14} />
            </div>
            <span className="text-base font-black text-[#202020] tracking-tight">
              Edu<span className="text-[#ea2804]">Cred</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#646464]">
              <div className="w-6 h-6 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center text-[#ea2804] font-black text-[9px]">
                {user?.name?.charAt(0) || 'I'}
              </div>
              {user?.universityName || user?.name || 'Institution'}
              <span className="px-2 py-0.5 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 text-[#ea2804]">
                INSTITUTION
              </span>
            </span>
            <button onClick={() => navigate('/profile')}
              className="w-7 h-7 rounded-lg bg-[#f6f6f6] border border-[#e0e0e0] flex items-center justify-center hover:border-[#ea2804] transition-all">
              <User size={13} className="text-[#646464]" />
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#646464] hover:text-[#ea2804] transition-colors">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="pt-14">

        {/* Pending approval gate */}
        {uniStatus !== 'APPROVED' ? (
          <div className="min-h-[80vh] flex items-center justify-center p-6">
            <motion.div {...vt} className="bg-white border border-[#202020] max-w-lg w-full p-12 text-center space-y-8 rounded-3xl">
              <div className="w-20 h-20 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full mx-auto flex items-center justify-center text-[#ea2804]">
                <ShieldAlert size={36} />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-black text-[#202020] tracking-tight">
                  Institution under <span className="text-[#ea2804]">review.</span>
                </h1>
                <p className="text-[#646464] text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Your application is being reviewed. You'll be notified once issuance rights are granted.
                </p>
              </div>
              <div className="pt-6 border-t border-[#e0e0e0] flex flex-col items-center gap-4">
                <div className="px-5 py-2 rounded-full bg-[#f6f6f6] border border-[#e0e0e0] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black text-[#646464] uppercase tracking-widest">Status: {uniStatus || 'PENDING'}</span>
                </div>
                <button onClick={fetchUniStatus} className="btn-secondary w-full text-xs">
                  <RefreshCcw size={13} /> Refresh Status
                </button>
              </div>
            </motion.div>
          </div>
        ) : (

          /* ── Main Dashboard ── */
          <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

            {/* Breadcrumb */}
            <p className="text-[9px] font-black uppercase tracking-widest text-[#646464]">
              Institution Portal › Issuance Records
            </p>

            {/* Header */}
            <motion.div {...vt} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ea2804] animate-pulse" />
                  <span className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest">Portal Verified</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-[#202020] tracking-tight leading-none">
                  Institution <span className="text-[#ea2804]">Portal.</span>
                </h1>
                <p className="text-[#646464] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Database size={12} className="text-[#ea2804]" /> {user?.universityName || 'Institution Dashboard'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => setShowBatchModal(true)} className="btn-secondary">
                  <Upload size={15} /> Batch Upload
                </button>
                <button onClick={() => { setEditingCert(null); setIssuedResult(null); setShowModal(true); }} className="btn-primary">
                  <Plus size={15} /> Issue Certificate
                </button>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: FileText, label: 'Total Issued', val: stats.total, cfg: STATUS_CONFIG.CONFIRMED },
                { icon: CheckCircle2, label: 'On-Chain', val: stats.confirmed, cfg: STATUS_CONFIG.CONFIRMED },
                { icon: Clock, label: 'Processing', val: stats.pending, cfg: STATUS_CONFIG.PROCESSING },
                { icon: ShieldAlert, label: 'Revoked', val: stats.failed, cfg: STATUS_CONFIG.REVOKED },
              ].map((s, i) => (
                <motion.div key={i} {...vt} transition={{ delay: i * 0.06 }}
                  className="bg-white border border-[#202020] rounded-3xl p-6 hover:-translate-y-0.5 transition-all duration-300 group">
                  <div className={`w-10 h-10 rounded-full ${s.cfg.bg} border ${s.cfg.border} mb-5 flex items-center justify-center group-hover:bg-[#ea2804] group-hover:border-[#ea2804] transition-all`}>
                    <s.icon className={`${s.cfg.text} group-hover:text-white transition-colors`} size={18} />
                  </div>
                  <span className="text-4xl font-black text-[#202020] tracking-tight block leading-none">{s.val}</span>
                  <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest mt-2 block">{s.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Issuance Records Table */}
            <motion.div {...vt} transition={{ delay: 0.2 }}
              className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[#e0e0e0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f6f6f6]/80">
                <div className="flex items-center gap-3">
                  <History className="text-[#ea2804]" size={18} />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202020]">Issuance Records</h3>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb]" size={14} />
                  <input placeholder="Search by name, program, roll no…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-10 bg-white border border-[#e0e0e0] rounded-full pl-10 pr-4 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[860px]">
                  <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-[#646464] bg-[#f6f6f6]/50">
                      {['Student', 'Roll No', 'Program', 'Sem', 'CGPA', 'Status', 'Hash', 'Date', ''].map(h => (
                        <th key={h} className="px-5 py-4 border-b border-[#f0f0f0]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-5 text-[#bbbbbb]">
                            <div className="w-14 h-14 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full flex items-center justify-center">
                              <Database size={28} />
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest">No records found</p>
                              <button onClick={() => setShowModal(true)}
                                className="text-[9px] font-black uppercase tracking-widest text-[#ea2804] hover:underline">
                                Issue your first certificate →
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.map((cert) => (
                      <>
                        <tr key={cert.id} className="group hover:bg-[#f6f6f6]/60 transition-all">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center text-[#ea2804] font-black text-[10px] shrink-0 group-hover:bg-[#ea2804] group-hover:text-white transition-all">
                                {cert.studentName?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[#202020] font-black text-[10px] tracking-wide uppercase">{cert.studentName}</p>
                                <p className="text-[#646464] text-[9px] font-bold">{cert.studentEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="text-[10px] font-black uppercase text-[#202020]">{cert.metadata?.studentEnrollmentNumber || '—'}</span></td>
                          <td className="px-5 py-4"><span className="text-[10px] font-black uppercase text-[#646464]">{cert.course}</span></td>
                          <td className="px-5 py-4"><span className="text-[10px] font-black text-[#646464]">{cert.metadata?.semester ?? '—'}</span></td>
                          <td className="px-5 py-4"><span className="text-[10px] font-black text-[#202020]">{cert.metadata?.finalCGPA ?? '—'}</span></td>
                          <td className="px-5 py-4 min-w-[140px]">
                            <div className="flex flex-col gap-1.5 items-start">
                              <StatusPill status={cert.status} />
                              {cert.status === 'ANCHOR_FAILED' && (
                                <button onClick={() => handleRetryAnchor(cert.certificateId, cert.id)}
                                  disabled={retrying === cert.id}
                                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#ea2804] text-white text-[8px] font-black uppercase tracking-widest hover:bg-[#dd4425] transition-all disabled:opacity-50">
                                  {retrying === cert.id ? <Loader2 size={9} className="animate-spin" /> : <RotateCcw size={9} />}
                                  Retry
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <button onClick={() => copy(cert.certificateHash || '', `hash-${cert.id}`)}
                              className="flex items-center gap-1.5 bg-[#f6f6f6] px-3 py-1 rounded-full border border-[#e0e0e0] hover:border-[#ea2804] transition-all"
                              title={cert.certificateHash}>
                              <span className="text-[9px] font-mono text-[#646464] w-14 truncate">{cert.certificateHash?.substring(0, 10) || '—'}…</span>
                              {copiedId === `hash-${cert.id}` ? <Check size={9} className="text-[#2b9a66]" /> : <Copy size={9} className="text-[#bbbbbb]" />}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[#646464] text-[9px] font-bold">
                              {new Date(cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 justify-end">
                              {cert.status === 'PENDING_REVIEW' ? (
                                <button onClick={() => openEdit(cert)} title="Edit (allowed while pending)"
                                  className="w-7 h-7 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] hover:text-[#ea2804] flex items-center justify-center text-[#646464] transition-all">
                                  <Edit2 size={11} />
                                </button>
                              ) : cert.status === 'CONFIRMED' || cert.status === 'PROCESSING' ? (
                                <button title="Record is immutable once anchored" disabled
                                  className="w-7 h-7 rounded-full border border-[#e0e0e0] bg-white flex items-center justify-center text-[#bbbbbb] cursor-not-allowed">
                                  <Lock size={11} />
                                </button>
                              ) : null}
                              <button onClick={() => setExpandedRow(expandedRow === cert.id ? null : cert.id)}
                                className="w-7 h-7 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] hover:text-[#ea2804] flex items-center justify-center text-[#bbbbbb] transition-all">
                                {expandedRow === cert.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedRow === cert.id && (
                          <tr key={`${cert.id}-exp`} className="bg-[#ea2804]/3">
                            <td colSpan={9} className="px-6 py-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">
                                    Semester {cert.metadata?.semester ?? '—'} — SGPA: {cert.metadata?.sgpa ?? '—'}
                                  </p>
                                  {cert.metadata?.subjects?.length > 0
                                    ? cert.metadata.subjects.map((sub, si) => (
                                      <div key={si} className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-[#e0e0e0]">
                                        <span className="text-[9px] font-black text-[#202020] uppercase">{sub.code}</span>
                                        <span className="text-[9px] font-black text-[#ea2804]">{sub.marks}</span>
                                      </div>
                                    ))
                                    : <p className="text-[9px] text-[#bbbbbb] font-black uppercase tracking-widest">No subject data</p>}
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Certificate Details</p>
                                  {[
                                    ['ID', cert.certificateId || cert.id],
                                    ['Branch', cert.metadata?.branch || '—'],
                                    ['Final CGPA', cert.metadata?.finalCGPA ?? '—'],
                                    ['Type', cert.certificateType || '—'],
                                    ['Reviewed By', cert.reviewedBy || 'Pending admin review'],
                                  ].map(([label, val]) => (
                                    <div key={label} className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-[#e0e0e0]">
                                      <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest">{label}</span>
                                      <span className="text-[9px] font-black text-[#202020] truncate max-w-[150px]">{val}</span>
                                    </div>
                                  ))}
                                  {cert.status === 'CONFIRMED' && cert.certificateHash && (
                                    <a href={`/verify/${cert.certificateId}`} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 mt-2 text-[9px] font-black text-[#ea2804] uppercase tracking-widest hover:underline">
                                      <ExternalLink size={11} /> View Verification Page
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Issue / Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!issuing) { setShowModal(false); setIssuedResult(null); setEditingCert(null); } }}
              className="absolute inset-0 bg-[#202020]/70 backdrop-blur-sm" />

            <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="relative w-full max-w-2xl bg-white border border-[#e0e0e0] rounded-3xl shadow-none flex flex-col max-h-[92vh]">

              {/* Modal header */}
              <div className="px-7 py-5 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f6f6f6]/80 shrink-0 rounded-t-3xl">
                <div>
                  <h2 className="text-lg font-black text-[#202020] tracking-tight">
                    {editingCert ? 'Edit' : 'Secure'} <span className="text-[#ea2804]">Issuance.</span>
                  </h2>
                  <p className="text-[#646464] text-[9px] font-black uppercase tracking-widest mt-0.5">
                    {editingCert ? 'Update record before admin review' : 'Blockchain Verification Engine'}
                  </p>
                </div>
                <button onClick={() => { setShowModal(false); setIssuedResult(null); setEditingCert(null); }} disabled={issuing}
                  className="w-8 h-8 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] hover:text-[#ea2804] flex items-center justify-center text-[#bbbbbb] transition-all">
                  <X size={14} />
                </button>
              </div>

              {/* Success screen */}
              {issuedResult ? (
                <div className="p-8 space-y-6 text-center overflow-y-auto">
                  <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full mx-auto flex items-center justify-center text-amber-600">
                    <Clock size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#202020] tracking-tight">
                      Submitted for <span className="text-amber-600">Review.</span>
                    </h3>
                    <p className="text-[#646464] text-xs font-bold uppercase tracking-widest mt-2">
                      An admin will review and approve this certificate before blockchain anchoring.
                    </p>
                  </div>
                  <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-2xl p-5 space-y-2 text-left">
                    <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Submitted Records</p>
                    {issuedResult.certificates?.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-[#e0e0e0] gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Semester {c.semester}</p>
                          <p className="text-[#ea2804] font-mono text-[9px] truncate">{c.certificateId}</p>
                        </div>
                        <button onClick={() => copy(c.certificateId, `r-${i}`)}
                          className="w-7 h-7 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] flex items-center justify-center text-[#bbbbbb] hover:text-[#ea2804] transition-all">
                          {copiedId === `r-${i}` ? <Check size={11} className="text-[#2b9a66]" /> : <Copy size={11} />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                      Status: Pending Admin Review. The student will be notified once the certificate is anchored on-chain.
                    </p>
                  </div>
                  <button onClick={() => { setShowModal(false); setIssuedResult(null); }} className="btn-primary w-full">
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <form onSubmit={editingCert ? handleEdit : handleIssue} className="flex flex-col flex-1 overflow-hidden">
                  <div className="overflow-y-auto flex-1 px-7 py-5 space-y-5">

                    {/* Student Info */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Step 1 — Student Information</p>
                      <input required placeholder="Full Name" value={form.studentName}
                        onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))} className={INPUT} />
                      <div className="grid grid-cols-2 gap-3">
                        <input required type="email" placeholder="student@university.edu" value={form.email}
                          onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={INPUT} />
                        <input required placeholder="Roll Number" value={form.rollNumber}
                          onChange={e => setForm(p => ({ ...p, rollNumber: e.target.value }))} className={INPUT} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input required placeholder="Program (e.g. BTech)" value={form.program}
                          onChange={e => setForm(p => ({ ...p, program: e.target.value }))} className={INPUT} />
                        <input required placeholder="Branch (e.g. CSE)" value={form.branch}
                          onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} className={INPUT} />
                      </div>
                      <input required type="number" step="0.01" min="0" max="10" placeholder="Final CGPA (e.g. 8.90)"
                        value={form.finalCGPA} onChange={e => setForm(p => ({ ...p, finalCGPA: e.target.value }))} className={INPUT} />
                    </div>

                    {/* Semesters */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Step 2 — Academic Record</p>
                        <button type="button" onClick={addSemester}
                          className="flex items-center gap-1 px-3 py-1 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full text-[9px] font-black text-[#ea2804] uppercase tracking-widest hover:bg-[#ea2804]/20 transition-all">
                          <Plus size={10} /> Semester
                        </button>
                      </div>

                      {form.semesters.map((sem, si) => (
                        <div key={si} className="border border-[#e0e0e0] rounded-2xl p-4 space-y-3 bg-[#f6f6f6]/60">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-[#202020] uppercase tracking-widest">Semester {sem.semester}</p>
                            <div className="flex items-center gap-2">
                              <input required type="number" step="0.01" min="0" max="10" placeholder="SGPA"
                                value={sem.sgpa} onChange={e => setSem(si, 'sgpa', e.target.value)}
                                className="w-20 h-8 bg-white border border-[#e0e0e0] rounded-xl px-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
                              {form.semesters.length > 1 && (
                                <button type="button" onClick={() => removeSemester(si)}
                                  className="w-6 h-6 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 text-[#ea2804] hover:bg-[#ea2804]/20 flex items-center justify-center transition-all">
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Subjects</p>
                            {sem.subjects.map((sub, xi) => (
                              <div key={xi} className="flex items-center gap-2">
                                <input required placeholder="Code (e.g. CS101)" value={sub.code}
                                  onChange={e => setSub(si, xi, 'code', e.target.value)}
                                  className="flex-1 h-8 bg-white border border-[#e0e0e0] rounded-xl px-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all uppercase" />
                                <input required type="number" min="0" max="100" placeholder="Marks"
                                  value={sub.marks} onChange={e => setSub(si, xi, 'marks', e.target.value)}
                                  className="w-20 h-8 bg-white border border-[#e0e0e0] rounded-xl px-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
                                {sem.subjects.length > 1 && (
                                  <button type="button" onClick={() => removeSubject(si, xi)}
                                    className="w-6 h-6 rounded-full border border-[#e0e0e0] bg-white text-[#bbbbbb] hover:text-[#ea2804] hover:border-[#ea2804] flex items-center justify-center transition-all shrink-0">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={() => addSubject(si)}
                              className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest hover:opacity-70 transition-opacity">
                              + Add Subject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Step 3 note */}
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                        Step 3 — Admin Review: An EduCred admin will verify and approve this record before it is anchored to the blockchain.
                      </p>
                    </div>
                  </div>

                  <div className="px-7 py-4 border-t border-[#e0e0e0] shrink-0 rounded-b-3xl">
                    <button type="submit" disabled={issuing} className="btn-primary w-full">
                      {issuing
                        ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                        : editingCert
                          ? <><Edit2 size={16} /> Update Record</>
                          : <><ShieldCheck size={16} /> Submit for Admin Review</>}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Batch Upload Modal ── */}
      <AnimatePresence>
        {showBatchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeBatchModal}
              className="absolute inset-0 bg-[#202020]/70 backdrop-blur-sm" />

            <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="relative w-full max-w-2xl bg-white border border-[#e0e0e0] rounded-3xl flex flex-col max-h-[92vh]">

              {/* Header */}
              <div className="px-7 py-5 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f6f6f6]/80 shrink-0 rounded-t-3xl">
                <div>
                  <h2 className="text-lg font-black text-[#202020] tracking-tight">
                    Batch <span className="text-[#ea2804]">Issuance.</span>
                  </h2>
                  <p className="text-[#646464] text-[9px] font-black uppercase tracking-widest mt-0.5">
                    Upload a CSV to issue multiple certificates at once
                  </p>
                </div>
                <button onClick={closeBatchModal} disabled={batchUploading}
                  className="w-8 h-8 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] hover:text-[#ea2804] flex items-center justify-center text-[#bbbbbb] transition-all">
                  <X size={14} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">

                {/* Results view */}
                {batchResults ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Processed', val: batchResults.processed, color: 'text-[#202020]' },
                        { label: 'Succeeded', val: batchResults.succeeded?.length ?? 0, color: 'text-[#2b9a66]' },
                        { label: 'Failed', val: batchResults.failed?.length ?? 0, color: 'text-[#ea2804]' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-2xl p-4 text-center">
                          <p className={`text-3xl font-black ${color}`}>{val}</p>
                          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mt-1">{label}</p>
                        </div>
                      ))}
                    </div>

                    {batchResults.succeeded?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle size={12} className="text-[#2b9a66]" /> Succeeded
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                          {batchResults.succeeded.map((s, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#2b9a66]/5 border border-[#2b9a66]/20 rounded-xl px-4 py-2.5 gap-3">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-[#202020] uppercase truncate">{s.studentName}</p>
                                <p className="text-[9px] font-mono text-[#646464] truncate">{s.email}</p>
                              </div>
                              <span className="text-[9px] font-mono text-[#2b9a66] shrink-0">{s.certificateId}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {batchResults.failed?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest flex items-center gap-2">
                          <XCircle size={12} className="text-[#ea2804]" /> Failed
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                          {batchResults.failed.map((f, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#ea2804]/5 border border-[#ea2804]/20 rounded-xl px-4 py-2.5 gap-3">
                              <span className="text-[9px] font-black text-[#646464] shrink-0">Row {f.row}</span>
                              <p className="text-[9px] font-bold text-[#ea2804] truncate">{f.error}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={closeBatchModal} className="btn-primary w-full">
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Template download */}
                    <div className="flex items-center justify-between bg-[#f6f6f6] border border-[#e0e0e0] rounded-2xl px-5 py-4">
                      <div>
                        <p className="text-[10px] font-black text-[#202020] uppercase tracking-widest">CSV Template</p>
                        <p className="text-[9px] text-[#646464] font-bold mt-0.5">
                          studentName, email, rollNumber, program, branch, finalCGPA, graduationYear, phone
                        </p>
                      </div>
                      <button onClick={downloadTemplate}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 text-[9px] font-black text-[#ea2804] uppercase tracking-widest hover:bg-[#ea2804]/20 transition-all shrink-0">
                        <Download size={11} /> Template
                      </button>
                    </div>

                    {/* Dropzone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setBatchDragOver(true); }}
                      onDragLeave={() => setBatchDragOver(false)}
                      onDrop={e => { e.preventDefault(); setBatchDragOver(false); handleBatchFile(e.dataTransfer.files[0]); }}
                      onClick={() => batchFileRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                        batchDragOver
                          ? 'border-[#ea2804] bg-[#ea2804]/5'
                          : batchFile
                            ? 'border-[#2b9a66] bg-[#2b9a66]/5'
                            : 'border-[#e0e0e0] hover:border-[#ea2804]/40 hover:bg-[#f6f6f6]'
                      }`}
                    >
                      <input ref={batchFileRef} type="file" accept=".csv" className="hidden"
                        onChange={e => handleBatchFile(e.target.files[0])} />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                        batchFile ? 'bg-[#2b9a66]/10 border-[#2b9a66]/20 text-[#2b9a66]' : 'bg-[#f6f6f6] border-[#e0e0e0] text-[#646464]'
                      }`}>
                        <Upload size={20} />
                      </div>
                      {batchFile ? (
                        <div className="text-center">
                          <p className="text-[10px] font-black text-[#2b9a66] uppercase tracking-widest">{batchFile.name}</p>
                          <p className="text-[9px] text-[#646464] font-bold mt-1">{(batchFile.size / 1024).toFixed(1)} KB — click to change</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-[10px] font-black text-[#202020] uppercase tracking-widest">Drop CSV here or click to browse</p>
                          <p className="text-[9px] text-[#646464] font-bold mt-1">CSV files only — max 5 MB</p>
                        </div>
                      )}
                    </div>

                    {/* Preview table */}
                    {batchPreview.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">
                          Preview — first {batchPreview.length} row{batchPreview.length > 1 ? 's' : ''}
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-[#e0e0e0]">
                          <table className="w-full text-left text-[8px] font-black uppercase tracking-widest">
                            <thead>
                              <tr className="bg-[#f6f6f6] border-b border-[#e0e0e0]">
                                {Object.keys(batchPreview[0]).map(k => (
                                  <th key={k} className="px-3 py-2.5 text-[#646464] whitespace-nowrap">{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f0f0]">
                              {batchPreview.map((row, i) => (
                                <tr key={i} className="hover:bg-[#f6f6f6]/60">
                                  {Object.values(row).map((v, j) => (
                                    <td key={j} className="px-3 py-2 text-[#202020] max-w-[100px] truncate">{v || '—'}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Warning */}
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                        All batch records require admin review before blockchain anchoring. Duplicate entries will be skipped.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {!batchResults && (
                <div className="px-7 py-4 border-t border-[#e0e0e0] shrink-0 rounded-b-3xl">
                  <button onClick={handleBatchIssue} disabled={!batchFile || batchUploading} className="btn-primary w-full">
                    {batchUploading
                      ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                      : <><Upload size={16} /> Confirm & Issue All</>}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Admin() {
  return <ToastProvider><AdminDashboard /></ToastProvider>;
}
