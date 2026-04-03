import { createHash } from 'crypto';
import { redis } from '../lib/redis.js';
import { getCacheJSON, setCacheJSON } from '../utils/cache.util.js';

const MESSAGE_PAGE_CACHE_PREFIX = 'cache:messages:page';
const MESSAGE_PAGE_VERSION_PREFIX = 'cache:messages:version';
const MESSAGE_PAGE_VERSION_TTL_SECONDS = 24 * 60 * 60;
const MESSAGE_PAGE_CACHE_METRIC = 'messages_page';

export const MESSAGE_PAGE_TTL_SECONDS = 10 * 60;

export interface CachedMessagePagePayload {
  messages: Array<Record<string, unknown>>;
  hasMore: boolean;
  nextCursor: string | null;
}

function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hashQuery(query: string): string {
  if (!query) {
    return 'none';
  }
  return createHash('sha1').update(query).digest('hex').slice(0, 12);
}

function getVersionKey(conversationId: string): string {
  return `${MESSAGE_PAGE_VERSION_PREFIX}:${conversationId}`;
}

export function buildMessagesPageCacheKey(params: {
  conversationId: string;
  userId: string;
  limit: number;
  before: string | null;
  searchQuery: string;
  version: number;
}): string {
  const normalizedQuery = normalizeSearchQuery(params.searchQuery);
  const beforeCursor = params.before ?? 'latest';
  const searchHash = hashQuery(normalizedQuery);

  return [
    MESSAGE_PAGE_CACHE_PREFIX,
    params.conversationId,
    params.userId,
    `v${params.version}`,
    `l${params.limit}`,
    `b:${beforeCursor}`,
    `q:${searchHash}`,
  ].join(':');
}

export async function getMessagesCacheVersion(conversationId: string): Promise<number> {
  try {
    const rawVersion = await redis.get(getVersionKey(conversationId));
    const parsed = Number(rawVersion ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function bumpMessagesCacheVersion(conversationId: string): Promise<void> {
  try {
    const versionKey = getVersionKey(conversationId);
    await redis.multi().incr(versionKey).expire(versionKey, MESSAGE_PAGE_VERSION_TTL_SECONDS).exec();
  } catch {
    // Fail open. Cache invalidation should not block message flows.
  }
}

export async function getCachedMessagesPage(cacheKey: string): Promise<CachedMessagePagePayload | null> {
  return getCacheJSON<CachedMessagePagePayload>(cacheKey, MESSAGE_PAGE_CACHE_METRIC);
}

export async function setCachedMessagesPage(
  cacheKey: string,
  payload: CachedMessagePagePayload,
): Promise<void> {
  await setCacheJSON(cacheKey, payload, MESSAGE_PAGE_TTL_SECONDS);
}
