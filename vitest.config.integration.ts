/**
 * Vitest Configuration for Integration Tests
 *
 * Story 1.7: Enable All Skipped Tests
 * AC-1.7.3: Integration Test Infrastructure
 *
 * Integration tests run against a real database with proper setup/teardown.
 * Requires DATABASE_URL environment variable to be set.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." pnpm test:integration
 */

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Use setupFiles for integration test setup
    setupFiles: ["./tests/integration/setup.ts"],
    // Provide dummy DATABASE_URL for module loading - actual tests need real URL
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_integration",
    },
    // Longer timeouts for DB operations
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests sequentially to avoid DB conflicts
    pool: "forks",
    // @ts-expect-error poolOptions is valid in vitest v4 but types may lag
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
