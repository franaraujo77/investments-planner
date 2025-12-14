# Epic Technical Specification: Overnight Processing

Date: 2025-12-14
Author: Bmad
Epic ID: 8
Status: Draft

---

## Overview

Epic 8 implements the automated overnight processing pipeline that pre-computes scores and recommendations before users log in each day. This is a core architectural component that fulfills the PRD's promise of "instant recommendations on login" by shifting computation from request-time to batch processing.

The overnight processing system leverages Inngest for job orchestration, integrating with the existing event-sourced calculation pipeline (Epic 1) and provider abstraction layer (Epic 6) to fetch fresh data, recalculate scores for all configured markets, generate personalized recommendations, and warm the Vercel KV cache - all before users begin their trading day.

This epic transforms the user experience from "wait for calculations" to "instant answers" while providing a complete audit trail (FR64) for all overnight computations.

## Objectives and Scope

### In Scope

- **Inngest infrastructure setup** - Client configuration, webhook handler, step functions
- **Overnight scoring job** - Automated job that runs 2 hours before earliest configured market open
- **Per-user score calculation** - Batch processing of scores for all assets in user's configured markets
- **Recommendation pre-generation** - Generate recommendations using latest scores and user's allocation targets
- **Vercel KV cache warming** - Store pre-computed recommendations for instant dashboard load
- **Calculation audit trail** - Extend event sourcing to cover overnight batch operations
- **Dashboard cache integration** - Modify dashboard to read from cache with fallback to PostgreSQL
- **Graceful degradation** - Handle partial failures without blocking entire overnight run

### Out of Scope

- Per-user timezone scheduling (using per-market scheduling per ADR)
- Real-time score updates (overnight batch only for MVP)
- Retry management UI (use Inngest dashboard)
- Cost optimization beyond basic implementation
- Alert notifications for overnight job failures (Epic 9)

## System Architecture Alignment

This epic implements the **Overnight Pre-Computation** requirements (FR56-FR59) defined in the PRD and aligns with architectural decisions:

| Architecture Component      | Epic 8 Implementation                                   |
| --------------------------- | ------------------------------------------------------- |
| **ADR-003: Inngest**        | Inngest client, step functions for checkpointing        |
| **ADR-002: Event Sourcing** | Extend 4-event pattern to batch operations              |
| **Vercel KV Cache**         | Store recommendations with `recs:${userId}` key pattern |
| **Provider Abstraction**    | Reuse Epic 6 services for data fetching                 |
| **OpenTelemetry**           | Job-level spans for overnight processing monitoring     |

**Critical Constraints:**

- Overnight processing must complete before 6 AM local market time
- Dashboard load target: <2 seconds (from cache)
- Must support horizontal scaling for 1000+ users

## Detailed Design

### Services and Modules

| Module                           | Responsibility                            | Location                                     |
| -------------------------------- | ----------------------------------------- | -------------------------------------------- |
| **Inngest Client**               | Configure Inngest connection, event types | `lib/inngest/client.ts`                      |
| **Overnight Scoring Function**   | Orchestrate nightly scoring pipeline      | `lib/inngest/functions/overnight-scoring.ts` |
| **Cache Warmer Function**        | Populate Vercel KV with recommendations   | `lib/inngest/functions/cache-warmer.ts`      |
| **Batch Scoring Service**        | Process scores for multiple users         | `lib/services/batch-scoring-service.ts`      |
| **Recommendation Cache Service** | Read/write recommendations to KV          | `lib/cache/recommendation-cache.ts`          |
| **Overnight Event Types**        | Batch-specific calculation events         | `lib/events/overnight-events.ts`             |

### Data Models and Contracts

**Vercel KV Cache Schema:**

