import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, ShieldCheck, Clock, Loader2,
  ExternalLink, Copy, Check, Shield, LogOut, Download
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import socket from '../services/socket.mjs';

const vt = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } };

const STATUS_STYLES = {
  CONFIRMED: { bg: 'bg-[#2b9a66]', dot: 'bg-[#2b9a66]', label: 'Verified' },
  FAILED:    { bg: 'bg-[#ea2804]', dot: 'bg-[#ea2804]', label: 'Revoked' },
  default:   { bg: 'bg-[#646464]', dot: 'bg-[#646464]', label: 'Processing' },
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
      const onNew = () => fetchCertificates();
      socket.on('newCertificate', onNew);
      socket.on('certificateConfirmed', onNew);
      return () => {
        socket.off('newCertificate', onNew);
        socket.off('certificateConfirmed', onNew);
        if (socket.connected) { socket.emit('leave_user_room', user.id); socket.disconnect(); }
      };
    }
  }, [user?.id]);

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/api/student/certificates');
      setCertificates(res.data);
    } catch {
      try {
        const res2 = await api.get('/api/user/certificates');
        setCertificates(Array.isArray(res2.data) ? res2.data : []);
      } catch { setCertificates([]); }
    } finally { setLoading(false); }
  };

  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }
    catch { /* silently fail */ }
  };

  const confirmed = certificates.filter(c => c.status === 'CONFIRMED').length;
  const pending   = certificates.filter(c => c.status === 'PENDING').length;

  return (
    <div className="relative min-h-screen bg-[#f6f6f6] text-[#202020] font-sans overflow-x-hidden">

      {/* Dark hero strip */}
      <div className="fixed top-0 inset-x-0 h-72 bg-[#202020] pointer-events-none z-0" />

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#202020]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-[#ea2804] rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" size={16} />
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              Edu<span className="text-[#ea2804]">Cred</span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white/8 border border-white/15 rounded-full">
              <div className="w-7 h-7 bg-[#ea2804]/20 border border-[#ea2804]/30 rounded-full flex items-center justify-center text-[#ea2804] font-black text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="hidden lg:block">
                <p className="text-white text-[10px] font-black uppercase tracking-widest leading-none">{user?.name || 'Student'}</p>
                <p className="text-[#646464] text-[8px] font-black uppercase tracking-widest mt-0.5">Verified Account</p>
              </div>
            </div>
            <button onClick={() => { logout(); navigate('/'); }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-[#ea2804] transition-colors">
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-24 relative z-10 space-y-10">

        {/* Welcome */}
        <motion.div {...vt} className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ea2804]/20 border border-[#ea2804]/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ea2804] animate-pulse" />
            <span className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest">Account Verified</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none">
            Welcome, <span className="text-[#ea2804]">{user?.name?.split(' ')[0] || 'User'}.</span>
          </h1>
          <p className="text-[#646464] text-xs font-bold uppercase tracking-widest max-w-lg leading-loose">
            Your academic records are verified and securely stored within our enterprise network.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div {...vt} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: 'Total Certificates', val: certificates.length, icon: GraduationCap },
            { label: 'Verified On-Chain', val: confirmed, icon: ShieldCheck },
            { label: 'In Review', val: pending, icon: Clock },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-[#202020] rounded-full p-8 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 mb-6 flex items-center justify-center group-hover:bg-[#ea2804] group-hover:border-[#ea2804] transition-all duration-300">
                <s.icon className="text-[#ea2804] group-hover:text-white transition-colors" size={20} />
              </div>
              <span className="text-4xl font-black text-[#202020] tracking-tight block">{s.val}</span>
              <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest mt-2 block">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Certificate list */}
        <motion.div {...vt} transition={{ delay: 0.2 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
            <div>
              <h2 className="text-2xl font-black text-[#202020] tracking-tight">Your Certificates</h2>
              <p className="text-[#646464] text-[10px] font-black uppercase tracking-widest mt-1">{certificates.length} verified records</p>
            </div>
            <button onClick={() => navigate('/verify')}
              className="btn-primary text-xs">
              Verify a Document <ExternalLink size={13} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-5 bg-white border border-[#202020] rounded-full">
              <Loader2 className="animate-spin text-[#ea2804]" size={36} />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">Loading records...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="bg-white border border-[#202020] rounded-full p-20 text-center space-y-6">
              <div className="w-20 h-20 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full mx-auto flex items-center justify-center">
                <GraduationCap className="text-[#bbbbbb]" size={36} />
              </div>
              <div className="space-y-3">
                <p className="text-xl font-black text-[#202020] tracking-tight">No certificates yet</p>
                <p className="text-[#646464] text-xs font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                  Your official certificates will appear here once issued by your institution.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert) => {
                const ss = STATUS_STYLES[cert.status] || STATUS_STYLES.default;
                const isOpen = selectedCert?.id === cert.id;
                return (
                  <motion.div key={cert.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#202020] rounded-full overflow-hidden hover:border-[#ea2804] transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedCert(isOpen ? null : cert)}>

                    <div className="px-10 py-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center text-[#ea2804] font-black text-xl shrink-0 group-hover:bg-[#ea2804] group-hover:text-white transition-all duration-300">
                          {cert.studentName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-[#202020] font-black text-sm tracking-wide uppercase">{cert.course || cert.certificateType || 'Academic Certificate'}</p>
                          <p className="text-[#646464] text-[10px] font-black uppercase tracking-widest mt-1.5">
                            {cert.issuer} · {new Date(cert.issuedAt || cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${ss.bg}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {ss.label}
                      </span>
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-[#e0e0e0] overflow-hidden bg-[#f6f6f6]">
                          <div className="px-10 py-8 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              {[
                                { label: 'Certificate ID', value: cert.certificateId || cert.id, copyKey: cert.id + 'id' },
                                { label: 'Digital Fingerprint', value: cert.certificateHash?.slice(0, 24) + '...', copyKey: cert.id + 'hash', full: cert.certificateHash },
                              ].map(({ label, value, copyKey, full }) => (
                                <div key={label} className="space-y-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-[#646464]">{label}</p>
                                  <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full border border-[#e0e0e0]">
                                    <p className="text-[#ea2804] font-mono text-xs truncate flex-1">{value}</p>
                                    <button onClick={(e) => { e.stopPropagation(); copy(full || value, copyKey); }}
                                      className="text-[#bbbbbb] hover:text-[#ea2804] transition-colors shrink-0">
                                      {copiedId === copyKey ? <Check size={14} className="text-[#2b9a66]" /> : <Copy size={14} />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2 border-t border-[#e0e0e0]">
                              {cert.fileUrl && (
                                <button onClick={(e) => { e.stopPropagation(); window.open(`/api/certificates/${cert.id}/file`, '_blank'); }}
                                  className="btn-primary text-xs">
                                  <Download size={14} /> Download
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); navigate('/verify'); }}
                                className="btn-secondary text-xs">
                                <Shield size={14} /> Verification Centre
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div {...vt} transition={{ delay: 0.3 }} className="text-center pt-6">
          <p className="text-[#bbbbbb] text-[9px] font-black uppercase tracking-widest">
            All certificates are cryptographically verified and anchored to the EduCred network.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
