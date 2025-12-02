# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit/integration testing and [Playwright](https://playwright.dev/) for end-to-end testing.

## Quick Start

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with interactive UI
pnpm test:ui

# Run E2E tests
pnpm test:e2e

# Run E2E tests with interactive UI
pnpm test:e2e:ui

# Run E2E tests in headed mode (visible browser)
pnpm test:e2e:headed
```

## Test Directory Structure

```
tests/
├── unit/                    # Unit tests for isolated functions/modules
│   ├── auth/               # Authentication tests
│   ├── cache/              # Cache service tests
│   ├── calculations/       # Decimal/financial calculation tests
│   ├── db/                 # Database schema tests
│   ├── events/             # Event sourcing tests
│   └── telemetry/          # OpenTelemetry tests
├── integration/            # Integration tests (component interactions)
│   └── auth-flow.test.ts   # Auth flow integration tests
├── e2e/                    # End-to-end tests (full user flows)
│   └── smoke.spec.ts       # Basic smoke tests
└── setup.ts                # Shared test utilities
```

## Coverage Requirements

| Module | Target | Priority |
|--------|--------|----------|
| `lib/calculations/*` | 90% | Critical - financial accuracy |
| `lib/cache/*` | 80% | High - tests already written |
| `lib/auth/*` | 80% | High - security critical |
| `lib/events/*` | 80% | Medium - audit trail |
| `lib/telemetry/*` | 60% | Low - observability |

## Writing Tests

### Unit Tests

Unit tests use Vitest with explicit imports (no globals):

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("MyModule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should do something", () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Path Aliases

Tests support the `@/` path alias for importing from `src/`:

```typescript
import { parseDecimal } from "@/lib/calculations/decimal-utils";
```

### Mocking

Use `vi.mock()` for module mocking:

```typescript
vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));
```

### E2E Tests

E2E tests use Playwright:

```typescript
import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Investments Planner/i);
});
```

## CI Integration

Tests run automatically in CI (GitHub Actions):

- Unit tests: `pnpm test`
- E2E tests: Run in headless mode with `CI=true`
- Tests must pass for PR to be mergeable

## Test Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration |
| `playwright.config.ts` | Playwright configuration |
| `tests/setup.ts` | Shared test utilities |

## Environment Variables

Tests use the following environment variables:

- `DATABASE_URL`: Set automatically for tests (dummy value for unit tests)
- `CI`: Set to `true` in CI environment (enables headless mode, retries)

## Troubleshooting

### Tests fail with "DATABASE_URL not set"

The `vitest.config.ts` sets a dummy `DATABASE_URL` for tests. If tests still fail, ensure you're running via `pnpm test`.

### E2E tests timeout

E2E tests require the dev server to be running. Playwright will auto-start it, but if there are issues:

1. Start the dev server manually: `pnpm dev`
2. Run E2E tests: `pnpm test:e2e`

### Mock state leaking between tests

Always use `vi.resetAllMocks()` in `beforeEach` to reset mock state between tests.
