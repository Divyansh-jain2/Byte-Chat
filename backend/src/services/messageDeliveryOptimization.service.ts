import { createHash } from 'crypto';
import { redis } from '../lib/redis.js';

const MESSAGE_DEDUPE_TTL_SECONDS = 10 * 60;
const MESSAGE_KEY_CACHE_TTL_SECONDS = 30 * 60;

function dedupeKey(token: string): string {
  return `msg:dedupe:${token}`;
}

function sessionKeyCacheKey(sessionKeyId: string, userId: string): string {
  return `msg:key:${sessionKeyId}:${userId}`;
}

export function buildMessageDedupeToken(input: {
  scope: string;
  senderId: string;
  clientMessageId?: string;
  encryptedContent: string;
  contentIv: string;
  contentAuthTag: string;
  parentMessageId?: string;
  messageType?: string;
}): string {
  const base = input.clientMessageId
    ? `${input.scope}|${input.senderId}|${input.clientMessageId}`
    : `${input.scope}|${input.senderId}|${input.encryptedContent}|${input.contentIv}|${input.contentAuthTag}|${input.parentMessageId || ''}|${input.messageType || ''}`;

  return createHash('sha1').update(base).digest('hex');
}

export async function reserveMessageDedupToken(token: string): Promise<{ reserved: boolean; existingMessageId?: string }> {
  const key = dedupeKey(token);
  try {
    const wasSet = await redis.set(key, 'PENDING', 'EX', MESSAGE_DEDUPE_TTL_SECONDS, 'NX');
    if (wasSet === 'OK') {
      return { reserved: true };
    }

    const existing = await redis.get(key);
    if (existing && existing !== 'PENDING') {
      return { reserved: false, existingMessageId: existing };
    }

    return { reserved: false };
  } catch {
    // Fail open: on Redis issue, allow request path to continue.
    return { reserved: true };
  }
}

export async function completeMessageDedupToken(token: string, messageId: string): Promise<void> {
  try {
    await redis.set(dedupeKey(token), messageId, 'EX', MESSAGE_DEDUPE_TTL_SECONDS);
  } catch {
    // Fail open
  }
}

export async function getEncryptedSessionKeyCached(
  sessionKeyId: string,
  userId: string,
  loader: () => Promise<string | null>,
): Promise<string | null> {
  const key = sessionKeyCacheKey(sessionKeyId, userId);
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return cached;
    }
  } catch {
    // Ignore cache read errors.
  }

  const loaded = await loader();
  if (!loaded) {
    return null;
  }

  try {
    await redis.set(key, loaded, 'EX', MESSAGE_KEY_CACHE_TTL_SECONDS);
  } catch {
    // Ignore cache write errors.
  }

  return loaded;
}

export async function primeEncryptedSessionKeyCache(
  sessionKeyId: string,
  userId: string,
  encryptedKey: string,
): Promise<void> {
  try {
    await redis.set(sessionKeyCacheKey(sessionKeyId, userId), encryptedKey, 'EX', MESSAGE_KEY_CACHE_TTL_SECONDS);
  } catch {
    // Fail open
  }
}
