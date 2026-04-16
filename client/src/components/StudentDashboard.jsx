import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, ShieldCheck, Calendar, BookOpen, Hash,
  Loader2, Download, ExternalLink, Award, Fingerprint,
  LogOut, User, Copy, Check, Shield, Hexagon, LayoutDashboard
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BlockchainBackground from './BlockchainBackground';
import socket from '../services/socket.mjs';

const viewTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    fetchCertificates();

    if (user?.id) {
      socket.connect();
      socket.emit('join_user_room', user.id);

      const onNewCert = () => fetchCertificates();
      const onConfirmed = () => fetchCertificates();

      socket.on('newCertificate', onNewCert);
      socket.on('certificateConfirmed', onConfirmed);

      return () => {
        socket.off('newCertificate', onNewCert);
        socket.off('certificateConfirmed', onConfirmed);
        if (socket.connected) {
          socket.emit('leave_user_room', user.id);
          socket.disconnect();
        }
      };
    }
  }, [user?.id]);

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/api/student/certificates');
      setCertificates(res.data);
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
      // Fallback: try fetching from user/certificates endpoint
      try {
        const res2 = await api.get('/api/user/certificates');
        setCertificates(Array.isArray(res2.data) ? res2.data : []);
      } catch { 
        setCertificates([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Clipboard copy failed:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      <div className="fixed inset-0 z-0 opacity-20 mix-blend-screen pointer-events-none">
        <BlockchainBackground />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.04] bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-[#050505] border border-cyan-400/20 rounded-lg flex items-center justify-center">
              <Hexagon className="text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" size={16} />
            </div>
            <span className="text-lg font-black text-white tracking-widest uppercase">
              Edu<span className="text-cyan-400">Cred</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[#050505] border border-white/5 rounded-xl shadow-inner">
              <div className="w-8 h-8 bg-cyan-400/10 border border-cyan-400/20 rounded-lg flex items-center justify-center text-cyan-400 font-black text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div>
                <p className="text-white text-[10px] font-black uppercase tracking-widest">{user?.name || 'Student'}</p>
                <p className="text-slate-700 text-[8px] font-black uppercase tracking-[0.3em]">Network Identity</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-800 hover:text-rose-500 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Terminate Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="container max-w-5xl mx-auto px-6 pt-28 pb-24 relative z-10 space-y-10">

        {/* Welcome Banner */}
        <motion.div {...viewTransition}>
          <div className="flex items-center gap-3 px-5 py-2 bg-cyan-500/10 border border-cyan-400/20 rounded-full w-fit mb-6 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Sovereign Node Active</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none mb-4 uppercase">
            Identified: <span className="text-cyan-400">{user?.name?.split(' ')[0] || 'Citizen'}.</span>
          </h1>
          <p className="text-slate-800 text-[10px] font-black uppercase tracking-[0.4em]">Proprietary credentials synchronized with the distributed ledger.</p>
        </motion.div>

        {/* Stats Row */}
        <motion.div {...viewTransition} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {[
            { label: 'Total Proofs', val: certificates.length, icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
            { label: 'Verified State', val: certificates.filter(c => c.status === 'CONFIRMED').length, icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
            { label: 'In-Transit', val: certificates.filter(c => c.status === 'PENDING').length, icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          ].map((s, i) => (
            <div key={i} className="glass-pane p-8 rounded-[2.5rem] flex flex-col items-start hover:border-cyan-400/20 transition-all shadow-2xl">
              <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.border} border mb-6 flex items-center justify-center shadow-inner`}>
                <s.icon className={`${s.color}`} size={20} />
              </div>
              <span className="text-4xl font-black text-white tracking-tighter">{s.val}</span>
              <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] mt-2">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Certificates */}
        <motion.div {...viewTransition} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-lg font-black text-white tracking-[0.3em] uppercase">Verified Enclave</h2>
            <button onClick={() => navigate('/verify')} className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 hover:text-white transition-all underline decoration-cyan-400/30 underline-offset-8">
              Verify Node Protocol <ExternalLink size={12} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <Loader2 className="animate-spin text-cyan-400" size={32} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">Synchronizing Vault...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="glass-pane rounded-[2.5rem] p-20 text-center space-y-6 scanline-overlay">
              <div className="w-20 h-20 bg-white/[0.02] rounded-3xl mx-auto flex items-center justify-center border border-white/5">
                <GraduationCap className="text-slate-800" size={32} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">Digital Vault is Empty</p>
              <p className="text-slate-800 text-[10px] font-black uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                Credentials will manifest here once anchored to the global sovereignty ledger.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert) => (
                <motion.div
                  key={cert._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-pane rounded-[2rem] overflow-hidden hover:border-cyan-400/20 transition-all group cursor-pointer scanline-overlay sm:border border-white/5"
                  onClick={() => setSelectedCert(selectedCert?._id === cert._id ? null : cert)}
                >
                  <div className="p-8 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-[#050505] border border-cyan-400/20 rounded-2xl flex items-center justify-center text-cyan-400 font-black text-xl shrink-0 shadow-inner group-hover:border-cyan-400/40 transition-colors">
                        {cert.studentName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-white font-black text-[11px] tracking-[0.2em] uppercase">{cert.course || cert.certificateType || 'Academic Certificate'}</p>
                        <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.3em] mt-2 italic">{cert.issuer} · {new Date(cert.issuedAt || cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {cert.ipfsCid && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-400/10 border border-cyan-400/20 rounded-lg">
                          <span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter">Decentralized</span>
                        </div>
                      )}
                      
                      <span className={`hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-inner
                        ${cert.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          cert.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cert.status === 'CONFIRMED' ? 'bg-emerald-400' : cert.status === 'FAILED' ? 'bg-rose-400' : 'bg-amber-400'} animate-pulse`} />
                        {cert.status === 'CONFIRMED' ? 'Verified' : cert.status === 'FAILED' ? 'Revoked' : 'Syncing'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 overflow-hidden bg-[#050505]/40"
                      >
                        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800">Protocol ID</p>
                            <div className="flex items-center gap-3 bg-[#080808] px-4 py-3 rounded-xl border border-white/5">
                              <p className="text-cyan-400 font-mono text-[10px] truncate tracking-tight">{cert.certificateId || cert._id}</p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(cert.certificateId || cert._id, cert._id + 'id'); }}
                                className="shrink-0 text-slate-700 hover:text-white transition-colors"
                              >
                                {copiedId === cert._id + 'id' ? <Check size={12} className="text-cyan-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-800">Hash Fingerprint</p>
                            <div className="flex items-center gap-3 bg-[#080808] px-4 py-3 rounded-xl border border-white/5">
                              <p className="text-slate-500 font-mono text-[10px] truncate tracking-tight">{cert.certificateHash?.slice(0, 24)}...</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(cert.certificateHash, cert._id + 'hash'); }}
                                className="shrink-0 text-slate-700 hover:text-white transition-colors"
                              >
                                {copiedId === cert._id + 'hash' ? <Check size={12} className="text-cyan-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                          <div className="col-span-full flex gap-4 pt-4 border-t border-white/5">
                            {cert.fileUrl && (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`/api/certificates/${cert._id}/file`, '_blank'); }}
                                className="btn-command btn-blue px-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                              >
                                <Download size={14} /> Download Document
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate('/verify'); }}
                              className="btn-command btn-outline px-10"
                            >
                              <Shield size={14} /> Cross-Verify Node
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer Note */}
        <motion.div {...viewTransition} transition={{ delay: 0.3 }} className="text-center">
          <p className="text-slate-800 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
            All credentials are mathematically provable · Secured by EduCred Distributed Ledger Technology
          </p>
        </motion.div>
      </div>
    </div>
  );
}
