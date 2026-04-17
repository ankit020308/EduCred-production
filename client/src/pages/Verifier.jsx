import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
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
import BlockchainBackground from '../components/BlockchainBackground';

const steps = [
  'Analyzing syntax payload',
  'Extracting structural hash fingerprint',
  'Querying verification source',
  'Resolving certificate metadata',
];

const transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-[#050505] p-5 shadow-inner group/row hover:border-cyan-400/20 transition-all">
      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800 group-hover/row:text-cyan-400/50 transition-colors">{label}</span>
      <span className="text-[11px] font-black text-white break-all uppercase tracking-widest leading-relaxed">{value || 'Unavailable'}</span>
    </div>
  );
}

export default function Verifier() {
  const [mode, setMode] = useState('FILE');
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
    return mode === 'FILE' ? Boolean(file) : Boolean(certificateId.trim());
  }, [certificateId, file, loading, mode]);

  async function handleVerify(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setStepIndex(0);
    setResult(null);
    setError('');

    try {
      const response = mode === 'FILE'
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
    } catch (copyError) {
      console.error(copyError);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <main className="relative z-10 px-6 pb-24 pt-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="mx-auto max-w-3xl text-center space-y-8"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 shadow-sm">
              <ShieldCheck size={14} className="animate-pulse" />
              Secure Verification Active
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.9]">
              Instant <span className="text-blue-500">Validation.</span>
            </h1>
            <p className="max-w-xl mx-auto text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed">
              Verify the authenticity of any EduCred certificate across the global blockchain network.
            </p>
          </motion.div>

          {/* MAIN VERIFIER GRID */}
          <div className="mt-20 grid gap-10 lg:grid-cols-[400px_1fr]">
            
            {/* LEFT COLUMN: UPLOAD / INPUT */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition, delay: 0.1 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/50 border border-slate-100 h-fit"
            >
              <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-2xl mb-8">
                {['FILE', 'ID'].map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setMode(entry);
                      setError('');
                      setResult(null);
                    }}
                    className={`flex-1 rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === entry
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {entry === 'FILE' ? 'File Upload' : 'Certificate ID'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                {mode === 'FILE' ? (
                  <label className="block cursor-pointer rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center transition-all hover:border-blue-500/40 hover:bg-white group">
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
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-500/20 transition-all shadow-sm">
                      <FileUp size={24} />
                    </div>
                    <p className="mt-6 text-[11px] font-black text-slate-900 uppercase tracking-widest truncate max-w-[200px] mx-auto">
                      {file ? file.name : 'Select Certificate'}
                    </p>
                    <p className="mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">PDF, PNG, JPG supported</p>
                  </label>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Enter Certificate ID
                    </label>
                    <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 focus-within:border-blue-500 transition-all shadow-sm">
                      <Fingerprint className="text-slate-300" size={20} />
                      <input
                        value={certificateId}
                        onChange={(event) => {
                          setCertificateId(event.target.value.toUpperCase());
                          setError('');
                          setResult(null);
                        }}
                        placeholder="EDU-REC-..."
                        className="w-full bg-transparent text-[11px] font-black tracking-widest text-slate-900 outline-none placeholder:text-slate-300 uppercase"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn-primary w-full py-5 !shadow-blue-500/10"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  {loading ? 'Verifying...' : 'Start Verification'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Verification Progress</p>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[9px] font-black border transition-all ${
                          index <= stepIndex && loading
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                            : !loading && index === steps.length - 1 && (result || error)
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                              : 'bg-white border-slate-200 text-slate-300'
                        }`}
                      >
                        {index < stepIndex && loading ? <CheckCircle2 size={14} /> : index + 1}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${index <= stepIndex ? 'text-slate-900' : 'text-slate-300'}`}>
                        {step === 'Querying verification source' ? 'Blockchain Query' : step === 'Extracting structural hash fingerprint' ? 'Extracting Semantic Hash' : step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* RIGHT COLUMN: RESULTS */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition, delay: 0.1 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/50 border border-slate-100 h-fit min-h-[600px]"
            >
              {!result && !error ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-12">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-10 border border-slate-100">
                    <Search size={40} className="text-slate-300" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-6">
                    Awaiting <br/> <span className="text-blue-500">Verification.</span>
                  </h2>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                    Enter a certificate ID or upload a file to perform a secure, blockchain-backed authenticity check.
                  </p>
                </div>
              ) : error ? (
                <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-10 text-center flex flex-col items-center justify-center h-full min-h-[500px]">
                  <div className="w-20 h-20 bg-rose-600 text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-rose-600/20">
                    <ShieldAlert size={32} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Verification Error</h2>
                  <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* SUCCESS / FAILURE HEADER */}
                  <div className={`rounded-[2rem] p-10 border shadow-sm relative overflow-hidden ${
                      result.valid ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                       <div className="flex items-center gap-6">
                         <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${
                             result.valid ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'
                         }`}>
                           {result.valid ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
                         </div>
                         <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${result.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {result.valid ? 'Record Verified' : 'Invalid Record'}
                            </p>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                              {result.valid ? 'Authentic.' : 'Tampered.'}
                            </h2>
                         </div>
                       </div>
                       
                       {result.valid && (
                         <Link to={`/student/${result.metadata.certificateId}`} className="btn-primary !px-10 !py-5 shadow-emerald-500/10">
                            View Details
                         </Link>
                       )}
                    </div>
                  </div>

                  {/* METADATA GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                       { label: "Student Name", value: result.metadata?.studentName },
                       { label: "Course / Program", value: result.metadata?.course || result.metadata?.programName },
                       { label: "Issuing Institution", value: result.metadata?.issuer || result.metadata?.universityName },
                       { label: "Platform Source", value: result.verificationSource },
                       { label: "Storage Layer", value: result.metadata?.ipfsCid ? 'IPFS (Decentralized)' : 'EduCred Core' },
                       { label: "Certificate ID", value: result.metadata?.certificateId }
                     ].map((item, i) => (
                       <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                          <p className="text-[13px] font-black text-slate-900 truncate">{item.value || 'N/A'}</p>
                       </div>
                     ))}
                  </div>

                  {/* HASH SECTION */}
                  <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden group">
                     <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Structural Data Fingerprint</p>
                          <p className="font-mono text-xs break-all text-blue-400 leading-relaxed bg-white/5 p-4 rounded-xl">{result.hash}</p>
                        </div>
                        <button onClick={copyHash} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                           {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                        </button>
                     </div>
                  </div>

                  {result.ledgerProof && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Blockchain Transaction</p>
                          <p className="text-[10px] font-mono break-all text-slate-600">{result.ledgerProof.transactionHash}</p>
                       </div>
                       <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Timestamp</p>
                          <p className="text-[13px] font-black text-slate-900">{result.ledgerProof.anchoredAt || result.ledgerProof.status}</p>
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
