import { redis } from "../lib/redis.js";

const TYPING_TTL = 5; // 5 seconds

/**
 * Sets a typing indicator for a user in a specific chat.
 * Uses a short TTL so it auto-expires if the user stops typing.
 */
export async function setTyping(chatId: string, userId: string) {
    const key = `typing:${chatId}:${userId}`;
    await redis.set(key, Date.now().toString(), "EX", TYPING_TTL);
}

/**
 * Checks if a specific user is typing in a chat.
 */
export async function isTyping(chatId: string, userId: string): Promise<boolean> {
    const result = await redis.exists(`typing:${chatId}:${userId}`);
    return result === 1;
}

/**
 * List all user IDs currently typing in a specific chat.
 * Uses SCAN for efficiency.
 */
export async function getTypingUsers(chatId: string): Promise<string[]> {
    const pattern = `typing:${chatId}:*`;
    let cursor = "0";
    const typingUserIds: string[] = [];

    do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;

        for (const key of keys) {
            const parts = key.split(":");
            const userId = parts[2];
            if (userId) {
                typingUserIds.push(userId);
            }
        }
    } while (cursor !== "0");

    return typingUserIds;
}
