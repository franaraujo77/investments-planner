# Story 3.6: Strategy Allocation Overview Chart

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to see a pie chart on the strategy page showing how my asset classes contribute to my total portfolio**,
So that **I can visualize my current allocation distribution while managing my investment strategy**.

## Acceptance Criteria

### AC-3.6.1: Strategy Page Pie Chart Display

- **Given** I am on the strategy page
- **When** the page loads
- **Then** I see a pie chart showing actual allocation percentages by asset class
- **And** each slice represents an asset class with its current percentage of total portfolio value
- **And** the chart renders in less than 100ms

### AC-3.6.2: Asset Class Allocation Calculation

- **Given** I have assets assigned to asset classes
- **When** I view the strategy page pie chart
- **Then** each asset class shows its percentage contribution based on actual portfolio values
- **And** unclassified assets are shown as a separate "Unclassified" segment

### AC-3.6.3: Pie Chart Tooltip Interaction

- **Given** I hover over a pie slice
- **When** the tooltip appears
- **Then** I see: asset class name, current percentage, value in base currency, and number of assets

### AC-3.6.4: Empty Portfolio State

- **Given** my portfolio has no assets
- **When** I view the strategy page
- **Then** I see an empty state message: "Add assets to your portfolio to see allocation breakdown"

### AC-3.6.5: Target Range Comparison

- **Given** I have asset classes with target ranges configured
- **When** I view the pie chart
- **Then** I can compare current allocation (pie chart) against my target ranges
- **And** color coding indicates if each class is under/on-target/over allocation

### AC-3.6.6: Screen Reader Accessibility

- **Given** I am using a screen reader
- **When** the pie chart is displayed
- **Then** accessible text describes the allocation distribution
- **And** ARIA labels are provided for each segment

## Tasks / Subtasks

### CRITICAL NOTE: BUILD ON EXISTING INFRASTRUCTURE

**From Epic 3 - Already Exists:**

- `src/components/portfolio/allocation-pie-chart.tsx` - Story 3.1, reusable AllocationPieChart component
- `src/components/forms/allocation-indicator.tsx` - Story 3.2, can be adapted for strategy summary
- `src/components/strategy/strategy-header.tsx` - Strategy page header with allocation warnings
- `src/components/strategy/asset-class-list.tsx` - Asset class CRUD component
- `src/hooks/use-asset-classes.ts` - Hooks for asset class data and validation

**From Epic 4 - Already Exists:**

- Asset class schema with allocation ranges (minPercentage, maxPercentage)
- Asset subclass schema with allocation ranges
- Allocation validation hooks (useAllocationValidation, useAllocationSummary)
- Asset count status hooks

**APIs Already Available:**

- `GET /api/asset-classes` - Returns all asset classes with allocation ranges
- `GET /api/asset-classes/summary` - Returns allocation summary (totalMinimums, totalMaximums)
- `GET /api/asset-classes/validate` - Returns allocation validation with warnings

**What This Story Adds:**

- New API endpoint to get actual portfolio allocation by asset class
- Strategy page pie chart section that displays current vs target allocations
- Color-coded status indicators for each asset class allocation

### Task 1: Create Strategy Allocation Service (AC: 3.6.2)

- [x] Subtask 1.1: Create `src/lib/services/strategy-allocation-service.ts`:

  ```typescript
  export interface StrategyAllocation {
    classId: string;
    className: string;
    targetMin: string | null; // From asset_classes table
    targetMax: string | null; // From asset_classes table
    currentValue: string; // Calculated from holdings
    currentPercentage: string; // Calculated from holdings
    assetCount: number;
    status: "under" | "on-target" | "over";
  }

  export interface StrategyAllocationSummary {
    allocations: StrategyAllocation[];
    totalPortfolioValue: string;
    unclassifiedValue: string;
    unclassifiedPercentage: string;
    unclassifiedAssetCount: number;
  }

  export async function getStrategyAllocation(userId: string): Promise<StrategyAllocationSummary>;
  ```

- [x] Subtask 1.2: Query holdings table to calculate total value per asset class
- [x] Subtask 1.3: Join with asset_classes to get target ranges
- [x] Subtask 1.4: Calculate status based on current vs target range
- [x] Subtask 1.5: Handle unclassified assets (holdings without asset class assignment)
- [x] Subtask 1.6: Use Decimal.js for all financial calculations

