import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { ApiError } from '../utils/error.util.js';
import { getSession, updateLastActivity } from '../services/session.service.js';
import { query } from '../lib/db.js';
import {
  cacheTokenValidation,
  getCachedTokenValidation,
  getUserAuthVersion,
  getUserPermissionSetCached,
  getUserTokenRevokeAfter,
  isTokenBlacklisted,
} from '../services/authCache.service.js';
import type { TokenPayload } from '../types/auth.types.js';

interface JwtPayload {
  userId: string;
  rollNo: string;
}

interface AuthenticatedPermissions {
  globalPermissions: string[];
  groupRoles: Array<{ groupId: string; isAdmin: boolean; isOwner: boolean }>;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      session?: any;
      permissions?: AuthenticatedPermissions;
    }
  }
}

function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return undefined;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

function getTokenTtlSeconds(payload: TokenPayload): number {
  if (typeof payload.exp === 'number') {
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) return Math.min(ttl, 300);
  }
  return 60;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(req);
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
      if (await isTokenBlacklisted(token)) {
        return next(new ApiError(401, 'Token has been revoked'));
      }

      const cached = await getCachedTokenValidation(token);
      if (cached) {
        const [currentAuthVersion, revokeAfter] = await Promise.all([
          getUserAuthVersion(cached.userId),
          getUserTokenRevokeAfter(cached.userId),
        ]);
        const tokenIssuedAt = typeof cached.iat === 'number' ? cached.iat : 0;

        if (cached.authVersion !== currentAuthVersion || tokenIssuedAt < revokeAfter) {
          return next(new ApiError(401, 'Token has been revoked'));
        }

        req.user = { userId: cached.userId, rollNo: cached.rollNo };
        const permissionSet = await getUserPermissionSetCached(cached.userId);
        req.permissions = {
          globalPermissions: permissionSet.globalPermissions,
          groupRoles: permissionSet.groupRoles,
        };
        return next();
      }

      let decoded: TokenPayload;
      try {
        decoded = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
      } catch (err: any) {
        if (err?.name === 'TokenExpiredError') {
          return next(new ApiError(401, 'Token expired'));
        }
        return next(new ApiError(403, 'Invalid token'));
      }

      if (decoded.type !== 'access') {
        return next(new ApiError(403, 'Invalid token type'));
      }

      const userResult = await query<{
        user_id: string;
        roll_no: string;
        is_active: boolean;
      }>(
        `SELECT user_id, roll_no, is_active
         FROM users
         WHERE user_id = $1`,
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return next(new ApiError(401, 'User account is inactive'));
      }

      const userRow = userResult.rows[0];
      if (!userRow) {
        return next(new ApiError(401, 'User account is inactive'));
      }

      if (!userRow.is_active) {
        return next(new ApiError(401, 'User account is inactive'));
      }

      if (String(userRow.roll_no).toUpperCase() !== String(decoded.rollNo).toUpperCase()) {
        return next(new ApiError(403, 'Invalid token payload'));
      }

      const revokeAfter = await getUserTokenRevokeAfter(decoded.userId);
      const tokenIssuedAt = typeof decoded.iat === 'number' ? decoded.iat : 0;
      if (tokenIssuedAt < revokeAfter) {
        return next(new ApiError(401, 'Token has been revoked'));
      }

      await cacheTokenValidation(token, decoded, getTokenTtlSeconds(decoded));

      req.user = { userId: decoded.userId, rollNo: decoded.rollNo };
      const permissionSet = await getUserPermissionSetCached(decoded.userId);
      req.permissions = {
        globalPermissions: permissionSet.globalPermissions,
        groupRoles: permissionSet.groupRoles,
      };
      return next();
    }

    return next(new ApiError(401, 'Access token or Session ID required'));
  }
  catch (error) {
    console.log(' Auth middleware error:', error);
    next(error);
  }
};
