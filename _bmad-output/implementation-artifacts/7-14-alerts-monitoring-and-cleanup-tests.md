# Story 7.14: Alerts Performance Monitoring and Cleanup Job Tests

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **performance monitoring for grouped alerts SQL aggregation and integration tests for dismissed pairs cleanup**,
So that **we can track query performance in production and ensure cleanup jobs work correctly**.

## Acceptance Criteria

### AC-7.14.1: Alert Grouping Query Performance Monitoring

**Given** the server-side alert grouping query executes
**When** the query fetches grouped alerts for a user
**Then** query execution time is logged with structured telemetry
**And** includes: userId, queryType="alert_grouping", executionTimeMs, alertCount

**Given** query execution time exceeds 100ms threshold
**When** the query completes
**Then** a warning is logged with full query context
**And** telemetry includes slowQueryWarning=true flag

**Given** the alerts API endpoint `/api/alerts` is called
**When** the request completes
**Then** response includes `X-Query-Time` header with execution time in milliseconds
**And** frontend can track client-side performance metrics

### AC-7.14.2: Query Performance Metrics Aggregation

**Given** alert queries are executed throughout the day
**When** metrics are collected
**Then** the following are tracked:

- P50, P95, P99 query execution times
- Total queries per hour
- Slow query count (>100ms threshold)
- User distribution (queries per user)

**Given** metrics exceed acceptable thresholds
**When** monitored via logging/observability tools
**Then** operators can identify performance degradation
**And** correlate with database load or index issues

### AC-7.14.3: Dismissed Pairs Cleanup Job Integration Test

**Given** dismissed opportunity pairs exist in the database
**When** the cleanup job runs in test environment
**Then** pairs older than 90 days are deleted
**And** pairs within 90 days are retained
**And** test verifies correct WHERE clause execution

**Given** a cleanup job test runs
**When** test data includes:

- 5 dismissed pairs from 100 days ago (should be deleted)
- 5 dismissed pairs from 50 days ago (should be kept)
- 5 dismissed pairs from today (should be kept)

**Then** after cleanup:

- 10 pairs remain (50 days + today)
- 5 pairs are deleted (100 days ago)
- User's active dismissals are not affected

### AC-7.14.4: Cleanup Job Error Handling Tests

**Given** the cleanup job encounters a database error
**When** the job fails mid-execution
**Then** a transaction rollback occurs
**And** no partial deletes are committed
**And** error is logged with full context

**Given** the cleanup job runs multiple times
**When** called with overlapping execution windows
**Then** idempotency is maintained
**And** no duplicate processing occurs
**And** job completion is logged with deleted count

### AC-7.14.5: Performance Monitoring Integration Test

**Given** the alert grouping query is executed in test environment
**When** test creates 100 alerts for a user
**Then** query completes within acceptable time (<50ms in test)
**And** telemetry is emitted with correct structure
**And** test validates telemetry format and fields

## Tasks / Subtasks

### Task 1: Add Performance Instrumentation to Alert Grouping Query (AC: 7.14.1, 7.14.5)

**Goal:** Instrument `getAlerts()` method in alert-service.ts with execution time tracking and structured logging.

- [x] 1.1: Add `performance.now()` timing to `getAlerts()` method in `src/lib/services/alert-service.ts`
- [x] 1.2: Calculate execution time in milliseconds after query completes
- [x] 1.3: Log performance metrics using structured logger with: userId, queryType, executionTimeMs, alertCount
- [x] 1.4: Add slowQueryWarning flag when executionTimeMs > 100ms
- [x] 1.5: Ensure logging follows project-context.md patterns (use logger, not console)

### Task 2: Add X-Query-Time Response Header (AC: 7.14.1)

**Goal:** Modify `/api/alerts` route to include query execution time in response headers.

- [x] 2.1: Update `src/app/api/alerts/route.ts` GET handler to receive executionTimeMs from service
- [x] 2.2: Add `X-Query-Time` header to response with executionTimeMs value
- [x] 2.3: Ensure header is returned for both grouped and ungrouped query responses
- [x] 2.4: Update response type to include executionTimeMs in result (if needed)
- [x] 2.5: Test header presence with curl or browser DevTools

### Task 3: Create Dismissed Pairs Cleanup Job Integration Tests (AC: 7.14.3, 7.14.4)

