#!/usr/bin/env npx tsx
/**
 * E2E Test Data Setup Seed Script
 *
 * Creates test data required for @data-setup tagged tests.
 * Run this AFTER seed-e2e-user.ts to set up specific test scenarios.
 *
 * Scenarios seeded:
 * 1. User with 10 asset classes (for limit testing)
 * 2. User with 5 portfolios (for limit testing)
 * 3. User with AAPL in portfolio (for duplicate asset testing)
 * 4. Asset classes with total minimums > 100% (for warning testing)
 *
 * Usage: pnpm db:seed-e2e-data
 *
 * Story 1.7: Enable All Skipped Tests
 * AC-1.7.4: E2E tests with @data-setup tag have corresponding test fixtures
 */

import { db } from "../src/lib/db";
import { users, portfolios, portfolioAssets, assetClasses } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

const DATA_SETUP_USER = {
  email: "e2e-data-setup@example.com",
  name: "E2E Data Setup User",
};

// Asset class icons for visual variety
const ICONS = ["📈", "🏠", "💰", "🪙", "📦", "🌍", "🏦", "💎", "🛢️", "🌾"];

async function seedDataSetupScenarios() {
  console.log("🌱 Seeding E2E data setup scenarios...\n");

  try {
    // Find the data setup user (created by primary seed script)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, DATA_SETUP_USER.email))
      .limit(1);

    if (!user) {
      console.error(
        `❌ Data setup user not found: ${DATA_SETUP_USER.email}\n` +
          "   Run pnpm db:seed-e2e first, then run this script."
      );
      process.exit(1);
    }

    console.log(`📋 Found user: ${user.email} (ID: ${user.id})\n`);

    // Scenario 1: Create 10 asset classes (for limit testing)
    await seedAssetClasses(user.id);

    // Scenario 2: Create 5 portfolios (for limit testing)
    await seedPortfolios(user.id);

    // Scenario 3: Add AAPL to first portfolio (for duplicate testing)
    await seedAAPLAsset(user.id);

    // Scenario 4: Set high allocations (for warning testing)
    await seedHighAllocations(user.id);

    console.log("\n🎉 E2E data setup complete!");
    console.log("   Run E2E tests with: RUN_DATA_SETUP_TESTS=true pnpm test:e2e");
  } catch (error) {
    console.error("❌ Failed to seed E2E data:", error);
    process.exit(1);
  }
}

async function seedAssetClasses(userId: string) {
  console.log("📊 Seeding 10 asset classes...");

  // Delete existing asset classes for this user
  await db.delete(assetClasses).where(eq(assetClasses.userId, userId));

  // Create exactly 10 asset classes
  const classNames = [
    "US Stocks",
    "International Stocks",
    "Bonds",
    "Real Estate",
    "Commodities",
    "Crypto",
    "Cash",
    "Alternatives",
    "Private Equity",
    "Treasury",
  ];

  for (let i = 0; i < 10; i++) {
    await db.insert(assetClasses).values({
      userId,
      name: classNames[i]!,
      icon: ICONS[i] ?? null,
      sortOrder: String(i), // numeric as string
      targetMin: i < 5 ? "5.00" : null, // First 5 have minimum allocation
      targetMax: i < 5 ? "20.00" : null, // First 5 have maximum allocation
    });
  }

  console.log("   ✅ Created 10 asset classes");
}

async function seedPortfolios(userId: string) {
  console.log("📁 Seeding 5 portfolios...");

  // Delete existing portfolios for this user
  await db.delete(portfolios).where(eq(portfolios.userId, userId));

  // Create exactly 5 portfolios
  const portfolioNames = [
    "Retirement Fund",
    "Emergency Fund",
    "Growth Portfolio",
    "Income Portfolio",
    "Speculative",
  ];

  for (let i = 0; i < 5; i++) {
    await db.insert(portfolios).values({
      userId,
      name: portfolioNames[i]!,
    });
  }

  console.log("   ✅ Created 5 portfolios");
}

async function seedAAPLAsset(userId: string) {
  console.log("🍎 Seeding AAPL asset...");

  // Get first portfolio
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  if (!portfolio) {
    console.log("   ⚠️ No portfolio found, skipping AAPL seed");
    return;
  }

  // Delete existing AAPL if present
  await db
    .delete(portfolioAssets)
    .where(and(eq(portfolioAssets.portfolioId, portfolio.id), eq(portfolioAssets.symbol, "AAPL")));

  // Create AAPL asset
  await db.insert(portfolioAssets).values({
    portfolioId: portfolio.id,
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: "10",
    purchasePrice: "195.50",
    currency: "USD",
  });

  console.log("   ✅ Created AAPL in first portfolio");
}

async function seedHighAllocations(userId: string) {
  console.log("⚠️ Seeding high allocation scenario...");

  // Get first 3 asset classes and set high minimums
  const classes = await db
    .select()
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId))
    .limit(3);

  // Set minimums that sum to > 100%
  const highMinimums = ["40.00", "35.00", "30.00"]; // Total = 105%

  for (let i = 0; i < classes.length && classes[i]; i++) {
    const targetMinValue = highMinimums[i]!;
    const targetMaxValue = String(parseFloat(highMinimums[i]!) + 10) + ".00";
    await db
      .update(assetClasses)
      .set({
        targetMin: targetMinValue,
        targetMax: targetMaxValue,
      })
      .where(eq(assetClasses.id, classes[i]!.id));
  }

  console.log("   ✅ Set high allocations (total min > 100%)");
}

// Run if executed directly
seedDataSetupScenarios()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
