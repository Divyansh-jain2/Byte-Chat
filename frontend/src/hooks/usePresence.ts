'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * usePresence — tracks which users are currently online.
 *
 * @param userIds   List of user IDs to watch (typically the "other" users in your conversation list).
 * @returns         A Set<string> of user IDs that are currently online.
 *
 * Usage:
 *   const onlineUsers = usePresence(['uuid-a', 'uuid-b']);
 *   onlineUsers.has('uuid-a') // true if online
 */
export function usePresence(userIds: string[]): Set<string> {
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const { getSocket, isConnected } = useSocket();
  const listenersAttached = useRef(false);

  // Fetch initial presence snapshot from Redis
  const fetchPresence = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userIds: ids }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const presence: Record<string, boolean> = json.data?.presence ?? {};
      const online = new Set<string>(
        Object.entries(presence)
          .filter(([, v]) => v)
          .map(([k]) => k)
      );
      setOnlineSet(online);
    } catch {
      // silently ignore network errors — not critical
    }
  }, []);

  // Fetch on mount / when the user list changes
  useEffect(() => {
    fetchPresence(userIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds.join(',')]);

  // Subscribe to real-time socket events
  useEffect(() => {
    if (!isConnected) return;
    const socket = getSocket();
    if (!socket || listenersAttached.current) return;

    const handleOnline = ({ userId }: { userId: string }) => {
      setOnlineSet((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    };

    const handleOffline = ({ userId }: { userId: string }) => {
      setOnlineSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('user-online', handleOnline);
    socket.on('user-offline', handleOffline);
    listenersAttached.current = true;

    return () => {
      socket.off('user-online', handleOnline);
      socket.off('user-offline', handleOffline);
      listenersAttached.current = false;
    };
  }, [isConnected, getSocket]);

  return onlineSet;
}
