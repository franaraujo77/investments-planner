# Story 4-7: Fix Number Formatting Lint Errors

## Story

**As a** developer maintaining code quality standards,
**I want** all number formatting to use the `useNumberFormat()` hook consistently,
**So that** the codebase passes lint checks and maintains i18n compliance.

## Status

Draft | Ready for Dev | **In Progress** | Review | Done

## Context

During the Epic 3 retrospective, an ESLint rule was added to enforce usage of the `useNumberFormat()` hook for all number formatting instead of direct `.toFixed()`, `.toLocaleString()`, or `Intl.NumberFormat` usage. This ensures consistent i18n-compliant number formatting across the application.

However, 24 pre-existing files were not updated to comply with this rule, resulting in 53 lint errors that need to be resolved.

## Estimation

**Story Points:** 3 (straightforward mechanical refactoring)

## Acceptance Criteria

- [ ] **AC-4.7.1:** All `.toFixed()` calls in component files are replaced with `formatNumber()` or `formatPercent()` from `useNumberFormat()` hook
- [ ] **AC-4.7.2:** All `.toLocaleString()` calls with hardcoded locales are replaced with appropriate `useNumberFormat()` functions
- [ ] **AC-4.7.3:** All direct `Intl.NumberFormat` usage is replaced with `useNumberFormat()` hook functions
- [ ] **AC-4.7.4:** `pnpm lint` passes with zero errors
- [ ] **AC-4.7.5:** All existing unit tests continue to pass
- [ ] **AC-4.7.6:** Visual formatting remains unchanged (same decimal places, same display behavior)

## Tasks

### Task 1: Portfolio Components (13 errors in 7 files)

- [ ] 1.1 Fix `allocation-bar-chart.tsx` (2 errors)
- [ ] 1.2 Fix `allocation-pie-chart.tsx` (2 errors)
- [ ] 1.3 Fix `holding-detail-drawer.tsx` (1 error)
- [ ] 1.4 Fix `investment-confirmation-modal.tsx` (1 error)
- [ ] 1.5 Fix `investment-form.tsx` (1 error)
- [ ] 1.6 Fix `investment-timeline.tsx` (2 errors)
- [ ] 1.7 Fix `portfolio-asset-summary.tsx` (3 errors)
- [ ] 1.8 Fix `portfolio-table.tsx` (7 errors)
- [ ] 1.9 Fix `subclass-breakdown.tsx` (1 error)

### Task 2: Recommendations Components (15 errors in 7 files)

- [ ] 2.1 Fix `allocation-comparison-view.tsx` (1 error)
- [ ] 2.2 Fix `allocation-gauge.tsx` (1 error)
- [ ] 2.3 Fix `contribution-input.tsx` (errors)
- [ ] 2.4 Fix `dividends-input.tsx` (errors)
- [ ] 2.5 Fix `investment-amount-row.tsx` (errors)
- [ ] 2.6 Fix `over-allocated-explanation.tsx` (errors)
- [ ] 2.7 Fix `recommendation-breakdown-panel.tsx` (errors)
- [ ] 2.8 Fix `recommendation-card.tsx` (errors)

### Task 3: Criteria Components (3 errors in 3 files)

- [ ] 3.1 Fix `preview-assets-table.tsx` (1 error)
- [ ] 3.2 Fix `preview-impact-modal.tsx` (1 error)
- [ ] 3.3 Fix `score-comparison-view.tsx` (1 error)

### Task 4: Fintech Components (2 errors in 2 files)

- [ ] 4.1 Fix `allocation-gauge.tsx` (1 error)
- [ ] 4.2 Fix `data-freshness-badge.tsx` (1 error)

### Task 5: Other Components (2 errors in 2 files)

- [ ] 5.1 Fix `alert-preferences-section.tsx` (errors)
- [ ] 5.2 Fix `min-allocation-input.tsx` (errors)

### Task 6: Verification

- [ ] 6.1 Run `pnpm lint` and confirm zero errors
- [ ] 6.2 Run `pnpm test:unit` and confirm all tests pass
- [ ] 6.3 Manual visual verification of number formatting in key screens

## Files to Modify

| File                                                                | Error Count | Error Type                        |
| ------------------------------------------------------------------- | ----------- | --------------------------------- |
| `src/components/portfolio/portfolio-table.tsx`                      | 7           | `.toFixed()`, `Intl.NumberFormat` |
| `src/components/portfolio/portfolio-asset-summary.tsx`              | 3           | `.toFixed()`, `Intl.NumberFormat` |
| `src/components/portfolio/allocation-bar-chart.tsx`                 | 2           | `.toFixed()`                      |
| `src/components/portfolio/allocation-pie-chart.tsx`                 | 2           | `.toFixed()`, `Intl.NumberFormat` |
| `src/components/portfolio/investment-timeline.tsx`                  | 2           | `.toFixed()`                      |
| `src/components/portfolio/holding-detail-drawer.tsx`                | 1           | `.toFixed()`                      |
| `src/components/portfolio/investment-confirmation-modal.tsx`        | 1           | `.toFixed()`                      |
| `src/components/portfolio/investment-form.tsx`                      | 1           | `.toFixed()`                      |
| `src/components/portfolio/subclass-breakdown.tsx`                   | 1           | `.toFixed()`                      |
| `src/components/recommendations/allocation-comparison-view.tsx`     | 1           | `.toFixed()`                      |
| `src/components/recommendations/allocation-gauge.tsx`               | 1           | `.toFixed()`                      |
| `src/components/recommendations/contribution-input.tsx`             | \*          | `.toFixed()`                      |
| `src/components/recommendations/dividends-input.tsx`                | \*          | `.toFixed()`                      |
| `src/components/recommendations/investment-amount-row.tsx`          | \*          | `.toFixed()`                      |
| `src/components/recommendations/over-allocated-explanation.tsx`     | \*          | `.toFixed()`                      |
| `src/components/recommendations/recommendation-breakdown-panel.tsx` | \*          | `.toFixed()`                      |
| `src/components/recommendations/recommendation-card.tsx`            | \*          | `.toFixed()`                      |
| `src/components/criteria/preview-assets-table.tsx`                  | 1           | `.toFixed()`                      |
| `src/components/criteria/preview-impact-modal.tsx`                  | 1           | `.toFixed()`                      |
| `src/components/criteria/score-comparison-view.tsx`                 | 1           | `.toFixed()`                      |
| `src/components/fintech/allocation-gauge.tsx`                       | 1           | `.toFixed()`                      |
| `src/components/fintech/data-freshness-badge.tsx`                   | 1           | `.toLocaleString()`               |
| `src/components/settings/alert-preferences-section.tsx`             | \*          | `.toFixed()`                      |
| `src/components/strategy/min-allocation-input.tsx`                  | \*          | `.toFixed()`                      |

## Technical Notes

### Pattern to Replace

**Before:**

```tsx
// .toFixed() usage
<span>{value.toFixed(2)}%</span>

// .toLocaleString() usage
<span>{value.toLocaleString('en-US')}</span>

// Intl.NumberFormat usage
const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
<span>{formatter.format(value)}</span>
```

**After:**

```tsx
const { formatNumber, formatPercent, formatCurrency } = useNumberFormat();

// For percentages
<span>{formatPercent(value)}</span>

// For plain numbers
<span>{formatNumber(value, { minimumFractionDigits: 2 })}</span>

// For currency
<span>{formatCurrency(value)}</span>
```

### Import Statement

```tsx
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
```

## Dev Agent Record

### Agent Model Used

(To be filled during implementation)

### Completion Notes List

(To be filled during implementation)

### File List

(To be filled during implementation)
