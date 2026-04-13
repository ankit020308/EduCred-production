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
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-[#0A0A0A] border border-white/[0.08] rounded-[1.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${isApprove ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {isApprove ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">
                {isApprove ? 'Approve Institution?' : 'Reject Institution?'}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {isApprove
                  ? `"${universityName}" will be granted certificate issuance rights on the EduCred network.`
                  : `"${universityName}" will be denied access. This can be reversed later.`}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50
                  ${isApprove ? 'bg-white text-black hover:bg-slate-200' : 'bg-rose-600 text-white hover:bg-rose-500'}`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (isApprove ? 'Approve' : 'Reject')}
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
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-600 font-bold uppercase tracking-[0.5em] text-[10px]">
          Loading Governance Registry...
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">

      <BlockchainBackground />

      <div className="absolute inset-x-0 top-0 h-[600px] z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-indigo-600/5 blur-[200px] rounded-full" />
      </div>

      <div className="container max-w-[1400px] mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">

        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-none">
              Governance <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent glow-blue">Node.</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
              <ShieldCheck size={14} className="text-blue-400" />
              Root Authority: {user?.name || 'System Administrator'}
            </p>
          </div>
          <button
            onClick={fetchUniversities}
            className="h-14 px-8 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md flex items-center gap-4 text-white hover:bg-white/[0.08] transition-all group"
          >
            <RefreshCcw size={20} className={`${loading ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform duration-500`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sync Registry</span>
          </button>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Institutions', val: stats.total, icon: Users, color: 'text-blue-400' },
            { label: 'Awaiting Review', val: stats.pending, icon: Clock, color: 'text-amber-400' },
            { label: 'Approved Issuers', val: stats.approved, icon: CheckCircle2, color: 'text-blue-400' },
            { label: 'Rejected', val: stats.rejected, icon: ShieldAlert, color: 'text-rose-400' }
          ].map((s, i) => (
            <motion.div
              key={i} {...viewTransition}
              transition={{ ...viewTransition.transition, delay: i * 0.05 }}
              className="glass-pane p-8 border border-white/5 text-center flex flex-col items-center gap-4"
            >
              <s.icon className={s.color} size={24} />
              <span className="text-4xl font-bold text-white tracking-tighter">{s.val}</span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* TABLE */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="space-y-6">

          {/* Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/5">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                    ${filter === f ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}
                >
                  {f} {f === 'PENDING' && stats.pending > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full">{stats.pending}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-96 group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/search:text-blue-500 transition-colors" size={18} />
              <input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-700"
              />
            </div>
          </div>

          {/* Table */}
          <div className="glass-card !p-0 border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600 bg-white/[0.01]">
                    <th className="px-10 py-7">Institution</th>
                    <th className="px-10 py-7">Status</th>
                    <th className="px-10 py-7">Description</th>
                    <th className="px-10 py-7">Registered</th>
                    <th className="px-10 py-7 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-10 py-24 text-center">
                          <div className="flex flex-col items-center gap-4 text-slate-700">
                            <Users size={32} className="opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em]">
                              No institutions found
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.map((uni) => (
                      <motion.tr
                        key={uni._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Institution */}
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold border transition-transform group-hover:scale-105
                              ${uni.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                uni.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {uni.name?.charAt(0)}
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <p className="text-white font-bold text-sm tracking-tight">{uni.name}</p>
                                {uni.isFlagged && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                                    <AlertTriangle size={10} className="text-rose-400" />
                                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Flagged</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-slate-600 text-[10px] font-medium">{uni.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-10 py-8">
                          <StatusBadge status={uni.status} />
                        </td>

                        {/* Description */}
                        <td className="px-10 py-8">
                          <div className="max-w-xs space-y-3">
                            <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                              {uni.description || 'No description provided.'}
                            </p>
                            {uni.documents?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {uni.documents.map((doc, idx) => (
                                  <a key={idx} href={doc} target="_blank" rel="noreferrer"
                                    className="text-indigo-400 hover:text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 border-b border-indigo-400/30 transition-colors"
                                  >
                                    <ExternalLink size={9} /> Doc {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-10 py-8">
                          <span className="text-slate-600 text-[10px]">
                            {uni.createdAt ? new Date(uni.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-10 py-8 text-right">
                          {uni.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => requestAction(uni._id, 'approve', uni.name)}
                                disabled={processingId === uni._id}
                                className="px-5 py-2.5 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                {processingId === uni._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Approve
                              </button>
                              <button
                                onClick={() => requestAction(uni._id, 'reject', uni.name)}
                                disabled={processingId === uni._id}
                                className="px-5 py-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600/40 transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-700">
                              {uni.status === 'APPROVED' ? 'Active Issuer' : 'Closed'}
                            </span>
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
