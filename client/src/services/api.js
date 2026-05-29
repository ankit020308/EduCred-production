import axios from 'axios';

const PRODUCTION_BACKEND_URL = 'https://educred-backend.onrender.com';
const BASE_URL = import.meta.env.VITE_API_URL || PRODUCTION_BACKEND_URL;

// ─── In-memory token store ────────────────────────────────────────────────────
// Access tokens live ONLY in memory — never in localStorage or sessionStorage.
// localStorage is readable by any JS on the page (XSS) so it is an unsafe
// location for a credential. The httpOnly refresh cookie persists the session
// across page reloads; the interceptor below silently re-acquires an access
// token on the first 401 after a page load.
let _memoryToken = null;

export const storeToken = (token) => { _memoryToken = token || null; };
export const clearToken = ()      => { _memoryToken = null; };
export const getToken   = ()      => _memoryToken;

// ─── Axios instances ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL:         BASE_URL,
  timeout:         45000,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

// Dedicated client for the refresh call — intentionally has no interceptors so
// it cannot trigger an infinite refresh retry loop.
const refreshClient = axios.create({
  baseURL:         BASE_URL,
  timeout:         45000,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

// ─── Request interceptor — attach in-memory Bearer token ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ─── Response interceptor — silent token refresh on 401 ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest  = error.config || {};
    const requestUrl       = originalRequest.url || '';
    const isRefreshRequest = requestUrl.includes('/api/auth/refresh');
    const isLogoutRequest  = requestUrl.includes('/api/auth/logout');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshRequest &&
      !isLogoutRequest
    ) {
      originalRequest._retry = true;

      try {
        // Coalesce concurrent 401s into a single refresh round-trip.
        refreshPromise ??= refreshClient.post('/api/auth/refresh');
        const refreshRes = await refreshPromise;

        if (refreshRes.data?.accessToken) {
          storeToken(refreshRes.data.accessToken);
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers['Authorization'] = `Bearer ${refreshRes.data.accessToken}`;
        }

        return api(originalRequest);
      } catch {
        // Refresh failed — session fully expired.
        clearToken();
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('apiError', { detail: 'session_expired' }));
        return Promise.reject(error);
      } finally {
        refreshPromise = null;
      }
    }

    if (error.response?.status === 401 && !isLogoutRequest) {
      window.dispatchEvent(new CustomEvent('apiError', { detail: 'session_expired' }));
    } else if (!error.response && error.code === 'ECONNABORTED') {
      window.dispatchEvent(new CustomEvent('apiError', { detail: 'network_timeout' }));
    }

    return Promise.reject(error);
  }
);

// ─── System & Network Methods ─────────────────────────────────────────────────
export const fetchSystemStats     = () => api.get('/api/system/stats');
export const fetchNetworkNodes    = () => api.get('/api/system/map');
export const fetchProtocolUpdates = () => api.get('/api/system/ticker');

export default api;
