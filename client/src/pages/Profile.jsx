import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, User, Mail, Phone, Building2, MapPin, BookOpen,
  Hash, Layers, Save, Edit3, ArrowLeft, Loader2, CheckCircle2,
  AlertCircle, Lock, Globe, FileText, Calendar,
  Camera, Wallet, UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function Field({ label, icon: Icon, value, editKey, isEditing, onChange, placeholder, type = 'text', readOnly = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest flex items-center gap-1.5">
        <Icon size={10} /> {label}
      </label>
      {isEditing && !readOnly ? (
        <input
          type={type}
          value={value || ''}
          placeholder={placeholder}
          onChange={e => onChange(editKey, e.target.value)}
          className="ds-input"
        />
      ) : (
        <div className="ds-input bg-[#f6f6f6] text-[#646464] cursor-default select-all">
          {value || <span className="text-[#bbbbbb] italic">Not set</span>}
        </div>
      )}
    </div>
  );
}

function TextArea({ label, icon: Icon, value, editKey, isEditing, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest flex items-center gap-1.5">
        <Icon size={10} /> {label}
      </label>
      {isEditing ? (
        <textarea
          value={value || ''}
          placeholder={placeholder}
          onChange={e => onChange(editKey, e.target.value)}
          rows={3}
          className="ds-input resize-none"
        />
      ) : (
        <div className="ds-input bg-[#f6f6f6] text-[#646464] cursor-default min-h-[72px]">
          {value || <span className="text-[#bbbbbb] italic">Not set</span>}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const [roleProfile, setRoleProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [draft, setDraft] = useState({});
  const [roleDraft, setRoleDraft] = useState({});
  const [toast, setToast] = useState(null);

  const role = (user?.role || '').toLowerCase();
  const isUniversity = role === 'university';
  const isStudent = role === 'student';
  const isAdmin = role === 'admin' || role === 'super_admin';

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes] = await Promise.all([api.get('/api/user/profile')]);
        setUserProfile(profileRes.data);
        setDraft({
          name: profileRes.data.name || '',
          phoneNumber: profileRes.data.phoneNumber || '',
          bio: profileRes.data.bio || '',
        });

        if (isStudent) {
          try {
            const r = await api.get('/api/user/profile/student-details');
            setRoleProfile(r.data);
            setRoleDraft({ regNo: r.data.regNo || '', degree: r.data.degree || '', branch: r.data.branch || '' });
          } catch { /* no student record yet */ }
        } else if (isUniversity) {
          try {
            const r = await api.get('/api/user/profile/institution-details');
            setRoleProfile(r.data);
            setRoleDraft({ description: r.data.description || '', city: r.data.city || '' });
          } catch { /* no record yet */ }
        }
      } catch {
        showToast('error', 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isStudent, isUniversity]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const [userRes] = await Promise.all([
        api.put('/api/user/profile', draft),
        isStudent ? api.put('/api/user/profile/student-details', roleDraft) : null,
        isUniversity ? api.put('/api/user/profile/institution-details', roleDraft) : null,
      ].filter(Boolean));

      setUserProfile(userRes.data);
      setDraft({ name: userRes.data.name || '', phoneNumber: userRes.data.phoneNumber || '', bio: userRes.data.bio || '' });
      updateUser({ ...user, name: userRes.data.name });
      if (isStudent) {
        const r = await api.get('/api/user/profile/student-details');
        setRoleProfile(r.data);
        setRoleDraft({ regNo: r.data.regNo || '', degree: r.data.degree || '', branch: r.data.branch || '' });
      } else if (isUniversity) {
        const r = await api.get('/api/user/profile/institution-details');
        setRoleProfile(r.data);
        setRoleDraft({ description: r.data.description || '', city: r.data.city || '' });
      }
      setIsEditing(false);
      showToast('success', 'Profile saved.');
    } catch (err) {
      showToast('error', err?.response?.data?.error || 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, val) => setDraft(d => ({ ...d, [key]: val }));
  const setRoleField = (key, val) => setRoleDraft(d => ({ ...d, [key]: val }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post('/api/user/profile/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUserProfile(p => ({ ...p, profileImageUrl: res.data.profileImageUrl }));
      updateUser({ ...user, profileImageUrl: res.data.profileImageUrl });
      showToast('success', 'Photo updated.');
    } catch {
      showToast('error', 'Photo upload failed.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const cancelEdit = () => {
    setDraft({ name: userProfile?.name || '', phoneNumber: userProfile?.phoneNumber || '', bio: userProfile?.bio || '' });
    if (isStudent) setRoleDraft({ regNo: roleProfile?.regNo || '', degree: roleProfile?.degree || '', branch: roleProfile?.branch || '' });
    if (isUniversity) setRoleDraft({ description: roleProfile?.description || '', city: roleProfile?.city || '' });
    setIsEditing(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6]">
      <Loader2 className="animate-spin text-[#ea2804]" size={32} />
    </div>
  );

  const initials = (userProfile?.name || user?.name || 'U').charAt(0).toUpperCase();
  const dashboardPath = isUniversity ? '/university-node' : isAdmin ? '/sys-admin' : '/student-portal';
  const roleLabel = isUniversity ? 'INSTITUTION' : isAdmin ? 'ADMIN' : 'STUDENT';

  return (
    <div className="min-h-screen bg-[#f6f6f6] font-sans">

      {/* Fixed header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e0e0e0]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={dashboardPath} className="flex items-center gap-1.5 text-[#646464] hover:text-[#202020] transition-colors">
              <ArrowLeft size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Back</span>
            </Link>
            <span className="text-[#e0e0e0]">/</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#ea2804] rounded-full flex items-center justify-center">
                <ShieldCheck className="text-white" size={11} />
              </div>
              <span className="text-[11px] font-black text-[#202020] tracking-tight">EduCred</span>
            </div>
            <span className="text-[#e0e0e0]">/</span>
            <span className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Profile</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-[9px] font-black text-[#646464] uppercase tracking-widest">{userProfile?.name || user?.name}</span>
            <span className="px-2 py-0.5 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full text-[8px] font-black text-[#ea2804] uppercase tracking-widest">{roleLabel}</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="text-[9px] font-black text-[#646464] hover:text-[#ea2804] uppercase tracking-widest transition-colors ml-1">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Avatar + name hero */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#e0e0e0] rounded-3xl p-6 flex items-center gap-5">

          {/* Avatar uploader */}
          <div className="relative group shrink-0">
            <input
              id="photo-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={photoUploading}
            />
            <label htmlFor="photo-upload" className="block cursor-pointer">
              <AnimatePresence mode="wait">
                {photoUploading ? (
                  <motion.div key="uploading"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="w-16 h-16 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#ea2804]" size={20} />
                  </motion.div>
                ) : userProfile?.profileImageUrl ? (
                  <motion.img key="photo"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    src={userProfile.profileImageUrl}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#ea2804]/20" />
                ) : (
                  <motion.div key="placeholder"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="w-16 h-16 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 flex items-center justify-center">
                    <Camera size={20} className="text-[#ea2804]" />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute inset-0 rounded-full bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Camera size={13} className="text-white" />
              </div>
            </label>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-[#202020] tracking-tight truncate">
              {userProfile?.name || 'Your Profile'}
            </h1>
            <p className="text-[10px] font-bold text-[#646464] mt-0.5">{userProfile?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#ea2804]/10 border border-[#ea2804]/20 rounded-full text-[8px] font-black text-[#ea2804] uppercase tracking-widest">
                <UserCheck size={8} /> {roleLabel}
              </span>
              {userProfile?.isEmailVerified && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[8px] font-black text-emerald-700 uppercase tracking-widest">
                  <CheckCircle2 size={8} /> Verified
                </span>
              )}
              {userProfile?.profileId && (
                <span className="text-[8px] font-mono text-[#bbbbbb]">#{userProfile.profileId}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button onClick={cancelEdit}
                  className="px-4 py-2 rounded-xl border border-[#e0e0e0] text-[9px] font-black text-[#646464] uppercase tracking-widest hover:border-[#202020] transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary px-4 py-2 text-[9px]">
                  {saving ? <Loader2 className="animate-spin" size={13} /> : <><Save size={12} /> Save</>}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)}
                className="btn-primary px-4 py-2 text-[9px]">
                <Edit3 size={12} /> Edit Profile
              </button>
            )}
          </div>
        </motion.div>

        {/* Account details */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="bg-white border border-[#e0e0e0] rounded-3xl p-6 space-y-5">
          <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Account Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" icon={User} value={isEditing ? draft.name : userProfile?.name}
              editKey="name" isEditing={isEditing} onChange={setField} placeholder="Your full name" />
            <Field label="Email Address" icon={Mail} value={userProfile?.email}
              editKey="email" isEditing={isEditing} onChange={setField} readOnly />
            <Field label="Phone Number" icon={Phone} value={isEditing ? draft.phoneNumber : userProfile?.phoneNumber}
              editKey="phoneNumber" isEditing={isEditing} onChange={setField} placeholder="+91 9876543210" />
            <Field label="Member Since" icon={Calendar}
              value={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              editKey="createdAt" isEditing={false} onChange={() => {}} readOnly />
          </div>
          <TextArea label="Bio" icon={FileText} value={isEditing ? draft.bio : userProfile?.bio}
            editKey="bio" isEditing={isEditing} onChange={setField} placeholder="Tell us a little about yourself..." />
        </motion.div>

        {/* Student-specific section */}
        {isStudent && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white border border-[#e0e0e0] rounded-3xl p-6 space-y-5">
            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Academic Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Enrollment / Reg No." icon={Hash} value={isEditing ? roleDraft.regNo : roleProfile?.regNo}
                editKey="regNo" isEditing={isEditing} onChange={setRoleField} placeholder="e.g. RA2111003040001" />
              <Field label="Degree Program" icon={BookOpen} value={isEditing ? roleDraft.degree : roleProfile?.degree}
                editKey="degree" isEditing={isEditing} onChange={setRoleField} placeholder="e.g. B.Tech" />
              <Field label="Branch / Specialization" icon={Layers} value={isEditing ? roleDraft.branch : roleProfile?.branch}
                editKey="branch" isEditing={isEditing} onChange={setRoleField} placeholder="e.g. Computer Science" />

              {/* Wallet Address */}
              <div className="col-span-full space-y-1.5">
                <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Wallet size={10} /> Wallet Address</span>
                  {roleProfile?.publicWalletAddress && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(roleProfile.publicWalletAddress); showToast('success', 'Address copied!'); }}
                      className="flex items-center gap-1 text-[8px] font-black text-[#646464] hover:text-[#ea2804] uppercase tracking-widest transition-colors"
                    >
                      <Wallet size={9} /> Copy
                    </button>
                  )}
                </label>
                <div className="ds-input bg-[#f6f6f6] text-[#646464] cursor-default select-all font-mono text-[10px] break-all leading-relaxed">
                  {roleProfile?.publicWalletAddress || <span className="text-[#bbbbbb] italic">Not assigned</span>}
                </div>
              </div>
            </div>
            {!isEditing && !roleProfile?.regNo && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle size={13} className="text-amber-600 shrink-0" />
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">
                  Add your enrollment number so institutions can issue certificates to you.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Institution-specific section */}
        {isUniversity && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white border border-[#e0e0e0] rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest">Institution Details</p>
              {roleProfile?.status && (
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                  roleProfile.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  roleProfile.status === 'PENDING' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-red-50 border-red-200 text-red-700'
                }`}>{roleProfile.status}</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Institution Name" icon={Building2} value={roleProfile?.name}
                editKey="name" isEditing={false} onChange={() => {}} readOnly />
              <Field label="Official Email" icon={Mail} value={roleProfile?.email}
                editKey="email" isEditing={false} onChange={() => {}} readOnly />
              <Field label="City" icon={MapPin} value={isEditing ? roleDraft.city : roleProfile?.city}
                editKey="city" isEditing={isEditing} onChange={setRoleField} placeholder="e.g. Chennai" />
              {/* University wallet with copy */}
              <div className="col-span-full space-y-1.5">
                <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Wallet size={10} /> Wallet Address</span>
                  {roleProfile?.publicWalletAddress && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(roleProfile.publicWalletAddress); showToast('success', 'Address copied!'); }}
                      className="flex items-center gap-1 text-[8px] font-black text-[#646464] hover:text-[#ea2804] uppercase tracking-widest transition-colors"
                    >
                      <Wallet size={9} /> Copy
                    </button>
                  )}
                </label>
                <div className="ds-input bg-[#f6f6f6] text-[#646464] cursor-default select-all font-mono text-[10px] break-all leading-relaxed">
                  {roleProfile?.publicWalletAddress || <span className="text-[#bbbbbb] italic">Not assigned</span>}
                </div>
              </div>
            </div>
            <TextArea label="About the Institution" icon={Globe}
              value={isEditing ? roleDraft.description : roleProfile?.description}
              editKey="description" isEditing={isEditing} onChange={setRoleField}
              placeholder="Brief description of your institution..." />
          </motion.div>
        )}

        {/* Admin note */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex items-start gap-3 px-5 py-4 bg-[#ea2804]/5 border border-[#ea2804]/15 rounded-2xl">
            <ShieldCheck size={14} className="text-[#ea2804] shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-[#ea2804] uppercase tracking-widest leading-relaxed">
              Admin accounts are managed by the platform operator. Contact support to update institutional details.
            </p>
          </motion.div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl border shadow-lg text-[9px] font-black uppercase tracking-widest ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-700'
              : 'bg-white border-red-200 text-red-600'
          }`}>
          {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.text}
        </motion.div>
      )}
    </div>
  );
}
