# Story 8.1: Inngest Job Infrastructure

**Status:** review
**Epic:** Epic 8 - Overnight Processing
**Previous Story:** Epic 7 Complete (Status: done) - First story in Epic 8

---

## Story

**As a** developer
**I want** Inngest configured for background job orchestration
**So that** overnight processing can run reliably with automatic retries and observability

---

## Acceptance Criteria

### AC-8.1.1: Inngest Client Configuration

- **Given** the project codebase
- **When** Inngest is configured
- **Then** Inngest client is configured in `lib/inngest/client.ts` with correct event types
- **And** client ID is set to `investments-planner`
- **And** event types are defined for overnight processing

### AC-8.1.2: Webhook Handler Setup

- **Given** Inngest client is configured
- **When** Inngest sends events
- **Then** webhook handler at `/api/inngest` receives and processes Inngest events
- **And** handler exports GET, POST, PUT methods using `serve()` function
- **And** registered functions are included in the serve configuration

### AC-8.1.3: Inngest Dashboard Visibility

- **Given** the development server is running with Inngest dev server
- **When** I access the Inngest dashboard
- **Then** registered functions are visible in the dashboard
- **And** function names and configurations are displayed

### AC-8.1.4: Step Functions for Checkpointing

- **Given** a background job function is defined
- **When** the job uses step functions
- **Then** job can resume after failure (checkpointing enabled)
- **And** each step is independently retryable
- **And** step results are persisted between invocations

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 8 Tech Spec:

- **ADR-003:** Inngest for Background Jobs - event-driven, Vercel-native, built-in retries
- Inngest client configured with `investments-planner` ID
- Step functions enable checkpointing for long-running overnight jobs
- Integration with existing OpenTelemetry instrumentation (Story 1.5)

[Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]
[Source: docs/sprint-artifacts/tech-spec-epic-8.md#System-Architecture-Alignment]

### Tech Spec Reference

Per Epic 8 Tech Spec (AC-8.1.1-8.1.4):

- AC-8.1.1: Inngest client in `lib/inngest/client.ts` with correct event types
- AC-8.1.2: Webhook handler at `/api/inngest` receives and processes events
- AC-8.1.3: Inngest dashboard shows registered functions when dev server runs
- AC-8.1.4: Step functions enable checkpointing (job can resume after failure)

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Acceptance-Criteria-Authoritative]

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
    [Further steps in Stories 8.2-8.5]
```

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Workflows-and-Sequencing]

### Services and Modules

Per Tech Spec:

| Module                         | Responsibility                            | Location                                     |
| ------------------------------ | ----------------------------------------- | -------------------------------------------- |
| **Inngest Client**             | Configure Inngest connection, event types | `lib/inngest/client.ts`                      |
| **Overnight Scoring Function** | Orchestrate nightly scoring pipeline      | `lib/inngest/functions/overnight-scoring.ts` |
| **Cache Warmer Function**      | Populate Vercel KV with recommendations   | `lib/inngest/functions/cache-warmer.ts`      |

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Services-and-Modules]

### Inngest Client Pattern (from Architecture)

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "investments-planner" });

export const overnightScoringJob = inngest.createFunction(
  { id: "overnight-scoring", name: "Overnight Scoring" },
  { cron: "0 4 * * *" }, // Per-market: multiple functions with different crons
  async ({ step }) => {
    const rates = await step.run("fetch-rates", fetchExchangeRates);
    const prices = await step.run("fetch-prices", fetchPrices);
    const users = await step.run("get-users", getActiveUsers);

    // Fan-out: score each user
    await step.run("score-users", async () => {
      for (const user of users) {
        await scoreUserPortfolio(user.id, rates, prices);
      }
    });

    await step.run("warm-cache", warmVercelKVCache);
  }
);
```

[Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]

### Webhook Handler Pattern (from Tech Spec)

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

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#APIs-and-Interfaces]

### Environment Variables (New)

```bash
# Inngest Configuration
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"

# Optional: Override default job timing (for testing)
OVERNIGHT_JOB_CRON="0 4 * * *" # Default: 4 AM UTC
```

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Environment-Variables-New]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **Event Store** - `lib/events/event-store.ts` (from Story 1.4)
   - Append overnight calculation events
   - Use existing event types pattern

2. **OpenTelemetry** - `lib/telemetry/index.ts` (from Story 1.5)
   - Job-level spans for overnight processing monitoring
   - Span attributes for timing breakdown

3. **Vercel KV Cache** - `lib/cache/index.ts` (from Story 1.6)
   - Cache utilities for storing recommendations
   - Key patterns already established

4. **Logger** - Structured logging patterns established in Epic 1
   - Use existing logger for job status logging

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Internal-Dependencies]

