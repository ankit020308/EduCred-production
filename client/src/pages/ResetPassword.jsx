import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.otp || !form.newPassword) {
      return setError('All fields are required.');
    }
    if (form.newPassword !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (form.newPassword.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      navigate('/login?reset=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px]">
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-2 w-fit mb-8">
            <div className="w-8 h-8 bg-[#202020] rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" size={16} />
            </div>
            <span className="text-lg font-black text-[#202020] tracking-tight">Edu<span className="text-[#646464]">Cred</span></span>
          </Link>
          <h1 className="text-3xl font-black text-[#202020] tracking-tight mb-1">Set new password</h1>
          <p className="text-[#646464] text-sm">Enter the code from your email and your new password.</p>
        </div>

        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Email</label>
              <input type="email" required value={form.email} onChange={set('email')}
                className="ds-input" placeholder="you@university.edu" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Reset Code</label>
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required
                value={form.otp} onChange={set('otp')}
                className="ds-input tracking-widest text-center text-xl font-bold"
                placeholder="000000" autoFocus={!!searchParams.get('email')} />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                <input type={showPassword ? 'text' : 'password'} required minLength={8}
                  value={form.newPassword} onChange={set('newPassword')}
                  className="ds-input pl-11 pr-12" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] hover:text-[#202020] transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Confirm Password</label>
              <input type="password" required value={form.confirmPassword} onChange={set('confirmPassword')}
                className="ds-input" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <>Reset password <ArrowRight size={14} /></>}
            </button>

            {error && (
              <p className="text-[#ea2804] text-[9px] font-bold uppercase tracking-widest text-center border border-[#ea2804]/20 bg-[#ea2804]/5 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
          </form>
        </div>

        <p className="text-center mt-6 text-[#646464] text-sm">
          <Link to="/forgot-password" className="text-[#ea2804] font-bold"
            style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
            Resend code
          </Link>
          {' · '}
          <Link to="/login" className="text-[#ea2804] font-bold"
            style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
