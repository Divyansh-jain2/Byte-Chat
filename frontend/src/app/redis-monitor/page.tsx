'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type RedisSnapshotEntry = {
  key: string;
  type: string;
  ttlSeconds: number;
  valuePreview: unknown;
};

type RedisSnapshotResponse = {
  success: boolean;
  data?: {
    snapshotAt: string;
    pattern: string;
    limit: number;
    totalKeys: number;
    entries: RedisSnapshotEntry[];
  };
  message?: string;
};

type DiffEvent = {
  at: string;
  kind: 'added' | 'updated' | 'removed';
  key: string;
};

const API_URL = 'http://localhost:3001/debug/redis-snapshot';

function buildEntryFingerprint(entry: RedisSnapshotEntry): string {
  return JSON.stringify({
    type: entry.type,
    ttlSeconds: entry.ttlSeconds,
    valuePreview: entry.valuePreview,
  });
}

export default function RedisMonitorPage() {
  const [password, setPassword] = useState('');
  const [pattern, setPattern] = useState('*');
  const [limit, setLimit] = useState(200);
  const [intervalMs, setIntervalMs] = useState(2000);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [entries, setEntries] = useState<RedisSnapshotEntry[]>([]);
  const [events, setEvents] = useState<DiffEvent[]>([]);

  const prevFingerprintsRef = useRef<Map<string, string>>(new Map());

  const fetchSnapshot = useCallback(async () => {
    if (!password) {
      setError('Enter debug password first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}?pattern=${encodeURIComponent(pattern || '*')}&limit=${limit}`, {
        headers: {
          'x-debug-password': password,
        },
      });

      const payload = await response.json() as RedisSnapshotResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || 'Failed to fetch Redis snapshot');
      }

      const nextEntries = payload.data.entries;
      setEntries(nextEntries);
      setSnapshotAt(payload.data.snapshotAt);

      const previous = prevFingerprintsRef.current;
      const next = new Map<string, string>();
      const nextEvents: DiffEvent[] = [];

      for (const entry of nextEntries) {
        const fingerprint = buildEntryFingerprint(entry);
        next.set(entry.key, fingerprint);

        if (!previous.has(entry.key)) {
          nextEvents.push({ at: payload.data.snapshotAt, kind: 'added', key: entry.key });
        } else if (previous.get(entry.key) !== fingerprint) {
          nextEvents.push({ at: payload.data.snapshotAt, kind: 'updated', key: entry.key });
        }
      }

      for (const prevKey of previous.keys()) {
        if (!next.has(prevKey)) {
          nextEvents.push({ at: payload.data.snapshotAt, kind: 'removed', key: prevKey });
        }
      }

      prevFingerprintsRef.current = next;

      if (nextEvents.length > 0) {
        setEvents((current) => [...nextEvents, ...current].slice(0, 300));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Redis snapshot';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [password, pattern, limit]);

  useEffect(() => {
    if (!isStreaming) return;

    void fetchSnapshot();
    const timer = setInterval(() => {
      void fetchSnapshot();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, intervalMs, fetchSnapshot]);

  const counts = useMemo(() => {
    const summary = { added: 0, updated: 0, removed: 0 };
    for (const event of events) {
      summary[event.kind] += 1;
    }
    return summary;
  }, [events]);

  const openDetachedWindow = () => {
    if (typeof window === 'undefined') return;
    window.open('/redis-monitor', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-mesh-warm px-5 py-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="glass-strong rounded-3xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--heading)' }}>Redis Live Monitor</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                Watch Redis keys in near real time while you continue using your app on other pages.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openDetachedWindow}
                className="px-4 py-2 rounded-xl text-sm font-semibold glass"
                style={{ color: 'var(--body)' }}
              >
                Open Detached Tab
              </button>
              <Link href="/dashboard" className="px-4 py-2 rounded-xl text-sm font-semibold btn-romance">Back to Dashboard</Link>
            </div>
          </div>
        </header>

        <section className="glass-strong rounded-3xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="password"
              placeholder="Debug password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-romance"
            />
            <input
              type="text"
              placeholder="Pattern (e.g. * or msg:*)"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="input-romance"
            />
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Math.min(Math.max(parseInt(e.target.value || '1', 10), 1), 500))}
              className="input-romance"
            />
            <input
              type="number"
              min={500}
              step={500}
              value={intervalMs}
              onChange={(e) => setIntervalMs(Math.max(parseInt(e.target.value || '500', 10), 500))}
              className="input-romance"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsStreaming((value) => !value)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold btn-romance"
              >
                {isStreaming ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setEvents([]);
                  prevFingerprintsRef.current = new Map();
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold glass"
                style={{ color: 'var(--body)' }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#10B981' }}>Added: {counts.added}</span>
            <span className="px-2 py-1 rounded-full" style={{ background: 'rgba(59,130,246,.12)', color: '#3B82F6' }}>Updated: {counts.updated}</span>
            <span className="px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,.12)', color: '#EF4444' }}>Removed: {counts.removed}</span>
            <span style={{ color: 'var(--muted)' }}>Last snapshot: {snapshotAt || 'not fetched yet'}</span>
            {loading && <span style={{ color: 'var(--muted)' }}>Refreshing...</span>}
          </div>

          {error && (
            <div className="mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 glass-strong rounded-3xl p-4">
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--heading)' }}>Current Keys ({entries.length})</h2>
            <div className="space-y-3 max-h-[68vh] overflow-auto pr-1">
              {entries.map((entry) => (
                <article key={entry.key} className="glass rounded-2xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold break-all" style={{ color: 'var(--heading)' }}>{entry.key}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,.15)', color: '#3B82F6' }}>{entry.type}</span>
                      <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(236,72,153,.15)', color: '#EC4899' }}>
                        TTL: {entry.ttlSeconds}
                      </span>
                    </div>
                  </div>
                  <pre className="mt-2 text-xs overflow-x-auto" style={{ color: 'var(--muted)' }}>
                    {JSON.stringify(entry.valuePreview, null, 2)}
                  </pre>
                </article>
              ))}
              {entries.length === 0 && (
                <div className="glass rounded-2xl p-6 text-sm" style={{ color: 'var(--muted)' }}>
                  No keys to display yet.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 glass-strong rounded-3xl p-4">
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--heading)' }}>Live Change Feed</h2>
            <div className="space-y-2 max-h-[68vh] overflow-auto pr-1">
              {events.map((event, idx) => (
                <div key={`${event.at}-${event.key}-${idx}`} className="glass rounded-xl p-2 text-xs">
                  <p className="font-semibold" style={{ color: event.kind === 'added' ? '#10B981' : event.kind === 'updated' ? '#3B82F6' : '#EF4444' }}>
                    {event.kind.toUpperCase()}
                  </p>
                  <p className="break-all" style={{ color: 'var(--body)' }}>{event.key}</p>
                  <p style={{ color: 'var(--muted)' }}>{event.at}</p>
                </div>
              ))}
              {events.length === 0 && (
                <div className="glass rounded-2xl p-6 text-sm" style={{ color: 'var(--muted)' }}>
                  No changes detected yet. Start the stream and interact with the app.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
