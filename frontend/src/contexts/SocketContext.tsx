'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  getSocket: () => Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType>({
  getSocket: () => null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  joinGroup: () => {},
  leaveGroup: () => {},
  sendTyping: () => {},
});

export const useSocket = () => useContext(SocketContext);


export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socketInstance = io(API_URL, {
      auth: { token },
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
  }), [isConnected]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}