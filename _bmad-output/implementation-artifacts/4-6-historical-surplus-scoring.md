# Story 4.6: Historical Surplus Scoring

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **the scoring system to reward consistent dividend surplus history**,
So that **reliable dividend-paying assets score higher**.

## Acceptance Criteria

### AC-4.6.1: Bonus Points for Consistent Surplus History

- **Given** an asset has 5+ consecutive years of dividend surplus
- **When** the score is calculated
- **Then** the asset receives +5 bonus points for consistency

### AC-4.6.2: Penalty Points for Missing Surplus Data

- **Given** an asset is missing dividend data for any of the last 5 years
- **When** the score is calculated
- **Then** the asset receives -2 points per missing year

### AC-4.6.3: Score Breakdown Display

- **Given** I view an asset's score breakdown
- **When** I look at the surplus scoring
- **Then** I see: years of data available, years with surplus, bonus/penalty applied

### AC-4.6.4: Incomplete Data Notice

- **Given** dividend history data is incomplete
- **When** the score is displayed
- **Then** I see a note: "Based on [N] years of available data"

## Tasks / Subtasks

### CRITICAL NOTE: BUILD ON EXISTING SCORING ENGINE INFRASTRUCTURE

**From Story 4.3/4.4/4.5 - Already Implemented:**

The scoring engine and criteria infrastructure exists from earlier stories:

**Scoring Engine (`src/lib/calculations/scoring-engine.ts`):**

- `calculateScores()` function with criteria-driven algorithm
- `evaluateCriterion()` for individual criterion evaluation
- Decimal.js for all calculations
- Event emission for audit trail
- Support for `CriterionRule` with operators: gt, lt, gte, lte, between, equals, exists

**Database Schema (`src/lib/db/schema.ts`):**

- `CRITERION_METRICS` includes `"surplus_years"` metric
- `CriterionRule` interface with points (-100 to +100)
- `CriterionResult` for breakdown with `skippedReason`

**Services:**

- `criteria-service.ts` - CRUD for criteria sets
- `criteria-comparison-service.ts` - Preview and compare functionality

**What This Story Must Implement:**

1. **AC-4.6.1**: Special handling for "consecutive surplus" bonus (+5 points for 5+ years)
2. **AC-4.6.2**: Penalty calculation for missing years (-2 per missing year)
3. **AC-4.6.3**: Extended breakdown display showing surplus details
4. **AC-4.6.4**: Data completeness indicator in UI

---

### Task 1: Extend Asset Fundamentals Interface (AC: 4.6.1, 4.6.2)

**Context:** Need to define how surplus history data is structured for scoring.

- [x] Subtask 1.1: Define `SurplusHistoryData` interface in `src/lib/validations/score-schemas.ts`
  ```typescript
  interface SurplusHistoryData {
    yearsAvailable: number; // Total years of data (0-10+)
    consecutiveSurplusYears: number; // Years with consecutive surplus (0-5+)
    surplusByYear: Record<number, boolean | null>; // year -> had surplus (null = no data)
    dataSource: string; // "Company IR", "SEC Filing", etc.
    lastUpdated: string; // ISO date
  }
  ```
- [x] Subtask 1.2: Add `surplusHistory` to `AssetWithFundamentals` interface
- [x] Subtask 1.3: Add `surplus_history` as optional fundamental in asset data types

### Task 2: Implement Surplus Scoring Logic (AC: 4.6.1, 4.6.2)

**Context:** Create specialized scoring function for surplus history evaluation.

- [x] Subtask 2.1: Create `src/lib/calculations/surplus-scoring.ts`
- [x] Subtask 2.2: Implement `evaluateSurplusBonus()` function:
  - Check if `consecutiveSurplusYears >= 5`
  - Return +5 bonus points if true
  - Return breakdown details for display
- [x] Subtask 2.3: Implement `evaluateSurplusPenalty()` function:
  - Count missing years in last 5 years
  - Calculate penalty: `missingYears * -2`
  - Return penalty points and breakdown
- [x] Subtask 2.4: Implement `calculateSurplusScore()` combining bonus and penalty:

  ```typescript
  function calculateSurplusScore(history: SurplusHistoryData): SurplusScoreResult {
    const bonus = history.consecutiveSurplusYears >= 5 ? 5 : 0;
    const missingYears = Math.max(0, 5 - history.yearsAvailable);
    const penalty = missingYears * -2;

    return {
      totalPoints: bonus + penalty,
      bonusApplied: bonus,
      penaltyApplied: penalty,
      yearsOfData: history.yearsAvailable,
      consecutiveYears: history.consecutiveSurplusYears,
    };
  }
  ```