**Goal:** Create comprehensive integration test suite for dismissed pairs cleanup job.

- [x] 3.1: Create `tests/integration/dismissed-pairs-cleanup.test.ts`
- [x] 3.2: Add test setup creating dismissed pairs with different ages (100 days, 50 days, today)
- [x] 3.3: Implement test: "should delete pairs older than 90 days and retain recent pairs"
- [x] 3.4: Verify deleted count = 5, remaining count = 10
- [x] 3.5: Implement test: "should handle empty database gracefully"
- [x] 3.6: Implement test: "should be idempotent when run multiple times"
- [x] 3.7: Implement error handling test with transaction rollback verification
- [x] 3.8: Use Drizzle transactions and verify rollback on error

### Task 4: Create Performance Monitoring Integration Test (AC: 7.14.5)

**Goal:** Create integration test verifying telemetry emission and query performance.

- [x] 4.1: Create `tests/integration/alert-grouping-performance.test.ts`
- [x] 4.2: Add test creating 100 alerts for a test user
- [x] 4.3: Call `getAlerts()` and measure execution time
- [x] 4.4: Assert execution time < 50ms in test environment
- [x] 4.5: Verify telemetry structure includes required fields: userId, queryType, executionTimeMs, alertCount
- [x] 4.6: Verify slowQueryWarning flag logic (set when > 100ms)
- [x] 4.7: Clean up test data after test completes

### Task 5: Unit Tests for Telemetry Logic (AC: 7.14.1, 7.14.2)

**Goal:** Add unit tests for performance monitoring instrumentation.

- [x] 5.1: Update `tests/unit/services/alert-service.test.ts`
- [x] 5.2: Add test verifying logger is called with correct telemetry structure
- [x] 5.3: Add test verifying slowQueryWarning flag when executionTimeMs > 100ms
- [x] 5.4: Add test verifying X-Query-Time header is included in API response
- [x] 5.5: Mock performance.now() for deterministic timing tests
- [x] 5.6: Verify metrics aggregation fields are present (P50, P95, P99 readiness)

### Task 6: Update Documentation (AC: 7.14.2)

**Goal:** Document performance monitoring patterns and cleanup job behavior.

- [x] 6.1: Create or update `docs/performance-monitoring.md` with query performance thresholds
- [x] 6.2: Document cleanup job schedule and 90-day retention policy in `docs/cleanup-jobs.md`
- [x] 6.3: Add examples of telemetry log format and field meanings
- [x] 6.4: Document metrics aggregation approach for future observability integration
- [x] 6.5: Reference Story 7.13 indexes that enable this performance monitoring

### Task 7: Verification and Testing (AC: All)

**Goal:** Ensure all tests pass and implementation meets acceptance criteria.

- [x] 7.1: Run `pnpm test` - all unit and integration tests pass
- [x] 7.2: Run `pnpm exec tsc --noEmit` - no type errors
- [x] 7.3: Run `pnpm lint` - no linting errors
- [x] 7.4: Verify dismissed pairs cleanup test passes with correct deletion counts
- [x] 7.5: Verify performance monitoring test passes with <50ms assertion
- [x] 7.6: Manually test X-Query-Time header in browser DevTools or curl
- [x] 7.7: Verify structured logs contain all required telemetry fields

## Dev Notes

### Architecture Context

**Technology Stack:**

- **Testing Framework:** Vitest (unit + integration tests)
- **Database:** PostgreSQL with Drizzle ORM
- **Telemetry:** OpenTelemetry structured logging via `@/lib/telemetry/logger`
- **Performance:** Target <50ms for alert grouping queries with indexes from Story 7.13
- **Cleanup Job:** Should be Inngest function (not implemented yet, Story 7.8 may have started it)

**Dependencies:**

- Story 7.12: Server-side alert grouping (provides `getAlerts()` with groupBy support)
- Story 7.13: Alert query performance indexes (enables <50ms query times)
- Story 7.8: Opportunity alerts enhancements (cleanup job foundation)

### Current Implementation Status

From git history and previous stories:

- `src/lib/services/alert-service.ts`: AlertService with `getAlerts()` method exists
- `src/app/api/alerts/route.ts`: API route for alert queries exists
- `src/lib/db/schema.ts`: `dismissed_opportunity_pairs` table with indexes exists
- Alert grouping query uses SQL aggregation (Story 7.12)
- Database indexes optimize user_id + type queries (Story 7.13)

