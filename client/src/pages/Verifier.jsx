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
    <div className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-white break-all">{value || 'Unavailable'}</span>
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-slate-100">
      <div className="fixed inset-0 opacity-25 pointer-events-none">
        <BlockchainBackground isSurging={loading} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#13345d_0%,#07111f_40%,#030712_100%)]" />

      <main className="relative z-10 px-6 pb-24 pt-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-sky-200">
              <ShieldCheck size={14} />
              Verification portal
            </div>
            <h1 className="mt-8 text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Verify academic credentials with one clean flow.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Upload a certificate or enter a certificate ID to detect valid, revoked, or tampered records.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: 0.05 }}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl"
            >
              <div className="inline-flex rounded-full border border-white/10 bg-slate-950/40 p-1">
                {['FILE', 'ID'].map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setMode(entry);
                      setError('');
                      setResult(null);
                    }}
                    className={`rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-[0.24em] transition ${
                      mode === entry
                        ? 'bg-sky-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {entry === 'FILE' ? 'File upload' : 'Certificate ID'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleVerify} className="mt-6 space-y-6">
                {mode === 'FILE' ? (
                  <label className="block cursor-pointer rounded-[1.75rem] border border-dashed border-white/12 bg-slate-950/40 p-8 text-center transition hover:border-sky-400/35 hover:bg-white/[0.04]">
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
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
                      <FileUp size={22} />
                    </div>
                    <p className="mt-5 text-lg font-semibold text-white">
                      {file ? file.name : 'Drop or select a certificate file'}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">Supported formats: PDF, PNG, JPG, JPEG</p>
                  </label>
                ) : (
                  <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5">
                    <label className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                      Certificate ID
                    </label>
                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <Fingerprint className="text-slate-500" size={18} />
                      <input
                        value={certificateId}
                        onChange={(event) => {
                          setCertificateId(event.target.value.toUpperCase());
                          setError('');
                          setResult(null);
                        }}
                        placeholder="EDUCRED-2026-..."
                        className="w-full bg-transparent text-sm font-medium tracking-[0.2em] text-white outline-none placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-400 px-6 py-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  {loading ? 'Verifying...' : 'Verify credential'}
                </button>
              </form>

              <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-slate-950/50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Verification stages</p>
                <div className="mt-4 space-y-3">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          index <= stepIndex && loading
                            ? 'bg-sky-400 text-slate-950'
                            : !loading && index === steps.length - 1 && (result || error)
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-white/[0.06] text-slate-400'
                        }`}
                      >
                        {index < stepIndex && loading ? <CheckCircle2 size={14} /> : index + 1}
                      </div>
                      <p className="text-sm text-slate-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: 0.1 }}
              className="rounded-[2rem] border border-white/10 bg-[#081423]/80 p-6 backdrop-blur-2xl"
            >
              {!result && !error ? (
                <div className="flex h-full min-h-[420px] flex-col justify-between rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">What you get</p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                      Clear trust signals, not ambiguous status text.
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      EduCred returns the hash, verification source, certificate metadata, and blockchain proof when available.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailRow label="Verification source" value="Blockchain or confirmed registry" />
                    <DetailRow label="Tamper detection" value="Binary hash mismatch detection" />
                    <DetailRow label="Public share page" value="Student-friendly certificate profile" />
                    <DetailRow label="Result states" value="Valid, revoked, or not found" />
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-400/10 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/15 text-rose-200">
                      <ShieldAlert size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-rose-200/80">Verification failed</p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">{error}</h2>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div
                    className={`rounded-[1.75rem] border p-6 ${
                      result.valid
                        ? 'border-emerald-400/20 bg-emerald-400/10'
                        : 'border-rose-400/20 bg-rose-400/10'
                    }`}
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                            result.valid ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'
                          }`}
                        >
                          {result.valid ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-900/60">
                            {result.valid ? 'Certificate verified' : 'Certificate invalid'}
                          </p>
                          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                            {result.valid ? 'Authentic record found' : 'No trusted record found'}
                          </h2>
                        </div>
                      </div>

                      {result.valid && result.metadata?.certificateId ? (
                        <Link
                          to={`/student/${result.metadata.certificateId}`}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                        >
                          Open share page
                          <ArrowRight size={16} />
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailRow label="Student" value={result.metadata?.studentName} />
                    <DetailRow label="Course" value={result.metadata?.course || result.metadata?.programName} />
                    <DetailRow label="Issuer" value={result.metadata?.issuer || result.metadata?.universityName} />
                    <DetailRow label="Verification source" value={result.verificationSource || 'Unknown'} />
                    <DetailRow label="IPFS Storage" value={result.metadata?.ipfsCid ? 'Decentralized (Pinned)' : 'Local Registry'} />
                    <DetailRow label="Blockchain mode" value={result.blockchainMode} />
                    <DetailRow label="Certificate ID" value={result.metadata?.certificateId} />
                  </div>

                  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">SHA-256 fingerprint</p>
                        <p className="mt-3 break-all font-mono text-sm text-sky-200">{result.hash}</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyHash}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-950"
                      >
                        <Copy size={16} />
                        {copied ? 'Copied' : 'Copy hash'}
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
