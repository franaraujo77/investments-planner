# Cleanup Jobs

**Story 7.14**: Background Jobs for Data Maintenance

This document describes the scheduled cleanup jobs that maintain data hygiene and prevent unbounded table growth.

---

## Overview

Cleanup jobs run daily to remove stale data that is no longer needed. These jobs use Inngest for scheduling and execution, with database transactions to ensure atomicity.

**Jobs:**

1. **Dismissed Opportunity Pairs Cleanup** - Removes dismissed alert pairs older than 90 days

---

## Dismissed Opportunity Pairs Cleanup

**Purpose** (Story 7.14: AC-7.14.3, AC-7.14.4): Remove dismissed opportunity alert pairs older than 90 days to prevent table growth and allow re-alerting on stale dismissals.

### Job Configuration

**File**: `src/lib/inngest/functions/cleanup-dismissed-pairs.ts`

**Schedule**: Daily at 5:00 AM UTC (1 hour after overnight scoring completes at 4:00 AM UTC)

**Cron Expression**: `0 5 * * *`

**Environment Override**: `DISMISSED_PAIRS_CLEANUP_CRON`

**Retry Policy**: 3 retries on transient failures

### Retention Policy

**Retention Period**: 90 days

**Rationale:**

- Dismissals expire after 90 days to account for changing market conditions
- Asset scores and market dynamics evolve over time
- Opportunity alerts may re-appear if score divergence increases again
- Balances dismissal memory with data freshness requirements

**SQL Logic:**

```sql
DELETE FROM dismissed_opportunity_pairs
WHERE dismissed_at < NOW() - INTERVAL '90 days';
```

### Job Execution

**Transaction Pattern** (AC-7.14.4):

```typescript
await db.transaction(async (tx) => {
  const deleted = await tx
    .delete(dismissedOpportunityPairs)
    .where(sql`${dismissedOpportunityPairs.dismissedAt} < NOW() - INTERVAL '90 days'`)
    .returning({ id: dismissedOpportunityPairs.id });

  logger.info("Cleanup job completed", {
    deletedCount: deleted.length,
    retentionDays: 90,
  });

  return { deletedCount: deleted.length };
});
```

**Key Features:**

- **Atomicity**: Uses database transaction - all-or-nothing delete
- **Idempotency**: Safe to run multiple times (AC-7.14.4)
- **Error Handling**: Transaction rolls back on failure
- **Logging**: Structured logs with deleted count

### Performance Characteristics

**Expected Execution Time**: <5 seconds for 10,000 stale pairs

**Index Usage**:

- `dismissed_pairs_user_idx` on `user_id` (if user-specific cleanup)
- Sequential scan acceptable for date-based deletion

**Database Impact**:

- Read: Full table scan to identify old records
- Write: Delete matching records
- Locks: Row-level locks during deletion

**Monitoring:**

```sql
-- Check table size growth
SELECT
  pg_size_pretty(pg_total_relation_size('dismissed_opportunity_pairs')) AS total_size,
  COUNT(*) AS row_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - dismissed_at)) / 86400) AS avg_age_days
FROM dismissed_opportunity_pairs;
```

### Telemetry

**Successful Execution:**

```json
{
  "level": "info",
  "message": "Dismissed pairs cleanup completed",
  "deletedCount": 125,
  "retentionDays": 90,
  "executionTimeMs": 450,
  "startedAt": "2026-01-04T05:00:00.000Z",
  "completedAt": "2026-01-04T05:00:00.450Z"
}
```

**Failed Execution:**

```json
{
  "level": "error",
  "message": "Dismissed pairs cleanup failed",
  "errorMessage": "Connection timeout",
  "errorName": "DatabaseError",
  "retentionDays": 90,
  "executionTimeMs": 5000,
  "startedAt": "2026-01-04T05:00:00.000Z",
  "completedAt": "2026-01-04T05:00:05.000Z"
}
```

### Testing

**Integration Tests**: `tests/integration/dismissed-pairs-cleanup.test.ts`

**Test Coverage:**

- AC-7.14.3: Delete pairs >90 days, retain recent pairs
- AC-7.14.4: Handle empty database gracefully
- AC-7.14.4: Idempotency (safe to run multiple times)
- AC-7.14.3: 90-day boundary verification

**Manual Testing:**

```bash
# 1. Check current pair count
psql -c "SELECT COUNT(*) FROM dismissed_opportunity_pairs;"

# 2. Check old pairs count (>90 days)
psql -c "SELECT COUNT(*) FROM dismissed_opportunity_pairs WHERE dismissed_at < NOW() - INTERVAL '90 days';"

# 3. Trigger cleanup job manually (via Inngest dashboard or API)
curl -X POST http://localhost:8288/v1/functions/cleanup-dismissed-pairs

# 4. Verify deletion
psql -c "SELECT COUNT(*) FROM dismissed_opportunity_pairs WHERE dismissed_at < NOW() - INTERVAL '90 days';"
# Expected: 0
```

