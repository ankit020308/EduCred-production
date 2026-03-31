import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// 🔥 IMPORTANT: backend base URL
const API = 'http://localhost:5001/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Load user on refresh
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');

    if (token && saved) {
      setUser(JSON.parse(saved));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    setLoading(false);
  }, []);

  // 🔹 LOGIN
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });

      const { token, user: u } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(u));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(u);

      return u;
    } catch (err) {
      throw err.response?.data?.error || 'Login failed';
    }
  };

  // 🔹 REGISTER
  const register = async (data) => {
    try {
      const res = await axios.post(`${API}/auth/register`, data);

      const { token, user: u } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(u));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(u);

      return u;
    } catch (err) {
      throw err.response?.data?.error || 'Signup failed';
    }
  };

  // 🔹 LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    delete axios.defaults.headers.common['Authorization'];

    setUser(null);
  };

  // 🔹 UPDATE USER
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