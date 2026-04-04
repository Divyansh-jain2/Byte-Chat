'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface GroupPresence {
  onlineCount: number;
  totalMembers: number;
}

/**
 * useGroupPresence — returns the number of online members in a group.
 * Fetches initial count from the Redis-backed backend endpoint, then stays
 * up to date by listening to user-online / user-offline socket events and
 * re-fetching whenever membership changes.
 *
 * Usage:
 *   const { onlineCount, totalMembers } = useGroupPresence(groupId);
 */
export function useGroupPresence(groupId: string | null): GroupPresence {
  const [presence, setPresence] = useState<GroupPresence>({ onlineCount: 0, totalMembers: 0 });
  const { getSocket, isConnected } = useSocket();
  const listenersAttached = useRef(false);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}/online-count`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const json = await res.json();
      setPresence({
        onlineCount: json.data?.onlineCount ?? 0,
        totalMembers: json.data?.totalMembers ?? 0,
      });
    } catch {
      // Non-critical — fail silently
    }
  }, [groupId]);

  // Initial fetch
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Re-fetch when someone goes online/offline (debounced 400ms)
  useEffect(() => {
    if (!isConnected) return;
    const socket = getSocket();
    if (!socket || listenersAttached.current) return;

    const handleChange = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(fetchCount, 400);
    };

    socket.on('user-online', handleChange);
    socket.on('user-offline', handleChange);
    listenersAttached.current = true;

    return () => {
      socket.off('user-online', handleChange);
      socket.off('user-offline', handleChange);
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      listenersAttached.current = false;
    };
  }, [isConnected, getSocket, fetchCount]);

  return presence;
}
