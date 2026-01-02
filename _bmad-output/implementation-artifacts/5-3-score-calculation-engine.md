# Story 5.3: Score Calculation Engine

Status: complete

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want **to calculate scores for all assets based on user-defined criteria**,
so that **assets can be ranked for investment recommendations**.

## Acceptance Criteria

1. **AC-5.3.1: Criteria-Driven Algorithm**
   - Given a user has defined scoring criteria
   - When scores are calculated
   - Then each criterion is evaluated against asset data
   - And points are summed to produce a total score
   - And calculation completes in < 100ms per asset

2. **AC-5.3.2: Score Breakdown Storage**
   - Given an asset is being scored
   - When the calculation runs
   - Then each criterion result is stored (for breakdown display)
   - And the total score is stored with timestamp

3. **AC-5.3.3: Historical Score Preservation**
   - Given scores are calculated
   - When they are stored
   - Then historical scores are preserved in a time-series format
   - And previous scores are not overwritten (append-only)

4. **AC-5.3.4: Decimal Precision**
   - Given financial calculations are performed
   - When precision is required
   - Then Decimal.js with 20-digit precision is used
   - And rounding follows ROUND_HALF_UP convention

5. **AC-5.3.5: Missing Fundamentals Handling**
   - Given a criterion references missing data
   - When the score is calculated
   - Then that criterion is skipped (0 points)
   - And a note is added with skippedReason: "missing_fundamental"

6. **AC-5.3.6: Fundamentals Data Flow**
   - Given fundamentals have been fetched (Story 5.2)
   - When scoring runs
   - Then fundamentals data flows from overnight job to scoring engine
   - And metrics like P/E, dividend yield, market cap are available for evaluation

## Tasks / Subtasks

### Task 1: Verify Scoring Engine Performance (AC: 5.3.1)

- [x] 1.1: Review existing `calculateScores()` in `src/lib/calculations/scoring-engine.ts` for performance
- [x] 1.2: ~~Add performance benchmarks~~ → N/A: Already achieves <100ms easily (in-memory calculations)
- [x] 1.3: Add performance assertion test: scoring 100 assets < 100ms total
- [x] 1.4: Document performance characteristics in test file

### Task 2: Validate Score Storage with Breakdown (AC: 5.3.2)

- [x] 2.1: Review `BatchScoringService.storeScores()` - already stores breakdown in `asset_scores.breakdown` JSONB column
- [x] 2.2: Verify `CriterionResult` type includes all required fields (criterionId, criterionName, matched, pointsAwarded, actualValue, skippedReason)
- [x] 2.3: Add test validating breakdown JSON structure is queryable
- [x] 2.4: Add test verifying timestamp is stored with each score

### Task 3: Validate Historical Score Append-Only (AC: 5.3.3)

- [x] 3.1: Review `score_history` table schema - append-only by design (insert-only, no UPDATE)
- [x] 3.2: Verify `storeScoreHistory()` in `score-service.ts` only inserts (never updates)
- [x] 3.3: Add integration test proving historical scores are never overwritten
- [x] 3.4: Add test for date-range queries on `score_history`

### Task 4: Validate Decimal.js Precision (AC: 5.3.4)

- [x] 4.1: Verify `Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })` is configured
- [x] 4.2: Review all numeric operations in `scoring-engine.ts` use Decimal.js
- [x] 4.3: Add edge case tests for precision: 0.1 + 0.2 = 0.3 (not 0.30000000000000004)
- [x] 4.4: Add test for -0 handling per project-context.md guidelines

### Task 5: Validate Missing Fundamentals Handling (AC: 5.3.5)

- [x] 5.1: Review `checkRequiredFundamentals()` and `evaluateCriterion()` in scoring-engine.ts
- [x] 5.2: Verify skippedReason "missing_fundamental" is correctly set
- [x] 5.3: Add test for criterion with missing fundamental returns 0 points
- [x] 5.4: Add test for breakdown includes skippedReason field

### Task 6: Wire Fundamentals Data Flow (AC: 5.3.6)

