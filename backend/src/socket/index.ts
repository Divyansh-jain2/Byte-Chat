import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from '../config/index.js';
import { redis } from '../lib/redis.js';
import { getSession } from '../services/session.service.js';
import { storeWsAuth, getWsAuth, deleteWsAuth } from '../services/wsAuth.service.js';
import { mapUserSocket, removeSocketMapping, getUserSockets } from '../services/socketRouting.service.js';
import { addOnlineUser, removeOnlineUser } from '../services/presence.service.js';
import { joinRoom, leaveRoom, removeSocketFromAllRooms, getRoomSockets } from '../services/room.service.js';
import { clearTyping, setTyping } from '../services/typing.service.js';
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
let socketRedisAdapterConfigured = false;

function configureSocketRedisAdapter(io: SocketServer) {
  if (socketRedisAdapterConfigured) return;

  const enabled = process.env.SOCKET_REDIS_ADAPTER_ENABLED !== 'false';
  if (!enabled) {
    console.warn('[Socket] Redis adapter disabled via SOCKET_REDIS_ADAPTER_ENABLED=false');
    return;
  }

  try {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();

    pubClient.on('error', (err: unknown) => {
      console.error('[Socket] Redis pub client error:', err);
    });

    subClient.on('error', (err: unknown) => {
      console.error('[Socket] Redis sub client error:', err);
    });

    io.adapter(createAdapter(pubClient, subClient));
    socketRedisAdapterConfigured = true;
    console.log('[Socket] Redis adapter enabled for cross-server event sync');
  } catch (error) {
    console.error('[Socket] Failed to enable Redis adapter, continuing without it:', error);
  }
}

type RoomEmitMetrics = {
  trackedEmits: number;
  trackedSocketDeliveries: number;
  fallbackEmits: number;
  fallbackFromEmptyRoom: number;
  fallbackFromRedisError: number;
};

const roomEmitMetrics: RoomEmitMetrics = {
  trackedEmits: 0,
  trackedSocketDeliveries: 0,
  fallbackEmits: 0,
  fallbackFromEmptyRoom: 0,
  fallbackFromRedisError: 0,
};

let metricsIntervalStarted = false;

function maybeStartSocketMetricsLogger() {
  if (metricsIntervalStarted) return;

  const enabled = process.env.SOCKET_METRICS_ENABLED === 'true';
  if (!enabled) return;

  const everyMs = Number(process.env.SOCKET_METRICS_INTERVAL_MS || 60000);
  const intervalMs = Number.isFinite(everyMs) && everyMs >= 5000 ? everyMs : 60000;

  metricsIntervalStarted = true;

  setInterval(() => {
    console.log('[SocketMetrics]', {
      trackedEmits: roomEmitMetrics.trackedEmits,
      trackedSocketDeliveries: roomEmitMetrics.trackedSocketDeliveries,
      fallbackEmits: roomEmitMetrics.fallbackEmits,
      fallbackFromEmptyRoom: roomEmitMetrics.fallbackFromEmptyRoom,
      fallbackFromRedisError: roomEmitMetrics.fallbackFromRedisError,
    });
  }, intervalMs);
}

function fallbackRoomEmit(roomName: string, event: string, data: any, excludeSocketId?: string) {
  roomEmitMetrics.fallbackEmits += 1;
  const target = excludeSocketId ? _io?.to(roomName).except(excludeSocketId) : _io?.to(roomName);
  target?.emit(event, data);
}

async function emitToTrackedRoom(chatId: string, roomName: string, event: string, data: any, excludeSocketId?: string) {
  const io = _io;
  if (!io) return;

  try {
    const socketIds = await getRoomSockets(chatId);
    if (socketIds.length > 0) {
      roomEmitMetrics.trackedEmits += 1;
      roomEmitMetrics.trackedSocketDeliveries += socketIds.length;
      // Emit directly to socket IDs tracked in Redis room set.
      for (const socketId of socketIds) {
        if (socketId !== excludeSocketId) {
          io.to(socketId).emit(event, data);
        }
      }
      return;
    }

    roomEmitMetrics.fallbackFromEmptyRoom += 1;
  } catch (err) {
    roomEmitMetrics.fallbackFromRedisError += 1;
    console.warn('[Socket] Redis room emit failed, falling back to Socket.IO room:', err);
  }

  // Fallback path for compatibility/safety.
  fallbackRoomEmit(roomName, event, data, excludeSocketId);
}

