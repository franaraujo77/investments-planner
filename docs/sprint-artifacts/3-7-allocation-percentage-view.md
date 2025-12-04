# Story 3.7: Allocation Percentage View

**Status:** ready-for-dev
**Epic:** Epic 3 - Portfolio Core
**Previous Story:** 3.6 Portfolio Overview with Values

---

## Story

**As a** user
**I want to** see current allocation percentages by asset class and subclass
**So that** I can understand my portfolio balance

---

## Acceptance Criteria

### AC-3.7.1: Allocation Pie/Donut Chart

- **Given** I am on the Portfolio Overview
- **When** I view the allocation section
- **Then** I see a pie or donut chart showing allocation by asset class
- **And** each segment is labeled with class name and percentage
- **And** the chart legend shows all asset classes with their colors

### AC-3.7.2: Current vs Target Bar Chart

- **Given** I have asset classes with target allocation ranges configured
- **When** I view the allocation section
- **Then** I see a bar chart comparing current allocation vs target range for each class
- **And** bars show current percentage as filled portion
- **And** target range is indicated (min-max markers or shaded area)

### AC-3.7.3: AllocationGauge Component

- **Given** I view the allocation section
- **When** the page loads
- **Then** I see an AllocationGauge for each asset class
- **And** the gauge shows the current position within the target range
- **And** the gauge visually indicates if current allocation is below, within, or above target

### AC-3.7.4: Percentage Display Precision

- **Given** allocation percentages are calculated
- **When** they are displayed anywhere on the page
- **Then** percentages show with 1 decimal precision (e.g., 42.5%)
- **And** percentages sum to 100% (or very close due to rounding)

### AC-3.7.5: Status Color Coding

- **Given** I view allocation indicators
- **When** comparing current vs target allocation
- **Then** colors indicate status:
  - **Green:** Current allocation is within target range (on target)
  - **Amber:** Current allocation is near the range boundary (within 5% of min/max)
  - **Red:** Current allocation is outside target range (under or over-allocated)

### AC-3.7.6: Subclass Breakdown Expansion

- **Given** I view an asset class in the allocation section
- **When** I click on a class (in chart or gauge)
- **Then** it expands to show subclass breakdown
- **And** each subclass shows its allocation percentage within the class
- **And** subclass percentages sum to the parent class percentage

### AC-3.7.7: Graceful Handling of Missing Targets

- **Given** some asset classes have no target range configured
- **When** I view the allocation section
- **Then** classes without targets show current percentage only
- **And** no status color is applied (neutral/gray)
- **And** a hint suggests "Set allocation target" with link to settings

---

## Technical Notes

### Existing Infrastructure

The following components are **already implemented** and can be reused:

| Component                     | Location                                          | Purpose                                    |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Portfolio service with values | `src/lib/services/portfolio-service.ts`           | getPortfolioWithValues() with allocation % |
| CurrencyDisplay               | `src/components/fintech/currency-display.tsx`     | Value formatting                           |
| DataFreshnessBadge            | `src/components/fintech/data-freshness-badge.tsx` | Data staleness indicator                   |
| Portfolio table with values   | `src/components/portfolio/portfolio-table.tsx`    | Asset listing with allocation column       |
| Decimal.js config             | `src/lib/calculations/decimal-config.ts`          | Financial precision                        |
| Database schema               | `src/lib/db/schema.ts`                            | portfolioAssets, assetClasses tables       |

### What Needs to Be Built

#### 1. AllocationGauge Component (`src/components/fintech/allocation-gauge.tsx`)

Custom component showing current position within target range:

```typescript
interface AllocationGaugeProps {
  className: string;
  currentPercent: string; // e.g., "42.5"
  targetMin?: string; // e.g., "40"
  targetMax?: string; // e.g., "50"
  status: "under" | "on-target" | "over" | "no-target";
  onClick?: () => void; // For expansion
}
```

Features:

- Horizontal gauge/progress bar
- Marker showing current position
- Shaded area showing target range
- Color coding based on status
- Tooltip with exact values

#### 2. AllocationPieChart Component (`src/components/portfolio/allocation-pie-chart.tsx`)

Donut chart showing allocation by asset class:

```typescript
interface AllocationPieChartProps {
  allocations: ClassAllocation[];
  onClassClick?: (classId: string) => void;
}
```

Features:

- Use Recharts PieChart/DonutChart
- Labeled segments with class name + percentage
- Interactive: click to expand subclass breakdown
- Legend with color key
- Center shows total value or "Portfolio Allocation"

#### 3. AllocationBarChart Component (`src/components/portfolio/allocation-bar-chart.tsx`)

Bar chart comparing current vs target:

```typescript
interface AllocationBarChartProps {
  allocations: ClassAllocation[];
  showTargets?: boolean;
}
```

Features:

- Horizontal bars per class
- Current allocation as filled bar
- Target range as markers or shaded area
- Color coding based on status
- Labels showing percentages

#### 4. Subclass Breakdown Component (`src/components/portfolio/subclass-breakdown.tsx`)

Expandable section showing subclass details:

```typescript
interface SubclassBreakdownProps {
  classId: string;
  className: string;
  subclasses: SubclassAllocation[];
  isExpanded: boolean;
  onToggle: () => void;
}
```

Features:

- Collapsible panel
- List of subclasses with percentages
- Mini pie chart or bar for subclass distribution
- Total matches parent class

#### 5. Allocation Service Extension

Extend portfolio service for allocation aggregation:

```typescript
// Add to lib/services/portfolio-service.ts or new allocation-service.ts

interface ClassAllocation {
  classId: string;
  className: string;
  value: string;
  percentage: string;
  assetCount: number;
  targetMin: string | null;
  targetMax: string | null;
  status: "under" | "on-target" | "over" | "no-target";
}

interface SubclassAllocation {
  subclassId: string;
  subclassName: string;
  value: string;
  percentageOfClass: string; // Percentage within parent class
  percentageOfPortfolio: string; // Percentage of total portfolio
  assetCount: number;
}

export async function getAllocationBreakdown(
  userId: string,
  portfolioId: string
): Promise<AllocationBreakdown>;
```

#### 6. Portfolio Allocation Page Section

Update portfolio page to include allocation visualization:

```typescript
// In app/(dashboard)/portfolio/page.tsx or separate allocation section

<AllocationSection>
  <AllocationPieChart allocations={allocations} onClassClick={handleClassClick} />
  <AllocationBarChart allocations={allocations} showTargets />
  <AllocationGaugeList>
    {allocations.map(alloc => (
      <AllocationGauge key={alloc.classId} {...alloc} />
    ))}
  </AllocationGaugeList>
  {expandedClass && (
    <SubclassBreakdown classId={expandedClass} ... />
  )}
</AllocationSection>
```

### Calculation Logic

All calculations must use **decimal.js** per architecture requirements:

```typescript
import { Decimal } from "@/lib/calculations/decimal-config";

// Calculate status based on current vs target
function calculateAllocationStatus(
  current: string,
  targetMin: string | null,
  targetMax: string | null
): "under" | "on-target" | "over" | "no-target" {
  if (targetMin === null || targetMax === null) return "no-target";

  const curr = new Decimal(current);
  const min = new Decimal(targetMin);
  const max = new Decimal(targetMax);

  if (curr.lessThan(min)) return "under";
  if (curr.greaterThan(max)) return "over";
  return "on-target";
}

// Check if near boundary (within 5% of min or max)
function isNearBoundary(
  current: string,
  targetMin: string,
  targetMax: string,
  threshold = "5"
): boolean {
  const curr = new Decimal(current);
  const min = new Decimal(targetMin);
  const max = new Decimal(targetMax);
  const thresh = new Decimal(threshold);

  const nearMin = curr.minus(min).abs().lessThanOrEqualTo(thresh);
  const nearMax = max.minus(curr).abs().lessThanOrEqualTo(thresh);

  return nearMin || nearMax;
}

// Format percentage with 1 decimal
function formatAllocationPercent(value: string): string {
  return new Decimal(value).toFixed(1);
}
```

### Chart Library