```typescript
// Key: `recs:${userId}`
// TTL: 24 hours
interface CachedRecommendations {
  userId: string;
  generatedAt: string; // ISO timestamp
  recommendations: Array<{
    assetId: string;
    symbol: string;
    score: string; // Decimal string
    amount: string; // Decimal string
    currency: string;
    allocationGap: string;
    breakdown: {
      criteriaCount: number;
      topContributor: string;
    };
  }>;
  portfolioSummary: {
    totalValue: string;
    baseCurrency: string;
    allocations: Record<string, string>; // class -> percentage
  };
  dataFreshness: {
    pricesAsOf: string;
    ratesAsOf: string;
    criteriaVersion: string;
  };
}

// Key: `portfolio:${userId}`
// TTL: 24 hours
interface CachedPortfolioSummary {
  totalValue: string;
  assetCount: number;
  allocations: Array<{
    className: string;
    currentPercent: string;
    targetMin: string;
    targetMax: string;
  }>;
}
```

**Overnight Job Metadata (PostgreSQL):**

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

### APIs and Interfaces

**Inngest Webhook Handler:**

```typescript
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { overnightScoringJob } from "@/lib/inngest/functions/overnight-scoring";
import { cacheWarmerJob } from "@/lib/inngest/functions/cache-warmer";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [overnightScoringJob, cacheWarmerJob],
});
```

**Dashboard API (updated to use cache):**

```typescript
// GET /api/dashboard
// Returns cached recommendations or falls back to database
interface DashboardResponse {
  data: {
    recommendations: CachedRecommendations["recommendations"];
    totalInvestable: string;
    baseCurrency: string;
    dataFreshness: string;
    fromCache: boolean; // Indicates if data came from KV cache
  };
}
```

**Cache Service Interface:**

```typescript
// lib/cache/recommendation-cache.ts
interface RecommendationCacheService {
  get(userId: string): Promise<CachedRecommendations | null>;
  set(userId: string, data: CachedRecommendations): Promise<void>;
  invalidate(userId: string): Promise<void>;
  invalidateAll(): Promise<void>; // For cache clear operations
}
```

### Workflows and Sequencing

**Overnight Processing Flow:**

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
│ Exchange Rates  │ → Store in cache for consistency across users
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 3: Get     │ → Query users with active portfolios
│ Active Users    │ → Filter by configured markets matching job timing
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ Step 4: Process Users (parallelized, batched)            │
│                                                          │
│  For each user batch (50 users):                         │
│    │                                                     │
│    ├─► Fetch prices for user's assets                    │
│    │   (PriceService with provider abstraction)          │
│    │                                                     │
│    ├─► Calculate scores                                  │
│    │   (ScoringEngine with event sourcing)               │
│    │                                                     │
│    ├─► Generate recommendations                          │
│    │   (RecommendationEngine)                            │
│    │                                                     │
│    └─► Store in Vercel KV cache                          │
│        (RecommendationCacheService)                      │
│                                                          │
│  On user failure: log error, continue with next user     │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Step 5: Finalize│ → Update overnight_job_run (status: 'completed'/'partial')
│                 │ → Log JOB_COMPLETED event with metrics
│                 │ → Report to OpenTelemetry
└─────────────────┘
```

**Per-User Processing Sequence:**

```
User Processing (within overnight job)
         │
         ├─► CALC_STARTED event (correlationId links to job run)
         │
         ├─► Fetch user's criteria (latest version)
         │
         ├─► Fetch prices for user's portfolio assets
         │
         ├─► INPUTS_CAPTURED event (criteria, prices, rates snapshot)
         │
         ├─► Calculate scores for all assets in configured markets
         │
         ├─► SCORES_COMPUTED event (all asset scores)
         │
         ├─► Generate recommendations based on:
         │   - Scores
         │   - Allocation targets
         │   - User's default contribution amount
         │
         ├─► CALC_COMPLETED event (duration, metrics)
         │
         └─► Write to Vercel KV cache
