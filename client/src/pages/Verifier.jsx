import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, FileSearch, CheckCircle2, Loader2, Activity,
  User as UserIcon, GraduationCap, Fingerprint, FileText,
  Search, Upload, ArrowRight, ShieldAlert, Download, Copy, Check
} from 'lucide-react';
import api from '../services/api';
import BlockchainBackground from '../components/BlockchainBackground';

const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

// Verification steps — run concurrently with the actual API call
const STEPS = [
  'Establishing Secure Channel...',
  'Re-computing SHA-256 Digest...',
  'Querying Decentralized Ledger...',
  'Validating Institutional Metadata...',
  'Consensus Reached.',
];

export default function Verifier() {
  const [file, setFile] = useState(null);
  const [certificateId, setCertificateId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('FILE');
  const [typedHash, setTypedHash] = useState('');
  const [step, setStep] = useState(0);
  const [hashCopied, setHashCopied] = useState(false);

  // Animated hash typewriter on result
  useEffect(() => {
    if (!result?.hash) return;
    let i = 0;
    setTypedHash('');
    const interval = setInterval(() => {
      setTypedHash(result.hash.slice(0, i));
      i++;
      if (i > result.hash.length) clearInterval(interval);
    }, 12);
    return () => clearInterval(interval);
  }, [result]);

  const copyHash = async () => {
    if (!result?.hash) return;
    try {
      await navigator.clipboard.writeText(result.hash);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    } catch { /* silent */ }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (mode === 'FILE' && !file) return;
    if (mode === 'ID' && !certificateId.trim()) return;

    setVerifying(true);
    setError('');
    setResult(null);
    setStep(0);

    // Run the step animation concurrently with the API call
    // Steps advance every ~700ms while the request is in flight
    const stepInterval = setInterval(() => {
      setStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }, 700);

    try {
      let res;
      if (mode === 'FILE') {
        const data = new FormData();
        data.append('file', file);
        res = await api.post('/api/certificates/verify', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/api/certificates/verify', { certificateId: certificateId.trim() });
      }

      // Small delay to let final step show before result appears
      await new Promise(r => setTimeout(r, 400));
      setResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error;
      setError(msg || 'Verification failed. Please try again.');
    } finally {
      clearInterval(stepInterval);
      setStep(STEPS.length - 1);
      setVerifying(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">

      <BlockchainBackground />

      {/* AMBIENT GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[160px] rounded-full" />
      </div>

      <div className="container max-w-4xl mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">

        {/* ── HEADER ─────────────────────────────────────── */}
        <motion.div {...viewTransition} className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-xl shadow-indigo-500/5">
            <Activity className="text-emerald-500 animate-pulse" size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Verification Portal</span>
          </div>
          <h1 className="text-5xl md:text-[5.5rem] font-bold text-white tracking-tighter leading-none">
            Verify <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Credential.</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed">
            Upload a certificate or enter a Certificate ID. The system will re-generate
            the hash and compare it against the ledger — instantly.
          </p>
        </motion.div>

        {/* ── MODE SELECTOR ─────────────────────────────── */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="flex justify-center">
          <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/5">
            {[
              { id: 'FILE', label: 'Upload Certificate', icon: Upload },
              { id: 'ID', label: 'Certificate ID', icon: Search }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(''); }}
                className={`px-8 py-3.5 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest transition-all
                  ${mode === m.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <m.icon size={16} />
                {m.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── INTERACTION ZONE ──────────────────────────── */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }}>
          <div className="glass-card p-10 md:p-14 border border-white/10 overflow-hidden group relative">

            <form onSubmit={handleVerify} className="space-y-10 relative z-10">
              {mode === 'FILE' ? (
                <div
                  className={`border-2 border-dashed rounded-3xl p-20 text-center transition-all cursor-pointer relative
                    ${file ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.02]'}`}
                  onClick={() => document.getElementById('verify-file').click()}
                >
                  <input
                    id="verify-file" type="file"
                    onChange={(e) => { setFile(e.target.files[0]); setResult(null); setError(''); }}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="w-20 h-20 bg-indigo-500/5 rounded-2xl mx-auto flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform">
                    {file ? <FileText className="text-emerald-500" size={32} /> : <FileSearch className="text-slate-700" size={32} />}
                  </div>
                  <p className="text-slate-400 font-bold text-sm">
                    {file ? file.name : 'Click to upload certificate'}
                  </p>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mt-3">PDF · JPG · PNG</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Certificate ID</label>
                  <div className="relative group/input">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-indigo-500 transition-colors" size={24} />
                    <input
                      type="text"
                      placeholder="Enter Certificate ID..."
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-white text-base outline-none focus:border-indigo-500/50 transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={verifying || (mode === 'FILE' && !file) || (mode === 'ID' && !certificateId.trim())}
                className="w-full h-16 rounded-2xl bg-white text-black text-[11px] font-bold uppercase tracking-[0.3em] transition-all active:scale-95 hover:bg-slate-200 disabled:opacity-50 shadow-2xl shadow-white/5 flex items-center justify-center gap-4"
              >
                {verifying ? (
                  <><Loader2 className="animate-spin" size={20} /><span>Verifying...</span></>
                ) : (
                  <><ShieldCheck size={22} /><span>Verify Certificate</span></>
                )}
              </button>
            </form>

            {/* ── VERIFICATION PROGRESS OVERLAY ── */}
            <AnimatePresence>
              {verifying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#010409]/85 backdrop-blur-md z-20 flex flex-col items-center justify-center p-12 space-y-8"
                >
                  <div className="space-y-5 w-full max-w-md">
                    {STEPS.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: i <= step ? 1 : 0.2, x: 0 }}
                        className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-widest"
                      >
                        {i < step ? (
                          <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                        ) : i === step ? (
                          <Loader2 className="animate-spin text-indigo-500 shrink-0" size={18} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-white/10 shrink-0" />
                        )}
                        <span className={i === step ? 'text-white' : 'text-slate-600'}>{s}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── RESULT ──────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-500/[0.03] border border-rose-500/20 text-rose-400 p-8 rounded-[2rem] flex items-start gap-6 backdrop-blur-md"
            >
              <ShieldAlert size={28} className="shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest">Verification Error</p>
                <p className="text-sm font-medium opacity-80">{error}</p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`glass-card p-12 md:p-14 border-2 rounded-[3rem] ${result.valid ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-rose-500/20 bg-rose-500/[0.02]'}`}
            >
              {/* ── Status Banner ── */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex items-center gap-8 text-center md:text-left">
                  <motion.div
                    initial={{ rotate: -5, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }}
                    className={`w-24 h-24 rounded-3xl flex items-center justify-center border shadow-2xl ${result.valid ? 'bg-emerald-500 text-white border-white/10' : 'bg-rose-500 text-white border-white/10'}`}
                  >
                    {result.valid ? <ShieldCheck size={44} /> : <ShieldAlert size={44} />}
                  </motion.div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold text-white tracking-tighter">
                      {result.valid ? 'Authentic.' : 'Not Verified.'}
                    </h2>
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${result.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {result.valid ? '✅ Verified on Ledger' : '❌ No Matching Record Found'}
                    </p>
                    {!result.valid && (
                      <p className="text-slate-600 text-xs mt-2 leading-relaxed max-w-xs">
                        This certificate was not issued through EduCred, or the document has been tampered with.
                      </p>
                    )}
                  </div>
                </div>

                {result.valid && result.qrCode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-white rounded-2xl border border-white/10 shadow-2xl hover:scale-110 transition-transform shrink-0"
                  >
                    <img src={result.qrCode} alt="Verification QR" className="w-24 h-24" />
                  </motion.div>
                )}
              </div>

              {/* ── Metadata ── */}
              {result.valid && result.metadata && (
                <div className="mt-14 pt-14 border-t border-white/5 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-indigo-400 mb-2">
                        <UserIcon size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Student</span>
                      </div>
                      <p className="text-2xl font-bold text-white tracking-tight">{result.metadata.studentName}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Verified Identity</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-purple-400 mb-2">
                        <GraduationCap size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Institution</span>
                      </div>
                      <p className="text-2xl font-bold text-white tracking-tight">{result.metadata.issuer}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">{result.metadata.course}</p>
                    </div>
                  </div>

                  {/* Hash with copy */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Fingerprint size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">SHA-256 Fingerprint</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={copyHash}
                          className="flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-white transition-colors uppercase tracking-widest"
                        >
                          {hashCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {hashCopied ? 'Copied' : 'Copy'}
                        </button>
                        {result.metadata.fileUrl && (
                          <a
                            href={result.metadata.fileUrl}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-bold text-white/40 hover:text-white transition-all uppercase tracking-widest"
                          >
                            <Download size={14} /> Download
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                      <p className="text-indigo-400 font-mono text-xs break-all leading-relaxed tracking-wider opacity-80">
                        {typedHash}
                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-[2px] h-3 bg-indigo-400 ml-0.5 align-middle" />
                      </p>
                    </div>
                  </div>

                  {/* Blockchain proof (if available) */}
                  {result.ledgerProof && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-3 text-emerald-500/50">
                        <Activity size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ledger Proof</span>
                      </div>
                      <div className="bg-white/[0.01] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-3 w-full">
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-700">
                            <span>Status</span>
                            <span className="text-emerald-500">{result.ledgerProof.status}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 block mb-1">Transaction Hash</span>
                            <p className="text-[10px] font-mono text-slate-500 break-all">{result.ledgerProof.transactionHash}</p>
                          </div>
                        </div>
                        <div className="text-center px-4 shrink-0">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Anchored</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}