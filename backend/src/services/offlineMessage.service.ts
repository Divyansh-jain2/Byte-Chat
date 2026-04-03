import { redis } from "../lib/redis.js";

const OFFLINE_LIMIT = 100;
const OFFLINE_QUEUE_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Queues a message for an offline user.
 */
export async function queueOfflineMessage(userId: string, message: any, dedupeToken?: string) {
    if (dedupeToken) {
        const dedupeKey = `offline_dedupe:${userId}:${dedupeToken}`;
        const isNew = await redis.set(dedupeKey, "1", "EX", OFFLINE_QUEUE_TTL_SECONDS, "NX");
        if (isNew !== "OK") {
            return;
        }
    }

    const key = `offline_messages:${userId}`;

    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, OFFLINE_LIMIT - 1);
    await redis.expire(key, OFFLINE_QUEUE_TTL_SECONDS);
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
