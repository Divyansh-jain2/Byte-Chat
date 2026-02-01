// Degree type prefixes for roll numbers
export const DEGREE_TYPES = {
  B: 'B Tech',
  T: 'M Tech',
  S: 'MS',
  D: 'PhD',
  A: 'MA',
  V: 'MSc',
  IM: 'Integrated MBA',
  MB: 'MBA',
  DD: 'M.Tech(Research)+PhD Dual Degree',
  DI: 'I-PhD',
  PTD: 'Ph.D - Parttime',
  UD: 'PhD Upgraded',
  ERPD: 'Ph.D - External Registration',
  ER: 'External Registration'
} as const;

export type DegreeType = keyof typeof DEGREE_TYPES;

export const DEGREE_TYPE_OPTIONS = Object.entries(DEGREE_TYPES).map(([value, label]) => ({
  value,
  label: `${value} - ${label}`
}));

// Auth request/response types
export interface SignupRequest {
  degreeType: DegreeType;
  rollNumber: string; // 5 digits
  name: string;
  gender: 'male' | 'female' | 'other';
  branch: string;
  password: string;
}

export interface VerifyOTPRequest {
  rollNo: string; // Full roll number (e.g., DD12345)
  otp: string;
  purpose: 'signup' | 'password_reset';
}

export interface LoginRequest {
  rollNo: string;
  password: string;
}

export interface ForgotPasswordRequest {
  rollNo: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    user?: {
      userId: string;
      rollNo: string;
      name: string;
      branch: string;
      gender: string;
      isVerified: boolean;
    };
  };
}

export interface OTPResponse {
  success: boolean;
  message: string;
  data?: {
    rollNo: string;
    expiresIn: number; // seconds
  };
}

export interface TokenPayload {
  userId: string;
  rollNo: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