```

## Non-Functional Requirements

### Performance

| Metric                        | Target                   | Implementation                           |
| ----------------------------- | ------------------------ | ---------------------------------------- |
| **Total job duration**        | < 4 hours for 1000 users | Parallel processing in batches of 50     |
| **Per-user processing**       | < 10 seconds average     | Optimized queries, cached exchange rates |
| **Dashboard load from cache** | < 100ms                  | Vercel KV edge proximity                 |
| **Cache miss fallback**       | < 2 seconds              | PostgreSQL with proper indexes           |

**Optimization Strategies:**

- Batch database queries (fetch multiple users' criteria in single query)
- Share exchange rates across all users (fetched once per job)
- Parallel asset price fetching within provider rate limits
- Inngest step functions enable checkpointing on long runs

### Security

| Requirement               | Implementation                                   |
| ------------------------- | ------------------------------------------------ |
| **Cache key isolation**   | Keys namespaced by userId: `recs:${userId}`      |
| **No cross-user data**    | Each user's cache entry contains only their data |
| **Audit trail**           | All calculations logged with correlationId       |
| **Secrets management**    | Inngest keys in environment variables            |
| **Rate limit compliance** | Provider abstraction handles API limits          |

### Reliability/Availability

| Requirement                  | Target                         | Strategy                               |
| ---------------------------- | ------------------------------ | -------------------------------------- |
| **Job completion**           | 99% success rate               | Inngest automatic retries (3 attempts) |
| **Partial failure handling** | Continue on user failure       | Try-catch per user, log and continue   |
| **Data consistency**         | All users see same day's rates | Fetch rates once, reuse for all users  |
| **Stale data handling**      | Show stale badge if >24h       | DataFreshnessBadge component (Epic 6)  |
| **Recovery**                 | Resume from checkpoint         | Inngest step functions                 |

**Failure Modes & Mitigation:**

| Failure                  | Impact                    | Mitigation                             |
| ------------------------ | ------------------------- | -------------------------------------- |
| Exchange rate API down   | Cannot convert currencies | Use cached rates + stale warning       |
| Price API rate limited   | Incomplete scores         | Queue with backoff, partial results OK |
| Inngest timeout          | Job incomplete            | Step functions checkpoint progress     |
| Vercel KV unavailable    | Cache not warmed          | Dashboard falls back to PostgreSQL     |
| Database connection lost | Job fails                 | Inngest retry with exponential backoff |

### Observability

| Signal                | Implementation                                        |
| --------------------- | ----------------------------------------------------- |
| **Job-level span**    | OpenTelemetry span: `overnight-scoring-job`           |
| **Timing attributes** | `fetch_rates_ms`, `process_users_ms`, `cache_warm_ms` |
| **User counts**       | `users_total`, `users_success`, `users_failed`        |
| **Asset metrics**     | `assets_scored`, `recommendations_generated`          |
| **Error tracking**    | Span status ERROR with message on failure             |

**Logging Strategy:**

```typescript
// Structured logging for overnight jobs
logger.info("Overnight job started", {
  correlationId,
  jobType: "scoring",
  targetMarkets: ["NYSE", "B3"],
  userCount: activeUsers.length,
});

logger.info("User batch processed", {
  correlationId,
  batchNumber: 1,
  usersProcessed: 50,
  duration: 45000,
});

