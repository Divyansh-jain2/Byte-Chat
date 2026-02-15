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

    // console.log('🔐 AUTH MIDDLEWARE:');
    // console.log('  - Endpoint:', req.method, req.path);
    // console.log('  - Auth Header:', authHeader ? 'Present' : 'Missing');
    // console.log('  - Token:', token ? `${token.substring(0, 20)}...` : 'Missing');

    if (!token) {
      // console.log(' No token provided');
      return next(new ApiError(401, 'Access token required'));
    }

    jwt.verify(token, config.jwt.accessSecret, (err, decoded) => {
      if (err) {
        console.log('Token verification failed:', err.name, err.message);
        if (err.name === 'TokenExpiredError') {
          return next(new ApiError(401, 'Token expired'));
        }
        return next(new ApiError(403, 'Invalid token'));
      }

      // console.log('  ✅ Token valid for user:', (decoded as JwtPayload).userId);
      req.user = decoded as JwtPayload;
      next();
    });
  } 
  catch (error) {
    console.log(' Auth middleware error:', error);
    next(error);
  }
};
