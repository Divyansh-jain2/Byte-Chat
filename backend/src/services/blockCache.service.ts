import { redis } from '../lib/redis.js';
import { getCacheJSON, setCacheJSON } from '../utils/cache.util.js';

const BLOCK_LIST_TTL_SECONDS = 10 * 60;
const BLOCK_SET_TTL_SECONDS = 30 * 60;
const BLOCK_STATUS_TTL_SECONDS = 15 * 60;

function blockedListKey(userId: string): string {
  return `cache:block:list:${userId}`;
}

function blockedSetKey(userId: string): string {
  return `cache:block:set:${userId}`;
}

function blockedSetMarkerKey(userId: string): string {
  return `cache:block:set:marker:${userId}`;
}

function blockPairStatusKey(userA: string, userB: string): string {
  const [left, right] = userA < userB ? [userA, userB] : [userB, userA];
  return `cache:block:pair:${left}:${right}`;
}

export async function getBlockedUsersListCached<T>(userId: string): Promise<T | null> {
  return getCacheJSON<T>(blockedListKey(userId), 'blocked_users_list');
}

export async function setBlockedUsersListCached<T>(userId: string, rows: T): Promise<void> {
  await setCacheJSON(blockedListKey(userId), rows, BLOCK_LIST_TTL_SECONDS);
}

export async function invalidateBlockedUsersListCache(userId: string): Promise<void> {
  try {
    await redis.del(blockedListKey(userId));
  } catch {
    // Fail open
  }
}

export async function setBlockedUsersSet(userId: string, blockedUserIds: string[]): Promise<void> {
  const setKey = blockedSetKey(userId);
  const markerKey = blockedSetMarkerKey(userId);

  try {
    const multi = redis.multi();
    multi.del(setKey);

    if (blockedUserIds.length > 0) {
      multi.sadd(setKey, ...blockedUserIds.map(String));
      multi.expire(setKey, BLOCK_SET_TTL_SECONDS);
    }

    multi.set(markerKey, '1', 'EX', BLOCK_SET_TTL_SECONDS);
    await multi.exec();
  } catch {
    // Fail open
  }
}

export async function addBlockedUserToSet(userId: string, blockedUserId: string): Promise<void> {
  try {
    const setKey = blockedSetKey(userId);
    const markerKey = blockedSetMarkerKey(userId);
    await redis.multi()
      .sadd(setKey, String(blockedUserId))
      .expire(setKey, BLOCK_SET_TTL_SECONDS)
      .set(markerKey, '1', 'EX', BLOCK_SET_TTL_SECONDS)
      .exec();
  } catch {
    // Fail open
  }
}

export async function removeBlockedUserFromSet(userId: string, blockedUserId: string): Promise<void> {
  try {
    await redis.srem(blockedSetKey(userId), String(blockedUserId));
  } catch {
    // Fail open
  }
}

export async function isBlockedByUserCached(userId: string, blockedUserId: string): Promise<boolean | null> {
  const markerKey = blockedSetMarkerKey(userId);
  const setKey = blockedSetKey(userId);

  try {
    const marker = await redis.get(markerKey);
    if (!marker) {
      return null;
    }

    const isMember = await redis.sismember(setKey, String(blockedUserId));
    return isMember === 1;
  } catch {
    return null;
  }
}

export async function getEitherBlockedStatusCached(userA: string, userB: string): Promise<boolean | null> {
  try {
    const raw = await redis.get(blockPairStatusKey(userA, userB));
    if (raw === null) {
      return null;
    }
    return raw === '1';
  } catch {
    return null;
  }
}

export async function setEitherBlockedStatusCached(userA: string, userB: string, isBlocked: boolean): Promise<void> {
  try {
    await redis.set(blockPairStatusKey(userA, userB), isBlocked ? '1' : '0', 'EX', BLOCK_STATUS_TTL_SECONDS);
  } catch {
    // Fail open
  }
}