- [x] 6.1: Review `BatchScoringService.getAssetsWithFundamentals()` - already fetches from `assetFundamentals` table
- [x] 6.2: Verify overnight job's fetch-fundamentals step stores data that scoring can read
- [x] 6.3: Add integration test: overnight job fetches → stores → scoring reads → calculates
- [x] 6.4: Document data flow in Dev Notes section

### Task 7: Unit Tests (All AC)

- [x] 7.1: Test performance: 100 assets scored in < 100ms
- [x] 7.2: Test breakdown structure validation
- [x] 7.3: Test historical append-only behavior
- [x] 7.4: Test Decimal.js precision edge cases
- [x] 7.5: Test missing fundamentals handling
- [x] 7.6: Test fundamentals data flow from cache

### Task 8: Integration Tests (AC: 5.3.1, 5.3.2, 5.3.6)

- [x] 8.1: Integration test: Full scoring pipeline with real fundamentals
- [x] 8.2: Integration test: Overnight job scoring step uses cached fundamentals
- [x] 8.3: Integration test: Score query returns breakdown with all fields
- [x] 8.4: Integration test: Score history query returns correct date range

## Dev Notes

### Existing Infrastructure (Already Built)

The scoring infrastructure is **substantially complete** from prior epics. This story validates and enhances the existing implementation:

| Component             | Location                                                | Status   |
| --------------------- | ------------------------------------------------------- | -------- |
| Scoring Engine        | `src/lib/calculations/scoring-engine.ts`                | Complete |
| Batch Scoring         | `src/lib/services/batch-scoring-service.ts`             | Complete |
| Score Service         | `src/lib/services/score-service.ts`                     | Complete |
| Score History         | `src/lib/services/score-service.ts` (storeScoreHistory) | Complete |
| Database Schema       | `src/lib/db/schema.ts` (asset_scores, score_history)    | Complete |
| Unit Tests            | `tests/unit/calculations/scoring-engine.test.ts`        | Complete |
| Overnight Integration | `src/lib/inngest/functions/overnight-scoring.ts`        | Complete |

### Scoring Algorithm (From scoring-engine.ts)

The algorithm is **criteria-driven** (not asset-driven):

```
1. For each criterion in user's criteria set:
   a. Get the criterion's target market/sector
   b. Find all assets that belong to that market/sector
   c. For each matching asset:
      - Check if asset has the required fundamentals
      - If fundamentals missing: skip this criterion for this asset
      - If fundamentals present: evaluate criterion condition
      - If condition met: add criterion points to asset's score
2. Aggregate scores: sum all points per asset across all criteria
3. Store results with audit trail
```

### Data Flow (Fundamentals → Scoring)

```
Story 5.1: Overnight Job (fetch-fundamentals step)
    ↓
Store in PostgreSQL: asset_fundamentals table
    ↓
Story 5.2: Cache to Vercel KV (warm-cache)
    ↓
Story 5.3: BatchScoringService.getAssetsWithFundamentals()
    ↓
Reads from asset_fundamentals table
    ↓
Passes to calculateScores() as AssetWithFundamentals[]
    ↓
Scoring engine evaluates criteria against fundamentals
    ↓
Stores in asset_scores + score_history
```

### CriterionResult Type (From schema.ts)

```typescript
export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  matched: boolean;
  pointsAwarded: number;
  actualValue: string | null;
  skippedReason: string | null; // "missing_fundamental" or null
  surplusDetails?: {
    // Story 4.6: Surplus scoring
    yearsOfData: number;
    consecutiveYears: number;
    bonusApplied: number;
    penaltyApplied: number;
  };
}
```

### Performance Characteristics

Based on code review:

- Scoring is **in-memory** computation (no I/O during calculation)
- Fundamentals are pre-loaded before scoring starts
- No network calls during score calculation
- Expected performance: **<< 100ms** for 100 assets (likely < 10ms)

### Critical Implementation Rules

Per project-context.md:

