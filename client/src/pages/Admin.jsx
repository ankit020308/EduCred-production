import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ShieldCheck, Loader2, Clock, CheckCircle2,
  X, ShieldAlert, RefreshCcw, Database, Copy, ExternalLink,
  Check, FileText, History, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { ToastProvider, useToast } from '../components/Toast';
import socket, { joinInstitutionalRoom } from '../services/socket.mjs';

const vt = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } };

const emptySubject  = () => ({ code: '', marks: '' });
const emptySemester = (n) => ({ semester: n, sgpa: '', subjects: [emptySubject()] });

const INPUT = 'w-full h-11 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full px-5 text-sm text-[#202020] font-medium outline-none focus:bg-white focus:border-[#ea2804] transition-all';

function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [certs, setCerts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [issuing, setIssuing]           = useState(false);
  const [uniStatus, setUniStatus]       = useState(null);
  const [stats, setStats]               = useState({ total: 0, confirmed: 0, pending: 0, failed: 0 });
  const [copiedId, setCopiedId]         = useState(null);
  const [expandedRow, setExpandedRow]   = useState(null);
  const [issuedResult, setIssuedResult] = useState(null);

  const [form, setForm] = useState({
    studentName: '', email: '', rollNumber: '', program: '', branch: '', finalCGPA: '',
    semesters: [emptySemester(1)],
  });

  useEffect(() => {
    fetchUniStatus(); fetchCerts(); fetchStats();
    if (user?.universityId) {
      socket.connect();
      joinInstitutionalRoom(user.universityId);
      const onPending = (d) => toast.info(`Anchoring ${d.certificateId}…`);
      const onSuccess = (d) => { fetchCerts(); fetchStats(); toast.success(`${d.certificateId} anchored.`); };
      const onFailed  = (d) => { fetchCerts(); fetchStats(); toast.error(`Anchoring failed: ${d.certificateId}`); };
      socket.on('anchoring:pending', onPending);
      socket.on('anchoring:success', onSuccess);
      socket.on('anchoring:failed',  onFailed);
      return () => {
        socket.off('anchoring:pending', onPending);
        socket.off('anchoring:success', onSuccess);
        socket.off('anchoring:failed',  onFailed);
        if (socket.connected) socket.disconnect();
      };
    }
    return undefined;
  }, [user]);

  const fetchUniStatus = async () => {
    try { const r = await api.get('/api/auth/profile'); setUniStatus(r.data.university?.status || 'PENDING'); }
    catch { setUniStatus('PENDING'); }
  };
  const fetchStats = async () => {
    try { const r = await api.get('/api/certificates/stats'); setStats(r.data); } catch { /* ignore */ }
  };
  const fetchCerts = async () => {
    try { const r = await api.get('/api/certificates'); setCerts(r.data.data || []); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  // ── Semester helpers ──────────────────────────────────────────────────────
  const addSemester    = () => setForm(p => ({ ...p, semesters: [...p.semesters, emptySemester(p.semesters.length + 1)] }));
  const removeSemester = (i) => setForm(p => ({ ...p, semesters: p.semesters.filter((_, j) => j !== i) }));
  const setSem         = (i, field, val) => setForm(p => { const s = [...p.semesters]; s[i] = { ...s[i], [field]: val }; return { ...p, semesters: s }; });
  const addSubject     = (si) => setForm(p => { const s = [...p.semesters]; s[si] = { ...s[si], subjects: [...s[si].subjects, emptySubject()] }; return { ...p, semesters: s }; });
  const removeSubject  = (si, xi) => setForm(p => { const s = [...p.semesters]; s[si] = { ...s[si], subjects: s[si].subjects.filter((_, j) => j !== xi) }; return { ...p, semesters: s }; });
  const setSub         = (si, xi, field, val) => setForm(p => { const s = [...p.semesters]; const subs = [...s[si].subjects]; subs[xi] = { ...subs[xi], [field]: val }; s[si] = { ...s[si], subjects: subs }; return { ...p, semesters: s }; });

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
    } catch (err) {
      toast.error(err.response?.data?.error || 'Issuance failed.');
    } finally { setIssuing(false); }
  };

  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); toast.success('Copied.'); setTimeout(() => setCopiedId(null), 2000); }
    catch { toast.error('Copy failed.'); }
  };

  const filtered = certs.filter(c =>
    c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    c.course?.toLowerCase().includes(search.toLowerCase()) ||
    c.metadata?.studentEnrollmentNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6]">
      <div className="flex flex-col items-center gap-5">
        <Loader2 className="animate-spin text-[#ea2804]" size={36} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">Loading portal…</p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">

      {/* ── PENDING APPROVAL ──────────────────────────────────────────────── */}
      {uniStatus !== 'APPROVED' ? (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <motion.div {...vt} className="bg-white border border-[#202020] max-w-lg w-full p-12 text-center space-y-8 rounded-full">
            <div className="w-20 h-20 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full mx-auto flex items-center justify-center text-[#ea2804]">
              <ShieldAlert size={36} />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-[#202020] tracking-tight">Institution under <span className="text-[#ea2804]">review.</span></h1>
              <p className="text-[#646464] text-xs font-bold uppercase tracking-widest leading-relaxed">
                Your application is being reviewed. You'll be notified once issuance rights are granted.
              </p>
            </div>
            <div className="pt-6 border-t border-[#e0e0e0] flex flex-col items-center gap-4">
              <div className="px-5 py-2 rounded-full bg-[#f6f6f6] border border-[#e0e0e0] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#ea2804] animate-pulse" />
                <span className="text-[10px] font-black text-[#646464] uppercase tracking-widest">Status: {uniStatus || 'PENDING'}</span>
              </div>
              <button onClick={fetchUniStatus}
                className="btn-secondary w-full text-xs">
                <RefreshCcw size={14} /> Refresh Status
              </button>
            </div>
          </motion.div>
        </div>
      ) : (

        /* ── DASHBOARD ───────────────────────────────────────────────────── */
        <div className="space-y-10">

          {/* Header */}
          <motion.div {...vt} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ea2804] animate-pulse" />
                <span className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest">Portal Verified</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-[#202020] tracking-tight leading-none">
                Institution <span className="text-[#ea2804]">Portal.</span>
              </h1>
              <p className="text-[#646464] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Database size={13} className="text-[#ea2804]" /> {user?.universityName || 'Institution Dashboard'}
              </p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
              <Plus size={16} /> Issue Certificate
            </button>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: FileText,    label: 'Total Issued',  val: stats.total,     color: 'text-[#ea2804]',  bg: 'bg-[#ea2804]/10',  border: 'border-[#ea2804]/20' },
              { icon: CheckCircle2,label: 'On-Chain',      val: stats.confirmed, color: 'text-[#2b9a66]',  bg: 'bg-[#2b9a66]/10',  border: 'border-[#2b9a66]/20' },
              { icon: Clock,       label: 'Processing',    val: stats.pending,   color: 'text-[#646464]',  bg: 'bg-[#646464]/10',  border: 'border-[#646464]/20' },
              { icon: ShieldAlert, label: 'Revoked',       val: stats.failed,    color: 'text-[#202020]',  bg: 'bg-[#202020]/5',   border: 'border-[#202020]/10' },
            ].map((s, i) => (
              <motion.div key={i} {...vt} transition={{ delay: i * 0.08 }}
                className="bg-white border border-[#202020] rounded-full p-8 group hover:-translate-y-1 transition-all duration-300">
                <div className={`w-11 h-11 rounded-full ${s.bg} ${s.border} border mb-7 flex items-center justify-center group-hover:bg-[#ea2804] group-hover:border-[#ea2804] transition-all`}>
                  <s.icon className={`${s.color} group-hover:text-white transition-colors`} size={20} />
                </div>
                <span className="text-5xl font-black text-[#202020] tracking-tight block leading-none">{s.val}</span>
                <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest mt-3 block">{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Table */}
          <motion.div {...vt} transition={{ delay: 0.25 }}
            className="bg-white border border-[#202020] rounded-full overflow-hidden">
            <div className="px-8 py-6 border-b border-[#e0e0e0] flex flex-col md:flex-row md:items-center justify-between gap-5 bg-[#f6f6f6]">
              <div className="flex items-center gap-3">
                <History className="text-[#ea2804]" size={20} />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#202020]">Issuance Records</h3>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bbbbbb]" size={16} />
                <input placeholder="Search by name, program, roll no…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-11 bg-white border border-[#e0e0e0] rounded-full pl-12 pr-5 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="text-[9px] font-black uppercase tracking-widest text-[#646464] bg-[#f6f6f6]/50">
                    {['Student', 'Roll No', 'Program', 'Sem', 'CGPA', 'Status', 'Hash', 'Date', ''].map(h => (
                      <th key={h} className="px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-6 text-[#bbbbbb]">
                          <div className="w-16 h-16 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full flex items-center justify-center">
                            <Database size={32} />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-[#bbbbbb]">No records found</p>
                            <button onClick={() => setShowModal(true)}
                              className="text-[10px] font-black uppercase tracking-widest text-[#ea2804] hover:underline">
                              Issue your first certificate →
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((cert) => (
                    <>
                      <tr key={cert.id} className="group hover:bg-[#f6f6f6] transition-all">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center text-[#ea2804] font-black text-xs shrink-0 group-hover:bg-[#ea2804] group-hover:text-white transition-all">
                              {cert.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[#202020] font-black text-[10px] tracking-wide uppercase">{cert.studentName}</p>
                              <p className="text-[#646464] text-[9px] font-bold tracking-wide">{cert.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5"><span className="text-[#202020] text-[10px] font-black uppercase">{cert.metadata?.studentEnrollmentNumber || '—'}</span></td>
                        <td className="px-6 py-5"><span className="text-[#646464] text-[10px] font-black uppercase">{cert.course}</span></td>
                        <td className="px-6 py-5"><span className="text-[#646464] text-[10px] font-black">{cert.metadata?.semester ?? '—'}</span></td>
                        <td className="px-6 py-5"><span className="text-[#202020] text-[10px] font-black">{cert.metadata?.finalCGPA ?? '—'}</span></td>
                        <td className="px-6 py-5"><StatusBadge status={cert.status} /></td>
                        <td className="px-6 py-5">
                          <button onClick={() => copy(cert.certificateHash || '', `hash-${cert.id}`)}
                            className="flex items-center gap-2 bg-[#f6f6f6] px-3 py-1.5 rounded-full border border-[#e0e0e0] hover:border-[#ea2804] transition-all"
                            title={cert.certificateHash}>
                            <span className="text-[9px] font-mono text-[#646464] w-16 truncate">{cert.certificateHash?.substring(0, 10) || '—'}…</span>
                            {copiedId === `hash-${cert.id}` ? <Check size={10} className="text-[#2b9a66]" /> : <Copy size={10} className="text-[#bbbbbb]" />}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[#646464] text-[9px] font-bold">
                            {new Date(cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <button onClick={() => setExpandedRow(expandedRow === cert.id ? null : cert.id)}
                            className="w-8 h-8 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] hover:text-[#ea2804] flex items-center justify-center text-[#bbbbbb] transition-all ml-auto">
                            {expandedRow === cert.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                      </tr>

                      {expandedRow === cert.id && (
                        <tr key={`${cert.id}-exp`} className="bg-[#ea2804]/3">
                          <td colSpan={9} className="px-8 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-3">
                                <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">
                                  Semester {cert.metadata?.semester ?? '—'} — SGPA: {cert.metadata?.sgpa ?? '—'}
                                </p>
                                {cert.metadata?.subjects?.length > 0
                                  ? cert.metadata.subjects.map((sub, si) => (
                                    <div key={si} className="flex items-center justify-between bg-white px-5 py-2.5 rounded-full border border-[#e0e0e0]">
                                      <span className="text-[10px] font-black text-[#202020] uppercase">{sub.code}</span>
                                      <span className="text-[10px] font-black text-[#ea2804]">{sub.marks}</span>
                                    </div>
                                  ))
                                  : <p className="text-[10px] text-[#bbbbbb] font-black uppercase tracking-widest">No subject data</p>}
                              </div>
                              <div className="space-y-3">
                                <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Certificate Details</p>
                                {[['ID', cert.certificateId || cert.id], ['Branch', cert.metadata?.branch || '—'], ['Final CGPA', cert.metadata?.finalCGPA ?? '—'], ['Type', cert.certificateType || '—']].map(([label, val]) => (
                                  <div key={label} className="flex items-center justify-between bg-white px-5 py-2.5 rounded-full border border-[#e0e0e0]">
                                    <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest">{label}</span>
                                    <span className="text-[10px] font-black text-[#202020] truncate max-w-[160px]">{val}</span>
                                  </div>
                                ))}
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

      {/* ── ISSUE MODAL ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!issuing) { setShowModal(false); setIssuedResult(null); } }}
              className="absolute inset-0 bg-[#202020]/70 backdrop-blur-sm" />

            <motion.div initial={{ scale: 0.96, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 16 }}
              className="relative w-full max-w-2xl bg-white border border-[#202020] rounded-full shadow-none flex flex-col max-h-[90vh]">

              {/* Modal header */}
              <div className="px-8 py-6 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f6f6f6] shrink-0">
                <div>
                  <h2 className="text-xl font-black text-[#202020] tracking-tight">Secure <span className="text-[#ea2804]">Issuance.</span></h2>
                  <p className="text-[#646464] text-[9px] font-black uppercase tracking-widest mt-1">Blockchain Verification Engine</p>
                </div>
                <button onClick={() => { setShowModal(false); setIssuedResult(null); }} disabled={issuing}
                  className="w-9 h-9 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] hover:text-[#ea2804] flex items-center justify-center text-[#bbbbbb] transition-all">
                  <X size={16} />
                </button>
              </div>

              {/* Success */}
              {issuedResult ? (
                <div className="p-10 space-y-7 text-center overflow-y-auto">
                  <div className="w-18 h-18 w-[4.5rem] h-[4.5rem] bg-[#2b9a66]/10 border border-[#2b9a66]/20 rounded-full mx-auto flex items-center justify-center text-[#2b9a66]">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#202020] tracking-tight">Anchor <span className="text-[#2b9a66]">Complete.</span></h3>
                    <p className="text-[#646464] text-xs font-bold uppercase tracking-widest mt-2">{issuedResult.message}</p>
                  </div>

                  <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-full p-6 space-y-3 text-left">
                    <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest px-2">Issued Certificates</p>
                    {issuedResult.certificates?.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-5 py-3 rounded-full border border-[#e0e0e0] gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Semester {c.semester}</p>
                          <p className="text-[#ea2804] font-mono text-[10px] truncate">{c.certificateId}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => copy(c.certificateId, `r-${i}`)}
                            className="w-8 h-8 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] flex items-center justify-center text-[#bbbbbb] hover:text-[#ea2804] transition-all">
                            {copiedId === `r-${i}` ? <Check size={12} className="text-[#2b9a66]" /> : <Copy size={12} />}
                          </button>
                          <a href={`/verify/${c.certificateId}`} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-[#ea2804] flex items-center justify-center text-white hover:bg-[#dd4425] transition-all">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => { setShowModal(false); setIssuedResult(null); }} className="btn-primary w-full">
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleIssue} className="flex flex-col flex-1 overflow-hidden">
                  <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">

                    {/* Student Info */}
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Student Information</p>
                      <input required placeholder="Full Name" value={form.studentName}
                        onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))} className={INPUT} />
                      <div className="grid grid-cols-2 gap-3">
                        <input required type="email" placeholder="Email" value={form.email}
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
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Academic Record</p>
                        <button type="button" onClick={addSemester}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full text-[9px] font-black text-[#ea2804] uppercase tracking-widest hover:bg-[#ea2804]/20 transition-all">
                          <Plus size={11} /> Semester
                        </button>
                      </div>

                      {form.semesters.map((sem, si) => (
                        <div key={si} className="border border-[#e0e0e0] rounded-3xl p-5 space-y-4 bg-[#f6f6f6]/60">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-[#202020] uppercase tracking-widest">Semester {sem.semester}</p>
                            <div className="flex items-center gap-3">
                              <input required type="number" step="0.01" min="0" max="10" placeholder="SGPA"
                                value={sem.sgpa} onChange={e => setSem(si, 'sgpa', e.target.value)}
                                className="w-20 h-8 bg-white border border-[#e0e0e0] rounded-full px-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
                              {form.semesters.length > 1 && (
                                <button type="button" onClick={() => removeSemester(si)}
                                  className="w-7 h-7 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 text-[#ea2804] hover:bg-[#ea2804]/20 flex items-center justify-center transition-all">
                                  <Trash2 size={12} />
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
                                  className="flex-1 h-9 bg-white border border-[#e0e0e0] rounded-full px-4 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all uppercase" />
                                <input required type="number" min="0" max="100" placeholder="Marks"
                                  value={sub.marks} onChange={e => setSub(si, xi, 'marks', e.target.value)}
                                  className="w-20 h-9 bg-white border border-[#e0e0e0] rounded-full px-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
                                {sem.subjects.length > 1 && (
                                  <button type="button" onClick={() => removeSubject(si, xi)}
                                    className="w-7 h-7 rounded-full border border-[#e0e0e0] bg-white text-[#bbbbbb] hover:text-[#ea2804] hover:border-[#ea2804] flex items-center justify-center transition-all shrink-0">
                                    <X size={11} />
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
                  </div>

                  <div className="px-8 py-5 border-t border-[#e0e0e0] shrink-0">
                    <button type="submit" disabled={issuing} className="btn-primary w-full">
                      {issuing ? <><Loader2 size={18} className="animate-spin" /> Anchoring…</> : <><ShieldCheck size={18} /> Finalise and Secure Record</>}
                    </button>
                  </div>
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
  return <ToastProvider><AdminDashboard /></ToastProvider>;
}