### Inngest Package Status

The `inngest` package is already in `package.json` (version ^3.46.0) per the architecture document. Verify installation and add if missing.

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#External-Dependencies]

---

## Tasks

### Task 1: Verify/Install Inngest Package (AC: 8.1.1)

**Files:** `package.json`

- [x] Verify `inngest` package is installed (should be ^3.46.0)
- [x] If missing, install: `pnpm add inngest`
- [x] Verify types are available

### Task 2: Create Inngest Client Configuration (AC: 8.1.1)

**Files:** `src/lib/inngest/client.ts`

- [x] Create `src/lib/inngest/` directory
- [x] Create `client.ts` with Inngest client configuration
- [x] Set client ID to `investments-planner`
- [x] Define event types for overnight processing
- [x] Export client for use in functions and webhook handler

### Task 3: Create Webhook Handler (AC: 8.1.2)

**Files:** `src/app/api/inngest/route.ts`

- [x] Create API route at `/api/inngest`
- [x] Import `serve` from `inngest/next`
- [x] Import Inngest client
- [x] Export GET, POST, PUT handlers using `serve()`
- [x] Initially register empty functions array (functions added in later stories)

### Task 4: Create Placeholder Overnight Scoring Function (AC: 8.1.3, 8.1.4)

**Files:** `src/lib/inngest/functions/overnight-scoring.ts`

- [x] Create `src/lib/inngest/functions/` directory
- [x] Create placeholder overnight scoring function
- [x] Use `inngest.createFunction()` with step function pattern
- [x] Define cron trigger (configurable via env var)
- [x] Implement basic step structure for checkpointing demonstration
- [x] Add placeholder steps that log messages (actual logic in Story 8.2)

### Task 5: Create Placeholder Cache Warmer Function (AC: 8.1.3)

**Files:** `src/lib/inngest/functions/cache-warmer.ts`

- [x] Create placeholder cache warmer function
- [x] Define function configuration
- [x] Export for registration in webhook handler

### Task 6: Register Functions in Webhook Handler (AC: 8.1.2, 8.1.3)

**Files:** `src/app/api/inngest/route.ts`

- [x] Import overnight scoring function
- [x] Import cache warmer function
- [x] Register both in `serve()` functions array

### Task 7: Add Environment Variables Template (AC: 8.1.1)

**Files:** `.env.example`, `.env.local` (update)

- [x] Add INNGEST_EVENT_KEY placeholder
- [x] Add INNGEST_SIGNING_KEY placeholder
- [x] Add OVERNIGHT_JOB_CRON with default value

### Task 8: Write Unit Tests - Inngest Client (AC: 8.1.1)

**Files:** `tests/unit/inngest/client.test.ts`

- [x] Test client exports correct configuration
- [x] Test client ID is `investments-planner`
- [x] Test event types are properly defined

### Task 9: Write Unit Tests - Function Definitions (AC: 8.1.4)

**Files:** `tests/unit/inngest/overnight-scoring.test.ts`

- [x] Test function configuration is valid
- [x] Test step function pattern is used
- [x] Test cron trigger configuration
- [x] Mock step.run calls to verify checkpointing pattern

### Task 10: Write Integration Test - Webhook Handler (AC: 8.1.2)

**Files:** `tests/integration/api/inngest-webhook.test.ts`

- [x] Test POST endpoint accepts Inngest events
- [x] Test GET endpoint returns function registration info
- [x] Test handler responds correctly to Inngest introspection

### Task 11: Run Verification

- [x] TypeScript compilation successful (`npx tsc --noEmit`)
- [x] ESLint passes with no new errors
- [x] All unit tests pass
- [x] All integration tests pass
- [x] Build verification (`pnpm build`)
- [ ] Local Inngest dev server shows registered functions (manual verification)

---

## Dependencies

- **Story 1.4:** Event-Sourced Calculation Pipeline (Complete) - event store integration
- **Story 1.5:** OpenTelemetry Instrumentation (Complete) - job-level tracing
- **Story 1.6:** Vercel KV Cache Setup (Complete) - cache infrastructure

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Event-Driven:** Inngest model matches event-sourced architecture (ADR-002, ADR-003)
- **Step Functions:** Enable checkpointing for long-running jobs
- **Per-Market Scheduling:** Different cron triggers for different markets (not per-user timezone)
- **Vercel-Native:** Zero infrastructure management

[Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for client configuration and function definitions
- Integration tests for webhook handler
- Mock Inngest SDK functions for unit tests
- Manual verification with Inngest dev server for dashboard visibility
- All tests must pass before marking complete

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Learnings from Previous Story

**First Story in Epic 8 - No Direct Predecessor**

This is the first story in Epic 8. However, relevant learnings from Epic 7 completion:

**From Epic 7 Retrospective (Status: completed)**

- **Testing Pattern:** Interface/utility testing pattern for complex components due to @testing-library/react constraints
- **TypeScript:** exactOptionalPropertyTypes requires `| undefined` for optional props
- **Pre-existing Issue:** `@clerk/nextjs` import error exists in codebase but is not related to Epic 8
- **Build Success:** Epic 7 completed with all 2785 tests passing and successful build

**Relevant Existing Infrastructure:**

- Event Store: `src/lib/events/event-store.ts` - Use for overnight calculation events
- Logger: `src/lib/telemetry/logger.ts` - Use for structured job logging
- OpenTelemetry: `src/lib/telemetry/index.ts` - Use for job-level spans
- Cache: `src/lib/cache/` - Use for recommendations caching

[Source: docs/sprint-artifacts/epic-7-retro-2025-12-14.md]
[Source: docs/sprint-artifacts/7-10-view-updated-allocation.md#Dev-Agent-Record]

### Project Structure Notes

Following unified project structure:

- **Inngest Client:** `src/lib/inngest/client.ts` (new)
- **Functions:** `src/lib/inngest/functions/overnight-scoring.ts`, `src/lib/inngest/functions/cache-warmer.ts` (new)
- **Webhook Handler:** `src/app/api/inngest/route.ts` (new)
- **Tests:** `tests/unit/inngest/`, `tests/integration/api/`

[Source: docs/architecture.md#Project-Structure]

### Inngest Development Workflow

For local development and testing:

1. Start Next.js dev server: `pnpm dev`
2. Start Inngest dev server (separate terminal): `npx inngest-cli@latest dev`
3. Access Inngest dashboard: http://localhost:8288
4. Registered functions should appear in dashboard
5. Can manually trigger functions for testing

[Source: docs/architecture.md#Development-Environment]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Story-8.1-Inngest-Job-Infrastructure]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Acceptance-Criteria-Authoritative]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Services-and-Modules]
- [Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]
- [Source: docs/epics.md#Story-8.1]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/8-1-inngest-job-infrastructure.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Task 1: Inngest package ^3.46.0 already installed in package.json, no action needed
- Task 2-6: Extended existing Inngest infrastructure with overnight processing event types and functions
- Task 7: Added Inngest environment variables to .env.example
- Task 8-10: Created comprehensive test suite with 39 tests covering client, functions, and webhook handler
- Task 11: All verifications passed - TypeScript, ESLint (0 errors/warnings), 2824 total tests, successful build

### Completion Notes List

- ✅ Extended existing Inngest client with 4 new event types for overnight processing (overnight/scoring.started, overnight/scoring.completed, cache/warming.started, cache/warming.completed)
- ✅ Created overnight-scoring.ts with 6-step checkpointed pipeline (setup, fetch-exchange-rates, fetch-asset-prices, get-active-users, score-portfolios, trigger-cache-warming)
- ✅ Created cache-warmer.ts with 3-step checkpointed pipeline (get-users-for-warming, warm-recommendations-cache, warm-dashboard-cache)
- ✅ Functions registered in webhook handler via lib/inngest/index.ts - total 5 functions now registered
- ✅ Cron schedule configurable via OVERNIGHT_JOB_CRON env var (default: 4 AM UTC daily)
- ✅ All tests passing: 39 new tests + 2824 total (no regressions)
- ⚠️ Manual verification required: Start Inngest dev server to verify dashboard visibility (Task 11 final item)

### File List

**Modified:**

- src/lib/inngest/client.ts - Added overnight processing event types
- src/lib/inngest/index.ts - Added exports for new functions
- src/app/api/inngest/route.ts - Updated comments to document new functions
- .env.example - Added Inngest environment variables section

**Created:**

- src/lib/inngest/functions/overnight-scoring.ts - Overnight scoring job with step functions
- src/lib/inngest/functions/cache-warmer.ts - Cache warmer job with step functions
- tests/unit/inngest/client.test.ts - Unit tests for Inngest client (13 tests)
- tests/unit/inngest/overnight-scoring.test.ts - Unit tests for overnight scoring function (10 tests)
- tests/unit/inngest/cache-warmer.test.ts - Unit tests for cache warmer function (8 tests)
- tests/integration/api/inngest-webhook.test.ts - Integration tests for webhook handler (8 tests)

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-14 | Story drafted from tech-spec-epic-8.md and epics.md | SM Agent (create-story workflow) |
| 2025-12-14 | Story implemented - Inngest job infrastructure      | Dev Agent (Claude Opus 4.5)      |