- [x] Subtask 2.5: Add unit tests for bonus calculation (tests/unit/calculations/surplus-scoring.test.ts)
- [x] Subtask 2.6: Add unit tests for penalty calculation
- [x] Subtask 2.7: Add unit tests for combined scoring edge cases

### Task 3: Integrate Surplus Scoring with Scoring Engine (AC: 4.6.1, 4.6.2)

**Context:** Enhance the scoring engine to automatically apply surplus scoring.

- [x] Subtask 3.1: Modify `evaluateCriterion()` to handle `surplus_years` metric specially
- [x] Subtask 3.2: Add surplus scoring as automatic criterion when asset has surplus data:
  - Apply bonus/penalty regardless of user-defined criteria
  - OR create a default "Surplus Consistency" criterion that users can enable
- [x] Subtask 3.3: Ensure Decimal.js is used for all calculations
- [x] Subtask 3.4: Add `surplusScoring` field to `CriterionResult` breakdown:
  ```typescript
  interface CriterionResult {
    // ... existing fields
    surplusDetails?: {
      yearsOfData: number;
      consecutiveYears: number;
      bonusApplied: number;
      penaltyApplied: number;
    };
  }
  ```
- [x] Subtask 3.5: Update scoring engine tests to include surplus scenarios

### Task 4: Create Surplus Breakdown Display Component (AC: 4.6.3)

**Context:** Show detailed surplus scoring in asset score breakdown.

- [x] Subtask 4.1: Create `src/components/scores/surplus-score-detail.tsx`
- [x] Subtask 4.2: Implement UI showing:
  - Years of data available (e.g., "5 years of data")
  - Consecutive surplus years (e.g., "4 consecutive years with surplus")
  - Bonus applied (e.g., "+5 pts for consistency" or "No consistency bonus")
  - Penalty applied (e.g., "-4 pts for 2 missing years" or "No penalty")
  - Net impact on score
- [x] Subtask 4.3: Add color coding:
  - Green: Bonus applied (5+ consecutive years)
  - Amber: Partial data (1-4 years)
  - Red: Penalty applied (missing years)
- [x] Subtask 4.4: Add unit tests for component rendering (tests/unit/components/surplus-score-detail.test.tsx)

### Task 5: Add Incomplete Data Notice (AC: 4.6.4)

**Context:** Show data completeness indicator when viewing scores.

- [x] Subtask 5.1: Create `src/components/scores/incomplete-data-notice.tsx` (named for clarity)
- [x] Subtask 5.2: Implement notice showing "Based on [N] years of available data"
- [x] Subtask 5.3: Show notice when `yearsAvailable < 5`
- [x] Subtask 5.4: Add description explaining penalty impact (-2 pts per missing year)
- [x] Subtask 5.5: Style notice with appropriate color (amber for warning, uses Alert component)
- [x] Subtask 5.6: Add unit tests for notice logic (tests/unit/components/scores/incomplete-data-notice.test.ts)

### Task 6: Integrate with Preview/Compare Features (AC: 4.6.3)

**Context:** Ensure surplus scoring appears in preview and compare views.

- [x] Subtask 6.1: Update `preview-assets-table.tsx` to show surplus details in expandable row
- [x] Subtask 6.2: Extended `CriterionScore` in `quick-calc.ts` with surplusDetails field
- [x] Subtask 6.3: Verify surplus scoring appears in criterion breakdown (via SurplusBreakdownItem component)
- [ ] Subtask 6.4: Add E2E test for surplus display in preview modal (deferred - requires real UI integration)

### Task 7: Add Mock Data for Testing (AC: All)

**Context:** Create realistic test data for surplus scoring scenarios.

- [x] Subtask 7.1: Add mock assets with various surplus histories to `src/lib/mocks/fundamentals.ts`
  - Asset with 5+ consecutive years (gets bonus) - seeds divisible by 3
  - Asset with 3 years data (no bonus, -4 penalty) - varied via seed
  - Asset with 0 years data (-10 penalty) - seeds divisible by 5 return undefined
  - Asset with 5 years but non-consecutive (no bonus) - default pattern
- [ ] Subtask 7.2: Add mock data to E2E test fixtures (deferred - will be done during Epic 5 data pipeline)

### Task 8: Verification

