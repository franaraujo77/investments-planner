# Story 8.6: Calculation Audit Trail

**Status:** done
**Epic:** Epic 8 - Overnight Processing
**Previous Story:** 8-5-instant-dashboard-load (Status: done)

---

## Story

**As a** user
**I want** all my calculations logged for audit with queryable access
**So that** I can review my calculation history, verify numbers, and satisfy compliance needs

---

## Acceptance Criteria

### AC-8.6.1: Overnight Job Runs Table Tracks All Executions

- **Given** an overnight job starts
- **When** the job completes (success, partial, or failure)
- **Then** a record is created in `overnight_job_runs` table with:
  - `id` (UUID primary key)
  - `jobType` ('scoring', 'recommendations', 'cache-warm')
  - `status` ('started', 'completed', 'failed', 'partial')
  - `startedAt` timestamp
  - `completedAt` timestamp (on completion)
  - `usersProcessed` count
  - `usersFailed` count
  - `correlationId` linking to calculation events
  - `errorDetails` (JSON, if failures)
  - `metrics` (JSON with timing breakdown)

### AC-8.6.2: Correlation ID Links Job Runs to Calculation Events

- **Given** an overnight job processes users
- **When** calculation events are emitted (CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED)
- **Then** all events for that job run share the same `correlationId`
- **And** the `correlationId` matches the `overnight_job_runs` record
- **And** events can be queried by correlationId to reconstruct the full calculation

### AC-8.6.3: Job Metrics Are Recorded

- **Given** an overnight job completes
- **When** the job record is finalized
- **Then** metrics JSON includes:
  - `totalDurationMs` - end-to-end job time
  - `fetchRatesMs` - exchange rate fetch time
  - `processUsersMs` - user processing time
  - `cacheWarmMs` - cache warming time
  - `assetsScored` - total assets processed
  - `recommendationsGenerated` - total recs generated
- **And** metrics are queryable for performance monitoring

### AC-8.6.4: Users Can Query Calculation History by Asset

- **Given** calculation events exist for a user's assets
- **When** the user queries "Show all calculations for asset X"
- **Then** they receive a list of all calculations including:
  - Calculation date/time
  - Score result
  - Criteria version used
  - Breakdown of criteria points
- **And** results are sorted by date descending
- **And** results are limited to user's own data (tenant isolation)

### AC-8.6.5: Audit Data Retained for 2 Years

- **Given** calculation events and job records exist
- **When** the retention policy is evaluated
- **Then** records older than 2 years are eligible for archival
- **And** a cleanup job or policy flags old records (implementation of actual archival deferred)
- **And** all records within 2 years remain fully queryable

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 8 Tech Spec:

- **ADR-002:** Event-Sourced Calculations - 4 events per calculation (CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED)
- **FR64:** System logs all calculations for user's own audit trail
- **Event Store:** PostgreSQL table `calculation_events` with correlation_id
- **Data Retention:** 2 years per architecture spec

[Source: docs/architecture.md#Event-Sourced-Calculations]
[Source: docs/architecture.md#ADR-002-Event-Sourced-Calculations]

### Tech Spec Reference

Per Epic 8 Tech Spec (AC-8.6.1-8.6.5):

- overnight_job_runs table tracks all job executions
- Each job run has correlationId linking to calculation events
- Job metrics (users processed, failed, timing) are recorded
- Users can query "Show me all calculations for asset X" via existing event store
- Audit data retained for 2 years

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Story-8.6-Calculation-Audit-Trail]
[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Acceptance-Criteria-Authoritative]

### Database Schema (from Tech Spec)

```typescript
// New table: overnight_job_runs
export const overnightJobRuns = pgTable("overnight_job_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // 'scoring', 'recommendations', 'cache-warm'
  status: varchar("status", { length: 20 }).notNull(), // 'started', 'completed', 'failed', 'partial'
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  usersProcessed: integer("users_processed").default(0),
  usersFailed: integer("users_failed").default(0),
  correlationId: uuid("correlation_id").notNull(),
  errorDetails: jsonb("error_details"),
  metrics: jsonb("metrics"), // timing breakdown, asset counts, etc.
});
```

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Data-Models-and-Contracts]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **Event Store** - `src/lib/events/event-store.ts` (from Story 1.4)
   - Already implements append(event) and getByCorrelationId(id)
   - Already stores calculation events in `calculation_events` table
   - **Extend with asset-based query method**

