import { redis } from "../lib/redis.js";

const MAX_NOTIFICATIONS = 50;
const TTL = 604800; // 7 days

/**
 * Pushes a notification to a user's notification list, increments their unread count,
 * and emits a real-time socket event to the user's personal room.
 */
export async function pushNotification(userId: string, notification: any) {
  const listKey = `notifications:${userId}`;
  const countKey = `notification_count:${userId}`;

  // Add the timestamp to the notification if it doesn't have one
  const enrichedNotification = {
    ...notification,
    timestamp: notification.timestamp || Date.now()
  };

  // Push to list and maintain max size
  await redis.lpush(listKey, JSON.stringify(enrichedNotification));
  await redis.ltrim(listKey, 0, MAX_NOTIFICATIONS - 1);
  await redis.expire(listKey, TTL);

  // Increment unread count
  const newCount = await redis.incr(countKey);
  await redis.expire(countKey, TTL);

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
  const listKey = `notifications:${userId}`;
  const items = await redis.lrange(listKey, 0, 19); // Get Top 20
  
  return items.map(i => JSON.parse(i));
}

/**
 * Retrieves the current unread notification count.
 */
export async function getNotificationCount(userId: string) {
  const key = `notification_count:${userId}`;
  const count = await redis.get(key);
  
  return Number(count || 0);
}

/**
 * Resets the unread notification count to zero.
 * To be called when the user opens the notification panel.
 */
export async function resetNotificationCount(userId: string) {
  const key = `notification_count:${userId}`;
  await redis.set(key, 0);
  await redis.expire(key, TTL); // Maintain TTL even when resetting
}
