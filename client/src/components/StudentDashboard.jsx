import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vt } from '../data/animationConstants';
import { CERT_STATUS } from '../data/certStatusConfig';
import {
  GraduationCap, ShieldCheck, Clock, Loader2,
  ExternalLink, Copy, Check, Shield, LogOut, Download,
  ChevronRight, Info, User, AlertCircle, Link as LinkIcon, FileText
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import socket from '../services/socket.mjs';


// Stepper pipeline: maps status → step index
const PIPELINE = [
  { label: 'Submitted',    statuses: ['PENDING_REVIEW'] },
  { label: 'Under Review', statuses: ['PROCESSING'] },
  { label: 'Anchoring',    statuses: ['CONFIRMED'] },
  { label: 'Verified',     statuses: ['CONFIRMED'] },
];

function getPipelineStep(status) {
  if (status === 'PENDING_REVIEW')       return 0;
  if (status === 'PROCESSING')           return 1;
  if (status === 'CONFIRMED')            return 3;
  if (status === 'ANCHOR_FAILED')        return 2;
  if (status === 'ANCHOR_PENDING_FUNDS') return 2;
  if (status === 'REJECTED')             return -1;
  return 0;
}

function CertStepper({ status }) {
  const step = getPipelineStep(status);
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-xl">
        <AlertCircle size={12} className="text-[#ea2804]" />
        <span className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest">Rejected by Admin</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {PIPELINE.map((s, i) => {
        const isActive  = i === step;
        const isDone    = i < step || (status === 'CONFIRMED' && i <= 3);
        const isFailed  = status === 'ANCHOR_FAILED' && i === 2;
        return (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${
              isFailed
                ? 'bg-[#ea2804]/10 border-[#ea2804]/20 text-[#ea2804]'
                : isDone
                  ? 'bg-[#2b9a66]/10 border-[#2b9a66]/20 text-[#2b9a66]'
                  : isActive
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-[#f6f6f6] border-[#e0e0e0] text-[#bbbbbb]'
            }`}>
              {isDone && !isFailed && <Check size={8} />}
              {isActive && !isDone && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
              {isFailed && <AlertCircle size={8} />}
              {s.label}
            </div>
            {i < PIPELINE.length - 1 && (
              <ChevronRight size={9} className={isDone ? 'text-[#2b9a66]' : 'text-[#e0e0e0]'} />
            )}
          </div>
        );
      })}
    </div>
  );
}


export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [studentRecord, setStudentRecord] = useState(null);
  const [digilockerDocs, setDigilockerDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    fetchCertificates();
    fetchStats();
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

  const ownedOnly = (list) =>
    Array.isArray(list) ? list.filter(c => !c.studentEmail || c.studentEmail === user?.email) : [];

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/student/dashboard/stats');
      setStudentRecord(res.data.student);
      if (res.data.student?.digilockerConnected) {
        fetchDigilockerDocuments();
      }
    } catch { /* silently fail */ }
  };

  const fetchDigilockerDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await api.get('/api/student/digilocker/documents');
      setDigilockerDocs(res.data.documents || []);
    } catch { /* silently fail */ }
    finally { setLoadingDocs(false); }
  };

  const connectDigilocker = async () => {
    try {
      const res = await api.get('/api/student/digilocker/auth-url');
      if (res.data.url) window.location.href = res.data.url;
    } catch (err) {
      toast.error('Failed to initiate DigiLocker connection.');
    }
  };

  const disconnectDigilocker = async () => {
    try {
      await api.delete('/api/student/digilocker/disconnect');
      setStudentRecord(prev => ({ ...prev, digilockerConnected: false, digilockerUsername: null }));
      setDigilockerDocs([]);
    } catch (err) {
      toast.error('Failed to disconnect DigiLocker.');
    }
  };

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/api/student/certificates');
      setCertificates(ownedOnly(res.data));
    } catch {
      try {
        const res2 = await api.get('/api/user/certificates');
        setCertificates(ownedOnly(res2.data));
      } catch { setCertificates([]); }
    } finally { setLoading(false); }
  };

  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }
    catch { /* silently fail */ }
  };

  const confirmed = certificates.filter(c => c.status === 'CONFIRMED').length;
  const pending   = certificates.filter(c => ['PENDING_REVIEW', 'PROCESSING'].includes(c.status)).length;

  return (
    <div className="relative min-h-screen bg-[#f6f6f6] text-[#202020] font-sans overflow-x-hidden">

      {/* Dark hero strip */}
      <div className="fixed top-0 inset-x-0 h-64 bg-[#202020] pointer-events-none z-0" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#202020]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-7 h-7 bg-[#ea2804] rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white" size={14} />
            </div>
            <span className="text-base font-black text-white tracking-tight">
              Edu<span className="text-[#ea2804]">Cred</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* User chip */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/8 border border-white/15 rounded-full">
              <div className="w-6 h-6 bg-[#ea2804]/20 border border-[#ea2804]/30 rounded-full flex items-center justify-center text-[#ea2804] font-black text-[9px]">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="hidden lg:block">
                <p className="text-white text-[9px] font-black uppercase tracking-widest leading-none">{user?.name || 'Student'}</p>
                <p className="text-[#646464] text-[8px] font-black uppercase tracking-widest mt-0.5">Verified Account</p>
              </div>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-[#ea2804]/20 border border-[#ea2804]/30 text-[#ea2804] text-[8px] font-black uppercase tracking-widest">
                STUDENT
              </span>
            </div>
            <button onClick={() => navigate('/profile')}
              className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
              <User size={13} className="text-white/70" />
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-[#ea2804] transition-colors">
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20 relative z-10 space-y-8">

        {/* Breadcrumb */}
        <p className="text-[9px] font-black uppercase tracking-widest text-white/40">
          Student Portal › My Certificates
        </p>

        {/* Welcome */}
        <motion.div {...vt} className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ea2804]/20 border border-[#ea2804]/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ea2804] animate-pulse" />
            <span className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest">Account Verified</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
            Welcome, <span className="text-[#ea2804]">{user?.name?.split(' ')[0] || 'User'}.</span>
          </h1>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest max-w-md leading-relaxed">
            Your academic records are verified and securely stored within our enterprise network.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div {...vt} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Certificates', val: certificates.length, icon: GraduationCap },
            {
              label: 'Verified On-Chain', val: confirmed, icon: ShieldCheck,
              tooltip: 'Certificates anchored to the Sepolia blockchain. Newly issued certs go through admin review → anchoring pipeline (typically 1-24 hrs).',
            },
            { label: 'In Review', val: pending, icon: Clock },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-[#202020] rounded-3xl p-6 hover:-translate-y-0.5 transition-all duration-300 group relative">
              <div className="w-9 h-9 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 mb-5 flex items-center justify-center group-hover:bg-[#ea2804] group-hover:border-[#ea2804] transition-all duration-300">
                <s.icon className="text-[#ea2804] group-hover:text-white transition-colors" size={17} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-black text-[#202020] tracking-tight block">{s.val}</span>
                {s.tooltip && (
                  <button onClick={() => setShowTooltip(p => !p)} className="text-[#bbbbbb] hover:text-[#646464] transition-colors">
                    <Info size={13} />
                  </button>
                )}
              </div>
              <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest mt-1 block">{s.label}</span>
              {s.tooltip && showTooltip && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute z-20 top-full left-0 mt-2 w-72 bg-[#202020] text-white text-[9px] font-bold leading-relaxed px-4 py-3 rounded-xl shadow-xl">
                  {s.tooltip}
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>

        {/* DigiLocker Section */}
        <motion.div {...vt} transition={{ delay: 0.15 }} className="bg-white border border-[#e0e0e0] rounded-3xl p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${studentRecord?.digilockerConnected ? 'bg-[#2b9a66]/10 border-[#2b9a66]/20' : 'bg-blue-50 border-blue-100'}`}>
                <ShieldCheck className={studentRecord?.digilockerConnected ? 'text-[#2b9a66]' : 'text-blue-500'} size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#202020] tracking-tight">DigiLocker Integration</h3>
                <p className="text-[#646464] text-[10px] font-bold uppercase tracking-widest mt-1">
                  {studentRecord?.digilockerConnected 
                    ? `Connected as: ${studentRecord?.digilockerUsername || 'Verified User'}` 
                    : 'Sync your issued documents with Govt. of India'}
                </p>
              </div>
            </div>
            <div>
              {studentRecord?.digilockerConnected ? (
                <button onClick={disconnectDigilocker} className="px-4 py-2 bg-[#f6f6f6] hover:bg-[#e0e0e0] text-[#646464] text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors border border-[#e0e0e0]">
                  Disconnect
                </button>
              ) : (
                <button onClick={connectDigilocker} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-sm shadow-blue-600/20 flex items-center gap-2">
                  <LinkIcon size={14} /> Connect DigiLocker
                </button>
              )}
            </div>
          </div>
          
          {studentRecord?.digilockerConnected && (
            <div className="mt-8 border-t border-[#e0e0e0] pt-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#646464] mb-4">Synced Documents</h4>
              {loadingDocs ? (
                 <div className="flex items-center gap-2 text-[10px] font-black text-[#bbbbbb] uppercase">
                   <Loader2 size={12} className="animate-spin" /> Fetching from DigiLocker...
                 </div>
              ) : digilockerDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {digilockerDocs.map((doc, idx) => (
                    <div key={idx} className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl p-4 flex items-start gap-3">
                      <div className="mt-0.5"><FileText size={16} className="text-[#646464]" /></div>
                      <div>
                        <p className="text-xs font-black text-[#202020] truncate" title={doc.name}>{doc.name}</p>
                        <p className="text-[9px] font-bold text-[#646464] uppercase mt-1">{doc.issuer || 'Govt of India'}</p>
                        {doc.date && <p className="text-[8px] font-bold text-[#bbbbbb] uppercase mt-0.5">{doc.date}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#bbbbbb]">
                  No documents found in your DigiLocker.
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Download error banner */}
        <AnimatePresence>
          {downloadError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-5 py-3 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-2xl">
              <AlertCircle size={14} className="text-[#ea2804] shrink-0" />
              <p className="text-[#ea2804] text-[10px] font-black uppercase tracking-widest">{downloadError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Certificate list */}
        <motion.div {...vt} transition={{ delay: 0.2 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-[#202020] tracking-tight">Your Certificates</h2>
              <p className="text-[#646464] text-[9px] font-black uppercase tracking-widest mt-1">{certificates.length} verified records</p>
            </div>
            <button onClick={() => navigate('/verify')} className="btn-primary text-xs self-start md:self-auto">
              Verify a Document <ExternalLink size={12} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white border border-[#e0e0e0] rounded-3xl">
              <Loader2 className="animate-spin text-[#ea2804]" size={28} />
              <p className="text-[9px] font-black uppercase tracking-widest text-[#646464]">Loading records…</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-3xl p-16 flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full flex items-center justify-center">
                <GraduationCap className="text-[#bbbbbb]" size={28} />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-[#202020] tracking-tight">No certificates yet</p>
                <p className="text-[#646464] text-[10px] font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                  Your institution hasn't issued any records yet. They'll appear here once issued and approved.
                </p>
              </div>
              <button onClick={() => navigate('/verify')} className="btn-primary text-xs">
                Verify a Document <ExternalLink size={12} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates.map((cert) => {
                const { badgeBg: ssBg, label: ssLabel } = CERT_STATUS[cert.status] || CERT_STATUS.default;
                const isOpen = selectedCert?.id === cert.id;
                return (
                  <motion.div key={cert.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden hover:border-[#202020] transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedCert(isOpen ? null : cert)}>

                    <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center text-[#ea2804] font-black text-lg shrink-0">
                          {cert.studentName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-[#202020] font-black text-sm tracking-wide uppercase">{cert.course || cert.certificateType || 'Academic Certificate'}</p>
                          <p className="text-[#646464] text-[9px] font-black uppercase tracking-widest mt-1">
                            {cert.issuer} · {new Date(cert.issuedAt || cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${ssBg}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                          {ssLabel}
                        </span>
                        {/* Status stepper — only show for non-confirmed/non-revoked */}
                        {!['CONFIRMED', 'REVOKED'].includes(cert.status) && (
                          <div className="hidden md:block">
                            <CertStepper status={cert.status} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile stepper */}
                    {!['CONFIRMED', 'REVOKED'].includes(cert.status) && (
                      <div className="md:hidden px-8 pb-4 overflow-x-auto">
                        <CertStepper status={cert.status} />
                      </div>
                    )}

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-[#e0e0e0] overflow-hidden bg-[#f6f6f6]">
                          <div className="px-8 py-6 space-y-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {[
                                { label: 'Certificate ID', value: cert.certificateId || cert.id, copyKey: cert.id + 'id', full: cert.certificateId || cert.id },
                                { label: 'Digital Fingerprint', value: cert.certificateHash?.slice(0, 24) + '…', copyKey: cert.id + 'hash', full: cert.certificateHash },
                                { label: 'Program', value: cert.course || '—' },
                                { label: 'Branch', value: cert.metadata?.branch || '—' },
                              ].map(({ label, value, copyKey, full }) => (
                                <div key={label} className="space-y-1.5">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-[#646464]">{label}</p>
                                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-[#e0e0e0]">
                                    <p className="text-[#ea2804] font-mono text-xs truncate flex-1">{value}</p>
                                    {copyKey && (
                                      <button onClick={(e) => { e.stopPropagation(); copy(full || value, copyKey); }}
                                        className="text-[#bbbbbb] hover:text-[#ea2804] transition-colors shrink-0">
                                        {copiedId === copyKey ? <Check size={12} className="text-[#2b9a66]" /> : <Copy size={12} />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-3 pt-3 border-t border-[#e0e0e0]">
                              {cert.status === 'CONFIRMED' && (
                                <button disabled={downloadingId === cert.id} onClick={async (e) => {
                                  e.stopPropagation();
                                  setDownloadingId(cert.id);
                                  setDownloadError(null);
                                  try {
                                    const response = await api.get(`/api/certificates/${cert.id}/file`, { responseType: 'blob' });
                                    const url = URL.createObjectURL(response.data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Certificate_${cert.certificateId || cert.id}.pdf`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } catch (err) {
                                    const status = err?.response?.status;
                                    if (status === 404) {
                                      setDownloadError('Certificate file is not available yet. It may still be processing.');
                                      fetchCertificates();
                                    } else {
                                      setDownloadError('Download failed. Please try again.');
                                    }
                                    setTimeout(() => setDownloadError(null), 5000);
                                  } finally {
                                    setDownloadingId(null);
                                  }
                                }} className="btn-primary text-xs disabled:opacity-60 disabled:cursor-not-allowed">
                                  {downloadingId === cert.id
                                    ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                                    : <><Download size={13} /> {cert.fileUrl ? 'Download Certificate PDF' : 'Re-Generate PDF'}</>
                                  }
                                </button>
                              )}
                              {cert.status === 'CONFIRMED' && (
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/verify/${cert.certificateId || cert.id}`); }}
                                  className="btn-secondary text-xs">
                                  <Shield size={13} /> Verify on Blockchain
                                </button>
                              )}
                              {['PENDING_REVIEW', 'PROCESSING'].includes(cert.status) && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[9px] font-black text-amber-700 uppercase tracking-widest">
                                  <Clock size={11} />
                                  Awaiting admin review — PDF available after verification
                                </div>
                              )}
                              {cert.status === 'ANCHOR_PENDING_FUNDS' && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-[9px] font-black text-orange-700 uppercase tracking-widest">
                                  <AlertCircle size={11} />
                                  Anchoring paused — institution wallet needs Sepolia ETH
                                </div>
                              )}
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

        <motion.div {...vt} transition={{ delay: 0.3 }} className="text-center pt-4">
          <p className="text-[#bbbbbb] text-[9px] font-black uppercase tracking-widest">
            All certificates are cryptographically verified and anchored to the EduCred network.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
