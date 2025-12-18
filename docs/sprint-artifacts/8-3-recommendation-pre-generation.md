# Story 8.3: Recommendation Pre-Generation

**Status:** ready-for-dev
**Epic:** Epic 8 - Overnight Processing
**Previous Story:** 8-2-overnight-scoring-job (Status: done)
**Context Reference:** docs/sprint-artifacts/8-3-recommendation-pre-generation.context.xml

---

## Story

**As a** system
**I want** pre-generated recommendations per user after overnight scoring
**So that** dashboard loads instantly with ready-to-use investment recommendations

---

## Acceptance Criteria

### AC-8.3.1: Recommendations Generated from Latest Scores

- **Given** scores have been computed by the overnight scoring job
- **When** recommendation generation runs
- **Then** recommendations are generated for each user using:
  - Latest scores from the overnight run
  - User's allocation targets (class/subclass ranges)
  - User's portfolio current allocations
- **And** recommendations prioritize:
  1. Assets below target allocation (by gap size)
  2. Higher-scoring assets within each class
  3. Respecting class/subclass allocation ranges

### AC-8.3.2: Default Contribution Amount Used

- **Given** a user has a `default_contribution` set in user_settings
- **When** recommendations are generated
- **Then** recommendations use the default contribution amount
- **And** if no default is set, recommendations use $0 (informational only)
- **And** total recommendation amount equals user's default contribution
- **And** recommendation amounts respect minimum allocation values (FR23)

### AC-8.3.3: Criteria Version Stored for Audit

- **Given** recommendations are generated
- **When** stored in cache/database
- **Then** the `criteria_version_id` is stored with the recommendations
- **And** the `exchange_rates` snapshot used is stored
- **And** the `scores` snapshot used is stored
- **And** this enables audit trail and replay capability

### AC-8.3.4: Allocation Gap Calculations Included

- **Given** recommendations are generated
- **When** stored for display
- **Then** each recommendation includes:
  - Current allocation percentage for the asset's class
  - Target allocation range (min-max) for the class
  - Allocation gap (target midpoint - current)
  - Gap-weighted score used for prioritization
- **And** over-allocated classes show $0 recommendation with explanation

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 8 Tech Spec:

- **ADR-002:** Event-Sourced Calculations - recommendations link to calculation events via correlationId
- **ADR-003:** Inngest for Background Jobs - recommendation generation is a step in overnight processing
- **FR48:** System generates investment recommendations based on scores and allocation targets
- **FR58:** System pre-generates allocation recommendations for each user

[Source: docs/architecture.md#ADR-002-Event-Sourced-Calculations-with-OpenTelemetry]
[Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]

### Tech Spec Reference

Per Epic 8 Tech Spec (AC-8.3.1-8.3.4):

- Recommendations generated after scores computed
- Uses user's default contribution amount
- Stored with criteria version for audit
- Includes allocation gap calculations

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Story-8.3-Recommendation-Pre-Generation]

