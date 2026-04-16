import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, CheckCircle2, XCircle, Clock,
  Search, Loader2, RefreshCcw, ExternalLink, ShieldAlert,
  Activity, Globe, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';
import StatusBadge from '../components/StatusBadge';
import { ToastProvider, useToast } from '../components/Toast';
import socket from '../services/socket.mjs';

const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

// ─── Confirm Dialog Component ─────────────────────────────────────────────────
function ConfirmDialog({ open, action, universityName, onConfirm, onCancel, loading }) {
  if (!open) return null;
  const isApprove = action === 'approve';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative glass-pane rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 scanline-overlay sm:border border-white/10"
          >
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-xl ${isApprove ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10'}`}>
              {isApprove ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                {isApprove ? 'Validate Node?' : 'Restrain Node?'}
              </h3>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed max-w-xs mx-auto">
                {isApprove
                  ? `Grant certificate issuance authority to "${universityName}" across the sovereign network.`
                  : `Deny authority to "${universityName}". Access can be restored via manual override.`}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={onCancel}
                className="btn-command btn-outline flex-1 py-4"
              >
                Abort
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`btn-command flex-1 py-4 shadow-2xl ${isApprove ? 'btn-blue' : 'bg-rose-500/20 border border-rose-500/30 text-rose-500 hover:bg-rose-500/30'}`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (isApprove ? 'Verify Approval' : 'Execute Rejection')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function SystemAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [confirm, setConfirm] = useState({ open: false, action: null, id: null, name: '' });

  useEffect(() => {
    fetchUniversities();

    // ⚡ Socket.io Lifecycle
    socket.connect();
    socket.emit('join_admin_room');

    socket.on('universityRegistered', (data) => {
        console.log('⚡ [SOCKET]: New University Registered', data);
        fetchUniversities();
        toast.info(`New application: ${data.name}`);
    });

    return () => {
        if (socket.connected) {
            socket.emit('leave_admin_room');
            socket.disconnect();
        }
    };
  }, []);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/universities/all');
      setUniversities(res.data.data || []);
    } catch {
      toast.error('Failed to fetch universities. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const requestAction = (id, action, name) => {
    setConfirm({ open: true, action, id, name });
  };

  const executeAction = async () => {
    const { id, action, name } = confirm;
    setProcessingId(id);
    try {
      await api.post(`/api/universities/${action}/${id}`);
      toast.success(`"${name}" has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setConfirm({ open: false, action: null, id: null, name: '' });
      fetchUniversities();
    } catch (err) {
      toast.error(`Action failed: ${err.response?.data?.error || 'Unknown error'}`);
      setConfirm({ open: false, action: null, id: null, name: '' });
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = universities.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'ALL' || u.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: universities.length,
    pending: universities.filter(u => u.status === 'PENDING').length,
    approved: universities.filter(u => u.status === 'APPROVED').length,
    rejected: universities.filter(u => u.status === 'REJECTED').length
  };

  if (loading && universities.length === 0) return (
    <div className="h-screen flex items-center justify-center bg-[#000000]">
      <div className="flex flex-col items-center gap-8">
        <Loader2 className="animate-spin text-cyan-400" size={48} />
        <p className="text-slate-800 font-black uppercase tracking-[0.5em] text-[10px]">
          Synchronizing Governance Network...
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-300 overflow-x-hidden selection:bg-cyan-500/30">

      <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
        <BlockchainBackground />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      <div className="container max-w-[1400px] mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">

        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-8">
            <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              Network <span className="text-cyan-400">Control.</span>
            </h1>
            <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4">
              <ShieldCheck size={14} className="text-cyan-400 animate-pulse" />
              Sovereign Administrator: {user?.name || 'Identity 0x01'}
            </p>
          </div>
          <button
            onClick={fetchUniversities}
            className="btn-command btn-blue px-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
          >
            <RefreshCcw size={18} className={`${loading ? 'animate-spin' : ''}`} />
            Sync Registry
          </button>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Total Nodes', val: stats.total, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
            { label: 'Pending Audit', val: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { label: 'Verified Issuers', val: stats.approved, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Restricted', val: stats.rejected, icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
          ].map((s, i) => (
            <motion.div
              key={i} {...viewTransition}
              transition={{ ...viewTransition.transition, delay: i * 0.05 }}
              className="glass-pane p-8 rounded-[2.5rem] flex flex-col items-center gap-6 group hover:border-cyan-400/20 transition-all shadow-2xl"
            >
              <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.border} border flex items-center justify-center shadow-inner`}>
                <s.icon className={s.color} size={24} />
              </div>
              <div className="text-center">
                <span className="text-5xl font-black text-white tracking-tighter block">{s.val}</span>
                <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] mt-3 block">{s.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABLE */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="space-y-6">

          {/* Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8">
            <div className="flex gap-2 p-2 bg-[#050505] rounded-[1.5rem] border border-white/5 shadow-inner">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-8 py-4 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all
                    ${filter === f ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-slate-800 hover:text-white hover:bg-[#080808]'}`}
                >
                  {f} {f === 'PENDING' && stats.pending > 0 && (
                    <span className="ml-2 bg-amber-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full">{stats.pending}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-[450px] group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within/search:text-cyan-400 transition-colors" size={20} />
              <input
                placeholder="SEARCH REGISTRY..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#050505] border border-white/10 rounded-[1.5rem] py-5 pl-16 pr-6 text-[10px] font-black tracking-[0.3em] text-white outline-none focus:border-cyan-400/40 transition-all placeholder:text-slate-900 uppercase shadow-inner"
              />
            </div>
          </div>

          {/* Table */}
          <div className="glass-pane !p-0 rounded-[2.5rem] overflow-hidden shadow-2xl scanline-overlay sm:border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-slate-700 bg-[#050505]/60">
                    <th className="px-12 py-8">Identity Node</th>
                    <th className="px-12 py-8">Trust State</th>
                    <th className="px-12 py-8">Protocol Description</th>
                    <th className="px-12 py-8">Sync Date</th>
                    <th className="px-12 py-8 text-right">Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-12 py-32 text-center">
                          <div className="flex flex-col items-center gap-6 opacity-40">
                            <Users size={48} className="text-slate-800" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-800">
                              No Identity Nodes Resolved
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.map((uni) => (
                      <motion.tr
                        key={uni._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="group hover:bg-cyan-400/[0.02] transition-colors"
                      >
                        {/* Institution */}
                        <td className="px-12 py-10">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border transition-all group-hover:scale-105 shadow-xl shadow-black
                              ${uni.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                uni.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {uni.name?.charAt(0)}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-4">
                                <p className="text-white font-black text-[11px] uppercase tracking-widest leading-none">{uni.name}</p>
                                {uni.isFlagged && (
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                    <AlertTriangle size={10} className="text-rose-400" />
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Flagged</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-slate-800 text-[9px] font-black uppercase tracking-widest">{uni.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-12 py-10">
                          <StatusBadge status={uni.status} />
                        </td>

                        {/* Description */}
                        <td className="px-12 py-10">
                          <div className="max-w-xs space-y-4">
                            <p className="text-slate-800 text-[10px] font-black uppercase tracking-widest leading-relaxed line-clamp-2">
                              {uni.description || 'No Manifest Data.'}
                            </p>
                            {uni.documents?.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                {uni.documents.map((doc, idx) => (
                                  <a key={idx} href={doc} target="_blank" rel="noreferrer"
                                    className="text-cyan-400 hover:text-white text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-2 border border-cyan-400/20 px-3 py-1 rounded-lg bg-cyan-400/5 transition-all"
                                  >
                                    <ExternalLink size={10} /> Manifest {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-12 py-10">
                          <span className="text-slate-800 text-[10px] font-black uppercase tracking-widest">
                            {uni.createdAt ? new Date(uni.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'PROTOCOL NULL'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-12 py-10 text-right">
                          {uni.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => requestAction(uni._id, 'approve', uni.name)}
                                disabled={processingId === uni._id}
                                className="btn-command btn-blue px-6 h-10 shadow-lg shadow-blue-500/10"
                              >
                                {processingId === uni._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Validate
                              </button>
                              <button
                                onClick={() => requestAction(uni._id, 'reject', uni.name)}
                                disabled={processingId === uni._id}
                                className="btn-command btn-outline px-6 h-10 border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                              >
                                <XCircle size={12} /> Restrain
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 px-4 py-2 rounded-xl bg-[#050505] border border-white/5 shadow-inner">
                              <div className={`w-1.5 h-1.5 rounded-full ${uni.status === 'APPROVED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-800">
                                {uni.status === 'APPROVED' ? 'Active Node' : 'Null Zone'}
                              </span>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* FOOTER */}
        <footer className="pt-16 text-center space-y-6">
          <div className="h-px w-24 bg-white/10 mx-auto" />
          <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.5em] max-w-xl mx-auto leading-loose opacity-40">
            All administrative actions are cryptographically logged and permanently auditable.
          </p>
          <div className="flex justify-center gap-12 grayscale opacity-10">
            <Globe size={16} /><Activity size={16} /><Globe size={16} />
          </div>
        </footer>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        action={confirm.action}
        universityName={confirm.name}
        onConfirm={executeAction}
        onCancel={() => setConfirm({ open: false, action: null, id: null, name: '' })}
        loading={processingId === confirm.id}
      />
    </div>
  );
}

export default function SystemAdmin() {
  return (
    <ToastProvider>
      <SystemAdminDashboard />
    </ToastProvider>
  );
}