### Task 2: Create Strategy Allocation API Endpoint (AC: 3.6.2)

- [x] Subtask 2.1: Create `src/app/api/strategy/allocation/route.ts`:
  ```typescript
  // GET /api/strategy/allocation
  // Returns current portfolio allocation by asset class
  ```
- [x] Subtask 2.2: Authenticate user and get userId from session
- [x] Subtask 2.3: Call getStrategyAllocation service
- [x] Subtask 2.4: Return standardized response with StrategyAllocationSummary
- [x] Subtask 2.5: Handle errors with appropriate error codes

### Task 3: Create useStrategyAllocation Hook (AC: 3.6.1)

- [x] Subtask 3.1: Create `src/hooks/use-strategy-allocation.ts`:

  ```typescript
  interface UseStrategyAllocationReturn {
    allocations: StrategyAllocation[];
    totalValue: string;
    unclassified: {
      value: string;
      percentage: string;
      assetCount: number;
    };
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  }

  export function useStrategyAllocation(): UseStrategyAllocationReturn;
  ```

- [x] Subtask 3.2: Fetch from `/api/strategy/allocation`
- [x] Subtask 3.3: Auto-refresh on mount
- [x] Subtask 3.4: Expose refresh function for manual refresh
- [x] Subtask 3.5: Export from `src/hooks/index.ts`

### Task 4: Create StrategyAllocationChart Component (AC: 3.6.1, 3.6.3, 3.6.5, 3.6.6)

- [x] Subtask 4.1: Create `src/components/strategy/strategy-allocation-chart.tsx`:

  ```typescript
  interface StrategyAllocationChartProps {
    className?: string;
  }

  export function StrategyAllocationChart({ className }: StrategyAllocationChartProps);
  ```

- [x] Subtask 4.2: Use existing AllocationPieChart component from `@/components/portfolio/allocation-pie-chart`
- [x] Subtask 4.3: Transform StrategyAllocation[] to ClassAllocation[] format for pie chart
- [x] Subtask 4.4: Include "Unclassified" segment if unclassified assets exist
- [x] Subtask 4.5: Color-code segments based on status:
  - Under-allocated: Amber/Yellow
  - On-target: Green
  - Over-allocated: Red
  - Unclassified: Gray
- [x] Subtask 4.6: Show loading skeleton while data loads
- [x] Subtask 4.7: Handle empty state with message (AC-3.6.4)
- [x] Subtask 4.8: Accessibility: Use existing AllocationPieChart ARIA support

### Task 5: Create Allocation Comparison Legend (AC: 3.6.5)

- [x] Subtask 5.1: Create `src/components/strategy/allocation-comparison-legend.tsx`:
  ```typescript
  interface AllocationComparisonLegendProps {
    allocations: StrategyAllocation[];
    unclassified?: {
      percentage: string;
      assetCount: number;
    };
    className?: string;
  }
  ```
- [x] Subtask 5.2: Display each asset class with:
  - Class name
  - Current percentage (formatted with useNumberFormat)
  - Target range (min% - max%)
  - Status indicator (colored dot or icon)
- [x] Subtask 5.3: Show "Unclassified" row if unclassified assets exist
- [x] Subtask 5.4: Clickable rows that highlight corresponding pie slice

### Task 6: Integrate Chart into Strategy Page (AC: 3.6.1)

- [x] Subtask 6.1: Update `src/app/(dashboard)/strategy/page.tsx`:
  ```typescript
  import { StrategyAllocationChart } from "@/components/strategy/strategy-allocation-chart";
  // Add chart section after header, before asset class list
  ```
- [x] Subtask 6.2: Create two-column layout on larger screens:
  - Left: Pie chart (60% width)
  - Right: Comparison legend (40% width)
- [x] Subtask 6.3: Stack vertically on mobile (chart above legend)
- [x] Subtask 6.4: Add Card wrapper with title "Portfolio Allocation Overview"

### Task 7: Unit Tests

- [x] Subtask 7.1: Create `tests/unit/services/strategy-allocation-service.test.ts`:
  - Test allocation calculation with mixed asset classes
  - Test unclassified asset handling
  - Test status calculation (under/on-target/over)
  - Test empty portfolio case
  - Test Decimal.js precision
