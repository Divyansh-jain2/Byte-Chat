import { redis } from '../lib/redis.js';
import { hashOTP, hashToken } from '../utils/otp.util.js';

const OTP_TTL_SECONDS = 15 * 60;
const RESET_TOKEN_TTL_SECONDS = 10 * 60;

const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_MAX_SEND_ATTEMPTS = 4;

type OtpPurpose = 'signup' | 'password_reset';

type CachedOtpPayload = {
  userId: string;
  otpHash: string;
  createdAt: number;
};

function normalizeRollNo(rollNo: string): string {
  return rollNo.trim().toUpperCase();
}

function otpKey(purpose: OtpPurpose, rollNo: string): string {
  return `auth:otp:${purpose}:${normalizeRollNo(rollNo)}`;
}

function verifyAttemptsKey(purpose: OtpPurpose, rollNo: string): string {
  return `auth:otp:attempts:${purpose}:${normalizeRollNo(rollNo)}`;
}

function sendAttemptsKey(purpose: OtpPurpose, rollNo: string): string {
  return `auth:otp:send:${purpose}:${normalizeRollNo(rollNo)}`;
}

function sendAttemptsByIpKey(purpose: OtpPurpose, ipAddress: string): string {
  return `auth:otp:send-ip:${purpose}:${ipAddress}`;
}

function resetTokenKey(token: string): string {
  return `auth:password-reset:token:${hashToken(token)}`;
}

export async function getOtpSendAttempts(purpose: OtpPurpose, rollNo: string): Promise<number> {
  const value = await redis.get(sendAttemptsKey(purpose, rollNo));
  return Number(value ?? 0);
}

export async function incrementOtpSendAttempts(
  purpose: OtpPurpose,
  rollNo: string,
  ipAddress: string,
): Promise<{ rollAttempts: number; ipAttempts: number }> {
  const rollKey = sendAttemptsKey(purpose, rollNo);
  const ipKey = sendAttemptsByIpKey(purpose, ipAddress);

  const [rollAttempts, ipAttempts] = await Promise.all([
    redis.incr(rollKey),
    redis.incr(ipKey),
  ]);

  if (rollAttempts === 1) {
    await redis.expire(rollKey, OTP_TTL_SECONDS);
  }
  if (ipAttempts === 1) {
    await redis.expire(ipKey, OTP_TTL_SECONDS);
  }

  return {
    rollAttempts,
    ipAttempts,
  };
}

export function isOtpSendRateLimited(attempts: { rollAttempts: number; ipAttempts: number }): boolean {
  return attempts.rollAttempts > OTP_MAX_SEND_ATTEMPTS || attempts.ipAttempts > OTP_MAX_SEND_ATTEMPTS * 2;
}

export async function storeOtp(purpose: OtpPurpose, rollNo: string, userId: string, otp: string): Promise<void> {
  const payload: CachedOtpPayload = {
    userId,
    otpHash: hashOTP(otp),
    createdAt: Date.now(),
  };

  await redis.set(otpKey(purpose, rollNo), JSON.stringify(payload), 'EX', OTP_TTL_SECONDS);
  await redis.del(verifyAttemptsKey(purpose, rollNo));
}

export async function clearOtp(purpose: OtpPurpose, rollNo: string): Promise<void> {
  await redis.del(otpKey(purpose, rollNo), verifyAttemptsKey(purpose, rollNo));
}

export async function getOtpRecord(purpose: OtpPurpose, rollNo: string): Promise<CachedOtpPayload | null> {
  const raw = await redis.get(otpKey(purpose, rollNo));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CachedOtpPayload;
  } catch {
    return null;
  }
}

export async function getOtpVerifyAttempts(purpose: OtpPurpose, rollNo: string): Promise<number> {
  const value = await redis.get(verifyAttemptsKey(purpose, rollNo));
  return Number(value ?? 0);
}

export async function incrementOtpVerifyAttempts(purpose: OtpPurpose, rollNo: string): Promise<number> {
  const key = verifyAttemptsKey(purpose, rollNo);
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, OTP_TTL_SECONDS);
  }
  return attempts;
}

export function isOtpVerifyRateLimited(attempts: number): boolean {
  return attempts >= OTP_MAX_VERIFY_ATTEMPTS;
}

export async function matchesOtp(
  purpose: OtpPurpose,
  rollNo: string,
  userId: string,
  otp: string,
): Promise<{ valid: boolean; missing: boolean }> {
  const record = await getOtpRecord(purpose, rollNo);
  if (!record) {
    return { valid: false, missing: true };
  }

  if (record.userId !== userId) {
    return { valid: false, missing: false };
  }

  return {
    valid: record.otpHash === hashOTP(otp),
    missing: false,
  };
}

export async function storePasswordResetToken(
  token: string,
  userId: string,
  rollNo: string,
): Promise<void> {
  await redis.set(
    resetTokenKey(token),
    JSON.stringify({ userId, rollNo: normalizeRollNo(rollNo), createdAt: Date.now() }),
    'EX',
    RESET_TOKEN_TTL_SECONDS,
  );
}

export async function consumePasswordResetToken(
  token: string,
  userId: string,
  rollNo: string,
): Promise<boolean> {
  const key = resetTokenKey(token);
  const raw = await redis.get(key);
  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as { userId: string; rollNo: string };
    if (parsed.userId !== userId || parsed.rollNo !== normalizeRollNo(rollNo)) {
      return false;
    }
  } catch {
    return false;
  }

  await redis.del(key);
  return true;
}

export async function clearPasswordResetState(rollNo: string): Promise<void> {
  await redis.del(otpKey('password_reset', rollNo), verifyAttemptsKey('password_reset', rollNo));
}

export function otpExpirySeconds(): number {
  return OTP_TTL_SECONDS;
}
