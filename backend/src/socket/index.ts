import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

interface UserSocket {
  userId: string;
  socketId: string;
}

interface JwtPayload {
  userId: string;
  rollNo: string;
}

const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketUsers = new Map<string, string>(); // socketId -> userId

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      socket.data.userId = decoded.userId;
      next();
    } catch (error: any) {
      console.error('Socket authentication error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    // console.log(`User ${userId} connected with socket ${socket.id}`);

    // Track user's socket connections
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);
    socketUsers.set(socket.id, userId);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle joining conversation rooms
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      // console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      // console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Handle joining group rooms
    socket.on('join-group', (groupId: string) => {
      socket.join(`group:${groupId}`);
      // console.log(`User ${userId} joined group ${groupId}`);
    });

    // Handle leaving group rooms
    socket.on('leave-group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      // console.log(`User ${userId} left group ${groupId}`);
    });

    // Handle typing indicator
    socket.on('typing', ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        userId,
        conversationId,
        isTyping,
      });
    });

    // Handle message read status
    socket.on('message-read', ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('message-status-updated', {
        messageId,
        status: 'read',
        userId,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // console.log(`User ${userId} disconnected from socket ${socket.id}`);
      
      // Remove socket from tracking
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
        }
      }
      socketUsers.delete(socket.id);
    });
  });

  return io;
}

// Helper function to emit to specific user
export function emitToUser(io: SocketServer, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}

// Helper function to emit to conversation
export function emitToConversation(io: SocketServer, conversationId: string, event: string, data: any) {
  io.to(`conversation:${conversationId}`).emit(event, data);
}

// Check if user is online
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}
