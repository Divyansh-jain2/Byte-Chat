import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getSession } from '../services/session.service.js';
import { storeWsAuth, getWsAuth, deleteWsAuth } from '../services/wsAuth.service.js';
import { mapUserSocket, removeSocketMapping, getUserSockets } from '../services/socketRouting.service.js';
import { addOnlineUser, removeOnlineUser } from '../services/presence.service.js';
import { joinRoom, leaveRoom, removeSocketFromAllRooms, getRoomSockets } from '../services/room.service.js';
import { setTyping } from '../services/typing.service.js';
import { getOfflineMessages } from '../services/offlineMessage.service.js';

interface UserSocket {
  userId: string;
  socketId: string;
}

interface JwtPayload {
  userId: string;
  rollNo: string;
}

let _io: SocketServer | null = null; // module-level singleton

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      const sessionId = socket.handshake.auth.sessionId || socket.handshake.headers['x-session-id'];

      // 1. Try Session ID (Redis)
      if (sessionId) {
        const session = await getSession(sessionId);
        if (session && session.userId) {
          socket.data.userId = session.userId;
          socket.data.sessionId = sessionId;

          // Store temporary WebSocket auth in Redis
          await storeWsAuth(socket.id, {
            userId: session.userId,
            sessionId: sessionId,
            authenticatedAt: Date.now()
          });

          return next();
        }
      }

      // 2. Fallback to JWT
      if (token) {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
        socket.data.userId = decoded.userId;

        // Even for JWT, we store temporary auth to keep the pattern consistent
        await storeWsAuth(socket.id, {
          userId: decoded.userId,
          authenticatedAt: Date.now()
        });

        return next();
      }

      return next(new Error('Authentication error: No valid session or token provided'));
    } catch (error: any) {
      console.error('Socket authentication error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid authentication'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    // console.log(`User ${userId} connected with socket ${socket.id}`);

    // Track user's socket connections in Redis
    await mapUserSocket(userId, socket.id);

    // Add to global online presence
    await addOnlineUser(userId);

    // Deliver offline messages
    const offlineMessages = await getOfflineMessages(userId);
    if (offlineMessages.length > 0) {
      //   console.log(`📡 Delivering ${offlineMessages.length} offline messages to ${userId}`);
      offlineMessages.forEach((msg) => {
        socket.emit('offline-messages', msg);
      });
    }

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
    socket.on('message-read', async ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      const auth = await getWsAuth(socket.id);
      if (!auth) return socket.emit('error', 'Unauthenticated socket');

      socket.to(`conversation:${conversationId}`).emit('message-status-updated', {
        messageId,
        status: 'read',
        userId,
      });
    });

    // Chat Room Events
    socket.on('join_chat', async (chatId) => {
      await joinRoom(chatId, socket.id);
      //   console.log(`Socket ${socket.id} joined chat room ${chatId}`);
    });

    socket.on('leave_chat', async (chatId) => {
      await leaveRoom(chatId, socket.id);
      //   console.log(`Socket ${socket.id} left chat room ${chatId}`);
    });

    // Typing Indicators
    socket.on('typing', async (chatId) => {
      await setTyping(chatId, userId);

      // Broadcast typing status to active members in the room
      const roomSockets = await getRoomSockets(chatId);
      roomSockets.forEach((sId) => {
        if (sId !== socket.id) {
          _io?.to(sId).emit('user-typing', {
            chatId,
            userId,
          });
        }
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      // console.log(`User ${userId} disconnected from socket ${socket.id}`);

      // Clean up Redis rooms
      await removeSocketFromAllRooms(socket.id);

      // Clean up Redis routing
      await removeSocketMapping(socket.id);

      // Check if user has any other active connections
      const remainingSockets = await getUserSockets(userId);
      if (remainingSockets.length === 0) {
        // No more connections, remove from global online presence
        await removeOnlineUser(userId);
      }

      // Clean up Redis auth
      await deleteWsAuth(socket.id);
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
export async function isUserOnline(userId: string): Promise<boolean> {
  const sockets = await getUserSockets(userId);
  return sockets.length > 0;
}
