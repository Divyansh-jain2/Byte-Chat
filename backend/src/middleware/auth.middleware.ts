import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { ApiError } from '../utils/error.util.js';

interface JwtPayload {
  userId: string;
  rollNo: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return next(new ApiError(401, 'Access token required'));
    }

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
  } catch (error) {
    next(error);
  }
};
