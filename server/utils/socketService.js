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
