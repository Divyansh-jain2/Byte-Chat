import crypto from 'crypto';
import { config } from '../config/index.js';

/**
 * Generate 6-digit OTP
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash OTP using SHA256
 */
export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Get OTP expiry timestamp
 */
export function getOTPExpiry(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + config.otp.expiryMinutes);
  return now;
}

/**
 * Generate random refresh token (128 chars)
 */
export function generateRandomToken(length: number = 128): string {
  return crypto.randomBytes(length / 2).toString('hex');
}

/**
 * Hash token using SHA256
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
