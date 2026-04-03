import { redis } from '../lib/redis.js';

export const CACHE_TTL_SECONDS = {
  USER_PROFILE: 30 * 60,
  USER_SETTINGS: 30 * 60,
  USER_PUBLIC_KEYS: 30 * 60,
  USER_CONVERSATIONS: 15 * 60,
} as const;

export const cacheKeys = {
  userProfile: (userId: string) => `cache:user:profile:${userId}`,
  userProfileByRollNo: (rollNo: string) => `cache:user:profile:roll:${rollNo.toUpperCase()}`,
  userProfileStatus: (userId: string) => `cache:user:profile:status:${userId}`,
  userSettings: (userId: string) => `cache:user:settings:${userId}`,
  userConversations: (userId: string) => `cache:user:conversations:${userId}`,
  conversationPublicKeys: (conversationId: string) => `cache:e2ee:conversation:keys:${conversationId}`,
  groupPublicKeys: (groupId: string) => `cache:e2ee:group:keys:${groupId}`,
};

const CACHE_METRICS_HASH_KEY = 'metrics:cache:global';
const CACHE_METRICS_LOG_EVERY = 50;

let cacheMetricsLoggerStarted = false;
let lookupCounter = 0;

type CacheLookupResult = 'hit' | 'miss' | 'error';

function readRedisInfoValue(info: string, key: string): string {
  const line = info.split('\n').find((entry) => entry.startsWith(`${key}:`));
  return line?.split(':')[1]?.trim() ?? 'unknown';
}

async function trackCacheLookup(metricName: string, result: CacheLookupResult): Promise<void> {
  try {
    await redis.hincrby(CACHE_METRICS_HASH_KEY, 'lookups_total', 1);
    await redis.hincrby(CACHE_METRICS_HASH_KEY, `${result}_total`, 1);
    await redis.hincrby(CACHE_METRICS_HASH_KEY, `${metricName}:${result}`, 1);
  } catch {
    // Fail open - metrics should never impact API response path.
  }
}

export async function getCacheJSON<T>(key: string, metricName = 'default'): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    lookupCounter += 1;

    if (!raw) {
      void trackCacheLookup(metricName, 'miss');
      if (lookupCounter % CACHE_METRICS_LOG_EVERY === 0) {
        console.log(`[CACHE] MISS ${metricName} key=${key}`);
      }
      return null;
    }

    void trackCacheLookup(metricName, 'hit');
    if (lookupCounter % CACHE_METRICS_LOG_EVERY === 0) {
      console.log(`[CACHE] HIT ${metricName} key=${key}`);
    }

    return JSON.parse(raw) as T;
  } catch {
    void trackCacheLookup(metricName, 'error');
    return null;
  }
}

export async function setCacheJSON<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Fail open - cache issues should not block API responses
  }
}

export async function deleteCacheKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // Fail open - cache issues should not block API responses
  }
}

export async function invalidateUserProfileCache(userId: string, rollNo?: string): Promise<void> {
  const keys = [
    cacheKeys.userProfile(userId),
    cacheKeys.userProfileStatus(userId),
  ];

  if (rollNo) {
    keys.push(cacheKeys.userProfileByRollNo(rollNo));
  }

  await deleteCacheKeys(keys);
}

export function startCacheMetricsLogger(intervalMs = 5 * 60 * 1000): void {
  if (cacheMetricsLoggerStarted) return;
  cacheMetricsLoggerStarted = true;

  setInterval(async () => {
    try {
      const [lookupsRaw, hitsRaw, missesRaw, errorsRaw] = await redis.hmget(
        CACHE_METRICS_HASH_KEY,
        'lookups_total',
        'hit_total',
        'miss_total',
        'error_total'
      );

      const lookups = Number(lookupsRaw ?? 0);
      const hits = Number(hitsRaw ?? 0);
      const misses = Number(missesRaw ?? 0);
      const errors = Number(errorsRaw ?? 0);
      const hitRate = lookups > 0 ? ((hits / lookups) * 100).toFixed(2) : '0.00';
      const [memoryInfo, keyCount] = await Promise.all([
        redis.info('memory'),
        redis.dbsize(),
      ]);
      const usedMemoryHuman = readRedisInfoValue(memoryInfo, 'used_memory_human');

      console.log(
        `[CACHE_METRICS] lookups=${lookups} hits=${hits} misses=${misses} errors=${errors} hit_rate=${hitRate}% redis_keys=${keyCount} redis_memory=${usedMemoryHuman}`
      );
    } catch (error) {
      console.error('[CACHE_METRICS] Failed to read cache metrics:', error);
    }
  }, intervalMs);
}
