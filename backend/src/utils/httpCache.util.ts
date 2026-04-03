import { createHash } from 'crypto';
import type { Request, Response } from 'express';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function sortObjectKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item as JsonValue));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, JsonValue>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, sortObjectKeys(nested)] as const);
    return Object.fromEntries(entries);
  }

  return value;
}

function buildWeakEtag(payload: unknown): string {
  const normalized = sortObjectKeys(payload as JsonValue);
  const hash = createHash('sha1').update(JSON.stringify(normalized)).digest('base64url').slice(0, 20);
  return `W/"${hash}"`;
}

function ifNoneMatchHasEtag(ifNoneMatchHeader: string | undefined, etag: string): boolean {
  if (!ifNoneMatchHeader) {
    return false;
  }

  if (ifNoneMatchHeader.trim() === '*') {
    return true;
  }

  return ifNoneMatchHeader
    .split(',')
    .map((token) => token.trim())
    .some((token) => token === etag);
}

export function sendConditionalJson(
  req: Request,
  res: Response,
  payload: unknown,
  options: {
    maxAgeSeconds: number;
    staleWhileRevalidateSeconds?: number;
    cacheStatus: 'HIT' | 'MISS';
  }
): void {
  const staleWhileRevalidate =
    options.staleWhileRevalidateSeconds ?? Math.max(5, Math.floor(options.maxAgeSeconds / 2));
  const etag = buildWeakEtag(payload);

  res.setHeader(
    'Cache-Control',
    `private, max-age=${options.maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}, must-revalidate`
  );
  res.setHeader('ETag', etag);
  res.setHeader('Vary', 'Authorization, Cookie');
  res.setHeader('X-Cache', options.cacheStatus);

  if (ifNoneMatchHasEtag(req.header('if-none-match'), etag)) {
    res.status(304).end();
    return;
  }

  res.json(payload);
}
