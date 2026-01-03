# Story 6.6: Before/After Comparison

Status: done

## Story

As a **user**,
I want **to see how my portfolio changed after investing**,
so that **I can verify my progress toward target allocation**.

## Acceptance Criteria

### AC-6.6.1: Side-by-Side Before/After Comparison

**Given** I have just confirmed investments
**When** the confirmation screen shows
**Then** I see a side-by-side before/after comparison

### AC-6.6.2: Allocation Comparison Details

**Given** I view the before/after comparison
**When** I look at the allocations
**Then** I see for each asset class: before %, after %, change
**And** changes are color-coded (green = closer to target, red = further)

### AC-6.6.3: Portfolio Summary Display

**Given** I view the comparison
**When** I look at the portfolio summary
**Then** I see: total value before, amount invested, total value after
**And** overall portfolio health score change

### AC-6.6.4: Immediate Percentage Update

**Given** I want to see updated percentages
**When** I navigate to portfolio view
**Then** allocations immediately reflect the confirmed investments
**And** no page refresh is required

### AC-6.6.5: Dual Pie Chart Comparison

**Given** the comparison is displayed
**When** I view the pie charts
**Then** I see before and after pie charts side by side
**And** I can visually see the allocation shift

## Tasks / Subtasks

### Task 1: Enhance AllocationComparisonView with Pie Charts (AC: 6.6.5)

The `AllocationComparisonView` component exists and displays tabular before/after data. Add dual pie chart visualization.

- [x] 1.1: Import `AllocationPieChart` from `@/components/charts/AllocationPieChart`
- [x] 1.2: Add `showPieCharts?: boolean` prop (default: true) to `AllocationComparisonViewProps`
- [x] 1.3: Create `BeforeAfterPieSection` sub-component rendering two pie charts side by side
- [x] 1.4: Transform `before`/`after` records to pie chart data format: `Array<{ name: string; value: number; color?: string }>`
- [x] 1.5: Add responsive grid layout: side-by-side on desktop, stacked on mobile
- [x] 1.6: Add "Before" and "After" labels above each chart
- [x] 1.7: Update unit tests for new pie chart props
- [x] 1.8: Add test coverage for pie chart data transformation

### Task 2: Add Portfolio Summary Section (AC: 6.6.3)

Add summary metrics to the comparison view showing total value changes and health score.

- [x] 2.1: Extend `AllocationComparisonViewProps` with `portfolioSummary?: PortfolioSummaryData`
- [x] 2.2: Define `PortfolioSummaryData` type with: `valueBefore`, `valueAfter`, `amountInvested`, `healthScoreBefore`, `healthScoreAfter`
- [x] 2.3: Create `PortfolioSummarySection` sub-component rendering:
  - Total Value Before (formatted with `useNumberFormat`)
  - Amount Invested (highlighted)
  - Total Value After
  - Health Score change (with +/- indicator)
- [x] 2.4: Add horizontal divider between summary and allocation table
- [x] 2.5: Add unit tests for summary display

### Task 3: Wire Summary Data in ConfirmationModal (AC: 6.6.3)

Pass portfolio summary data from confirmation result to `AllocationComparisonView`.

- [x] 3.1: Update `ConfirmInvestmentsResult` type in `recommendations.ts` to include:
  - `portfolioValueBefore: string`
  - `portfolioValueAfter: string`
  - `healthScoreBefore?: string`
  - `healthScoreAfter?: string`
- [x] 3.2: Update `confirmInvestments` service to calculate and return these values
- [x] 3.3: Update `useConfirmInvestments` hook to expose `portfolioSummary` data
- [x] 3.4: Pass `portfolioSummary` prop to `AllocationComparisonView` in `ConfirmationModal`
- [x] 3.5: Add unit tests for service returning summary data

### Task 4: Implement Real-Time Portfolio Update (AC: 6.6.4)

Ensure portfolio view reflects confirmed investments without page refresh.

- [x] 4.1: Verify `confirmInvestments` API invalidates cache keys (`user:{userId}:portfolio`, `user:{userId}:recommendations`)
- [x] 4.2: Add `revalidatePath("/portfolio")` call in confirm API route
- [x] 4.3: Implement `router.refresh()` after successful confirmation
- [x] 4.4: Verify holdings data updates immediately when navigating to portfolio
- [x] 4.5: Add E2E test: confirm investments → navigate to portfolio → verify updated percentages

### Task 5: Color-Code Allocation Changes by Target (AC: 6.6.2)

The existing component partially implements this. Ensure full compliance with AC.

- [x] 5.1: Verify `isImproved` logic correctly detects movement toward target
- [x] 5.2: Add explicit red/amber styling for allocations moving AWAY from target (currently only amber)
- [x] 5.3: Update `getColorClasses` function to use red for significant negative movement (>2% away from target)
- [x] 5.4: Add tooltip showing: "Moved X% closer to target" or "Moved X% further from target"
- [x] 5.5: Add unit tests for color logic with various target scenarios

