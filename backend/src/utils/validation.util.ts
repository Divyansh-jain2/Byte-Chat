import type { DegreeType } from '../types/auth.types.js';

const VALID_DEGREE_TYPES = ['B', 'T', 'S', 'D', 'A', 'V', 'IM', 'MB', 'DD', 'DI', 'PTD', 'UD', 'ERPD', 'ER'];

/**
 * Validate roll number format
 * Format: Initial letter + 5 digits
 * Examples: B12345, D00001, T54321
 */
export function validateRollNumber(rollNo: string): boolean {
  if (!rollNo || rollNo.length !== 6) return false;

  const upperRollNo = rollNo.toUpperCase();
  
  // Format: Single letter + exactly 5 digits
  const match = upperRollNo.match(/^([A-Z])(\d{5})$/);
  return match !== null;
}

/**
 * Construct full roll number from degree type and number
 */
export function constructRollNumber(degreeType: DegreeType, rollNumber: string): string {
  // Ensure roll number is 5 digits with leading zeros
  const paddedNumber = rollNumber.padStart(5, '0');
  return `${degreeType.toUpperCase()}${paddedNumber}`;
}

/**
 * Generate email from roll number
 */
export function generateEmail(rollNo: string): string {
  return `${rollNo.toLowerCase()}@students.iitmandi.ac.in`;
}

/**
 * Validate email format
 * Format: letter + 5 digits @ students.iitmandi.ac.in
 * Example: b12345@students.iitmandi.ac.in
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-z]\d{5}@students\.iitmandi\.ac\.in$/i;
  return emailRegex.test(email);
}

/**
 * Validate password - No restrictions, accept any password
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  // Accept any password - no restrictions
  if (!password || password.length === 0) {
    return { valid: false, message: 'Password cannot be empty' };
  }
  
  return { valid: true };
}

/**
 * Validate name
 */
export function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 100 && /^[a-zA-Z\s.'-]+$/.test(name);
}

/**
 * Validate branch
 */
export function validateBranch(branch: string): boolean {
  return branch.length >= 2 && branch.length <= 50;
}

/**
 * Validate 5-digit roll number
 */
export function validate5DigitRoll(rollNumber: string): boolean {
  return /^\d{1,5}$/.test(rollNumber);
}
