import axios from 'axios';

/**
 * Centralized Axios instance for the EduCred platform.
 * Automatically switches between local development proxy and the live production API URL.
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '', // Empty fallback uses the Vite proxy in development
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Interceptor to automatically inject the JWT token into every outgoing request.
 * This simplifies auth across the entire frontend.
 */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

/**
 * Handle global errors (e.g., 401 Unauthorized)
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Optional: Handle global logout or redirect
            console.warn("Unauthorized access - Session may have expired.");
        }
        return Promise.reject(error);
    }
);

export default api;
