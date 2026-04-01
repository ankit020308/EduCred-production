import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  ShieldCheck, 
  Calendar, 
  BookOpen, 
  Hash, 
  ArrowLeft,
  Loader2,
  Download,
  ExternalLink,
  Award,
  Fingerprint
} from 'lucide-react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import BlockchainBackground from '../components/BlockchainBackground';

// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export default function Student() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`http://localhost:5001/api/certificates/${id}`)
      .then(r => setCert(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#010409]">
      <Loader2 className="animate-spin text-indigo-500" size={48} />
    </div>
  );

  if (error || !cert) return (
    <div className="h-screen flex items-center justify-center bg-[#010409] p-6 text-center">
      <div className="glass-card p-12 border border-white/10 space-y-6">
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Protocol Secret Not Found</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">Identity Anchor invalid or detached from ledger.</p>
        <Link to="/verify" className="inline-flex items-center gap-2 text-indigo-500 font-bold uppercase text-[10px] tracking-widest hover:text-indigo-400 mt-6">
          ← Return to Verification Portal
        </Link>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30 pb-32">
      
      {/* 🌌 INTERACTIVE BACKGROUND: Neural-Link Mesh */}
      <BlockchainBackground />

      {/* AMBIENT GLOWS */}
      <div className="absolute inset-x-0 top-0 h-[500px] z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/5 blur-[200px] rounded-full" />
      </div>

      <div className="container max-w-4xl mx-auto px-6 pt-40 relative z-10 space-y-12">
        
        {/* BACK NAV */}
        <motion.div {...viewTransition} className="flex justify-start">
          <Link to="/verify" className="group flex items-center gap-3 text-slate-500 hover:text-white transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center group-hover:bg-white/[0.05] transition-all">
                <ArrowLeft size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Protocol Search Portal</span>
          </Link>
        </motion.div>

        {/* ── DIGITAL ASSET (CERTIFICATE) ─────────────────── */}
        <motion.div 
            {...viewTransition} 
            transition={{ ...viewTransition.transition, delay: 0.1 }}
            className="glass-card !p-0 border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.05)] group animate-levitate"
        >
          {/* Internal Glow */}
          <div className="absolute inset-0 bg-indigo-600/[0.02] pointer-events-none group-hover:bg-indigo-600/[0.04] transition-all duration-1000" />
          
          <div className="p-10 md:p-14 md:pb-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-12 relative z-10">
            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-8">
              <div className="w-24 h-24 bg-white text-black rounded-3xl flex items-center justify-center border border-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                <Award size={48} strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Blockchain Validated Protocol</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tighter leading-none italic uppercase">
                    {cert.studentName}
                </h1>
                <p className="text-slate-500 text-sm md:text-lg font-medium italic">
                    {cert.degreeName} · {cert.branch} · Academic Generation {cert.graduationYear}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Authenticated CGPA</span>
              <p className="text-7xl font-bold bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent leading-none tracking-tighter">{cert.cgpa || '10.0'}</p>
            </div>
          </div>

          {/* GRID: Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-white/5 relative z-10">
            {[
              { label: 'Network Identity', value: cert.regNo, icon: BookOpen, color: 'text-indigo-400' },
              { label: 'Institutional Node', value: cert.universityName, icon: GraduationCap, color: 'text-purple-400' },
              { label: 'Ledger Anchor Date', value: new Date(cert.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), icon: Calendar, color: 'text-emerald-400' },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <div key={label} className={`p-10 text-center md:text-left ${i !== 2 ? 'border-b md:border-b-0 md:border-r border-white/5' : ''}`}>
                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                  <Icon className={`${color} opacity-40`} size={16} />
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
                </div>
                <p className="text-white font-bold text-sm uppercase tracking-tight italic truncate">{value || 'UNRESOLVED'}</p>
              </div>
            ))}
          </div>

          {/* HASH FOOTER */}
          <div className="p-10 border-t border-white/5 bg-white/[0.01] relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-slate-500">
                    <Fingerprint className="opacity-20" size={24} />
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Cryptographic Digest (SHA-256)</p>
                        <p className="text-[10px] font-mono text-indigo-400 break-all leading-relaxed tracking-wider">{cert.certificateHash}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    {/* View Certificate/PDF Button (if supported by back-end field) */}
                    <button className="h-12 w-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-white/[0.08] transition-all text-slate-400 hover:text-white group/btn">
                        <Download size={18} className="group-hover/btn:translate-y-1 transition-transform" />
                    </button>
                    <Link to={`/verify/${id}`}>
                         <button className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 active:scale-95">
                            <ShieldCheck size={16} /> Re-Verify Anchor
                         </button>
                    </Link>
                </div>
            </div>
          </div>
        </motion.div>

        {/* ── TRANSCRIPT ────────────────────────────────────── */}
        <AnimatePresence>
          {cert.semesters && cert.semesters.length > 0 && (
            <motion.div 
                {...viewTransition} 
                transition={{ ...viewTransition.transition, delay: 0.2 }}
                className="glass-card !p-0 border border-white/10 overflow-hidden shadow-2xl relative z-20"
            >
              <div className="p-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-bold text-white tracking-tighter italic uppercase">Full Transcript</h3>
                   <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">Institutional Grade Mapping Node</p>
                </div>
                <Hash size={40} className="text-white/[0.03]" />
              </div>
              
              {cert.semesters.map((sem, i) => (
                <div key={i} className="border-b border-white/5 last:border-0">
                  <div className="p-6 bg-white/[0.03] flex items-center justify-between">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Semester Mapping Sequence {sem.semNo || i + 1}</p>
                    <span className="h-1 w-8 bg-indigo-500/20 rounded-full" />
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-10 py-6 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Protocol ID Subject</th>
                        <th className="px-10 py-6 text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Metric</th>
                        <th className="px-10 py-6 text-right text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Consensus Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sem.subjects?.map((sub, j) => (
                        <tr key={j} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-10 py-6 text-[11px] font-bold text-white italic tracking-tight">{sub.name}</td>
                          <td className="px-10 py-6 text-center text-[11px] font-black text-slate-600">{sub.marks} / 100</td>
                          <td className="px-10 py-6 text-right">
                            <span className={`inline-block px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest shadow-inner
                                ${sub.marks >= 80 ? 'bg-emerald-500/10 text-emerald-500' : sub.marks >= 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-500'}`}>
                              {sub.grade || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.3 }} className="text-center space-y-6 pt-12">
            <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.6em] max-w-sm mx-auto opacity-40 leading-loose italic">
                Educational Credential Decentralized Protocol. Authenticity secured by global consensus.
            </p>
        </motion.div>

      </div>
    </div>
  );
}
