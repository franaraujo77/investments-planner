# Story 6.3: Recommendation Display

Status: ready-for-dev

## Story

As a **user**,
I want **to see my recommendations as simple actionable items**,
so that **I know exactly what to buy without complexity**.

## Acceptance Criteria

1. **AC-6.3.1: Actionable Item Display**
   - Given recommendations are generated
   - When I view the recommendations page
   - Then I see a list of actionable items: "Invest $X in [Asset]"
   - And items are ordered by priority (highest amount first)

2. **AC-6.3.2: Pie Chart Visualization**
   - Given I am viewing recommendations
   - When I look at the visualization
   - Then I see a pie chart showing recommended allocation distribution
   - And colors match my asset class colors

3. **AC-6.3.3: Multi-Asset Summary**
   - Given I have multiple recommendations
   - When I view the summary
   - Then I see total: "Invest $X across N assets"
   - And I can see the before/expected after allocation

4. **AC-6.3.4: Card Hover Tooltip**
   - Given I hover over a recommendation card
   - When the tooltip appears
   - Then I see: current allocation %, target range, expected after %

5. **AC-6.3.5: Mobile Responsive**
   - Given I am on mobile
   - When I view recommendations
   - Then the display is optimized for smaller screens
   - And I can still see and confirm each recommendation

## Tasks / Subtasks

### Task 1: Validate Existing Infrastructure (AC: 6.3.1, 6.3.3)

- [ ] 1.1: Verify `RecommendationList` in `src/components/recommendations/recommendation-list.tsx` displays actionable items
- [ ] 1.2: Verify `RecommendationCard` in `src/components/recommendations/recommendation-card.tsx` shows "Invest $X in [Asset]"
- [ ] 1.3: Verify `RecommendationSummary` in `src/components/recommendations/recommendation-summary.tsx` shows total count and amount
- [ ] 1.4: Verify items are sorted by `recommendedAmount` descending in `useRecommendations` hook
- [ ] 1.5: Document existing implementation status in Dev Notes

### Task 2: Validate Pie Chart Integration (AC: 6.3.2)

- [ ] 2.1: Assess if pie chart is currently integrated with recommendation display
- [ ] 2.2: If missing: Create `RecommendationPieChart` component using existing `AllocationPieChart` pattern
- [ ] 2.3: Wire pie chart to transform recommendation items into chart data format
- [ ] 2.4: Ensure colors match asset class colors from strategy configuration
- [ ] 2.5: Add responsive sizing for mobile display

### Task 3: Implement Before/After Allocation Preview (AC: 6.3.3)

- [ ] 3.1: Extend `useRecommendations` hook to calculate expected allocation after investment
- [ ] 3.2: Create `BeforeAfterPreview` component showing current vs expected allocation
- [ ] 3.3: Integrate preview into recommendations page layout
- [ ] 3.4: Use `AllocationPieChart` for visual before/after comparison

### Task 4: Implement Card Hover Tooltip (AC: 6.3.4)

- [ ] 4.1: Add tooltip trigger to `RecommendationCard` component
- [ ] 4.2: Create tooltip content showing: current %, target range, expected after %
- [ ] 4.3: Calculate expected after % from current + recommended amount
- [ ] 4.4: Style tooltip per UX patterns (shadcn/ui Tooltip component)

### Task 5: Mobile Responsive Validation (AC: 6.3.5)

- [ ] 5.1: Verify grid responsive breakpoints in `RecommendationList` (1 col mobile, 2 md, 3 lg)
- [ ] 5.2: Test touch targets meet 44x44px minimum
- [ ] 5.3: Verify pie chart responsiveness on mobile viewport
- [ ] 5.4: Test horizontal scrolling behavior for summary components

### Task 6: Integration with Dashboard (All AC)

- [ ] 6.1: Verify recommendations display section is integrated into dashboard page
- [ ] 6.2: Ensure proper loading states with skeletons
- [ ] 6.3: Ensure proper error states with retry functionality
- [ ] 6.4: Verify empty state (`BalancedPortfolioState`) displays correctly

### Task 7: Unit Tests (All AC)

