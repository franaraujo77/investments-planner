# Story 5.9: Store Historical Scores

**Status:** done
**Epic:** Epic 5 - Scoring Engine
**Previous Story:** 5.8 Score Calculation Engine (Status: done)

---

## Story

**As a** system
**I want to** store historical scores for all assets
**So that** users can analyze score trends over time and understand how asset scores have changed

---

## Acceptance Criteria

### AC-5.9.1: Score History Retention

- **Given** scores are calculated
- **When** overnight processing completes
- **Then** scores are stored with timestamp in score_history table
- **And** historical scores are preserved (never overwritten)
- **And** retention policy: 2 years of daily scores

### AC-5.9.2: Point-in-Time Score Query

- **Given** historical scores exist for an asset
- **When** user queries score for asset X on date Y
- **Then** the exact score from that date is returned
- **And** if no score exists for that date, null is returned (not nearest)
- **And** query scoped by user_id for multi-tenant isolation

### AC-5.9.3: Trend Query Support

- **Given** historical scores exist for an asset
- **When** user queries score history for last 30/60/90 days
- **Then** array of (date, score) pairs returned in chronological order
- **And** supports calculating trend: "Score increased 20% over 6 months"
- **And** performance target: < 300ms for 90-day query

### AC-5.9.4: History Append-Only

- **Given** a new score is calculated for an asset
- **When** the score is stored
- **Then** it is appended to history (not updated)
- **And** previous entries remain unchanged
- **And** audit trail integrity is maintained

### AC-5.9.5: Database Indexing for Performance

- **Given** score_history table has millions of rows
- **When** queries are executed
- **Then** index on (userId, assetId, calculatedAt) ensures < 300ms response
- **And** queries use index efficiently (no full table scans)

---

## Technical Notes

### Building on Story 5.8 Infrastructure

This story extends the scoring engine from Story 5.8:

```typescript
// From Story 5.8 - scoring-engine.ts
// After scores are computed, they should be stored in history
// This story adds the history persistence layer
```

[Source: docs/sprint-artifacts/5-8-score-calculation-engine.md]

### Score History Schema

Per tech-spec, implement the score_history table:

```typescript
// lib/db/schema.ts (add to existing schema)
export const scoreHistory = pgTable(
  "score_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    assetId: uuid("asset_id").notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    score: numeric("score", { precision: 7, scale: 4 }).notNull(),
    criteriaVersionId: uuid("criteria_version_id").notNull(),
    calculatedAt: timestamp("calculated_at").notNull(),
  },
  (table) => ({
    // Index for efficient trend queries
    userAssetDateIdx: index("score_history_user_asset_date_idx").on(
      table.userId,
      table.assetId,
      table.calculatedAt
    ),
  })
);
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Score-History-Schema]

### History Query Service

Extend score-service.ts to support history queries:

```typescript
// src/lib/services/score-service.ts (extend)
export interface ScoreHistoryQuery {
  userId: string;
  assetId: string;
  startDate?: Date;
  endDate?: Date;
  days?: 30 | 60 | 90;
}

export interface ScoreHistoryEntry {
  score: string;
  calculatedAt: Date;
  criteriaVersionId: string;
}

export interface TrendAnalysis {
  startScore: string;
  endScore: string;
  changePercent: string;
  direction: "up" | "down" | "stable";
  dataPoints: number;
}
```

### API Endpoints

Per tech-spec:

```typescript
// GET /api/scores/:assetId/history
// Query params: ?days=90 (default) or ?startDate=&endDate=
// Response:
{
  data: {
    history: ScoreHistoryEntry[];
    trend?: TrendAnalysis;
  }
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Score-Endpoints]

### Integration with Scoring Engine

Modify the scoring engine to store history after each calculation:

