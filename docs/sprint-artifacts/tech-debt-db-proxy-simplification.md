# Technical Debt Story: Simplify Database Connection Proxy Pattern

## Story Overview

**Type:** Technical Debt / Code Quality
**Priority:** Medium
**Estimated Effort:** 5-8 Function Points
**Epic:** Infrastructure / Code Quality

## Background

During Epic 2 PR review (Issue #5), it was identified that the database connection initialization in `src/lib/db/index.ts` uses a complex Proxy pattern for lazy initialization. While this pattern was implemented to support test environments where `DATABASE_URL` may not be properly configured, it adds significant complexity:

1. Every property access goes through Proxy overhead
2. Error messages are deferred and may be confusing in production
3. The pattern is overly complex for the problem it solves

From CLAUDE.md Development Standards:

> Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.

## Current Implementation

```typescript
// Current: Complex Proxy pattern (lines 108-148)
export const db = new Proxy({} as ReturnType<typeof createDatabaseConnection>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});
```

## Acceptance Criteria

- [ ] AC-1: Database connection uses simple conditional initialization based on environment
- [ ] AC-2: Test environment has separate mock/test database configuration
- [ ] AC-3: Production code has no Proxy overhead
- [ ] AC-4: Error messages are clear and immediate on startup
- [ ] AC-5: All existing tests continue to pass
- [ ] AC-6: Integration tests can still mock the database connection

## Proposed Solution

### Option A: Environment-based Conditional Export

```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return drizzle(client, { schema });
}

export const db = createDatabaseConnection();
export type Database = typeof db;
```

### Option B: Test Mock Module

Create `src/lib/db/index.test.ts` for test environments:

```typescript
// src/lib/db/index.test.ts
export const db = {
  // Mock implementation for tests
  select: vi.fn(),
  insert: vi.fn(),
  // etc.
};
```

Configure Vitest to use test module:

```typescript
// vitest.config.ts
resolve: {
  alias: {
    '@/lib/db': process.env.VITEST ? '@/lib/db/index.test' : '@/lib/db/index'
  }
}
```

## Files to Update

- [ ] `src/lib/db/index.ts` - Simplify initialization
- [ ] `vitest.config.ts` - Add test alias if using Option B
- [ ] `tests/integration/setup.ts` - Update if needed
- [ ] Any files that import from `@/lib/db`

## Definition of Done

- [ ] Database connection simplified
- [ ] No Proxy overhead in production
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Clear error messages on connection failure
- [ ] PR review approved

## Related

- Epic 2 PR Review - Issue #5
- CLAUDE.md Development Standards
- `src/lib/db/index.ts` current implementation
