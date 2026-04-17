import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Fingerprint, GraduationCap, ShieldCheck } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BlockchainBackground from '../components/BlockchainBackground';
import StatusBadge from '../components/StatusBadge';

const transition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

function InfoCard({ label, value }) {
  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 transition-all hover:border-blue-100 group">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-3 text-sm font-black text-slate-900 uppercase tracking-widest truncate">{value || 'N/A'}</p>
    </div>
  );
}

export default function Student() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      .catch(() => setError('Certificate records could not be retrieved.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-[3px] border-t-blue-600 border-r-blue-600 border-b-transparent border-l-transparent rounded-full animate-spin" />
          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Verifying Credential...</div>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 text-center">
        <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 max-w-md w-full shadow-2xl shadow-slate-900/10">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl mx-auto flex items-center justify-center text-rose-500 border border-rose-100 mb-8">
            <Calendar size={36} />
          </div>
          <p className="text-[10px] font-black tracking-widest text-rose-500 uppercase mb-4">Error</p>
          <p className="text-xl font-black tracking-tighter uppercase mb-10 text-slate-900">{error}</p>
          <button
            onClick={() => navigate('/verify')}
            className="btn-primary w-full !py-4 shadow-blue-500/10"
          >
            <ArrowLeft size={16} /> Return to Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30">
      
      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <main className="relative z-10 px-6 pb-24 pt-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="bg-white rounded-[2.5rem] border border-slate-100 p-10 md:p-14 shadow-2xl shadow-slate-900/20"
          >
            <button 
              onClick={() => navigate('/verify')}
              className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-blue-600 mb-12"
            >
              <ArrowLeft size={14} />
              Return to Verification
            </button>

            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between border-b border-slate-100 pb-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-blue-100 bg-blue-50 text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                  <ShieldCheck size={14} className="animate-pulse" />
                  Verified Digital Credential
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                  {certificate.studentName}.
                </h1>
                <div className="space-y-3">
                  <p className="text-xl font-black text-blue-600 uppercase tracking-widest">{certificate.course}</p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <GraduationCap size={16} className="text-slate-300" /> Issued By: {certificate.issuer || 'Institutional Lead'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl border border-slate-100 px-10 py-8 shadow-inner flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Status</p>
                <StatusBadge status={certificate.isRevoked ? 'REVOKED' : certificate.status} />
              </div>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <InfoCard label="Certificate Reference ID" value={certificate.id || certificate.certificateId} />
              <InfoCard
                label="Issuance Date"
                value={new Date(certificate.issuedAt || certificate.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              />
              <InfoCard label="Academic Branch" value={certificate.metadata?.branch || 'General'} />
              <InfoCard label="Year of Completion" value={certificate.metadata?.graduationYear || 'N/A'} />
            </div>

            <div className="mt-12 rounded-3xl border border-slate-100 bg-slate-50 p-10 shadow-inner group transition-all hover:border-blue-100">
              <div className="flex items-center gap-4 mb-6">
                <Fingerprint className="text-blue-600" size={20} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blockchain Verification Hash</p>
              </div>
              <p className="break-all font-mono text-xs text-slate-500 bg-white p-6 rounded-2xl border border-slate-100 leading-relaxed tracking-tight group-hover:text-blue-600 transition-colors uppercase">
                {certificate.certificateHash}
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-blue-100 transition-all">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100 mb-6 font-black uppercase tracking-widest text-[10px] shadow-sm">
                  AUTH
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Issued by a verified authority</p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-blue-100 transition-all">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 mb-6 font-black uppercase tracking-widest text-[10px] shadow-sm">
                  LIVE
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Public record live and accessible</p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-blue-100 transition-all">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 mb-6 font-black uppercase tracking-widest text-[10px] shadow-sm">
                  SECURE
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Protected by blockchain immutability</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
