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
  // Production code - prevent console.* statements (use logger instead)
  // Set to "warn" until existing technical debt is addressed (Epic 3 deferred item)
  // TODO: Change to "error" after migrating remaining 40 console.* statements to logger
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      // Logger implementation needs console for output
      "src/lib/telemetry/logger.ts",
      "src/lib/telemetry/setup.ts",
    ],
    rules: {
      "no-console": "warn",
    },
  },
  // Test files - allow explicit any for mocking and console for debugging
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
