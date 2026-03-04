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

let _io: SocketServer | null = null; // module-level singleton

const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketUsers = new Map<string, string>(); // socketId -> userId

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
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

    // Handle poll vote in group (for real-time updates)
    socket.on('poll-vote', ({ groupId, pollId, vote }: { groupId: string; pollId: string; vote: boolean }) => {
      socket.to(`group:${groupId}`).emit('poll-vote-cast', {
        pollId,
        userId,
        vote
      });
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

  _io = io;
  return io;
}

// Helper function to emit to specific user
export function emitToUser(io: SocketServer | null, userId: string, event: string, data: any): void;
export function emitToUser(userId: string, event: string, data: any): void;
export function emitToUser(ioOrUserId: SocketServer | null | string, userIdOrEvent: string, eventOrData: string | any, data?: any): void {
  if (typeof ioOrUserId === 'string') {
    // Called as emitToUser(userId, event, data)
    _io?.to(`user:${ioOrUserId}`).emit(userIdOrEvent, eventOrData);
  } else {
    // Called as emitToUser(io, userId, event, data)
    (ioOrUserId || _io)?.to(`user:${userIdOrEvent}`).emit(eventOrData, data);
  }
}

// Helper function to emit to conversation
export function emitToConversation(io: SocketServer | null, conversationId: string, event: string, data: any): void;
export function emitToConversation(conversationId: string, event: string, data: any): void;
export function emitToConversation(ioOrConvId: SocketServer | null | string, convIdOrEvent: string, eventOrData: string | any, data?: any): void {
  if (typeof ioOrConvId === 'string') {
    _io?.to(`conversation:${ioOrConvId}`).emit(convIdOrEvent, eventOrData);
  } else {
    (ioOrConvId || _io)?.to(`conversation:${convIdOrEvent}`).emit(eventOrData, data);
  }
}

// Helper function to emit to group
export function emitToGroup(io: SocketServer | null, groupId: string, event: string, data: any): void;
export function emitToGroup(groupId: string, event: string, data: any): void;
export function emitToGroup(ioOrGroupId: SocketServer | null | string, groupIdOrEvent: string, eventOrData: string | any, data?: any): void {
  if (typeof ioOrGroupId === 'string') {
    _io?.to(`group:${ioOrGroupId}`).emit(groupIdOrEvent, eventOrData);
  } else {
    (ioOrGroupId || _io)?.to(`group:${groupIdOrEvent}`).emit(eventOrData, data);
  }
}

// Check if user is online
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}