- [x] Subtask 8.1: `pnpm exec tsc --noEmit` - Type check ✓ No errors
- [x] Subtask 8.2: `pnpm lint` - No ESLint errors in story 4.6 files (pre-existing lint errors in other files)
- [x] Subtask 8.3: `pnpm test:unit` - All 4548 unit tests pass (167 tests for story 4.6 specifically)
- [ ] Subtask 8.4: `pnpm test:e2e` - Deferred (surplus scoring not yet wired to live UI)
- [x] Subtask 8.5: `pnpm build` - Production build succeeded
- [ ] Subtask 8.6: Manual verification - Deferred until Epic 5 data pipeline integration

## Dev Notes

### Scoring Algorithm Summary

**Bonus Calculation (AC-4.6.1):**

```
IF consecutiveSurplusYears >= 5 THEN
  bonusPoints = +5
ELSE
  bonusPoints = 0
```

**Penalty Calculation (AC-4.6.2):**

```
missingYears = MAX(0, 5 - yearsAvailable)
penaltyPoints = missingYears * -2

Example penalties:
- 5 years data: 0 missing, 0 penalty
- 4 years data: 1 missing, -2 penalty
- 3 years data: 2 missing, -4 penalty
- 0 years data: 5 missing, -10 penalty
```

**Combined Score Impact:**

- Best case: +5 (5+ consecutive years, no missing data)
- Neutral: 0 (5 years data, no consecutive streak)
- Worst case: -10 (no data available)

### Existing Infrastructure to Leverage

**From `src/lib/calculations/scoring-engine.ts`:**

- `evaluateCriterion()` - Add special case for surplus_years metric
- `calculateScores()` - Include surplus scoring in results
- `CriterionResult` interface - Add optional `surplusDetails` field

**From `src/lib/db/schema.ts`:**

- `CRITERION_METRICS` already includes `"surplus_years"`
- Can be used as regular criterion or enhanced with special logic

**From `src/lib/validations/score-schemas.ts`:**

- `AssetWithFundamentals` interface - Extend with surplus history

### Design Decision: Automatic vs. User-Defined

**Recommended Approach:** Make surplus scoring a **special criterion type** that:

1. Users can enable/disable per criteria set
2. When enabled, automatically applies bonus/penalty logic
3. Shows in breakdown alongside other criteria

This preserves user control while enforcing the PRD-specified scoring rules.

### Project Structure Notes

**New Files to Create:**

```
src/
├── lib/
│   └── calculations/
│       └── surplus-scoring.ts           # Surplus bonus/penalty logic
├── components/
│   └── scores/
│       ├── index.ts                     # Barrel export
│       ├── surplus-score-detail.tsx     # Breakdown display
│       └── incomplete-data-notice.tsx   # Incomplete data notice

tests/
├── unit/
│   ├── calculations/
│   │   └── surplus-scoring.test.ts      # Unit tests
│   └── components/
│       └── scores/
│           ├── surplus-score-detail.test.tsx
│           └── incomplete-data-notice.test.ts
└── e2e/
    └── criteria.spec.ts                 # Add surplus scenarios
```

**Files to Modify:**

```
src/
├── lib/
│   ├── calculations/scoring-engine.ts    # Add surplus handling
│   ├── calculations/quick-calc.ts        # Extended CriterionScore with surplusDetails
│   ├── db/schema.ts                      # Extended CriterionResult with surplusDetails
│   └── validations/score-schemas.ts      # Add SurplusHistoryData type
├── components/
│   └── criteria/
│       └── preview-assets-table.tsx      # Show surplus in breakdown
```

### References

