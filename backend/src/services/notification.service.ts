import { redis } from "../lib/redis.js";
import { pool } from "../lib/db.js";
import { randomUUID } from "node:crypto";

const MAX_NOTIFICATIONS = 50;
const TTL = 604800; // 7 days

type NotificationPayload = Record<string, any> & {
  notification_id?: string;
  timestamp?: number;
};

function listKeyForUser(userId: string) {
  return `notifications:${userId}`;
}

function countKeyForUser(userId: string) {
  return `notification_count:${userId}`;
}

function getConversationIdFromNotification(notification: Record<string, unknown>): string | undefined {
  const candidates = [notification.conversationId, notification.conversation_id, notification.chatId, notification.chat_id];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return undefined;
}

async function syncCountFromListLength(userId: string): Promise<number> {
  const listKey = listKeyForUser(userId);
  const countKey = countKeyForUser(userId);
  const length = await redis.llen(listKey);
  await redis.set(countKey, String(length));
  await redis.expire(countKey, TTL);
  return Number(length);
}

async function replaceListWithNotifications(userId: string, notifications: NotificationPayload[]): Promise<number> {
  const listKey = listKeyForUser(userId);

  await redis.del(listKey);
  if (notifications.length > 0) {
    await redis.rpush(listKey, ...notifications.map((n) => JSON.stringify(n)));
    await redis.expire(listKey, TTL);
  }

  return syncCountFromListLength(userId);
}

async function mirrorInsertSystemNotification(userId: string, notification: NotificationPayload) {
  try {
    await pool.query(
      `INSERT INTO system_notifications (notification_id, user_id, notification_type, title, body, data, is_read)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, FALSE)`,
      [
        notification.notification_id,
        userId,
        typeof notification.type === "string" ? notification.type : "notification",
        typeof notification.title === "string" ? notification.title : "Notification",
        typeof notification.message === "string" ? notification.message : "You have a new update.",
        JSON.stringify(notification),
      ]
    );
  } catch {
    // DB mirror is best-effort; Redis remains source of truth for speed.
  }
}

async function mirrorDeleteAllSystemNotifications(userId: string) {
  try {
    await pool.query(`DELETE FROM system_notifications WHERE user_id = $1`, [userId]);
  } catch {
    // Best-effort cleanup.
  }
}

async function mirrorDeleteOneSystemNotification(userId: string, notificationId: string) {
  try {
    await pool.query(
      `DELETE FROM system_notifications
       WHERE user_id = $1
         AND (notification_id = $2 OR data->>'notification_id' = $2)`,
      [userId, notificationId]
    );
  } catch {
    // Best-effort cleanup.
  }
}

async function mirrorDeleteConversationSystemNotifications(userId: string, conversationId: string) {
  try {
    await pool.query(
      `DELETE FROM system_notifications
       WHERE user_id = $1
         AND (
           data->>'conversationId' = $2
           OR data->>'conversation_id' = $2
           OR data->>'chatId' = $2
           OR data->>'chat_id' = $2
         )`,
      [userId, conversationId]
    );
  } catch {
    // Best-effort cleanup.
  }
}

/**
 * Pushes a notification to a user's notification list, increments their unread count,
 * and emits a real-time socket event to the user's personal room.
 */
export async function pushNotification(userId: string, notification: NotificationPayload) {
  const listKey = listKeyForUser(userId);
  const countKey = countKeyForUser(userId);

  // Add the timestamp to the notification if it doesn't have one
  const enrichedNotification = {
    ...notification,
    notification_id: notification.notification_id || randomUUID(),
    timestamp: notification.timestamp || Date.now()
  };

  // Push to list and maintain max size
  await redis.lpush(listKey, JSON.stringify(enrichedNotification));
  await redis.ltrim(listKey, 0, MAX_NOTIFICATIONS - 1);
  await redis.expire(listKey, TTL);

  // Increment unread count
  const newCount = await redis.incr(countKey);
  await redis.expire(countKey, TTL);

  await mirrorInsertSystemNotification(userId, enrichedNotification);

  // Emit real-time socket event to the user's personal room.
  // Lazy import avoids circular-dependency issues at module-load time.
  try {
    const { emitToUser } = await import("../socket/index.js");
    emitToUser(userId, "new-notification", {
      notification: enrichedNotification,
      count: newCount
    });
  } catch (socketErr) {
    // Socket not yet initialised (e.g. during startup) — non-fatal
    console.warn("[Notification] Could not emit socket event:", socketErr);
  }
}

/**
 * Retrieves the latest notifications for a user.
 */
export async function getNotifications(userId: string) {
  const listKey = listKeyForUser(userId);
  const items = await redis.lrange(listKey, 0, 19); // Get Top 20
  
  return items.map(i => JSON.parse(i));
}

/**
 * Retrieves the current unread notification count.
 */
export async function getNotificationCount(userId: string) {
  const key = countKeyForUser(userId);
  const count = await redis.get(key);
  
  return Number(count || 0);
}

/**
 * Permanently deletes all notifications for user from Redis and DB mirror.
 */
export async function clearAllNotifications(userId: string) {
  const listKey = listKeyForUser(userId);
  const countKey = countKeyForUser(userId);

  await redis.del(listKey);
  await redis.del(countKey);
  await mirrorDeleteAllSystemNotifications(userId);

  return 0;
}

/**
 * Permanently deletes one notification by id from Redis and DB mirror.
 */
export async function deleteNotificationById(userId: string, notificationId: string) {
  const listKey = listKeyForUser(userId);
  const rawItems = await redis.lrange(listKey, 0, -1);
  const parsed = rawItems
    .map((raw) => {
      try {
        return JSON.parse(raw) as NotificationPayload;
      } catch {
        return null;
      }
    })
    .filter((item): item is NotificationPayload => item !== null);

  const filtered = parsed.filter((item) => item.notification_id !== notificationId);
  const deleted = filtered.length !== parsed.length;

  const count = await replaceListWithNotifications(userId, filtered);
  await mirrorDeleteOneSystemNotification(userId, notificationId);

  return { deleted, count };
}

/**
 * Deletes all notifications associated with a direct chat conversation.
 */
export async function clearConversationNotifications(userId: string, conversationId: string) {
  const listKey = listKeyForUser(userId);
  const rawItems = await redis.lrange(listKey, 0, -1);
  const parsed = rawItems
    .map((raw) => {
      try {
        return JSON.parse(raw) as NotificationPayload;
      } catch {
        return null;
      }
    })
    .filter((item): item is NotificationPayload => item !== null);

  const filtered = parsed.filter((item) => getConversationIdFromNotification(item) !== conversationId);
  const removed = parsed.length - filtered.length;

  const count = await replaceListWithNotifications(userId, filtered);
  await mirrorDeleteConversationSystemNotifications(userId, conversationId);

  return { removed, count };
}
