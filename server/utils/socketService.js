import { Server } from 'socket.io';
import { getAllowedOrigins } from './runtimeConfig.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join:institution', (institutionId) => {
      if (institutionId) socket.join(`institution:${institutionId}`);
    });
    socket.on('join_user_room', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });
    socket.on('leave_user_room', (userId) => {
      if (userId) socket.leave(`user:${userId}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToInstitution(institutionId, event, data) {
  if (!io || !institutionId) return;
  io.to(`institution:${institutionId}`).emit(event, data);
}

export function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, data);
}
