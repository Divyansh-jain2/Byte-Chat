import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

type InFlightEntry<T> = {
  promise: Promise<T>;
  startedAt: number;
};

const inFlightGetRequests = new Map<string, InFlightEntry<unknown>>();

function serializeParams(params: unknown): string {
  if (!params || typeof params !== 'object') {
    return '';
  }

  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${value.map((item) => String(item)).join(',')}`;
      }
      if (typeof value === 'object') {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${String(value)}`;
    })
    .join('&');
}

function buildGetRequestKey(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig,
  namespace = 'default',
): string {
  const baseUrl = client.defaults.baseURL ?? '';
  const params = serializeParams(config?.params);
  return `${namespace}|${baseUrl}|${url}|${params}`;
}

export function clearInFlightGetRequestDedupe(namespacePrefix?: string): void {
  if (!namespacePrefix) {
    inFlightGetRequests.clear();
    return;
  }

  for (const key of inFlightGetRequests.keys()) {
    if (key.startsWith(namespacePrefix)) {
      inFlightGetRequests.delete(key);
    }
  }
}

export async function dedupedGet<T>(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig,
  options?: { namespace?: string },
): Promise<AxiosResponse<T>> {
  const namespace = options?.namespace ?? 'default';
  const key = buildGetRequestKey(client, url, config, namespace);

  const existing = inFlightGetRequests.get(key) as InFlightEntry<AxiosResponse<T>> | undefined;
  if (existing) {
    return existing.promise;
  }

  const promise = client.get<T>(url, config);
  inFlightGetRequests.set(key, { promise, startedAt: Date.now() });

  try {
    return await promise;
  } finally {
    const current = inFlightGetRequests.get(key);
    if (current && current.promise === promise) {
      inFlightGetRequests.delete(key);
    }
  }
}

export function getInFlightGetDedupeStats(namespacePrefix?: string): { count: number; oldestMs: number } {
  const now = Date.now();
  const entries = Array.from(inFlightGetRequests.entries()).filter(([key]) =>
    namespacePrefix ? key.startsWith(namespacePrefix) : true,
  );

  if (entries.length === 0) {
    return { count: 0, oldestMs: 0 };
  }

  const oldestMs = Math.max(0, ...entries.map(([, value]) => now - value.startedAt));
  return { count: entries.length, oldestMs };
}
