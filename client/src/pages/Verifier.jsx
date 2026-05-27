import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  Fingerprint,
  LayoutDashboard,
  Loader2,
  LogOut,
  Rows3,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { quoteCSVCell } from '../utils/csv';

const steps = [
  'Analyzing syntax payload',
  'Extracting semantic hash',
  'Blockchain query',
  'Resolving metadata',
];

const transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

export default function Verifier() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('HASH');
  const [file, setFile] = useState(null);
  const [certificateId, setCertificateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Bulk verification state
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkIds, setBulkIds] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkError, setBulkError] = useState('');
  const bulkInputRef = useRef(null);

  useEffect(() => {
    if (!loading) return undefined;
    const intervalId = window.setInterval(() => {
      setStepIndex((current) => (current < steps.length - 1 ? current + 1 : current));
    }, 600);
    return () => window.clearInterval(intervalId);
  }, [loading]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    return mode === 'UPLOAD' ? Boolean(file) : Boolean(certificateId.trim());
  }, [certificateId, file, loading, mode]);

  async function handleVerify(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setStepIndex(0);
    setResult(null);
    setError('');

    try {
      let response;
      if (mode === 'UPLOAD') {
        const formData = new FormData();
        formData.append('certificate', file);
        // Clear the default JSON Content-Type so browser sets multipart/form-data with boundary
        response = await api.post('/api/certificates/verify/pdf', formData, {
          headers: { 'Content-Type': undefined },
        });
        // Normalise verifyPDFCertificate response shape → { valid, metadata }
        const d = response.data;
        setResult({
          valid: d.verified === true,
          onChainConsensus: false,
          verificationSource: 'pdf_integrity',
          message: d.message,
          hash: null,
          metadata: d.cert ? {
            certificateId: d.cert.certId,
            studentName: d.cert.studentName,
            course: d.cert.degree,
            issuer: d.cert.university,
            createdAt: d.cert.issuedAt,
          } : null,
        });
        return;
      } else {
        response = await api.post('/api/certificates/verify', { certificateId: certificateId.trim() });
      }
      setResult(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          'Verification failed.'
      );
    } finally {
      setLoading(false);
      setStepIndex(steps.length - 1);
    }
  }

  async function copyHash() {
    if (!result?.hash) return;
    try {
      await navigator.clipboard.writeText(result.hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* silently fail */ }
  }

  async function handleBulkVerify(event) {
    event.preventDefault();
    setBulkError('');
    setBulkResults(null);
    setBulkLoading(true);
    try {
      if (bulkFile) {
        const formData = new FormData();
        formData.append('file', bulkFile);
        const res = await api.post('/api/certificates/verify/bulk', formData, {
          headers: { 'Content-Type': undefined },
        });
        setBulkResults(res.data);
      } else {
        const ids = bulkIds
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!ids.length) {
          setBulkError('Enter at least one certificate ID.');
          setBulkLoading(false);
          return;
        }
        const res = await api.post('/api/certificates/verify/bulk', { ids });
        setBulkResults(res.data);
      }
    } catch (err) {
      setBulkError(err.response?.data?.error || 'Bulk verification failed.');
    } finally {
      setBulkLoading(false);
    }
  }

  function downloadBulkCSV() {
    if (!bulkResults?.results) return;
    const header = 'certificateId,valid,reason,studentName,degree,issuer,issuedAt,txHash';
    const rows = bulkResults.results.map((r) =>
      [r.id, r.valid, r.reason, r.studentName ?? '', r.degree ?? '', r.issuer ?? '',
        r.issuedAt ? new Date(r.issuedAt).toLocaleDateString() : '', r.txHash ?? '']
        .map(quoteCSVCell).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `educred-bulk-verification-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f6f6f6] text-[#202020] font-sans">

      {/* Dark hero strip */}
      <div className="fixed top-0 inset-x-0 h-72 bg-[#202020] pointer-events-none z-0" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#202020]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#ea2804] rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" size={16} />
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              Edu<span className="text-[#ea2804]">Cred</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <button onClick={() => navigate('/dashboard')}
                  className="btn-primary !px-4 !py-2 !text-[10px]">
                  <LayoutDashboard size={13} /> Dashboard
                </button>
                <button onClick={() => { logout(); navigate('/login'); }}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-white transition-colors">
                  <LogOut size={13} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary text-xs">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-24 pt-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="mx-auto max-w-3xl text-center space-y-6 mb-16"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-[#ea2804]/30 bg-[#ea2804]/10 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-[#ea2804]">
              <ShieldCheck size={14} className="animate-pulse" />
              Secure Verification Active
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.9]">
              Instant <span className="text-[#ea2804]">Validation.</span>
            </h1>
            <p className="max-w-xl mx-auto text-[#646464] text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Verify the authenticity of any EduCred certificate across the global blockchain network.
            </p>
          </motion.div>

          {/* Main verifier grid */}
          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">

            {/* LEFT — Input panel */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition, delay: 0.1 }}
              className="bg-white rounded-3xl p-7 border border-[#e0e0e0] h-fit"
            >
              {/* Mode tabs */}
              <div className="flex p-1 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full mb-7">
                {[
                  { key: 'HASH', label: 'By Hash' },
                  { key: 'UPLOAD', label: 'File' },
                  { key: 'BULK', label: 'Bulk' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMode(key);
                      setError(''); setResult(null);
                      setBulkError(''); setBulkResults(null);
                    }}
                    className={`flex-1 rounded-full py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === key
                        ? 'bg-white text-[#ea2804] border border-[#e0e0e0]'
                        : 'text-[#646464] hover:text-[#202020]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'BULK' ? (
                <form onSubmit={handleBulkVerify} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#646464]">
                      Upload CSV <span className="text-[#bbbbbb] normal-case font-medium">(column: certificateId or id)</span>
                    </label>
                    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-[#e0e0e0] bg-[#f6f6f6] p-6 text-center transition-all hover:border-[#ea2804]/40 hover:bg-white group">
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,text/csv"
                        ref={bulkInputRef}
                        onChange={(e) => {
                          setBulkFile(e.target.files?.[0] || null);
                          setBulkIds('');
                          setBulkError('');
                          setBulkResults(null);
                        }}
                      />
                      <Rows3 size={20} className="mx-auto text-[#bbbbbb] group-hover:text-[#ea2804] mb-2 transition-colors" />
                      <p className="text-[11px] font-black text-[#202020] uppercase tracking-widest truncate max-w-[200px] mx-auto">
                        {bulkFile ? bulkFile.name : 'Select CSV File'}
                      </p>
                      <p className="mt-1 text-[9px] font-black text-[#bbbbbb] uppercase tracking-widest">Up to 100 certificates</p>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#e0e0e0]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#bbbbbb]">or paste IDs</span>
                    <div className="h-px flex-1 bg-[#e0e0e0]" />
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={bulkIds}
                      onChange={(e) => {
                        setBulkIds(e.target.value);
                        setBulkFile(null);
                        if (bulkInputRef.current) bulkInputRef.current.value = '';
                        setBulkError('');
                        setBulkResults(null);
                      }}
                      rows={4}
                      placeholder={"EC-2024-001\nEC-2024-002\nEC-2024-003"}
                      className="w-full rounded-xl border border-[#e0e0e0] bg-[#f6f6f6] px-4 py-3 text-[11px] font-mono text-[#202020] placeholder:text-[#bbbbbb] outline-none resize-none focus:border-[#ea2804] focus:bg-white transition-all"
                    />
                  </div>

                  {bulkError && (
                    <p className="text-[10px] font-black text-[#ea2804] uppercase tracking-widest">{bulkError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={bulkLoading || (!bulkFile && !bulkIds.trim())}
                    className="btn-primary w-full"
                  >
                    {bulkLoading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    {bulkLoading ? 'Verifying Batch...' : 'Run Bulk Verification'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerify} className="space-y-5">
                  {mode === 'UPLOAD' ? (
                    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-[#e0e0e0] bg-[#f6f6f6] p-8 text-center transition-all hover:border-[#ea2804]/40 hover:bg-white group">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,application/pdf"
                        onChange={(event) => {
                          setFile(event.target.files?.[0] || null);
                          setError('');
                          setResult(null);
                        }}
                      />
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#bbbbbb] border border-[#e0e0e0] group-hover:text-[#ea2804] group-hover:border-[#ea2804]/30 transition-all mb-4">
                        <FileUp size={22} />
                      </div>
                      <p className="text-[11px] font-black text-[#202020] uppercase tracking-widest truncate max-w-[200px] mx-auto">
                        {file ? file.name : 'Select Certificate'}
                      </p>
                      <p className="mt-1.5 text-[9px] font-black text-[#bbbbbb] uppercase tracking-widest">EduCred-issued PDF certificates only</p>
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#646464]">
                        SHA-256 Hash or Certificate ID
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-[#e0e0e0] bg-[#f6f6f6] px-4 py-3.5 focus-within:border-[#ea2804] focus-within:bg-white transition-all">
                        <Fingerprint className="text-[#bbbbbb] shrink-0" size={18} />
                        <input
                          value={certificateId}
                          onChange={(event) => {
                            setCertificateId(event.target.value);
                            setError('');
                            setResult(null);
                          }}
                          placeholder="SHA-256 hash or EDUCRED-2025-..."
                          className="w-full bg-transparent text-[11px] font-black tracking-widest text-[#202020] outline-none placeholder:text-[#bbbbbb] font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    {loading ? 'Verifying...' : 'Start Verification'}
                  </button>
                </form>
              )}

              {/* Progress steps */}
              <div className="mt-7 pt-7 border-t border-[#e0e0e0]">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#646464] mb-5">Verification Progress</p>
                <div className="space-y-3">
                  {steps.map((step, index) => {
                    const isDone = loading && index < stepIndex;
                    const isActive = loading && index === stepIndex;
                    const isComplete = !loading && (result || error) && index === steps.length - 1;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-black border transition-all ${
                          isDone || isActive
                            ? 'bg-[#ea2804] border-[#ea2804] text-white'
                            : isComplete
                              ? 'bg-[#2b9a66] border-[#2b9a66] text-white'
                              : 'bg-white border-[#e0e0e0] text-[#bbbbbb]'
                        }`}>
                          {isDone ? <CheckCircle2 size={12} /> : index + 1}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                          isDone || isActive || isComplete ? 'text-[#202020]' : 'text-[#bbbbbb]'
                        }`}>
                          {step}
                        </p>
                        {isActive && <Loader2 size={12} className="animate-spin text-[#ea2804] ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {/* RIGHT — Results panel */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition, delay: 0.1 }}
            >
              {/* Bulk results */}
              {mode === 'BULK' && (
                <AnimatePresence mode="wait">
                  {!bulkResults && !bulkError && (
                    <motion.div key="bulk-await"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-white border border-[#e0e0e0] rounded-3xl flex flex-col items-center justify-center min-h-[480px] p-12 text-center">
                      <div className="w-20 h-20 bg-[#f6f6f6] rounded-full flex items-center justify-center mb-8 border border-[#e0e0e0]">
                        <Rows3 size={36} className="text-[#bbbbbb]" />
                      </div>
                      <h2 className="text-4xl font-black text-[#202020] tracking-tight leading-none mb-4">
                        Batch <span className="text-[#ea2804]">Verification.</span>
                      </h2>
                      <p className="text-[#646464] text-sm font-medium leading-relaxed max-w-xs">
                        Upload a CSV or paste certificate IDs to verify up to 100 credentials in one request.
                      </p>
                    </motion.div>
                  )}
                  {bulkLoading && (
                    <motion.div key="bulk-loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="bg-white border border-[#e0e0e0] rounded-3xl flex flex-col items-center justify-center min-h-[480px]">
                      <Loader2 size={40} className="animate-spin text-[#ea2804] mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">Running batch verification…</p>
                    </motion.div>
                  )}
                  {bulkResults && (
                    <motion.div key="bulk-results"
                      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="space-y-4">

                      {/* Summary bar */}
                      <div className="bg-[#202020] rounded-3xl p-6 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Total</p>
                            <p className="text-3xl font-black text-white">{bulkResults.summary.total}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-[#2b9a66] uppercase tracking-widest">Valid</p>
                            <p className="text-3xl font-black text-[#2b9a66]">{bulkResults.summary.valid}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest">Invalid</p>
                            <p className="text-3xl font-black text-[#ea2804]">{bulkResults.summary.invalid}</p>
                          </div>
                        </div>
                        <button
                          onClick={downloadBulkCSV}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                        >
                          <Download size={14} /> Export CSV
                        </button>
                      </div>

                      {/* Results table */}
                      <div className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-[#e0e0e0] bg-[#f6f6f6]">
                                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-[#646464]">ID</th>
                                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-[#646464]">Status</th>
                                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-[#646464]">Student</th>
                                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-[#646464]">Issuer</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkResults.results.map((row, i) => (
                                <tr key={i} className="border-b border-[#e0e0e0] last:border-0 hover:bg-[#f6f6f6] transition-colors">
                                  <td className="px-5 py-3 font-mono text-[10px] text-[#646464] max-w-[140px] truncate">{row.id}</td>
                                  <td className="px-5 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                      row.valid
                                        ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]'
                                        : 'bg-[#fff1f2] text-[#be123c] border border-[#fecdd3]'
                                    }`}>
                                      {row.valid ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                      {row.valid ? 'Verified' : row.reason}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-[#202020] font-black">{row.studentName ?? '—'}</td>
                                  <td className="px-5 py-3 text-[#646464]">{row.issuer ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Single verification results */}
              {mode !== 'BULK' && (
              <AnimatePresence mode="wait">

                {/* Awaiting state */}
                {!result && !error && (
                  <motion.div key="await"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-white border border-[#e0e0e0] rounded-3xl flex flex-col items-center justify-center min-h-[480px] p-12 text-center">
                    <div className="w-20 h-20 bg-[#f6f6f6] rounded-full flex items-center justify-center mb-8 border border-[#e0e0e0]">
                      <Search size={36} className="text-[#bbbbbb]" />
                    </div>
                    <h2 className="text-4xl font-black text-[#202020] tracking-tight leading-none mb-4">
                      Awaiting <span className="text-[#ea2804]">Verification.</span>
                    </h2>
                    <p className="text-[#646464] text-sm font-medium leading-relaxed max-w-xs">
                      Enter a certificate ID or upload a file to perform a secure, blockchain-backed authenticity check.
                    </p>
                  </motion.div>
                )}

                {/* Error state */}
                {error && !result && (
                  <motion.div key="error"
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="bg-white border border-[#ea2804]/20 rounded-3xl overflow-hidden">
                    <div className="bg-[#ea2804] px-8 py-12 flex flex-col items-center text-center gap-4">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                        <XCircle size={40} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Verification Result</p>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tight">Not Found.</h2>
                      </div>
                    </div>
                    <div className="p-8 text-center">
                      <p className="text-[#ea2804] text-sm font-bold">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Result state */}
                {result && (
                  <motion.div key="result"
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4">

                    {/* Hero status banner */}
                    <div className={`rounded-3xl overflow-hidden ${result.valid ? 'bg-[#2b9a66]' : 'bg-[#ea2804]'}`}>
                      <div className="px-8 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-18 h-18 w-[72px] h-[72px] bg-white/20 rounded-full flex items-center justify-center shrink-0">
                            {result.valid
                              ? <ShieldCheck size={36} className="text-white" />
                              : <ShieldAlert size={36} className="text-white" />
                            }
                          </div>
                          <div>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">
                              Blockchain Verification
                            </p>
                            <h2 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
                              {result.valid ? 'Verified.' : 'Invalid.'}
                            </h2>
                            <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mt-2">
                              {result.valid
                                ? (result.onChainConsensus ? 'On-chain consensus confirmed' : 'Database record found')
                                : 'No authentic record found'}
                            </p>
                          </div>
                        </div>
                        {result.valid && result.metadata?.certificateId && (
                          <Link to={`/student/${result.metadata.certificateId}`}
                            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white/20 border border-white/30 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white/30 transition-all">
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Academic record */}
                    {result.metadata && (
                      <div className="bg-white border border-[#e0e0e0] rounded-3xl p-6 space-y-4">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Certificate Record</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            ['Student', result.metadata.studentName],
                            ['Roll No', result.metadata.metadata?.studentEnrollmentNumber],
                            ['Program', result.metadata.course],
                            ['Branch', result.metadata.metadata?.branch],
                            ['Final CGPA', result.metadata.metadata?.finalCGPA],
                            ['Certificate ID', result.metadata.certificateId],
                          ].map(([label, val]) => (
                            <div key={label} className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 py-3">
                              <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-1">{label}</p>
                              <p className="text-[12px] font-black text-[#202020] break-all">{val ?? '—'}</p>
                            </div>
                          ))}
                        </div>

                        {/* Semester subjects */}
                        {result.metadata.metadata?.semester != null && (
                          <div className="border-t border-[#e0e0e0] pt-4 space-y-3">
                            <p className="text-[10px] font-black text-[#202020] uppercase tracking-widest">
                              Semester {result.metadata.metadata.semester} — SGPA: {result.metadata.metadata.sgpa ?? '—'}
                            </p>
                            {result.metadata.metadata.subjects?.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {result.metadata.metadata.subjects.map((sub, i) => (
                                  <div key={i} className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 py-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[#646464] uppercase tracking-wider">{sub.code}</span>
                                    <span className="text-[11px] font-black text-[#ea2804]">{sub.marks}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-[#bbbbbb] font-black uppercase tracking-widest">No subject data available</p>
                            )}
                          </div>
                        )}

                        <div className="border-t border-[#e0e0e0] pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 py-3">
                            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-1">Issued By</p>
                            <p className="text-[12px] font-black text-[#202020]">{result.metadata.issuer ?? '—'}</p>
                          </div>
                          <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 py-3">
                            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-1">Issued On</p>
                            <p className="text-[12px] font-black text-[#202020]">
                              {result.metadata.createdAt
                                ? new Date(result.metadata.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                                : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hash fingerprint */}
                    {result.hash && (
                      <div className="bg-[#202020] rounded-3xl p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-3">SHA-256 Fingerprint</p>
                            <p className="font-mono text-xs break-all text-[#ea2804] leading-relaxed bg-white/5 border border-white/10 p-4 rounded-xl">{result.hash}</p>
                          </div>
                          <button onClick={copyHash}
                            className="shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all mt-6">
                            {copied ? <CheckCircle2 size={16} className="text-[#2b9a66]" /> : <Copy size={16} className="text-white" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Ledger proof */}
                    {result.ledgerProof && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5">
                          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-2">Blockchain Transaction</p>
                          <p className="text-[10px] font-mono break-all text-[#646464] leading-relaxed">{result.ledgerProof.transactionHash || '—'}</p>
                        </div>
                        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5">
                          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-2">Anchored At</p>
                          <p className="text-[13px] font-black text-[#202020]">{result.ledgerProof.anchoredAt || result.ledgerProof.status}</p>
                        </div>
                      </div>
                    )}

                    {/* DB-only warning */}
                    {result.warning && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                        <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">{result.warning}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              )}
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}
