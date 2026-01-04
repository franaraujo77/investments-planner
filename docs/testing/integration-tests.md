# Integration Tests Guide

**Story 7.16: Fix Integration Test Infrastructure**

This guide covers how to run, write, and troubleshoot integration tests in the investments-planner project.

## Table of Contents

- [Overview](#overview)
- [Database Requirements](#database-requirements)
- [Environment Setup](#environment-setup)
- [Running Integration Tests](#running-integration-tests)
- [Test Helper Usage](#test-helper-usage)
- [Graceful Database Handling](#graceful-database-handling)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

## Overview

Integration tests verify the interaction between multiple components of the application, including:

- API endpoints and their handlers
- Database operations and queries
- Authentication and authorization flows
- Background job processing (Inngest)
- External service integrations

**Location:** `tests/integration/`

**File naming:** `*.test.ts`

**Framework:** Vitest with custom integration configuration

## Database Requirements

Integration tests require a **PostgreSQL database** to run successfully. Without a database connection, tests will be gracefully skipped.

### Local Database Setup

1. **Install PostgreSQL** (version 14 or higher):

   ```bash
   # macOS (Homebrew)
   brew install postgresql@14
   brew services start postgresql@14

   # Ubuntu/Debian
   sudo apt-get install postgresql-14
   sudo systemctl start postgresql
   ```

2. **Create a test database**:

   ```bash
   psql postgres
   CREATE DATABASE investments_planner_test;
   \q
   ```

3. **Set environment variable**:

   ```bash
   # Add to .env.local or .env.test
   DATABASE_URL="postgresql://user:password@localhost:5432/investments_planner_test"
   ```

4. **Run migrations**:
   ```bash
   pnpm db:migrate
   ```

## Environment Setup

### Required Environment Variables

```env
# Database connection (required for integration tests)
DATABASE_URL="postgresql://user:password@localhost:5432/investments_planner_test"

# JWT authentication (required for auth tests)
JWT_SECRET="test-secret-key-for-integration-tests"

# Optional: Vercel KV for cache tests (fallback to in-memory mock if not provided)
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
```

### Test Environment Files

- `.env.test` - Loaded automatically by Vitest for integration tests
- `.env.local` - Used for local development (not committed to git)

## Running Integration Tests

### Run All Integration Tests

```bash
pnpm test:integration
```

### Run Specific Test File

```bash
pnpm test:integration tests/integration/api/inngest-webhook.test.ts
```

### Run Tests in Watch Mode

```bash
pnpm test:integration --watch
```

### Run Tests with Coverage

```bash
pnpm test:integration --coverage
```

## Test Helper Usage

### Test User Helpers

Located in: `tests/helpers/test-user.ts`

**Create a test user:**

```typescript
import { createTestUser, deleteTestUser } from "@tests/helpers";

describe("My Integration Test", () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await createTestUser({
      email: "custom@example.com", // Optional
      name: "Custom User", // Optional
      locale: "pt-BR", // Optional
      emailVerified: true, // Optional
    });
    testUserId = user.userId;
  });

  afterAll(async () => {
    await deleteTestUser(testUserId);
  });
});
```

**Get default test user data (without database):**

```typescript
import { getTestUser } from "@tests/helpers";

const userData = getTestUser();
// { email: "test@example.com", password: "Test123!@#", name: "Test User", locale: "en-US" }
```

### Authentication Helpers

Located in: `tests/helpers/auth-headers.ts`

**Create auth headers:**

```typescript
import { getAuthHeaders } from "@tests/helpers";

const headers = await getAuthHeaders(userId);
// { Authorization: "Bearer <jwt>", "Content-Type": "application/json" }

// Use with fetch
const response = await fetch("http://localhost:3000/api/portfolios", {
  headers,
});
```

**Create custom JWT token:**

```typescript
import { createAuthToken } from "@tests/helpers";

const token = await createAuthToken(userId, "1h"); // Custom expiration
```

### Database Availability Check

Located in: `tests/helpers/db-check.ts`

**Skip tests when database unavailable:**

```typescript
import { isDatabaseAvailable, getDatabaseSkipMessage } from "@tests/helpers";

// Check database availability before running tests
const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)("My Database Tests", () => {
  // Tests that require database
});

// Log skip message if database unavailable
if (!dbAvailable) {
  console.log("\n⚠️  Integration tests skipped:");
  console.log(getDatabaseSkipMessage());
}
```

## Graceful Database Handling

Integration tests are designed to **gracefully skip** when the database is unavailable, rather than failing.

### How It Works

1. **Database availability check** runs before test suite execution
2. If database is unavailable, tests are **skipped** with `describe.skipIf()`
3. A **helpful message** explains how to enable tests
4. Tests **do not fail** - they simply skip

### Expected Behavior

**Without database:**

```
⚠️  Integration tests skipped:
Database connection unavailable. These tests require a local PostgreSQL database.

To enable these tests:
1. Start a PostgreSQL instance on localhost:5432
2. Set DATABASE_URL environment variable
3. Run migrations: pnpm db:migrate

See docs/testing/integration-tests.md for more details.

 ↓ tests/integration/alerts-api-grouped.test.ts (11 tests | 11 skipped)
```

**With database:**

```
✓ tests/integration/alerts-api-grouped.test.ts (11 tests)
```

### Database Connection Loss During Test Execution

If the database connection is lost **during** test execution (not just at startup), tests will fail with a database error. This is expected behavior - tests require a stable database connection throughout execution.

**Handling mid-execution failures:**

- Integration tests check database availability at startup using `isDatabaseAvailable()`
- If database disconnects during test run, the test will fail (not skip)
- Ensure database is stable before running integration tests
- Use transaction rollback in `afterEach` hooks to maintain clean state

## CI/CD Pipeline

### GitHub Actions

The CI/CD pipeline runs integration tests with a PostgreSQL service container.

**Note:** This project may not yet have a GitHub Actions workflow configured. If you need to add one, create `.github/workflows/test.yml` with the configuration below.

**Example configuration for `.github/workflows/test.yml`:**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: investments_planner_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/investments_planner_test
          JWT_SECRET: test-secret-for-ci
```

### Expected Test Results in CI

- **All integration tests should PASS** (database is available)
- **No tests should be SKIPPED** (unless explicitly marked)
- **Build fails if tests fail** (not if they skip)

### Local vs CI Behavior

| Environment         | Database Available | Test Behavior              |
| ------------------- | ------------------ | -------------------------- |
| Local Dev (no DB)   | ❌ No              | Tests SKIPPED with message |
| Local Dev (with DB) | ✅ Yes             | Tests RUN and PASS/FAIL    |
| CI/CD Pipeline      | ✅ Yes             | Tests RUN and PASS/FAIL    |

## Troubleshooting

### Tests are Skipping Locally

**Problem:** Integration tests show as "skipped" when running locally.

**Solution:**

1. Verify PostgreSQL is running: `psql postgres -c 'SELECT 1'`
2. Check `DATABASE_URL` is set: `echo $DATABASE_URL`
3. Test database connection: `pnpm db:migrate`
4. If still failing, check PostgreSQL logs for errors

### Database Connection Errors

**Problem:** `Error: connect ECONNREFUSED ::1:5432`

**Solution:**

1. Ensure PostgreSQL is running: `brew services start postgresql@14`
2. Check port 5432 is not blocked: `lsof -i :5432`
3. Verify connection string format: `postgresql://user:password@localhost:5432/dbname`

### Tests Failing After Migration

**Problem:** Tests fail after database schema changes.

**Solution:**

1. Drop test database: `psql postgres -c 'DROP DATABASE investments_planner_test'`
2. Recreate database: `psql postgres -c 'CREATE DATABASE investments_planner_test'`
3. Run migrations: `pnpm db:migrate`
4. Retry tests: `pnpm test:integration`

### JWT Token Errors

**Problem:** `Error: JWT verification failed`

**Solution:**

1. Check `JWT_SECRET` is set in `.env.test` or `.env.local`
2. Ensure same secret is used in app and tests
3. Verify token expiration hasn't passed (default: 15m)

### Test User Creation Fails

**Problem:** `Error: Failed to create test user`

**Solution:**

1. Check database connection is working
2. Verify `users` table exists: `pnpm db:studio`
3. Check for unique constraint violations (email already exists)
4. Ensure proper cleanup in `afterAll()` hooks

### Tests Timeout

**Problem:** Integration tests timeout after 60 seconds.

**Solution:**

1. Check database queries are not blocked
2. Verify Inngest functions are not hanging
3. Increase timeout in test file: `{ timeout: 120000 }`
4. Review logs for slow queries

## Writing New Integration Tests

### Best Practices

1. **Always clean up resources:**

   ```typescript
   afterAll(async () => {
     await deleteTestUser(testUserId);
   });
   ```

2. **Use database availability check:**

   ```typescript
   const dbAvailable = await isDatabaseAvailable();
   describe.skipIf(!dbAvailable)("My Tests", () => { ... });
   ```

3. **Create unique test data:**

   ```typescript
   const user = await createTestUser({
     email: `test-${Date.now()}@example.com`,
   });
   ```

4. **Test both success and error cases:**

   ```typescript
   it("should return 200 for valid request", async () => { ... });
   it("should return 401 for unauthenticated request", async () => { ... });
   it("should return 404 for non-existent resource", async () => { ... });
   ```

5. **Verify API response structure:**
   ```typescript
   expect(response.status).toBe(200);
   const data = await response.json();
   expect(data).toHaveProperty("data");
   expect(data).toHaveProperty("meta");
   ```

### Template for New Integration Test

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestUser,
  deleteTestUser,
  getAuthHeaders,
  isDatabaseAvailable,
  getDatabaseSkipMessage,
} from "@tests/helpers";

// Check database availability
const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)("My Integration Test Suite", () => {
  let testUserId: string;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    const user = await createTestUser();
    testUserId = user.userId;
    authHeaders = await getAuthHeaders(testUserId);
  });

  afterAll(async () => {
    await deleteTestUser(testUserId);
  });

  describe("Feature: My Feature", () => {
    it("should work as expected", async () => {
      const response = await fetch("http://localhost:3000/api/my-endpoint", {
        headers: authHeaders,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("data");
    });
  });
});

// Log skip message if database unavailable
if (!dbAvailable) {
  console.log("\n⚠️  Integration tests skipped:");
  console.log(getDatabaseSkipMessage());
}
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Project Testing Standards](/docs/testing/README.md)

---

**Last Updated:** 2026-01-04 (Story 7.16)
