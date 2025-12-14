# Story 7.6: Zero Buy Signal for Over-Allocated

**Status:** done
**Epic:** Epic 7 - Recommendations
**Previous Story:** 7.5 Display Recommendations (Focus Mode) (Status: done)

---

## Story

**As a** system
**I want** to show zero buy signal for over-allocated assets
**So that** rebalancing happens naturally through contributions (without forced selling)

---

## Acceptance Criteria

### AC-7.6.1: Over-Allocated Asset Shows $0 with Label

- **Given** an asset class is above target range
- **When** recommendations display
- **Then** that class shows "$0" with "(over-allocated)" label
- **And** the amount is clearly displayed as $0.00 in base currency
- **And** the over-allocated label is visually distinct

### AC-7.6.2: Over-Allocated Card Visual Treatment

- **Given** an over-allocated asset is displayed
- **When** rendering the RecommendationCard
- **Then** card is visually distinct with grayed out styling
- **And** the styling clearly indicates this asset should not receive investment
- **And** the card remains visible in the recommendation list (not hidden)

### AC-7.6.3: Click Shows Explanation

- **Given** an over-allocated asset card is displayed
- **When** user clicks on the card
- **Then** explanation shows current vs target allocation
- **And** message includes "Consider rebalancing through contributions"
- **And** shows specific values: "Current: X%, Target: Y-Z%"
- **And** explains why no investment is recommended

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 7 Tech Spec:

- Builds on existing RecommendationCard component from Story 7.5
- Uses existing `isOverAllocated` boolean field from RecommendationItem type
- Over-allocated assets have `recommendedAmount = "0"` from recommendation engine
- Visual treatment follows UX design patterns with muted/grayed styling
- Click interaction can use Sheet component for explanation panel

