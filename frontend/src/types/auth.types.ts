// Profile user type for profile-related API responses
export interface ProfileUser extends User {
  dp_url?: string | null;
  bio?: string | null;
  dob?: string | null;
}
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
  value: value as DegreeType,
  label: `${value} - ${label}`
}));

// User types
export interface User {
  userId: string;
  rollNo: string;
  name: string;
  branch: string;
  gender: 'male' | 'female' | 'other';
  isVerified: boolean;
}

// Auth request/response types
export interface SignupRequest {
  degreeType: DegreeType;
  rollNumber: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  branch: string;
  password: string;
}

export interface VerifyOTPRequest {
  rollNo: string;
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
  rollNo: string;
  otp: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    user?: User;
    rollNo?: string;
    expiresIn?: number;
  };
}
