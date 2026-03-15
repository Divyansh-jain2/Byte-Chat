'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  fetchNotifications,
  markNotificationsRead,
  type AppNotification,
} from '@/services/notification.service';
import { useSocket } from '@/contexts/SocketContext';

interface NotificationContextType {
  notifications: AppNotification[];
  count: number;
  markRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  count: 0,
  markRead: async () => {},
  refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const { getSocket, isConnected } = useSocket();
  const listenersAttached = useRef(false);

  /** Load initial state from the Redis-backed API */
  const refresh = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setCount(data.count);
    } catch {
      // User might not be signed in yet — ignore silently
    }
  }, []);

  // Fetch on mount (when there is an access token available)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      refresh();
    }
  }, [refresh]);

  // Listen for real-time notifications pushed by the backend via socket
  useEffect(() => {
    if (!isConnected) return;
    const socket = getSocket();
    if (!socket || listenersAttached.current) return;

    const handleNewNotification = (payload: {
      notification: AppNotification;
      count: number;
    }) => {
      setNotifications((prev) => [payload.notification, ...prev].slice(0, 20));
      setCount(payload.count);
    };

    socket.on('new-notification', handleNewNotification);
    listenersAttached.current = true;

    return () => {
      socket.off('new-notification', handleNewNotification);
      listenersAttached.current = false;
    };
  }, [isConnected, getSocket]);

  /** Mark all notifications as read (resets count to 0) */
  const markRead = useCallback(async () => {
    try {
      await markNotificationsRead();
      setCount(0);
    } catch {
      // Non-fatal
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, count, markRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}
