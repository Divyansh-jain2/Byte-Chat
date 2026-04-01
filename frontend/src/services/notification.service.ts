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
  notification_id?: string;
  type: string;
  groupId?: string;
  group_id?: string;
  pollId?: string;
  poll_id?: string;
  pollType?: string;
  conversationId?: string;
  conversation_id?: string;
  chatId?: string;
  chat_id?: string;
  message?: string;
  groupName?: string;
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

export async function clearAllNotifications(): Promise<{ count: number }> {
  const res = await api('/api/notifications', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear notifications');
  const json = await res.json();
  return json.data || { count: 0 };
}

export async function deleteNotificationById(notificationId: string): Promise<{ deleted: boolean; count: number }> {
  const res = await api(`/api/notifications/${notificationId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete notification');
  const json = await res.json();
  return json.data || { deleted: false, count: 0 };
}

export async function clearConversationNotifications(conversationId: string): Promise<{ removed: number; count: number }> {
  const res = await api(`/api/notifications/conversation/${conversationId}/clear`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear conversation notifications');
  const json = await res.json();
  return json.data || { removed: 0, count: 0 };
}
