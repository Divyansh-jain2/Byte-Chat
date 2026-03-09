import { redis } from "../lib/redis.js";

const WS_AUTH_TTL = 30; // 30 seconds

/**
 * Stores temporary WebSocket authentication data in Redis
 */
export async function storeWsAuth(socketId: string, data: any) {
    const key = `ws_auth:${socketId}`;
    await redis.set(key, JSON.stringify(data), "EX", WS_AUTH_TTL);
}

/**
 * Retrieves WebSocket authentication data from Redis
 */
export async function getWsAuth(socketId: string) {
    const data = await redis.get(`ws_auth:${socketId}`);
    return data ? JSON.parse(data) : null;
}

/**
 * Deletes WebSocket authentication data from Redis
 */
export async function deleteWsAuth(socketId: string) {
    await redis.del(`ws_auth:${socketId}`);
}
