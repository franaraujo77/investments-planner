# Story 8.2: Overnight Scoring Job

**Status:** done
**Epic:** Epic 8 - Overnight Processing
**Previous Story:** 8-1-inngest-job-infrastructure (Status: done)

---

## Story

**As a** system
**I want** automated overnight processing that calculates scores for all users
**So that** recommendations are ready when users log in, providing an instant dashboard experience

---

## Acceptance Criteria

### AC-8.2.1: Cron Trigger Configuration

- **Given** the overnight scoring job is registered with Inngest
- **When** the configured cron time is reached (2h before market open)
- **Then** the job triggers automatically
- **And** cron schedule is configurable via `OVERNIGHT_JOB_CRON` environment variable
- **And** default schedule is 4 AM UTC daily

### AC-8.2.2: Exchange Rates Fetch Once

- **Given** the overnight job starts
- **When** exchange rates are needed
- **Then** rates are fetched ONCE at the beginning of the job
- **And** the same rates are reused for ALL users in that job run
- **And** rates are stored in memory/context for the duration of the job
- **And** this ensures data consistency across all user calculations

### AC-8.2.3: User Portfolio Processing

- **Given** exchange rates are fetched
- **When** the job processes users
- **Then** for each active user with a portfolio:
  - Fetch current prices for user's portfolio assets
  - Load user's criteria (latest version)
  - Calculate scores for all assets in user's configured markets
  - Store scores with criteria_version_id for audit
- **And** users are processed in batches of 50 for efficiency
- **And** processing uses the shared exchange rates from AC-8.2.2

### AC-8.2.4: Event Sourcing Integration

- **Given** a user's scores are being calculated
- **When** the calculation completes
- **Then** 4 events are emitted per user:
  1. `CALC_STARTED` - correlationId, userId, timestamp
  2. `INPUTS_CAPTURED` - criteriaVersionId, criteria, prices snapshot, rates snapshot, assetIds
  3. `SCORES_COMPUTED` - results array with assetId, score, breakdown
  4. `CALC_COMPLETED` - correlationId, duration, assetCount
- **And** all events share the same correlationId linking the calculation
- **And** events are stored in the calculation_events table

### AC-8.2.5: Graceful Error Handling

- **Given** a user's processing fails (e.g., API error, invalid data)
- **When** the error is caught
- **Then** the job logs the error with user context
- **And** the job continues processing remaining users
- **And** failed users are counted in job metrics
- **And** partial completion is acceptable (some users may fail)

### AC-8.2.6: Performance Target

- **Given** the job is running for production scale
- **When** processing 1000 users
- **Then** the job completes within 4 hours
- **And** this ensures completion before market open
- **And** average per-user processing time is <10 seconds

### AC-8.2.7: OpenTelemetry Observability

- **Given** the overnight job runs
- **When** it completes (success or failure)
- **Then** an OpenTelemetry span is created with attributes:
  - `fetch_rates_ms` - time to fetch exchange rates
  - `users_total` - total users to process
  - `users_success` - successfully processed users
  - `users_failed` - failed user count
  - `total_duration_ms` - total job duration
  - `assets_scored` - total assets scored across all users
- **And** span status is set appropriately (OK/ERROR)

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 8 Tech Spec:

- **ADR-002:** Event-Sourced Calculations - emit 4 events per user calculation
- **ADR-003:** Inngest for Background Jobs - step functions for checkpointing
- **ADR-005:** Provider Abstraction - use existing PriceService and ExchangeRateService

[Source: docs/architecture.md#ADR-002-Event-Sourced-Calculations-with-OpenTelemetry]
[Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]

### Tech Spec Reference

Per Epic 8 Tech Spec (AC-8.2.1-8.2.7):

- Overnight job triggers at cron time, fetches rates once, processes users with scoring
- Events follow existing 4-event pattern from Story 1.4
- Step functions enable checkpointing for long-running jobs

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Story-8.2-Overnight-Scoring-Job]