- [x] Subtask 7.2: Create `tests/unit/hooks/use-strategy-allocation.test.ts`:
  - Test loading state
  - Test successful data fetch
  - Test error handling
  - Test refresh function
- [x] Subtask 7.3: Create `tests/unit/components/strategy-allocation-chart.test.tsx`:
  - Test renders AllocationPieChart with correct data
  - Test empty state message
  - Test loading skeleton
  - Test accessibility attributes
- [x] Subtask 7.4: Create `tests/unit/components/allocation-comparison-legend.test.tsx`:
  - Test renders all allocation rows
  - Test status colors
  - Test formatted percentages
  - Test unclassified row

### Task 8: Integration Tests

- [x] Subtask 8.1: Create `tests/integration/strategy-allocation-api.test.ts`:
  - Test GET /api/strategy/allocation returns correct data
  - Test authentication required
  - Test user-scoped data (multi-tenancy)
  - Test empty portfolio response
  - Test mixed asset class portfolio

### Task 9: E2E Tests

- [x] Subtask 9.1: Add tests to `tests/e2e/strategy.spec.ts`:
  - Test pie chart displays on strategy page
  - Test tooltip shows correct information on hover
  - Test empty state for new users
  - Test chart updates when portfolio changes
  - Test color-coded status indicators

### Task 10: Verification

- [x] Subtask 10.1: `pnpm lint` - 0 errors
- [x] Subtask 10.2: `pnpm build` - successful build
- [x] Subtask 10.3: `pnpm test:unit` - all tests pass
- [x] Subtask 10.4: `pnpm test:e2e` - strategy tests pass
- [x] Subtask 10.5: Visual verification: chart renders correctly on all screen sizes
- [x] Subtask 10.6: Performance: chart renders in <100ms (measure with React DevTools)

## Dev Notes

### Architectural Decisions

**Reuse AllocationPieChart from Story 3.1:**
The existing AllocationPieChart component in `src/components/portfolio/allocation-pie-chart.tsx` is well-designed with:

- ClassAllocation interface that matches our needs
- Tooltips with value, percentage, and asset count
- Color-coded segments
- ARIA accessibility support
- Animation (<200ms transitions)

We just need to adapt it to show asset CLASS data instead of individual holding data.

**Data Flow:**

```
Holdings (DB) → Group by assetClassId → Calculate totals → Join with AssetClasses → Calculate status → API response → React hook → Chart component
```

**Status Calculation Logic:**

```typescript
function calculateStatus(
  current: Decimal,
  min: Decimal | null,
  max: Decimal | null
): AllocationStatus {
  if (min === null && max === null) return "on-target"; // No target = always valid
  if (min !== null && current.lt(min)) return "under";
  if (max !== null && current.gt(max)) return "over";
  return "on-target";
}
```

### Component Design

**StrategyAllocationChart wraps AllocationPieChart:**

```tsx
// Usage pattern - simple wrapper
<StrategyAllocationChart />

// Under the hood
const { allocations, totalValue, unclassified, isLoading } = useStrategyAllocation();
const chartData = transformToChartData(allocations, unclassified);
return <AllocationPieChart allocations={chartData} totalValue={totalValue} ... />;
```

**Chart Data Transformation:**

```typescript
function transformToChartData(
  allocations: StrategyAllocation[],
  unclassified: { value: string; percentage: string; assetCount: number }
): ClassAllocation[] {
  const data = allocations.map((alloc) => ({
    classId: alloc.classId,
    className: alloc.className,
    value: alloc.currentValue,
    percentage: alloc.currentPercentage,
    assetCount: alloc.assetCount,
    targetMin: alloc.targetMin,
    targetMax: alloc.targetMax,
    status: alloc.status,
    color: getStatusColor(alloc.status),
  }));

  if (new Decimal(unclassified.value).gt(0)) {
    data.push({
      classId: "unclassified",
      className: "Unclassified",
      value: unclassified.value,
      percentage: unclassified.percentage,
      assetCount: unclassified.assetCount,
      targetMin: null,
      targetMax: null,
      status: "on-target", // Unclassified is neutral
      color: "hsl(220, 9%, 46%)", // Gray
    });
  }

  return data;
}
```

