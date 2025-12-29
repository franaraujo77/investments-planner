#!/usr/bin/env npx tsx
/**
 * E2E Test User Seed Script
 *
 * Creates or updates the test user for E2E tests.
 * Run before E2E tests to ensure the test user exists.
 *
 * Usage: pnpm db:seed-e2e
 */

import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { eq } from "drizzle-orm";

const TEST_USER = {
  email: "e2e-test@example.com",
  password: "TestPass123!",
  name: "E2E Test User",
};

// Data setup user for @data-setup tagged tests
const DATA_SETUP_USER = {
  email: "e2e-data-setup@example.com",
  password: "TestPass123!",
  name: "E2E Data Setup User",
};

async function seedUser(userConfig: { email: string; password: string; name: string }) {
  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, userConfig.email))
    .limit(1);

  const passwordHash = await hashPassword(userConfig.password);

  if (existingUser) {
    // Update existing user to ensure correct password, verified status, and reset preferences
    await db
      .update(users)
      .set({
        passwordHash,
        name: userConfig.name,
        baseCurrency: "EUR", // Reset to EUR (default for tests)
        locale: "en-US", // Reset locale
        emailVerified: true,
        deletedAt: null, // Ensure not soft-deleted
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    console.log(`   ✅ Updated existing user: ${userConfig.email}`);
  } else {
    // Create new user
    await db.insert(users).values({
      email: userConfig.email,
      passwordHash,
      name: userConfig.name,
      baseCurrency: "EUR", // Default currency for tests
      locale: "en-US", // Default locale for tests
      emailVerified: true, // Pre-verified for E2E tests
      disclaimerAcknowledgedAt: new Date(),
    });

    console.log(`   ✅ Created new user: ${userConfig.email}`);
  }
}

async function seedE2EUsers() {
  console.log("🌱 Seeding E2E test users...\n");

  try {
    // Seed primary test user
    console.log("📋 Primary E2E test user:");
    await seedUser(TEST_USER);

    // Seed data setup user (for @data-setup tagged tests)
    console.log("\n📋 Data setup user (for @data-setup tests):");
    await seedUser(DATA_SETUP_USER);

    console.log("\n🎉 E2E test users seed complete!");
    console.log("\nCredentials:");
    console.log(`   Primary: ${TEST_USER.email} / ${TEST_USER.password}`);
    console.log(`   Data Setup: ${DATA_SETUP_USER.email} / ${DATA_SETUP_USER.password}`);
  } catch (error) {
    console.error("❌ Failed to seed E2E test users:", error);
    process.exit(1);
  }
}

// Run if executed directly
seedE2EUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
