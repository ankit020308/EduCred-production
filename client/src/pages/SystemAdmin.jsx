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
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* 🌌 BACKGROUND GRADIENT */}
      <div className="fixed inset-0 bg-[#0B132B] pointer-events-none z-0" />
      <div className="fixed inset-0 hero-gradient pointer-events-none" />

      <div className="container max-w-[1400px] mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">

        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              Platform <span className="text-blue-500">Admin.</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4">
              <ShieldCheck size={14} className="text-blue-500" />
              Administrator Access: {user?.name || 'Authorized User'}
            </p>
          </div>
          <button
            onClick={fetchUniversities}
            className="btn-primary px-10 !shadow-blue-500/20"
          >
            <RefreshCcw size={18} className={`${loading ? 'animate-spin' : ''}`} />
            Refresh Records
          </button>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Total Institutions', val: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Review Required', val: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Verified Issuers', val: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Deactivated', val: stats.rejected, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
          ].map((s, i) => (
            <motion.div
              key={i} {...viewTransition}
              transition={{ ...viewTransition.transition, delay: i * 0.05 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/10 flex flex-col items-center gap-6 group hover:border-blue-500/30 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.border} border flex items-center justify-center shadow-sm`}>
                <s.icon className={s.color} size={24} />
              </div>
              <div className="text-center">
                <span className="text-5xl font-black text-slate-900 tracking-tighter block">{s.val}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 block">{s.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABLE SECTION */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="space-y-6">

          {/* Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8">
            <div className="flex gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/5">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                    ${filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  {f === 'REJECTED' ? 'DEACTIVATED' : f} {f === 'PENDING' && stats.pending > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{stats.pending}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-[450px] group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                placeholder="Search institutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-16 pr-6 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all shadow-xl shadow-slate-900/5"
              />
            </div>
          </div>

          {/* TABLE MAIN */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-12 py-8">Institution</th>
                    <th className="px-12 py-8">Review Status</th>
                    <th className="px-12 py-8">Manifest & Documentation</th>
                    <th className="px-12 py-8">Registry Date</th>
                    <th className="px-12 py-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-12 py-32 text-center">
                          <div className="flex flex-col items-center gap-6 opacity-40">
                            <Users size={48} className="text-slate-200" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                              No records found
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.map((uni) => (
                      <motion.tr
                        key={uni._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="group hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-12 py-10">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border transition-all text-white
                              ${uni.status === 'APPROVED' ? 'bg-emerald-500 border-emerald-600 shadow-lg shadow-emerald-500/10' :
                                uni.status === 'REJECTED' ? 'bg-rose-500 border-rose-600 shadow-lg shadow-rose-500/10' :
                                  'bg-amber-500 border-amber-600 shadow-lg shadow-amber-500/10'}`}>
                              {uni.name?.charAt(0)}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-4">
                                <p className="text-slate-900 font-black text-[12px] uppercase tracking-widest leading-none">{uni.name}</p>
                                {uni.isFlagged && (
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-50 border border-rose-100">
                                    <AlertTriangle size={10} className="text-rose-500" />
                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Flagged</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{uni.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-12 py-10">
                          <StatusBadge status={uni.status} />
                        </td>

                        <td className="px-12 py-10">
                          <div className="max-w-xs space-y-4">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed line-clamp-2">
                              {uni.description || 'No description provided.'}
                            </p>
                            {uni.documents?.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                {uni.documents.map((doc, idx) => (
                                  <a key={idx} href={doc} target="_blank" rel="noreferrer"
                                    className="text-blue-600 hover:bg-blue-600 hover:text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-blue-100 px-3 py-1 rounded-lg bg-blue-50 transition-all shadow-sm"
                                  >
                                    <ExternalLink size={10} /> Document {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-12 py-10">
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            {uni.createdAt ? new Date(uni.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'N/A'}
                          </span>
                        </td>

                        <td className="px-12 py-10 text-right">
                          {uni.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => requestAction(uni._id, 'approve', uni.name)}
                                disabled={processingId === uni._id}
                                className="btn-primary h-11 px-6 !shadow-blue-500/10"
                              >
                                {processingId === uni._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                Approve
                              </button>
                              <button
                                onClick={() => requestAction(uni._id, 'reject', uni.name)}
                                disabled={processingId === uni._id}
                                className="h-11 px-6 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                              >
                                <XCircle size={16} /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 shadow-sm w-fit ml-auto">
                              <div className={`w-2 h-2 rounded-full ${uni.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {uni.status === 'APPROVED' ? 'Access Granted' : 'Access Denied'}
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
        <footer className="pt-24 text-center space-y-6">
          <div className="h-px w-16 bg-slate-200 mx-auto" />
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest max-w-xl mx-auto leading-loose opacity-60">
            Platform governance actions are recorded and verifiable. Institutional credentials are secured via EduCred Protocol.
          </p>
          <div className="flex justify-center gap-12 grayscale opacity-10 text-slate-400">
            <Globe size={16} /><Activity size={16} /><Globe size={16} />
          </div>
        </footer>
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirm.open && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setConfirm({ ...confirm, open: false })}
               className="absolute inset-0 bg-[#0B132B]/60 backdrop-blur-md"
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 10 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative bg-white rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl space-y-8 border border-slate-100"
             >
               <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center border shadow-xl ${confirm.action === 'approve' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                 {confirm.action === 'approve' ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
               </div>
               <div className="text-center space-y-4">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                   {confirm.action === 'approve' ? 'Approve Access?' : 'Reject Access?'}
                 </h3>
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                   {confirm.action === 'approve'
                     ? `This will grant "${confirm.name}" full certificate issuance authority.`
                     : `This will deny "${confirm.name}" access to the issuance registry.`}
                 </p>
               </div>
               <div className="flex gap-4">
                 <button
                   onClick={() => setConfirm({ ...confirm, open: false })}
                   className="flex-1 py-4 px-6 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={executeAction}
                   disabled={processingId === confirm.id}
                   className={`flex-1 py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg font-sans ${confirm.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'}`}
                 >
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

export default function SystemAdmin() {
  return (
    <ToastProvider>
      <SystemAdminDashboard />
    </ToastProvider>
  );
}
