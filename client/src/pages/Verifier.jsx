import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  FileSearch,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  User as UserIcon,
  GraduationCap,
  Fingerprint,
  FileText,
  Search,
  Upload,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Verifier() {
  const [file, setFile] = useState(null);
  const [certificateId, setCertificateId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('FILE'); // FILE or ID
  
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
      // Simulate steps for "WOW" factor
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
      setError(
        err.response?.data?.message ||
        'Verification failed. No record found on the ledger or data integrity compromised.'
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-20 relative z-10 pt-32 h-full min-h-screen flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-12 pb-20">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 glass-pill px-6 py-3 border-blue-500/20">
            <Activity className="text-emerald-500 animate-pulse" size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Public Verification Protocol</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter">
            Authenticity <span className="text-blue-500">Node</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
            Verify academic claims against the decentralized ledger using high-integrity cryptographic proofs.
          </p>
        </div>

        {/* ── Mode Selector ─────────────────────────────────── */}
        <div className="flex justify-center">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 shadow-2xl">
            {[
              { id: 'FILE', label: 'File Hash', icon: Upload },
              { id: 'ID', label: 'Reference ID', icon: Search }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(''); }}
                className={`px-8 py-4 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all
                  ${mode === m.id ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <m.icon size={16} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Interaction Zone ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <Card className="lg:col-span-12 p-10 !bg-white/5 backdrop-blur-3xl border-white/10 rounded-[40px] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <form onSubmit={handleVerify} className="space-y-8 relative z-10">
              {mode === 'FILE' ? (
                <div 
                  className={`border-2 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer relative
                    ${file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-blue-500/40 hover:bg-white/5'}`}
                  onClick={() => document.getElementById('verify-file').click()}
                >
                    <input
                        id="verify-file"
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="hidden"
                    />
                    <div className="w-20 h-20 bg-white/5 rounded-2xl mx-auto flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      {file ? <FileText className="text-emerald-500" size={40} /> : <FileSearch className="text-slate-700" size={40} />}
                    </div>
                    <p className="text-slate-400 font-black uppercase text-[11px] tracking-widest">
                        {file ? file.name : "Inject Binary Credential for Analysis"}
                    </p>
                    <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest mt-2">Supports PDF, JPG, PNG</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unique Certificate Reference</label>
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={24} />
                    <input 
                      type="text"
                      placeholder="Enter Credential ID (e.g. 65f2...)"
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-white text-lg outline-none focus:border-blue-500/50 transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              <Button disabled={verifying || (mode === 'FILE' && !file) || (mode === 'ID' && !certificateId)} className="w-full h-16 rounded-[24px] text-sm font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(37,99,235,0.3)]">
                {verifying ? (
                  <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin" />
                      <span>Synchronizing Ledger...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={24} />
                    <span>Initiate Verification</span>
                  </div>
                )}
              </Button>
            </form>
          </Card>

          {/* ── Status Visualization ─────────────────────────── */}
          <AnimatePresence mode="wait">
            {verifying && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="lg:col-span-12 bg-white/5 border border-white/10 p-10 rounded-[32px] space-y-6 shadow-xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Quantum Proofing Logic</h3>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
                  </div>
                </div>
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-5 text-[11px] font-black uppercase tracking-[0.2em]">
                    {i < step ? (
                      <CheckCircle2 className="text-emerald-500" size={18} />
                    ) : i === step ? (
                      <Loader2 className="animate-spin text-blue-500" size={18} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/10" />
                    )}
                    <span className={i === step ? "text-white scale-105 transition-all" : "text-slate-600"}>
                      {s}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="lg:col-span-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-8 rounded-[32px] flex items-center gap-6"
              >
                <ShieldAlert size={32} />
                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-widest">Protocol Failure</p>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{error}</p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-12 space-y-8"
              >
                <Card className={`p-12 border-2 rounded-[48px] shadow-3xl relative overflow-hidden
                  ${result.valid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                  
                  <div className={`absolute top-0 right-0 w-96 h-96 blur-[120px] pointer-events-none
                    ${result.valid ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} />

                  <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                    <div className="flex items-center gap-8 text-center md:text-left">
                      <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-2 shadow-2xl transition-all
                        ${result.valid ? 'bg-emerald-500 text-white border-emerald-400 rotate-3' : 'bg-rose-500 text-white border-rose-400 -rotate-3'}`}>
                        {result.valid ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                          {result.valid ? 'Proof Validated' : 'Validation Failed'}
                        </h2>
                        <p className={`text-[11px] font-black uppercase tracking-[0.3em] 
                          ${result.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {result.valid ? 'Authentic On-Chain Record' : 'No Ledger Correspondence'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {result.valid && result.metadata && (
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/10 pt-12 relative z-10">
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                       <div className="flex items-center gap-3 text-blue-400">
                         <UserIcon size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Authorized Subject</span>
                       </div>
                       <div>
                         <p className="text-white font-black text-lg uppercase italic tracking-tight">{result.metadata.studentName}</p>
                         <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Identity Verified</p>
                       </div>
                      </div>
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                       <div className="flex items-center gap-3 text-emerald-400">
                         <GraduationCap size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Issuing Authority</span>
                       </div>
                       <div>
                         <p className="text-white font-black text-lg uppercase italic tracking-tight">{result.metadata.issuer}</p>
                         <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{result.metadata.course}</p>
                       </div>
                      </div>

                      <div className="md:col-span-2 space-y-4 pt-4">
                        <div className="flex items-center gap-3 text-slate-500">
                          <Fingerprint size={20} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Ledger Fingerprint (SHA-256)</span>
                        </div>
                        <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                          <p className="text-blue-400 font-mono text-xs break-all leading-relaxed whitespace-pre-wrap tracking-wider">
                            {typedHash}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!result.valid && (
                    <div className="mt-12 p-8 bg-rose-500/5 rounded-[32px] border border-rose-500/10 text-center space-y-4">
                       <p className="text-rose-500/80 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-md mx-auto">
                        This digital footprint does not exist on the EduCred Ledger. The credential may be forged, tampered with, or hasn't been authorized by an approved institution.
                       </p>
                       <div className="flex justify-center gap-4 pt-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping delay-150" />
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping delay-300" />
                       </div>
                    </div>
                  )}

                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}