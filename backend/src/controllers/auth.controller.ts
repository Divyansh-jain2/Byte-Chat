import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { config } from '../config/index.js';

// Utils
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../utils/jwt.util.js';
import { hashPassword, verifyPassword } from '../utils/password.util.js';
import { generateOTP, hashToken, generateRandomToken } from '../utils/otp.util.js';
import { validateRollNumber, constructRollNumber, generateEmail, validatePassword, 
  validateName, validateBranch, validate5DigitRoll} from '../utils/validation.util.js';
import { sendOTPEmail } from '../utils/email.util.js';

// Services
import {isTokenBlacklisted, blacklistToken, setUserTokenRevokeAfterNow,
  invalidateUserPermissionCache} from '../services/authCache.service.js';
import {getSession, createSession, deleteSession, storeRefreshToken,
  getRefreshTokenUser, deleteRefreshToken} from '../services/session.service.js';
import {clearOtp, clearPasswordResetState, consumePasswordResetToken, incrementOtpSendAttempts,
  incrementOtpVerifyAttempts, isOtpSendRateLimited, isOtpVerifyRateLimited, matchesOtp,
  otpExpirySeconds, storeOtp, storePasswordResetToken} from '../services/authOtpCache.service.js';

// Types
import type {SignupRequest, VerifyOTPRequest, LoginRequest, ForgotPasswordRequest, 
  ResetPasswordRequest, TokenPayload} from '../types/auth.types.js';



// Helper: Extract bearer token from Authorization header
function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return undefined;
  const [scheme, token] = authHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}


// Helper: Get remaining TTL of a JWT token in seconds
function getTokenRemainingTtl(token: string): number {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    if (!decoded?.exp) return 3600;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(decoded.exp - now, 0);
  } catch {
    return 3600;
  }
}


// Helper: Set access token as HTTP-only cookie
function setAccessTokenCookie(res: Response, accessToken: string) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.server.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}


