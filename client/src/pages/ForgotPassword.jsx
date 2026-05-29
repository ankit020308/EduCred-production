import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, ArrowRight, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) return setError('Email is required.');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] bg-white border border-[#e0e0e0] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-[#ea2804]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-[#ea2804]" size={24} />
          </div>
          <h1 className="text-2xl font-black text-[#202020] mb-2">Check your email</h1>
          <p className="text-[#646464] text-sm mb-6">
            If <strong>{email}</strong> is registered, a 6-digit reset code has been sent.
          </p>
          <button className="btn-primary w-full" onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}>
            Enter reset code <ArrowRight size={14} />
          </button>
          <p className="mt-4 text-[#646464] text-sm">
            <Link to="/login" className="text-[#ea2804] font-bold">Back to login</Link>
          </p>
        </motion.div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-black text-[#202020] tracking-tight mb-1">Reset password</h1>
          <p className="text-[#646464] text-sm">Enter your registered email to receive a reset code.</p>
        </div>

        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[#646464] uppercase tracking-widest block">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbbbbb] group-focus-within:text-[#ea2804] transition-colors" size={16} />
                <input type="email" placeholder="you@university.edu" required autoFocus
                  value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="ds-input pl-11" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <>Send reset code <ArrowRight size={14} /></>}
            </button>

            {error && (
              <p className="text-[#ea2804] text-[9px] font-bold uppercase tracking-widest text-center border border-[#ea2804]/20 bg-[#ea2804]/5 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
          </form>
        </div>

        <p className="text-center mt-6 text-[#646464] text-sm">
          <Link to="/login" className="text-[#ea2804] font-bold"
            style={{ textDecoration: 'underline dotted #ea2804', textUnderlineOffset: '3px' }}>
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
