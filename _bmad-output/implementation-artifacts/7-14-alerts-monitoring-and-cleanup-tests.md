# Story 7.14: Alerts Performance Monitoring and Cleanup Job Tests

**Epic:** Epic 7 - Data Transparency & Alerts
**Story Type:** Technical Enhancement
**Priority:** Medium
**Estimated Effort:** 5 Function Points

## Story Description

As a **developer**,
I want **performance monitoring for grouped alerts SQL aggregation and integration tests for dismissed pairs cleanup**,
So that **we can track query performance in production and ensure cleanup jobs work correctly**.

## Context

This story adds observability and test coverage for two critical alert system components:

1. **Performance Monitoring:** The server-side alert grouping (Story 7.12) uses SQL aggregation to count alerts by type. We need to monitor query execution time to detect performance regressions.

2. **Cleanup Job Tests:** The dismissed opportunity pairs cleanup job (Story 7.8) removes stale dismissal memory after 90 days. This job needs integration test coverage to prevent data retention issues.

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

## Technical Implementation Notes

### Performance Monitoring

**Location:** `src/lib/services/alert-service.ts`

**Instrumentation Pattern:**

```typescript
import { tracer } from "@/lib/telemetry/tracer";
import { logger } from "@/lib/telemetry/logger";

async function getGroupedAlerts(userId: string) {
  const startTime = performance.now();
  const span = tracer.startSpan("alert_service.get_grouped_alerts");

  try {
    const result = await db.query.alerts.findMany(...);

    const executionTimeMs = performance.now() - startTime;

    // Log performance metrics
    logger.info("Alert grouping query executed", {
      userId,
      queryType: "alert_grouping",
      executionTimeMs: Math.round(executionTimeMs),
      alertCount: result.length,
      slowQueryWarning: executionTimeMs > 100,
    });

    span.setAttributes({
      "query.type": "alert_grouping",
      "query.execution_time_ms": executionTimeMs,
      "query.result_count": result.length,
    });

    return { result, executionTimeMs };
  } finally {
    span.end();
  }
}
```

**Response Header:**

```typescript
// In API route handler
const { result, executionTimeMs } = await getGroupedAlerts(userId);

return new Response(JSON.stringify(result), {
  headers: {
    "Content-Type": "application/json",
    "X-Query-Time": executionTimeMs.toString(),
  },
});
```

### Cleanup Job Integration Test

**Location:** `tests/integration/dismissed-pairs-cleanup.test.ts`