---

## Cleanup Job Monitoring

### Success Metrics

| Metric             | Target | Threshold   |
| ------------------ | ------ | ----------- |
| **Execution Time** | <5s    | >10s        |
| **Deleted Count**  | Varies | >10,000/day |
| **Failure Rate**   | 0%     | >1%         |
| **Retry Count**    | 0      | >1          |

### Alert Conditions

**Critical Alerts:**

1. **Job Failure**: 3 consecutive failures → Investigate database connectivity
2. **Excessive Deletions**: >10,000 pairs/day → Check for data quality issues
3. **Zero Deletions for 7 Days**: No old pairs being created → Verify dismissal logic

**Warning Alerts:**

1. **Slow Execution**: >10s → Check database load
2. **High Retry Count**: >1 retry/day → Investigate transient errors

### Inngest Dashboard

**Monitoring URL**: `https://app.inngest.com/functions/cleanup-dismissed-pairs`

**Key Metrics:**

- Last run timestamp
- Success/failure rate
- Average execution time
- Retry count

---

## Database Schema

**Table**: `dismissed_opportunity_pairs`

**Columns:**

- `id` - UUID primary key
- `user_id` - Foreign key to users (cascade on delete)
- `current_asset_id` - Asset currently in portfolio
- `better_asset_id` - Better-scoring alternative asset
- `dismissed_at` - **Timestamp used for cleanup** (default NOW())
- `last_score_difference` - Score difference at dismissal

**Indexes:**

- `dismissed_pairs_user_idx` on `user_id`
- `dismissed_pairs_unique_idx` on `(user_id, current_asset_id, better_asset_id)`

**Retention Query:**

```sql
-- Preview what will be deleted
SELECT
  user_id,
  current_asset_id,
  better_asset_id,
  dismissed_at,
  EXTRACT(EPOCH FROM (NOW() - dismissed_at)) / 86400 AS age_days
FROM dismissed_opportunity_pairs
WHERE dismissed_at < NOW() - INTERVAL '90 days'
ORDER BY dismissed_at ASC
LIMIT 10;
```

---

## Troubleshooting

### Issue: Cleanup Job Failing

**Symptoms:**

- Inngest dashboard shows failures
- Error logs: "Dismissed pairs cleanup failed"

**Diagnosis:**

1. Check database connectivity
2. Verify table exists: `SELECT COUNT(*) FROM dismissed_opportunity_pairs;`
3. Check database locks: `SELECT * FROM pg_locks WHERE relation = 'dismissed_opportunity_pairs'::regclass;`

**Resolution:**

1. Ensure database is accessible from Inngest worker
2. Check for long-running transactions blocking cleanup
3. Verify RLS policies allow deletion

### Issue: Too Many Old Pairs

**Symptoms:**

- Cleanup job deletes >10,000 pairs/day consistently
- Table size growing despite cleanup

**Diagnosis:**

```sql
-- Check pair creation rate
SELECT
  DATE(dismissed_at) AS date,
  COUNT(*) AS pairs_created
FROM dismissed_opportunity_pairs
WHERE dismissed_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(dismissed_at)
ORDER BY date DESC;
```

**Resolution:**

1. Verify dismissal logic is working correctly
2. Check for alert spam (too many opportunity alerts)
3. Adjust retention period if needed (requires code change)

### Issue: Zero Deletions for Extended Period

**Symptoms:**

- Cleanup job runs but `deletedCount = 0` for 7+ days
- No pairs older than 90 days

**Diagnosis:**

```sql
-- Check oldest dismissed pair
SELECT MIN(dismissed_at) AS oldest_dismissal, MAX(dismissed_at) AS newest_dismissal
FROM dismissed_opportunity_pairs;
```

**Resolution:**

1. Verify users are dismissing alerts (check dismissal API logs)
2. Ensure dismissed pairs are being created (check `recordDismissedOpportunityPair` logs)
3. May be normal if feature recently deployed (<90 days)

---

## Future Enhancements

**Potential Improvements:**

1. **User-Configurable Retention**: Allow users to set dismissal memory duration
2. **Selective Cleanup**: Keep high-score-difference pairs longer (e.g., >20 point diff)
3. **Cleanup on Demand**: Trigger cleanup when table size exceeds threshold
4. **Archive Instead of Delete**: Move old pairs to cold storage for analytics

---

## Related Documentation

- **Story 7.6**: Opportunity alerts and dismissal memory
- **Story 7.14**: Performance monitoring and cleanup jobs (this document)
- **Inngest Documentation**: https://www.inngest.com/docs/functions/multi-step

---

_Last Updated: 2026-01-04 (Story 7.14)_
