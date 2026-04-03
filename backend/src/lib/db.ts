// import pg from 'pg';
import * as pg from 'pg';
import { config } from '../config/index.js';
import { redis } from './redis.js';

const { Pool } = pg;

const DB_POOL_METRICS_KEY = 'metrics:db:pool';
const DB_FAILOVER_STATE_KEY = 'state:db:failover';

let dbPoolMonitorStarted = false;

async function markDatabaseState(
  status: 'healthy' | 'degraded',
  metadata?: { reason?: string; errorMessage?: string; queryDurationMs?: number },
): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    const updates: Record<string, string> = {
      status,
      last_state_change_at: nowIso,
      total_count: String(pool.totalCount),
      idle_count: String(pool.idleCount),
      waiting_count: String(pool.waitingCount),
    };

    if (metadata?.reason) {
      updates.last_reason = metadata.reason;
    }
    if (metadata?.errorMessage) {
      updates.last_error = metadata.errorMessage.slice(0, 300);
    }
    if (typeof metadata?.queryDurationMs === 'number') {
      updates.last_query_duration_ms = String(metadata.queryDurationMs);
    }

    await redis
      .multi()
      .hset(DB_POOL_METRICS_KEY, updates)
      .set(DB_FAILOVER_STATE_KEY, status === 'healthy' ? 'primary' : 'degraded', 'EX', 120)
      .exec();
  } catch {
    // Fail open. Monitoring should never break DB operations.
  }
}

async function writePoolSnapshotToRedis(reason = 'periodic'): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    await redis.hset(DB_POOL_METRICS_KEY, {
      total_count: String(pool.totalCount),
      idle_count: String(pool.idleCount),
      waiting_count: String(pool.waitingCount),
      last_snapshot_at: nowIso,
      last_reason: reason,
    });
  } catch {
    // Fail open.
  }
}

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: config.database.url,
  max: 50, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 seconds for initial connection
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
  void markDatabaseState('healthy', { reason: 'pool_connect' });
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  void markDatabaseState('degraded', {
    reason: 'pool_error',
    errorMessage: err instanceof Error ? err.message : String(err),
  });
});

pool.on('acquire', () => {
  void writePoolSnapshotToRedis('pool_acquire');
});

// // Helper function to execute queries
// export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
//   const start = Date.now();
//   try {
//     const res = await pool.query<T>(text, params);
//     const duration = Date.now() - start;
    
//     if (process.env.NODE_ENV === 'development') {
//       // console.log('Executed query:', { text, duration: `${duration}ms`, rows: res.rowCount });
//     }
    
//     return res;
//   } 
//   catch (error) {
//     console.error('Database query error:', { text, error });
//     throw error;
//   }
// }


export async function query<T extends pg.QueryResultRow = any>(
  text: string, params?: any[] ): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      // console.log('Executed query:', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    
    if (duration > 1500) {
      void writePoolSnapshotToRedis('slow_query');
    }
    void markDatabaseState('healthy', { reason: 'query_ok', queryDurationMs: duration });

    return res;
  } 
  catch (error) {
    console.error('Database query error:', { text, error });
    void markDatabaseState('degraded', {
      reason: 'query_error',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function startDbPoolMonitor(intervalMs = 10000): void {
  if (dbPoolMonitorStarted) return;
  dbPoolMonitorStarted = true;

  const safeIntervalMs = Number.isFinite(intervalMs) && intervalMs >= 3000 ? intervalMs : 10000;

  setInterval(() => {
    void writePoolSnapshotToRedis('periodic');
  }, safeIntervalMs);

  void markDatabaseState('healthy', { reason: 'monitor_start' });
}

export async function getDbFailoverState(): Promise<'primary' | 'degraded' | 'unknown'> {
  try {
    const state = await redis.get(DB_FAILOVER_STATE_KEY);
    if (state === 'primary' || state === 'degraded') {
      return state;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function getDbPoolMetrics(): Promise<Record<string, string>> {
  try {
    const metrics = await redis.hgetall(DB_POOL_METRICS_KEY);
    return metrics;
  } catch {
    return {};
  }
}

// Graceful shutdown
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}
