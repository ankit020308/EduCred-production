import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Loader2,
  RefreshCcw,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import InsightCard from '../components/InsightCard';

export default function SystemAdmin() {
  const { user } = useAuth();
  
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/universities/all');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await api.post(`/api/universities/${action}/${id}`);
      // Refresh the list
      fetchUniversities();
    } catch (err) {
      alert(`Action failed: ${err.response?.data?.error || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = universities.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="h-screen flex items-center justify-center bg-[#050816]">
       <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Oracle Data...</p>
       </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 lg:p-20 relative z-10 pt-32 h-full min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
        
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
                Identity <span className="text-blue-500">Controller</span>
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-3">
                <ShieldCheck size={14} className="text-blue-500" /> Administrative Authority: {user?.name || 'System Root'}
              </p>
          </div>
          <Button onClick={fetchUniversities} className="h-14 px-8 rounded-2xl flex items-center gap-3 glass-button overflow-hidden group">
              <RefreshCcw size={20} className={`${loading ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform`} />
              <span className="font-black uppercase text-xs tracking-widest">Refresh Registry</span>
          </Button>
        </div>

        {/* ── Stats Intelligence ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <InsightCard 
            title="Total Nodes" 
            value={stats.total} 
            trend="Consolidated entities" 
            icon={Users} 
            color="blue"
          />
          <InsightCard 
            title="Awaiting Trust" 
            value={stats.pending} 
            trend="Pending verification" 
            icon={Clock} 
            color="amber"
          />
          <InsightCard 
            title="Authorized Issuers" 
            value={stats.approved} 
            trend="Mined on mainnet" 
            icon={CheckCircle2} 
            color="emerald"
          />
          <InsightCard 
            title="Blocked Nodes" 
            value={stats.rejected} 
            trend="Deny listed" 
            icon={ShieldAlert} 
            color="rose"
          />
        </div>

        {/* ── Filter Control ─────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 shadow-2xl">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                  ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search Public Keys..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 pl-16 pr-6 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
        </div>

        {/* ── Registry Table ────────────────────────────── */}
        <Card className="!p-0 border-white/10 overflow-hidden shadow-2xl relative !bg-[#0b0f2a]/40 backdrop-blur-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Institution Identity</th>
                  <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Auth Status</th>
                  <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Registration Date</th>
                  <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Execute Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-10 py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No records found in this vector</td>
                    </tr>
                  ) : filtered.map((uni) => (
                    <motion.tr 
                      key={uni._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group hover:bg-white/[0.03] transition-all"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black border border-white/10 shadow-lg capitalize
                            ${uni.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 
                              uni.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {uni.name.charAt(0)}
                          </div>
                          <div>
                              <p className="text-white font-black text-sm uppercase italic tracking-tight">{uni.name}</p>
                              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-2">
                                {uni.email}
                                {!uni.email.endsWith('.edu') && !uni.email.endsWith('.ac.in') && (
                                  <span className="text-rose-500 flex items-center gap-1 font-black underline italic">
                                    <ShieldAlert size={10} /> External Domain
                                  </span>
                                )}
                              </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-xl
                          ${uni.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                            uni.status === 'REJECTED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                          {uni.status === 'PENDING' && <Clock size={12} />}
                          {uni.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {uni.status === 'REJECTED' && <XCircle size={12} />}
                          {uni.status}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                         <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest opacity-50">{new Date(uni.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-10 py-8">
                         <div className="flex items-center gap-3">
                            {uni.status === 'PENDING' ? (
                              <>
                                <button 
                                  onClick={() => handleAction(uni._id, 'approve')}
                                  disabled={processingId === uni._id}
                                  className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg overflow-hidden disabled:opacity-50"
                                >
                                  {processingId === uni._id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                </button>
                                <button 
                                  onClick={() => handleAction(uni._id, 'reject')}
                                  disabled={processingId === uni._id}
                                  className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg overflow-hidden disabled:opacity-50"
                                >
                                  {processingId === uni._id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-700 text-[9px] font-black uppercase tracking-widest italic">Immutable Action Recorded</span>
                            )}
                         </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
