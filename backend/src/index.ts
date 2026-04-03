import express from 'express';
import type { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { timingSafeEqual } from 'crypto';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import {
  getDbFailoverState,
  getDbPoolMetrics,
  pool,
  startDbPoolMonitor,
} from './lib/db.js';
import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
import profileRoutes from './routes/profile.routes.js';
import anonymousRoutes from './routes/anonymous.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import chatRoutes from './routes/chat.routes.js';
import anonymousChatRoutes from './routes/anonymous-chat.routes.js';
import groupRoutes from './routes/group.routes.js';
import blockReportRoutes from './routes/block-report.routes.js';
import messageManagementRoutes from './routes/message-management.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { errorHandler } from './utils/error.util.js';
import { initializeSocket } from './socket/index.js';
import { clearPollCache } from './services/pollCache.service.js';
import { startCacheMetricsLogger } from './utils/cache.util.js';

// Redis connection
import { connectRedis, redis } from './lib/redis.js';


const app: Express = express();
const httpServer = createServer(app);
const DB_POOL_DEBUG_PASSWORD = process.env.DB_POOL_DEBUG_PASSWORD || 'thisisthesecurestwaytoprotecthtesame';

function isDebugPasswordValid(candidate: string): boolean {
  const expectedBuffer = Buffer.from(DB_POOL_DEBUG_PASSWORD);
  const candidateBuffer = Buffer.from(candidate);

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, candidateBuffer);
}

type RedisSnapshotEntry = {
  key: string;
  type: string;
  ttlSeconds: number;
  valuePreview: unknown;
};

