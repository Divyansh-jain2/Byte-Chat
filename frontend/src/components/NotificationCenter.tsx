'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useNotifications } from '@/contexts/NotificationContext';

const HIDDEN_PATH_PREFIXES = ['/login', '/signup'];
const HIDDEN_EXACT_PATHS = ['/', '/terms', '/privacy', '/contact', '/encryption'];

type NotificationMeta = {
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
};

function formatRelativeTime(timestamp: number): string {
  if (timestamp <= 0) return 'recently';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function notificationTitle(type: string): string {
  switch (type) {
    case 'group_invite':
      return 'Group invite';
    case 'new_message':
      return 'New message';
    case 'poll_created':
      return 'New poll';
    case 'poll_ended':
      return 'Poll ended';
    default:
      return 'Notification';
  }
}

function notificationBody(notification: Record<string, unknown>): string {
  if (typeof notification.message === 'string') return notification.message;
  if (typeof notification.groupName === 'string') return `Group: ${notification.groupName}`;
  if (typeof notification.groupId === 'string') return `Group ID: ${notification.groupId}`;
  return 'You have a new update.';
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function resolveNotificationMeta(notification: Record<string, unknown>): NotificationMeta {
  const type = asString(notification.type) || 'notification';
  const groupId = asString(notification.groupId) || asString(notification.group_id);
  const pollId = asString(notification.pollId) || asString(notification.poll_id);
  const conversationId =
    asString(notification.conversationId) ||
    asString(notification.conversation_id) ||
    asString(notification.chatId) ||
    asString(notification.chat_id);

  if (type === 'group_invite') {
    return {
      title: 'You were added to a group',
      body: 'Open the group to start chatting with members.',
      href: groupId ? `/groups/${groupId}/chat` : '/my-groups',
      actionLabel: 'Open Group Chat',
    };
  }

  if (type === 'admin_promoted') {
    return {
      title: 'You are now a group admin',
      body: 'You can now manage members and polls in this group.',
      href: groupId ? `/groups/${groupId}` : '/my-groups',
      actionLabel: 'Open Group',
    };
  }

  if (type === 'poll_created') {
    return {
      title: 'New poll in your group',
      body: 'Vote now before it expires.',
      href: groupId ? `/groups/${groupId}/chat${pollId ? `?pollId=${pollId}` : ''}` : '/my-groups',
      actionLabel: 'Open Poll',
    };
  }

  if (conversationId) {
    return {
      title: notificationTitle(type),
      body: notificationBody(notification),
      href: `/chat/${conversationId}`,
      actionLabel: 'Open Chat',
    };
  }

  if (groupId) {
    return {
      title: notificationTitle(type),
      body: notificationBody(notification),
      href: `/groups/${groupId}`,
      actionLabel: 'Open Group',
    };
  }

  return {
    title: notificationTitle(type),
    body: notificationBody(notification),
  };
}

export default function NotificationCenter() {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, count, markRead, deleteOne, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const isAuthed = typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'));

  const hidden = useMemo(() => {
    if (HIDDEN_EXACT_PATHS.includes(pathname)) return true;
    return HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  if (hidden || !isAuthed) return null;

  return (
    <div className="fixed right-5 top-20 z-50">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) void refresh();
          }}
          aria-label="Open notifications"
          className="h-11 w-11 rounded-2xl border shadow-md transition-all hover:scale-105"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--heading)'
          }}
        >
          🔔
        </button>

        {count > 0 && (
          <span
            className="absolute -right-2 -top-2 min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-bold text-white"
            style={{ background: 'var(--pink)' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>

      {open && (
        <div
          className="mt-3 w-[min(92vw,360px)] rounded-2xl border p-2 shadow-xl"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)'
          }}
        >
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>
              Notifications
            </p>
            <button
              type="button"
              onClick={() => void markRead()}
              className="text-xs font-medium"
              style={{ color: 'var(--purple)' }}
            >
              Delete all
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-xl px-3 py-4 text-sm" style={{ color: 'var(--muted)' }}>
              No notifications yet.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.slice(0, 20).map((n, idx) => {
                const type = typeof n.type === 'string' ? n.type : 'notification';
                const timestamp = typeof n.timestamp === 'number' ? n.timestamp : 0;
                const meta = resolveNotificationMeta(n as Record<string, unknown>);
                const notificationId = typeof n.notification_id === 'string' ? n.notification_id : undefined;
                return (
                  <li key={notificationId || `${type}-${timestamp}-${idx}`}>
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-black/5 disabled:cursor-default disabled:opacity-90"
                      disabled={!meta.href}
                      onClick={async () => {
                        if (notificationId) {
                          await deleteOne(notificationId);
                        }
                        if (!meta.href) return;
                        router.push(meta.href);
                        setOpen(false);
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                        {meta.title}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--body)' }}>
                        {meta.body}
                      </p>
                      <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                        {formatRelativeTime(timestamp)}
                      </p>
                      {meta.href && meta.actionLabel && (
                        <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--purple)' }}>
                          {meta.actionLabel} →
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
