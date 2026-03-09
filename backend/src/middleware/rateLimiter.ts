import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";
import { ApiError } from "../utils/error.util.js";

const LIMIT = 100;
const WINDOW_SECONDS = 60;

/**
 * Rate limiting middleware using Redis counter
 * Key format: rate_limit:{userId}:{endpoint}:{minute}
 */
export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.userId || req.ip || "anonymous";
    const endpoint = req.path;
    const minute = Math.floor(Date.now() / 60000);

    const key = `rate_limit:${userId}:${endpoint}:${minute}`;

    try {
        const count = await redis.incr(key);

        if (count === 1) {
            await redis.expire(key, WINDOW_SECONDS);
        }

        if (count > LIMIT) {
            return next(new ApiError(429, "Too many requests. Please try again later."));
        }

        next();
    } catch (error) {
        console.error("Rate limiter error:", error);
        // Fail open if Redis is down, or you could fail closed
        next();
    }
}
