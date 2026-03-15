const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = (path: string, options?: RequestInit) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
};

export interface AppNotification {
  type: string;
  groupId?: string;
  pollId?: string;
  pollType?: string;
  createdBy?: string;
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Fetches the current user's notifications and unread count from the backend (Redis-backed).
 */
export async function fetchNotifications(): Promise<{
  notifications: AppNotification[];
  count: number;
}> {
  const res = await api('/api/notifications');
  if (!res.ok) throw new Error('Failed to fetch notifications');
  const json = await res.json();
  return json.data;
}

/**
 * Resets the notification unread count to zero on the backend.
 */
export async function markNotificationsRead(): Promise<void> {
  const res = await api('/api/notifications/read', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark notifications as read');
}
