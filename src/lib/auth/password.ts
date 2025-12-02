/**
 * Password Hashing Utilities
 *
 * bcrypt-based password hashing with cost factor 12.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC3: Passwords are hashed with bcrypt (cost factor 12)
 */

import bcrypt from "bcrypt";
import { AUTH_CONSTANTS, AUTH_MESSAGES, PASSWORD_RULES } from "./constants";

/**
 * Validates password against security rules
 *
 * @param password - Password to validate
 * @returns Object with validity and optional error message
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    return { valid: false, error: AUTH_MESSAGES.PASSWORD_TOO_SHORT };
  }

  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    return { valid: false, error: AUTH_MESSAGES.PASSWORD_TOO_LONG };
  }

  return { valid: true };
}

/**
 * Hashes a password using bcrypt with cost factor 12
 *
 * The cost factor of 12 provides good security (>300ms to hash)
 * while remaining practical for authentication flows.
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to the bcrypt hash string
 * @throws Error if password validation fails
 */
export async function hashPassword(password: string): Promise<string> {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return bcrypt.hash(password, AUTH_CONSTANTS.BCRYPT_COST_FACTOR);
}

/**
 * Verifies a password against a bcrypt hash
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param password - Plain text password to verify
 * @param hash - bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // bcrypt.compare is timing-safe
  return bcrypt.compare(password, hash);
}
