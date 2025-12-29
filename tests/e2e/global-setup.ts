/**
 * Playwright Global Setup
 *
 * Runs once before any tests start.
 * Seeds the E2E test user to ensure authentication works.
 *
 * Note: Rate limits are cleared in auth.setup.ts (after server starts).
 */

import { execSync } from "child_process";

async function globalSetup() {
  console.log("\n🌱 Running E2E global setup...");

  try {
    // Seed the E2E test user
    execSync("pnpm db:seed-e2e", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  }
}

export default globalSetup;
