import { redis } from "../lib/redis.js";

const CACHE_LIMIT = 50;
const CACHE_TTL = 3600; // 1 hour

/**
 * Caches a message in the recent messages list for a chat.
 */
export async function cacheMessage(chatId: string, message: any) {
    const key = `message_cache:${chatId}:recent`;

    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, CACHE_LIMIT - 1);
    await redis.expire(key, CACHE_TTL);
}

/**
 * Retrieves recently cached messages for a chat.
 */
export async function getCachedMessages(chatId: string, limit: number = 20): Promise<any[]> {
    const key = `message_cache:${chatId}:recent`;
    const messages = await redis.lrange(key, 0, limit - 1);

    return messages.map((m) => JSON.parse(m)).reverse();
}