2. **Calculation Events Types** - `src/lib/events/types.ts` (from Story 1.4)
   - Already defines CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED
   - Already includes correlationId in all events

3. **Overnight Scoring Job** - `src/lib/inngest/functions/overnight-scoring.ts` (from Story 8.2)
   - Already emits calculation events per user
   - **Update to record job runs in overnight_job_runs table**

4. **Batch Scoring Service** - `src/lib/services/batch-scoring-service.ts` (from Story 8.2)
   - Already processes users with correlation tracking
   - **Update to pass correlationId for job run linkage**

[Source: docs/sprint-artifacts/8-5-instant-dashboard-load.md#Existing-Infrastructure-to-REUSE]

### Learnings from Previous Story

**From Story 8-5-instant-dashboard-load (Status: done)**

- **DashboardService** implements cache-first pattern - follow same service architecture
- **API Route Pattern:** Use standardized responses from `@/lib/api/responses.ts`
- **Test Coverage:** 27 unit tests covering service + API - follow same testing pattern
- **Logger Usage:** Use `logger` from `@/lib/telemetry/logger` (not console)
- **Error Codes:** Use standardized error codes from `@/lib/api/error-codes.ts`

**From Story 8-2-overnight-scoring-job (Status: done)**

- **OvernightJobService** exists at `src/lib/services/overnight-job-service.ts`
- **Batch processing** with correlationId already implemented
- **Event emission** pattern established - extend for job run tracking

[Source: docs/sprint-artifacts/8-5-instant-dashboard-load.md#Dev-Agent-Record]

### Services and Modules

| Module                        | Responsibility                     | Location                                                  |
| ----------------------------- | ---------------------------------- | --------------------------------------------------------- |
| **Overnight Job Runs Schema** | Database table definition          | `src/lib/db/schema.ts` (extend)                           |
| **Audit Service**             | Query calculation history          | `src/lib/services/audit-service.ts` (new)                 |
| **Audit API Route**           | Expose calculation history queries | `src/app/api/audit/calculations/route.ts` (new)           |
| **Event Store**               | Add getByAssetId method            | `src/lib/events/event-store.ts` (extend)                  |
| **Overnight Scoring Job**     | Record job runs                    | `src/lib/inngest/functions/overnight-scoring.ts` (extend) |

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Services-and-Modules]

---

## Tasks

### Task 1: Add overnight_job_runs Table to Schema (AC: 8.6.1)

**Files:** `src/lib/db/schema.ts`, `drizzle/migrations/`

- [x] Add overnightJobRuns table with all required columns
- [x] Define proper types for jobType and status enums
- [x] Add index on correlationId for efficient joins
- [x] Add index on startedAt for date-range queries
- [x] Generate and apply migration

**Note:** Table was already added in Story 8.1. Updated schema to add cacheWarmMs metric field.

### Task 2: Create Job Run Recording Functions (AC: 8.6.1, 8.6.3)

**Files:** `src/lib/services/overnight-job-service.ts`

- [x] OvernightJobService class exists with createJobRun, completeJobRun, failJobRun methods
- [x] Implements `createJobRun(jobType, correlationId)` method
- [x] Implements `completeJobRun(id, status, metrics)` method
- [x] Implements `failJobRun(id, errorDetails)` method
- [x] Includes proper error handling and logging

**Note:** Service was implemented in Story 8.1/8.2. Updated JobRunMetrics interface to use cacheWarmMs.

### Task 3: Integrate Job Run Recording into Overnight Scoring (AC: 8.6.1, 8.6.2, 8.6.3)

**Files:** `src/lib/inngest/functions/overnight-scoring.ts`, `src/lib/services/overnight-job-service.ts`

- [x] Calls OvernightJobService.createJobRun at job start
- [x] Passes correlationId to all calculation event emissions
- [x] Calls OvernightJobService.completeJobRun on completion
- [x] Captures timing metrics throughout job execution
- [x] Handles partial failures (status: 'partial')
- [x] Records error details on failure

**Note:** Integration was done in Story 8.2. Updated to use cacheWarmMs field name.

### Task 4: Extend Event Store with Asset Query (AC: 8.6.4)

**Files:** `src/lib/events/event-store.ts`

- [x] Add `getByAssetId(userId, assetId, options)` method
- [x] Support date range filtering
- [x] Support pagination (limit, offset)
- [x] Enforce tenant isolation (always filter by userId)
- [x] Return events sorted by date descending
- [x] Add `getByUserIdWithDateRange(userId, options)` method

### Task 5: Create Audit Service (AC: 8.6.4)

**Files:** `src/lib/services/audit-service.ts`

- [x] Create AuditService class
- [x] Implement `getCalculationHistory(userId, assetId, options)` method
- [x] Join calculation_events with scores table for complete picture
- [x] Include criteria version and breakdown data
- [x] Transform to user-friendly response format
- [x] Implement `getCalculationEvents(userId, correlationId)` method
- [x] Implement `getJobRunHistory(options)` method

### Task 6: Create Audit API Route (AC: 8.6.4)

**Files:** `src/app/api/audit/calculations/route.ts`

- [x] Create GET endpoint for calculation history
- [x] Accept query params: assetId, startDate, endDate, limit, offset
- [x] Validate inputs with Zod schema
- [x] Call AuditService.getCalculationHistory
- [x] Return standardized API response
- [x] Require authentication (withAuth middleware)

### Task 7: Add Data Retention Markers (AC: 8.6.5)

**Files:** `src/lib/services/audit-service.ts`

- [x] RETENTION_YEARS constant (2 years)
- [x] Implement `getRecordsForArchival(olderThan)` query method
- [x] Implement `isWithinRetentionPeriod(date)` helper
- [x] Implement `getRetentionExpiryDate(createdAt)` helper
- [x] Document archival process (actual archival implementation deferred)

### Task 8: Write Unit Tests - Job Run Service (AC: 8.6.1, 8.6.3)

**Files:** `tests/unit/services/overnight-job-service.test.ts`

- [x] Test createJobRun creates record with status 'started'
- [x] Test completeJobRun updates status and metrics
- [x] Test metrics JSON structure is correct
- [x] Test error handling for database failures

**Note:** Tests already existed from Story 8.1/8.2.

### Task 9: Write Unit Tests - Audit Service (AC: 8.6.4)

**Files:** `tests/unit/services/audit-service.test.ts`

- [x] Test getCalculationHistory returns events for asset
- [x] Test date range filtering works correctly
- [x] Test pagination (limit/offset) works correctly
- [x] Test tenant isolation (cannot see other user's data)
- [x] Test empty results when no calculations exist
- [x] Test getJobRunHistory with filters
- [x] Test data retention methods (RETENTION_YEARS, isWithinRetentionPeriod, getRecordsForArchival)

### Task 10: Write Unit Tests - Audit API Route (AC: 8.6.4)

**Files:** `tests/unit/api/audit-calculations.test.ts`

- [x] Test successful response format
- [x] Test authentication requirement (via withAuth mock)
- [x] Test validation errors for bad params (invalid UUID, invalid dates)
- [x] Test date range query params
- [x] Test pagination params
- [x] Test max limit enforcement (100)
- [x] Test error handling (500 on service error)

### Task 11: Write Integration Tests - Overnight Job Recording (AC: 8.6.1, 8.6.2)

**Files:** `tests/integration/overnight-job-audit.test.ts`

- [x] Test job run record created when job starts
- [x] Test correlationId links events to job run
- [x] Test metrics recorded on completion
- [x] Test partial failure status when some users fail
- [x] Test job type tracking (scoring, recommendations, cache-warm)
- [x] Test error detail recording
- [x] Test end-to-end job flow

### Task 12: Run Verification

- [x] TypeScript compilation successful (`npx tsc --noEmit`)
- [x] ESLint passes with no new errors (`pnpm lint`)
- [x] All unit tests pass (47 tests for Story 8.6)
- [x] Full test suite passes
- [x] Database migration already applied (from Story 8.1)

---

## Dependencies

- **Story 1.4:** Event-Sourced Calculation Pipeline (Complete) - Event store infrastructure
- **Story 8.2:** Overnight Scoring Job (Complete) - Job execution framework
- **Story 8.3:** Recommendation Pre-Generation (Complete) - Batch processing patterns
- **Story 8.5:** Instant Dashboard Load (Complete) - Service architecture patterns

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Event Sourcing:** All calculations emit 4 events with correlationId
- **Audit Trail:** Complete record of all calculation inputs/outputs
- **Data Retention:** 2 years per architecture spec
- **Tenant Isolation:** All queries must filter by userId

[Source: docs/architecture.md#Event-Sourced-Calculations]
[Source: docs/architecture.md#Data-Architecture]

### Query Patterns

From tech spec - calculation history query:

```sql
-- Get all calculations for a specific asset
SELECT
  ce.correlation_id,
  ce.event_type,
  ce.payload,
  ce.created_at,
  ojr.job_type,
  ojr.status as job_status
FROM calculation_events ce
LEFT JOIN overnight_job_runs ojr ON ce.correlation_id = ojr.correlation_id
WHERE ce.user_id = $1
  AND ce.payload->>'assetId' = $2
ORDER BY ce.created_at DESC
LIMIT $3 OFFSET $4;
```

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Traceability-Mapping]

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for JobRunService with mocked database
- Unit tests for AuditService with mocked event store
- Unit tests for API route with mocked service
- Integration tests for full flow (job run → events → query)
- All tests must pass before marking complete

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

Following unified project structure:

- **Job Run Service:** `src/lib/services/job-run-service.ts` (new)
- **Audit Service:** `src/lib/services/audit-service.ts` (new)
- **API Route:** `src/app/api/audit/calculations/route.ts` (new)
- **Schema Extension:** `src/lib/db/schema.ts` (extend)
- **Tests:** `tests/unit/services/`, `tests/unit/api/`, `tests/integration/`

[Source: docs/architecture.md#Project-Structure]

### Performance Considerations

- Index correlationId for efficient joins between tables
- Index (userId, assetId, createdAt) for history queries
- Pagination required for history endpoints (max 100 per page)
- Consider materialized views if query performance becomes issue

[Source: docs/architecture.md#Performance-Considerations]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Story-8.6-Calculation-Audit-Trail]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Acceptance-Criteria-Authoritative]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Data-Models-and-Contracts]
- [Source: docs/architecture.md#Event-Sourced-Calculations]
- [Source: docs/architecture.md#ADR-002-Event-Sourced-Calculations]
- [Source: docs/epics.md#Story-8.6]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]
- [Source: docs/sprint-artifacts/8-5-instant-dashboard-load.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/8-6-calculation-audit-trail.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Tasks 1-3 Already Complete:** The overnight_job_runs table, OvernightJobService, and overnight-scoring integration were already implemented in Stories 8.1/8.2. Minor updates made to rename `cacheWarmingDurationMs` to `cacheWarmMs` for consistency.

2. **Task 4 - Event Store Extension:** Added two new methods to EventStore:
   - `getByAssetId(userId, assetId, options)` - Query events for a specific asset with date range and pagination
   - `getByUserIdWithDateRange(userId, options)` - Query events for a user with date range and pagination

3. **Task 5 - AuditService:** Created comprehensive service (570+ lines) with:
   - `getCalculationHistory()` - Joins asset_scores with criteria_versions, looks up correlation from events
   - `getCalculationEvents()` - Returns events filtered by tenant isolation
   - `getJobRunHistory()` - Query overnight_job_runs with filters
   - Data retention methods (RETENTION_YEARS=2, isWithinRetentionPeriod, getRetentionExpiryDate, getRecordsForArchival)

4. **Task 6 - Audit API Route:** Created GET /api/audit/calculations endpoint with:
   - Zod validation for query params (assetId required UUID, optional dates/pagination)
   - Max limit enforcement (100)
   - withAuth middleware for authentication
   - Standardized API responses

5. **Test Coverage:** 47 tests total for Story 8.6:
   - 20 unit tests for AuditService (including data retention tests)
   - 12 unit tests for audit API route
   - 15 integration tests for overnight job audit trail

6. **TypeScript Challenges:** Fixed multiple issues with exactOptionalPropertyTypes config and mock chain setup for Drizzle ORM queries.

### File List

**New Files:**

- `src/lib/services/audit-service.ts` (575 lines)
- `src/app/api/audit/calculations/route.ts` (193 lines)
- `tests/unit/services/audit-service.test.ts` (420 lines)
- `tests/unit/api/audit-calculations.test.ts` (322 lines)
- `tests/integration/overnight-job-audit.test.ts` (460 lines)

**Modified Files:**

- `src/lib/db/schema.ts` - Added cacheWarmMs metric field
- `src/lib/events/event-store.ts` - Added getByAssetId and getByUserIdWithDateRange methods
- `src/lib/services/overnight-job-service.ts` - Renamed cacheWarmingDurationMs to cacheWarmMs
- `src/lib/inngest/functions/overnight-scoring.ts` - Updated to use cacheWarmMs field

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-15 | Story drafted from tech-spec-epic-8.md and epics.md | SM Agent (create-story workflow) |
