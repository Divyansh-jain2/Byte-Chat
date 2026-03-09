import { redis } from "../lib/redis.js";

const ONLINE_USERS_KEY = "online_users";

/**
 * Adds a user to the global online set.
 */
export async function addOnlineUser(userId: string) {
    await redis.sadd(ONLINE_USERS_KEY, userId);
}

/**
 * Removes a user from the global online set.
 */
export async function removeOnlineUser(userId: string) {
    await redis.srem(ONLINE_USERS_KEY, userId);
}

/**
 * Checks if a user is currently online globally.
 */
export async function isUserOnline(userId: string): Promise<boolean> {
    const result = await redis.sismember(ONLINE_USERS_KEY, userId);
    return result === 1;
}

/**
 * Gets the total count of online users.
 */
export async function getOnlineUsersCount(): Promise<number> {
    return await redis.scard(ONLINE_USERS_KEY);
}

/**
 * Gets all online user IDs.
 */
export async function getOnlineUsers(): Promise<string[]> {
    return await redis.smembers(ONLINE_USERS_KEY);
}
