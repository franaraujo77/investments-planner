# Story 7.1: Data Source Attribution

Status: ready-for-dev

## Story

As a **user**,
I want **to see where each piece of data comes from and when it was updated**,
so that **I can trust the data quality and freshness**.

## Acceptance Criteria

### AC-7.1.1: Click/Hover Data Point Attribution

**Given** I am viewing any data point (price, P/E ratio, dividend yield, etc.)
**When** I click or hover on the data
**Then** I see the data source (e.g., "Gemini API", "Company IR", "B3 Filing")

### AC-7.1.2: Timestamp Visibility

**Given** I view data source information
**When** the tooltip or popover appears
**Then** I see the timestamp of when this data was last updated
**And** the format is human-readable (e.g., "Updated 3 hours ago")

### AC-7.1.3: Investor Relations Document Attribution

**Given** data comes from investor relations publications
**When** I view the source
**Then** I see the specific document (e.g., "Q3 2024 Earnings Report")
**And** the publication date of that document

### AC-7.1.4: Multiple Sources Display

**Given** data has multiple sources
**When** I view the attribution
**Then** the primary source is shown
**And** I see "Data from [N] sources" with option to expand

### AC-7.1.5: Independent Verification Support

**Given** I want to verify data independently
**When** I view source attribution
**Then** I see enough information to locate the original source

## Tasks / Subtasks

### Task 1: Extend Source Attribution Types for Document Support (AC: 7.1.3, 7.1.5)

Enhance the existing type system to support investor relations documents and verification links.

- [ ] 1.1: Extend `SourceAttribution` interface in `src/lib/types/source-attribution.ts`:

  ```typescript
  interface DocumentReference {
    title: string; // "Q3 2024 Earnings Report"
    type: "earnings" | "annual-report" | "filing" | "press-release" | "ir-presentation";
    publicationDate: Date;
    url?: string; // Link to original document
    filingId?: string; // SEC/CVM filing reference
  }

  interface SourceAttribution {
    // Existing fields...
    documentRef?: DocumentReference; // NEW
  }
  ```

- [ ] 1.2: Add `getDocumentTypeLabel(type: string): string` utility function
- [ ] 1.3: Add `formatDocumentAttribution(doc: DocumentReference): string` utility
- [ ] 1.4: Export new types and functions from barrel file
- [ ] 1.5: Add unit tests for new type utilities in `tests/unit/lib/types/source-attribution.test.ts`

### Task 2: Create Multi-Source Attribution Component (AC: 7.1.4)

Build component to display data from multiple sources with expandable view.

- [ ] 2.1: Create `MultiSourceAttribution` component in `src/components/data/multi-source-attribution.tsx`
- [ ] 2.2: Implement collapsed state showing primary source + "Data from [N] sources"
- [ ] 2.3: Implement expanded state showing all sources with their timestamps
- [ ] 2.4: Add expand/collapse animation using tw-animate-css
- [ ] 2.5: Support keyboard navigation (Enter/Space to toggle)
- [ ] 2.6: Add ARIA attributes for accessibility (`aria-expanded`, `aria-controls`)
- [ ] 2.7: Add unit tests for `MultiSourceAttribution` component
- [ ] 2.8: Export from `src/components/data/index.ts`

### Task 3: Enhance SourceAttributionLabel with Document Support (AC: 7.1.3, 7.1.5)

Extend existing component to display document references and verification links.

- [ ] 3.1: Add `documentRef?: DocumentReference` prop to `SourceAttributionLabel`
- [ ] 3.2: When `documentRef` present, display document title and publication date
- [ ] 3.3: If `documentRef.url` exists, render as clickable link (opens in new tab)
- [ ] 3.4: Add `showVerificationLink?: boolean` prop (default: false)
- [ ] 3.5: Style verification links with external link icon
- [ ] 3.6: Update existing unit tests with document ref scenarios

### Task 4: Create Source Attribution Tooltip Component (AC: 7.1.1, 7.1.2)

Build reusable tooltip that wraps any data point with attribution info.