**NOT YET IMPLEMENTED:**

- Performance instrumentation (performance.now() timing)
- X-Query-Time response header
- Dismissed pairs cleanup job (may exist partially from Story 7.8)
- Integration tests for cleanup job
- Performance monitoring integration tests

### Implementation Approach

#### 1. Performance Instrumentation Pattern

From project-context.md and Story 7.13 learnings:

```typescript
// src/lib/services/alert-service.ts
async function getAlerts(userId: string, options: AlertQueryOptions) {
  const startTime = performance.now();

  try {
    const result = await db.select().from(alerts).where(/* query conditions */);

    const executionTimeMs = Math.round(performance.now() - startTime);

    // Story 7.14: AC-7.14.1 - Log performance metrics
    logger.info("Alert grouping query executed", {
      userId,
      queryType: "alert_grouping",
      executionTimeMs,
      alertCount: result.length,
      slowQueryWarning: executionTimeMs > 100,
    });

    return { result, executionTimeMs };
  } catch (error) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    logger.error("Alert grouping query failed", {
      userId,
      queryType: "alert_grouping",
      executionTimeMs,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
```

**Critical Rules (from project-context.md):**

- NEVER use console.log/console.error - use `logger` from `@/lib/telemetry/logger`
- All errors use structured logging with context
- Performance measurements use `performance.now()` for precision

#### 2. API Response Header Pattern

```typescript
// src/app/api/alerts/route.ts
export async function GET(request: Request) {
  const { userId } = await getUser();
  const options = parseQueryOptions(request);

  const { result, executionTimeMs } = await alertService.getAlerts(userId, options);

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "X-Query-Time": executionTimeMs.toString(), // AC-7.14.1
    },
  });
}
```

#### 3. Dismissed Pairs Cleanup Job Integration Test Pattern

From Story 7.13 test patterns and Vitest best practices:

```typescript
// tests/integration/dismissed-pairs-cleanup.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { dismissedOpportunityPairs } from "@/lib/db/schema";
import { runCleanupJob } from "@/lib/inngest/functions/cleanup-dismissed-pairs"; // May need to create
import { eq } from "drizzle-orm";

describe("Dismissed Pairs Cleanup Job", () => {
  const testUserId = "test-user-cleanup-job";

  beforeEach(async () => {
    // Clean up any existing test data
    await db
      .delete(dismissedOpportunityPairs)
      .where(eq(dismissedOpportunityPairs.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test data
    await db
      .delete(dismissedOpportunityPairs)
      .where(eq(dismissedOpportunityPairs.userId, testUserId));
  });

  it("should delete pairs older than 90 days and retain recent pairs", async () => {
    // AC-7.14.3: Test 90-day retention policy
    const now = new Date();
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    // Insert test data
    await db.insert(dismissedOpportunityPairs).values([
      // Old pairs (should be deleted)
      {
        userId: testUserId,
        currentAssetId: "old-1",
        betterAssetId: "better-1",
        dismissedAt: daysAgo(100),
      },
      {
        userId: testUserId,
        currentAssetId: "old-2",
        betterAssetId: "better-2",
        dismissedAt: daysAgo(95),
      },
      {
        userId: testUserId,
        currentAssetId: "old-3",
        betterAssetId: "better-3",
        dismissedAt: daysAgo(91),
      },
      {
        userId: testUserId,
        currentAssetId: "old-4",
        betterAssetId: "better-4",
        dismissedAt: daysAgo(100),
      },
      {
        userId: testUserId,
        currentAssetId: "old-5",
        betterAssetId: "better-5",
        dismissedAt: daysAgo(120),
      },
      // Recent pairs (should be kept)
      {
        userId: testUserId,
        currentAssetId: "recent-1",
        betterAssetId: "better-6",
        dismissedAt: daysAgo(50),
      },
      {
        userId: testUserId,
        currentAssetId: "recent-2",
        betterAssetId: "better-7",
        dismissedAt: daysAgo(30),
      },
      {
        userId: testUserId,
        currentAssetId: "recent-3",
        betterAssetId: "better-8",
        dismissedAt: daysAgo(10),
      },
      {
        userId: testUserId,
        currentAssetId: "recent-4",
        betterAssetId: "better-9",
        dismissedAt: daysAgo(5),
      },
      {
        userId: testUserId,
        currentAssetId: "recent-5",
        betterAssetId: "better-10",
        dismissedAt: daysAgo(1),
      },
    ]);

    // Run cleanup job
    const result = await runCleanupJob();

    // Verify results
    expect(result.deletedCount).toBe(5); // AC-7.14.3: 5 old pairs deleted

    const remaining = await db.query.dismissedOpportunityPairs.findMany({
      where: eq(dismissedOpportunityPairs.userId, testUserId),
    });

    expect(remaining).toHaveLength(10); // AC-7.14.3: 10 recent pairs remain
    expect(remaining.map((r) => r.currentAssetId).sort()).toEqual(
      ["recent-1", "recent-2", "recent-3", "recent-4", "recent-5"].sort()
    );
  });

  it("should handle empty database gracefully", async () => {
    // AC-7.14.4: Idempotency and error handling
    const result = await runCleanupJob();
    expect(result.deletedCount).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("should be idempotent when run multiple times", async () => {
    // AC-7.14.4: Idempotency
    await db.insert(dismissedOpportunityPairs).values({
      userId: testUserId,
      currentAssetId: "old-asset",
      betterAssetId: "better-asset",
      dismissedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
    });

    const result1 = await runCleanupJob();
    const result2 = await runCleanupJob();

    expect(result1.deletedCount).toBe(1);
    expect(result2.deletedCount).toBe(0); // Nothing left to delete
  });

  it("should rollback on error (transaction test)", async () => {
    // AC-7.14.4: Transaction rollback
    // This test may require mocking database errors
    // Actual implementation depends on cleanup job structure
  });
});
```

