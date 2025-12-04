/**
 * Auth Service
 *
 * Database operations for authentication.
 * Story 1.3: Authentication System with JWT + Refresh Tokens
 *
 * AC1, AC2: User and refresh token database operations
 */

import { db } from "@/lib/db";
import {
  users,
  refreshTokens,
  verificationTokens,
  passwordResetTokens,
  type User,
  type NewUser,
  type RefreshToken,
  type VerificationToken,
  type PasswordResetToken,
} from "@/lib/db/schema";
import { randomBytes, createHash } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword } from "./password";
import { AUTH_CONSTANTS } from "./constants";

/**
 * User data without sensitive fields (for API responses)
 */
export type SafeUser = Omit<User, "passwordHash">;

/**
 * Creates a safe user object without password hash
 */
function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Creates a new user in the database
 *
 * Story 2.1: User Registration Flow - Updated to include disclaimerAcknowledgedAt
 *
 * @param email - User's email address
 * @param password - Plain text password (will be hashed)
 * @param name - Optional display name
 * @param disclaimerAcknowledgedAt - Timestamp when user acknowledged financial disclaimer
 * @returns Created user (without password hash)
 * @throws Error if email already exists
 */
export async function createUser(
  email: string,
  password: string,
  name?: string,
  disclaimerAcknowledgedAt?: Date
): Promise<SafeUser> {
  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name?.trim() || null,
    baseCurrency: "USD",
    emailVerified: false,
    disclaimerAcknowledgedAt: disclaimerAcknowledgedAt ?? null,
  };

  const [user] = await db.insert(users).values(newUser).returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return toSafeUser(user);
}

/**
 * Finds a user by email address
 *
 * Story 2.8: Account Deletion - Excludes soft-deleted users
 *
 * @param email - Email address to search for
 * @returns User if found and not deleted, null otherwise
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, email.toLowerCase().trim()),
        isNull(users.deletedAt) // Exclude soft-deleted users
      )
    )
    .limit(1);

  return user ?? null;
}

/**
 * Finds a user by ID
 *
 * Story 2.8: Account Deletion - Excludes soft-deleted users
 *
 * @param userId - User ID to search for
 * @returns User if found and not deleted, null otherwise
 */
export async function findUserById(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt) // Exclude soft-deleted users
      )
    )
    .limit(1);

  return user ?? null;
}

/**
 * Gets safe user data by ID (without password hash)
 *
 * @param userId - User ID to fetch
 * @returns Safe user if found, null otherwise
 */
export async function getSafeUserById(userId: string): Promise<SafeUser | null> {
  const user = await findUserById(userId);
  return user ? toSafeUser(user) : null;
}

/**
 * Stores a refresh token in the database
 *
 * @param userId - User the token belongs to
 * @param tokenHash - Hashed token value
 * @param expiresAt - Token expiration timestamp
 * @param deviceFingerprint - Optional device identifier
 * @returns Created refresh token record
 */
export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  deviceFingerprint?: string
): Promise<RefreshToken> {
  const [token] = await db
    .insert(refreshTokens)
    .values({
      userId,
      tokenHash,
      expiresAt,
      deviceFingerprint: deviceFingerprint ?? null,
    })
    .returning();

  if (!token) {
    throw new Error("Failed to store refresh token");
  }

  return token;
}

/**
 * Finds a refresh token by its hash
 *
 * @param tokenHash - Hashed token value to search for
 * @returns Refresh token if found and not expired, null otherwise
 */
export async function findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!token) {
    return null;
  }

  // Check if token is expired
  if (token.expiresAt < new Date()) {
    // Clean up expired token
    await deleteRefreshToken(token.id);
    return null;
  }

  return token;
}

/**
 * Finds a refresh token by its ID
 *
 * @param tokenId - Token ID to search for
 * @returns Refresh token if found, null otherwise
 */
export async function findRefreshTokenById(tokenId: string): Promise<RefreshToken | null> {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.id, tokenId))
    .limit(1);

  return token ?? null;
}

/**
 * Deletes a refresh token by ID
 *
 * Used for token rotation - old token is deleted when new one is issued.
 *
 * @param tokenId - Token ID to delete
 */
export async function deleteRefreshToken(tokenId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
}

/**
 * Deletes all refresh tokens for a user
 *
 * Used for "logout everywhere" functionality.
 *
 * @param userId - User ID whose tokens should be deleted
 */
export async function deleteUserRefreshTokens(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

/**
 * Checks if an email is already registered
 *
 * @param email - Email address to check
 * @returns true if email exists, false otherwise
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return user !== null;
}

// =============================================================================
// VERIFICATION TOKEN OPERATIONS
// Story 2.1: User Registration Flow
// =============================================================================

/**
 * Stores a verification token in the database
 *
 * @param userId - User the token belongs to
 * @param token - The JWT verification token
 * @returns Created verification token record
 */
export async function storeVerificationToken(
  userId: string,
  token: string
): Promise<VerificationToken> {
  // Calculate expiry (24 hours from now)
  const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.VERIFICATION_TOKEN_EXPIRY * 1000);

  const [verificationToken] = await db
    .insert(verificationTokens)
    .values({
      userId,
      token,
      expiresAt,
    })
    .returning();

  if (!verificationToken) {
    throw new Error("Failed to store verification token");
  }

  return verificationToken;
}