- [ ] 7.1: Verify existing tests in `tests/unit/hooks/use-recommendations.test.ts`
- [ ] 7.2: Verify existing tests in `tests/unit/components/recommendation-card.test.ts`
- [ ] 7.3: Add tests for pie chart data transformation if new component created
- [ ] 7.4: Add tests for before/after allocation calculation
- [ ] 7.5: Add tests for tooltip content generation

### Task 8: E2E Tests (All AC)

- [ ] 8.1: Add E2E test for viewing recommendations list on dashboard
- [ ] 8.2: Add E2E test for pie chart visibility
- [ ] 8.3: Add E2E test for mobile responsive behavior
- [ ] 8.4: Add E2E test for hover tooltip interaction
- [ ] 8.5: Add E2E test for summary display with count and total

## Dev Notes

### Existing Infrastructure (SUBSTANTIALLY IMPLEMENTED)

This story's core functionality is **already implemented** under previous story numbers (7.x series). The focus is validation, gap filling, and ensuring full AC coverage:

| Component                | Location                                                        | Status              |
| ------------------------ | --------------------------------------------------------------- | ------------------- |
| RecommendationList       | `src/components/recommendations/recommendation-list.tsx`        | Complete            |
| RecommendationCard       | `src/components/recommendations/recommendation-card.tsx`        | Complete            |
| RecommendationSummary    | `src/components/recommendations/recommendation-summary.tsx`     | Complete            |
| BalancedPortfolioState   | `src/components/recommendations/balanced-portfolio-state.tsx`   | Complete            |
| AllocationGauge          | `src/components/recommendations/allocation-gauge.tsx`           | Complete            |
| OverAllocatedExplanation | `src/components/recommendations/over-allocated-explanation.tsx` | Complete            |
| useRecommendations Hook  | `src/hooks/use-recommendations.ts`                              | Complete            |
| AllocationPieChart       | `src/components/portfolio/allocation-pie-chart.tsx`             | Complete (reusable) |
| Unit Tests               | `tests/unit/components/recommendation-card.test.ts`             | Complete            |
| Unit Tests               | `tests/unit/hooks/use-recommendations.test.ts`                  | Complete            |

### What Likely Needs Implementation

Based on AC analysis vs existing infrastructure:

1. **AC-6.3.2: Pie Chart Integration** - `AllocationPieChart` exists but may not be wired into recommendation display
2. **AC-6.3.3: Before/After Preview** - May need new component to show allocation comparison
3. **AC-6.3.4: Card Hover Tooltip** - Current `RecommendationCard` opens explanation sheet for over-allocated items but may lack general tooltip

### Existing useRecommendations Hook Features

```typescript
interface UseRecommendationsReturn {
  data: RecommendationData | null; // AC-6.3.1
  isLoading: boolean; // Loading states
  error: string | null; // Error handling
  isEmpty: boolean; // AC-6.3.1 (empty state)
  refetch: () => Promise<void>; // Manual refresh
  itemCount: number; // AC-6.3.3
  isStale: boolean; // Staleness detection
}
```

### Existing RecommendationCard Features

From `src/components/recommendations/recommendation-card.tsx`:

- **Ticker Symbol** - Prominently displayed
- **Score Badge** - Color-coded (green 80+, amber 50-79, red <50)
- **Recommended Amount** - Formatted in base currency ("Invest $X")
- **AllocationGauge** - Shows current vs target allocation visually
- **Over-allocated Badge** - "Over-allocated" label with amber styling
- **Click Handler** - Opens explanation sheet for over-allocated items
- **ARIA Support** - Full keyboard navigation and screen reader support

### Existing RecommendationSummary Features

```typescript
// Displays: "N assets totaling $X"
<RecommendationSummary
  count={5}
  total="1500.00"
  baseCurrency="USD"
/>
```

### Pie Chart Data Transformation

To integrate `AllocationPieChart` with recommendations, transform data:

```typescript
// From recommendation items:
const chartData: ClassAllocation[] = recommendations.items.map((item, index) => ({
  classId: item.assetId,
  className: item.symbol,
  value: item.recommendedAmount,
  percentage: calculatePercentage(item.recommendedAmount, total),
  assetCount: 1,
  targetMin: null,
  targetMax: null,
  status: item.isOverAllocated ? "over" : "healthy",
  color: CHART_COLORS[index % CHART_COLORS.length],
}));
```

