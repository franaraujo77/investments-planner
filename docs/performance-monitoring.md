# Performance Monitoring

**Story 7.14**: Alert Query Performance Monitoring and Telemetry

This document describes the performance monitoring infrastructure for alert grouping queries and the metrics used to track query performance in production.

---

## Overview

Alert grouping queries are critical for user experience, as they power the alerts dashboard and notification system. To ensure acceptable performance, we instrument these queries with telemetry that tracks execution time and logs slow queries.

**Performance Targets:**

- **Test Environment**: <50ms for 100 alerts (AC-7.14.5)
- **Production**: <100ms for typical user datasets (50-200 alerts) (AC-7.14.1)
- **Slow Query Threshold**: >100ms triggers warning logs

---

## Instrumented Queries

### 1. `getAlerts()` - Alert List Query

**Purpose**: Fetch paginated list of alerts with filtering.

**Instrumentation** (Story 7.14: AC-7.14.1):

- Execution time tracked using `performance.now()`
- Structured logging with telemetry fields
- Slow query warnings when execution exceeds 100ms
- `executionTimeMs` returned in API response
- `X-Query-Time` header included in HTTP response

**Telemetry Fields:**

```typescript
{
  userId: string,
  queryType: "alert_grouping",
  executionTimeMs: number,
  alertCount: number,
  slowQueryWarning: boolean, // true when executionTimeMs > 100
  limit: number,
  offset: number,
  totalCount: number
}
```

**Example Log Entry:**

```json
{
  "level": "info",
  "message": "Alert grouping query executed",
  "userId": "user-123",
  "queryType": "alert_grouping",
  "executionTimeMs": 45,
  "alertCount": 100,
  "slowQueryWarning": false,
  "limit": 50,
  "offset": 0,
  "totalCount": 150
}
```

### 2. `getAlertsGrouped()` - Grouped Alert Query

**Purpose**: Fetch alerts grouped by asset class using SQL aggregation.

**Instrumentation** (Story 7.14: AC-7.14.1):

- Same telemetry structure as `getAlerts()`
- Additional metrics: `totalGroups`, `ungroupedCount`, `avgAlertsPerGroup`
- SQL aggregation performance tracked

**Telemetry Fields:**

```typescript
{
  userId: string,
  queryType: "alert_grouping",
  executionTimeMs: number,
  alertCount: number,
  slowQueryWarning: boolean,
  totalGroups: number,
  ungroupedCount: number,
  limit: number,
  offset: number,
  totalCount: number,
  avgAlertsPerGroup: number
}
```

---

## Performance Thresholds

| Metric                     | Target | Warning Threshold | Critical Threshold |
| -------------------------- | ------ | ----------------- | ------------------ |
| **Alert Grouping Query**   | <100ms | >100ms            | >500ms             |
| **Test Environment**       | <50ms  | >50ms             | >200ms             |
| **Alerts per Query**       | 50-200 | 200-500           | >500               |
| **Grouped Query Overhead** | <10ms  | >20ms             | >50ms              |

**Threshold Definitions:**

- **Target**: Expected performance under normal load
- **Warning**: Performance degradation, log warning and investigate
- **Critical**: User experience impacted, requires immediate attention

---

## Slow Query Warning

**When Triggered**: `executionTimeMs > 100`

**Warning Log Structure:**

```json
{
  "level": "warn",
  "message": "Alert query exceeded performance threshold",
  "userId": "user-123",
  "queryType": "alert_grouping",
  "executionTimeMs": 125,
  "threshold": 100,
  "alertCount": 250,
  "filters": {
    "type": "opportunity",
    "isRead": false,
    "isDismissed": false
  }
}
```

**Action Required:**

1. Check database indexes (see Story 7.13)
2. Analyze query plan with `EXPLAIN ANALYZE`
3. Verify user has reasonable number of alerts (<500)
4. Check for N+1 query patterns
5. Consider pagination adjustments

---

## X-Query-Time Response Header

**Purpose** (Story 7.14: AC-7.14.1): Enable client-side performance tracking and frontend monitoring.

**Header Format:**

```
X-Query-Time: {executionTimeMs}
```

**Example:**

```http
GET /api/alerts HTTP/1.1

HTTP/1.1 200 OK
X-Query-Time: 45
Content-Type: application/json
...
```

**Frontend Usage:**

```typescript
const response = await fetch("/api/alerts");
const queryTime = parseInt(response.headers.get("X-Query-Time") || "0");

if (queryTime > 100) {
  console.warn("Slow alert query:", queryTime, "ms");
  // Track in frontend monitoring (e.g., Sentry, DataDog)
}
```

---

## Metrics Aggregation (AC-7.14.2)

The following metrics are tracked for performance analysis:

### Query Execution Time Distribution

- **P50** (Median): Typical user experience
- **P95**: 95th percentile, represents slow queries
- **P99**: 99th percentile, represents worst-case scenarios

**Example Aggregation Query** (using logs/observability tool):

