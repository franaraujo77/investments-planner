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
    "_bmad/**",
    "_bmad-output/**",
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
  // ============================================
  // i18n NUMBER FORMATTING ENFORCEMENT
  // ============================================
  // Epic 3 Retrospective: PR review identified inconsistent number formatting.
  // See: docs/sprint-artifacts/epic-3-retrospective.md (Section: "PR Review Findings")
  // Use useNumberFormat() hook instead of hardcoded formatting in React components.
  // Added: 2025-12-31
  {
    files: ["src/components/**/*.tsx"],
    ignores: [
      // Allow in formatting infrastructure components (they implement the formatting)
      "src/components/fintech/currency-display.tsx",
      "src/components/fintech/number-display.tsx",
      // Allow in data components that may need server-compatible formatting
      "src/components/data/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message:
            "Avoid .toFixed() for display formatting. Use useNumberFormat() hook from @/lib/i18n/useNumberFormat for i18n-compliant number formatting.",
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleString'][arguments.length>0][arguments.0.type='Literal']",
          message:
            "Avoid .toLocaleString() with hardcoded locale. Use useNumberFormat() hook from @/lib/i18n/useNumberFormat for i18n-compliant formatting.",
        },
        {
          selector: "NewExpression[callee.object.name='Intl'][callee.property.name='NumberFormat']",
          message:
            "Avoid direct Intl.NumberFormat usage. Use useNumberFormat() hook from @/lib/i18n/useNumberFormat for consistent i18n formatting.",
        },
      ],
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
  // Playwright fixtures use a `use` function that ESLint incorrectly flags as a React hook
  {
    files: ["tests/e2e/fixtures/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;