```typescript
// In calculateScores() after storing to asset_scores:
// Also append to score_history for trend analysis
await this.storeScoreHistory(scores, config.userId);
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Workflows-and-Sequencing]

### Performance Requirements

Per tech-spec:

| Metric              | Target  | Implementation                             |
| ------------------- | ------- | ------------------------------------------ |
| History trend query | < 300ms | Indexed by (userId, assetId, calculatedAt) |
| Retention           | 2 years | Cron job for archival (future)             |
| Storage efficiency  | -       | Only store daily scores, not intra-day     |

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Performance]

---

## Tasks

### Task 1: Add Score History Table to Schema (AC: 5.9.1, 5.9.5)

**Files:** `src/lib/db/schema.ts`, migration files

- [x] Add scoreHistory table definition with all columns
- [x] Add composite index on (userId, assetId, calculatedAt)
- [x] Generate database migration
- [x] Apply migration to development database
- [x] Verify table and index creation

### Task 2: Extend Score Service with History Methods (AC: 5.9.2, 5.9.3, 5.9.4)

**Files:** `src/lib/services/score-service.ts`

- [x] Add storeScoreHistory() method for appending entries
- [x] Add getScoreHistory() method with date range support
- [x] Add getScoreAtDate() method for point-in-time queries
- [x] Add calculateTrend() method for trend analysis
- [x] Use decimal.js for trend percentage calculations
- [x] Ensure all queries include userId filter

### Task 3: Create History API Endpoint (AC: 5.9.2, 5.9.3)

**Files:** `src/app/api/scores/[assetId]/history/route.ts`

- [x] Create GET endpoint with query params (days, startDate, endDate)
- [x] Validate request with Zod schema
- [x] Call score service to fetch history
- [x] Include trend analysis in response (optional param)
- [x] Enforce user authorization
- [x] Return empty array (not 404) when no history

### Task 4: Integrate History Storage with Scoring Engine (AC: 5.9.1, 5.9.4)

**Files:** `src/lib/services/score-service.ts` (in calculateAndPersistScores)

- [x] After computing scores, call storeScoreHistory()
- [x] Handle errors gracefully (don't fail main calculation)
- [x] Log history storage events

### Task 5: Create Zod Schemas for History Operations (AC: 5.9.2, 5.9.3)

**Files:** `src/lib/validations/score-schemas.ts`

- [x] Create historyQuerySchema for request validation
- [x] Create scoreHistoryEntrySchema for response typing
- [x] Create trendAnalysisSchema for trend response
- [x] Export TypeScript types from schemas

### Task 6: Create Unit Tests for History Service (AC: All)

**Files:** `tests/unit/services/score-history.test.ts`

- [x] Test calculateTrend() computes percentage correctly (17 tests)
- [x] Test edge cases (zero scores, negative scores, precision)
- [x] Test empty history handling

### Task 7: Create Integration Tests for History API (AC: 5.9.2, 5.9.3)

**Files:** `tests/unit/api/scores-history.test.ts`

- [x] Test GET /api/scores/:assetId/history with days param
- [x] Test GET /api/scores/:assetId/history with date range
- [x] Test 401 for unauthenticated request
- [x] Test empty array when no history exists
- [x] Test trend analysis included when requested

### Task 8: Run Verification

- [x] TypeScript compilation successful
- [x] ESLint passes with no new errors
- [x] `pnpm build` - successful
- [x] `pnpm test` - all 1329 tests pass (30 skipped DB integration tests)
- [x] Database migration applies cleanly

---

## Dependencies

- **Story 5.8:** Score Calculation Engine (Complete) - provides scoring infrastructure
- **Story 1.2:** Database Schema (Complete) - provides base schema patterns
- **Story 1.4:** Event-Sourced Calculation Pipeline (Complete) - provides event store for audit

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Decimal Precision:** Use decimal.js for trend percentage calculations
- **User Isolation:** All queries MUST include user_id filter
- **Append-Only:** History entries are immutable, never updated
- **Indexing:** Composite index required for < 300ms query performance

[Source: docs/architecture.md#Data-Type-Rules]

### Algorithm for Trend Analysis

```typescript
// Trend calculation
const startScore = new Decimal(history[0].score);
const endScore = new Decimal(history[history.length - 1].score);
const changePercent = endScore.minus(startScore).dividedBy(startScore).times(100).toFixed(2);
const direction = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "stable";
```

### Retention Policy (Future Implementation)

Per epics.md, retention is "2 years of daily scores, then archived". For this story:

- Implement storage and querying
- Archival/cleanup job deferred to Epic 8 (Overnight Processing)

### Project Structure Notes

Following unified project structure from previous stories:

- **Schema:** `src/lib/db/schema.ts`
- **Services:** `src/lib/services/score-service.ts`
- **API:** `src/app/api/scores/[assetId]/history/route.ts`
- **Validations:** `src/lib/validations/score-schemas.ts`
- **Tests:** `tests/unit/services/`, `tests/unit/api/`

[Source: docs/architecture.md#Project-Structure]

### Learnings from Previous Story

**From Story 5.8 - Score Calculation Engine (Status: done)**

- **New Files Created:**
  - `src/lib/calculations/scoring-engine.ts` - Core scoring engine (INTEGRATE with history)
  - `src/lib/services/score-service.ts` - Score query service (EXTEND for history)
  - `src/app/api/scores/[assetId]/route.ts` - Asset score endpoint (ADD sibling history route)

- **Technical Decisions:**
  - Functional exports instead of class for services
  - Event-sourced calculations with 4 events
  - decimal.js for all calculations

- **Integration Points:**
  - ScoringEngine.calculateScores() should call history storage after computation
  - Use same userId authorization pattern

- **Test Patterns:**
  - API tests with mock event store
  - Decimal precision tests
  - User isolation tests

[Source: docs/sprint-artifacts/5-8-score-calculation-engine.md#Dev-Agent-Record]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.9]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Score-History-Schema]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Acceptance-Criteria]
- [Source: docs/epics.md#Story-5.9-Store-Historical-Scores]
- [Source: docs/architecture.md#Data-Type-Rules]
- [Source: docs/architecture.md#Project-Structure]
- [Source: docs/sprint-artifacts/5-8-score-calculation-engine.md]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/5-9-store-historical-scores.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None required - implementation completed without issues.

### Completion Notes List

1. **Schema Implementation:** Added `scoreHistory` table with composite index on (userId, assetId, calculatedAt) for efficient trend queries per AC-5.9.5.

2. **Service Layer:** Extended `score-service.ts` with:
   - `storeScoreHistory()` - Append-only storage per AC-5.9.4
   - `getScoreHistory()` - Date range queries per AC-5.9.3
   - `getScoreAtDate()` - Point-in-time queries per AC-5.9.2
   - `calculateTrend()` - Trend analysis with decimal.js precision per AC-5.9.3

3. **API Endpoint:** Created `GET /api/scores/[assetId]/history` with:
   - Support for `days` param (30/60/90, default 90)
   - Support for `startDate`/`endDate` custom range
   - Optional `includeTrend` param for trend analysis
   - Empty array response (not 404) when no history

4. **Integration:** Modified `calculateAndPersistScores()` to automatically store history after score calculation. Error handling ensures main scoring doesn't fail if history storage fails.

5. **Test Coverage:** Added 33 new tests covering:
   - Trend calculation with edge cases (zero scores, negative scores, precision)
   - API endpoint validation, authentication, and response format
   - History ordering and trend analysis inclusion

### File List

**New Files:**

- `src/app/api/scores/[assetId]/history/route.ts` - History API endpoint
- `tests/unit/services/score-history.test.ts` - Unit tests for history service
- `tests/unit/api/scores-history.test.ts` - API endpoint tests
- `drizzle/0006_clever_young_avengers.sql` - Migration for score_history table

**Modified Files:**

- `src/lib/db/schema.ts` - Added scoreHistory table and relations
- `src/lib/services/score-service.ts` - Added history methods and integration
- `src/lib/validations/score-schemas.ts` - Added history schemas

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-10 | Story drafted from tech-spec-epic-5.md and epics.md | SM Agent (create-story workflow) |
