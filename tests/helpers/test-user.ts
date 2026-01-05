/**
 * Test User Helper Functions
 *
 * Story 7.16: Fix Integration Test Infrastructure
 * AC-7.16.2: Test helper modules created
 *
 * Provides utilities for creating and cleaning up test users in integration tests.
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hash } from "bcrypt";
import { eq } from "drizzle-orm";

export interface CreateTestUserOptions {
  email?: string;
  password?: string;
  name?: string;
  locale?: string;
  emailVerified?: boolean;
}

export interface TestUser {
  userId: string;
  email: string;
  name: string;
  locale: string;
}

/**
 * Creates a test user in the database
 *
 * @param overrides - Optional field overrides for the test user
 * @returns Created user data (userId, email, name, locale)
 */
export async function createTestUser(overrides: CreateTestUserOptions = {}): Promise<TestUser> {
  const timestamp = Date.now();
  const email = overrides.email ?? `test-${timestamp}@example.com`;
  const password = overrides.password ?? "Test123!@#";
  const hashedPassword = await hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: hashedPassword,
      name: overrides.name ?? "Test User",
      locale: overrides.locale ?? "en-US",
      emailVerified: overrides.emailVerified ?? true,
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create test user");
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name ?? "Test User",
    locale: user.locale ?? "en-US",
  };
}

/**
 * Deletes a test user from the database
 *
 * Related records will be deleted via CASCADE constraints
 *
 * @param userId - ID of the user to delete
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Returns a default test user object (not saved to database)
 *
 * Useful for test data that doesn't need database persistence
 *
 * @returns Default test user data
 */
export function getTestUser(): Omit<CreateTestUserOptions, "emailVerified"> & {
  password: string;
} {
  return {
    email: "test@example.com",
    password: "Test123!@#",
    name: "Test User",
    locale: "en-US",
  };
}
