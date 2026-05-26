import axios from 'axios';

const PRODUCTION_BACKEND_URL = 'https://educred-backend.onrender.com';
const TOKEN_KEY = 'educred_access_token';

export const storeToken = (token) => { if (token) localStorage.setItem(TOKEN_KEY, token); };
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const getToken = () => localStorage.getItem(TOKEN_KEY);

const BASE_URL = import.meta.env.VITE_API_URL || PRODUCTION_BACKEND_URL;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 45000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
});

const refreshClient = axios.create({
    baseURL: BASE_URL,
    timeout: 45000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
});

let refreshPromise = null;

// Attach stored Bearer token to every outgoing request
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
}, (err) => Promise.reject(err));

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config || {};
        const requestUrl = originalRequest.url || '';
        const isRefreshRequest = requestUrl.includes('/api/auth/refresh');
        const isLogoutRequest = requestUrl.includes('/api/auth/logout');

        if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest && !isLogoutRequest) {
            originalRequest._retry = true;

            // Only refresh if we actually have a refresh token (cookie) or stored access token
            const hasToken = !!getToken();
            if (!hasToken) {
                clearToken();
                localStorage.removeItem('user');
                window.dispatchEvent(new CustomEvent('apiError', { detail: 'session_expired' }));
                return Promise.reject(error);
            }

            try {
                refreshPromise ??= refreshClient.post('/api/auth/refresh');
                const refreshRes = await refreshPromise;

                if (refreshRes.data?.accessToken) storeToken(refreshRes.data.accessToken);

                return api(originalRequest);
            } catch (refreshError) {
                clearToken();
                localStorage.removeItem('user');
                window.dispatchEvent(new CustomEvent('apiError', { detail: 'session_expired' }));
                return Promise.reject(refreshError);
            } finally {
                refreshPromise = null;
            }
        } else if (error.response?.status === 401 && !isLogoutRequest) {
            window.dispatchEvent(new CustomEvent('apiError', { detail: 'session_expired' }));
        } else if (!error.response && error.code === 'ECONNABORTED') {
            window.dispatchEvent(new CustomEvent('apiError', { detail: 'network_timeout' }));
        }

        return Promise.reject(error);
    }
);

// ─── System & Network Methods ─────────────────────────

/**
 * Fetch real-time system metrics (nodes, credentials, uptime)
 */
export const fetchSystemStats = () => api.get('/api/system/stats');

/**
 * Fetch real-time network map (institutional nodes)
 */
export const fetchNetworkNodes = () => api.get('/api/system/map');

/**
 * Fetch real-time protocol event ticker
 */
export const fetchProtocolUpdates = () => api.get('/api/system/ticker');

export default api;
