import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, CheckCircle2, XCircle, Clock,
  Search, Loader2, RefreshCcw, ExternalLink, ShieldAlert,
  Activity, AlertTriangle, Check, X, LogOut,
  FileText, RotateCcw, User, ChevronDown, ChevronUp, Wallet, AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ToastProvider, useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';

const vt = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

const CERT_STATUS = {
  CONFIRMED:           { label: 'On-Chain',          bg: 'bg-[#2b9a66]/10',  text: 'text-[#2b9a66]',  border: 'border-[#2b9a66]/20',  dot: 'bg-[#2b9a66]' },
  PENDING_REVIEW:      { label: 'Pending Review',    bg: 'bg-amber-50',       text: 'text-amber-600',   border: 'border-amber-200',      dot: 'bg-amber-500' },
  PROCESSING:          { label: 'Under Review',      bg: 'bg-blue-50',        text: 'text-blue-600',    border: 'border-blue-200',       dot: 'bg-blue-500' },
  ANCHOR_FAILED:       { label: 'Anchor Failed',     bg: 'bg-[#ea2804]/10',  text: 'text-[#ea2804]',  border: 'border-[#ea2804]/20',  dot: 'bg-[#ea2804]' },
  ANCHOR_PENDING_FUNDS:{ label: 'Needs Funding',     bg: 'bg-orange-50',      text: 'text-orange-600',  border: 'border-orange-200',     dot: 'bg-orange-500' },
  REJECTED:            { label: 'Rejected',          bg: 'bg-[#ea2804]/10',  text: 'text-[#ea2804]',  border: 'border-[#ea2804]/20',  dot: 'bg-[#ea2804]' },
  REVOKED:             { label: 'Revoked',           bg: 'bg-[#202020]/5',   text: 'text-[#202020]',  border: 'border-[#202020]/10',  dot: 'bg-[#202020]' },
};

const INST_STATUS = {
  APPROVED: { label: 'Verified',       bg: 'bg-[#2b9a66]/10',  text: 'text-[#2b9a66]',  border: 'border-[#2b9a66]/20',  dot: 'bg-[#2b9a66]' },
  PENDING:  { label: 'Pending Review', bg: 'bg-amber-50',       text: 'text-amber-600',   border: 'border-amber-200',      dot: 'bg-amber-500' },
  REJECTED: { label: 'Denied',         bg: 'bg-[#ea2804]/10',  text: 'text-[#ea2804]',  border: 'border-[#ea2804]/20',  dot: 'bg-[#ea2804]' },
};