```sql
-- Example for Splunk, DataDog, or similar
SELECT
  percentile_cont(0.50) WITHIN GROUP (ORDER BY executionTimeMs) AS p50,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY executionTimeMs) AS p95,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY executionTimeMs) AS p99,
  COUNT(*) AS total_queries,
  SUM(CASE WHEN slowQueryWarning = true THEN 1 ELSE 0 END) AS slow_query_count
FROM alert_query_logs
WHERE queryType = 'alert_grouping'
  AND timestamp >= NOW() - INTERVAL '1 hour';
```

### Queries per Hour

Track query volume to identify usage patterns:

- Peak hours: 9 AM - 11 AM, 6 PM - 8 PM (user dashboard access)
- Overnight dip: 1 AM - 5 AM (minimal user activity)

### User Distribution

Monitor queries per user to identify outliers:

- Median: 10-20 queries/day
- Heavy users: 50+ queries/day (potential optimization candidates)

---

## Observability Integration

### Structured Logging

All performance logs use the structured logger from `@/lib/telemetry/logger`:

```typescript
logger.info("Alert grouping query executed", {
  userId,
  queryType: "alert_grouping",
  executionTimeMs,
  alertCount,
  slowQueryWarning: executionTimeMs > 100,
});
```

**Log Fields Explanation:**

| Field              | Type    | Description                                               |
| ------------------ | ------- | --------------------------------------------------------- |
| `userId`           | string  | User who triggered the query (for user-specific analysis) |
| `queryType`        | string  | Always "alert_grouping" for these queries                 |
| `executionTimeMs`  | number  | Query execution time in milliseconds                      |
| `alertCount`       | number  | Number of alerts returned                                 |
| `slowQueryWarning` | boolean | True if query exceeded 100ms threshold                    |
| `limit`            | number  | Pagination limit                                          |
| `offset`           | number  | Pagination offset                                         |
| `totalCount`       | number  | Total alerts matching filters                             |

---

## Database Indexes (Dependency on Story 7.13)

Performance monitoring relies on database indexes created in Story 7.13:

**Critical Indexes:**

- `idx_alerts_user_type_created` - Composite index for filtered queries
- `idx_alerts_user_read_dismissed` - Partial index for unread/undismissed alerts

**Index Verification:**

```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM alerts
WHERE user_id = 'user-123'
  AND is_dismissed = false
ORDER BY created_at DESC
LIMIT 50;
```

**Expected Output:**

```
Index Scan using idx_alerts_user_type_created on alerts (cost=0.42..8.45 rows=1 width=400) (actual time=0.015..0.025 rows=50 loops=1)
  Index Cond: (user_id = 'user-123')
  Filter: (is_dismissed = false)
Planning Time: 0.123 ms
Execution Time: 0.045 ms  <-- Should be <50ms
```

---

## Performance Degradation Troubleshooting

### Symptoms

1. **Slow Query Warnings**: `executionTimeMs > 100`
2. **User Complaints**: "Alerts take long to load"
3. **Metrics Spike**: P95 > 200ms

### Diagnosis Steps

1. **Check Query Logs** (last 1 hour):

```bash
grep "Alert query exceeded performance threshold" logs/app.log | tail -20
```

2. **Analyze Database Load**:

```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

3. **Verify Index Health**:

```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'alerts'
ORDER BY idx_scan DESC;
```

4. **Check User Alert Count**:

```sql
SELECT user_id, COUNT(*) as alert_count
FROM alerts
WHERE is_dismissed = false
GROUP BY user_id
HAVING COUNT(*) > 500
ORDER BY alert_count DESC;
```

### Remediation Actions

| Issue                    | Solution                                                     |
| ------------------------ | ------------------------------------------------------------ |
| **Missing/Unused Index** | Rebuild index: `REINDEX INDEX idx_alerts_user_type_created;` |
| **Too Many Alerts**      | Run dismissed pairs cleanup job (Story 7.14: AC-7.14.3)      |
| **Database CPU Spike**   | Investigate other queries, consider read replicas            |
| **N+1 Query Pattern**    | Verify SQL aggregation is used (Story 7.12)                  |

---

## Related Stories

- **Story 7.12**: Server-side grouping for alerts (SQL aggregation foundation)
- **Story 7.13**: Alert query performance indexes (enables <50ms targets)
- **Story 7.14**: Performance monitoring and cleanup jobs (this document)

---

## Testing

**Integration Tests:**

- `tests/integration/alert-grouping-performance.test.ts` - Verifies <50ms target

**Unit Tests:**

- `tests/unit/services/alert-service.test.ts` - Telemetry structure validation
- `tests/unit/api/alerts.test.ts` - X-Query-Time header presence

**Manual Testing:**

```bash
# 1. Check logs for performance metrics
pnpm logs | grep "Alert grouping query executed"

# 2. Test API response header
curl -I http://localhost:3000/api/alerts
# Expected output: X-Query-Time: 45

# 3. Load test with 100 alerts (create test data first, then query)
time curl http://localhost:3000/api/alerts
```

---

_Last Updated: 2026-01-04 (Story 7.14)_
