import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  FileSearch,
  CheckCircle2,
  Loader2,
  Activity,
  User as UserIcon,
  GraduationCap,
  Fingerprint,
  FileText,
  Search,
  Upload,
  ArrowRight,
  ShieldAlert,
  Download
} from 'lucide-react';
import api from '../services/api';
import BlockchainBackground from '../components/BlockchainBackground';

// ──────────────────────────────────────────────────────────────────────────
// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
// ──────────────────────────────────────────────────────────────────────────
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export default function Verifier() {
  const [file, setFile] = useState(null);
  const [certificateId, setCertificateId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('FILE');
  const [typedHash, setTypedHash] = useState('');
  const [step, setStep] = useState(0);

  const steps = [
    "Establishing Quantum Proof...",
    "Re-computing SHA-256 Digest...",
    "Querying Decentralized Ledger...",
    "Validating Institutional Metadata...",
    "Consensus Reached."
  ];

  useEffect(() => {
    if (!result?.hash) return;
    let i = 0;
    const interval = setInterval(() => {
      setTypedHash(result.hash.slice(0, i));
      i++;
      if (i > result.hash.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [result]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (mode === 'FILE' && !file) return;
    if (mode === 'ID' && !certificateId) return;

    setVerifying(true);
    setError('');
    setResult(null);
    setStep(0);

    try {
      for (let i = 0; i < steps.length; i++) {
        setStep(i);
        await new Promise(res => setTimeout(res, 400));
      }

      let res;
      if (mode === 'FILE') {
        const data = new FormData();
        data.append('file', file);
        res = await api.post('/api/certificates/verify', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/api/certificates/verify', { certificateId });
      }
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Protocol Integrity compromised.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND: Neural-Link Mesh */}
      <BlockchainBackground />

      {/* AMBIENT NEBULA GLOWS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[160px] rounded-full animate-pulse" />
      </div>

      <div className="container max-w-4xl mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">
        
        {/* ── HEADER ─────────────────────────────────────────── */}
        <motion.div {...viewTransition} className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md animate-levitate shadow-xl shadow-indigo-500/5">
            <Activity className="text-emerald-500 animate-pulse" size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Quantum Verification Protocol</span>
          </div>
          <h1 className="text-5xl md:text-[5.5rem] font-bold text-white tracking-tighter leading-none">
            Authenticity <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-glow-emissive">Node.</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed">
            Verify academic claims against the decentralized ledger using high-integrity cryptographic proofs.
          </p>
        </motion.div>

        {/* ── MODE SELECTOR ─────────────────────────────────── */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="flex justify-center">
          <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/5 shadow-2xl">
            {[
              { id: 'FILE', label: 'Hash Binary', icon: Upload },
              { id: 'ID', label: 'Reference ID', icon: Search }
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

        {/* ── INTERACTION ZONE ─────────────────────────────── */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }}>
          <div className="glass-card p-10 md:p-14 border border-white/10 overflow-hidden group">
            
            <form onSubmit={handleVerify} className="space-y-10 relative z-10">
              {mode === 'FILE' ? (
                <div 
                  className={`border-2 border-dashed rounded-3xl p-20 text-center transition-all cursor-pointer relative
                    ${file ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.02]'}`}
                  onClick={() => document.getElementById('verify-file').click()}
                >
                    <input
                        id="verify-file"
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="hidden"
                    />
                    <div className="w-20 h-20 bg-indigo-500/5 rounded-2xl mx-auto flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform shadow-xl shadow-indigo-500/5">
                      {file ? <FileText className="text-emerald-500" size={32} /> : <FileSearch className="text-slate-700" size={32} />}
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em]">
                        {file ? file.name : "Inject Binary Credential for Analysis"}
                    </p>
                    <p className="text-slate-700 text-[9px] font-black uppercase tracking-widest mt-3">PDF, JPG, PNG ENCRYPTION SUPPORTED</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Reference ID Mapping</label>
                  <div className="relative group/input">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-indigo-500 transition-colors" size={24} />
                    <input 
                      type="text"
                      placeholder="ENTER CREDENTIAL ID (e.g. 65f2...)"
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-white text-lg outline-none focus:border-indigo-500/50 transition-all font-mono tracking-widest uppercase"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={verifying || (mode === 'FILE' && !file) || (mode === 'ID' && !certificateId)} 
                className="w-full h-16 rounded-2xl bg-white text-black text-[11px] font-bold uppercase tracking-[0.3em] transition-all active:scale-95 hover:bg-slate-200 disabled:opacity-50 shadow-2xl shadow-white/5"
              >
                {verifying ? (
                  <div className="flex items-center justify-center gap-4">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Synchronizing Ledger...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    <ShieldCheck size={24} />
                    <span>Initiate Protocol</span>
                  </div>
                )}
              </button>
            </form>

            {/* Verification Steps Overlay */}
            <AnimatePresence>
              {verifying && (
                <motion.div
                  initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                  animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                  exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                  className="absolute inset-0 bg-[#010409]/80 z-20 flex flex-col items-center justify-center p-12 space-y-8"
                >
                  <div className="space-y-6 w-full max-w-md">
                    {steps.map((s, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: i <= step ? 1 : 0.2, x: 0 }}
                        className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest"
                      >
                        {i < step ? (
                          <CheckCircle2 className="text-emerald-500" size={18} />
                        ) : i === step ? (
                          <Loader2 className="animate-spin text-indigo-500" size={18} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-white/10" />
                        )}
                        <span className={i === step ? "text-white" : "text-slate-600"}>{s}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── STATUS VISUALIZATION ─────────────────────────── */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-500/[0.03] border border-rose-500/20 text-rose-500 p-8 rounded-[2rem] flex items-center gap-6 backdrop-blur-md"
            >
              <ShieldAlert size={32} />
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest">Protocol Failure</p>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{error}</p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`glass-card p-12 md:p-14 border-2 rounded-[3rem] ${result.valid ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-rose-500/20 bg-rose-500/[0.02]'}`}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                <div className="flex items-center gap-10 text-center md:text-left">
                  <motion.div 
                    initial={{ rotate: -5, scale: 0.9 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className={`w-28 h-28 rounded-3xl flex items-center justify-center border transition-all shadow-2xl ${result.valid ? 'bg-emerald-500 text-white border-white/10' : 'bg-rose-500 text-white border-white/10'}`}
                  >
                    {result.valid ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}
                  </motion.div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold text-white tracking-tighter">
                      {result.valid ? 'Proof Validated.' : 'Validation Failed.'}
                    </h2>
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${result.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {result.valid ? 'Authentic On-Chain Record' : 'No Ledger Correspondence'}
                    </p>
                  </div>
                </div>
              </div>

              {result.valid && result.metadata && (
                <div className="mt-14 pt-14 border-t border-white/5 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-indigo-400">
                        <UserIcon size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Identity Subject</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white tracking-tight">{result.metadata.studentName}</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Verified Ledger Identity</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-purple-400">
                        <GraduationCap size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Issuing Authority</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white tracking-tight">{result.metadata.issuer}</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">{result.metadata.course}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Fingerprint size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Fingerprint (SHA-256)</span>
                      </div>
                      {result.metadata.fileUrl && (
                        <a 
                          href={`/${result.metadata.fileUrl}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white transition-all uppercase tracking-widest"
                        >
                          <Download size={14} />
                          Extract Asset
                        </a>
                      )}
                    </div>
                    <div className="bg-black/20 p-8 rounded-2xl border border-white/5">
                      <p className="text-indigo-400 font-mono text-xs break-all leading-relaxed tracking-wider opacity-80">
                        {typedHash}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}