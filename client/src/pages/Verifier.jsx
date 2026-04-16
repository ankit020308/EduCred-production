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
  'Uploading input',
  'Generating SHA-256 fingerprint',
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#000000] text-slate-300 font-sans selection:bg-cyan-500/30">
      <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
        <BlockchainBackground isSurging={loading} />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      <main className="relative z-10 px-6 pb-24 pt-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="mx-auto max-w-3xl text-center space-y-8"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <ShieldCheck size={14} className="animate-pulse" />
              Intelligence Node Active
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.9]">
              Verified <span className="text-cyan-400">Identity.</span>
            </h1>
            <p className="max-w-xl mx-auto text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed">
              Detect valid, revoked, or tampered records across the sovereign ledger with mathematical certainty.
            </p>
          </motion.div>

          <div className="mt-20 grid gap-10 lg:grid-cols-[400px_1fr]">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: 0.05 }}
              className="glass-pane rounded-[2.5rem] p-8 shadow-2xl scanline-overlay"
            >
              <div className="flex rounded-2xl border border-white/5 bg-[#050505] p-1.5 shadow-inner">
                {['FILE', 'ID'].map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setMode(entry);
                      setError('');
                      setResult(null);
                    }}
                    className={`flex-1 rounded-xl py-4 text-[9px] font-black uppercase tracking-[0.3em] transition-all ${
                      mode === entry
                        ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                        : 'text-slate-700 hover:text-slate-400'
                    }`}
                  >
                    {entry === 'FILE' ? 'Fingerprint' : 'Identity ID'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleVerify} className="mt-6 space-y-6">
                {mode === 'FILE' ? (
                  <label className="block cursor-pointer rounded-3xl border-2 border-dashed border-white/5 bg-[#050505] p-10 text-center transition-all hover:border-cyan-400/40 hover:bg-[#080808] group shadow-inner">
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
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#080808] text-slate-800 border border-white/5 group-hover:text-cyan-400 group-hover:border-cyan-400/20 transition-all shadow-xl">
                      <FileUp size={24} />
                    </div>
                    <p className="mt-6 text-[11px] font-black text-white uppercase tracking-widest truncate max-w-[200px] mx-auto">
                      {file ? file.name : 'Relay Protocol File'}
                    </p>
                    <p className="mt-2 text-[9px] font-black text-slate-800 uppercase tracking-widest">PDF / PNG / JPG Support</p>
                  </label>
                ) : (
                  <div className="rounded-3xl border border-white/5 bg-[#050505] p-6 shadow-inner">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-800">
                      Identity Identifier
                    </label>
                    <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/5 bg-[#080808] px-5 py-5 group-focus-within:border-cyan-400/30 transition-all shadow-xl">
                      <Fingerprint className="text-slate-800 group-focus-within:text-cyan-400 transition-colors" size={20} />
                      <input
                        value={certificateId}
                        onChange={(event) => {
                          setCertificateId(event.target.value.toUpperCase());
                          setError('');
                          setResult(null);
                        }}
                        placeholder="EDUCRED-2026-..."
                        className="w-full bg-transparent text-[10px] font-black tracking-[0.2em] text-white outline-none placeholder:text-slate-800 uppercase"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn-command btn-blue w-full py-5 shadow-[0_0_30px_rgba(59,130,246,0.2)] disabled:shadow-none"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  {loading ? 'Initializing Protocol...' : 'Initialize Verification'}
                </button>
              </form>

              <div className="mt-8 rounded-3xl border border-white/5 bg-[#050505] p-6 shadow-inner">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800">Telemetry Stages</p>
                <div className="mt-6 space-y-4">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-4 group/step">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-[10px] font-black border transition-all ${
                          index <= stepIndex && loading
                            ? 'bg-cyan-400 border-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                            : !loading && index === steps.length - 1 && (result || error)
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                              : 'bg-[#080808] border-white/5 text-slate-800'
                        }`}
                      >
                        {index < stepIndex && loading ? <CheckCircle2 size={16} /> : `0${index + 1}`}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${index <= stepIndex ? 'text-white' : 'text-slate-800'}`}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: 0.1 }}
              className="glass-pane rounded-[2.5rem] p-8 shadow-2xl scanline-overlay relative overflow-hidden h-fit sm:border border-white/5"
            >
              {!result && !error ? (
                <div className="flex h-full min-h-[500px] flex-col justify-between rounded-3xl border border-white/5 bg-[#050505] p-10 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-cyan-400/5 blur-[80px] pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-800">Protocol Capability</p>
                    <h2 className="mt-6 text-4xl font-black tracking-tighter text-white uppercase leading-none">
                      Trust <span className="text-cyan-400">Signals.</span>
                    </h2>
                    <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed text-slate-700">
                      EduCred returns bit-perfect hash validation, origin certainty, and blockchain commit verification.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 mt-10 relative z-10">
                    <DetailRow label="Authority Origin" value="Institutional Node" />
                    <DetailRow label="Integrity Guard" value="SHA-256 Collision Logic" />
                    <DetailRow label="Spatial Archive" value="Distributed Storage (IPFS)" />
                    <DetailRow label="Commit State" value="Immutable Ledger Anchor" />
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-10 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                  <div className="flex items-start gap-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#050505] text-rose-500 border border-rose-500/30 shadow-2xl">
                      <ShieldAlert size={28} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-rose-500">Verification Failure</p>
                      <h2 className="mt-4 text-3xl font-black text-white uppercase tracking-tighter leading-none">{error}</h2>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div
                    className={`rounded-[2rem] p-10 border shadow-2xl relative overflow-hidden ${
                      result.valid
                        ? 'border-emerald-500/20 bg-emerald-500/10'
                        : 'border-rose-500/20 bg-rose-500/10'
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-5 blur-[50px] pointer-events-none" />
                    <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between relative z-10">
                      <div className="flex items-center gap-6">
                        <div
                          className={`flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl transition-transform hover:scale-105 ${
                            result.valid ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20' : 'bg-rose-500 text-slate-950 shadow-rose-500/20'
                          }`}
                        >
                          {result.valid ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
                        </div>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-[0.5em] leading-none ${result.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {result.valid ? 'Sovereign Record Valid' : 'Record Mismatch'}
                          </p>
                          <h2 className="mt-4 text-4xl font-black tracking-tighter text-white uppercase leading-none">
                            {result.valid ? 'Record Authentic.' : 'Identity Revoked.'}
                          </h2>
                        </div>
                      </div>

                      {result.valid && result.metadata?.certificateId ? (
                        <Link
                          to={`/student/${result.metadata.certificateId}`}
                          className="btn-command btn-blue px-10 shadow-2xl"
                        >
                          Open Share Node
                          <ArrowRight size={18} />
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <DetailRow label="Subject Identity" value={result.metadata?.studentName} />
                    <DetailRow label="Program Module" value={result.metadata?.course || result.metadata?.programName} />
                    <DetailRow label="Authority Node" value={result.metadata?.issuer || result.metadata?.universityName} />
                    <DetailRow label="Protocol Source" value={result.verificationSource || 'Unknown'} />
                    <DetailRow label="Spatial Storage" value={result.metadata?.ipfsCid ? 'Decentralized Architecture' : 'Local Registry'} />
                    <DetailRow label="Protocol ID" value={result.metadata?.certificateId} />
                  </div>

                  <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-8 shadow-inner">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800">Fingerprint Payload (SHA-256)</p>
                        <p className="mt-4 break-all font-mono text-[11px] text-cyan-400 tracking-tight leading-relaxed bg-cyan-400/5 p-4 rounded-xl border border-cyan-400/10">{result.hash}</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyHash}
                        className="btn-command btn-outline px-8 h-12"
                      >
                        <Copy size={16} />
                        {copied ? 'Captured' : 'Capture Hash'}
                      </button>
                    </div>
                  </div>

                  {result.ledgerProof ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailRow label="Transaction hash" value={result.ledgerProof.transactionHash} />
                      <DetailRow label="Anchored at" value={result.ledgerProof.anchoredAt || result.ledgerProof.status} />
                    </div>
                  ) : null}
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}
