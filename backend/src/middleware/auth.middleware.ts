import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { ApiError } from '../utils/error.util.js';
import { getSession, updateLastActivity } from '../services/session.service.js';

interface JwtPayload {
  userId: string;
  rollNo: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      session?: any;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    // const sessionId = req.headers['x-session-id'] as string;
    const sessionId = typeof req.headers['x-session-id'] === 'string' ? req.headers['x-session-id'] : undefined;

    if (!token && !sessionId) {
      return next(new ApiError(401, 'Access token or Session ID required'));
    }

    // 1. Verify Session ID if provided
    if (sessionId) {
      const session = await getSession(sessionId);
      if (!session) {
        return next(new ApiError(401, 'Invalid or expired session'));
      }
      const sessionUserId = typeof session.userId === 'string' ? session.userId : undefined;
      const sessionRollNo = typeof session.rollNo === 'string' ? session.rollNo : undefined;
      if (!sessionUserId || !sessionRollNo) {
        return next(new ApiError(401, 'Invalid session payload'));
      }
      req.session = session;
      req.user = { userId: sessionUserId, rollNo: sessionRollNo };
      await updateLastActivity(sessionId);
      return next();
    }

    // 2. Fallback to JWT if no session ID
    if (token) {
      jwt.verify(token, config.jwt.accessSecret, (err, decoded) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return next(new ApiError(401, 'Token expired'));
          }
          return next(new ApiError(403, 'Invalid token'));
        }

        req.user = decoded as JwtPayload;
        next();
      });
    }
  }
  catch (error) {
    console.log(' Auth middleware error:', error);
    next(error);
  }
};
