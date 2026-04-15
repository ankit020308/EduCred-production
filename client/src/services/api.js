import axios from 'axios';

/**
 * Centralized Axios instance for the EduCred platform.
 * Automatically switches between local development proxy and the live production API URL.
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '', // Empty fallback uses the Vite proxy in development
    timeout: 10000, // 10s timeout for production resilience
    withCredentials: true, // MANDATORY: Required for cookie-based session transport
    headers: {
        'Content-Type': 'application/json'
    }
});

let refreshPromise = null;

/**
 * Request interceptor removed. 
 * Browsers now automatically transport secure accessToken/refreshToken cookies.
 */

/**
 * Handle global errors:
 * - 401 + failed refresh → session_expired event (triggers logout + toast)
 * - Network timeout → network_timeout event
 * - All other errors → re-reject so the calling component can handle them.
 *   We do NOT dispatch a global toast for regular 4xx/5xx so that in-component
 *   error handling (OTP failures, login errors, etc.) is not overridden.
 */
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config || {};

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // No token in body needed; refreshToken is in httpOnly cookie
                refreshPromise ??= api.post(`${import.meta.env.VITE_API_URL || ''}/api/auth/refresh`);

                await refreshPromise;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('user');
                window.dispatchEvent(new CustomEvent('apiError', { detail: 'session_expired' }));
                return Promise.reject(refreshError);
            } finally {
                refreshPromise = null;
            }
        } else if (error.response?.status === 401) {
            // 401 with _retry true → both access and refresh attempted and failed
            window.dispatchEvent(new CustomEvent('apiError', { detail: 'session_expired' }));
        } else if (!error.response && error.code === 'ECONNABORTED') {
            // Hard network timeout
            window.dispatchEvent(new CustomEvent('apiError', { detail: 'network_timeout' }));
        }
        // All other errors (400, 403, 404, 422, 500, etc.) are re-rejected
        // so callers can show contextual messages without a duplicate global toast.
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