- [Source: epics.md#Story-4.6] - Epic requirements and acceptance criteria
- [Source: src/lib/calculations/scoring-engine.ts] - Existing scoring engine
- [Source: src/lib/db/schema.ts#CRITERION_METRICS] - Available metrics (includes surplus_years)
- [Source: 4-5-criteria-preview-and-comparison.md] - Previous story with preview/compare infrastructure
- [Source: project-context.md] - Critical implementation rules

### Previous Story Intelligence

**From Story 4.5 (Criteria Preview and Comparison):**

- Preview modal shows top 10 assets with expandable breakdown
- Compare dialog shows criterion differences between sets
- 300ms debounce on preview updates
- All infrastructure tested and working

**From Story 4.3 (Scoring Criteria Creation):**

- Full CRUD for criteria sets with immutable versioning
- Criteria stored as JSONB array in `criteria_versions` table
- Points range: -100 to +100

**Code Review Patterns to Follow:**

- Use `useNumberFormat()` for displaying points (not `.toFixed()`)
- Use `logger` from `@/lib/telemetry/logger` (not console.log)
- Use `cn()` for conditional class names
- Use standardized API responses from `@/lib/api/responses.ts`

### Git Intelligence

**Recent Epic 4 commits:**

```
4724015 feat(epic-4): implement delete criteria set with confirmation dialog (story 4-4)
a74fa22 fix(epic-4): code review fixes for story 4-3 scoring criteria
6c1726d feat(epic-4): implement duplicate name prevention for asset classes (AC-4.1.10)
```

### Key Patterns to Follow

**Number Formatting (from project-context.md):**

```typescript
// CORRECT
const { formatNumber } = useNumberFormat();
<span>{formatNumber(points)}</span>

// WRONG
<span>{points.toFixed(2)}</span>
```

**Financial Precision (from project-context.md):**

```typescript
// CORRECT
import Decimal from "decimal.js";
const total = new Decimal(bonus).plus(penalty);

// WRONG
const total = bonus + penalty; // Floating point issues
```

**Error Handling (from project-context.md):**

```typescript
// CORRECT
import { logger } from "@/lib/telemetry/logger";
logger.error("Surplus calculation failed", { assetId, error: error.message });

// WRONG
console.error("Failed", error);
```

### Testing Strategy

**Unit Tests Focus:**

- Bonus calculation for various consecutive year counts (0, 3, 5, 7 years)
- Penalty calculation for missing years (0, 1, 3, 5 missing)
- Edge cases: null data, empty history, malformed data
- Component rendering for all display states

**Integration Tests Focus:**

- Scoring engine integration with surplus logic
- API responses including surplus breakdown

**E2E Tests Focus:**

- Preview modal shows surplus details in breakdown
- Compare dialog shows surplus score differences
- Data completeness badge appears for partial data

### Accessibility Requirements

- ARIA labels on surplus breakdown section
- Screen reader text for bonus/penalty indicators
- Color coding with accompanying text (not color-only)
- Keyboard navigation in expandable breakdown

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed `-0` vs `+0` JavaScript equality issue in Decimal.js multiplication (explicit zero check)
- Component testing uses logic extraction pattern (not @testing-library/react)

### Completion Notes List

1. **AC-4.6.1 (Bonus Points)**: Implemented +5 bonus for 5+ consecutive years of dividend surplus. Uses `evaluateSurplusBonus()` in `surplus-scoring.ts`.

2. **AC-4.6.2 (Penalty Points)**: Implemented -2 penalty per missing year (up to -10 for 5 missing). Uses `evaluateSurplusPenalty()` with explicit zero check to avoid `-0` issue.

3. **AC-4.6.3 (Score Breakdown)**: Created `SurplusScoreDetail` component and `SurplusBreakdownItem` in preview-assets-table. Shows years of data, consecutive years, bonus/penalty with color coding.

4. **AC-4.6.4 (Incomplete Data Notice)**: Created `IncompleteDataNotice` component with warning/info variants, compact mode, and clear penalty explanation.

5. **Integration**: Extended `CriterionResult` interface with `surplusDetails` field. Scoring engine automatically applies surplus scoring when asset has surplus history data.

6. **Testing**: 167 tests across 4 test files covering all scoring scenarios, edge cases, and component logic.

### File List

**New Files Created:**

- `src/lib/calculations/surplus-scoring.ts` - Core bonus/penalty calculation logic
- `src/components/scores/index.ts` - Barrel export for scores components
- `src/components/scores/surplus-score-detail.tsx` - Score breakdown display component
- `src/components/scores/incomplete-data-notice.tsx` - Data completeness warning
- `tests/unit/calculations/surplus-scoring.test.ts` - 30 unit tests
- `tests/unit/components/scores/surplus-score-detail.test.tsx` - 41 unit tests
- `tests/unit/components/scores/incomplete-data-notice.test.ts` - 25 unit tests

**Modified Files:**

- `src/lib/validations/score-schemas.ts` - Added SurplusHistoryData and SurplusScoreResult schemas
- `src/lib/db/schema.ts` - Extended CriterionResult with surplusDetails, added SkippedReason type
- `src/lib/calculations/scoring-engine.ts` - Integrated surplus scoring into calculateScores
- `src/lib/calculations/quick-calc.ts` - Extended CriterionScore with surplusDetails, updated to use Decimal.js
- `src/components/criteria/preview-assets-table.tsx` - Added SurplusBreakdownItem for display
- `src/lib/mocks/fundamentals.ts` - Added generateMockSurplusHistory function
- `tests/unit/calculations/scoring-engine.test.ts` - Added surplus integration tests (71 total)
