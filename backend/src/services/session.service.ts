// --- Refresh Token Session Management in Redis ---
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export async function storeRefreshToken(userId: string, refreshTokenHash: string) {
    const key = `refresh:${refreshTokenHash}`;
    await redis.set(key, userId, 'EX', REFRESH_TOKEN_TTL);
}

export async function getRefreshTokenUser(refreshTokenHash: string): Promise<string | null> {
    const key = `refresh:${refreshTokenHash}`;
    const userId = await redis.get(key);
    return userId || null;
}

export async function deleteRefreshToken(refreshTokenHash: string) {
    const key = `refresh:${refreshTokenHash}`;
    await redis.del(key);
}
import { redis } from "../lib/redis.js";

const SESSION_TTL = 604800; // 7 days in seconds

export interface SessionData {
    userId: string;
    rollNo: string;
    email?: string;
    createdAt: string;
    lastActivity: string;
    ipAddress: string;
    userAgent: string;
}

/**
 * Creates a new session in Redis using a Hash
 */
export async function createSession(sessionId: string, data: Partial<SessionData>) {
    const key = `session:${sessionId}`;

    const sessionData = {
        userId: data.userId || "",
        rollNo: data.rollNo || "",
        email: data.email || "",
        createdAt: Date.now().toString(),
        lastActivity: Date.now().toString(),
        ipAddress: data.ipAddress || "unknown",
        userAgent: data.userAgent || "unknown",
    };

    await redis.hset(key, sessionData);
    await redis.expire(key, SESSION_TTL);
}

/**
 * Retrieves session data from Redis
 */
export async function getSession(sessionId: string) {
    const data = await redis.hgetall(`session:${sessionId}`);
    if (!data || Object.keys(data).length === 0) return null;
    return data;
}

/**
 * Deletes a session from Redis
 */
export async function deleteSession(sessionId: string) {
    return redis.del(`session:${sessionId}`);
}

/**
 * Updates the last activity timestamp for a session
 */
export async function updateLastActivity(sessionId: string) {
    return redis.hset(`session:${sessionId}`, "lastActivity", Date.now().toString());
}
