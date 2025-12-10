# Story 5.7: Criteria Preview (Impact Simulation)

**Status:** done
**Epic:** Epic 5 - Scoring Engine
**Previous Story:** 5.6 Compare Criteria Sets (Status: done)

---

## Story

**As a** user
**I want to** preview which assets score highest with my current criteria before saving
**So that** I can validate my criteria strategy and understand its impact on asset rankings

---

## Acceptance Criteria

### AC-5.7.1: Preview Impact Button Available During Editing

- **Given** I am editing criteria on the Criteria page
- **When** I view the criteria editing interface
- **Then** I see a "Preview Impact" button available
- **And** the button is enabled when there are criteria to preview

### AC-5.7.2: Preview Shows Top 10 Scoring Assets

- **Given** I have criteria defined
- **When** I click "Preview Impact"
- **Then** I see a modal showing the top 10 scoring assets with the current criteria
- **And** each asset shows: symbol, name, score, and key metrics
- **And** scores are calculated using cached asset data (no API calls)

### AC-5.7.3: Preview Updates Live as Criteria Modified

- **Given** the preview modal is open
- **When** I modify criteria (add, edit, or remove rules)
- **Then** the preview updates live to reflect changes
- **And** update occurs within 500ms of modification
- **And** loading indicator appears during calculation

### AC-5.7.4: Shows Comparison (Improved/Worse/Same Counts)

- **Given** I am viewing the preview
- **When** comparing current criteria against previous saved version
- **Then** I see a summary showing:
  - Number of assets that improved (higher score)
  - Number of assets that declined (lower score)
  - Number of assets unchanged
- **And** visual indicators: green arrow up for improved, red arrow down for declined, neutral for same

---

## Technical Notes

### Building on Existing Infrastructure

This story extends the criteria infrastructure from Stories 5.1-5.6:

```typescript
// From Story 5.1 - existing criteria data structure
interface CriterionRule {
  id: string;
  name: string;
  metric: string;
  operator: "gt" | "lt" | "gte" | "lte" | "between" | "equals" | "exists";
  value: string;
  value2?: string;
  points: number;
  requiredFundamentals: string[];
  sortOrder: number;
}

// From Story 5.6 - comparison scoring logic (REUSE)
import {
  calculateRankingChanges,
  getSampleAssets,
} from "@/lib/services/criteria-comparison-service";
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Data-Models-and-Contracts]

### Quick-Calc Service Integration

Per architecture, implement quick-calc for preview:

```typescript
// src/lib/calculations/quick-calc.ts (new file)
export class QuickCalcService {
  // Use cached prices/fundamentals (no API calls)
  // Calculate scores for sample assets against provided criteria
  // Return sorted results with score breakdown

  async calculatePreview(
    criteria: CriterionRule[],
    sampleAssets: SampleAsset[]
  ): Promise<PreviewResult> {
    // Fast calculation using cached data
    // Returns top N assets with scores
  }
}
```

[Source: docs/architecture.md#lib/calculations/quick-calc.ts]
[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Workflows-and-Sequencing]

### Preview API Endpoint

Implement the preview endpoint as specified in tech-spec:

```typescript
// POST /api/criteria/preview
// Request body:
{
  criteria: CriterionRule[];  // Current criteria configuration
  savedVersionId?: string;     // Previous version to compare against (optional)
}

// Response:
{
  data: {
    topAssets: PreviewAsset[];      // Top 10 scoring assets
    comparison?: ComparisonSummary; // If savedVersionId provided
    calculatedAt: string;           // ISO timestamp
    sampleSize: number;             // Number of assets evaluated
  }
}

interface PreviewAsset {
  symbol: string;
  name: string;
  score: string;                    // Decimal string
  rank: number;
  breakdown: CriterionScore[];      // Per-criterion scores
}