Use Recharts (already in dependencies via shadcn/ui):

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine } from "recharts";
```

### Color Palette for Status

Per UX spec, use consistent status colors:

- **Green (on-target):** `hsl(142, 76%, 36%)` - emerald-600
- **Amber (near boundary):** `hsl(45, 93%, 47%)` - amber-500
- **Red (out of range):** `hsl(0, 84%, 60%)` - red-500
- **Gray (no target):** `hsl(220, 9%, 46%)` - slate-500

---

## Tasks

### [ ] Task 1: Create AllocationGauge Component (AC: 3.7.3, 3.7.5)

**Files:** `src/components/fintech/allocation-gauge.tsx`

- Create gauge component with horizontal progress bar layout
- Show current position marker within target range
- Implement status color coding (green/amber/red/gray)
- Add tooltip showing exact values on hover
- Support click handler for expansion
- Include accessible labels

### [ ] Task 2: Create AllocationPieChart Component (AC: 3.7.1)

**Files:** `src/components/portfolio/allocation-pie-chart.tsx`

- Implement donut chart using Recharts
- Label each segment with class name and percentage
- Add interactive legend with color key
- Support click events to expand subclass breakdown
- Handle empty state (no assets or no classes)
- Use 1 decimal precision for percentages (AC-3.7.4)

### [ ] Task 3: Create AllocationBarChart Component (AC: 3.7.2, 3.7.5)

**Files:** `src/components/portfolio/allocation-bar-chart.tsx`

- Implement horizontal bar chart using Recharts
- Show current allocation as filled bar
- Display target range as reference markers or shaded area
- Apply status color coding to bars
- Handle classes without targets gracefully (AC-3.7.7)

### [ ] Task 4: Create SubclassBreakdown Component (AC: 3.7.6)

**Files:** `src/components/portfolio/subclass-breakdown.tsx`

- Create collapsible panel component
- List subclasses with their allocation percentages
- Show mini visualization (small bar or pie)
- Animate expansion/collapse
- Handle classes with no subclasses

### [ ] Task 5: Extend Portfolio Service for Allocation Aggregation (AC: All)

**Files:** `src/lib/services/portfolio-service.ts` or `src/lib/services/allocation-service.ts`

- Add `getAllocationBreakdown()` function
- Aggregate assets by class and subclass
- Calculate percentages using decimal.js
- Determine status for each class (under/on-target/over/no-target)
- Return structured AllocationBreakdown data

### [ ] Task 6: Create API Endpoint for Allocation Data (AC: All)

**Files:** `src/app/api/portfolios/[id]/allocations/route.ts`

- Create GET endpoint returning allocation breakdown
- Include class allocations, subclass breakdowns, statuses
- Validate portfolio ownership (user_id check)
- Return proper error responses

### [ ] Task 7: Update Portfolio Page with Allocation Section (AC: All)

**Files:** `src/app/(dashboard)/portfolio/page.tsx`, `src/components/portfolio/allocation-section.tsx`

- Create AllocationSection component combining all charts/gauges
- Add to portfolio page layout (below summary, above asset table)
- Implement class expansion state management
- Fetch allocation data via React Query or server component
- Add loading skeleton for allocation section

### [ ] Task 8: Handle Missing Asset Classes (AC: 3.7.7)

**Files:** Component updates

- Show "Unclassified" category for assets without class
- Display hint to set allocation targets for classes without them
- Link to settings/criteria page for target configuration
- Ensure graceful display when no classes defined

### [ ] Task 9: Create Unit Tests (AC: All)

**Files:** `tests/unit/services/allocation-service.test.ts`, `tests/unit/calculations/allocation.test.ts`

Test cases:

- Allocation percentage calculation (sum to 100%)
- Status determination (under/on-target/over)
- Near-boundary detection
- Subclass percentage within parent
- Empty portfolio handling
- Classes without targets
- Decimal precision maintained

### [ ] Task 10: Create E2E Tests (AC: All)

**Files:** `tests/e2e/portfolio.spec.ts` (extend existing)

Test cases:

- Pie chart displays with correct segments
- Bar chart shows current vs target
- AllocationGauge displays correct status colors
- Click on class expands subclass breakdown
- Percentages display with 1 decimal
- Status colors match allocation state
- Classes without targets show appropriately

### [ ] Task 11: Run Verification

- `pnpm lint` - 0 errors
- `pnpm build` - successful build
- `pnpm test` - all tests pass

---

## Dependencies

- Story 3.6: Portfolio Overview with Values (provides base portfolio page with values) - **COMPLETE**
- Story 3.5: Mark Asset as Ignored (ignored assets excluded from allocation) - **COMPLETE**
- Epic 4 Stories: Asset class/subclass configuration - **NOT YET IMPLEMENTED**

**Note:** Since Epic 4 (Asset Class Configuration) is not yet implemented, this story should:

1. Work with assets that have no class assigned (show as "Unclassified")
2. Handle missing targets gracefully (no color coding, hint to configure)
3. Be ready to integrate with Epic 4 when classes/targets are configured

---

## Dev Notes

### MVP Strategy for Missing Asset Classes

Since Epic 4 is not implemented yet:

- Create mock/seed asset classes for development and testing
- Allow assets to exist without class assignment
- Show "Unclassified" category for unassigned assets
- Allocation targets can be null (graceful handling)

This allows the allocation visualization to work immediately while Epic 4 provides full configuration later.

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Dependencies]

### Allocation Calculation Rules

Per previous story (3.6) and architecture:

- **Ignored assets are EXCLUDED from allocation percentage calculation**
- Ignored assets still count toward total portfolio VALUE
- Allocation % = (active asset value / total active value) x 100

```typescript
// Active allocation % calculation
const activeAssets = assets.filter((a) => !a.isIgnored);
const totalActiveValue = sum(activeAssets.map((a) => a.valueBase));
const assetAllocation = (asset.valueBase / totalActiveValue) * 100;
```

[Source: docs/sprint-artifacts/3-6-portfolio-overview-with-values.md#Allocation-Calculation]

### Decimal Precision Critical

Per architecture:

- ALL monetary/percentage calculations use decimal.js
- NEVER use JavaScript arithmetic
- Display percentages with `.toFixed(1)` for 1 decimal

[Source: docs/architecture.md#Decimal-Precision-Strategy]

### Learnings from Previous Story

**From Story 3-6-portfolio-overview-with-values (Status: done)**

**Patterns to Reuse:**

- Portfolio service value calculation pattern
- CurrencyDisplay component for value formatting
- DataFreshnessBadge for data staleness
- React Query caching patterns for portfolio data
- PortfolioTableWithValues sorting/filtering patterns

**Existing Infrastructure:**

- `getPortfolioWithValues()` returns assets with allocation percentages
- Price and exchange rate services (stubs ready for Epic 6)
- 569 tests pass, verified build

**Technical Decisions from Story 3.6:**

- Allocation excludes ignored assets (per AC-3.5.3)
- Values use decimal.js throughout
- Portfolio page uses client component for interactivity

**Files from Story 3.6 (relevant references):**

- `src/lib/services/portfolio-service.ts` - Extend for allocation aggregation
- `src/components/fintech/currency-display.tsx` - Reuse for value display
- `src/app/(dashboard)/portfolio/page.tsx` - Add allocation section

[Source: docs/sprint-artifacts/3-6-portfolio-overview-with-values.md#Dev-Agent-Record]

### Project Structure Notes

New files to create:

- `src/components/fintech/allocation-gauge.tsx` - Gauge component
- `src/components/portfolio/allocation-pie-chart.tsx` - Pie chart
- `src/components/portfolio/allocation-bar-chart.tsx` - Bar chart
- `src/components/portfolio/subclass-breakdown.tsx` - Expandable subclass view
- `src/components/portfolio/allocation-section.tsx` - Container for all allocation visuals
- `src/app/api/portfolios/[id]/allocations/route.ts` - Allocation API

Files to extend:

- `src/lib/services/portfolio-service.ts` - Add getAllocationBreakdown()
- `src/app/(dashboard)/portfolio/page.tsx` - Add allocation section
- `tests/e2e/portfolio.spec.ts` - Add allocation tests

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#AC-3.8]
- [Source: docs/epics.md#Story-3.7]
- [Source: docs/architecture.md#Decimal-Precision-Strategy]
- [Source: docs/architecture.md#Component-Library]
- [Source: docs/sprint-artifacts/3-6-portfolio-overview-with-values.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/3-7-allocation-percentage-view.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date       | Change        | Author                           |
| ---------- | ------------- | -------------------------------- |
| 2025-12-04 | Story drafted | SM Agent (create-story workflow) |