logger.error("User processing failed", {
  correlationId,
  userId: "xxx", // Masked for logs
  error: error.message,
  stage: "score-calculation",
});
```

## Dependencies and Integrations

### External Dependencies

| Dependency         | Version | Purpose                      | Notes                   |
| ------------------ | ------- | ---------------------------- | ----------------------- |
| `inngest`          | ^3.46.0 | Background job orchestration | Already in package.json |
| `@vercel/kv`       | ^3.0.0  | Recommendations cache        | Already in package.json |
| `@opentelemetry/*` | ^1.30.x | Job observability            | Already configured      |

### Internal Dependencies

| Dependency                | Location                                 | Integration Point                   |
| ------------------------- | ---------------------------------------- | ----------------------------------- |
| **Event Store**           | `lib/events/event-store.ts`              | Append overnight calculation events |
| **Scoring Engine**        | `lib/calculations/scoring-engine.ts`     | Calculate asset scores              |
| **Recommendation Engine** | `lib/calculations/recommendations.ts`    | Generate buy recommendations        |
| **Price Service**         | `lib/providers/price-service.ts`         | Fetch asset prices                  |
| **Exchange Rate Service** | `lib/providers/exchange-rate-service.ts` | Fetch currency rates                |
| **Dashboard API**         | `app/api/dashboard/route.ts`             | Modified to read from cache         |

### Environment Variables (New)

```bash
# Inngest Configuration
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"

# Optional: Override default job timing (for testing)
OVERNIGHT_JOB_CRON="0 4 * * *" # Default: 4 AM UTC
```

## Acceptance Criteria (Authoritative)

### Story 8.1: Inngest Job Infrastructure

1. **AC-8.1.1:** Inngest client is configured in `lib/inngest/client.ts` with correct event types
2. **AC-8.1.2:** Webhook handler at `/api/inngest` receives and processes Inngest events
3. **AC-8.1.3:** Inngest dashboard shows registered functions when dev server runs
4. **AC-8.1.4:** Step functions enable checkpointing (job can resume after failure)

### Story 8.2: Overnight Scoring Job

5. **AC-8.2.1:** Job triggers at configured cron time (2h before market open)
6. **AC-8.2.2:** Job fetches exchange rates once and reuses for all users
7. **AC-8.2.3:** Job processes each active user's portfolio (fetch prices, calculate scores)
8. **AC-8.2.4:** Job emits 4 calculation events per user (CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED)
9. **AC-8.2.5:** Job continues processing remaining users if one user fails
10. **AC-8.2.6:** Job completes before market open (within 4 hours for 1000 users)
11. **AC-8.2.7:** OpenTelemetry span captures job-level timing breakdown

### Story 8.3: Recommendation Pre-Generation

12. **AC-8.3.1:** After scores computed, recommendations are generated using user's allocation targets
13. **AC-8.3.2:** Recommendations use user's default contribution amount if set
14. **AC-8.3.3:** Recommendations stored with criteria version for audit trail
15. **AC-8.3.4:** Recommendations include allocation gap calculations

### Story 8.4: Cache Warming

16. **AC-8.4.1:** After recommendations generated, data is stored in Vercel KV
17. **AC-8.4.2:** Cache key follows pattern `recs:${userId}`
18. **AC-8.4.3:** Cache TTL is 24 hours
19. **AC-8.4.4:** Cache includes portfolio summary and data freshness timestamps
20. **AC-8.4.5:** Cache warming completes within 5 minutes for 1000 users

### Story 8.5: Instant Dashboard Load

21. **AC-8.5.1:** Dashboard API reads from Vercel KV cache first
22. **AC-8.5.2:** Dashboard API falls back to PostgreSQL if cache miss
23. **AC-8.5.3:** Dashboard response includes `fromCache: boolean` indicator
24. **AC-8.5.4:** Dashboard loads in <2 seconds with cached data
25. **AC-8.5.5:** DataFreshnessBadge shows when recommendations were generated

### Story 8.6: Calculation Audit Trail

26. **AC-8.6.1:** overnight_job_runs table tracks all job executions
27. **AC-8.6.2:** Each job run has correlationId linking to calculation events
28. **AC-8.6.3:** Job metrics (users processed, failed, timing) are recorded
29. **AC-8.6.4:** Users can query "Show me all calculations for asset X" via existing event store
30. **AC-8.6.5:** Audit data retained for 2 years (per architecture spec)

## Traceability Mapping

| AC         | Spec Section    | Component(s)               | Test Idea                                 |
| ---------- | --------------- | -------------------------- | ----------------------------------------- |
| AC-8.1.1   | Inngest Client  | `lib/inngest/client.ts`    | Unit: client exports correct config       |
| AC-8.1.2   | Webhook Handler | `app/api/inngest/route.ts` | Integration: POST webhook receives events |
| AC-8.1.3   | Dev Server      | Inngest dashboard          | Manual: verify functions visible          |
| AC-8.1.4   | Step Functions  | overnight-scoring.ts       | Unit: mock step.run calls                 |
| AC-8.2.1   | Cron Trigger    | Inngest config             | Unit: cron expression validation          |
| AC-8.2.2   | Exchange Rates  | overnight-scoring.ts       | Unit: rates fetched once, reused          |
| AC-8.2.3   | User Processing | BatchScoringService        | Integration: process test users           |
| AC-8.2.4   | Event Sourcing  | EventStore                 | Unit: 4 events emitted per user           |
| AC-8.2.5   | Error Handling  | overnight-scoring.ts       | Unit: continue on user failure            |
| AC-8.2.6   | Performance     | overnight-scoring.ts       | Load: 1000 users < 4 hours                |
| AC-8.2.7   | OpenTelemetry   | telemetry/index.ts         | Unit: span attributes set                 |
| AC-8.3.1-4 | Recommendations | RecommendationEngine       | Unit: recommendations generated           |
| AC-8.4.1-5 | Cache Warming   | RecommendationCacheService | Integration: KV writes verified           |
| AC-8.5.1-5 | Dashboard       | dashboard API              | E2E: dashboard loads from cache           |
| AC-8.6.1-5 | Audit Trail     | overnight_job_runs         | Integration: query job history            |

## Risks, Assumptions, Open Questions

### Risks

| Risk                                | Impact                | Probability | Mitigation                             |
| ----------------------------------- | --------------------- | ----------- | -------------------------------------- |
| **R1: Inngest rate limits**         | Job throttled         | Medium      | Monitor usage, upgrade plan if needed  |
| **R2: Vercel KV size limits**       | Cache overflow        | Low         | Monitor per-key size (<1MB each)       |
| **R3: Provider API costs**          | Budget exceeded       | Medium      | Track API calls, implement cost alerts |
| **R4: Job duration exceeds window** | Stale recommendations | Medium      | Optimize batch size, add monitoring    |

### Assumptions

| Assumption                                   | Implication                             |
| -------------------------------------------- | --------------------------------------- |
| **A1:** Inngest free tier sufficient for MVP | May need upgrade for >1000 users        |
| **A2:** Vercel KV latency <10ms at edge      | Dashboard <2s target achievable         |
| **A3:** Exchange rates stable during job     | Single fetch at job start is sufficient |
| **A4:** User count grows gradually           | Time to optimize before scale issues    |

### Open Questions

| Question                                       | Status               | Decision Needed By       |
| ---------------------------------------------- | -------------------- | ------------------------ |
| **Q1:** Should we implement job scheduling UI? | Deferred             | Post-MVP                 |
| **Q2:** Alert on partial job failure?          | Epic 9               | Before production launch |
| **Q3:** Per-market vs global job timing?       | Per-market (per ADR) | Resolved                 |

## Test Strategy Summary

### Unit Tests

- **Inngest client configuration** - Verify event types, client ID
- **Step function mocking** - Test job orchestration logic
- **Cache service** - Test get/set/invalidate operations
- **Batch processing** - Test user batching logic
- **Error handling** - Test continue-on-failure behavior

### Integration Tests

- **Overnight job flow** - End-to-end job execution with test database
- **Cache warming** - Verify KV writes with real Vercel KV (test env)
- **Dashboard cache read** - Verify fallback behavior
- **Event store integration** - Verify events recorded correctly

### E2E Tests

- **Dashboard load time** - Measure cache hit vs miss performance
- **Data freshness display** - Verify timestamps shown correctly
- **Post-job dashboard** - Login after overnight job, verify instant load

### Performance Tests

- **1000 user simulation** - Verify <4 hour completion
- **Cache hit latency** - Verify <100ms KV read
- **Concurrent dashboard loads** - Verify scaling under load

### Test Data Requirements

- Seed database with 100+ test users
- Each user has portfolio with 10-50 assets
- Multiple asset classes and markets represented
- Historical scores for comparison
