import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific ignores:
    ".bmad/**",
  ]),
  // Allow underscore-prefixed variables to be unused (common pattern for intentionally unused params)
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Production code - prevent console.* statements (use logger instead)
  // Upgraded from "warn" to "error" in Epic 6 retrospective (2025-12-11)
  // All production code must use logger from @/lib/telemetry/logger
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      // Logger implementation needs console for output
      "src/lib/telemetry/logger.ts",
      "src/lib/telemetry/setup.ts",
    ],
    rules: {
      "no-console": "error",
    },
  },
  // Test files - allow explicit any for mocking and console for debugging
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
