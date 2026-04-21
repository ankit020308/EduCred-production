import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Fingerprint, GraduationCap, ShieldCheck } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const transition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

function InfoCard({ label, value }) {
  return (
    <div className="bg-[#f6f6f6] p-6 rounded-full border border-[#e0e0e0] hover:border-[#ea2804]/30 transition-all">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">{label}</p>
      <p className="mt-3 text-sm font-black text-[#202020] uppercase tracking-widest truncate">{value || 'N/A'}</p>
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
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f6]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-[3px] border-t-[#ea2804] border-r-[#ea2804] border-b-transparent border-l-transparent rounded-full animate-spin" />
          <div className="text-[10px] font-black tracking-widest text-[#646464] uppercase">Verifying Credential...</div>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f6] px-6 text-center">
        <div className="bg-white rounded-full p-12 border border-[#202020] max-w-md w-full">
          <div className="w-20 h-20 bg-[#ea2804]/5 rounded-full mx-auto flex items-center justify-center text-[#ea2804] border border-[#ea2804]/20 mb-8">
            <ShieldCheck size={36} />
          </div>
          <p className="text-[10px] font-black tracking-widest text-[#ea2804] uppercase mb-4">Error</p>
          <p className="text-xl font-black tracking-tight uppercase mb-10 text-[#202020]">{error}</p>
          <button onClick={() => navigate('/verify')} className="btn-primary w-full">
            <ArrowLeft size={16} /> Return to Verification
          </button>
        </div>
      </div>
    );
  }

  const status = certificate.isRevoked ? 'REVOKED' : certificate.status;
  const statusStyle =
    status === 'CONFIRMED' ? { bg: 'bg-[#2b9a66]', label: 'Verified' } :
    status === 'REVOKED'   ? { bg: 'bg-[#ea2804]', label: 'Revoked' } :
                             { bg: 'bg-[#646464]', label: 'Processing' };

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
          <Link to="/verify" className="text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-white transition-colors">
            Verify Another
          </Link>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-24 pt-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="bg-white rounded-full border border-[#202020] p-10 md:p-14"
          >
            <button
              onClick={() => navigate('/verify')}
              className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-[#ea2804] transition-colors mb-12"
            >
              <ArrowLeft size={14} />
              Return to Verification
            </button>

            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between border-b border-[#e0e0e0] pb-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[#ea2804]/30 bg-[#ea2804]/10 text-[10px] font-black uppercase tracking-widest text-[#ea2804]">
                  <ShieldCheck size={14} className="animate-pulse" />
                  Verified Digital Credential
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#202020] uppercase leading-none">
                  {certificate.studentName}.
                </h1>
                <div className="space-y-3">
                  <p className="text-xl font-black text-[#ea2804] uppercase tracking-widest">{certificate.course}</p>
                  <p className="text-[11px] font-black text-[#646464] uppercase tracking-widest flex items-center gap-3">
                    <GraduationCap size={16} className="text-[#bbbbbb]" /> Issued By: {certificate.issuer || 'Institutional Lead'}
                  </p>
                </div>
              </div>

              <div className="bg-[#f6f6f6] rounded-full border border-[#e0e0e0] px-10 py-8 flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#646464] mb-4 text-center">Status</p>
                <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${statusStyle.bg}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {statusStyle.label}
                </span>
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

            {/* Hash */}
            <div className="mt-12 rounded-full border border-[#e0e0e0] bg-[#f6f6f6] p-10 group hover:border-[#ea2804]/30 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <Fingerprint className="text-[#ea2804]" size={20} />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">Blockchain Verification Hash</p>
              </div>
              <p className="break-all font-mono text-xs text-[#646464] bg-white p-6 rounded-full border border-[#e0e0e0] leading-relaxed tracking-tight group-hover:text-[#ea2804] transition-colors uppercase">
                {certificate.certificateHash}
              </p>
            </div>

            {/* PDF Download — only when fileUrl is available */}
            {certificate.fileUrl && (
              <div className="mt-10 flex justify-center">
                <a
                  href={certificate.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <Download size={16} /> Download Certificate PDF
                </a>
              </div>
            )}

            {/* Trust badges */}
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                { label: 'AUTH', text: 'Issued by a verified authority', accent: false },
                { label: 'LIVE', text: 'Public record live and accessible', accent: true },
                { label: 'SECURE', text: 'Protected by blockchain immutability', accent: false },
              ].map(({ label, text, accent }) => (
                <div key={label} className="p-8 rounded-full bg-[#f6f6f6] border border-[#e0e0e0] hover:border-[#ea2804]/30 transition-all">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border font-black text-[10px] mb-6 ${
                    accent
                      ? 'bg-[#2b9a66]/10 border-[#2b9a66]/20 text-[#2b9a66]'
                      : 'bg-white border-[#e0e0e0] text-[#202020]'
                  }`}>
                    {label}
                  </div>
                  <p className="text-[11px] font-black text-[#646464] uppercase tracking-widest leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
