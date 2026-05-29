import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { storeToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

// Non-sensitive user profile: name, email, role, id. We keep this in
// localStorage ONLY as a display cache so the UI can show a user's name
// before the /api/auth/me call resolves. No access token is ever stored here.
const USER_CACHE_KEY = 'educred_user_profile';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session on page load.
  // The access token was in memory and is now gone — rely on the httpOnly
  // refresh cookie to silently obtain a new one via the 401 interceptor.
  useEffect(() => {
    const cached = localStorage.getItem(USER_CACHE_KEY);

    // Optimistically show cached profile so the UI doesn't flicker.
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch { localStorage.removeItem(USER_CACHE_KEY); }
    }

    // Validate the session against the server. The /me call will trigger the
    // 401 → refresh → retry cycle automatically if the access token is gone.
    api.get('/api/auth/me')
      .then((res) => {
        const fullUser = res.data;
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(fullUser));
        setUser(fullUser);
      })
      .catch(() => {
        // Refresh cookie also expired — fully signed out.
        localStorage.removeItem(USER_CACHE_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));

    if (!cached) setLoading(false);
  }, []);

  const persistSession = useCallback((u) => {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  // SET SESSION FROM OAuth REDIRECT
  const setSessionFromOAuth = useCallback(async (accessToken, _refreshToken, partialUser) => {
    if (accessToken) storeToken(accessToken);
    localStorage.removeItem(USER_CACHE_KEY);

    const optimisticUser = { ...partialUser, isEmailVerified: true };
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(optimisticUser));
    setUser(optimisticUser);

    try {
      const res = await api.get('/api/auth/me');
      const fullUser = res.data;
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(fullUser));
      setUser(fullUser);
    } catch { /* fall back to optimistic profile */ }
  }, []);

  // LOGIN
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

  // REGISTER
  const register = useCallback(async (data) => {
    const res = await api.post('/api/auth/register', data);
    if (res.data.requiresVerification) return { requiresVerification: true, email: data.email };
    const { user: u } = res.data;
    persistSession(u);
    return u;
  }, [persistSession]);

  // VERIFY OTP
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

  // RESEND OTP
  const resendOTP = useCallback(async (email) => {
    await api.post('/api/auth/resend-otp', { email });
  }, []);

  // GOOGLE LOGIN (DISABLED)
  const googleLogin = useCallback(async () => {
    throw new Error('Google authentication is currently disabled for architectural stability.');
  }, []);

  // COMPLETE ONBOARDING
  const completeOnboarding = useCallback(async (data) => {
    try {
      const res = await api.post('/api/auth/complete-onboarding', data);
      const { user: u } = res.data;
      persistSession(u);
      return u;
    } catch (err) {
      throw err.response?.data?.error || 'Onboarding failed';
    }
  }, [persistSession]);

  // LOGOUT
  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch { /* ignore network errors */ }
    clearToken();
    localStorage.removeItem(USER_CACHE_KEY);
    setUser(null);
  }, []);

  // UPDATE USER (for profile updates)
  const updateUser = useCallback((u) => {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

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
    loading,
  }), [
    user, loading, login, register, verifyOTP, resendOTP,
    googleLogin, completeOnboarding, logout, updateUser,
    setSessionFromOAuth,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