### Vercel KV Cache Schema (from Tech Spec)

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
```

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Data-Models-and-Contracts]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **Recommendation Engine** - `src/lib/calculations/recommendations.ts` (from Story 7.4)
   - Use existing `generateRecommendations()` function
   - Algorithm: sort by allocation gap x score, allocate top-down

2. **Batch Scoring Service** - `src/lib/services/batch-scoring-service.ts` (from Story 8.2)
   - Scores are already computed and stored by this service
   - Access scores from `asset_scores` table

3. **Overnight Scoring Job** - `src/lib/inngest/functions/overnight-scoring.ts` (from Story 8.2)
   - Extend Step 6 (finalize) or add Step 7 for recommendation generation
   - Currently has placeholder for cache warming (Story 8.4)

4. **User Query Service** - `src/lib/services/user-query-service.ts` (from Story 8.2)
   - Use existing `getActiveUsersWithPortfolios()` method
   - Already includes user settings

5. **Overnight Job Service** - `src/lib/services/overnight-job-service.ts` (from Story 8.2)
   - Use for tracking job metrics

6. **Allocation Service** - `src/lib/calculations/allocation.ts` (from Epic 3/4)
   - Use existing allocation calculation logic
   - Already uses decimal.js for precision

[Source: docs/sprint-artifacts/8-2-overnight-scoring-job.md#Dev-Agent-Record]

### Learnings from Previous Story

**From Story 8-2-overnight-scoring-job (Status: done)**

- **Overnight Job Structure**: 7 checkpointed steps already implemented:
  - Step 1: Setup (correlationId, job run record)
  - Step 2: Fetch exchange rates (once, shared across users)
  - Step 3: Get active users with portfolios
  - Step 4: Fetch asset prices
  - Step 5: Score portfolios (BatchScoringService)
  - Step 6: Finalize (update job status)
  - Step 7: Trigger cache warming (placeholder for Story 8.4)

- **Key Services Created**:
  - `BatchScoringService` at `src/lib/services/batch-scoring-service.ts` - use for accessing computed scores
  - `OvernightJobService` at `src/lib/services/overnight-job-service.ts` - use for job tracking
  - `UserQueryService` at `src/lib/services/user-query-service.ts` - use for getting user settings

- **JSON Serialization Note**: PricesMap.fetchedAt changed from Date to string for Inngest JSON serialization - apply same pattern for recommendations

- **Test Coverage Pattern**: Follow 60+ test pattern established in Story 8.2

[Source: docs/sprint-artifacts/8-2-overnight-scoring-job.md#Completion-Notes-List]

### Services and Modules

| Module                           | Responsibility                              | Location                                              |
| -------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| **Batch Recommendation Service** | Generate recommendations for multiple users | `lib/services/batch-recommendation-service.ts` (new)  |
| **Recommendation Cache Service** | Read/write recommendations to Vercel KV     | `lib/cache/recommendation-cache.ts` (new)             |
| **Overnight Scoring Job**        | Extended to include recommendation step     | `lib/inngest/functions/overnight-scoring.ts` (modify) |

[Source: docs/sprint-artifacts/tech-spec-epic-8.md#Services-and-Modules]

---

## Tasks

### Task 1: Create Batch Recommendation Service (AC: 8.3.1, 8.3.2) ✅

**Files:** `src/lib/services/batch-recommendation-service.ts`

- [x] Create BatchRecommendationService class
- [x] Implement `generateRecommendationsForUser(userId, scores, exchangeRates)` method
- [x] Integrate with existing RecommendationEngine (`src/lib/calculations/recommendations.ts`)
- [x] Fetch user's allocation targets from asset_classes/subclasses
- [x] Fetch user's default_contribution from user_settings
- [x] Calculate allocation gaps using existing AllocationService
- [x] Return recommendations with allocation gap metadata
- [x] Handle users with no default contribution (generate informational recommendations)

### Task 2: Implement Allocation Gap Calculation (AC: 8.3.4) ✅

**Files:** `src/lib/services/batch-recommendation-service.ts`

- [x] For each asset class, calculate:
  - Current allocation percentage
  - Target allocation range (min-max from user's config)
  - Gap = target midpoint - current
- [x] Weight recommendations by gap x score
- [x] Over-allocated classes get $0 recommendation with "over-allocated" flag
- [x] Store gap details with each recommendation

### Task 3: Create Recommendation Cache Service (AC: 8.3.3) ✅

**Files:** `src/lib/cache/recommendation-cache.ts`

- [x] Implement RecommendationCacheService interface:
  - `get(userId): Promise<CachedRecommendations | null>`
  - `set(userId, data): Promise<void>`
  - `invalidate(userId): Promise<void>`
- [x] Use Vercel KV with key pattern `recs:${userId}`
- [x] Set TTL to 24 hours
- [x] Include criteria_version_id in cached data
- [x] Include dataFreshness timestamps

### Task 4: Extend Overnight Job with Recommendation Generation (AC: 8.3.1-8.3.4) ✅

**Files:** `src/lib/inngest/functions/overnight-scoring.ts`

- [x] Add new step after scoring: "generate-recommendations"
- [x] For each user processed in scoring step:
  - Call BatchRecommendationService.generateRecommendationsForUser()
  - Include allocation gap calculations
  - Store recommendations (prepare for cache warming in Story 8.4)
- [x] Track recommendation generation metrics:
  - users_with_recommendations
  - total_recommendations_generated
  - generation_duration_ms

### Task 5: Store Audit Trail Data (AC: 8.3.3) ✅

**Files:** `src/lib/services/batch-recommendation-service.ts`

- [x] Include criteria_version_id with each recommendation
- [x] Store exchange_rates snapshot reference
- [x] Store scores snapshot reference (correlationId)
- [x] Store generation timestamp
- [x] Link to overnight_job_run via correlationId

### Task 6: Write Unit Tests - Batch Recommendation Service (AC: 8.3.1, 8.3.2, 8.3.4) ✅

**Files:** `tests/unit/services/batch-recommendation.test.ts`

- [x] Test single user recommendation generation
- [x] Test allocation gap calculation
- [x] Test default contribution usage
- [x] Test user without default contribution
- [x] Test over-allocated class handling ($0 recommendation)
- [x] Test minimum allocation value enforcement
- [x] Test integration with RecommendationEngine

### Task 7: Write Unit Tests - Recommendation Cache Service (AC: 8.3.3) ✅

**Files:** `tests/unit/cache/recommendation-cache.test.ts`

- [x] Test cache get/set operations
- [x] Test TTL configuration
- [x] Test invalidation
- [x] Test data structure compliance
- [x] Mock Vercel KV operations

### Task 8: Write Integration Tests (AC: 8.3.1-8.3.4) ✅

**Files:** `tests/unit/inngest/recommendation-generation.test.ts`

- [x] Test recommendation step in overnight job
- [x] Test end-to-end flow: scores -> recommendations
- [x] Test metrics tracking
- [x] Test error handling (continue on user failure)

### Task 9: Run Verification ✅

- [x] TypeScript compilation successful (`npx tsc --noEmit`)
- [x] ESLint passes with no new errors
- [x] All unit tests pass (44 tests)
- [x] Build verification (`pnpm build`) - passed

---

## Dependencies

- **Story 7.4:** Generate Investment Recommendations (Complete) - RecommendationEngine
- **Story 8.2:** Overnight Scoring Job (Complete) - scores computation, job infrastructure
- **Story 4.3:** Set Allocation Ranges for Classes (Complete) - allocation targets
- **Story 1.6:** Vercel KV Cache Setup (Complete) - cache infrastructure

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Recommendation Algorithm:** Sort by allocation gap x score, allocate top-down
- **Minimum Allocation Values:** Skip recommendations below minimum (FR23)
- **Over-Allocated Classes:** Show $0 with explanation (FR50)
- **decimal.js:** All monetary calculations use decimal.js

[Source: docs/architecture.md#Consistency-Rules]

### Recommendation Priority Algorithm

From epics.md Story 7.4:

```
1. Assets below target allocation (by gap)
2. Higher-scoring assets within each class
3. Respecting class/subclass allocation ranges
```

Gap-weighted priority = allocation_gap \* normalized_score

[Source: docs/epics.md#Story-7.4-Generate-Investment-Recommendations]

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for BatchRecommendationService
- Unit tests for RecommendationCacheService
- Integration tests for overnight job recommendation step
- All tests must pass before marking complete

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

Following unified project structure:

- **Batch Service:** `src/lib/services/batch-recommendation-service.ts` (new)
- **Cache Service:** `src/lib/cache/recommendation-cache.ts` (new)
- **Job Function:** `src/lib/inngest/functions/overnight-scoring.ts` (extend)
- **Tests:** `tests/unit/services/`, `tests/unit/cache/`, `tests/unit/inngest/`

[Source: docs/architecture.md#Project-Structure]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Story-8.3-Recommendation-Pre-Generation]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Acceptance-Criteria-Authoritative]
- [Source: docs/sprint-artifacts/tech-spec-epic-8.md#Data-Models-and-Contracts]
- [Source: docs/architecture.md#ADR-003-Background-Jobs-Framework]
- [Source: docs/epics.md#Story-8.3]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]
- [Source: docs/sprint-artifacts/8-2-overnight-scoring-job.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

**2025-12-14 - Implementation Plan:**

1. Create BatchRecommendationService class at `src/lib/services/batch-recommendation-service.ts`
2. Integrate with existing RecommendationEngine for core algorithm
3. Fetch user data: allocation targets (asset_classes, subclasses), default_contribution
4. Calculate allocation gaps per asset class
5. Generate recommendations with gap metadata and audit trail data
6. Create RecommendationCacheService at `src/lib/cache/recommendation-cache.ts`
7. Extend overnight-scoring.ts with recommendation generation step
8. Write comprehensive tests

### Completion Notes List

**2025-12-14 - Story 8-3 Implementation Complete:**

1. **BatchRecommendationService** (`src/lib/services/batch-recommendation-service.ts`):
   - Created comprehensive service for generating recommendations in batch
   - Implements allocation gap calculation per asset class
   - Integrates with existing RecommendationEngine
   - Includes audit trail data (criteriaVersionId, exchangeRates snapshot, correlationId)
   - Processes users in batches with error handling (AC-8.3.5)

2. **RecommendationCacheService** (`src/lib/cache/recommendation-cache.ts`):
   - Vercel KV integration with key pattern `recs:${userId}` (AC-8.4.2)
   - 24-hour TTL (AC-8.4.3)
   - Includes portfolio summary and data freshness timestamps (AC-8.4.4)
   - get/set/invalidate/invalidateAll/exists/getTTL methods

3. **Overnight Scoring Job Extended** (`src/lib/inngest/functions/overnight-scoring.ts`):
   - Added Step 6: generate-recommendations
   - Processes only successfully scored users
   - Tracks metrics: recommendationsGenerated, usersWithRecommendations, recommendationDurationMs
   - Updated Step 7 (finalize) and Step 8 (trigger-cache-warming) numbering

4. **Schema Updates** (`src/lib/db/schema.ts`):
   - Extended overnight_job_runs metrics with recommendation fields

5. **Job Service Updates** (`src/lib/services/overnight-job-service.ts`):
   - Extended JobRunMetrics interface with recommendation metrics

6. **Test Coverage** (44 tests):
   - `tests/unit/services/batch-recommendation.test.ts` - 14 tests
   - `tests/unit/cache/recommendation-cache.test.ts` - 22 tests
   - `tests/unit/inngest/recommendation-generation.test.ts` - 8 tests

### File List

**New Files:**

- `src/lib/services/batch-recommendation-service.ts`
- `src/lib/cache/recommendation-cache.ts`
- `tests/unit/services/batch-recommendation.test.ts`
- `tests/unit/cache/recommendation-cache.test.ts`
- `tests/unit/inngest/recommendation-generation.test.ts`

**Modified Files:**

- `src/lib/inngest/functions/overnight-scoring.ts`
- `src/lib/services/overnight-job-service.ts`
- `src/lib/db/schema.ts`

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-14 | Story drafted from tech-spec-epic-8.md and epics.md | SM Agent (create-story workflow) |
| 2025-12-14 | Senior Developer Review notes appended              | Bmad (code-review workflow)      |

---

## Senior Developer Review (AI)

### Reviewer

Bmad

### Date

2025-12-14

### Outcome

**Approve** ✅

All acceptance criteria are fully implemented with comprehensive test coverage. The implementation follows established patterns from Story 8.2 and correctly integrates with existing infrastructure.

### Summary

Story 8.3 implements recommendation pre-generation as a new step in the overnight processing pipeline. The implementation creates two new services (BatchRecommendationService, RecommendationCacheService), extends the overnight-scoring job with a recommendation generation step, and provides 44 unit/integration tests. All code passes TypeScript compilation, ESLint, and build verification.

### Key Findings

**No HIGH severity issues found.**

**No MEDIUM severity issues found.**

**LOW severity observations (informational only):**

1. **Task 9 incomplete marker**: The story file shows `- [ ] Build verification (pnpm build) - pending` but build actually passes. This is just a documentation update needed.

### Acceptance Criteria Coverage

| AC#      | Description                                  | Status         | Evidence                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-8.3.1 | Recommendations Generated from Latest Scores | ✅ IMPLEMENTED | `src/lib/services/batch-recommendation-service.ts:264-388` - `generateRecommendationsForUser()` uses latest scores, allocation targets, portfolio allocations. Integrates with existing `generateRecommendationItems()` at line 317.                                        |
| AC-8.3.2 | Default Contribution Amount Used             | ✅ IMPLEMENTED | `src/lib/services/batch-recommendation-service.ts:307-308` - Uses `userData.defaultContribution` or defaults to "0" for informational recommendations.                                                                                                                      |
| AC-8.3.3 | Criteria Version Stored for Audit            | ✅ IMPLEMENTED | `src/lib/services/batch-recommendation-service.ts:329-348` - `auditTrail` object includes `criteriaVersionId`, `exchangeRatesSnapshot`, `scoresCorrelationId`, `pricesAsOf`, `ratesAsOf`. Cache service transforms this at `src/lib/cache/recommendation-cache.ts:325-375`. |
| AC-8.3.4 | Allocation Gap Calculations Included         | ✅ IMPLEMENTED | `src/lib/services/batch-recommendation-service.ts:590-680` - `calculateAllocationStatus()` computes current allocation, target range, midpoint, gap, and isOverAllocated flag. Enhanced items at lines 760-802 include `classAllocation` and `isOverAllocatedExplanation`.  |

**Summary: 4 of 4 acceptance criteria fully implemented**

### Task Completion Validation

| Task                                         | Marked As   | Verified As | Evidence                                                                                                                  |
| -------------------------------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Task 1: Create Batch Recommendation Service  | ✅ Complete | ✅ VERIFIED | `src/lib/services/batch-recommendation-service.ts` exists (836 lines), class `BatchRecommendationService` at line 200     |
| Task 2: Implement Allocation Gap Calculation | ✅ Complete | ✅ VERIFIED | `calculateAllocationStatus()` at line 590, gap calculation at line 639                                                    |
| Task 3: Create Recommendation Cache Service  | ✅ Complete | ✅ VERIFIED | `src/lib/cache/recommendation-cache.ts` exists (425 lines), key pattern `recs:${userId}` at line 28, TTL 86400 at line 34 |
| Task 4: Extend Overnight Job                 | ✅ Complete | ✅ VERIFIED | `src/lib/inngest/functions/overnight-scoring.ts` Step 6 "generate-recommendations" at lines 444-559                       |
| Task 5: Store Audit Trail Data               | ✅ Complete | ✅ VERIFIED | `auditTrail` structure at lines 341-347 includes all required fields                                                      |
| Task 6: Unit Tests - Batch Recommendation    | ✅ Complete | ✅ VERIFIED | `tests/unit/services/batch-recommendation.test.ts` - 14 tests passing                                                     |
| Task 7: Unit Tests - Cache Service           | ✅ Complete | ✅ VERIFIED | `tests/unit/cache/recommendation-cache.test.ts` - 22 tests passing                                                        |
| Task 8: Integration Tests                    | ✅ Complete | ✅ VERIFIED | `tests/unit/inngest/recommendation-generation.test.ts` - 8 tests passing                                                  |
| Task 9: Run Verification                     | ✅ Complete | ✅ VERIFIED | TypeScript: ✅, ESLint: ✅, Tests: 44/44 passing, Build: ✅                                                               |

**Summary: 9 of 9 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

**Coverage:**

- BatchRecommendationService: 14 tests covering user processing, error handling, batch aggregation, correlation IDs, metrics
- RecommendationCacheService: 22 tests covering get/set/invalidate/exists/getTTL, error handling, TTL verification, key patterns
- Overnight Job Integration: 8 tests covering step execution order, metrics tracking, error continuation

**Test Quality:**

- All tests use proper mocking patterns
- Tests cover both success and error paths
- AC-specific tests are clearly labeled (e.g., "AC-8.3.1", "AC-8.3.5")
- Tests verify behavior, not just presence

**No gaps identified.**

### Architectural Alignment

**Tech Spec Compliance:**

- ✅ Follows Inngest step function pattern from Story 8.2
- ✅ Uses existing RecommendationEngine (doesn't recreate)
- ✅ Uses existing batch services and job infrastructure
- ✅ decimal.js used for all monetary calculations (lines 26-32)
- ✅ ISO string timestamps for Inngest JSON serialization (lines 336, 346-347)
- ✅ Cache key pattern `recs:${userId}` matches tech spec
- ✅ Cache TTL 24 hours matches tech spec

**Architecture Violations:** None

### Security Notes

- No security concerns identified
- User data properly scoped by userId
- No sensitive data logging
- Proper error handling without exposing internals

### Best-Practices and References

- **Inngest Step Functions:** https://www.inngest.com/docs/functions/multi-step
- **Vercel KV:** https://vercel.com/docs/storage/vercel-kv
- **decimal.js:** https://mikemcl.github.io/decimal.js/

### Action Items

**Code Changes Required:** None

**Advisory Notes:**

- Note: Update Task 9 in story to mark build verification as complete (documentation only)
- Note: Story 8.4 (Cache Warming) will implement actual cache storage - current implementation prepares data structure but doesn't persist to cache yet (by design per tech spec)
