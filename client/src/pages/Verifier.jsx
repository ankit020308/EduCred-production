import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Copy,
  FileUp,
  Fingerprint,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const steps = [
  'Analyzing syntax payload',
  'Extracting structural hash fingerprint',
  'Querying verification source',
  'Resolving certificate metadata',
];

const transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

export default function Verifier() {
  const [mode, setMode] = useState('HASH');
  const [file, setFile] = useState(null);
  const [certificateId, setCertificateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading) return undefined;
    const intervalId = window.setInterval(() => {
      setStepIndex((current) => (current < steps.length - 1 ? current + 1 : current));
    }, 500);
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
      const response = mode === 'UPLOAD'
        ? await (() => {
            const data = new FormData();
            data.append('file', file);
            return api.post('/api/certificates/verify', data);
          })()
        : await api.post('/api/certificates/verify', { certificateId: certificateId.trim() });

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
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="btn-primary text-xs">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-24 pt-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="mx-auto max-w-3xl text-center space-y-8"
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
          <div className="mt-20 grid gap-10 lg:grid-cols-[400px_1fr]">

            {/* LEFT — Input */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition, delay: 0.1 }}
              className="bg-white rounded-full p-8 border border-[#202020] h-fit"
            >
              {/* Mode tabs */}
              <div className="flex p-1 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full mb-8">
                {['HASH', 'UPLOAD'].map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => { setMode(entry); setError(''); setResult(null); }}
                    className={`flex-1 rounded-full py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === entry
                        ? 'bg-white text-[#ea2804] border border-[#e0e0e0]'
                        : 'text-[#646464] hover:text-[#202020]'
                    }`}
                  >
                    {entry === 'UPLOAD' ? 'File Upload' : 'Verify by Hash'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                {mode === 'UPLOAD' ? (
                  <label className="block cursor-pointer rounded-full border-2 border-dashed border-[#e0e0e0] bg-[#f6f6f6] p-10 text-center transition-all hover:border-[#ea2804]/40 hover:bg-white group">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] || null);
                        setError('');
                        setResult(null);
                      }}
                    />
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#bbbbbb] border border-[#e0e0e0] group-hover:text-[#ea2804] group-hover:border-[#ea2804]/30 transition-all">
                      <FileUp size={24} />
                    </div>
                    <p className="mt-6 text-[11px] font-black text-[#202020] uppercase tracking-widest truncate max-w-[200px] mx-auto">
                      {file ? file.name : 'Select Certificate'}
                    </p>
                    <p className="mt-2 text-[9px] font-black text-[#bbbbbb] uppercase tracking-widest">PDF, PNG, JPG supported</p>
                  </label>
                ) : (
                  <div className="rounded-full border border-[#e0e0e0] bg-[#f6f6f6] p-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#646464]">
                      Enter SHA-256 Hash or Certificate ID
                    </label>
                    <div className="mt-4 flex items-center gap-4 rounded-full border border-[#e0e0e0] bg-white px-5 py-4 focus-within:border-[#ea2804] transition-all">
                      <Fingerprint className="text-[#bbbbbb]" size={20} />
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
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  {loading ? 'Verifying...' : 'Start Verification'}
                </button>
              </form>

              {/* Progress steps */}
              <div className="mt-8 pt-8 border-t border-[#e0e0e0]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#646464] mb-6">Verification Progress</p>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-black border transition-all ${
                        index <= stepIndex && loading
                          ? 'bg-[#ea2804] border-[#ea2804] text-white'
                          : !loading && index === steps.length - 1 && (result || error)
                            ? 'bg-[#2b9a66] border-[#2b9a66] text-white'
                            : 'bg-white border-[#e0e0e0] text-[#bbbbbb]'
                      }`}>
                        {index < stepIndex && loading ? <CheckCircle2 size={14} /> : index + 1}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${index <= stepIndex ? 'text-[#202020]' : 'text-[#bbbbbb]'}`}>
                        {step === 'Querying verification source' ? 'Blockchain Query' : step === 'Extracting structural hash fingerprint' ? 'Extracting Semantic Hash' : step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* RIGHT — Results */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition, delay: 0.1 }}
              className="bg-white rounded-full p-8 border border-[#202020] h-fit min-h-[600px]"
            >
              {!result && !error ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-12">
                  <div className="w-24 h-24 bg-[#f6f6f6] rounded-full flex items-center justify-center mb-10 border border-[#e0e0e0]">
                    <Search size={40} className="text-[#bbbbbb]" />
                  </div>
                  <h2 className="text-4xl font-black text-[#202020] tracking-tight leading-none mb-6">
                    Awaiting <br/> <span className="text-[#ea2804]">Verification.</span>
                  </h2>
                  <p className="text-[#646464] text-sm font-medium leading-relaxed max-w-sm">
                    Enter a certificate ID or upload a file to perform a secure, blockchain-backed authenticity check.
                  </p>
                </div>
              ) : error ? (
                <div className="bg-[#ea2804]/5 border border-[#ea2804]/20 rounded-full p-10 text-center flex flex-col items-center justify-center h-full min-h-[500px]">
                  <div className="w-20 h-20 bg-[#ea2804] text-white rounded-full flex items-center justify-center mb-8">
                    <ShieldAlert size={32} />
                  </div>
                  <h2 className="text-3xl font-black text-[#202020] uppercase tracking-tight mb-4">Verification Error</h2>
                  <p className="text-[#ea2804] text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Status header */}
                  <div className={`rounded-full p-10 border relative overflow-hidden ${
                    result.valid
                      ? 'border-[#2b9a66]/30 bg-[#2b9a66]/5'
                      : 'border-[#ea2804]/30 bg-[#ea2804]/5'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                          result.valid ? 'bg-[#2b9a66] text-white' : 'bg-[#ea2804] text-white'
                        }`}>
                          {result.valid ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${result.valid ? 'text-[#2b9a66]' : 'text-[#ea2804]'}`}>
                            {result.valid ? 'Record Verified' : 'Invalid Record'}
                          </p>
                          <h2 className="text-4xl font-black text-[#202020] tracking-tight leading-none">
                            {result.valid ? 'Authentic.' : 'Tampered.'}
                          </h2>
                        </div>
                      </div>

                      {result.valid && result.metadata?.certificateId && (
                        <Link to={`/student/${result.metadata.certificateId}`} className="btn-primary">
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Academic record */}
                  <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-full p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        ['Student', result.metadata?.studentName],
                        ['Roll No', result.metadata?.metadata?.studentEnrollmentNumber],
                        ['Program', result.metadata?.course],
                        ['Branch', result.metadata?.metadata?.branch],
                        ['Final CGPA', result.metadata?.metadata?.finalCGPA],
                        ['Certificate ID', result.metadata?.certificateId],
                      ].map(([label, val]) => (
                        <div key={label} className="bg-white border border-[#e0e0e0] rounded-full px-5 py-3">
                          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-1">{label}</p>
                          <p className="text-[12px] font-black text-[#202020] break-all">{val ?? 'N/A'}</p>
                        </div>
                      ))}
                    </div>

                    {/* Semester subjects */}
                    {result.metadata?.metadata?.semester != null && (
                      <div className="border-t border-[#e0e0e0] pt-4 space-y-3">
                        <p className="text-[10px] font-black text-[#202020] uppercase tracking-widest">
                          Semester {result.metadata.metadata.semester} — SGPA: {result.metadata.metadata.sgpa ?? '—'}
                        </p>
                        {result.metadata.metadata.subjects?.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {result.metadata.metadata.subjects.map((sub, i) => (
                              <div key={i} className="bg-white border border-[#e0e0e0] rounded-full px-4 py-2 flex items-center justify-between">
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

                    {/* Issuer / date */}
                    <div className="border-t border-[#e0e0e0] pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white border border-[#e0e0e0] rounded-full px-5 py-3">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-1">Issued By</p>
                        <p className="text-[12px] font-black text-[#202020]">{result.metadata?.issuer ?? 'N/A'}</p>
                      </div>
                      <div className="bg-white border border-[#e0e0e0] rounded-full px-5 py-3">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-1">Issued On</p>
                        <p className="text-[12px] font-black text-[#202020]">
                          {result.metadata?.createdAt
                            ? new Date(result.metadata.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hash section */}
                  <div className="bg-[#202020] text-white rounded-full p-8 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-4">Structural Data Fingerprint</p>
                        <p className="font-mono text-xs break-all text-[#ea2804] leading-relaxed bg-white/5 p-4 rounded-full">{result.hash}</p>
                      </div>
                      <button onClick={copyHash} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                        {copied ? <CheckCircle2 size={18} className="text-[#2b9a66]" /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>

                  {result.ledgerProof && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-full p-6">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-2">Blockchain Transaction</p>
                        <p className="text-[10px] font-mono break-all text-[#646464]">{result.ledgerProof.transactionHash}</p>
                      </div>
                      <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-full p-6">
                        <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-2">Timestamp</p>
                        <p className="text-[13px] font-black text-[#202020]">{result.ledgerProof.anchoredAt || result.ledgerProof.status}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}
