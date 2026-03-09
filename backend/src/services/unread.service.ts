import { redis } from "../lib/redis.js";

/**
 * Increments the unread count for a user in a specific chat.
 */
export async function incrementUnread(userId: string, chatId: string) {
    const key = `unread_counts:${userId}:${chatId}`;
    await redis.incr(key);
}

/**
 * Resets the unread count for a user in a specific chat to zero.
 */
export async function resetUnread(userId: string, chatId: string) {
    const key = `unread_counts:${userId}:${chatId}`;
    await redis.set(key, "0");
}

/**
 * Gets the current unread count for a user in a specific chat.
 */
export async function getUnread(userId: string, chatId: string): Promise<number> {
    const key = `unread_counts:${userId}:${chatId}`;
    const count = await redis.get(key);
    return parseInt(count || "0", 10);
}
