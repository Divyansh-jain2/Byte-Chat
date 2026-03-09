import { redis } from "../lib/redis.js";

const OFFLINE_LIMIT = 100;

/**
 * Queues a message for an offline user.
 */
export async function queueOfflineMessage(userId: string, message: any) {
    const key = `offline_messages:${userId}`;

    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, OFFLINE_LIMIT - 1);
}

/**
 * Retrieves and clears offline messages for a user.
 */
export async function getOfflineMessages(userId: string): Promise<any[]> {
    const key = `offline_messages:${userId}`;
    const messages = await redis.lrange(key, 0, -1);

    // Clear the queue after retrieving
    await redis.del(key);

    return messages.map((m) => JSON.parse(m)).reverse();
}
