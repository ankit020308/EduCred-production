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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.04] bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center">
              <Hexagon className="text-blue-500" size={16} />
            </div>
            <span className="text-lg font-extrabold text-white tracking-tight">
              Edu<span className="text-blue-500">Cred</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[#0A0A0A] border border-white/[0.06] rounded-xl">
              <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div>
                <p className="text-white text-xs font-bold">{user?.name || 'Student'}</p>
                <p className="text-slate-600 text-[9px] uppercase tracking-widest">Student Node</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="container max-w-5xl mx-auto px-6 pt-28 pb-24 relative z-10 space-y-10">

        {/* Welcome Banner */}
        <motion.div {...viewTransition}>
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Student Portal Active</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter leading-none mb-2">
            Welcome back, <span className="text-blue-500">{user?.name?.split(' ')[0] || 'Student'}.</span>
          </h1>
          <p className="text-slate-500 text-sm">Your blockchain-anchored credentials are listed below.</p>
        </motion.div>

        {/* Stats Row */}
        <motion.div {...viewTransition} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Credentials', val: certificates.length, icon: GraduationCap, color: 'text-blue-400' },
            { label: 'Verified', val: certificates.filter(c => c.status === 'CONFIRMED').length, icon: ShieldCheck, color: 'text-blue-400' },
            { label: 'Pending Anchor', val: certificates.filter(c => c.status === 'PENDING').length, icon: Loader2, color: 'text-amber-400' },
          ].map((s, i) => (
            <div key={i} className="bg-[#0A0A0A]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.04] flex flex-col items-start">
              <s.icon className={`${s.color} mb-3`} size={20} />
              <span className="text-2xl font-extrabold text-white">{s.val}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Certificates */}
        <motion.div {...viewTransition} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Your Credentials</h2>
            <button onClick={() => navigate('/verify')} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              Verify a Document <ExternalLink size={12} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Syncing Credential Ledger...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="bg-[#0A0A0A]/80 border border-white/[0.04] rounded-2xl p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl mx-auto flex items-center justify-center">
                <GraduationCap className="text-slate-600" size={28} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">No credentials issued yet</p>
              <p className="text-slate-700 text-xs max-w-xs mx-auto">
                Your institution will issue certificates here once they are processed and anchored on-chain.
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
                  className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden hover:border-blue-500/20 transition-all group cursor-pointer"
                  onClick={() => setSelectedCert(selectedCert?._id === cert._id ? null : cert)}
                >
                  <div className="p-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
                        {cert.studentName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm tracking-tight">{cert.course || cert.certificateType || 'Academic Certificate'}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{cert.issuer} · {new Date(cert.issuedAt || cert.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* IPFS Badge */}
                      {cert.ipfsCid && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-md">
                          <span className="text-[8px] font-black text-sky-400 uppercase tracking-tighter">IPFS</span>
                        </div>
                      )}
                      {/* Status badge */}
                      <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border
                        ${cert.status === 'CONFIRMED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          cert.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cert.status === 'CONFIRMED' ? 'bg-blue-400' : cert.status === 'FAILED' ? 'bg-rose-400' : 'bg-amber-400'} animate-pulse`} />
                        {cert.status === 'CONFIRMED' ? 'Anchored' : cert.status === 'FAILED' ? 'Failed' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {selectedCert?._id === cert._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/[0.04] overflow-hidden"
                      >
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Certificate ID</p>
                            <div className="flex items-center gap-2">
                              <p className="text-blue-400 font-mono text-xs truncate">{cert.certificateId || cert._id}</p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(cert.certificateId || cert._id, cert._id + 'id'); }}
                                className="shrink-0 text-slate-600 hover:text-white transition-colors"
                              >
                                {copiedId === cert._id + 'id' ? <Check size={12} className="text-blue-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">SHA-256 Hash</p>
                            <div className="flex items-center gap-2">
                              <p className="text-slate-400 font-mono text-xs truncate">{cert.certificateHash?.slice(0, 20)}...</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(cert.certificateHash, cert._id + 'hash'); }}
                                className="shrink-0 text-slate-600 hover:text-white transition-colors"
                              >
                                {copiedId === cert._id + 'hash' ? <Check size={12} className="text-blue-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                          <div className="col-span-full flex gap-3 pt-2">
                            {cert.fileUrl && (
                              <a
                                href={`/api/certificates/${cert._id}/file`}
                                target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600/30 transition-all"
                              >
                                <Download size={12} /> Download
                              </a>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate('/verify'); }}
                              className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/[0.06] rounded-xl text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
                            >
                              <Shield size={12} /> Verify
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
          <p className="text-slate-700 text-[9px] font-bold uppercase tracking-[0.4em]">
            All credentials are mathematically provable · Powered by EduCred Blockchain Network
          </p>
        </motion.div>
      </div>
    </div>
  );
}
