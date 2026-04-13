import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X,
  Fingerprint,
  Building2,
  Calendar,
  ShieldAlert,
  Key,
  Smartphone,
  ArrowRight,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BlockchainBackground from '../components/BlockchainBackground';

// 💠 ANIMATION CONSTANTS (ZERO-G SPEC)
const viewTransition = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/user/profile');
      setProfileData(res.data);
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to load profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await api.put('/api/user/profile', profileData);
      setProfileData(res.data);
      // Keep AuthContext in sync so Navbar reflects updated name
      updateUser({ ...user, name: res.data.name });
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
      setIsEditing(false);
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.error || 'Update failed. Try again.' });
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#010409]">
      <Loader2 className="animate-spin text-indigo-500" size={48} />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#010409] text-slate-300 overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* 🌌 INTERACTIVE BACKGROUND */}
      <BlockchainBackground />

      {/* AMBIENT GLOW */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[160px] rounded-full animate-pulse" />
      </div>

      <div className="container max-w-6xl mx-auto px-6 pt-32 pb-24 relative z-10 space-y-12">
        
        {/* ── PROFILE HEADER ────────────────────────────────── */}
        <motion.div {...viewTransition} className="glass-card p-10 md:p-14 border border-white/10 group overflow-hidden">
          {/* Subtle Orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 blur-[100px] pointer-events-none group-hover:bg-indigo-600/10 transition-all duration-1000" />
          
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="relative group/avatar">
              <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl transition-all duration-700 group-hover/avatar:scale-[1.02] border border-white/10">
                <span className="text-6xl font-bold text-white select-none">{profileData?.name?.charAt(0)}</span>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-[2.5rem] backdrop-blur-sm">
                  <Edit3 className="text-white" size={32} />
                </div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tighter italic uppercase leading-none">
                {profileData?.name}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <ShieldCheck size={14} className="text-indigo-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {user?.role === 'university' ? 'Institutional Authority' : 'Verified Identity'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5">
                   <Fingerprint size={12} className="text-slate-600" />
                   <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Node ID: {profileData?.profileId?.slice(-8) || 'GLOBAL'}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl hover:bg-slate-200"
            >
              {isEditing ? <><Save size={16} /> Sync Changes</> : <><Edit3 size={16} /> Modify Profile</>}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* ── IDENTITY MATRIX ───────────────────────────────── */}
          <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="lg:col-span-7 glass-card p-10 md:p-12 border border-white/5 space-y-12">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-4">
              <User size={20} className="text-indigo-400" /> Identity Matrix
            </h3>
            
            <div className="grid grid-cols-1 gap-10">
               {[
                 { label: 'FULL LEGAL NAME', value: profileData?.name, key: 'name', icon: User },
                 { label: 'NETWORK EMAIL', value: profileData?.email, key: 'email', icon: Mail },
                 { label: 'PRIMARY AUTHORITY', value: profileData?.universityName || user?.universityName || 'EDUCRED GLOBAL NETWORK', icon: Building2 },
                 { label: 'AUTHENTICATION DATE', value: profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : '\u2014', icon: Calendar }
               ].map((item, idx) => (
                 <div key={idx} className="space-y-4">
                   <div className="flex items-center gap-3 ml-1">
                      <item.icon size={12} className="text-indigo-500/40" /> 
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">{item.label}</label>
                   </div>
                   {isEditing && item.key ? (
                     <input 
                      type="text" 
                      value={item.value} 
                      onChange={(e) => setProfileData({...profileData, [item.key]: e.target.value.toUpperCase()})}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-6 text-white text-[11px] font-bold tracking-widest outline-none focus:border-indigo-500/50 transition-all"
                     />
                   ) : (
                     <div className="bg-white/[0.01] border border-white/5 px-6 py-4 rounded-2xl text-white font-bold text-[11px] tracking-widest uppercase italic bg-gradient-to-r from-white/[0.02] to-transparent">
                       {item.value || 'UNRESOLVED'}
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </motion.div>

          <div className="lg:col-span-5 space-y-10">
              
            {/* ── PROTOCOL SECURITY ─────────────────────────────── */}
            <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="glass-card p-10 border border-white/5 space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 blur-[50px] pointer-events-none group-hover:bg-blue-500/10 transition-all duration-1000" />
              
              <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-4">
                <Smartphone size={20} className="text-blue-500" /> Protocol Security
              </h3>

              <div className="space-y-6">
                <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-between group/item">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-white/5">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-[11px] uppercase tracking-widest">Multi-Factor</p>
                      <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest mt-0.5">Extra Layer Active</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-blue-500/20 rounded-full relative cursor-pointer group-hover/item:bg-blue-500/30 transition-all">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-lg" />
                  </div>
                </div>

                <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-between group/item">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5">
                      <Key size={20} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-[11px] uppercase tracking-widest">Node Keys</p>
                      <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest mt-0.5">Manage Node Access</p>
                    </div>
                  </div>
                  <button className="text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-400 transition-colors tracking-[0.2em] italic">
                    Configure
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── SOVEREIGNTY ADVISORY ───────────────────────────── */}
            <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.3 }} className="p-10 bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] flex items-start gap-8 shadow-xl animate-levitate">
               <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-500/10 shadow-inner">
                  <ShieldCheck className="text-indigo-400" size={28} />
               </div>
               <div className="space-y-5">
                 <div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em]">Data Sovereignty</h4>
                    <p className="text-slate-500 text-[10px] mt-2 font-medium leading-relaxed italic">Your identity is hashed and anchored to the EduCred ledger. You maintain absolute sovereignty over your institutional mapping matrix.</p>
                 </div>
                 <button className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.3em] flex items-center gap-2 hover:gap-4 transition-all">
                    Audit Manifest <ArrowRight size={14} />
                 </button>
               </div>
            </motion.div>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {msg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-12 right-12 px-8 py-5 rounded-[2rem] shadow-3xl border flex items-center gap-4 z-[100] backdrop-blur-xl ${
              msg.type === 'success' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={24} /> : <X size={24} />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{msg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
