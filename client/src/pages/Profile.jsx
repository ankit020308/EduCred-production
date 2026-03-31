import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Settings, 
  Bell, 
  Lock, 
  FileText, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X,
  Fingerprint,
  Building2,
  Calendar,
  ShieldAlert,
  GraduationCap,
  Key,
  Smartphone
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/profile');
      setProfileData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put('/api/profile', profileData);
      setMsg({ type: 'success', text: 'Identity manifest updated on-chain.' });
      setIsEditing(false);
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Update failed. Check node connectivity.' });
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#050816]">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#050816] p-6 lg:p-12">
      
      {/* ── Profile Header & ID ──────────────────────────────── */}
      <div className="relative bg-[#0b0f2a] border border-white/5 rounded-3xl p-10 overflow-hidden group max-width-container">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[100px] pointer-events-none group-hover:bg-blue-600/10 transition-all" />
        
        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="relative group">
            <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-[1.02]">
              <span className="text-6xl font-black text-white select-none">{profileData?.name?.charAt(0)}</span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Edit3 className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-5xl font-black text-white uppercase mb-4 leading-none tracking-tighter">
              {profileData?.name}
            </h2>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-8 flex items-center justify-center md:justify-start gap-2">
              <ShieldCheck size={14} className="text-blue-500" />
              {user?.role === 'university' ? 'Institutional Administrator' : 'Verified Student Identity'}
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-white/5 border border-white/05 px-4 py-2 rounded-xl flex items-center gap-3">
                <Fingerprint size={16} className="text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  ID: <span className="text-white ml-2">{profileData?.profileId || 'N/A'}</span>
                </span>
              </div>
              <div className={`bg-white/5 border border-white/05 px-4 py-2 rounded-xl flex items-center gap-3 ${profileData?.isEmailVerified ? 'text-emerald-500' : 'text-rose-500'}`}>
                {profileData?.isEmailVerified ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {profileData?.isEmailVerified ? 'Email Secured' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl border-t border-white/10"
          >
            {isEditing ? <><Save size={16} /> Save Identity</> : <><Edit3 size={16} /> Edit Profile</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 max-width-container">
        
        {/* ── Identity Details ────────────────────────────────── */}
        <div className="bg-[#0b0f2a] border border-white/5 rounded-3xl p-10 group shadow-2xl">
          <h3 className="text-xl font-black text-white uppercase mb-12 tracking-tight flex items-center gap-4">
            <User size={24} className="text-blue-400" /> Identity Info
          </h3>
          
          <div className="space-y-8">
             {[
               { label: 'Full Legal Name', value: profileData?.name, key: 'name', icon: User },
               { label: 'Institutional Email', value: profileData?.email, key: 'email', icon: Mail },
               { label: 'Primary Node', value: user?.universityName || 'Global Node 01', icon: Building2 },
               { label: 'Account Created', value: new Date(user?.createdAt).toLocaleDateString(), icon: Calendar }
             ].map((item, idx) => (
               <div key={idx} className="space-y-3">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <item.icon size={12} className="text-blue-500/50" /> {item.label}
                 </label>
                 {isEditing && item.key ? (
                   <input 
                    type="text" 
                    value={item.value} 
                    onChange={(e) => setProfileData({...profileData, [item.key]: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-6 text-white text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
                   />
                 ) : (
                   <div className="bg-white/5 border border-white/05 px-6 py-3.5 rounded-2xl text-white font-bold text-sm">
                     {item.value || 'N/A'}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-12">
            
          {/* ── Secure Verification ─────────────────────────────── */}
          <div className="bg-[#0b0f2a] border border-white/5 rounded-3xl p-10 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 blur-[60px] pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
            
            <h3 className="text-xl font-black text-white uppercase mb-12 tracking-tight flex items-center gap-4">
              <Smartphone size={24} className="text-emerald-500" /> Verification
            </h3>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm uppercase tracking-tight">Two-Factor Auth</p>
                    <p className="text-slate-500 text-xs font-medium">Extra layer of protocol security</p>
                  </div>
                </div>
                <div className="w-12 h-6 bg-emerald-500/50 rounded-full relative cursor-pointer shadow-inner">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-lg" />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                    <Key size={20} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm uppercase tracking-tight">Access Control</p>
                    <p className="text-slate-500 text-xs font-medium">Manage institutional permissions</p>
                  </div>
                </div>
                <button className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors tracking-widest">
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* ── Security Advisory ─────────────────────────────── */}
          <div className="bg-blue-600/5 border border-blue-500/20 rounded-3xl p-10 flex items-start gap-6 shadow-xl">
             <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                <ShieldCheck className="text-blue-500" size={28} />
             </div>
             <div className="space-y-4">
               <div>
                  <h4 className="text-white font-black uppercase tracking-tight">Trust & Sovereignty</h4>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">Your data is hashed and anchored to the EduCred ledger. You maintain absolute sovereignty over your institutional identity matrix.</p>
               </div>
               <button className="text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                  Audit History <ArrowRight size={14} />
               </button>
             </div>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {msg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-12 right-12 px-8 py-5 rounded-3xl shadow-2xl border flex items-center gap-4 z-[100] ${
              msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={24} /> : <X size={24} />}
            <span className="text-sm font-black uppercase tracking-widest">{msg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
