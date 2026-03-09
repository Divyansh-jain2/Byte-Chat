import { redis } from "../lib/redis.js";

/**
 * Maps a userId to its socketId(s) and vice versa.
 * Supports multi-device logins by storing socketIds in a Set for each user.
 */
export async function mapUserSocket(userId: string, socketId: string) {
    await redis.sadd(`user_socket:${userId}`, socketId);
    await redis.set(`socket_user:${socketId}`, userId);
}

/**
 * Gets all active socketIds for a given userId.
 */
export async function getUserSockets(userId: string): Promise<string[]> {
    return await redis.smembers(`user_socket:${userId}`);
}

/**
 * Gets the userId associated with a given socketId.
 */
export async function getSocketUser(socketId: string) {
    return await redis.get(`socket_user:${socketId}`);
}

/**
 * Removes a socket mapping and cleans up the user's socket Set.
 */
export async function removeSocketMapping(socketId: string) {
    const userId = await getSocketUser(socketId);

    if (userId) {
        await redis.srem(`user_socket:${userId}`, socketId);

        // Check if user has no more active sockets
        const activeSockets = await redis.scard(`user_socket:${userId}`);
        if (activeSockets === 0) {
            await redis.del(`user_socket:${userId}`);
        }
    }

    await redis.del(`socket_user:${socketId}`);
}