### Task 6: Unit Tests for Before/After Components (All AC)

- [x] 6.1: Create/extend `tests/unit/components/allocation-comparison-view.test.ts`
- [x] 6.2: Test: Renders pie charts when `showPieCharts=true`
- [x] 6.3: Test: Hides pie charts when `showPieCharts=false`
- [x] 6.4: Test: Renders portfolio summary section with all fields
- [x] 6.5: Test: Color-codes changes correctly (green/amber/red)
- [x] 6.6: Test: Calculates deltas correctly with Decimal.js precision
- [x] 6.7: Test: Handles empty `before`/`after` records gracefully

### Task 7: E2E Tests for Before/After Flow (All AC)

- [x] 7.1: Extend `tests/e2e/investment-confirmation.spec.ts` with before/after scenarios
- [x] 7.2: Test: Pie charts visible after confirmation
- [x] 7.3: Test: Summary section shows correct values
- [x] 7.4: Test: Color coding visible for improved/worsened allocations
- [x] 7.5: Test: Navigate to portfolio and verify updated percentages (AC-6.6.4)
- [x] 7.6: Test: Responsive layout on mobile viewport

### Task 8: Component Integration Verification

Per Epic 3 Retrospective Action Item #2, verify component integration:

- [x] 8.1: Verify `AllocationComparisonView` is imported and used in `ConfirmationModal`
- [x] 8.2: Verify pie charts render in actual UI (via E2E tests)
- [x] 8.3: Verify barrel export in `src/components/recommendations/index.ts`
- [x] 8.4: Verify all new props are documented with JSDoc

## Dev Notes

### Existing Infrastructure (STRONG FOUNDATION)

Story 6.5 and Story 7.10 already implemented significant before/after comparison functionality. This story enhances the existing implementation with:

1. **Dual pie chart visualization** (currently only tabular)
2. **Portfolio summary section** (currently missing)
3. **Cache invalidation verification** (may already exist)

| Component                | Location                                                        | Status                      |
| ------------------------ | --------------------------------------------------------------- | --------------------------- |
| AllocationComparisonView | `src/components/recommendations/allocation-comparison-view.tsx` | **Extend** - Add pie charts |
| BeforeAfterPreview       | `src/components/recommendations/before-after-preview.tsx`       | Reference pattern           |
| ConfirmationModal        | `src/components/recommendations/confirmation-modal.tsx`         | Integrate summary           |
| AllocationPieChart       | `src/components/charts/AllocationPieChart.tsx`                  | **Reuse** for dual charts   |
| useConfirmInvestments    | `src/hooks/use-confirm-investments.ts`                          | Extend for summary          |

### Data Flow

```
User confirms investments
    ↓
useConfirmInvestments.mutate() calls API
    ↓
API processes, returns ConfirmInvestmentsResult with:
  - summary: { assetsUpdated, totalInvested }
  - allocations: { before, after } (already exists)
  - portfolioSummary: { valueBefore, valueAfter, healthScores } (NEW)
    ↓
ConfirmationModal displays AllocationComparisonView
    ↓
AllocationComparisonView renders:
  - Portfolio summary section (NEW)
  - Dual pie charts (NEW)
  - Tabular comparison (existing)
  - "View Portfolio" navigation (existing)
```

### Pie Chart Integration Pattern

From `src/components/charts/AllocationPieChart.tsx`:

```typescript
interface AllocationPieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  showLabels?: boolean;
  showLegend?: boolean;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}

// Usage:
<AllocationPieChart
  data={[
    { name: "Variable Income", value: 52.3 },
    { name: "Fixed Income", value: 47.7 },
  ]}
  showLabels={true}
  showLegend={false}
  size="sm"
/>
```

### Transform Before/After to Pie Data

```typescript
// In AllocationComparisonView
function transformToPieData(
  allocations: Record<string, string>
): Array<{ name: string; value: number }> {
  return Object.entries(allocations).map(([name, value]) => ({
    name,
    value: parsePercentage(value),
  }));
}

// Usage:
const beforeData = useMemo(() => transformToPieData(before), [before]);
const afterData = useMemo(() => transformToPieData(after), [after]);
```

### Portfolio Summary Type

```typescript
export interface PortfolioSummaryData {
  /** Total portfolio value before investment */
  valueBefore: string;
  /** Total portfolio value after investment */
  valueAfter: string;
  /** Total amount invested this cycle */
  amountInvested: string;
  /** Portfolio health score before (optional - calculated from allocation gaps) */
  healthScoreBefore?: string;
  /** Portfolio health score after */
  healthScoreAfter?: string;
}
```

### Critical Implementation Rules

From `project-context.md`:

- **Decimal.js MANDATORY** - All financial calculations use `new Decimal("value")`
- **Handle -0 edge case** - Use `result.isZero() ? new Decimal(0) : result`
- **Structured logging** - Use `logger` from `@/lib/telemetry/logger`, never console
- **useNumberFormat()** - Use for all number display, never `toFixed()` or `toLocaleString()`
- **Standardized responses** - Use `successResponse/errorResponse` from `@/lib/api/responses.ts`
- **ESLint compliance** - Use `// eslint-disable-line no-restricted-syntax` for internal `.toFixed()` calculations