### Color Palette for Status

| Status          | Light Mode           | Dark Mode            | Description             |
| --------------- | -------------------- | -------------------- | ----------------------- |
| Under-allocated | `hsl(38, 92%, 50%)`  | `hsl(38, 92%, 45%)`  | Amber - needs attention |
| On-target       | `hsl(142, 71%, 45%)` | `hsl(142, 71%, 40%)` | Green - healthy         |
| Over-allocated  | `hsl(0, 84%, 60%)`   | `hsl(0, 84%, 55%)`   | Red - warning           |
| Unclassified    | `hsl(220, 9%, 46%)`  | `hsl(220, 9%, 55%)`  | Gray - neutral          |

### Database Query Strategy

**Efficient Query for Allocation Calculation:**

```sql
SELECT
  h.asset_class_id,
  ac.name as class_name,
  ac.min_percentage as target_min,
  ac.max_percentage as target_max,
  SUM(h.quantity * h.current_price) as total_value,
  COUNT(h.id) as asset_count
FROM holdings h
LEFT JOIN asset_classes ac ON h.asset_class_id = ac.id
WHERE h.user_id = $1
  AND h.ignored = false
GROUP BY h.asset_class_id, ac.name, ac.min_percentage, ac.max_percentage;
```

**Note:** Handle `asset_class_id IS NULL` for unclassified assets separately.

### Performance Considerations

- Query is simple aggregation with GROUP BY - should be fast
- Consider adding index on `holdings(user_id, asset_class_id)` if not exists
- AllocationPieChart already has optimized rendering (<200ms animations)
- Data is relatively small (typically <20 asset classes)
- No need for pagination or virtualization

### Previous Story Intelligence

**From Story 3.1 (Allocation Pie Chart):**

1. AllocationPieChart component API is stable and well-tested
2. ClassAllocation interface includes all needed fields
3. Tooltip shows value, percentage, and asset count
4. ARIA labels are comprehensive
5. Animation is smooth (<200ms)

**From Story 3.2 (Live Allocation Indicator):**

1. Decimal.js is used for all percentage calculations
2. Color coding follows consistent pattern (green/amber/red)
3. useNumberFormat hook for locale-aware display

**From Story 4.3 (Set Allocation Ranges):**

1. Asset classes have minPercentage and maxPercentage fields
2. useAllocationValidation hook validates total ranges
3. AllocationWarningBanner shows when sum exceeds 100%

### Git Intelligence from Recent Commits

```
7d23bb7 fix: add position relative to AllocationPieChart
4a9f2db feat(epic-3): implement Story 3.5 Onboarding Tips
1d79aa5 feat(epic-3): implement Story 3.3 Allocation Validation
f284da1 review(epic-3): complete Story 3.4 code review
3c95c95 review(epic-3): complete Story 3.2 code review
```

Key patterns from commits:

- Commit format: `feat(epic-N): implement Story X.Y`
- Always run verification before commit
- Code review fixes included in same commit

### Dependencies

Existing dependencies (no new installs needed):

- `recharts` - For pie chart visualization
- `@/lib/calculations/decimal-config` - For Decimal.js
- `@/lib/api/responses` - For standardized API responses
- `@/lib/api/error-codes` - For error codes

### File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── strategy/
│   │       └── page.tsx                    ← MODIFIED (add chart section)
│   └── api/
│       └── strategy/
│           └── allocation/
│               └── route.ts                ← NEW
├── components/
│   └── strategy/
│       ├── strategy-allocation-chart.tsx   ← NEW
│       ├── allocation-comparison-legend.tsx ← NEW
│       └── index.ts                         ← MODIFIED (add exports)
├── hooks/
│   ├── use-strategy-allocation.ts          ← NEW
│   └── index.ts                             ← MODIFIED (add export)
└── lib/
    └── services/
        └── strategy-allocation-service.ts  ← NEW

