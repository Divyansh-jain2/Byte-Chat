import { Redis } from "ioredis";
import { config } from "../config/index.js";

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err: any) => {
  console.error("❌ Redis error:", err);
});

export async function connectRedis() {
  // ioredis connects automatically, but we can check status if needed
  if (redis.status === "wait") {
    await redis.connect();
  }
}
