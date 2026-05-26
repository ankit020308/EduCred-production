import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

export default function DigilockerCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('authenticating'); // 'authenticating', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(`DigiLocker returned an error: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Authorization code is missing from the callback URL.');
      return;
    }

    const connectAccount = async () => {
      try {
        await api.post('/api/student/digilocker/callback', { code });
        setStatus('success');
        setTimeout(() => {
          navigate('/student-portal', { replace: true });
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err.response?.data?.error || 'Failed to connect DigiLocker account. Please try again.');
      }
    };

    connectAccount();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f6] px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-12 border border-[#202020] max-w-md w-full text-center"
      >
        {status === 'authenticating' && (
          <>
            <div className="w-16 h-16 border-[3px] border-t-blue-600 border-r-blue-600 border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-8" />
            <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase mb-4">Processing</p>
            <h2 className="text-xl font-black tracking-tight text-[#202020] mb-2">Connecting DigiLocker</h2>
            <p className="text-[#646464] text-xs">Please wait while we securely link your account with the Government of India database.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-[#2b9a66]/10 rounded-full mx-auto flex items-center justify-center text-[#2b9a66] border border-[#2b9a66]/20 mb-8">
              <ShieldCheck size={36} />
            </div>
            <p className="text-[10px] font-black tracking-widest text-[#2b9a66] uppercase mb-4">Success</p>
            <h2 className="text-xl font-black tracking-tight text-[#202020] mb-2">Account Linked!</h2>
            <p className="text-[#646464] text-xs">Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-[#ea2804]/10 rounded-full mx-auto flex items-center justify-center text-[#ea2804] border border-[#ea2804]/20 mb-8">
              <AlertCircle size={36} />
            </div>
            <p className="text-[10px] font-black tracking-widest text-[#ea2804] uppercase mb-4">Connection Failed</p>
            <h2 className="text-xl font-black tracking-tight text-[#202020] mb-4">{errorMessage}</h2>
            <button 
              onClick={() => navigate('/student-portal', { replace: true })} 
              className="px-6 py-3 w-full bg-[#f6f6f6] hover:bg-[#e0e0e0] text-[#202020] text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors border border-[#e0e0e0]"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