function StatusPill({ status, map }) {
  const cfg = (map || CERT_STATUS)[status] || { label: status, bg: 'bg-[#f6f6f6]', text: 'text-[#646464]', border: 'border-[#e0e0e0]', dot: 'bg-[#646464]' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

// ─── Institutions Tab ─────────────────────────────────────────────────────────
function InstitutionsTab({ toast }) {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, action: null, id: null, name: '' });

  const fetchUniversities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/universities/all');
      setUniversities(res.data.data || []);
    } catch { toast.error('Failed to load institutions.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchUniversities(); }, [fetchUniversities]);

  const executeAction = async () => {
    const { id, action, name } = confirm;
    setProcessingId(id);
    try {
      await api.post(`/api/universities/${action}/${id}`);
      toast.success(`${name} ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setConfirm({ open: false, action: null, id: null, name: '' });
      fetchUniversities();
    } catch (err) {
      toast.error(`Action failed: ${err.response?.data?.error || 'Unknown error'}`);
    } finally { setProcessingId(null); }
  };

  const filtered = universities.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || u.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: universities.length,
    pending: universities.filter(u => u.status === 'PENDING').length,
    approved: universities.filter(u => u.status === 'APPROVED').length,
    rejected: universities.filter(u => u.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Portals',    val: stats.total,    icon: Users,        cfg: INST_STATUS.APPROVED  },
          { label: 'Pending Review',   val: stats.pending,  icon: Clock,        cfg: INST_STATUS.PENDING   },
          { label: 'Verified Portals', val: stats.approved, icon: CheckCircle2, cfg: INST_STATUS.APPROVED  },
          { label: 'Inactive',         val: stats.rejected, icon: ShieldAlert,  cfg: INST_STATUS.REJECTED  },
        ].map((s, i) => (
          <motion.div key={i} {...vt} transition={{ delay: i * 0.05 }}
            className="bg-white border border-[#e0e0e0] rounded-3xl p-6 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className={`w-10 h-10 rounded-full ${s.cfg.bg} border ${s.cfg.border} mb-5 flex items-center justify-center group-hover:bg-[#ea2804] group-hover:border-[#ea2804] transition-all`}>
              <s.icon className={`${s.cfg.text} group-hover:text-white transition-colors`} size={18} />
            </div>
            <span className="text-4xl font-black text-[#202020] tracking-tight block leading-none">{s.val}</span>
            <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest mt-2 block">{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 p-1.5 bg-[#f6f6f6] rounded-2xl border border-[#e0e0e0]">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                filter === f ? 'bg-[#202020] text-white' : 'text-[#646464] hover:text-[#202020] hover:bg-white'}`}>
              {f === 'REJECTED' ? 'DEACTIVATED' : f}
              {f === 'PENDING' && stats.pending > 0 && (
                <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">{stats.pending}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb]" size={14} />
          <input placeholder="Search portals…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 bg-white border border-[#e0e0e0] rounded-full pl-10 pr-4 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#ea2804]" size={28} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-[#646464] bg-[#f6f6f6]/60 border-b border-[#e0e0e0]">
                  {['Institution', 'Status', 'Details', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                <AnimatePresence mode="popLayout">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                          <Users size={40} className="text-[#646464]" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">No institutions found</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((uni) => (
                    <>
                      <motion.tr key={uni.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="group hover:bg-[#f6f6f6]/60 transition-all">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0 ${
                              uni.status === 'APPROVED' ? 'bg-[#2b9a66]' : uni.status === 'REJECTED' ? 'bg-[#ea2804]' : 'bg-amber-500'
                            }`}>
                              {uni.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[#202020] font-black text-sm uppercase tracking-wide">{uni.name}</p>
                                {uni.isFlagged && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#ea2804]/10 border border-[#ea2804]/20">
                                    <AlertTriangle size={9} className="text-[#ea2804]" />
                                    <span className="text-[8px] font-black text-[#ea2804] uppercase tracking-widest">Flagged</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[#646464] text-[9px] font-bold uppercase tracking-wide mt-0.5">{uni.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5"><StatusPill status={uni.status} map={INST_STATUS} /></td>
                        <td className="px-6 py-5">
                          <p className="text-[#646464] text-[10px] font-bold max-w-[200px] truncate">
                            {uni.description || 'Institutional profile data pending.'}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[#646464] text-[9px] font-bold">
                            {uni.createdAt ? new Date(uni.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {uni.status === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => setConfirm({ open: true, action: 'approve', id: uni.id, name: uni.name })}
                                disabled={processingId === uni.id}
                                className="flex items-center gap-1.5 h-8 px-4 bg-[#202020] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ea2804] transition-all">
                                {processingId === uni.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={12} />}
                                Approve
                              </button>
                              <button onClick={() => setConfirm({ open: true, action: 'reject', id: uni.id, name: uni.name })}
                                disabled={processingId === uni.id}
                                className="flex items-center gap-1.5 h-8 px-4 bg-[#ea2804]/10 border border-[#ea2804]/20 text-[#ea2804] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ea2804] hover:text-white transition-all">
                                <X size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f6f6f6] border border-[#e0e0e0] w-fit">
                              <div className={`w-1.5 h-1.5 rounded-full ${uni.status === 'APPROVED' ? 'bg-[#2b9a66] animate-pulse' : 'bg-[#ea2804]'}`} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#646464]">
                                {uni.status === 'APPROVED' ? 'Account Authorized' : 'Account Denied'}
                              </span>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    </>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirm.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirm({ ...confirm, open: false })}
              className="absolute inset-0 bg-[#202020]/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative bg-white rounded-3xl p-10 max-w-sm w-full shadow-xl space-y-7 border border-[#e0e0e0]">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center border ${
                confirm.action === 'approve'
                  ? 'bg-[#2b9a66]/10 border-[#2b9a66]/20 text-[#2b9a66]'
                  : 'bg-[#ea2804]/10 border-[#ea2804]/20 text-[#ea2804]'
              }`}>
                {confirm.action === 'approve' ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-[#202020] tracking-tight uppercase">
                  {confirm.action === 'approve' ? 'Approve Access?' : 'Reject Access?'}
                </h3>
                <p className="text-[#646464] text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  {confirm.action === 'approve'
                    ? `Grant certificate issuance authority to "${confirm.name}".`
                    : `Deny "${confirm.name}" access to the credential hub.`}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirm({ ...confirm, open: false })}
                  className="flex-1 h-11 rounded-xl border border-[#e0e0e0] text-[10px] font-black uppercase tracking-widest text-[#646464] hover:bg-[#f6f6f6] transition-all">
                  Cancel
                </button>
                <button onClick={executeAction} disabled={processingId === confirm.id}
                  className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all ${
                    confirm.action === 'approve' ? 'bg-[#202020] hover:bg-[#ea2804]' : 'bg-[#ea2804] hover:bg-[#dd4425]'
                  }`}>
                  {processingId === confirm.id ? <Loader2 size={16} className="animate-spin" /> : (confirm.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Wallet Status Panel ──────────────────────────────────────────────────────
function WalletStatusPanel({ toast }) {
  const [walletInfo, setWalletInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/certificates/admin/wallet-status');
      setWalletInfo(res.data);
    } catch { toast.error('Failed to load wallet status.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (loading) return <div className="py-6 flex items-center gap-3"><Loader2 size={16} className="animate-spin text-[#ea2804]" /><span className="text-[10px] font-black uppercase tracking-widest text-[#646464]">Loading wallet info…</span></div>;
  if (!walletInfo) return null;

  const { serverWallet, pendingFundsCerts, faucetUrl } = walletInfo;

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden mb-4">
      <div className="px-6 py-4 border-b border-[#e0e0e0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-[#646464]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#202020]">Institution Wallet Status</span>
        </div>
        <a href={faucetUrl} target="_blank" rel="noopener noreferrer"
          className="text-[9px] font-black uppercase tracking-widest text-[#ea2804] hover:underline flex items-center gap-1">
          <ExternalLink size={10} /> Sepolia Faucet
        </a>
      </div>
      <div className="px-6 py-4 space-y-3">
        <div className="flex items-center justify-between bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 py-3">
          <div>
            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Server Wallet (Authorization)</p>
            <p className="font-mono text-[10px] text-[#202020] mt-0.5">{serverWallet.address || 'Not configured'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[#202020]">{serverWallet.balanceEth} ETH</p>
            <p className="text-[9px] text-[#646464]">{serverWallet.networkName}</p>
          </div>
          <span className={`ml-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${serverWallet.sufficient ? 'bg-[#2b9a66]/10 text-[#2b9a66] border border-[#2b9a66]/20' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
            {serverWallet.sufficient ? 'OK' : 'Low Funds'}
          </span>
        </div>
        {pendingFundsCerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
              <AlertCircle size={11} /> {pendingFundsCerts.length} certificate(s) waiting for wallet funding
            </p>
            {pendingFundsCerts.map((item) => (
              <div key={item.certDbId} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-[10px] font-black text-[#202020]">{item.universityName}</p>
                  <p className="font-mono text-[9px] text-orange-600">{item.walletAddress}</p>
                </div>
                <span className="text-[10px] font-black text-orange-700">{item.balanceEth} ETH</span>
              </div>
            ))}
            <p className="text-[9px] text-[#646464] font-bold leading-relaxed">
              Fund the institution wallet(s) above from <a href={faucetUrl} target="_blank" rel="noopener noreferrer" className="text-[#ea2804] hover:underline">{faucetUrl}</a>, then retry anchoring.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Certificates Tab ─────────────────────────────────────────────────────────
function CertificatesTab({ toast }) {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [processingId, setProcessingId] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, certId: '' });
  const [rejectReason, setRejectReason] = useState('');

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/certificates/admin/all');
      setCerts(res.data.data || []);
    } catch { toast.error('Failed to load certificates.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const handleApprove = async (id, certId) => {
    setProcessingId(id);
    try {
      await api.post(`/api/certificates/admin/${id}/approve`);
      toast.success(`${certId} approved — anchoring started.`);
      fetchCerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed.');
    } finally { setProcessingId(null); }
  };

  const handleReject = async () => {
    const { id, certId } = rejectModal;
    setProcessingId(id);
    try {
      await api.post(`/api/certificates/admin/${id}/reject`, { reason: rejectReason });
      toast.success(`${certId} rejected.`);
      setRejectModal({ open: false, id: null, certId: '' });
      setRejectReason('');
      fetchCerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rejection failed.');
    } finally { setProcessingId(null); }
  };

  const filtered = certs.filter(c => {
    const matchSearch = c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      c.universityName?.toLowerCase().includes(search.toLowerCase()) ||
      c.certificateId?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: certs.length,
    pending: certs.filter(c => c.status === 'PENDING_REVIEW').length,
    confirmed: certs.filter(c => c.status === 'CONFIRMED').length,
    failed: certs.filter(c => c.status === 'ANCHOR_FAILED').length,
    pendingFunds: certs.filter(c => c.status === 'ANCHOR_PENDING_FUNDS').length,
  };

  return (
    <div className="space-y-6">
      {/* Wallet status panel */}
      <WalletStatusPanel toast={toast} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Certs',    val: stats.total,        icon: FileText,     cfg: CERT_STATUS.CONFIRMED          },
          { label: 'Pending Review', val: stats.pending,      icon: Clock,        cfg: CERT_STATUS.PENDING_REVIEW     },
          { label: 'On-Chain',       val: stats.confirmed,    icon: CheckCircle2, cfg: CERT_STATUS.CONFIRMED          },
          { label: 'Needs Funding',  val: stats.pendingFunds, icon: Wallet,       cfg: CERT_STATUS.ANCHOR_PENDING_FUNDS },
        ].map((s, i) => (
          <motion.div key={i} {...vt} transition={{ delay: i * 0.05 }}
            className="bg-white border border-[#e0e0e0] rounded-3xl p-6 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className={`w-10 h-10 rounded-full ${s.cfg.bg} border ${s.cfg.border} mb-5 flex items-center justify-center group-hover:bg-[#ea2804] group-hover:border-[#ea2804] transition-all`}>
              <s.icon className={`${s.cfg.text} group-hover:text-white transition-colors`} size={18} />
            </div>
            <span className="text-4xl font-black text-[#202020] tracking-tight block leading-none">{s.val}</span>
            <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest mt-2 block">{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 p-1.5 bg-[#f6f6f6] rounded-2xl border border-[#e0e0e0]">
          {['ALL', 'PENDING_REVIEW', 'CONFIRMED', 'ANCHOR_FAILED', 'ANCHOR_PENDING_FUNDS', 'REJECTED'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                filter === f ? 'bg-[#202020] text-white' : 'text-[#646464] hover:text-[#202020] hover:bg-white'}`}>
              {f.replace(/_/g, ' ')}
              {f === 'PENDING_REVIEW' && stats.pending > 0 && (
                <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{stats.pending}</span>
              )}
              {f === 'ANCHOR_PENDING_FUNDS' && stats.pendingFunds > 0 && (
                <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{stats.pendingFunds}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb]" size={14} />
          <input placeholder="Search certificates…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 bg-white border border-[#e0e0e0] rounded-full pl-10 pr-4 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#ea2804]" size={28} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-[#646464] bg-[#f6f6f6]/60 border-b border-[#e0e0e0]">
                  {['Student', 'Institution', 'Program', 'Status', 'Submitted', 'Reviewed By', 'Actions', ''].map(h => (
                    <th key={h} className="px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <FileText size={40} className="text-[#646464]" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#646464]">No certificates found</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((cert) => (
                  <>
                    <tr key={cert.id} className="group hover:bg-[#f6f6f6]/60 transition-all">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center text-[#ea2804] font-black text-[10px] shrink-0">
                            {cert.studentName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[#202020] font-black text-[10px] uppercase">{cert.studentName}</p>
                            <p className="text-[#646464] text-[9px]">{cert.studentEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-[10px] font-black text-[#646464] uppercase">{cert.universityName || cert.issuer}</span></td>
                      <td className="px-5 py-4"><span className="text-[10px] font-black text-[#646464] uppercase">{cert.course}</span></td>
                      <td className="px-5 py-4"><StatusPill status={cert.status} /></td>
                      <td className="px-5 py-4">
                        <span className="text-[9px] font-bold text-[#646464]">
                          {new Date(cert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[9px] font-bold text-[#646464]">{cert.reviewedBy || '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        {['PENDING_REVIEW', 'ANCHOR_FAILED', 'ANCHOR_PENDING_FUNDS'].includes(cert.status) && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApprove(cert.id, cert.certificateId)}
                              disabled={processingId === cert.id}
                              className={`flex items-center gap-1.5 h-8 px-4 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                cert.status === 'ANCHOR_PENDING_FUNDS'
                                  ? 'bg-orange-500 hover:bg-orange-600'
                                  : 'bg-[#202020] hover:bg-[#2b9a66]'
                              }`}>
                              {processingId === cert.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={12} />}
                              {cert.status === 'ANCHOR_FAILED' ? 'Retry' : cert.status === 'ANCHOR_PENDING_FUNDS' ? 'Retry (Fund First)' : 'Approve'}
                            </button>
                            {cert.status === 'PENDING_REVIEW' && (
                              <button onClick={() => setRejectModal({ open: true, id: cert.id, certId: cert.certificateId })}
                                disabled={processingId === cert.id}
                                className="flex items-center gap-1.5 h-8 px-4 bg-[#ea2804]/10 border border-[#ea2804]/20 text-[#ea2804] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ea2804] hover:text-white transition-all">
                                <X size={12} /> Reject
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => setExpandedRow(expandedRow === cert.id ? null : cert.id)}
                          className="w-7 h-7 rounded-full border border-[#e0e0e0] bg-white hover:border-[#ea2804] hover:text-[#ea2804] flex items-center justify-center text-[#bbbbbb] transition-all">
                          {expandedRow === cert.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === cert.id && (
                      <tr key={`${cert.id}-exp`}>
                        <td colSpan={8} className="px-6 py-5 bg-[#f6f6f6]/60">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              ['Certificate ID', cert.certificateId || cert.id],
                              ['Roll Number', cert.metadata?.studentEnrollmentNumber || '—'],
                              ['Branch', cert.metadata?.branch || '—'],
                              ['Semester', cert.metadata?.semester || '—'],
                              ['SGPA', cert.metadata?.sgpa || '—'],
                              ['Final CGPA', cert.metadata?.finalCGPA || '—'],
                              ['TX Hash', cert.blockchainTxHash ? cert.blockchainTxHash.slice(0, 20) + '…' : 'Not anchored'],
                              ['Reviewed At', cert.reviewedAt ? new Date(cert.reviewedAt).toLocaleString() : '—'],
                            ].map(([label, val]) => (
                              <div key={label} className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-[#e0e0e0]">
                                <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest">{label}</span>
                                <span className="text-[9px] font-black text-[#202020] truncate max-w-[140px]">{val}</span>
                              </div>
                            ))}
                          </div>
                          {/* Workflow log */}
                          {cert.workflowLog?.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Audit Trail</p>
                              {cert.workflowLog.map((entry, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-[#e0e0e0]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#ea2804]" />
                                  <span className="text-[9px] font-black text-[#202020] uppercase">{entry.stage}</span>
                                  <span className="text-[9px] text-[#646464]">by {entry.actorName}</span>
                                  <span className="text-[9px] text-[#bbbbbb] ml-auto">{new Date(entry.timestamp).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRejectModal({ open: false, id: null, certId: '' })}
              className="absolute inset-0 bg-[#202020]/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl space-y-5 border border-[#e0e0e0]">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-[#ea2804]/10 border border-[#ea2804]/20 text-[#ea2804]">
                <XCircle size={28} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-[#202020] tracking-tight uppercase">Reject Certificate?</h3>
                <p className="text-[#646464] text-[10px] font-bold uppercase tracking-widest mt-1">{rejectModal.certId}</p>
              </div>
              <div>
                <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block mb-2">Rejection Reason</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection…"
                  className="w-full h-24 bg-[#f6f6f6] border border-[#e0e0e0] rounded-xl px-4 py-3 text-sm text-[#202020] outline-none focus:border-[#ea2804] transition-all resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRejectModal({ open: false, id: null, certId: '' })}
                  className="flex-1 h-11 rounded-xl border border-[#e0e0e0] text-[10px] font-black uppercase tracking-widest text-[#646464] hover:bg-[#f6f6f6] transition-all">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={processingId === rejectModal.id}
                  className="flex-1 h-11 rounded-xl bg-[#ea2804] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#dd4425] transition-all">
                  {processingId === rejectModal.id ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function SystemAdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('institutions');

  return (
    <div className="relative min-h-screen bg-[#f6f6f6] text-[#202020] font-sans">

      {/* Persistent Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#e0e0e0] h-14 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-7 h-7 bg-[#ea2804] rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white" size={14} />
            </div>
            <span className="text-base font-black text-[#202020] tracking-tight">
              Edu<span className="text-[#ea2804]">Cred</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#646464]">
              <div className="w-6 h-6 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full flex items-center justify-center text-[#ea2804] font-black text-[9px]">
                {user?.name?.charAt(0) || 'A'}
              </div>
              {user?.name || 'Administrator'}
              <span className="px-2 py-0.5 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 text-[#ea2804]">ADMIN</span>
            </span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#646464] hover:text-[#ea2804] transition-colors">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="pt-14 max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* Breadcrumb */}
        <p className="text-[9px] font-black uppercase tracking-widest text-[#646464]">
          Platform Admin › {activeTab === 'institutions' ? 'Institution Accounts' : 'Certificate Management'}
        </p>

        {/* Header */}
        <motion.div {...vt} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ea2804] animate-pulse" />
              <span className="text-[9px] font-black text-[#ea2804] uppercase tracking-widest">Platform Administrator</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#202020] tracking-tight leading-none">
              {activeTab === 'institutions' ? 'Issuer' : 'Certificate'}{' '}
              <span className="text-[#ea2804]">{activeTab === 'institutions' ? 'Accounts.' : 'Review.'}</span>
            </h1>
            <p className="text-[#646464] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Activity size={12} className="text-[#ea2804]" />
              Session: {user?.name || 'System Controller'}
            </p>
          </div>
          <button onClick={activeTab === 'institutions'
            ? () => window.location.reload()
            : () => window.location.reload()}
            className="btn-secondary shrink-0 text-xs">
            <RefreshCcw size={13} /> Refresh Records
          </button>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1.5 bg-[#f6f6f6] border border-[#e0e0e0] rounded-2xl w-fit">
          {[
            { id: 'institutions', label: 'Institutions', icon: Users },
            { id: 'certificates', label: 'Certificates',  icon: FileText },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-[#202020] text-white' : 'text-[#646464] hover:bg-white hover:text-[#202020]'}`}>
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}>
            {activeTab === 'institutions'
              ? <InstitutionsTab toast={toast} />
              : <CertificatesTab toast={toast} />
            }
          </motion.div>
        </AnimatePresence>

        <footer className="pt-10 text-center border-t border-[#e0e0e0]">
          <p className="text-[#bbbbbb] text-[9px] font-black uppercase tracking-widest">
            Authorized administrative workspace. All registry modifications are cryptographically signed and archived.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function SystemAdmin() {
  return <ToastProvider><SystemAdminDashboard /></ToastProvider>;
}
