import { createHash } from 'crypto';
import type { TokenPayload } from '../types/auth.types.js';
import { query } from '../lib/db.js';
import { redis } from '../lib/redis.js';

type CachedTokenValidation = {
  userId: string;
  rollNo: string;
  type: 'access';
  iat?: number;
  exp?: number;
  authVersion: number;
};

type UserPermissionSet = {
  userId: string;
  globalPermissions: string[];
  groupRoles: Array<{ groupId: string; isAdmin: boolean; isOwner: boolean }>;
  computedAt: string;
};

const TOKEN_VALIDATION_TTL_SECONDS = 300;
const PERMISSION_CACHE_TTL_SECONDS = 180;
const AUTH_METRICS_KEY = 'auth:metrics:counters';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function tokenHash(token: string): string {
  return sha256(token);
}

function tokenValidationKey(token: string): string {
  return `auth:token:validation:${tokenHash(token)}`;
}

function tokenBlacklistKey(token: string): string {
  return `auth:token:blacklist:${tokenHash(token)}`;
}

function permissionKey(userId: string): string {
  return `auth:permissions:user:${userId}`;
}

function userAuthVersionKey(userId: string): string {
  return `auth:user:auth_version:${userId}`;
}

function userTokenRevokeAfterKey(userId: string): string {
  return `auth:user:revoke_after:${userId}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function incrementAuthMetric(field: string, by = 1): Promise<void> {
  try {
    await redis
      .multi()
      .hincrby(AUTH_METRICS_KEY, field, by)
      .hset(AUTH_METRICS_KEY, 'last_updated_at', new Date().toISOString())
      .exec();
  } catch {
    // Fail open.
  }
}

export async function getCachedTokenValidation(token: string): Promise<CachedTokenValidation | null> {
  try {
    const raw = await redis.get(tokenValidationKey(token));
    if (!raw) {
      await incrementAuthMetric('token_validation_cache_miss');
      return null;
    }

    const parsed = JSON.parse(raw) as CachedTokenValidation;
    if (!parsed?.userId || !parsed?.rollNo || parsed.type !== 'access') {
      await incrementAuthMetric('token_validation_cache_corrupt');
      return null;
    }

    await incrementAuthMetric('token_validation_cache_hit');
    return parsed;
  } catch {
    await incrementAuthMetric('token_validation_cache_error');
    return null;
  }
}

export async function cacheTokenValidation(token: string, payload: TokenPayload, ttlSeconds?: number): Promise<void> {
  if (payload.type !== 'access') return;

  try {
    const authVersion = await getUserAuthVersion(payload.userId);
    const normalizedTtl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : TOKEN_VALIDATION_TTL_SECONDS;

    const data: CachedTokenValidation = {
      userId: payload.userId,
      rollNo: payload.rollNo,
      type: 'access',
      authVersion,
    };

    if (typeof payload.iat === 'number') {
      data.iat = payload.iat;
    }
    if (typeof payload.exp === 'number') {
      data.exp = payload.exp;
    }

    await redis.set(tokenValidationKey(token), JSON.stringify(data), 'EX', normalizedTtl);
    await incrementAuthMetric('token_validation_cache_write');
  } catch {
    // Fail open: auth cache should not break login path.
  }
}

export async function blacklistToken(token: string, ttlSeconds: number, reason?: string): Promise<void> {
  if (!token || ttlSeconds <= 0) return;

  try {
    const value = JSON.stringify({
      blacklistedAt: new Date().toISOString(),
      reason: reason || 'revoked',
    });
    await redis.set(tokenBlacklistKey(token), value, 'EX', ttlSeconds);
    await incrementAuthMetric('token_blacklist_write');
  } catch {
    // Fail open.
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const exists = await redis.exists(tokenBlacklistKey(token));
    await incrementAuthMetric(exists === 1 ? 'token_blacklist_hit' : 'token_blacklist_miss');
    return exists === 1;
  } catch {
    await incrementAuthMetric('token_blacklist_error');
    return false;
  }
}

export async function getUserAuthVersion(userId: string): Promise<number> {
  try {
    const raw = await redis.get(userAuthVersionKey(userId));
    return toNumber(raw, 0);
  } catch {
    return 0;
  }
}

export async function bumpUserAuthVersion(userId: string): Promise<number> {
  try {
    const value = await redis.incr(userAuthVersionKey(userId));
    await incrementAuthMetric('user_auth_version_bump');
    return value;
  } catch {
    return 0;
  }
}

export async function setUserTokenRevokeAfterNow(userId: string): Promise<number> {
  const nowEpoch = Math.floor(Date.now() / 1000);
  try {
    await redis.set(userTokenRevokeAfterKey(userId), String(nowEpoch));
    await bumpUserAuthVersion(userId);
  } catch {
    // Fail open.
  }
  return nowEpoch;
}

export async function getUserTokenRevokeAfter(userId: string): Promise<number> {
  try {
    const raw = await redis.get(userTokenRevokeAfterKey(userId));
    return toNumber(raw, 0);
  } catch {
    return 0;
  }
}

export async function getUserPermissionSetCached(userId: string): Promise<UserPermissionSet> {
  const key = permissionKey(userId);
  try {
    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached) as UserPermissionSet;
      if (parsed?.userId) {
        await incrementAuthMetric('permission_cache_hit');
        return parsed;
      }
    }
  } catch {
    // Continue to DB fallback.
  }

  await incrementAuthMetric('permission_cache_miss');

  const memberRows = await query<{
    group_id: string;
    is_admin: boolean;
    is_owner: boolean;
  }>(
    `SELECT group_id, is_admin, is_owner
     FROM group_members
     WHERE user_id = $1`,
    [userId]
  );

  const permissionSet: UserPermissionSet = {
    userId,
    globalPermissions: ['chat:read', 'chat:write', 'profile:read'],
    groupRoles: memberRows.rows.map((row) => ({
      groupId: row.group_id,
      isAdmin: !!row.is_admin,
      isOwner: !!row.is_owner,
    })),
    computedAt: new Date().toISOString(),
  };

  try {
    await redis.set(key, JSON.stringify(permissionSet), 'EX', PERMISSION_CACHE_TTL_SECONDS);
    await incrementAuthMetric('permission_cache_write');
  } catch {
    // Ignore cache write failure.
  }

  return permissionSet;
}

export async function invalidateUserPermissionCache(userId: string): Promise<void> {
  try {
    await redis.del(permissionKey(userId));
    await incrementAuthMetric('permission_cache_invalidate');
  } catch {
    // Ignore invalidation failure.
  }
}

export async function getAuthCacheMetrics(): Promise<Record<string, string>> {
  try {
    const metrics = await redis.hgetall(AUTH_METRICS_KEY);
    return metrics;
  } catch {
    return {};
  }
}
