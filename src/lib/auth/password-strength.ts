/**
 * Password Strength Calculation
 *
 * Client-safe password strength utilities.
 * Story 2.1: User Registration Flow (AC3)
 *
 * Note: This file is separate from password.ts because bcrypt is server-only.
 */

import { AUTH_MESSAGES, PASSWORD_RULES } from "./constants";

/**
 * Password strength levels
 */
export type PasswordStrength = "weak" | "medium" | "strong";

/**
 * Result of password complexity validation
 */
export interface PasswordComplexityResult {
  valid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

/**
 * Common weak passwords to check against
 */
const COMMON_WEAK_PASSWORDS = [
  "password",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "password1",
  "password123",
  "letmein",
  "welcome",
  "admin",
];

/**
 * Validates password complexity requirements
 *
 * Story 2.1: User Registration Flow (AC2)
 * Requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
 *
 * @param password - Password to validate
 * @returns Object with validity, errors array, and strength level
 */
export function validatePasswordComplexity(password: string): PasswordComplexityResult {
  const errors: string[] = [];

  // Length check
  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(AUTH_MESSAGES.PASSWORD_TOO_SHORT);
  }

  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    errors.push(AUTH_MESSAGES.PASSWORD_TOO_LONG);
  }

  // Character class checks
  if (!/[a-z]/.test(password)) {
    errors.push(AUTH_MESSAGES.PASSWORD_MISSING_LOWERCASE);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push(AUTH_MESSAGES.PASSWORD_MISSING_UPPERCASE);
  }

  if (!/\d/.test(password)) {
    errors.push(AUTH_MESSAGES.PASSWORD_MISSING_NUMBER);
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push(AUTH_MESSAGES.PASSWORD_MISSING_SPECIAL);
  }

  const strength = calculatePasswordStrength(password);

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Calculates password strength for UI feedback
 *
 * Story 2.1: User Registration Flow (AC3)
 * Strength calculation based on:
 * - Length (8-11 chars = weak, 12-15 = medium, 16+ = strong base)
 * - Character variety (lowercase, uppercase, numbers, special)
 * - Common pattern detection
 *
 * @param password - Password to analyze
 * @returns Strength level: "weak", "medium", or "strong"
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) {
    return "weak";
  }

  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;

  // Penalty for common weak passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.some((weak) => lowerPassword.includes(weak))) {
    score = Math.max(0, score - 3);
  }

  // Map score to strength level
  // Score range: 0-7
  // 0-2: weak, 3-5: medium, 6-7: strong
  if (score <= 2) return "weak";
  if (score <= 5) return "medium";
  return "strong";
}
