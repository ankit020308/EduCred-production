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

// 💠 UI ANIMATIONS
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
    <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-blue-600" size={48} />
    </div>
  );

  return (
    <div className="relative min-h-screen">
      
      <div className="space-y-12">
        
        {/* ── PROFILE HEADER ────────────────────────────────── */}
        <motion.div {...viewTransition} className="bg-white p-12 md:p-16 rounded-[3rem] border border-slate-100 group relative overflow-hidden shadow-2xl shadow-slate-900/[0.03]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-14 relative z-10">
            <div className="relative group/avatar">
              <div className="w-48 h-48 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner transition-all duration-700 group-hover/avatar:border-blue-500/30 relative overflow-hidden">
                <span className="text-8xl font-black text-slate-300 select-none group-hover:text-blue-600 transition-colors uppercase tabular-nums">
                    {profileData?.name?.charAt(0) || user?.name?.charAt(0) || 'U'}
                </span>
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm z-20">
                  <Edit3 className="text-blue-600" size={40} />
                </div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-6">
              <h2 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                {profileData?.name || 'Account Identity'}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-sm">
                  <ShieldCheck size={14} className="text-blue-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">
                    {user?.role === 'university' ? 'Institution Lead' : 'Verified Member'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                   <Fingerprint size={12} className="text-slate-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60">
                       ID: {profileData?.profileId?.slice(-12).toUpperCase() || 'REGISTERED'}
                   </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="btn-primary px-12 h-16 !shadow-blue-500/20"
            >
              {isEditing ? <><Save size={18} /> Save Profile</> : <><Edit3 size={18} /> Update Profile</>}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* ── ACCOUNT DETAILS ────────────────────────────────── */}
          <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.1 }} className="lg:col-span-12 bg-white p-12 md:p-16 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-900/[0.03] space-y-14">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-5 leading-none">
              <User size={24} className="text-blue-600" /> Essential Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
               {[
                 { label: 'Full Official Name', value: profileData?.name, key: 'name', icon: User },
                 { label: 'Primary Email Address', value: profileData?.email, key: 'email', icon: Mail },
                 { label: 'Institutional Affiliation', value: profileData?.universityName || user?.universityName || 'Global Network', icon: Building2 },
                 { label: 'Registration Date', value: profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Verified', icon: Calendar }
               ].map((item, idx) => (
                 <div key={idx} className="space-y-4 group">
                   <div className="flex items-center gap-4 ml-1">
                      <item.icon size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" /> 
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</label>
                   </div>
                   {isEditing && item.key ? (
                     <input 
                      type="text" 
                      value={item.value} 
                      onChange={(e) => setProfileData({...profileData, [item.key]: e.target.value})}
                      className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-8 text-slate-900 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm uppercase tracking-widest"
                     />
                   ) : (
                     <div className="bg-slate-50 border border-slate-100 px-8 py-5 rounded-2xl text-slate-600 font-bold text-sm shadow-sm uppercase tracking-widest italic opacity-80">
                       {item.value || 'Not provided'}
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </motion.div>

          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10">
              
            {/* ── SECURITY SETTINGS ─────────────────────────────── */}
            <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.2 }} className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-900/[0.03] space-y-12 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 blur-[50px] pointer-events-none" />
              
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 leading-none">
                <ShieldCheck size={24} className="text-blue-600" /> Security Hub
              </h3>

              <div className="space-y-6">
                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group/item hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm transition-all group-hover/item:scale-110">
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-black text-[12px] uppercase tracking-widest leading-none">Two-Factor Auth</p>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-60 italic">Enhanced Security</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-blue-100 rounded-full relative cursor-pointer group-hover/item:bg-blue-600 transition-all">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                  </div>
                </div>

                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between group/item hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm transition-all group-hover/item:scale-110">
                      <Key size={24} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-black text-[12px] uppercase tracking-widest leading-none">Passcode</p>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-60 italic">Modified recently</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors tracking-widest underline underline-offset-4 decoration-blue-500/30">
                    Modify Settings
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── PRIVACY NOTICE ───────────────────────────── */}
            <motion.div {...viewTransition} transition={{ ...viewTransition.transition, delay: 0.3 }} className="p-12 bg-blue-500/5 border border-blue-500/10 rounded-[3rem] flex flex-col justify-between gap-10 shadow-xl shadow-blue-900/[0.02] relative overflow-hidden">
               <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 blur-[80px] pointer-events-none" />

               <div className="flex items-center gap-3 px-6 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
                 <ShieldCheck className="text-blue-600" size={14} />
                 <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Privacy Framework Active</span>
               </div>

               <div className="space-y-6 relative z-10">
                 <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Your Data Privacy.</h4>
                 <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest leading-loose opacity-70 italic">
                   All personal information is cryptographically shielded. 
                   Only your authorized verified records are accessible to institutions with your explicit consent.
                 </p>
                 <button className="text-[11px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-3 hover:gap-5 transition-all">
                    View Data Policies <ArrowRight size={16} />
                 </button>
               </div>
            </motion.div>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {msg && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-12 right-12 px-10 py-6 rounded-2xl shadow-2xl border flex items-center gap-5 z-[100] backdrop-blur-xl ${
              msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={24} /> : <X size={24} />}
            <span className="text-[11px] font-black uppercase tracking-widest">{msg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
