import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, ShieldCheck, Calendar, BookOpen, Hash,
  Loader2, Download, ExternalLink, Award, Fingerprint,
  LogOut, User, Copy, Check, Shield, Hexagon, LayoutDashboard, Clock
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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0 h-80" />
      <div className="fixed inset-0 hero-gradient pointer-events-none z-0" />

      {/* ── Header ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0B132B]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
              <ShieldCheck className="text-white" size={18} />
            </div>
            <span className="text-xl font-black text-white tracking-tighter uppercase">
              Edu<span className="text-blue-500">Cred</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 px-5 py-2 bg-white/5 border border-white/10 rounded-2xl">
              <div className="w-8 h-8 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 font-black text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="hidden lg:block">
                <p className="text-white text-[10px] font-black uppercase tracking-widest leading-none">{user?.name || 'Student'}</p>
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1 opacity-60">Verified Account</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="container max-w-6xl mx-auto px-6 pt-36 pb-24 relative z-10 space-y-12">

        {/* Welcome Banner */}
        <motion.div {...viewTransition} className="space-y-6">
          <div className="flex items-center gap-3 px-6 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Account Verified</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none uppercase">
            Welcome, <span className="text-blue-500">{user?.name?.split(' ')[0] || 'User'}.</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest max-w-xl leading-loose italic opacity-80">
            Your academic records are verified and securely stored within our enterprise network.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div {...viewTransition} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { label: 'Total Certificates', val: certificates.length, icon: GraduationCap, color: 'text-blue-600' },
            { label: 'Verified', val: certificates.filter(c => c.status === 'CONFIRMED').length, icon: ShieldCheck, color: 'text-blue-600' },
            { label: 'In Review', val: certificates.filter(c => c.status === 'PENDING').length, icon: Clock, color: 'text-amber-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/5 hover:-translate-y-1 transition-all duration-500 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 mb-8 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-500">
                <s.icon className={`${s.color} group-hover:text-white transition-colors`} size={24} />
              </div>
              <span className="text-5xl font-black text-slate-900 tracking-tighter block">{s.val}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 block">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Certificates */}
        <motion.div {...viewTransition} transition={{ delay: 0.2 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-2">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Your Certificates</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">{certificates.length} verified records found</p>
            </div>
            <button onClick={() => navigate('/verify')} className="inline-flex items-center gap-3 px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
              Verify a Document <ExternalLink size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 bg-white rounded-[3rem] border border-slate-100 shadow-xl">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Updating your records...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="bg-white rounded-[3rem] p-24 text-center space-y-8 border border-slate-100 shadow-2xl shadow-slate-900/5">
              <div className="w-24 h-24 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center border border-slate-100 shadow-inner">
                <GraduationCap className="text-slate-300" size={40} />
              </div>
              <div className="space-y-4">
                <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase">No certificates found</p>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                  Your official certificates will appear here once they are issued by your institution.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {certificates.map((cert) => (
                <motion.div
                  key={cert.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-slate-900/10 transition-all duration-500 group cursor-pointer"
                  onClick={() => setSelectedCert(selectedCert?.id === cert.id ? null : cert)}
                >
                  <div className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-extrabold text-2xl shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        {cert.studentName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-slate-900 font-black text-sm tracking-widest uppercase">{cert.course || cert.certificateType || 'Academic Certificate'}</p>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">{cert.issuer} · {new Date(cert.issuedAt || cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {cert.ipfsCid && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                           <span className="text-[9px] font-black text-blue-800 uppercase tracking-widest">Secured</span>
                        </div>
                      )}
                      
                      <span className={`inline-flex items-center gap-3 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${cert.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          cert.status === 'FAILED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        <div className={`w-2 h-2 rounded-full ${cert.status === 'CONFIRMED' ? 'bg-emerald-500' : cert.status === 'FAILED' ? 'bg-rose-500' : 'bg-amber-500'} animate-pulse`} />
                        {cert.status === 'CONFIRMED' ? 'Verified' : cert.status === 'FAILED' ? 'Revoked' : 'Processing'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                      {selectedCert?.id === cert.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-50 overflow-hidden bg-slate-50/50"
                        >
                          <div className="p-10 space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                              <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certificate ID</p>
                                <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
                                  <p className="text-blue-600 font-bold text-xs truncate flex-1">{cert.certificateId || cert.id}</p>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(cert.certificateId || cert.id, cert.id + 'id'); }}
                                    className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                                  >
                                    {copiedId === cert.id + 'id' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Digital Fingerprint</p>
                                <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
                                  <p className="text-slate-500 font-medium text-xs truncate flex-1">{cert.certificateHash?.slice(0, 24)}...</p>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(cert.certificateHash, cert.id + 'hash'); }}
                                    className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                                  >
                                    {copiedId === cert.id + 'hash' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                              {cert.fileUrl && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.open(`/api/certificates/${cert.id}/file`, '_blank'); }}
                                  className="inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10"
                                >
                                  <Download size={16} /> Download Certificate
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate('/verify'); }}
                                className="inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                              >
                                <Shield size={16} /> Verification Center
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
        <motion.div {...viewTransition} transition={{ delay: 0.3 }} className="text-center pt-10">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed opacity-60 italic">
            All certificates are cryptographically verified and anchored to the EduCred network.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
