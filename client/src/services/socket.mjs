import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

/**
 * ⚡ GLOBAL EVENT TERMINAL (Socket.io Singleton)
 * We initialize once and export the singleton instance to facilitate
 * real-time reactivity across the entire EduCred dashboard fleet.
 */
export const socket = io(SOCKET_URL, {
    autoConnect: false, // Wait for auth to be hydrated
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
});

/**
 * Convenience hooks for dashboard rooms
 */
export const joinInstitutionalRoom = (universityId) => {
    if (universityId) {
        socket.emit('join:institution', universityId);
        console.log(`📡 [SOCKET]: Requesting entrance to Institutional Node: ${universityId}`);
    }
};

export default socket;