**Test Structure:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { dismissedOpportunityPairs } from "@/lib/db/schema";
import { runCleanupJob } from "@/lib/inngest/functions/cleanup-dismissed-pairs";
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
    // Insert test data with different ages
    const now = new Date();
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    // Old pairs (should be deleted)
    await db.insert(dismissedOpportunityPairs).values([
      {
        userId: testUserId,
        currentAssetId: "old-asset-1",
        betterAssetId: "better-1",
        dismissedAt: daysAgo(100),
      },
      {
        userId: testUserId,
        currentAssetId: "old-asset-2",
        betterAssetId: "better-2",
        dismissedAt: daysAgo(95),
      },
    ]);

    // Recent pairs (should be kept)
    await db.insert(dismissedOpportunityPairs).values([
      {
        userId: testUserId,
        currentAssetId: "recent-asset-1",
        betterAssetId: "better-3",
        dismissedAt: daysAgo(50),
      },
      {
        userId: testUserId,
        currentAssetId: "recent-asset-2",
        betterAssetId: "better-4",
        dismissedAt: daysAgo(1),
      },
    ]);

    // Run cleanup job
    const result = await runCleanupJob();

    // Verify results
    expect(result.deletedCount).toBe(2);

    const remaining = await db.query.dismissedOpportunityPairs.findMany({
      where: eq(dismissedOpportunityPairs.userId, testUserId),
    });

    expect(remaining).toHaveLength(2);
    expect(remaining.map((r) => r.currentAssetId)).toEqual(["recent-asset-1", "recent-asset-2"]);
  });

  it("should handle empty database gracefully", async () => {
    const result = await runCleanupJob();
    expect(result.deletedCount).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("should be idempotent when run multiple times", async () => {
    // Insert old data
    await db.insert(dismissedOpportunityPairs).values({
      userId: testUserId,
      currentAssetId: "old-asset",
      betterAssetId: "better-asset",
      dismissedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    });

    // Run cleanup twice
    const result1 = await runCleanupJob();
    const result2 = await runCleanupJob();

    expect(result1.deletedCount).toBe(1);
    expect(result2.deletedCount).toBe(0); // Nothing left to delete
  });
});
```

### Performance Test

**Location:** `tests/integration/alert-grouping-performance.test.ts`

```typescript
describe("Alert Grouping Performance", () => {
  it("should complete query within acceptable time for 100 alerts", async () => {
    const testUserId = "perf-test-user";

    // Create 100 alerts
    await createTestAlerts(testUserId, 100);

    const startTime = performance.now();
    const { result, executionTimeMs } = await getGroupedAlerts(testUserId);
    const endTime = performance.now();

    // Verify performance
    expect(executionTimeMs).toBeLessThan(50); // Test DB should be fast
    expect(endTime - startTime).toBeLessThan(100); // Include overhead

    // Verify telemetry structure
    expect(result).toHaveProperty("alertCount");
    expect(result).toHaveProperty("executionTimeMs");

    // Cleanup
    await deleteTestAlerts(testUserId);
  });
});
```

## Files to Modify

### Core Implementation

- `src/lib/services/alert-service.ts` - Add performance instrumentation
- `src/app/api/alerts/route.ts` - Add `X-Query-Time` response header
- `src/lib/inngest/functions/cleanup-dismissed-pairs.ts` - Cleanup job (if not already implemented)

### Tests

- `tests/integration/dismissed-pairs-cleanup.test.ts` - New integration test suite
- `tests/integration/alert-grouping-performance.test.ts` - Performance test
- `tests/unit/services/alert-service.test.ts` - Update with telemetry assertions

### Documentation

- `docs/performance-monitoring.md` - Document query performance thresholds
- `docs/cleanup-jobs.md` - Document cleanup job schedule and behavior

## Definition of Done

- [ ] Alert grouping query execution time is logged with structured telemetry
- [ ] Response includes `X-Query-Time` header for client-side metrics
- [ ] Slow query warnings (>100ms) are logged with full context
- [ ] Integration test for dismissed pairs cleanup job passes
- [ ] Test verifies 90-day retention policy is enforced correctly
- [ ] Test covers error handling and idempotency
- [ ] Performance test validates query completes within acceptable time
- [ ] All existing tests pass (unit, integration, E2E)
- [ ] Code review completed
- [ ] Documentation updated with monitoring patterns

## Non-Functional Requirements

### Performance

- Alert grouping query: <100ms for typical user load (50-200 alerts)
- Cleanup job: Complete within 5 seconds for 10,000 stale pairs
- Telemetry overhead: <5ms per query

### Observability

- All query performance metrics available in structured logs
- Metrics can be aggregated by time window (hourly, daily)
- Slow queries include full context for debugging

### Reliability

- Cleanup job uses database transactions for atomicity
- Idempotent execution prevents duplicate processing
- Error handling preserves data integrity

## Dependencies

- Story 7.12 (Server-side alert grouping) - Must be completed
- Story 7.8 (Opportunity alerts enhancements) - Cleanup job implementation
- Telemetry infrastructure (`@/lib/telemetry/*`)

## Testing Strategy

### Integration Tests

1. **Cleanup Job Tests:**
   - Delete old pairs (>90 days)
   - Retain recent pairs (<90 days)
   - Handle empty database
   - Idempotency verification
   - Transaction rollback on error

2. **Performance Tests:**
   - Query execution time measurement
   - Telemetry structure validation
   - Header presence verification

### Manual Testing

1. Run cleanup job in staging environment
2. Verify metrics appear in logs
3. Check `X-Query-Time` header in browser DevTools
4. Monitor slow query warnings for production queries

## Security Considerations

- Telemetry logs do not include sensitive user data (only userId hashes)
- Cleanup job uses proper WHERE clauses to prevent accidental data loss
- Performance metrics do not expose internal database structure

## Future Enhancements

- Real-time performance dashboard (Grafana/Datadog)
- Automated alerting on query performance degradation
- Cleanup job scheduling via cron (currently manual/Inngest)
- Historical performance trend analysis

---

**Created:** 2026-01-04
**Status:** Backlog
**Related Stories:** 7.12 (Server-side grouping), 7.8 (Cleanup job)
