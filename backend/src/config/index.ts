import dotenv from 'dotenv';

dotenv.config();


function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  database: {
    url: requireEnv('DATABASE_URL')
  },
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiry: requireEnv('JWT_ACCESS_EXPIRY'),
    refreshExpiry: requireEnv('JWT_REFRESH_EXPIRY')
  },
  otp: {
    expiryMinutes: parseInt(requireEnv('OTP_EXPIRY_MINUTES'), 10),
    maxAttempts: parseInt(requireEnv('OTP_MAX_ATTEMPTS'), 10)
  },
  rateLimit: {
    loginMaxAttempts: parseInt(requireEnv('LOGIN_MAX_ATTEMPTS'), 10),
    lockDurationMinutes: parseInt(requireEnv('LOGIN_LOCK_DURATION_MINUTES'), 10)
  },
  email: {
    gmailUser: requireEnv('GMAIL_USER'),
    gmailPassword: requireEnv('GMAIL_APP_PASSWORD')
  },
  server: {
    port: parseInt(requireEnv('NODE_PORT'), 10),
    nodeEnv: requireEnv('NODE_ENV')
  },
  cors: {
    frontendUrl: requireEnv('FRONTEND_URL')
  },
  redis: {
    host: requireEnv('REDIS_HOST'),
    port: parseInt(requireEnv('REDIS_PORT'), 10),
    password: requireEnv('REDIS_PASSWORD'),
    db: parseInt(requireEnv('REDIS_DB'), 10)
  }
};
