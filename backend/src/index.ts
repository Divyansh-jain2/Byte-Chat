import express from 'express';
import type { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
import profileRoutes from './routes/profile.routes.js';
import anonymousRoutes from './routes/anonymous.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import chatRoutes from './routes/chat.routes.js';
import anonymousChatRoutes from './routes/anonymous-chat.routes.js';
import { errorHandler } from './utils/error.util.js';
import { initializeSocket } from './socket/index.js';

const app: Express = express();
const httpServer = createServer(app);

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
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/anonymous', anonymousRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/anonymous-chat', anonymousChatRoutes); // Separate anonymous chat routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
});

export default app;
