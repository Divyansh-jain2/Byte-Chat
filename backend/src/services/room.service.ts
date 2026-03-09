import { redis } from "../lib/redis.js";

/**
 * Adds a socket to a specific chat room set.
 */
export async function joinRoom(chatId: string, socketId: string) {
  await redis.sadd(`room:${chatId}`, socketId);
}

/**
 * Removes a socket from a specific chat room set.
 */
export async function leaveRoom(chatId: string, socketId: string) {
  await redis.srem(`room:${chatId}`, socketId);
}

/**
 * Gets all active socket IDs for a given chat room.
 */
export async function getRoomSockets(chatId: string): Promise<string[]> {
  return await redis.smembers(`room:${chatId}`);
}

/**
 * Removes a socket from all chat room sets (used on disconnect).
 * Uses SCAN to find all room keys efficiently.
 */
export async function removeSocketFromAllRooms(socketId: string) {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "room:*", "COUNT", 100);
    cursor = nextCursor;
    
    for (const key of keys) {
      await redis.srem(key, socketId);
    }
  } while (cursor !== "0");
}
