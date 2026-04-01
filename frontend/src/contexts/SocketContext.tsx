'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  getSocket: () => Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  /** Register a handler for offline messages delivered on reconnect */
  onOfflineMessages: (handler: (msg: unknown) => void) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  getSocket: () => null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  joinGroup: () => {},
  leaveGroup: () => {},
  sendTyping: () => {},
  onOfflineMessages: () => () => {},
});

export const useSocket = () => useContext(SocketContext);


export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const syncToken = () => {
      const token = localStorage.getItem('accessToken');
      setAuthToken((prev) => (prev === token ? prev : token));
    };

    syncToken();

    // Same-tab localStorage writes do not fire "storage" events, so keep a tiny polling fallback.
    const interval = window.setInterval(syncToken, 1000);
    window.addEventListener('storage', syncToken);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', syncToken);
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      const timer = window.setTimeout(() => {
        setIsConnected(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socketInstance = io(API_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
    });

    // assign to ref instead of setState
    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [authToken]);

  /**
   * Register a handler for offline messages delivered by the backend on reconnect.
   * Returns an unsubscribe function so callers can clean up in useEffect.
   */
  const onOfflineMessages = useCallback((handler: (msg: unknown) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('offline-messages', handler);
    return () => {
      socket.off('offline-messages', handler);
    };
  }, []);

  const contextValue = useMemo(() => ({
    getSocket: () => socketRef.current,
    isConnected,
    joinConversation: (conversationId: string) => {
      const s = socketRef.current;
      if (s && isConnected) s.emit('join-conversation', conversationId);
    },
    leaveConversation: (conversationId: string) => {
      const s = socketRef.current;
      if (s && isConnected) s.emit('leave-conversation', conversationId);
    },
    joinGroup: (groupId: string) => {
      const s = socketRef.current;
      if (s && isConnected) s.emit('join-group', groupId);
    },
    leaveGroup: (groupId: string) => {
      const s = socketRef.current;
      if (s && isConnected) s.emit('leave-group', groupId);
    },
    sendTyping: (conversationId: string, isTyping: boolean) => {
      const s = socketRef.current;
      if (s && isConnected) s.emit('typing', { conversationId, isTyping });
    },
    onOfflineMessages,
  }), [isConnected, onOfflineMessages]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}