function truncateString(value: string, maxLength = 500): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...<truncated>`;
}

async function getRedisValuePreview(key: string, keyType: string): Promise<unknown> {
  switch (keyType) {
    case 'string': {
      const value = await redis.get(key);
      return typeof value === 'string' ? truncateString(value) : value;
    }
    case 'hash': {
      const value = await redis.hgetall(key);
      return value;
    }
    case 'list': {
      const value = await redis.lrange(key, 0, 50);
      return value.map((item) => truncateString(item));
    }
    case 'set': {
      const value = await redis.smembers(key);
      return value.slice(0, 50).map((item) => truncateString(item));
    }
    case 'zset': {
      const value = await redis.zrange(key, 0, 50, 'WITHSCORES');
      return value.map((item) => truncateString(item));
    }
    case 'stream': {
      const value = await redis.xrange(key, '-', '+', 'COUNT', 20);
      return value;
    }
    default:
      return null;
  }
}

async function buildRedisSnapshot(pattern: string, limit: number): Promise<RedisSnapshotEntry[]> {
  let cursor = '0';
  const discovered = new Set<string>();

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = nextCursor;
    for (const key of keys) {
      discovered.add(key);
      if (discovered.size >= limit) break;
    }
  } while (cursor !== '0' && discovered.size < limit);

  const selectedKeys = Array.from(discovered).slice(0, limit);
  const entries = await Promise.all(
    selectedKeys.map(async (key): Promise<RedisSnapshotEntry> => {
      try {
        const [keyType, ttlMs] = await Promise.all([
          redis.type(key),
          redis.pttl(key),
        ]);
        const ttlSeconds = ttlMs > 0 ? Math.floor(ttlMs / 1000) : ttlMs;
        const valuePreview = await getRedisValuePreview(key, keyType);
        return {
          key,
          type: keyType,
          ttlSeconds,
          valuePreview,
        };
      } catch (error) {
        return {
          key,
          type: 'unknown',
          ttlSeconds: -3,
          valuePreview: {
            error: error instanceof Error ? error.message : 'Unable to read key',
          },
        };
      }
    })
  );

  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

// Connect to Redis at server startup
connectRedis();
startCacheMetricsLogger();
startDbPoolMonitor();
// Redis test endpoint
app.get('/redis-test', async (req: Request, res: Response) => {
  try {
    await redis.set('test_key', 'hello_from_backend');
    const value = await redis.get('test_key');
    res.json({ redis_value: value });
  } catch (err) {
    res.status(500).json({ error: 'Redis error', details: (err as Error).message });
  }
});

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.frontendUrl,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased to 500 requests per windowMs for chat functionality
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for message polling (still applies globally)
    return req.path.includes('/messages') && req.method === 'GET';
  }
});

app.use(limiter);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
import { rateLimiter } from './middleware/rateLimiter.js';
app.use('/api', rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/anonymous', anonymousRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/anonymous-chat', anonymousChatRoutes); // Separate anonymous chat routes
app.use('/api/groups', groupRoutes); // Group routes
app.use('/api/moderation', blockReportRoutes); // Block and report routes
app.use('/api/messages', messageManagementRoutes); // Message management routes
app.use('/api/notifications', notificationRoutes); // Notifications

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const dbFailoverState = await getDbFailoverState();
  const status = dbFailoverState === 'degraded' ? 'degraded' : 'ok';

  res.status(200).json({
    status,
    timestamp: new Date().toISOString(),
    db: {
      failoverState: dbFailoverState,
    },
  });
});

// Debug endpoint for DB pool metrics stored in Redis.
// Disabled in production to avoid exposing internal runtime details.
app.get('/debug/db-pool-metrics', async (req: Request, res: Response) => {
  if (config.server.nodeEnv === 'production') {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }

  const passwordHeader = req.headers['x-debug-password'];
  const submittedPassword = typeof passwordHeader === 'string' ? passwordHeader : '';

  if (!isDebugPasswordValid(submittedPassword)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const [failoverState, metrics] = await Promise.all([
    getDbFailoverState(),
    getDbPoolMetrics(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      failoverState,
      metrics,
    },
  });
});

app.get('/debug/redis-snapshot', async (req: Request, res: Response) => {
  if (config.server.nodeEnv === 'production') {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }

  const passwordHeader = req.headers['x-debug-password'];
  const submittedPassword = typeof passwordHeader === 'string' ? passwordHeader : '';

  if (!isDebugPasswordValid(submittedPassword)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const patternRaw = typeof req.query.pattern === 'string' && req.query.pattern.trim() ? req.query.pattern.trim() : '*';
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 200;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

  try {
    const entries = await buildRedisSnapshot(patternRaw, limit);
    return res.status(200).json({
      success: true,
      data: {
        snapshotAt: new Date().toISOString(),
        pattern: patternRaw,
        limit,
        totalKeys: entries.length,
        entries,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to build Redis snapshot',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize Socket.io
export const io = initializeSocket(httpServer);

// Start server
const PORT = config.server.port;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${config.server.nodeEnv}`);
  console.log(`🌐 Frontend URL: ${config.cors.frontendUrl}`);
  console.log(`⚡ Socket.io initialized`);

  setInterval(async () => {
    try {
      // 1. Resolve active polls that have reached expires_at.
      // Majority wins; ties resolved via random() coin toss.
      const result = await pool.query<{
        poll_id: string;
        group_id: string;
        status: string;
        poll_type: string;
        target_user_id: string | null;
        is_executed: boolean;
        executed_at: Date | null;
        votes_for: number;
        votes_against: number;
        total_voters: number;
        title: string;
      }>(
        `UPDATE polls
         SET status = CASE 
               WHEN votes_for > votes_against THEN 'passed'::VARCHAR
               WHEN votes_against > votes_for THEN 'failed'::VARCHAR
               ELSE (CASE WHEN random() < 0.5 THEN 'passed'::VARCHAR ELSE 'failed'::VARCHAR END)
             END,
             updated_at = NOW()
         WHERE status = 'active' AND expires_at <= NOW()
         RETURNING *`
      );

      // 2. Notify clients and handle socket side-effects
      for (const poll of result.rows) {
        const roomId = `group:${poll.group_id}`;

        // Clear Redis cache when poll ends 
        try {
          await clearPollCache(poll.poll_id);
        } catch (redisErr) {
          console.error('[Poll Sweeper] Error clearing redis cache:', redisErr);
        }

        // Always notify the group that the poll state changed
        io.to(roomId).emit('poll-updated', poll);

        if (poll.status === 'passed' && poll.is_executed) {
          // If the poll passed, the DB trigger fn_execute_passed_poll already
          // handled the state change (kick/promote/etc.). Tell the clients.
          if (poll.poll_type === 'kick_member' && poll.target_user_id) {
            io.to(roomId).emit('member-removed', {
              group_id: poll.group_id,
              user_id: poll.target_user_id,
              reason: 'poll_vote_expiry',
              poll_id: poll.poll_id
            });
          }

          io.to(roomId).emit('poll-executed', {
            poll_id: poll.poll_id,
            group_id: poll.group_id,
            poll_type: poll.poll_type,
            executed_at: poll.executed_at,
          });
        }
      }

      if (result.rows.length > 0) {
        console.log(`[Poll Sweeper] Resolved ${result.rows.length} poll(s)`);
      }
    } catch (err) {
      console.error('[Poll Sweeper] Error resolving polls:', err);
    }
  }, 60_000); // every 60 seconds
});

export default app;