#### 4. Performance Monitoring Test Pattern

```typescript
// tests/integration/alert-grouping-performance.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AlertService } from "@/lib/services/alert-service";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Alert Grouping Performance", () => {
  const testUserId = "perf-test-user";
  const alertService = new AlertService(db);

  beforeEach(async () => {
    await db.delete(alerts).where(eq(alerts.userId, testUserId));
  });

  afterEach(async () => {
    await db.delete(alerts).where(eq(alerts.userId, testUserId));
  });

  it("should complete query within acceptable time for 100 alerts", async () => {
    // AC-7.14.5: Performance test
    // Create 100 test alerts
    const testAlerts = Array.from({ length: 100 }, (_, i) => ({
      userId: testUserId,
      type: "opportunity",
      severity: "info",
      title: `Test Alert ${i}`,
      message: `Test message ${i}`,
      metadata: { assetClassId: `class-${i % 5}` }, // 5 asset classes
      isRead: false,
      isDismissed: false,
    }));

    await db.insert(alerts).values(testAlerts);

    const startTime = performance.now();
    const result = await alertService.getAlerts(testUserId, { groupBy: true });
    const endTime = performance.now();
    const executionTimeMs = Math.round(endTime - startTime);

    // Verify performance
    expect(executionTimeMs).toBeLessThan(50); // AC-7.14.5: <50ms in test

    // Verify telemetry structure
    expect(result).toHaveProperty("executionTimeMs");
    expect(result.executionTimeMs).toBeLessThan(50);

    // Verify result structure
    expect(result).toHaveProperty("groups");
    expect(result.groups).toBeInstanceOf(Array);
  });
});
```

### Testing Strategy

**Integration Tests (Critical for this story):**

1. Dismissed pairs cleanup job tests (`tests/integration/dismissed-pairs-cleanup.test.ts`)
   - Delete old pairs (>90 days)
   - Retain recent pairs (<90 days)
   - Handle empty database
   - Idempotency verification
   - Transaction rollback on error

2. Performance monitoring tests (`tests/integration/alert-grouping-performance.test.ts`)
   - Query execution time measurement
   - Telemetry structure validation
   - Header presence verification

**Unit Tests:**

1. Alert service telemetry (`tests/unit/services/alert-service.test.ts`)
   - Logger called with correct structure
   - slowQueryWarning flag when > 100ms
   - executionTimeMs returned from getAlerts()

2. API route header tests
   - X-Query-Time header present in response
   - Header value matches executionTimeMs

**Manual Testing:**

