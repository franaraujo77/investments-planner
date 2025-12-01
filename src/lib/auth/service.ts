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
  type User,
  type NewUser,
  type RefreshToken,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./password";

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
 * @param email - User's email address
 * @param password - Plain text password (will be hashed)
 * @param name - Optional display name
 * @returns Created user (without password hash)
 * @throws Error if email already exists
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<SafeUser> {
  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name?.trim() || null,
    baseCurrency: "USD",
    emailVerified: false,
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
 * @param email - Email address to search for
 * @returns User if found, null otherwise
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  return user ?? null;
}

/**
 * Finds a user by ID
 *
 * @param userId - User ID to search for
 * @returns User if found, null otherwise
 */
export async function findUserById(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
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
export async function findRefreshToken(
  tokenHash: string
): Promise<RefreshToken | null> {
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
export async function findRefreshTokenById(
  tokenId: string
): Promise<RefreshToken | null> {
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