// CANCEL ALL SESSIONS (GLOBAL LOGOUT)
export async function cancelAllSessionsHandler(req: Request, res: Response) {
  try {
    const accessToken = getBearerToken(req) || req.cookies?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'No access token provided.' });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload || !payload.userId) {
      return res.status(401).json({ success: false, message: 'Invalid access token.' });
    }

    // Revoke all tokens by bumping version and setting revocation timestamp
    await setUserTokenRevokeAfterNow(payload.userId);
    await invalidateUserPermissionCache(payload.userId);

    // Clear client-side cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Audit log
    const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';
    try {
      await pool.query(
        `SELECT log_audit_event(
          $1::UUID, 'global_logout', 'user', $1::UUID, NULL,
          jsonb_build_object('reason', 'user_requested_global_logout'),
          $2::INET, $3::TEXT
        )`,
        [payload.userId, ipAddress, req.get('user-agent') || 'unknown']
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return res.status(200).json({ success: true, message: 'All sessions cancelled successfully.' });
  } catch (err) {
    console.error('Cancel all sessions error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}


// REFRESH TOKEN ROTATION
export async function refreshTokenHandler(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload || !payload.userId) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    // REUSE DETECTION
    // 1. Check if token is blacklisted (already rotated or suspected stolen)
    const isBlacklisted = await isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      // Suspected reuse! For security, revoke EVERYTHING for this user.
      await setUserTokenRevokeAfterNow(payload.userId);
      return res.status(401).json({
        success: false,
        message: 'Security Alert: Refresh token reuse detected. All sessions revoked.'
      });
    }

    // 2. Check if token belongs to this user in Redis
    const refreshTokenHash = hashToken(refreshToken);
    const userIdInRedis = await getRefreshTokenUser(refreshTokenHash);
    if (!userIdInRedis || userIdInRedis !== payload.userId) {
      // Token is valid but not in Redis (possibly already rotated/deleted)
      await blacklistToken(refreshToken, getTokenRemainingTtl(refreshToken), 'reuse-detected');
      await setUserTokenRevokeAfterNow(payload.userId);
      return res.status(401).json({
        success: false,
        message: 'Security Alert: Refresh token reuse detected. All sessions revoked.'
      });
    }

    // ROTATION: Burn old token and issue new ones
    await deleteRefreshToken(refreshTokenHash);
    await blacklistToken(refreshToken, getTokenRemainingTtl(refreshToken), 'rotated');

    const newAccessToken = generateAccessToken(payload.userId, payload.rollNo);
    const newRefreshToken = generateRefreshToken(payload.userId, payload.rollNo);
    const newRefreshTokenHash = hashToken(newRefreshToken);
    await storeRefreshToken(payload.userId, newRefreshTokenHash);

    // Update session activity in Redis (assume sessionId is userId or provided in header)
    const sessionId = (req.headers['x-session-id'] as string) || payload.userId;
    const session = await getSession(sessionId);
    if (session) {
      await createSession(sessionId, {
        ...session,
        lastActivity: Date.now().toString(),
      });
    }

    // Set cookies
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    setAccessTokenCookie(res, newAccessToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        userId: payload.userId,
        rollNo: payload.rollNo
      }
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}


// SIGNUP - Step 1: Create user and send OTP
export async function signup(req: Request, res: Response) {
  try {
    const { degreeType, rollNumber, name, gender, branch, password, publicKey, encryptedPrivateKey } = req.body as SignupRequest;

    // Validate inputs
    if (!degreeType || !rollNumber || !name || !gender || !branch || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate 5-digit roll number
    if (!validate5DigitRoll(rollNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Roll number must be 1-5 digits'
      });
    }

    // Validate name
    if (!validateName(name)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid name format'
      });
    }

    // Validate branch
    if (!validateBranch(branch)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch'
      });
    }

    // Validate gender
    if (!['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Construct full roll number
    const fullRollNo = constructRollNumber(degreeType, rollNumber);

    // Check if user already exists (case-insensitive)
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE UPPER(roll_no) = UPPER($1)',
      [fullRollNo]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Roll number already registered'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (unverified)
    const newUser = await pool.query(
      `INSERT INTO users (roll_no, name, gender, branch, password_hash, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, FALSE, FALSE)
       RETURNING user_id`,
      [fullRollNo, name, gender, branch, passwordHash]
    );

    const userId = newUser.rows[0].user_id;

    // E2EE: Store client-provided keys
    if (publicKey && encryptedPrivateKey) {
      await pool.query(
        `INSERT INTO user_encryption_keys (user_id, public_key, encrypted_private_key)
         VALUES ($1, $2, $3)`,
        [userId, publicKey, encryptedPrivateKey]
      );
    }

    // Generate and cache OTP in Redis (15-minute TTL)
    const otp = generateOTP();
    await storeOtp('signup', fullRollNo, userId, otp);

    // Generate email and send OTP
    const email = generateEmail(fullRollNo);
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const emailSent = await sendOTPEmail({
      to: email,
      otp,
      purpose: 'signup',
      rollNo: fullRollNo,
      ipAddress
    });

    if (!emailSent) {
      // Rollback: delete user and OTP state
      await clearOtp('signup', fullRollNo);
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);

      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    // Log audit event
    try {
      await pool.query(
        `SELECT log_audit_event(
          $1::UUID, $2, $3, $1::UUID, NULL,
          jsonb_build_object('roll_no', $4::VARCHAR, 'branch', $5::VARCHAR),
          $6::INET, $7::TEXT
        )`,
        [userId, 'signup_initiated', 'user', fullRollNo, branch, ipAddress || '0.0.0.0', req.get('user-agent') || 'unknown']
      );
    } catch (auditError) {
      // Log audit errors don't block signup
      console.error('Audit log error:', auditError);
    }

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email for OTP.',
      data: {
        rollNo: fullRollNo,
        email,
        expiresIn: otpExpirySeconds()
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}


// SIGNUP - Step 2: Verify OTP
export async function verifyOTP(req: Request, res: Response) {
  try {
    const { rollNo, otp, purpose } = req.body as VerifyOTPRequest;
    const normalizedRollNo = String(rollNo || '').trim().toUpperCase();

    // Validate inputs
    if (!normalizedRollNo || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Roll number, OTP, and purpose are required'
      });
    }

    if (!validateRollNumber(normalizedRollNo)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roll number format'
      });
    }

    if (!['signup', 'password_reset'].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP purpose'
      });
    }

    // Find user (case-insensitive)
    const users = await pool.query(
      'SELECT user_id, is_verified FROM users WHERE UPPER(roll_no) = UPPER($1)',
      [normalizedRollNo]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = users.rows[0].user_id;

    const attemptsSoFar = await incrementOtpVerifyAttempts(purpose, normalizedRollNo);
    if (isOtpVerifyRateLimited(attemptsSoFar)) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP attempts. Please request a new OTP.'
      });
    }

    const otpMatch = await matchesOtp(purpose, normalizedRollNo, userId, otp);
    if (otpMatch.missing) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    if (!otpMatch.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    await clearOtp(purpose, normalizedRollNo);

    // Update user as verified and active
    await pool.query(
      'UPDATE users SET is_verified = TRUE, is_active = TRUE, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    // Log audit event
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    try {
      await pool.query(
        `SELECT log_audit_event(
          $1::UUID, $2::VARCHAR, $3::VARCHAR, $1::UUID,
          jsonb_build_object('is_verified', false),
          jsonb_build_object('is_verified', true),
          $4::INET, $5::TEXT
        )`,
        [userId, 'email_verified', 'user', ipAddress || '0.0.0.0', req.get('user-agent') || 'unknown']
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    // For signup, auto-login and return tokens
    if (purpose === 'signup') {
      const accessToken = generateAccessToken(userId, normalizedRollNo);
      const refreshToken = generateRefreshToken(userId, normalizedRollNo);
      const refreshTokenHash = hashToken(refreshToken);

      // Store refresh token in Redis
      await storeRefreshToken(userId, refreshTokenHash);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: config.server.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      setAccessTokenCookie(res, accessToken);

      // Get user details
      const userDetails = await pool.query(
        `SELECT user_id, roll_no, name, branch, gender, is_verified
         FROM users
         WHERE user_id = $1`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully. You are now logged in.',
        data: {
          user: userDetails.rows[0]
        }
      });
    }

    // For password reset, return success
    if (purpose === 'password_reset') {
      const resetToken = generateRandomToken();
      await storePasswordResetToken(resetToken, userId, normalizedRollNo);

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          resetToken,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}


// LOGIN
export async function login(req: Request, res: Response) {
  try {
    const { rollNo, password } = req.body as LoginRequest;

    // Login Protection: Check attempts
    const hour = Math.floor(Date.now() / 3600000);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const attemptKey = `login_attempts:${ip}:${hour}`;

    const attempts = await redis.incr(attemptKey);
    if (attempts === 1) {
      await redis.expire(attemptKey, 3600);
    }

    if (attempts > 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again in an hour.'
      });
    }

    // Validate inputs
    if (!rollNo || !password) {
      return res.status(400).json({
        success: false,
        message: 'Roll number and password are required'
      });
    }

    // Check if input is email or roll number
    const isEmail = rollNo.includes('@');
    let query: string;
    let params: any[];

    if (isEmail) {
      // Login with email
      query = `SELECT u.user_id, u.roll_no, u.name, u.branch, u.gender, u.is_verified, u.is_active, u.password_hash,
                      uek.encrypted_private_key
               FROM users u
               LEFT JOIN user_encryption_keys uek ON u.user_id = uek.user_id
               WHERE LOWER(u.email) = LOWER($1)`;
      params = [rollNo];
    } else {
      // Login with roll number
      if (!validateRollNumber(rollNo)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid roll number format'
        });
      }
      query = `SELECT u.user_id, u.roll_no, u.name, u.branch, u.gender, u.is_verified, u.is_active, u.password_hash,
                      uek.encrypted_private_key
               FROM users u
               LEFT JOIN user_encryption_keys uek ON u.user_id = uek.user_id
               WHERE UPPER(u.roll_no) = UPPER($1)`;
      params = [rollNo];
    }

    // Find user
    const users = await pool.query(query, params);

    if (users.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please verify your email.'
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(user.password_hash, password);
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    if (!isPasswordValid) {
      // Log failed login attempt
      try {
        await pool.query(
          `SELECT log_audit_event(
            $1::UUID, $2::VARCHAR, $3::VARCHAR, $1::UUID, NULL,
            jsonb_build_object('reason', 'invalid_password', 'roll_no', $4::VARCHAR),
            $5::INET, $6::TEXT
          )`,
          [user.user_id, 'login_failed', 'user', user.roll_no, ipAddress || '0.0.0.0', req.get('user-agent') || 'unknown']
        );
      } catch (auditError) {
        console.error('Audit log error:', auditError);
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last_login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    // Log successful login
    try {
      await pool.query(
        `SELECT log_audit_event(
          $1::UUID, $2::VARCHAR, $3::VARCHAR, $1::UUID, NULL,
          jsonb_build_object('roll_no', $4::VARCHAR),
          $5::INET, $6::TEXT
        )`,
        [user.user_id, 'login_success', 'user', rollNo, ipAddress || '0.0.0.0', req.get('user-agent') || 'unknown']
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.user_id, user.roll_no);
    const refreshToken = generateRefreshToken(user.user_id, user.roll_no);
    const refreshTokenHash = hashToken(refreshToken);

    // Store refresh token in Redis
    await storeRefreshToken(user.user_id, refreshTokenHash);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    setAccessTokenCookie(res, accessToken);

    // Clear login attempts on success
    await redis.del(attemptKey);

    // Create Redis Session
    const sessionId = uuidv4();
    await createSession(sessionId, {
      userId: user.user_id,
      rollNo: user.roll_no,
      email: rollNo.includes('@') ? rollNo : "", // or fetch email from DB if needed
      ipAddress: ip,
      userAgent: req.get('user-agent') || 'unknown'
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        sessionId, // Return sessionId to client
        user: {
          userId: user.user_id,
          rollNo: user.roll_no,
          name: user.name,
          branch: user.branch,
          gender: user.gender,
          isVerified: user.is_verified,
          encryptedPrivateKey: user.encrypted_private_key
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}


// FORGOT PASSWORD - Step 1: Send OTP
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { rollNo } = req.body as ForgotPasswordRequest;
    const normalizedRollNo = String(rollNo || '').trim().toUpperCase();

    if (!normalizedRollNo) {
      return res.status(400).json({
        success: false,
        message: 'Roll number is required'
      });
    }

    if (!validateRollNumber(normalizedRollNo)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roll number format'
      });
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const sendAttemptInfo = await incrementOtpSendAttempts('password_reset', normalizedRollNo, ipAddress);
    if (isOtpSendRateLimited(sendAttemptInfo)) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.'
      });
    }

    // Find user (case-insensitive)
    const users = await pool.query(
      'SELECT user_id, is_active FROM users WHERE UPPER(roll_no) = UPPER($1)',
      [normalizedRollNo]
    );

    if (users.rows.length === 0 || !users.rows[0].is_active) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If the account exists, an OTP has been generated.'
      });
    }

    const user = users.rows[0];

    // Generate OTP
    const otp = generateOTP();
    await storeOtp('password_reset', normalizedRollNo, user.user_id, otp);

    // Send OTP email
    const email = generateEmail(normalizedRollNo);
    const emailSent = await sendOTPEmail({
      to: email,
      otp,
      purpose: 'password_reset',
      rollNo: normalizedRollNo,
      ipAddress
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.'
      });
    }

    // Log audit event
    try {
      await pool.query(
        `SELECT log_audit_event(
          $1::UUID, $2::VARCHAR, $3::VARCHAR, $1::UUID, NULL,
          jsonb_build_object('roll_no', $4::VARCHAR),
          $5::INET, $6::TEXT
        )`,
        [user.user_id, 'password_reset_requested', 'user', normalizedRollNo, ipAddress || '0.0.0.0', req.get('user-agent') || 'unknown']
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your registered email.',
      data: {
        rollNo: normalizedRollNo,
        email,
        expiresIn: otpExpirySeconds()
      }
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}


// RESET PASSWORD - Step 2: Reset with OTP
export async function resetPassword(req: Request, res: Response) {
  try {
    const { rollNo, otp, newPassword, resetToken } = req.body as ResetPasswordRequest & {
      rollNo?: string;
      otp?: string;
    };
    const normalizedRollNo = String(rollNo || '').trim().toUpperCase();

    if (!normalizedRollNo || !newPassword || (!otp && !resetToken)) {
      return res.status(400).json({
        success: false,
        message: 'Roll number, new password, and OTP or reset token are required'
      });
    }

    if (!validateRollNumber(normalizedRollNo)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roll number format'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Find user (case-insensitive)
    const users = await pool.query(
      'SELECT user_id FROM users WHERE UPPER(roll_no) = UPPER($1)',
      [normalizedRollNo]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = users.rows[0].user_id;

    let isAuthorized = false;

    if (resetToken) {
      isAuthorized = await consumePasswordResetToken(resetToken, userId, normalizedRollNo);
      if (!isAuthorized) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }
    } else {
      const attemptsSoFar = await incrementOtpVerifyAttempts('password_reset', normalizedRollNo);
      if (isOtpVerifyRateLimited(attemptsSoFar)) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP attempts. Please request a new OTP.'
        });
      }

      const otpMatch = await matchesOtp('password_reset', normalizedRollNo, userId, String(otp));
      if (otpMatch.missing) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      if (!otpMatch.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      await clearOtp('password_reset', normalizedRollNo);
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(400).json({
        success: false,
        message: 'Unable to verify reset credentials'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [newPasswordHash, userId]
    );

    // Invalidate all sessions (force re-login)
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    );

    await setUserTokenRevokeAfterNow(userId);
    await invalidateUserPermissionCache(userId);

    await clearPasswordResetState(normalizedRollNo);

    // Log audit event
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    try {
      await pool.query(
        `SELECT log_audit_event(
          $1::UUID, $2::VARCHAR, $3::VARCHAR, $1::UUID, NULL,
          jsonb_build_object('roll_no', $4::VARCHAR, 'sessions_invalidated', true),
          $5::INET, $6::TEXT
        )`,
        [userId, 'password_reset_completed', 'user', normalizedRollNo, ipAddress || '0.0.0.0', req.get('user-agent') || 'unknown']
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}


// LOGOUT
export async function logout(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = getBearerToken(req) || req.cookies?.accessToken;
    let userId = null;

    if (accessToken) {
      const ttl = getTokenRemainingTtl(accessToken);
      await blacklistToken(accessToken, ttl, 'logout');
    }

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);

      // Get user_id from Redis before deleting session
      userId = await getRefreshTokenUser(tokenHash);
      // Delete session from Redis
      await deleteRefreshToken(tokenHash);

      // Log audit event
      if (userId) {
        await invalidateUserPermissionCache(userId);
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        try {
          await pool.query(
            `SELECT log_audit_event(
              $1::UUID, $2::VARCHAR, $3::VARCHAR, $1::UUID, NULL, NULL,
              $4::INET, $5::TEXT
            )`,
            [userId, 'logout', 'user', ipAddress || '0.0.0.0', req.get('user-agent') || 'unknown']
          );
        } catch (auditError) {
          console.error('Audit log error:', auditError);
        }
      }
    }

    // Clear Redis Session if provided in headers or cookies (if you use cookies)
    const sessionId = req.headers['x-session-id'] as string;
    if (sessionId) {
      await deleteSession(sessionId);
    }

    // Clear cookie
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