[Source: docs/architecture.md#Architecture-Philosophy]
[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Story-7.6]

### Tech Spec Reference

Per Epic 7 Tech Spec (AC7.6.1-7.6.3):

- AC7.6.1: Asset class above target shows $0 with "(over-allocated)" label
- AC7.6.2: Over-allocated card has visually distinct grayed out styling
- AC7.6.3: Click reveals current vs target with rebalancing suggestion

[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Story-7.6-Zero-Buy-Signal-for-Over-Allocated]
[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Acceptance-Criteria-Authoritative]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **RecommendationCard** - `src/components/recommendations/recommendation-card.tsx`
   - Already receives `recommendationItem: RecommendationItem` with `isOverAllocated: boolean`
   - Extend to add conditional styling for over-allocated state
   - Extend click handler to show explanation

2. **RecommendationItem Type** - `src/lib/types/recommendations.ts`
   - Already has `isOverAllocated: boolean` field
   - Already has `recommendedAmount: string` (will be "0" for over-allocated)
   - Already has `currentAllocation` and `targetAllocation` for explanation

3. **AllocationGauge** - `src/components/recommendations/allocation-gauge.tsx`
   - Already shows current vs target range
   - Can be reused in explanation panel

4. **useRecommendations Hook** - `src/hooks/use-recommendations.ts`
   - Already fetches recommendations with over-allocated items
   - No changes needed

5. **Currency Formatting** - `src/lib/utils/currency-format.ts`
   - `formatCurrency()` for displaying $0.00

6. **Sheet Component** - shadcn/ui Sheet
   - Use for over-allocated explanation panel on click

[Source: docs/sprint-artifacts/7-5-display-recommendations-focus-mode.md#Dev-Agent-Record]
[Source: docs/sprint-artifacts/7-5-display-recommendations-focus-mode.md#File-List]

### Data Model Reference

```typescript
// Existing RecommendationItem type (lib/types/recommendations.ts)
export interface RecommendationItem {
  id: string;
  assetId: string;
  ticker: string;
  assetName?: string;
  score: string;
  currentAllocation: string; // e.g., "55.0" for 55%
  targetAllocation: string; // e.g., "45.0" for target midpoint
  allocationGap: string; // Negative for over-allocated
  recommendedAmount: string; // "0" for over-allocated
  isOverAllocated: boolean; // true when above target range
  breakdown: RecommendationBreakdown;
}

// Breakdown includes over-allocation reason
export interface RecommendationBreakdown {
  allocationGapPoints: number;
  scoreContribution: number;
  minimumAllocationApplied: boolean;
  overAllocationReason?: string; // e.g., "Asset class above 50% target maximum"
  calculationNotes: string[];
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Type-Definitions]

### New Components to Create

1. **OverAllocatedExplanation** - `src/components/recommendations/over-allocated-explanation.tsx`
   - Props: `item: RecommendationItem, open: boolean, onOpenChange: (open: boolean) => void`
   - Displays current allocation vs target range
   - Explains why $0 is recommended
   - Shows rebalancing guidance message
   - Uses Sheet component for slide-over panel

2. **Update RecommendationCard** - `src/components/recommendations/recommendation-card.tsx`
   - Add conditional over-allocated styling (opacity, grayscale, muted colors)
   - Show "(over-allocated)" label next to $0 amount
   - Handle click to open OverAllocatedExplanation

[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Component-Integration]

### UI/UX Requirements

Per UX Design Specification:

- Over-allocated cards use muted styling (opacity-50 or grayscale)
- Badge or label clearly shows "(over-allocated)" status
- Explanation panel provides helpful guidance, not alarming messaging
- Philosophy: "Consider rebalancing through contributions" - gentle suggestion
- No sell recommendations - contribution-only rebalancing approach

[Source: docs/ux-design-specification.md#Empty-States-and-Edge-Cases]
[Source: docs/epics.md#Story-7.6]

---

## Tasks

### Task 1: Create OverAllocatedExplanation Component (AC: 7.6.3)

**Files:** `src/components/recommendations/over-allocated-explanation.tsx`

- [x] Create component using shadcn/ui Sheet
- [x] Accept props: `item: RecommendationItem, open: boolean, onOpenChange: (open: boolean) => void`
- [x] Display asset ticker and name prominently
- [x] Show current allocation percentage vs target range
- [x] Display message: "Consider rebalancing through contributions"
- [x] Include AllocationGauge showing over-allocated status
- [x] Add close button and backdrop click to dismiss

### Task 2: Update RecommendationCard for Over-Allocated Styling (AC: 7.6.1, 7.6.2)

**Files:** `src/components/recommendations/recommendation-card.tsx`

- [x] Add conditional CSS classes for `isOverAllocated` state
- [x] Apply grayed out styling: `opacity-50` or `grayscale` or muted background
- [x] Display "(over-allocated)" label next to $0 amount
- [x] Ensure $0.00 is properly formatted with currency
- [x] Maintain card visibility in list (not hidden)

### Task 3: Add Click Handler for Explanation Panel (AC: 7.6.3)

**Files:** `src/components/recommendations/recommendation-card.tsx`

- [x] Add state for controlling OverAllocatedExplanation open/close
- [x] Update onClick handler to open explanation for over-allocated items
- [x] Integrate OverAllocatedExplanation component
- [x] Ensure non-over-allocated cards retain original click behavior (placeholder for Story 7.7)

### Task 4: Update Component Barrel Export

**Files:** `src/components/recommendations/index.ts`

- [x] Export OverAllocatedExplanation component

### Task 5: Write Unit Tests - OverAllocatedExplanation (AC: 7.6.3)

**Files:** `tests/unit/components/over-allocated-explanation.test.ts`

- [x] Test component props interface
- [x] Test explanation text generation with sample data
- [x] Test allocation display formatting
- [x] Test guidance message content

### Task 6: Write Unit Tests - RecommendationCard Over-Allocated (AC: 7.6.1, 7.6.2)

**Files:** `tests/unit/components/recommendation-card.test.ts` (extend existing)

- [x] Test over-allocated styling is applied when `isOverAllocated: true`
- [x] Test "(over-allocated)" label is present for over-allocated items
- [x] Test $0.00 amount formatting
- [x] Test click behavior opens explanation for over-allocated items

### Task 7: Run Verification

- [x] TypeScript compilation successful (`npx tsc --noEmit`)
- [x] ESLint passes with no new errors
- [x] All unit tests pass (2420 passed)
- [x] Build verification (`pnpm build`)

---

## Dependencies

- **Story 7.5:** Display Recommendations (Focus Mode) (Complete) - provides RecommendationCard and display infrastructure
- **Story 7.4:** Generate Investment Recommendations (Complete) - provides `isOverAllocated` field in recommendation data
- **Story 4.3:** Set Allocation Ranges for Classes (Complete) - provides target allocation ranges

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **No Sell Recommendations:** System only recommends contributions, not selling
- **Contribution-Only Rebalancing:** Over-allocated assets naturally rebalance as user contributes to under-allocated assets
- **Transparency:** Clear explanation of why $0 is recommended
- **UX Philosophy:** Helpful guidance, not alarming warnings

[Source: docs/architecture.md#Key-Decisions]
[Source: docs/epics.md#Story-7.6]

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for component interfaces and utility functions
- Test over-allocated styling conditions
- Test explanation text generation
- Follow existing pattern: interface/utility testing (no @testing-library/react)
- All tests must pass before marking complete

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Learnings from Previous Story

**From Story 7-5-display-recommendations-focus-mode (Status: done)**

- **RecommendationCard Created**: Already at `src/components/recommendations/recommendation-card.tsx` - extend for over-allocated styling
- **AllocationGauge Available**: At `src/components/recommendations/allocation-gauge.tsx` - reuse in explanation panel
- **Testing Pattern**: Interface/utility testing only (no @testing-library/react)
- **TypeScript exactOptionalPropertyTypes**: Add `| undefined` to optional props
- **ScoreBadge Reuse**: From `src/components/fintech/score-badge.tsx`
- **Currency Formatting**: Via `src/lib/utils/currency-format.ts`
- **Sheet Component**: Available from shadcn/ui for slide-over panels
- **API Response Pattern**: Follows project standard patterns

**What to Build On:**

- Extend RecommendationCard with conditional over-allocated styling
- Create OverAllocatedExplanation using Sheet component
- Reuse AllocationGauge in explanation panel
- Follow established testing patterns

[Source: docs/sprint-artifacts/7-5-display-recommendations-focus-mode.md#Dev-Agent-Record]
[Source: docs/sprint-artifacts/7-5-display-recommendations-focus-mode.md#Completion-Notes-List]

### Project Structure Notes

Following unified project structure:

- **Components:** `src/components/recommendations/` (extend existing)
- **Tests:** `tests/unit/components/` (extend existing and add new)

[Source: docs/architecture.md#Project-Structure]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-7.md#Story-7.6-Zero-Buy-Signal-for-Over-Allocated]
- [Source: docs/sprint-artifacts/tech-spec-epic-7.md#Acceptance-Criteria-Authoritative]
- [Source: docs/epics.md#Story-7.6]
- [Source: docs/architecture.md#Key-Decisions]
- [Source: docs/ux-design-specification.md#Empty-States-and-Edge-Cases]
- [Source: docs/sprint-artifacts/7-5-display-recommendations-focus-mode.md#Dev-Agent-Record]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/7-6-zero-buy-signal-for-over-allocated.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **OverAllocatedExplanation Component Created:** New Sheet-based component at `src/components/recommendations/over-allocated-explanation.tsx` with:
   - Current allocation vs target range display
   - Rebalancing guidance message following contribution-only philosophy
   - AllocationGauge integration
   - Exportable utility functions: `calculateTargetRange()`, `generateGuidanceMessage()`

2. **RecommendationCard Enhanced (Story 7.6):**
   - Added internal state for explanation sheet open/close
   - Click handler routes over-allocated items to explanation panel
   - Non-over-allocated items preserve onClick prop behavior for Story 7.7
   - Added "(over-allocated)" label under amount display
   - Added "Tap for details" hint for over-allocated cards
   - Uses `data-over-allocated` attribute for testing

3. **Testing Pattern:** 63 new tests covering:
   - OverAllocatedExplanation props interface and utility functions
   - RecommendationCard click behavior differentiation
   - Rebalancing philosophy validation (no sell suggestions)
   - Target range calculations with edge cases

4. **Philosophy Adherence:** Message explicitly states "without needing to sell" - aligns with contribution-only rebalancing approach

### File List

**New Files:**

- `src/components/recommendations/over-allocated-explanation.tsx` - Explanation panel component
- `tests/unit/components/over-allocated-explanation.test.ts` - Unit tests (32 tests)

**Modified Files:**

- `src/components/recommendations/recommendation-card.tsx` - Added state, click handler, explanation integration
- `src/components/recommendations/index.ts` - Added exports for new component
- `tests/unit/components/recommendation-card.test.ts` - Extended with Story 7.6 tests (31 new tests)

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-14 | Story drafted from tech-spec-epic-7.md and epics.md | SM Agent (create-story workflow) |
| 2025-12-14 | Story implemented and verified                      | Dev Agent (dev-story workflow)   |
