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
        // api interceptor already reads token from localStorage — no manual header needed
      } catch {
        // Corrupted saved user — clear everything
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

  // 🔹 REGISTER — FIXED: handle requiresVerification without destructuring tokens
  const register = async (data) => {
    try {
      const res = await api.post('/api/auth/register', data);

      // If backend requests email verification, return early — no tokens issued yet
      if (res.data.requiresVerification) {
        return { requiresVerification: true, email: data.email };
      }

      // Traditional flow (email verification disabled)
      const { accessToken, refreshToken, user: u } = res.data;
      persistSession(accessToken, refreshToken, u);
      return u;
    } catch (err) {
      throw err;
    }
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

  // 🔹 GOOGLE LOGIN
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
  const logout = () => {
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
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);