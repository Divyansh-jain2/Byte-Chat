import jwt from 'jsonwebtoken';
import type { SignOptions, Secret } from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { TokenPayload } from '../types/auth.types.js';

/**
 * Generate JWT access token (15 min expiry)
 */
export function generateAccessToken(userId: string, rollNo: string): string {
  const payload: TokenPayload = {
    userId,
    rollNo,
    type: 'access'
  };

  return jwt.sign(
    payload,
    config.jwt.accessSecret as Secret,
    { expiresIn: config.jwt.accessExpiry as SignOptions['expiresIn'] } as SignOptions
  );
}

/**
 * Generate JWT refresh token (7 days expiry)
 */
export function generateRefreshToken(userId: string, rollNo: string): string {
  const payload: TokenPayload = {
    userId,
    rollNo,
    type: 'refresh'
  };

  return jwt.sign(
    payload,
    config.jwt.refreshSecret as Secret,
    { expiresIn: config.jwt.refreshExpiry as SignOptions['expiresIn'] } as SignOptions
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}
