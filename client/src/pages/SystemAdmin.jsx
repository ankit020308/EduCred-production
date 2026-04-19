import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, CheckCircle2, XCircle, Clock,
  Search, Loader2, RefreshCcw, ExternalLink, ShieldAlert,
  Activity, Globe, AlertTriangle, Shield, Check, X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { ToastProvider, useToast } from '../components/Toast';
import socket from '../services/socket.mjs';

const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

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
        fetchUniversities();
        toast.info(`New institution application: ${data.name}`);
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
      toast.error('Failed to fetch institutional records.');
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
      toast.success(`${name} has been ${action === 'approve' ? 'approved' : 'rejected'}.`);
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
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="flex flex-col items-center gap-12">
        <Loader2 className="animate-spin text-[#60A5FA]" size={64} />
        <p className="text-[#4B5563] font-black uppercase tracking-[0.3em] text-[12px] italic opacity-60">
          Updating System Accounts...
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#F9FAFB]">
      
      <div className="relative z-10 space-y-16 p-8 md:p-16 max-w-[1600px] mx-auto">

        {/* HEADER */}
        <motion.div {...viewTransition} className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-[#E5E7EB] pb-12">
          <div className="space-y-8">
            <div className="flex items-center gap-4 px-6 py-2 bg-blue-500/5 border border-blue-500/10 rounded-full w-fit">
              <ShieldCheck size={16} className="text-[#60A5FA]" />
              <span className="text-[10px] font-black text-[#60A5FA] uppercase tracking-[0.2em]">Platform Administrator</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-[#2C2F33] tracking-tighter leading-none uppercase">
              Issuer <span className="opacity-30 italic">Accounts.</span>
            </h1>
            <p className="text-[#4B5563] text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-6 italic opacity-80">
              <Activity size={18} className="text-[#60A5FA]" /> Session: {user?.name || 'Authorized Admin'}
            </p>
          </div>
          <button
            onClick={fetchUniversities}
            className="flex items-center justify-center gap-4 h-16 px-12 rounded-2xl bg-white border border-[#E5E7EB] text-[11px] font-black uppercase tracking-[0.2em] text-[#2C2F33] hover:bg-slate-50 transition-all shadow-sm group"
          >
            <RefreshCcw size={20} className={`${loading ? 'animate-spin text-[#60A5FA]' : 'text-[#4B5563]'}`} />
            Refresh Records
          </button>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            { label: 'Total Portals', val: stats.total, icon: Users, color: 'text-[#2C2F33]', bg: 'bg-[#F3F4F6]', border: 'border-[#E5E7EB]' },
            { label: 'Pending Review', val: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Verified Portals', val: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Inactive Accounts', val: stats.rejected, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
          ].map((s, i) => (
            <motion.div
              key={i} {...viewTransition}
              transition={{ ...viewTransition.transition, delay: i * 0.05 }}
              className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] shadow-2xl flex flex-col items-center gap-10 group hover:border-[#60A5FA]/30 transition-all"
            >
              <div className={`w-16 h-16 rounded-[1.5rem] ${s.bg} ${s.border} border flex items-center justify-center`}>
                <s.icon className={`${s.color}`} size={28} />
              </div>
              <div className="text-center space-y-4">
                <span className="text-7xl font-black text-[#111827] tracking-tighter block leading-none tabular-nums">{s.val}</span>
                <span className="text-[11px] font-black text-[#4B5563] uppercase tracking-[0.2em]">{s.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABLE SECTION */}
        <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="space-y-12">

          {/* Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-12">
            <div className="flex flex-wrap gap-3 p-3 bg-[#F3F4F6] rounded-[2rem] border border-[#E5E7EB] shadow-inner">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-10 py-5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all
                    ${filter === f ? 'bg-[#2C2F33] text-white shadow-xl shadow-slate-900/10' : 'text-[#4B5563] hover:text-[#2C2F33] hover:bg-white'}`}
                >
                  {f === 'REJECTED' ? 'DEACTIVATED' : f} {f === 'PENDING' && stats.pending > 0 && (
                    <span className="ml-4 bg-amber-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg tabular-nums shadow-lg shadow-amber-500/10">{stats.pending}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-[550px] group">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-[#D1D5DB] group-focus-within:text-[#60A5FA] transition-colors" size={24} />
              <input
                placeholder="SEARCH PORTALS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-18 bg-white border border-[#E5E7EB] rounded-[2.5rem] pl-20 pr-10 text-[12px] font-bold text-[#111827] outline-none focus:border-[#60A5FA] transition-all shadow-xl uppercase tracking-[0.1em] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>

          {/* TABLE MAIN */}
          <div className="bg-white rounded-[3rem] border border-[#E5E7EB] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[11px] font-black uppercase tracking-[0.3em] text-[#4B5563]">
                    <th className="px-14 py-10 border-b border-[#E5E7EB]">Institution Portal</th>
                    <th className="px-14 py-10 border-b border-[#E5E7EB]">Verification Status</th>
                    <th className="px-14 py-10 border-b border-[#E5E7EB]">Account Details</th>
                    <th className="px-14 py-10 border-b border-[#E5E7EB]">Created At</th>
                    <th className="px-14 py-10 border-b border-[#E5E7EB] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  <AnimatePresence mode="popLayout">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-14 py-40 text-center">
                          <div className="flex flex-col items-center gap-10 opacity-30">
                            <div className="w-28 h-28 bg-[#F3F4F6] rounded-[3rem] flex items-center justify-center border border-[#E5E7EB] shadow-inner">
                              <Users size={56} className="text-[#9CA3AF]" />
                            </div>
                            <p className="text-[14px] font-black uppercase tracking-[0.3em] text-[#9CA3AF] italic">
                              No accounts found
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.map((uni) => (
                      <motion.tr
                        key={uni.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="group hover:bg-[#F9FAFB] transition-all"
                      >
                        <td className="px-14 py-12">
                          <div className="flex items-center gap-8">
                            <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center text-3xl font-black border transition-all text-white shadow-xl
                              ${uni.status === 'APPROVED' ? 'bg-emerald-500 border-emerald-600 shadow-emerald-500/10' :
                                uni.status === 'REJECTED' ? 'bg-rose-500 border-rose-600 shadow-rose-500/10' :
                                  'bg-amber-500 border-amber-600 shadow-amber-500/10'}`}>
                              {uni.name?.charAt(0)}
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-5">
                                <p className="text-[#111827] font-black text-[15px] uppercase tracking-wider leading-none">{uni.name}</p>
                                {uni.isFlagged && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-100">
                                    <AlertTriangle size={12} className="text-rose-500" />
                                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Flagged</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[#4B5563] text-[11px] font-black uppercase tracking-[0.1em] opacity-60 italic">{uni.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-14 py-12">
                          <StatusBadge status={uni.status} />
                        </td>

                        <td className="px-14 py-12">
                          <div className="max-w-[350px] space-y-6">
                            <p className="text-[#4B5563] text-[12px] font-bold uppercase tracking-wider leading-relaxed line-clamp-2 opacity-70">
                              {uni.description || 'Institutional profile data pending.'}
                            </p>
                            {uni.documents?.length > 0 && (
                              <div className="flex flex-wrap gap-4">
                                {uni.documents.map((doc, idx) => (
                                  <a key={idx} href={doc} target="_blank" rel="noreferrer"
                                    className="h-11 text-[#60A5FA] hover:bg-[#2C2F33] hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-4 border border-[#E5E7EB] px-6 rounded-xl bg-white transition-all shadow-sm"
                                  >
                                    <ExternalLink size={14} /> Doc {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-14 py-12">
                          <span className="text-[#4B5563] text-[11px] font-black uppercase tracking-[0.2em] italic opacity-60">
                            {uni.createdAt ? new Date(uni.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </span>
                        </td>

                        <td className="px-12 py-10 text-right">
                          {uni.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => requestAction(uni.id, 'approve', uni.name)}
                                disabled={processingId === uni.id}
                                className="h-12 px-8 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-blue-500/10 flex items-center gap-2"
                              >
                                {processingId === uni.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={16} />}
                                Approve
                              </button>
                              <button
                                onClick={() => requestAction(uni.id, 'reject', uni.name)}
                                disabled={processingId === uni.id}
                                className="h-12 px-8 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                              >
                                <X size={16} /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-4 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner w-fit ml-auto">
                              <div className={`w-2 h-2 rounded-full ${uni.status === 'APPROVED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {uni.status === 'APPROVED' ? 'Account Authorized' : 'Account Denied'}
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
        <footer className="pt-32 text-center space-y-10">
          <div className="h-px w-24 bg-[#E5E7EB] mx-auto" />
          <p className="text-[#4B5563] text-[11px] font-black uppercase tracking-[0.3em] max-w-3xl mx-auto leading-loose opacity-60 italic">
            Authorized administrative workspace. All registry modifications are cryptographically signed and archived.
          </p>
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
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="relative bg-white rounded-[3rem] p-16 max-w-md w-full shadow-2xl space-y-10 border border-slate-100"
             >
               <div className={`w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center border shadow-xl ${confirm.action === 'approve' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                 {confirm.action === 'approve' ? <ShieldCheck size={44} /> : <ShieldAlert size={44} />}
               </div>
               <div className="text-center space-y-4">
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                   {confirm.action === 'approve' ? 'Approve Access?' : 'Reject Access?'}
                 </h3>
                 <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest leading-relaxed max-w-xs mx-auto italic opacity-80">
                   {confirm.action === 'approve'
                     ? `Grant full certificate issuance authority to "${confirm.name}".`
                     : `Deny "${confirm.name}" access to the credential hub.`}
                 </p>
               </div>
               <div className="flex gap-4">
                 <button
                   onClick={() => setConfirm({ ...confirm, open: false })}
                   className="flex-1 h-14 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={executeAction}
                   disabled={processingId === confirm.id}
                   className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl font-sans ${confirm.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'}`}
                 >
                   {processingId === confirm.id ? <Loader2 size={18} className="animate-spin text-white/50" /> : (confirm.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject')}
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