### Previous Story Learnings (Story 6.5)

1. **Over-budget handling** - Users can invest MORE than recommended (don't block)
2. **Success message format** - Use `{Month} investments recorded` with browser locale
3. **Navigation callback** - `onNavigateToPortfolio` already exists and works
4. **Test structure** - Unit tests for data transformation + E2E for user flow
5. **Locale-aware dates** - Use `new Intl.DateTimeFormat(undefined, { month: "long" })` for locale respect
6. **Pluralization** - Handle "1 asset" vs "N assets" correctly

### Git Context (Recent Commits)

```
4c204c9 feat(story-6.5): implement investment confirmation with code review fixes
400aa58 feat(story-6.4): implement recommendation details panel with code review fixes
7a2aa21 fix(story-6.3): improve PR review comments clarity
```

The 6.x series has established patterns for:

- Recommendation data flow
- Allocation calculations
- Panel/sheet UI patterns
- Before/after preview patterns

### File Structure

**Files to Modify:**

| File                                                            | Changes                                   |
| --------------------------------------------------------------- | ----------------------------------------- |
| `src/components/recommendations/allocation-comparison-view.tsx` | Add pie charts, portfolio summary section |
| `src/lib/validations/investment-schemas.ts`                     | Extend `ConfirmInvestmentsResult` type    |
| `src/lib/services/investment-service.ts`                        | Add portfolio summary calculation         |
| `src/hooks/use-confirm-investments.ts`                          | Expose portfolio summary data             |
| `src/components/recommendations/confirmation-modal.tsx`         | Pass portfolio summary prop               |
| `src/app/api/investments/confirm/route.ts`                      | Return portfolio summary in response      |

**Files to Create:**

| File                                                       | Purpose                               |
| ---------------------------------------------------------- | ------------------------------------- |
| `tests/unit/components/allocation-comparison-view.test.ts` | Unit tests for pie charts and summary |

### References

- [Source: `src/components/recommendations/allocation-comparison-view.tsx`] - Existing component to extend
- [Source: `src/components/recommendations/before-after-preview.tsx`] - Pattern for allocation calculations
- [Source: `src/components/charts/AllocationPieChart.tsx`] - Pie chart component to reuse
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 6.6`] - Original AC
- [Source: `_bmad-output/project-context.md`] - Implementation rules
- [Source: `_bmad-output/implementation-artifacts/6-5-investment-confirmation.md`] - Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Fixed `revalidatePath` mock missing in `tests/unit/api/investments-confirm.test.ts` causing 500 errors

### Completion Notes List

1. **AC-6.6.2 (Color-coded changes)**: Enhanced `getColorClasses` function with red/amber/green distinction based on target movement severity. Added tooltips showing "Moved X% closer/further from target" using `calculateTargetMovement` utility.

2. **AC-6.6.3 (Portfolio summary)**: Created `PortfolioSummarySection` sub-component and `PortfolioSummaryData` type. Updated `investment-service.ts` to calculate and return portfolio value before/after via `calculateAllocations` helper. Wired through `ConfirmationModal`.

3. **AC-6.6.4 (Real-time update)**: Added `revalidatePath("/portfolio")` and `revalidatePath("/recommendations")` in API route, plus `router.refresh()` in dashboard `onSuccess` callback.

4. **AC-6.6.5 (Dual pie charts)**: Created `BeforeAfterPieSection` sub-component using existing `AllocationPieChart`. Added `transformToPieChartData` utility function for data transformation.

5. **Test Coverage**: 5013 unit tests passing. E2E tests extended in `investment-confirmation.spec.ts` for Story 6.6 scenarios.

### File List

**Modified:**

- `src/components/recommendations/allocation-comparison-view.tsx` - Added pie charts, portfolio summary, color coding enhancements
- `src/components/recommendations/index.ts` - Added exports for new types and functions
- `src/lib/types/recommendations.ts` - Added `portfolioSummary` to `ConfirmInvestmentResult`
- `src/lib/services/investment-service.ts` - Added portfolio summary calculation with health scores in `confirmInvestments`
- `src/components/recommendations/confirmation-modal.tsx` - Pass new props to AllocationComparisonView
- `src/app/api/investments/confirm/route.ts` - Added `revalidatePath` calls
- `src/app/(dashboard)/page.tsx` - Added `router.refresh()` in onSuccess
- `tests/unit/api/investments-confirm.test.ts` - Added `revalidatePath` mock
- `tests/unit/components/allocation-comparison-view.test.ts` - Added tests for new functions
- `tests/e2e/investment-confirmation.spec.ts` - Added Story 6.6 test scenarios
- `drizzle/0021_curvy_network.sql` - Renamed from `0021_enable_rls_classification_cache.sql` (content unchanged, Drizzle auto-rename)