### Before/After Preview Implementation

```typescript
// Calculate expected allocation after investment
const calculateExpectedAllocation = (
  currentAllocation: string,
  recommendedAmount: string,
  totalInvestable: string,
  currentPortfolioValue: string
): string => {
  const current = new Decimal(currentAllocation);
  const recommended = new Decimal(recommendedAmount);
  const total = new Decimal(totalInvestable);
  const portfolioValue = new Decimal(currentPortfolioValue);

  // New portfolio value = current + total investable
  const newPortfolioValue = portfolioValue.plus(total);

  // Current asset value = portfolio * current%
  const currentValue = portfolioValue.times(current.dividedBy(100));

  // New value = current value + recommended amount
  const newValue = currentValue.plus(recommended);

  // New allocation = new value / new portfolio value * 100
  return newValue.dividedBy(newPortfolioValue).times(100).toFixed(2);
};
```

### Critical Implementation Rules

From `project-context.md`:

- **Decimal.js MANDATORY** - All financial calculations use `new Decimal("value")`
- **Handle -0 edge case** - Use `result.isZero() ? new Decimal(0) : result`
- **Structured logging** - Use `logger` from `@/lib/telemetry/logger`, never console
- **useNumberFormat()** - Use for all number display, never `toFixed()` or `toLocaleString()`
- **Standardized responses** - Use `successResponse/errorResponse` from `@/lib/api/responses.ts`

### Mobile Responsive Grid

Existing implementation in `RecommendationList`:

```typescript
<div className={cn(
  "grid gap-4",
  "grid-cols-1 md:grid-cols-2 lg:grid-cols-3", // AC-6.3.5
  className
)}>
```

### Tooltip Implementation Pattern

Use shadcn/ui Tooltip component:

```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div>{/* card content */}</div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Current: {currentAllocation}%</p>
      <p>Target: {targetMin}% - {targetMax}%</p>
      <p>Expected: {expectedAllocation}%</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Previous Story Context (Stories 6.1, 6.2)

**Story 6.1 (Monthly Contribution Input):**

- Contribution and dividends input validated
- `useContribution` hook handles all input state
- Total investable = contribution + dividends
- Settings API persists default contribution

**Story 6.2 (Recommendation Generation):**

- Core algorithm: `priority = allocation_gap × (score / 100)`
- Capital distributed to highest-priority assets first
- Over-allocated assets receive $0 (zero-buy signal)
- Database persistence with 24h cache TTL
- Event sourcing for audit trail

### Epic 5 Learnings

1. **Provider abstraction** - Clean interfaces make swapping components trivial
2. **Verification stories** - Validate existing code before building new features
3. **Test coverage reality** - Behavioral tests vs documentation-only tests matter

### File Structure Notes

Test files follow established patterns:

- Unit tests: `tests/unit/components/recommendation-*.test.ts`
- Unit tests: `tests/unit/hooks/use-recommendations.test.ts`
- E2E tests: `tests/e2e/recommendations.spec.ts` (to be created)

### Component Integration Checklist (Epic 3 Retrospective)

If creating NEW components (pie chart wrapper, before/after preview, tooltip):

- [ ] Import into target page/feature
- [ ] Verify component renders in UI (visual check)
- [ ] Add E2E test confirming component visibility
- [ ] Update barrel exports if applicable

### References

- [Source: `src/components/recommendations/recommendation-list.tsx`] - Main list component
- [Source: `src/components/recommendations/recommendation-card.tsx`] - Individual card
- [Source: `src/components/recommendations/recommendation-summary.tsx`] - Summary display
- [Source: `src/hooks/use-recommendations.ts`] - Data fetching hook
- [Source: `src/components/portfolio/allocation-pie-chart.tsx`] - Reusable pie chart
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 6.3`] - Story requirements
- [Source: `_bmad-output/project-context.md`] - Implementation rules
- [Source: `_bmad-output/implementation-artifacts/6-2-recommendation-generation.md`] - Previous story

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