/**
 * Finds a verification token by its value (raw, without validation)
 *
 * Story 2.2: Email Verification - Added for differentiated error responses
 *
 * @param token - Token value to search for
 * @returns Verification token if found (regardless of expiry/used status), null otherwise
 */
export async function findVerificationTokenRaw(token: string): Promise<VerificationToken | null> {
  const [verificationToken] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token))
    .limit(1);

  return verificationToken ?? null;
}

/**
 * Finds a verification token by its value
 *
 * @param token - Token value to search for
 * @returns Verification token if found and not expired/used, null otherwise
 */
export async function findVerificationToken(token: string): Promise<VerificationToken | null> {
  const [verificationToken] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token))
    .limit(1);

  if (!verificationToken) {
    return null;
  }

  // Check if token is expired
  if (verificationToken.expiresAt < new Date()) {
    return null;
  }

  // Check if token was already used
  if (verificationToken.usedAt) {
    return null;
  }

  return verificationToken;
}

/**
 * Marks a verification token as used
 *
 * @param tokenId - Token ID to mark as used
 */
export async function markVerificationTokenUsed(tokenId: string): Promise<void> {
  await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(verificationTokens.id, tokenId));
}

/**
 * Marks a user's email as verified
 *
 * @param userId - User ID to update
 */
export async function markEmailVerified(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerifiedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Invalidates all unused verification tokens for a user
 *
 * Story 2.2: Email Verification - Called when generating new verification token
 *
 * @param userId - User ID whose unused tokens should be invalidated
 */
export async function invalidateUserVerificationTokens(userId: string): Promise<void> {
  await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(verificationTokens.userId, userId));
}

// =============================================================================
// PASSWORD RESET TOKEN OPERATIONS
// Story 2.5: Password Reset Flow
// =============================================================================

/**
 * Hashes a token using SHA-256
 *
 * Unlike passwords, reset tokens are already cryptographically random,
 * so we use fast SHA-256 hashing instead of expensive bcrypt.
 *
 * @param token - Raw token to hash
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a password reset token for a user
 *
 * Story 2.5: Password Reset Flow
 *
 * Generates a cryptographically secure random token,
 * hashes it, and stores the hash in the database.
 * Returns the raw token to be sent via email.
 *
 * @param userId - User ID to create reset token for
 * @returns Raw token (64 hex chars) to send in email
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  // Generate secure random token (32 bytes = 64 hex chars)
  const rawToken = randomBytes(32).toString("hex");

  // Hash the token for storage (don't store raw token)
  const tokenHash = hashToken(rawToken);

  // Calculate expiry (1 hour from now)
  const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_EXPIRY * 1000);

  // Store hashed token in database
  const [passwordResetToken] = await db
    .insert(passwordResetTokens)
    .values({
      userId,
      tokenHash,
      expiresAt,
    })
    .returning();

  if (!passwordResetToken) {
    throw new Error("Failed to create password reset token");
  }

  // Return raw token to send via email
  return rawToken;
}

/**
 * Finds a password reset token by its hash
 *
 * Story 2.5: Password Reset Flow
 *
 * @param tokenHash - SHA-256 hash of the token to search for
 * @returns Password reset token if found and valid, null otherwise
 */
export async function findPasswordResetToken(
  tokenHash: string
): Promise<PasswordResetToken | null> {
  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!token) {
    return null;
  }

  // Check if token is expired
  if (token.expiresAt < new Date()) {
    return null;
  }

  // Check if token was already used
  if (token.usedAt) {
    return null;
  }

  return token;
}

/**
 * Finds a password reset token by hash without validation
 *
 * Story 2.5: Password Reset Flow - For differentiated error responses
 *
 * @param tokenHash - SHA-256 hash of the token to search for
 * @returns Password reset token if found (regardless of expiry/used), null otherwise
 */
export async function findPasswordResetTokenRaw(
  tokenHash: string
): Promise<PasswordResetToken | null> {
  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  return token ?? null;
}

/**
 * Marks a password reset token as used
 *
 * Story 2.5: Password Reset Flow
 *
 * @param tokenId - Token ID to mark as used
 */
export async function markPasswordResetTokenUsed(tokenId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

/**
 * Updates a user's password hash
 *
 * Story 2.5: Password Reset Flow
 *
 * @param userId - User ID to update
 * @param newPasswordHash - New bcrypt hash to set
 */
export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Invalidates all unused password reset tokens for a user
 *
 * Story 2.5: Password Reset Flow
 * Called when generating a new reset token to invalidate old ones.
 *
 * @param userId - User ID whose unused tokens should be invalidated
 */
export async function invalidateUserPasswordResetTokens(userId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.userId, userId));
}