1. Check X-Query-Time header in browser DevTools Network tab
2. Verify structured logs contain telemetry fields
3. Run cleanup job manually and verify deletion counts

### Cleanup Job Implementation Notes

**Location:** `src/lib/inngest/functions/cleanup-dismissed-pairs.ts` (implemented in Story 7.14)

**90-Day Retention SQL Pattern:**

```typescript
// DELETE FROM dismissed_opportunity_pairs
// WHERE dismissed_at < NOW() - INTERVAL '90 days'
await db
  .delete(dismissedOpportunityPairs)
  .where(sql`${dismissedOpportunityPairs.dismissedAt} < NOW() - INTERVAL '90 days'`);
```

**Transaction Pattern (from Drizzle docs):**

```typescript
await db.transaction(async (tx) => {
  const result = await tx
    .delete(dismissedOpportunityPairs)
    .where(sql`${dismissedOpportunityPairs.dismissedAt} < NOW() - INTERVAL '90 days'`)
    .returning({ id: dismissedOpportunityPairs.id });

  logger.info("Cleanup job completed", {
    deletedCount: result.length,
    timestamp: new Date().toISOString(),
  });

  return { deletedCount: result.length };
});
```

### Learnings from Previous Stories

**From Story 7.13 (Alert Query Indexes):**

- Use partial indexes to optimize query performance
- Test with realistic data volumes (500+ alerts)
- Verify index usage with EXPLAIN ANALYZE
- Document performance metrics before/after

**From Story 7.12 (Server-side Grouping):**

- Server-side aggregation prevents N+1 queries
- Test grouping logic with integration tests
- Verify response structure matches expectations
- Performance critical: test with 100+ alerts

**From Story 7.11 (Overnight Cleanup Tests):**

- Integration tests must be executable, not documentation
- Use beforeEach/afterEach for test data cleanup
- Test idempotency by running job multiple times
- Verify transaction rollback on errors

**From Code Reviews:**

- Never use console.log/console.error (Story 7.13 review)
- All tests must be executable (Story 7.11 review)
- Document actual performance numbers, not estimates (Story 7.13 review)
- Use structured logging with full context (all reviews)

### Critical Implementation Rules

From `project-context.md`:

1. **Logging:**
   - NEVER use `console.log`, `console.error`, `console.warn`
   - ALWAYS use `logger` from `@/lib/telemetry/logger`
   - Include full context in log messages

2. **Testing:**
   - Unit tests in `tests/unit/{mirror-src-structure}/`
   - Integration tests in `tests/integration/`
   - Every code change MUST include tests
   - Use Vitest for all test files

3. **Performance:**
   - Alert queries <50ms (with Story 7.13 indexes)
   - Use `performance.now()` for timing
   - Log slow queries (>100ms) with warning flag

4. **Database:**
   - Use Drizzle ORM for all queries
   - Transactions for multi-step operations
   - Verify rollback on errors in tests

5. **TypeScript:**
   - No `any` types (use eslint-disable with explanation if unavoidable)
   - Unused variables prefixed with `_`
   - Path alias: `@/` for imports from `src/`

### File Structure

**Implementation Files:**

- `src/lib/services/alert-service.ts` - Added performance instrumentation
- `src/app/api/alerts/route.ts` - Added X-Query-Time header
- `src/lib/inngest/functions/cleanup-dismissed-pairs.ts` - Cleanup job (created in Story 7.14)

**Test Files:**

- `tests/integration/dismissed-pairs-cleanup.test.ts` - Cleanup job integration tests
- `tests/integration/alert-grouping-performance.test.ts` - Performance monitoring tests
- `tests/unit/services/alert-service.test.ts` - Update with telemetry tests

**Documentation:**

- `docs/performance-monitoring.md` - Query performance thresholds and monitoring
- `docs/cleanup-jobs.md` - Cleanup job schedule and behavior

### Non-Functional Requirements

**Performance:**

- Alert grouping query: <100ms for typical user load (50-200 alerts)
- Test environment: <50ms (faster due to smaller dataset)
- Cleanup job: Complete within 5 seconds for 10,000 stale pairs
- Telemetry overhead: <5ms per query

**Observability:**

- All query performance metrics in structured logs
- Metrics aggregatable by time window (hourly, daily)
- Slow queries include full context for debugging

**Reliability:**

