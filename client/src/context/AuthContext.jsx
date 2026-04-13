import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Rehydrate session from localStorage on refresh
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');

    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
        // Silently refresh full profile in background so createdAt / role are always fresh
        api.get('/api/auth/me').then(res => {
          const fullUser = res.data;
          localStorage.setItem('user', JSON.stringify(fullUser));
          setUser(fullUser);
        }).catch(() => {
          // Token may be expired — interceptor will dispatch session_expired
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  // 🔹 Persist session tokens and user state
  const persistSession = (accessToken, refreshToken, u) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  // 🔹 SET SESSION FROM OAuth REDIRECT (Google Passport callback)
  // Called by OAuthSuccess component in App.jsx after redirect
  const setSessionFromOAuth = async (accessToken, refreshToken, partialUser) => {
    // 🧹 PROACTIVE CLEANUP: Clear any stale session before establishing new identity
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // 💾 ATOMIC PERSISTENCE
    localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    
    // Optimistic set: populate as much as we have from URL params for immediate UI reactivity
    const optimisticUser = { 
      ...partialUser, 
      accessToken,
      isEmailVerified: true // OAuth users are pre-verified by Google
    };
    
    localStorage.setItem('user', JSON.stringify(optimisticUser));
    setUser(optimisticUser);

    try {
      // Background Augmentation: Fetch full profile silently to get DB-specific fields (createdAt, etc.)
      console.log(`[🛰️ SESSION_HYDRATION] Augmenting OAuth session for user: ${partialUser.name}`);
      const res = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const fullUser = res.data;
      localStorage.setItem('user', JSON.stringify(fullUser));
      setUser(fullUser);
    } catch (err) {
      console.error('[🚨 SESSION_AUGMENT_FAILED] Background profile fetch failed. Using optimistic profile.', err);
      // We don't throw here — the optimistic profile is functional enough for navigation
    }
  };

  // 🔹 LOGIN
  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken, user: u } = res.data;
      persistSession(accessToken, refreshToken, u);
      return u;
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        throw { requiresVerification: true, email };
      }
      throw err.response?.data?.error || 'Login failed';
    }
  };

  // 🔹 REGISTER
  const register = async (data) => {
    const res = await api.post('/api/auth/register', data);

    if (res.data.requiresVerification) {
      return { requiresVerification: true, email: data.email };
    }

    const { accessToken, refreshToken, user: u } = res.data;
    persistSession(accessToken, refreshToken, u);
    return u;
  };

  // 🔹 VERIFY OTP
  const verifyOTP = async (email, otp) => {
    try {
      const res = await api.post('/api/auth/verify-otp', { email, otp });
      const { accessToken, refreshToken, user: u } = res.data;
      persistSession(accessToken, refreshToken, u);
      return u;
    } catch (err) {
      throw err.response?.data?.error || 'Verification failed';
    }
  };

  // 🔹 RESEND OTP
  const resendOTP = async (email) => {
    try {
      await api.post('/api/auth/resend-otp', { email });
    } catch (err) {
      throw err.response?.data?.error || 'Failed to resend code';
    }
  };

  // 🔹 GOOGLE LOGIN (via @react-oauth/google — sends idToken to backend)
  const googleLogin = async (idToken, role = 'student') => {
    try {
      const res = await api.post('/api/auth/google-login', { idToken, role });
      const { accessToken, refreshToken, isNewUser, user: u } = res.data;
      persistSession(accessToken, refreshToken, u);
      return { user: u, isNewUser };
    } catch (err) {
      console.error('Google Auth Error:', err);
      throw err.response?.data?.error || 'Google login failed';
    }
  };

  // 🔹 COMPLETE ONBOARDING
  const completeOnboarding = async (data) => {
    try {
      const res = await api.post('/api/auth/complete-onboarding', data);
      const { user: u } = res.data;
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch (err) {
      throw err.response?.data?.error || 'Onboarding failed';
    }
  };

  // 🔹 LOGOUT
  const logout = async () => {
    // Best-effort backend revocation (don't block on it)
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  // 🔹 UPDATE USER (for profile updates)
  const updateUser = (u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        verifyOTP,
        resendOTP,
        googleLogin,
        completeOnboarding,
        logout,
        updateUser,
        setSessionFromOAuth,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
