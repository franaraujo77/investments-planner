import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    // Unit tests only - integration tests have their own config (vitest.config.integration.ts)
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/integration/**"],
    env: {
      // Dummy values for tests that import modules requiring env vars
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**/*.ts"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