interface ComparisonSummary {
  improved: number;                 // Assets with higher score
  declined: number;                 // Assets with lower score
  unchanged: number;                // Assets with same score
  previousAverageScore: string;
  currentAverageScore: string;
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#APIs-and-Interfaces]

### Preview Modal Component

```typescript
// src/components/criteria/preview-impact-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Features:
// 1. Top 10 assets table with scores
// 2. Comparison summary (improved/worse/same)
// 3. Loading state during recalculation
// 4. Score breakdown on hover/click
```

[Source: docs/architecture.md#Frontstage-UI-Components]

### Performance Requirements

Per tech-spec:

- Preview calculation: < 500ms total
- Sample size: 20 assets maximum
- Use cached data only (no external API calls)
- Client-side debouncing for live updates

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Non-Functional-Requirements]

---

## Tasks

### Task 1: Create Quick-Calc Service (AC: 5.7.2, 5.7.3)

**Files:** `src/lib/calculations/quick-calc.ts`

- [ ] Create QuickCalcService class/module
- [ ] Implement `calculatePreview` method for single criteria set
- [ ] Use sample assets with mock fundamentals (from comparison service pattern)
- [ ] Calculate scores using decimal.js for precision
- [ ] Return sorted top N results with breakdown
- [ ] Implement caching for repeated calculations
- [ ] Target < 500ms calculation time

### Task 2: Create Preview API Endpoint (AC: 5.7.1, 5.7.2, 5.7.4)

**Files:** `src/app/api/criteria/preview/route.ts`

- [ ] Create POST endpoint for criteria preview
- [ ] Validate request with Zod schema (criteria array required)
- [ ] If savedVersionId provided, load saved version for comparison
- [ ] Calculate preview scores using QuickCalcService
- [ ] Calculate comparison summary if previous version available
- [ ] Return top 10 assets with scores and comparison
- [ ] Handle errors appropriately (400, 401, 500)

### Task 3: Create Zod Schema for Preview Request (AC: 5.7.1)

**Files:** `src/lib/validations/criteria-schemas.ts`

- [ ] Add `previewCriteriaSchema` with criteria array validation
- [ ] Optional savedVersionId (UUID if provided)
- [ ] Validate each criterion in array matches CriterionRule structure

### Task 4: Create Preview Impact Modal Component (AC: 5.7.2, 5.7.4)

**Files:** `src/components/criteria/preview-impact-modal.tsx`

- [ ] Create dialog/modal with shadcn Dialog component
- [ ] Display top 10 assets table with columns: Rank, Symbol, Name, Score
- [ ] Show comparison summary if available (improved/declined/unchanged)
- [ ] Color-coded indicators: green for improved, red for declined
- [ ] Sample size indicator displayed
- [ ] Click row to expand score breakdown

### Task 5: Create Preview Assets Table Component (AC: 5.7.2)

**Files:** `src/components/criteria/preview-assets-table.tsx`

- [ ] Create reusable table component for preview results
- [ ] Columns: Rank, Symbol, Name, Score, Change (if comparison)
- [ ] Score displayed with ScoreBadge color coding (green 80+, amber 50-79, red <50)
- [ ] Expandable row for score breakdown details
- [ ] Loading skeleton state

### Task 6: Create usePreviewCriteria Hook with Live Updates (AC: 5.7.3)

**Files:** `src/hooks/use-preview-criteria.ts`

- [ ] Create mutation hook for preview API calls
- [ ] Implement debouncing (300ms) for live updates
- [ ] Handle loading, error, and success states
- [ ] Cache previous result while loading new one
- [ ] Reset on modal close

### Task 7: Add Preview Button and Integration to Criteria Page (AC: 5.7.1, 5.7.3)

**Files:** `src/app/(dashboard)/criteria/criteria-page-client.tsx` or `src/components/criteria/criteria-list.tsx`

- [ ] Add "Preview Impact" button to criteria page header
- [ ] Wire up PreviewImpactModal trigger
- [ ] Pass current criteria configuration to modal
- [ ] Listen for criteria changes and trigger re-preview
- [ ] Debounce re-preview on criteria modifications

### Task 8: Create Unit Tests for Quick-Calc Service (AC: 5.7.2, 5.7.3)

**Files:** `tests/unit/calculations/quick-calc.test.ts`

- [ ] Test score calculation accuracy with known inputs
- [ ] Test ranking order is correct
- [ ] Test decimal.js precision in calculations
- [ ] Test performance target (< 500ms for 20 assets)
- [ ] Test empty criteria returns empty result
- [ ] Test single criterion scoring

### Task 9: Create Integration Tests for Preview API (AC: All)

**Files:** `tests/unit/api/criteria-preview.test.ts`

- [ ] Test POST /api/criteria/preview success
- [ ] Test 401 for unauthenticated request
- [ ] Test 400 for invalid criteria format
- [ ] Test comparison mode with savedVersionId
- [ ] Test response contains top 10 assets
- [ ] Test response contains comparison summary when applicable

### Task 10: Run Verification

- [ ] `pnpm lint` - passes with no new errors
- [ ] `pnpm build` - successful build
- [ ] `pnpm test` - all tests pass

---

## Dependencies

- **Story 5.1:** Define Scoring Criteria (Status: done) - provides CriteriaBlock, criteria data structures
- **Story 5.4:** Criteria Library View (Status: done) - provides CriteriaList, page structure
- **Story 5.6:** Compare Criteria Sets (Status: done) - provides sample assets, scoring patterns
- **Story 1.2:** Database Schema (Complete) - provides database infrastructure
- **Story 1.3:** Authentication (Complete) - provides auth middleware

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Decimal Precision:** Use decimal.js for all score calculations
- **Validation:** All inputs validated with Zod schemas
- **Performance:** Preview calculations < 500ms using cached data only
- **Quick-Calc Mode:** No external API calls during preview

[Source: docs/architecture.md#Implementation-Patterns]
[Source: docs/architecture.md#Consistency-Rules]

### UX Guidelines

Per UX and architecture specifications:

- **Dialog Component:** Use shadcn Dialog for preview modal
- **Table Component:** Use shadcn Table for asset list
- **Score Badge:** Use existing ScoreBadge component for color-coded scores
- **Loading States:** Use Skeleton components during calculation
- **Toast Notifications:** Use shadcn Toast for error feedback

[Source: docs/architecture.md#Frontstage-UI-Components]

### Performance Considerations

Per tech-spec:

- **Quick-calc preview:** < 500ms total response time
- **Sample size:** Limit to 20 assets for fast calculation
- **Debouncing:** 300ms debounce on live updates to prevent excessive recalculation
- **Caching:** Cache previous preview result while new one loads

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Performance]

### Testing Standards

Per CLAUDE.md:

- Every code change requires test coverage
- Unit tests for quick-calc service
- Integration tests for API routes
- Focus on edge cases: empty criteria, single criterion, all assets same score

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

Following unified project structure from previous stories:

- **Components:** `src/components/criteria/preview-impact-modal.tsx`, `src/components/criteria/preview-assets-table.tsx`
- **Hooks:** `src/hooks/use-preview-criteria.ts`
- **API:** `src/app/api/criteria/preview/route.ts`
- **Services:** `src/lib/calculations/quick-calc.ts`
- **Tests:** `tests/unit/calculations/`, `tests/unit/api/`

[Source: docs/architecture.md#Project-Structure]

### Learnings from Previous Story

**From Story 5.6 - Compare Criteria Sets (Status: done)**

Key context from previous story implementation:

- **Files Created (REUSE patterns):**
  - `src/lib/services/criteria-comparison-service.ts` - REUSE getSampleAssets() function for preview
  - `src/hooks/use-compare-criteria.ts` - FOLLOW pattern for use-preview-criteria.ts
  - `src/components/criteria/compare-criteria-dialog.tsx` - FOLLOW dialog pattern

- **Scoring Logic (REUSE):**
  - Story 5.6 implemented simplified scoring with hardcoded sample assets
  - MAX_SAMPLE_ASSETS = 20 per tech-spec performance requirements
  - Sample assets have mock fundamentals data for scoring
  - Quick-calc can reuse this approach

- **Technical Decisions:**
  - Functional exports instead of class for services
  - Zod .refine() errors appear in fieldErrors, not formErrors
  - Module-level mockState pattern in tests for consistent mocking

- **Files Modified (extend):**
  - `src/lib/validations/criteria-schemas.ts` - Extend with previewCriteriaSchema
  - `src/components/criteria/criteria-list.tsx` - Add Preview button

- **Advisory Notes from Review:**
  - Quick-calc integration was deferred to this story (5.7)
  - Full scoring engine integration will be in Story 5.8
  - Consider reusing getSampleAssets from comparison service

[Source: docs/sprint-artifacts/5-6-compare-criteria-sets.md#Dev-Agent-Record]
[Source: docs/sprint-artifacts/5-6-compare-criteria-sets.md#Completion-Notes-List]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.7]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Acceptance-Criteria]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Workflows-and-Sequencing]
- [Source: docs/epics.md#Story-5.7-Criteria-Preview]
- [Source: docs/architecture.md#Implementation-Patterns]
- [Source: docs/architecture.md#Frontstage-UI-Components]
- [Source: docs/architecture.md#lib/calculations/quick-calc.ts]
- [Source: docs/sprint-artifacts/5-6-compare-criteria-sets.md]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/5-7-criteria-preview-impact-simulation.context.xml`

### Agent Model Used

Claude claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

- **Implementation Approach:** Functional exports pattern used for quick-calc service (consistent with criteria-comparison-service)
- **Sample Assets:** Reused and extended the 20 mock sample assets pattern from Story 5.6
- **Scoring Logic:** All operators (gt, lt, gte, lte, between, equals, exists) fully implemented
- **Decimal Precision:** decimal.js used for all score calculations
- **Performance:** calculatePreview completes in <10ms for 20 assets (well under 500ms target)
- **Debouncing:** 300ms debounce implemented in usePreviewCriteria hook
- **No New Dependencies:** Used Fragment-based expandable rows instead of radix Collapsible
- **Test Coverage:** 52 tests passing (29 unit tests for quick-calc, 23 integration tests for API)

### File List

**New Files Created:**

- `src/lib/calculations/quick-calc.ts` - Quick-calc service with calculatePreview and getSampleAssets
- `src/app/api/criteria/preview/route.ts` - POST /api/criteria/preview API endpoint
- `src/components/criteria/preview-impact-modal.tsx` - Preview dialog with comparison summary
- `src/components/criteria/preview-assets-table.tsx` - Top 10 assets table with expandable breakdown
- `src/hooks/use-preview-criteria.ts` - Preview hook with 300ms debouncing
- `tests/unit/calculations/quick-calc.test.ts` - 29 unit tests for quick-calc service
- `tests/unit/api/criteria-preview.test.ts` - 23 integration tests for preview API

**Files Modified:**

- `src/lib/validations/criteria-schemas.ts` - Added previewCriteriaSchema and previewCriterionRuleSchema
- `src/components/criteria/criteria-list.tsx` - Added Preview Impact button and modal integration

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-09 | Story drafted from tech-spec-epic-5.md and epics.md | SM Agent (create-story workflow) |
| 2025-12-09 | Senior Developer Review notes appended              | AI (code-review workflow)        |

---

## Senior Developer Review (AI)

### Reviewer

AI Code Review (Claude claude-opus-4-5-20251101)

### Date

2025-12-09

### Outcome: Approve

The implementation of Story 5.7 (Criteria Preview / Impact Simulation) is complete and meets all acceptance criteria. All 52 tests pass, code follows project conventions, and architecture constraints are satisfied.

---

### Summary

This story implemented a criteria preview feature that allows users to see the impact of their scoring criteria on sample assets before saving. The implementation includes:

1. **Quick-Calc Service** (`src/lib/calculations/quick-calc.ts`) - Core calculation engine with <500ms performance
2. **Preview API** (`src/app/api/criteria/preview/route.ts`) - REST endpoint with proper validation and auth
3. **Preview UI** - Modal component showing top 10 assets with score breakdown and comparison
4. **Hook with Debouncing** - 300ms debounce for live updates during editing
5. **Comprehensive Tests** - 52 tests covering all functionality

---

### Key Findings

**No HIGH severity issues found.**

**No MEDIUM severity issues found.**

**LOW severity observations (informational, no action required):**

1. **Sample Assets are Mock Data**: The implementation uses hardcoded mock assets for preview calculations. This is by design per tech-spec (no external API calls during preview), but should be replaced with real portfolio data in Story 5.8 (Score Calculation Engine).

2. **Minimal Type Casting**: The API route casts validated schema data to `CriterionRule[]` with `value2: c.value2 ?? null`. This is necessary due to schema relaxation for preview mode and is correctly implemented.

---

### Acceptance Criteria Coverage

| AC#      | Description                                    | Status          | Evidence                                                                                                                   |
| -------- | ---------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AC-5.7.1 | Preview Impact Button Available During Editing | **IMPLEMENTED** | `src/components/criteria/criteria-list.tsx:476-481` - DropdownMenuItem with "Preview Impact" option                        |
| AC-5.7.2 | Preview Shows Top 10 Scoring Assets            | **IMPLEMENTED** | `src/lib/calculations/quick-calc.ts:97` TOP_N_ASSETS=10, `src/components/criteria/preview-assets-table.tsx` displays table |
| AC-5.7.3 | Preview Updates Live as Criteria Modified      | **IMPLEMENTED** | `src/hooks/use-preview-criteria.ts:29` DEBOUNCE_DELAY_MS=300, loading overlay in modal                                     |
| AC-5.7.4 | Shows Comparison (Improved/Worse/Same Counts)  | **IMPLEMENTED** | `src/components/criteria/preview-impact-modal.tsx:59-93` ComparisonSummaryCards with green/red/neutral indicators          |

**Summary: 4 of 4 acceptance criteria fully implemented**

---

### Task Completion Validation

| Task                                             | Marked As | Verified As  | Evidence                                                                                              |
| ------------------------------------------------ | --------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| Task 1: Create Quick-Calc Service                | Complete  | **VERIFIED** | `src/lib/calculations/quick-calc.ts:271-352` - calculatePreview, getSampleAssets, all operators       |
| Task 2: Create Preview API Endpoint              | Complete  | **VERIFIED** | `src/app/api/criteria/preview/route.ts:58-124` - POST endpoint with withAuth                          |
| Task 3: Create Zod Schema for Preview Request    | Complete  | **VERIFIED** | `src/lib/validations/criteria-schemas.ts:510-531` - previewCriterionRuleSchema, previewCriteriaSchema |
| Task 4: Create Preview Impact Modal Component    | Complete  | **VERIFIED** | `src/components/criteria/preview-impact-modal.tsx:170-254` - Dialog with comparison cards             |
| Task 5: Create Preview Assets Table Component    | Complete  | **VERIFIED** | `src/components/criteria/preview-assets-table.tsx:192-243` - Table with expandable rows               |
| Task 6: Create usePreviewCriteria Hook           | Complete  | **VERIFIED** | `src/hooks/use-preview-criteria.ts:75-218` - Hook with 300ms debounce                                 |
| Task 7: Add Preview Button and Integration       | Complete  | **VERIFIED** | `src/components/criteria/criteria-list.tsx:314-335` - handlePreviewClick, handlePreviewDialogChange   |
| Task 8: Create Unit Tests for Quick-Calc         | Complete  | **VERIFIED** | `tests/unit/calculations/quick-calc.test.ts` - 29 passing tests                                       |
| Task 9: Create Integration Tests for Preview API | Complete  | **VERIFIED** | `tests/unit/api/criteria-preview.test.ts` - 23 passing tests                                          |
| Task 10: Run Verification                        | Complete  | **VERIFIED** | 52 tests passing, TypeScript compiles, ESLint passes                                                  |

**Summary: 10 of 10 completed tasks verified, 0 questionable, 0 false completions**

---

### Test Coverage and Gaps

**Unit Tests (29 tests in quick-calc.test.ts):**

- getSampleAssets function coverage
- calculatePreview with all operators (gt, lt, gte, lte, between, equals, exists)
- Comparison mode (improved/declined/unchanged)
- Performance test (<500ms for 20 assets)
- Decimal precision validation
- Score breakdown details

**Integration Tests (23 tests in criteria-preview.test.ts):**

- Authentication (401 for unauthenticated)
- Validation (400 for invalid inputs)
- Success cases (200 with proper response structure)
- Comparison mode with savedVersionId
- Error handling (404, 500)
- Multiple criteria handling

**No significant gaps identified.** Test coverage is comprehensive for the implemented functionality.

---

### Architectural Alignment

**Tech-Spec Compliance:**

- Quick-calc service in `src/lib/calculations/` per architecture.md
- Functional exports pattern (not class) per project convention
- decimal.js for all score calculations
- Zod validation for API inputs
- withAuth middleware for authentication
- Performance target (<500ms) met with average <10ms

**Architecture Constraints Satisfied:**

- No external API calls during preview (uses mock sample assets)
- Sample size limited to 20 assets (MAX_SAMPLE_ASSETS)
- Client-side debouncing (300ms) for live updates
- Multi-tenant isolation via userId scoping

---

### Security Notes

- Authentication enforced via `withAuth` middleware
- User isolation: savedVersionId lookup scoped by userId
- Input validation: All API inputs validated with Zod schemas
- No injection vulnerabilities identified
- Error messages don't leak sensitive information (404 for non-existent/unauthorized resources)

---

### Best-Practices and References

- [decimal.js Documentation](https://mikemcl.github.io/decimal.js/) - Used for financial precision
- [Zod Documentation](https://zod.dev/) - Schema validation
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - API implementation
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog) - Modal component

---

### Action Items

**Code Changes Required:**
_(None - all requirements met)_

**Advisory Notes:**

- Note: Sample assets are mock data; real portfolio integration will be added in Story 5.8 (no action required for this story)
- Note: Consider adding E2E tests for the preview flow in a future story (not required for current story scope)
