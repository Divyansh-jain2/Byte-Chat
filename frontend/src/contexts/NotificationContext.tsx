'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  clearAllNotifications,
  clearConversationNotifications,
  deleteNotificationById,
  fetchNotifications,
  type AppNotification,
} from '@/services/notification.service';
import { useSocket } from '@/contexts/SocketContext';
import { authService } from '@/services/auth.service';

interface NotificationContextType {
  notifications: AppNotification[];
  count: number;
  markRead: () => Promise<void>;
  deleteOne: (notificationId: string) => Promise<void>;
  clearConversation: (conversationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  count: 0,
  markRead: async () => {},
  deleteOne: async () => {},
  clearConversation: async () => {},
  refresh: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const { getSocket, isConnected } = useSocket();
  const listenersAttached = useRef(false);
  const clearedConversationRef = useRef<string | null>(null);
  const pendingNotificationsRef = useRef<AppNotification[]>([]);
  const pendingCountRef = useRef<number>(0);
  const flushTimerRef = useRef<number | null>(null);
  const flushDelayRef = useRef<number>(80);

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
    if (authService.getCurrentUser()) {
      const timer = window.setTimeout(() => {
        void refresh();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [refresh]);

  // Listen for real-time notifications pushed by the backend via socket
  useEffect(() => {
    if (!isConnected) return;
    const socket = getSocket();
    if (!socket || listenersAttached.current) return;

    const flushRealtimeNotifications = () => {
      const pending = pendingNotificationsRef.current;
      if (pending.length === 0) return;

      setNotifications((prev) => [...pending, ...prev].slice(0, 20));
      setCount(pendingCountRef.current);

      pendingNotificationsRef.current = [];
    };

    const scheduleRealtimeFlush = () => {
      const pendingLength = pendingNotificationsRef.current.length;
      const targetDelay = pendingLength > 6 ? 150 : 80;

      if (flushTimerRef.current !== null) {
        if (targetDelay === flushDelayRef.current) return;
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      flushDelayRef.current = targetDelay;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        flushRealtimeNotifications();
      }, targetDelay);
    };

    const handleNewNotification = (payload: {
      notification: AppNotification;
      count: number;
    }) => {
      pendingNotificationsRef.current.push(payload.notification);
      pendingCountRef.current = payload.count;
      scheduleRealtimeFlush();
    };

    socket.on('new-notification', handleNewNotification);
    listenersAttached.current = true;

    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingNotificationsRef.current = [];
      socket.off('new-notification', handleNewNotification);
      listenersAttached.current = false;
    };
  }, [isConnected, getSocket]);

  // On reconnect, refresh from API to recover any notifications missed while offline.
  useEffect(() => {
    if (!isConnected) return;
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isConnected, refresh]);

  /** Permanently clear all notifications */
  const markRead = useCallback(async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setCount(0);
    } catch {
      // Non-fatal
    }
  }, []);

  const deleteOne = useCallback(async (notificationId: string) => {
    if (!notificationId) return;
    try {
      const data = await deleteNotificationById(notificationId);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
      setCount(data.count);
    } catch {
      // Non-fatal
    }
  }, []);

  const clearConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    try {
      const data = await clearConversationNotifications(conversationId);
      setNotifications((prev) =>
        prev.filter((n) => {
          const nConversationId =
            (typeof n.conversationId === 'string' && n.conversationId) ||
            (typeof n.conversation_id === 'string' && n.conversation_id) ||
            (typeof n.chatId === 'string' && n.chatId) ||
            (typeof n.chat_id === 'string' && n.chat_id) ||
            '';
          return nConversationId !== conversationId;
        })
      );
      setCount(data.count);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/chat\/([^/?#]+)/);
    const conversationId = match?.[1];
    if (!conversationId) {
      clearedConversationRef.current = null;
      return;
    }
    if (clearedConversationRef.current === conversationId) return;
    clearedConversationRef.current = conversationId;
    const timer = window.setTimeout(() => {
      void clearConversation(conversationId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, clearConversation]);

  return (
    <NotificationContext.Provider value={{ notifications, count, markRead, deleteOne, clearConversation, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}