export function initializeSocket(httpServer: HTTPServer) {
  maybeStartSocketMetricsLogger();

  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.cors.frontendUrl,
      credentials: true,
    },
  });

  configureSocketRedisAdapter(io);

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const accessTokenCookie = cookieHeader
        ?.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('accessToken='))
        ?.slice('accessToken='.length);
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1] || accessTokenCookie;
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

    // Add to global online presence and notify all clients
    await addOnlineUser(userId);
    io.emit('user-online', { userId });

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
    socket.on('join-conversation', async (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      await joinRoom(conversationId, socket.id);
      // console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave-conversation', async (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      await leaveRoom(conversationId, socket.id);
      // console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Handle joining group rooms
    socket.on('join-group', async (groupId: string) => {
      socket.join(`group:${groupId}`);
      await joinRoom(groupId, socket.id);
      // console.log(`User ${userId} joined group ${groupId}`);
    });

    // Handle leaving group rooms
    socket.on('leave-group', async (groupId: string) => {
      socket.leave(`group:${groupId}`);
      await leaveRoom(groupId, socket.id);
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
    socket.on('typing', async (payload) => {
      let chatId = '';
      let chatType: 'conversation' | 'group' = 'conversation';
      let isUserTyping = true;

      if (typeof payload === 'string') {
        chatId = payload;
      } else if (payload && typeof payload === 'object') {
        chatId = payload.chatId || payload.conversationId || payload.groupId;
        chatType = payload.chatType || (payload.groupId ? 'group' : 'conversation');
        isUserTyping = payload.isTyping !== undefined ? payload.isTyping : true;
      }

      if (!chatId) return;

      // Update Redis typing status
      if (isUserTyping) {
        await setTyping(chatId, userId);
      } else {
        await clearTyping(chatId, userId);
      }

      // Use canonical emit target per chat type
      const roomName = `${chatType}:${chatId}`;
      
      // Broadcast to tracked sockets in Redis (cross-server) or fallback to local room.
      // Note: We use the helper to ensure cross-node delivery via Redis if adapter is enabled.
      void emitToTrackedRoom(chatId, roomName, 'user-typing', {
        chatId,
        userId,
        isTyping: isUserTyping,
      }, socket.id);
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
        io.emit('user-offline', { userId });
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
    void emitToTrackedRoom(ioOrConvId, `conversation:${ioOrConvId}`, convIdOrEvent, eventOrData);
  } else {
    // Keep support for explicit io parameter while still using tracked room first.
    _io = ioOrConvId || _io;
    void emitToTrackedRoom(convIdOrEvent, `conversation:${convIdOrEvent}`, eventOrData, data);
  }
}

// Helper function to emit to group
export function emitToGroup(io: SocketServer | null, groupId: string, event: string, data: any): void;
export function emitToGroup(groupId: string, event: string, data: any): void;
export function emitToGroup(ioOrGroupId: SocketServer | null | string, groupIdOrEvent: string, eventOrData: string | any, data?: any): void {
  if (typeof ioOrGroupId === 'string') {
    void emitToTrackedRoom(ioOrGroupId, `group:${ioOrGroupId}`, groupIdOrEvent, eventOrData);
  } else {
    // Keep support for explicit io parameter while still using tracked room first.
    _io = ioOrGroupId || _io;
    void emitToTrackedRoom(groupIdOrEvent, `group:${groupIdOrEvent}`, eventOrData, data);
  }
}

// Check if user is online
export async function isUserOnline(userId: string): Promise<boolean> {
  const sockets = await getUserSockets(userId);
  return sockets.length > 0;
}