### Overnight Processing Flow (from Tech Spec)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OVERNIGHT SCORING JOB                                 │
│                     Cron: 2 hours before earliest market open                │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Step 1: Setup   │ → Create correlationId, log JOB_STARTED event
│                 │ → Record overnight_job_run (status: 'started')
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 2: Fetch   │ → ExchangeRateService.fetchRates() (all currencies)
│ Exchange Rates  │ → Store in context for consistency across users
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 3: Get     │ → Query users with active portfolios
│ Active Users    │ → Filter by configured markets matching job timing
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Process Users (parallelized, batched)                 │
│                                                               │
│  For each user batch (50 users):                              │
│    │                                                          │
│    ├─► Fetch prices for user's assets (PriceService)          │
│    │                                                          │
│    ├─► Calculate scores (ScoringEngine with event sourcing)   │
│    │                                                          │
│    └─► Store scores with audit trail                          │
│                                                               │
│  On user failure: log error, continue with next user          │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Step 5: Finalize│ → Update overnight_job_run (status: 'completed'/'partial')
│                 │ → Log JOB_COMPLETED event with metrics
│                 │ → Report to OpenTelemetry
└─────────────────┘
```

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Workflows-and-Sequencing]

### Services and Modules

| Module                         | Responsibility                       | Location                                      |
| ------------------------------ | ------------------------------------ | --------------------------------------------- |
| **Overnight Scoring Function** | Orchestrate nightly scoring pipeline | `lib/inngest/functions/overnight-scoring.ts`  |
| **Batch Scoring Service**      | Process scores for multiple users    | `lib/services/batch-scoring-service.ts` (new) |
| **Overnight Event Types**      | Batch-specific calculation events    | Extend `lib/events/event-store.ts`            |

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Services-and-Modules]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **Event Store** - `src/lib/events/event-store.ts` (from Story 1.4)
   - Use existing `appendEvent()` function
   - Use existing CalculationEvent types

2. **Scoring Engine** - `src/lib/calculations/scoring-engine.ts` (from Story 5.8)
   - Use existing `calculateScore()` function
   - Use existing decimal.js integration

3. **Price Service** - `src/lib/providers/price-service.ts` (from Story 6.3)
   - Use existing `PriceService.fetchPrices()` method
   - Provider abstraction already handles retries/fallbacks

4. **Exchange Rate Service** - `src/lib/providers/exchange-rate-service.ts` (from Story 6.4)
   - Use existing `ExchangeRateService.fetchRates()` method

5. **OpenTelemetry** - `src/lib/telemetry/index.ts` (from Story 1.5)
   - Use existing tracer for job-level spans

6. **Logger** - `src/lib/telemetry/logger.ts`
   - Use structured logging for job status

7. **Inngest Infrastructure** - `src/lib/inngest/` (from Story 8.1)
   - Extend placeholder overnight-scoring.ts with full implementation

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Internal-Dependencies]

### Learnings from Previous Story

**From Story 8-1-inngest-job-infrastructure (Status: done)**

- **New Infrastructure Created**: Inngest client with overnight processing event types
  - `src/lib/inngest/client.ts` - Events type with overnight/scoring.started, overnight/scoring.completed
  - `src/lib/inngest/functions/overnight-scoring.ts` - Placeholder with 6-step checkpointed pipeline
  - `src/lib/inngest/functions/cache-warmer.ts` - Placeholder for cache warming
- **Placeholder Steps to Implement**: The overnight-scoring.ts has TODO comments for this story:
  - Step 1 (setup): Create correlationId, record job run
  - Step 2 (fetch-exchange-rates): Actually fetch from ExchangeRateService
  - Step 3 (fetch-asset-prices): Actually fetch from PriceService
  - Step 4 (get-active-users): Query database for users with portfolios
  - Step 5 (score-portfolios): Run ScoringEngine for each user
  - Step 6 (trigger-cache-warming): Emit event for cache warmer (Story 8.4)
- **Function Configuration**: Cron configurable via `OVERNIGHT_JOB_CRON` env var (default: 4 AM UTC)
- **Test Coverage**: 39 tests added for Inngest infrastructure - follow same patterns

[Source: docs/sprint-artifacts/8-1-inngest-job-infrastructure.md#Dev-Agent-Record]

---

## Tasks

### Task 1: Create Batch Scoring Service (AC: 8.2.3, 8.2.4)

**Files:** `src/lib/services/batch-scoring-service.ts`

- [x] Create BatchScoringService class
- [x] Implement `processUserBatch(users, exchangeRates)` method
- [x] For each user: fetch prices, load criteria, calculate scores
- [x] Integrate with existing ScoringEngine
- [x] Emit 4 calculation events per user via EventStore
- [x] Handle individual user failures without stopping batch
- [x] Return batch results with success/failure counts

### Task 2: Implement Overnight Scoring Job Steps (AC: 8.2.1-8.2.3)

**Files:** `src/lib/inngest/functions/overnight-scoring.ts`

- [x] Implement Step 1 (setup): Create correlationId, record overnight_job_run
- [x] Implement Step 2 (fetch-exchange-rates): Call ExchangeRateService.fetchRates()
- [x] Implement Step 3 (get-active-users): Query users with active portfolios
- [x] Implement Step 4 (fetch-asset-prices): Batch fetch prices for all unique assets
- [x] Implement Step 5 (score-portfolios): Call BatchScoringService for user batches
- [x] Implement Step 6 (finalize): Update job status, emit completion event

### Task 3: Create Overnight Job Run Tracking (AC: 8.2.5, 8.2.6)

**Files:** `src/lib/db/schema.ts`, `drizzle/migrations/`

- [x] Add overnight_job_runs table to schema:
  - id, jobType, status, startedAt, completedAt
  - usersProcessed, usersFailed, correlationId
  - errorDetails (JSONB), metrics (JSONB)
- [x] Generate and apply migration
- [x] Create helper functions for job run CRUD operations

### Task 4: Add OpenTelemetry Instrumentation (AC: 8.2.7)

**Files:** `src/lib/inngest/functions/overnight-scoring.ts`

- [x] Create job-level span: `overnight-scoring-job`
- [x] Add timing attributes: fetch_rates_ms, process_users_ms, total_duration_ms
- [x] Add count attributes: users_total, users_success, users_failed, assets_scored
- [x] Set span status appropriately on completion/error

### Task 5: Implement User Query Service (AC: 8.2.3)

**Files:** `src/lib/services/user-query-service.ts` (new or extend existing)

- [x] Create query to get active users with portfolios
- [x] Include user's configured markets
- [x] Include user's criteria version
- [x] Optimize query for batch processing

### Task 6: Write Unit Tests - Batch Scoring Service (AC: 8.2.3, 8.2.4)

**Files:** `tests/unit/services/batch-scoring.test.ts`

- [x] Test single user processing
- [x] Test batch processing (50 users)
- [x] Test event emission (4 events per user)
- [x] Test error handling (continue on user failure)
- [x] Test integration with ScoringEngine

### Task 7: Write Unit Tests - Overnight Scoring Job (AC: 8.2.1-8.2.7)

**Files:** `tests/unit/inngest/overnight-scoring-job.test.ts`

- [x] Test cron trigger configuration
- [x] Test exchange rates fetched once
- [x] Test user batch processing
- [x] Test graceful error handling
- [x] Test OpenTelemetry span attributes
- [x] Mock step.run calls for checkpointing verification

### Task 8: Write Integration Tests (AC: 8.2.3, 8.2.4)

**Files:** `tests/unit/services/user-query-service.test.ts`, `tests/unit/services/overnight-job-service.test.ts`

- [x] Test user query service methods
- [x] Test overnight job service CRUD operations
- [x] Test job status updates
- [x] Test partial failure scenarios

### Task 9: Run Verification

- [x] TypeScript compilation successful (`npx tsc --noEmit`)
- [x] ESLint passes with no new errors (only pre-existing warnings)
- [x] All unit tests pass (2,886 tests)
- [x] Build verification (`pnpm build`)

---

## Dependencies

- **Story 1.4:** Event-Sourced Calculation Pipeline (Complete) - event store, 4 event types
- **Story 1.5:** OpenTelemetry Instrumentation (Complete) - job-level tracing
- **Story 5.8:** Score Calculation Engine (Complete) - scoring logic
- **Story 6.3:** Fetch Daily Prices (Complete) - price service
- **Story 6.4:** Fetch Exchange Rates (Complete) - exchange rate service
- **Story 8.1:** Inngest Job Infrastructure (Complete) - placeholder functions to extend

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Event-Driven:** Inngest model matches event-sourced architecture (ADR-002, ADR-003)
- **Step Functions:** Enable checkpointing for long-running jobs
- **Per-Market Scheduling:** Different cron triggers for different markets (not per-user timezone)
- **Graceful Degradation:** Continue processing on individual user failures

[Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]

### Performance Optimization Strategies

Per Tech Spec:

- Batch database queries (fetch multiple users' criteria in single query)
- Share exchange rates across all users (fetched once per job)
- Process users in batches of 50
- Use step functions for checkpointing on long runs

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Performance]

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for BatchScoringService
- Unit tests for overnight job function
- Integration tests for end-to-end job execution
- Mock external services (price API, exchange rate API)
- All tests must pass before marking complete

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

Following unified project structure:

- **Batch Service:** `src/lib/services/batch-scoring-service.ts` (new)
- **Job Function:** `src/lib/inngest/functions/overnight-scoring.ts` (extend)
- **Schema Update:** `src/lib/db/schema.ts` (add overnight_job_runs)
- **Tests:** `tests/unit/services/`, `tests/unit/inngest/`, `tests/integration/`

[Source: docs/architecture.md#Project-Structure]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Story-8.2-Overnight-Scoring-Job]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Acceptance-Criteria-Authoritative]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Workflows-and-Sequencing]
- [Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]
- [Source: docs/epics.md#Story-8.2]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]
- [Source: docs/sprint-artifacts/8-1-inngest-job-infrastructure.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/8-2-overnight-scoring-job.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Batch Scoring Service** (`src/lib/services/batch-scoring-service.ts`):
   - Created `BatchScoringService` class with `processUserBatch()` method
   - Emits 4 events per user: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED
   - Handles user failures gracefully - continues processing remaining users
   - Stores scores to `asset_scores` and `score_history` tables
   - Changed `PricesMap.fetchedAt` from Date to string for Inngest JSON serialization

2. **Overnight Scoring Job** (`src/lib/inngest/functions/overnight-scoring.ts`):
   - Full implementation with 7 checkpointed steps
   - Step 1: Setup - creates correlationId, records job run
   - Step 2: Fetch exchange rates (once for consistency)
   - Step 3: Get active users with portfolios
   - Step 4: Fetch asset prices for all unique symbols
   - Step 5: Score portfolios in batches of 50 users
   - Step 6: Finalize - update job status
   - Step 7: Trigger cache warming (placeholder for Story 8.4)
   - OpenTelemetry span with timing and count attributes

3. **Database Schema** (`src/lib/db/schema.ts`):
   - Added `overnight_job_runs` table with JSONB fields for metrics and errors
   - Indexes on correlationId, status, and startedAt for efficient queries

4. **Services**:
   - `OvernightJobService` (`src/lib/services/overnight-job-service.ts`): CRUD for job tracking
   - `UserQueryService` (`src/lib/services/user-query-service.ts`): Queries active users with portfolios

5. **Test Coverage**:
   - `tests/unit/services/batch-scoring.test.ts`: 12 tests
   - `tests/unit/inngest/overnight-scoring-job.test.ts`: 22 tests
   - `tests/unit/services/user-query-service.test.ts`: 10 tests
   - `tests/unit/services/overnight-job-service.test.ts`: 16 tests

### File List

**New Files Created:**

- `src/lib/services/batch-scoring-service.ts`
- `src/lib/services/overnight-job-service.ts`
- `src/lib/services/user-query-service.ts`
- `tests/unit/services/batch-scoring.test.ts`
- `tests/unit/services/overnight-job-service.test.ts`
- `tests/unit/services/user-query-service.test.ts`
- `tests/unit/inngest/overnight-scoring-job.test.ts`

**Modified Files:**

- `src/lib/db/schema.ts` (added overnight_job_runs table)
- `src/lib/inngest/functions/overnight-scoring.ts` (full implementation)

---

## Change Log

| Date       | Change                                                                | Author                           |
| ---------- | --------------------------------------------------------------------- | -------------------------------- |
| 2025-12-14 | Story drafted from tech-spec-epic-8.md and epics.md                   | SM Agent (create-story workflow) |
| 2025-12-14 | Full implementation of overnight scoring job with all tasks completed | Dev Agent (Claude Opus 4.5)      |