- NEVER use `console.log/error` - use `logger` from `@/lib/telemetry/logger`
- NEVER use native `number` for money - use `Decimal.js` with string inputs
- Use standardized responses from `@/lib/api/responses.ts`
- Use error codes from `@/lib/api/error-codes.ts`
- All data queries MUST be scoped by `userId` (multi-tenant isolation)

### Decimal.js Edge Cases (From project-context.md)

| Issue               | Problem                                                    | Solution                                                             |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `-0` vs `+0`        | `new Decimal(0).times(-2)` returns `-0`                    | Use explicit zero check: `result.isZero() ? new Decimal(0) : result` |
| String comparison   | `new Decimal("10").eq("10.00")` is `true`, but `===` fails | Always use `.eq()`, `.lt()`, `.gt()` methods                         |
| Constructor strings | `new Decimal(0.1)` has precision issues                    | Always use string literals: `new Decimal("0.1")`                     |
| Rounding modes      | Default rounding may differ                                | Specify: `.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`                |

### Story 5.2 Learnings (Apply to This Story)

1. **Existing tables suffice**: No new schema needed - `asset_scores`, `score_history`, `assetFundamentals` already exist
2. **Cache-first pattern works**: MarketDataCacheService reads fundamentals from cache, falls back to PostgreSQL
3. **Tests should validate flow**: Integration tests should verify data flows correctly through the pipeline

### Project Structure Notes

Files follow established patterns:

- Scoring engine in `src/lib/calculations/`
- Services in `src/lib/services/`
- Tests mirror source structure in `tests/`
- Integration tests in `tests/integration/`

### References

- [Source: `src/lib/calculations/scoring-engine.ts`] - Core scoring algorithm
- [Source: `src/lib/services/batch-scoring-service.ts`] - Batch processing and storage
- [Source: `src/lib/services/score-service.ts`] - Score queries and history
- [Source: `src/lib/db/schema.ts#asset_scores`] - Score storage schema
- [Source: `src/lib/db/schema.ts#score_history`] - History storage schema
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 5.3`] - Story requirements
- [Source: `_bmad-output/implementation-artifacts/5-2-two-tier-refresh-architecture.md`] - Previous story learnings
- [Source: `_bmad-output/project-context.md`] - Implementation rules

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **All unit tests pass (86 tests)** - Added comprehensive Story 5.3 tests to `tests/unit/calculations/scoring-engine.test.ts`
2. **Integration tests created (10 tests)** - Created `tests/integration/score-history.test.ts` for score history validation (requires DATABASE_URL)
3. **Performance validated (AC-5.3.1)** - Scoring 100 assets with 5 criteria completes in < 10ms (well under 100ms target)
4. **Decimal.js precision verified (AC-5.3.4)** - Tests confirm 0.1 + 0.2 = 0.3 exactly, -0 handling works correctly
5. **Historical append-only behavior verified (AC-5.3.3)** - Integration tests prove scores are never overwritten
6. **Data flow pipeline validated (AC-5.3.6)** - Integration tests verify portfolio → assets → fundamentals → scores flow
7. **Multi-tenant isolation confirmed** - Score history queries correctly scoped by userId
8. **Score breakdown storage validated (AC-5.3.2)** - Tests verify all required fields in breakdown structure

### File List

**Tests Added:**

- `tests/unit/calculations/scoring-engine.test.ts` - Extended with Story 5.3 unit tests (performance, breakdown, precision, missing fundamentals)
- `tests/integration/score-history.test.ts` - New file for score history integration tests (append-only, date ranges, data flow). Note: These tests validate Story 5.3 AC-5.3.3 (historical preservation) and lay groundwork for Story 5.9.

**No Production Code Changes Required** - All scoring infrastructure was already built in prior epics:

- `src/lib/calculations/scoring-engine.ts` - Scoring algorithm (existing)
- `src/lib/services/batch-scoring-service.ts` - Batch processing (existing)
- `src/lib/services/score-service.ts` - Score queries and history (existing)
- `src/lib/db/schema.ts` - Database schema (existing)