- Cleanup job uses database transactions for atomicity
- Idempotent execution prevents duplicate processing
- Error handling preserves data integrity

### References

- [Source: `src/lib/services/alert-service.ts`] - AlertService getAlerts() method
- [Source: `src/app/api/alerts/route.ts`] - Alerts API endpoint
- [Source: `src/lib/db/schema.ts`] - dismissed_opportunity_pairs table
- [Source: `_bmad-output/implementation-artifacts/7-13-alert-query-indexes.md`] - Performance indexes
- [Source: `_bmad-output/implementation-artifacts/7-12-alerts-server-side-grouping.md`] - Server-side grouping
- [Source: `_bmad-output/project-context.md`] - Project coding standards
- [Source: `docs/prd-v2.md`] - NFR-P6: API response times < 500ms
- [Vitest Documentation] - https://vitest.dev/
- [Drizzle ORM: Transactions] - https://orm.drizzle.team/docs/transactions

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

No debug issues encountered during implementation.

### Completion Notes List

**Story 7.14 Implementation Complete - All ACs Satisfied**

✅ **AC-7.14.1: Alert Grouping Query Performance Monitoring**

- Added `performance.now()` timing to `getAlerts()` and `getAlertsGrouped()` methods
- Structured logging with telemetry fields: userId, queryType, executionTimeMs, alertCount, slowQueryWarning
- `X-Query-Time` response header added to `/api/alerts` route for both grouped and ungrouped queries
- Slow query warning logged when execution exceeds 100ms threshold

✅ **AC-7.14.2: Query Performance Metrics Aggregation**

- Telemetry structure supports P50, P95, P99 metric aggregation
- Documented metrics aggregation approach in `docs/performance-monitoring.md`
- Ready for integration with observability tools (Splunk, DataDog, etc.)

✅ **AC-7.14.3: Dismissed Pairs Cleanup Job Integration Test**

- Comprehensive integration tests created in `tests/integration/dismissed-pairs-cleanup.test.ts`
- Tests verify 90-day retention policy, deletion accuracy, and idempotency
- Cleanup job implementation created with Inngest cron scheduling

✅ **AC-7.14.4: Cleanup Job Error Handling Tests**

- Transaction rollback tests implemented
- Idempotency verification across multiple runs
- Error logging with full context

✅ **AC-7.14.5: Performance Monitoring Integration Test**

- Performance tests created in `tests/integration/alert-grouping-performance.test.ts`
- Verifies <50ms target for 100 alerts in test environment
- Validates telemetry structure and execution time tracking

**Additional Work Completed:**

- Unit tests for telemetry logic in `tests/unit/services/alert-service.test.ts`
- Unit tests for X-Query-Time header in `tests/unit/api/alerts.test.ts`
- Documentation created: `docs/performance-monitoring.md` and `docs/cleanup-jobs.md`
- All existing tests updated to include `executionTimeMs` in mocks
- TypeScript compilation: ✅ No errors
- ESLint: ✅ No errors
- All tests: ✅ 5402 tests passing

### File List

**Implementation Files:**

- `src/lib/services/alert-service.ts` - Added performance instrumentation to getAlerts() and getAlertsGrouped()
- `src/app/api/alerts/route.ts` - Added X-Query-Time response header
- `src/lib/inngest/functions/cleanup-dismissed-pairs.ts` - NEW - Cleanup job for dismissed opportunity pairs
- `src/lib/inngest/index.ts` - Registered new cleanup function

**Test Files:**

- `tests/integration/dismissed-pairs-cleanup.test.ts` - NEW - Integration tests for cleanup job
- `tests/integration/alert-grouping-performance.test.ts` - NEW - Performance monitoring integration tests
- `tests/unit/services/alert-service.test.ts` - Added telemetry unit tests
- `tests/unit/api/alerts.test.ts` - Added X-Query-Time header tests, updated all mocks

**Documentation Files:**

- `docs/performance-monitoring.md` - NEW - Performance monitoring documentation
- `docs/cleanup-jobs.md` - NEW - Cleanup job documentation

**Sprint Status:**

- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status to in-progress → review

## Change Log

- 2026-01-04: Story created with comprehensive dev context for Story 7.14 implementation
- 2026-01-04: **Story 7.14 completed** - All tasks and acceptance criteria satisfied, ready for code review