- [ ] 4.1: Create `DataWithAttribution` component in `src/components/data/data-with-attribution.tsx`
- [ ] 4.2: Accept `children` (the data display), `attribution: SourceAttribution`, and `showOnHover?: boolean`
- [ ] 4.3: Use existing Radix `Tooltip` from `src/components/ui/tooltip.tsx`
- [ ] 4.4: Display in tooltip:
  - Provider name (using `getProviderDisplayName`)
  - Relative timestamp (using `formatRelativeTime`)
  - Exact timestamp on hover (using `formatExactTime`)
  - Document reference if present
- [ ] 4.5: Support click-to-expand for mobile (where hover isn't available)
- [ ] 4.6: Add unit tests for `DataWithAttribution`
- [ ] 4.7: Export from `src/components/data/index.ts`

### Task 5: Integrate Attribution into Score Breakdown (AC: 7.1.1, 7.1.2, 7.1.3)

Wire attribution components into the existing `ScoreBreakdown` component.

- [ ] 5.1: Audit `src/components/fintech/score-breakdown.tsx` for existing `inputSources` usage
- [ ] 5.2: Wrap price value with `DataWithAttribution` using `inputSources.price` data
- [ ] 5.3: Wrap exchange rate value with `DataWithAttribution` using `inputSources.exchangeRate` data
- [ ] 5.4: Wrap fundamentals values with `DataWithAttribution` using `inputSources.fundamentals` data
- [ ] 5.5: Ensure score display shows criteria version attribution
- [ ] 5.6: Add unit tests for attribution display in score breakdown

### Task 6: Integrate Attribution into Asset Detail Views (AC: 7.1.1, 7.1.2)

Add attribution to asset-related data displays throughout the app.

- [ ] 6.1: Identify all components displaying asset prices (search codebase for price display patterns)
- [ ] 6.2: Update `HoldingRow` component (if exists) to show attribution on price values
- [ ] 6.3: Update asset detail panels to include source attribution
- [ ] 6.4: Ensure recommendation cards show data source for score/price info
- [ ] 6.5: Verify `DataFreshnessBadge` is present on key data views

### Task 7: API Enhancement for Source Metadata (AC: 7.1.3, 7.1.4)

Ensure API responses include sufficient source metadata.

- [ ] 7.1: Audit existing API responses for source inclusion:
  - `GET /api/data/prices`
  - `GET /api/data/freshness`
  - `GET /api/assets/[id]`
  - Score calculation responses
- [ ] 7.2: If missing, extend API responses to include `SourceAttribution` data
- [ ] 7.3: Add `documentRef` field to fundamentals API response when IR data present
- [ ] 7.4: Update Zod schemas in `src/lib/validations/` for new response shapes
- [ ] 7.5: Add integration tests for API source metadata responses

### Task 8: Unit Tests for Attribution Components (All AC)

- [ ] 8.1: Create/extend `tests/unit/components/multi-source-attribution.test.ts`
- [ ] 8.2: Create/extend `tests/unit/components/data-with-attribution.test.ts`
- [ ] 8.3: Test: Displays provider name correctly
- [ ] 8.4: Test: Shows relative time format ("3 hours ago")
- [ ] 8.5: Test: Renders document reference with publication date
- [ ] 8.6: Test: Multi-source shows collapsed count correctly
- [ ] 8.7: Test: Expand/collapse works with keyboard
- [ ] 8.8: Test: Verification link opens in new tab when present

### Task 9: E2E Tests for Attribution Display (All AC)

- [ ] 9.1: Create `tests/e2e/data-attribution.spec.ts`
- [ ] 9.2: Test: Hover on price shows source tooltip with timestamp
- [ ] 9.3: Test: Click on price on mobile shows attribution popover
- [ ] 9.4: Test: Score breakdown shows all input sources
- [ ] 9.5: Test: Multi-source expands to show all sources
- [ ] 9.6: Test: Document reference link is clickable (href verification)
- [ ] 9.7: Test: Attribution info is accessible via keyboard navigation

### Task 10: Documentation and Export Updates

- [ ] 10.1: Update barrel exports in `src/components/data/index.ts`
- [ ] 10.2: Add JSDoc comments to all new components and functions
- [ ] 10.3: Verify no console.log/error statements (use logger)
- [ ] 10.4: Run `pnpm lint` and fix any issues
- [ ] 10.5: Run `pnpm test` and ensure all tests pass

## Dev Notes

### CRITICAL: Extensive Existing Infrastructure

**Story 7.1 has significant existing infrastructure to build upon.** This is NOT a greenfield implementation. Key existing components:

| Existing Asset           | Location                                           | Relevance                                             |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| `DataFreshnessBadge`     | `src/components/data/data-freshness-badge.tsx`     | **REUSE** - Already shows freshness with color coding |
| `SourceAttributionLabel` | `src/components/data/source-attribution-label.tsx` | **EXTEND** - Add document support                     |
| `CompactSourceLabel`     | `src/components/data/source-attribution-label.tsx` | **REUSE** for inline attribution                      |
| `SourceBadge`            | `src/components/data/source-attribution-label.tsx` | **REUSE** for badge-style display                     |
| Source types             | `src/lib/types/source-attribution.ts`              | **EXTEND** with DocumentReference                     |
| Freshness types          | `src/lib/types/freshness.ts`                       | **REUSE** for timestamp utilities                     |
| `useFreshness` hook      | `src/hooks/use-freshness.ts`                       | **REUSE** for data fetching                           |
| Freshness API            | `src/app/api/data/freshness/route.ts`              | **REUSE/EXTEND**                                      |
| Database schema          | `src/lib/db/schema.ts`                             | **ALREADY HAS** source, fetchedAt columns             |

### Existing Provider Display Names

From `src/lib/types/source-attribution.ts`:

```typescript
const providerDisplayNames: Record<string, string> = {
  gemini: "Gemini API",
  yahoo: "Yahoo Finance",
  "exchangerate-api": "ExchangeRate-API",
  "open-exchange-rates": "Open Exchange Rates",
  "alpha-vantage": "Alpha Vantage",
};
```

Add these for IR documents:

```typescript
const providerDisplayNames = {
  // ...existing
  "company-ir": "Company Investor Relations",
  "sec-filing": "SEC Filing",
  "cvm-filing": "CVM Filing (Brazil)",
  "b3-filing": "B3 Filing",
};
```

### Existing Freshness Utilities

From `src/lib/types/freshness.ts`:

```typescript
// Already available:
getFreshnessStatus(fetchedAt: Date): FreshnessStatus  // "fresh" | "stale" | "very-stale"
formatRelativeTime(date: Date): string                 // "2h ago", "3 days ago"
formatExactTime(date: Date): string                    // "Dec 10, 2025, 3:00 AM"
getFreshnessColorClasses(status): ColorClasses         // bg, text, border classes
getFreshnessAriaLabel(status, time): string            // Accessibility label
```

### Tooltip Pattern (Already Implemented)

From `DataFreshnessBadge`:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Badge variant={variant} className={cn(colorClasses, className)}>
      <FreshnessIcon className="h-3 w-3 mr-1" />
      {relativeTime}
    </Badge>
  </TooltipTrigger>
  <TooltipContent side="top" className="max-w-[200px]">
    <div className="space-y-1">
      <div className="font-medium">{exactTime}</div>
      <div className="text-muted-foreground text-[10px]">
        Source: {getProviderDisplayName(freshnessInfo.source)}
      </div>
    </div>
  </TooltipContent>
</Tooltip>
```

### Database Schema (Source Tracking Already Exists)

```typescript
// asset_prices table already has:
source: varchar(50); // e.g., "gemini-api"
fetchedAt: timestamp; // When data was fetched
isStale: boolean; // Stale flag

// asset_fundamentals table already has:
source: varchar(50); // e.g., "gemini-api"
fetchedAt: timestamp; // When fetched
dataDate: date; // Date data represents

// exchange_rates table already has:
source: varchar(50); // e.g., "exchangerate-api"
fetchedAt: timestamp; // When fetched
```

### New Component: DataWithAttribution

```tsx
// Proposed pattern:
interface DataWithAttributionProps {
  children: React.ReactNode; // The data value to display
  attribution: SourceAttribution; // Source info
  showOnHover?: boolean; // Tooltip on hover (default: true)
  showOnClick?: boolean; // Popover on click (mobile fallback)
  className?: string;
}

// Usage:
<DataWithAttribution
  attribution={{
    dataType: "price",
    source: "gemini",
    timestamp: new Date("2025-12-31T10:00:00Z"),
  }}
>
  <span className="font-medium">R$ 28.45</span>
</DataWithAttribution>;
```

### New Component: MultiSourceAttribution

```tsx
interface MultiSourceAttributionProps {
  sources: SourceAttribution[];
  primarySourceIndex?: number; // Which source to show collapsed (default: 0)
  className?: string;
}

// Collapsed: "Gemini API • Data from 3 sources"
// Expanded: Shows all sources with timestamps
```

### Implementation Priority

1. **Type extensions** (Task 1) - Foundation for document support
2. **DataWithAttribution** (Task 4) - Wrapper component for any data point
3. **MultiSourceAttribution** (Task 2) - Multiple sources display
4. **Extend SourceAttributionLabel** (Task 3) - Document references
5. **Integration tasks** (Tasks 5-6) - Wire into existing views
6. **API audit** (Task 7) - Ensure data is available
7. **Tests** (Tasks 8-9) - Comprehensive coverage

### Critical Implementation Rules

From `project-context.md`:

- **NEVER use console.log/error** - Use `logger` from `@/lib/telemetry/logger`
- **Decimal.js for financial calculations** - Though this story is primarily UI
- **useNumberFormat()** for number display
- **Standardized API responses** from `@/lib/api/responses.ts`
- **Run `pnpm lint` and `pnpm test`** before committing

### Previous Story Patterns (Story 6.6)

Relevant patterns from recent Epic 6 work:

1. **Tooltip usage** - Radix Tooltip with `TooltipContent` styling
2. **Badge variants** - Use existing `Badge` component with variants
3. **Icon patterns** - Lucide icons (TrendingUp, Globe, Database, Clock, ExternalLink)
4. **Accessibility** - ARIA labels on interactive elements
5. **Animation** - tw-animate-css for expand/collapse

### Git Context (Recent Commits)

```
0ac9d66 feat(story-6.6): implement before/after comparison with code review fixes
4c204c9 feat(story-6.5): implement investment confirmation with code review fixes
400aa58 feat(story-6.4): implement recommendation details panel with code review fixes
```

Epic 6 established patterns for:

- Panel/tooltip UI interactions
- Data display with metadata
- Accessibility patterns

### File Structure

**Files to Create:**

| File                                                     | Purpose                                  |
| -------------------------------------------------------- | ---------------------------------------- |
| `src/components/data/data-with-attribution.tsx`          | Wrapper for any data with source tooltip |
| `src/components/data/multi-source-attribution.tsx`       | Multi-source expandable display          |
| `tests/unit/components/data-with-attribution.test.ts`    | Unit tests                               |
| `tests/unit/components/multi-source-attribution.test.ts` | Unit tests                               |
| `tests/e2e/data-attribution.spec.ts`                     | E2E tests                                |

**Files to Modify:**

| File                                               | Changes                        |
| -------------------------------------------------- | ------------------------------ |
| `src/lib/types/source-attribution.ts`              | Add `DocumentReference` type   |
| `src/components/data/source-attribution-label.tsx` | Add document support           |
| `src/components/data/index.ts`                     | Export new components          |
| `src/components/fintech/score-breakdown.tsx`       | Integrate attribution tooltips |

### Test Coverage Requirements

Per project standards (80% minimum):

- Unit tests for all new utility functions
- Unit tests for component rendering states
- Unit tests for accessibility (ARIA attributes)
- E2E tests for user interactions (hover, click, keyboard)

### References

- [Source: `src/components/data/data-freshness-badge.tsx`] - Existing freshness display pattern
- [Source: `src/components/data/source-attribution-label.tsx`] - Existing attribution labels
- [Source: `src/lib/types/source-attribution.ts`] - Existing type definitions
- [Source: `src/lib/types/freshness.ts`] - Freshness utilities
- [Source: `src/hooks/use-freshness.ts`] - Data fetching hook
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.1`] - Original AC
- [Source: `_bmad-output/project-context.md`] - Implementation rules
- [Source: `_bmad-output/implementation-artifacts/6-6-before-after-comparison.md`] - Recent story patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
