import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { storeToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Rehydrate session from server on refresh
  useEffect(() => {
    const saved = localStorage.getItem('user');

    if (saved) {
      try {
        setUser(JSON.parse(saved));
        // Hydrate full profile from cookie-authenticated session
        api.get('/api/auth/me').then(res => {
          const fullUser = res.data;
          localStorage.setItem('user', JSON.stringify(fullUser));
          setUser(fullUser);
        }).catch(() => {
          // Cookie may be expired/invalid
          localStorage.removeItem('user');
          setUser(null);
        });
      } catch {
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  // 🔹 Persist user state (Tokens are handled by cookies automatically)
  const persistSession = useCallback((u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  // 🔹 SET SESSION FROM OAuth REDIRECT
  const setSessionFromOAuth = useCallback(async (accessToken, refreshToken, partialUser) => {
    // Note: We don't necessarily NEED accessToken/refreshToken here anymore
    // because the backend already sets them as httpOnly cookies.
    
    // Proactive cleanup
    localStorage.removeItem('user');

    // Optimistic set (allows and immediate redirect to a loading state or partial dashboard)
    const optimisticUser = { 
      ...partialUser, 
      isEmailVerified: true 
    };
    
    localStorage.setItem('user', JSON.stringify(optimisticUser));
    setUser(optimisticUser);

    try {
      const res = await api.get('/api/auth/me');
      const fullUser = res.data;
      localStorage.setItem('user', JSON.stringify(fullUser));
      setUser(fullUser);
    } catch { /* fall back to optimistic profile already set */ }
  }, []);

  // 🔹 LOGIN
  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { user: u, accessToken } = res.data;
      if (accessToken) storeToken(accessToken);
      persistSession(u);
      return u;
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        throw { requiresVerification: true, email };
      }
      throw err.response?.data?.error || 'Login failed';
    }
  }, [persistSession]);

  // 🔹 REGISTER
  const register = useCallback(async (data) => {
    const res = await api.post('/api/auth/register', data);
    if (res.data.requiresVerification) return { requiresVerification: true, email: data.email };
    const { user: u } = res.data;
    persistSession(u);
    return u;
  }, [persistSession]);

  // 🔹 VERIFY OTP
  const verifyOTP = useCallback(async (email, otp) => {
    try {
      const res = await api.post('/api/auth/verify-otp', { email, otp });
      const { user: userFromResponse, accessToken } = res.data;
      if (accessToken) storeToken(accessToken);
      if (userFromResponse) {
        persistSession(userFromResponse);
        return userFromResponse;
      }
      const meRes = await api.get('/api/auth/me');
      persistSession(meRes.data);
      return meRes.data;
    } catch (err) {
      throw err.response?.data?.error || 'Verification failed';
    }
  }, [persistSession]);

  // 🔹 RESEND OTP
  const resendOTP = useCallback(async (email) => {
    await api.post('/api/auth/resend-otp', { email });
  }, []);

  // 🔹 GOOGLE LOGIN (DISABLED)
  const googleLogin = useCallback(async () => {
    throw new Error('Google authentication is currently disabled for architectural stability.');
  }, []);

  // 🔹 COMPLETE ONBOARDING
  const completeOnboarding = useCallback(async (data) => {
    try {
      const res = await api.post('/api/auth/complete-onboarding', data);
      const { user: u } = res.data;
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch (err) {
      throw err.response?.data?.error || 'Onboarding failed';
    }
  }, []);

  // 🔹 LOGOUT
  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    clearToken();
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // 🔹 UPDATE USER (for profile updates)
  const updateUser = useCallback((u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  // 🔹 Stabilize the Context Value to prevent cascading re-renders
  const contextValue = useMemo(() => ({
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
  }), [
    user, loading, login, register, verifyOTP, resendOTP, 
    googleLogin, completeOnboarding, logout, updateUser, 
    setSessionFromOAuth
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
