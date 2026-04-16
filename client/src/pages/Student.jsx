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
    <div className="glass-pane p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800">{label}</p>
      <p className="mt-4 text-sm font-black text-white uppercase tracking-widest truncate">{value || 'DATA UNAVAILABLE'}</p>
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
      <div className="flex min-h-screen items-center justify-center bg-[#000000] text-white selection:bg-cyan-500/30">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-[3px] border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent rounded-2xl animate-spin" />
          <div className="text-[10px] font-black tracking-[0.4em] text-slate-700 uppercase">Synchronizing Oracle...</div>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000000] px-6 text-center text-white">
        <div className="glass-pane rounded-[2.5rem] p-12 backdrop-blur-3xl border border-white/5 max-w-md w-full relative overflow-hidden scanline-overlay">
          <div className="w-20 h-20 bg-rose-500/10 rounded-2xl mx-auto flex items-center justify-center text-rose-500 border border-rose-500/20 mb-8">
            <Calendar size={36} />
          </div>
          <p className="text-[10px] font-black tracking-[0.4em] text-rose-500 uppercase mb-4">Protocol Error</p>
          <p className="text-xl font-black tracking-tighter uppercase mb-10 text-white">{error}</p>
          <button
            onClick={() => navigate('/verify')}
            className="btn-command btn-blue w-full !py-4"
          >
            <ArrowLeft size={16} /> Back to Verifier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#000000] text-slate-300 font-sans selection:bg-cyan-500/30">
      <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
        <BlockchainBackground />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      <main className="relative z-10 px-6 pb-24 pt-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="glass-pane rounded-[2.5rem] border border-white/5 p-10 md:p-14 relative overflow-hidden scanline-overlay shadow-[0_0_100px_rgba(34,211,238,0.05)]"
          >
            <button 
              onClick={() => navigate('/verify')}
              className="inline-flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-800 transition-all hover:text-cyan-400 mb-12"
            >
              <ArrowLeft size={14} />
              Return to Oracle
            </button>

            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between border-b border-white/5 pb-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                  <ShieldCheck size={14} className="animate-pulse" />
                  Sovereign Enclave Portal
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none">
                  {certificate.studentName}.
                </h1>
                <div className="space-y-2">
                  <p className="text-xl font-black text-cyan-400 uppercase tracking-widest">{certificate.course}</p>
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] flex items-center gap-3">
                    <GraduationCap size={16} className="text-slate-800" /> Issued By: {certificate.issuer || 'Institutional Authority'}
                  </p>
                </div>
              </div>

              <div className="glass-pane rounded-3xl border border-white/5 px-8 py-6 shadow-inner bg-[#050505]/60 flex flex-col items-center">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800 mb-4 text-center">Protocol Status</p>
                <StatusBadge status={certificate.isRevoked ? 'REJECTED' : certificate.status} />
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

            <div className="mt-12 rounded-[2.5rem] border border-white/5 bg-[#050505]/40 p-10 shadow-inner group transition-all hover:border-cyan-400/20">
              <div className="flex items-center gap-4 mb-6">
                <Fingerprint className="text-cyan-400" size={20} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-800">SHA-256 Protocol Fingerprint</p>
              </div>
              <p className="break-all font-mono text-[11px] text-cyan-400/80 bg-[#080808] p-5 rounded-2xl border border-white/5 leading-relaxed tracking-tight group-hover:text-cyan-400 transition-colors uppercase">
                {certificate.certificateHash}
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="glass-pane rounded-[2rem] p-8 hover:border-cyan-400/20 transition-all shadow-xl">
                <div className="w-10 h-10 bg-cyan-400/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-400/20 mb-6 font-black uppercase tracking-widest text-[10px]">
                  AUTH
                </div>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-relaxed">Issued by a registered authority node</p>
              </div>
              <div className="glass-pane rounded-[2rem] p-8 hover:border-cyan-400/20 transition-all shadow-xl">
                <div className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-400/20 mb-6 font-black uppercase tracking-widest text-[10px]">
                  LIVE
                </div>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-relaxed">Public verification view active</p>
              </div>
              <div className="glass-pane rounded-[2rem] p-8 hover:border-cyan-400/20 transition-all shadow-xl">
                <div className="w-10 h-10 bg-cyan-400/10 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-400/20 mb-6 font-black uppercase tracking-widest text-[10px]">
                  SYNC
                </div>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-relaxed">Aligned with the live ledger pipeline</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
