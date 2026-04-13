import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Fingerprint, GraduationCap, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import BlockchainBackground from '../components/BlockchainBackground';
import StatusBadge from '../components/StatusBadge';

const transition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-base font-medium text-white">{value || 'Unavailable'}</p>
    </div>
  );
}

export default function Student() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError('Certificate not found.');
      setLoading(false);
      return;
    }

    api
      .get(`/api/certificates/${id}`)
      .then((response) => setCertificate(response.data))
      .catch(() => setError('Certificate not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <div className="text-sm font-medium tracking-[0.2em] text-slate-300">Loading certificate…</div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-6 text-center text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-xl">
          <p className="text-2xl font-semibold tracking-tight">{error}</p>
          <Link
            to="/verify"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to verifier
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-slate-100">
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <BlockchainBackground />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#13345d_0%,#07111f_40%,#030712_100%)]" />

      <main className="relative z-10 px-6 pb-24 pt-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl"
          >
            <Link to="/verify" className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
              <ArrowLeft size={16} />
              Back to verifier
            </Link>

            <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-emerald-200">
                  <ShieldCheck size={14} />
                  Public certificate profile
                </div>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  {certificate.studentName}
                </h1>
                <p className="mt-3 text-lg text-slate-300">{certificate.course}</p>
                <p className="mt-2 text-sm text-slate-400">{certificate.issuer}</p>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Status</p>
                <div className="mt-4">
                  <StatusBadge status={certificate.isRevoked ? 'REJECTED' : certificate.status} />
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <InfoCard label="Certificate ID" value={certificate.certificateId} />
              <InfoCard
                label="Issued on"
                value={new Date(certificate.issuedAt || certificate.createdAt).toLocaleDateString()}
              />
              <InfoCard label="Branch" value={certificate.metadata?.branch} />
              <InfoCard label="Graduation year" value={certificate.metadata?.graduationYear} />
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-slate-950/50 p-6">
              <div className="flex items-center gap-3">
                <Fingerprint className="text-sky-300" size={18} />
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">SHA-256 fingerprint</p>
              </div>
              <p className="mt-4 break-all font-mono text-sm text-sky-200">{certificate.certificateHash}</p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <GraduationCap className="text-sky-300" size={18} />
                <p className="mt-4 text-sm font-medium text-white">Issued by a registered institution</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <Calendar className="text-emerald-300" size={18} />
                <p className="mt-4 text-sm font-medium text-white">Shareable public verification view</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <ShieldCheck className="text-sky-300" size={18} />
                <p className="mt-4 text-sm font-medium text-white">Aligned with the live verification pipeline</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
