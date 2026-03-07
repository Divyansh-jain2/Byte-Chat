import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || ''
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '7d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10)
  },
  rateLimit: {
    loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
    lockDurationMinutes: parseInt(process.env.LOGIN_LOCK_DURATION_MINUTES || '30', 10)
  },
  email: {
    gmailUser: process.env.GMAIL_USER || '',
    gmailPassword: process.env.GMAIL_APP_PASSWORD || ''
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  }
};