tests/
├── unit/
│   ├── services/
│   │   └── strategy-allocation-service.test.ts  ← NEW
│   ├── hooks/
│   │   └── use-strategy-allocation.test.ts      ← NEW
│   └── components/
│       ├── strategy-allocation-chart.test.tsx   ← NEW
│       └── allocation-comparison-legend.test.tsx ← NEW
├── integration/
│   └── strategy-allocation-api.test.ts          ← NEW
└── e2e/
    └── strategy.spec.ts                          ← MODIFIED (add tests)
```

### Project Structure Notes

**Alignment with unified project structure:**

- API route follows existing pattern `/api/strategy/...`
- Service follows existing services pattern in `src/lib/services/`
- Component follows existing strategy components pattern
- Hook follows existing hook pattern
- Tests mirror source structure

**No conflicts detected** - All new paths follow established conventions.

### References

- [Source: epics.md#Story-3.6] - Story requirements and acceptance criteria
- [Source: project-context.md#Framework-Specific-Rules] - API response patterns
- [Source: architecture.md#Frontend-Architecture] - Component organization
- [Source: src/components/portfolio/allocation-pie-chart.tsx] - Reusable pie chart component
- [Source: src/hooks/use-asset-classes.ts] - Existing allocation hooks pattern
- [Source: 3-5-onboarding-tips.md#Dev-Notes] - Previous story learnings
- [Source: src/lib/calculations/decimal-config.ts] - Decimal.js configuration

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 4195 unit tests pass
- All 140 integration tests pass (17 skipped)
- Lint: 0 errors (3 warnings in unrelated test file)
- TypeScript: 0 errors

### Completion Notes List

1. **Strategy Allocation Service** - Created service with Drizzle query that aggregates holdings by asset class, joins with asset_classes table for target ranges, and calculates allocation status (under/on-target/over/no-target).

2. **API Endpoint** - Created GET /api/strategy/allocation with authentication via withAuth middleware. Returns allocations, totalPortfolioValue, and unclassified asset data.

3. **React Hook** - Created useStrategyAllocation hook with auto-refresh on mount, loading/error states, and refresh function for manual updates.

4. **Chart Component** - Created StrategyAllocationChart that wraps AllocationPieChart with status-based color coding (amber=under, green=on-target, red=over, blue=no-target).

5. **Comparison Legend** - Created AllocationComparisonLegend showing each asset class with current %, target range, and status badge.

6. **Page Integration** - Added StrategyAllocationSection to strategy page with responsive 60/40 layout (chart/legend) that stacks on mobile.

7. **Tests** - Unit tests for service (29 tests), integration tests for API (5 tests), E2E tests added to strategy.spec.ts.

### Implementation Decisions

- Used Decimal.js for all financial calculations to maintain precision
- Status calculation: under = current < min, over = current > max, on-target = within range, no-target = no targets set
- Unclassified assets (null asset_class_id) shown as separate gray segment
- Color palette: amber (#F59E0B), green (#22C55E), red (#EF4444), blue (#3B82F6)

### File List

**New Files:**

- `src/lib/services/strategy-allocation-service.ts`
- `src/app/api/strategy/allocation/route.ts`
- `src/hooks/useStrategyAllocation.ts`
- `src/components/strategy/strategy-allocation-chart.tsx`
- `src/components/strategy/allocation-comparison-legend.tsx`
- `src/components/strategy/strategy-allocation-section.tsx`
- `src/components/strategy/index.ts` - Barrel export for strategy components
- `tests/unit/services/strategy-allocation-service.test.ts`
- `tests/unit/hooks/useStrategyAllocation.test.ts`
- `tests/unit/components/strategy-allocation-chart.test.tsx`
- `tests/unit/components/allocation-comparison-legend.test.tsx`
- `tests/integration/strategy-allocation-api.test.ts`

**Modified Files:**

- `src/hooks/index.ts` - Added hook export
- `src/app/(dashboard)/strategy/page.tsx` - Added allocation section
- `tests/e2e/strategy.spec.ts` - Added Story 3.6 E2E tests

**Code Review Fixes (applied via adversarial review):**

- `src/components/strategy/allocation-comparison-legend.tsx` - Replaced local formatPercent with useNumberFormat hook (architecture compliance)
- `src/components/strategy/strategy-allocation-chart.tsx` - Added allocationsData prop to prevent duplicate API fetches
- `src/components/strategy/strategy-allocation-section.tsx` - Pass data to chart to avoid double fetch
