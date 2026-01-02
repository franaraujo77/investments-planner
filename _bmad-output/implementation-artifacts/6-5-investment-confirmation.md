# Story 6.5: Investment Confirmation

Status: done

## Story

As a **user**,
I want **to confirm my investments and record actual amounts**,
so that **my portfolio is updated with real transactions**.

## Context: Gap Completion Story

This story addresses **identified gaps** in the existing investment confirmation implementation. The core functionality was implemented as part of Story 7.8, but the following gaps were discovered during gap analysis:

| Gap                    | Severity | Description                                |
| ---------------------- | -------- | ------------------------------------------ |
| Over-budget handling   | Critical | AC allows over-budget, code blocks it      |
| Success message format | Medium   | Should show "{Month} investments recorded" |
| E2E test coverage      | Medium   | No E2E tests for confirmation flow         |
| Navigation callback    | Minor    | "View Portfolio" button not wired          |

## Acceptance Criteria

### AC-6.5.1: Confirmation Screen Display

**Given** I have reviewed recommendations
**When** I proceed to confirmation
**Then** I see a confirmation screen with all recommendations listed
**And** each has an editable amount field (pre-filled with recommended)

> **Status:** IMPLEMENTED - `ConfirmationModal` + `InvestmentAmountRow` components exist

### AC-6.5.2: Edit Investment Amounts

**Given** I want to invest different amounts than recommended
**When** I edit the amount fields
**Then** I can enter actual amounts I invested
**And** the total updates in real-time

> **Status:** IMPLEMENTED - `handleAmountChange` + `calculateTotal` in confirmation-modal.tsx

### AC-6.5.3: Confirm Records Investments

**Given** I am ready to confirm
**When** I click "Confirm Investments"
**Then** the amounts are recorded as actual investments
**And** portfolio holdings are updated with new quantities
**And** allocation percentages are recalculated

> **Status:** IMPLEMENTED - `confirmInvestments` service + API endpoint

### AC-6.5.4: Success Message with Before/After

**Given** confirmation succeeds
**When** the process completes
**Then** I see a success message: "{Month} investments recorded"
**And** I am shown the before/after comparison

> **Status:** IMPLEMENTED - Toast shows "{Month} investments recorded" format

### AC-6.5.5: Accept Higher Amounts (GAP - CRITICAL)

**Given** I invested more than recommended total
**When** I confirm
**Then** the system accepts the higher amount
**And** records the actual investment

> **Status:** IMPLEMENTED - Over-budget validation removed, info indicator added

### AC-6.5.6: Skip Zero Investments

**Given** I skip an investment (set to $0)
**When** I confirm
**Then** that asset is skipped
**And** only non-zero amounts are recorded

> **Status:** IMPLEMENTED - Filter in handleConfirm excludes $0 amounts

## Tasks / Subtasks

### Task 1: Fix Over-Budget Validation (AC: 6.5.5) - CRITICAL ✅

The AC explicitly states users should be able to invest MORE than the recommended total (they may have additional funds). Current implementation blocks this.

- [x] 1.1: Remove `isOverBudget` blocking in `confirmation-modal.tsx:182-185`
- [x] 1.2: Remove button disable for over-budget in `confirmation-modal.tsx:341`
- [x] 1.3: Remove API validation `validateTotalDoesNotExceedAvailable` in `route.ts:109-114`
- [x] 1.4: Update `investment-schemas.ts` - mark function as deprecated
- [x] 1.5: Add visual indicator showing user is over original budget (info, not error)
- [x] 1.6: Update unit tests in `confirmation-modal.test.ts` to expect over-budget allowed
- [x] 1.7: Update unit tests in `investment-schemas.test.ts` for new validation behavior

### Task 2: Update Success Message Format (AC: 6.5.4) ✅

Change toast from "Investments confirmed!" to "{Month} investments recorded" per AC.

- [x] 2.1: Update `use-confirm-investments.ts:152` to use dynamic month format
- [x] 2.2: Use `Intl.DateTimeFormat` for locale-aware month name
- [x] 2.3: Update `AllocationComparisonView` header to match format
- [x] 2.4: Update unit tests for new message format

**Implementation Pattern:**

```typescript
const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());
toast.success(`${monthName} investments recorded`, {
  description: `${result.summary.assetsUpdated} assets updated.`,
});
```

### Task 3: Wire Navigation Callback (AC: 6.5.4) ✅

After confirmation success, "View Portfolio" button should navigate to portfolio.

- [x] 3.1: Add `useRouter` import to dashboard page
- [x] 3.2: Create `handleNavigateToPortfolio` callback that navigates to `/portfolio`
- [x] 3.3: Pass callback to `ConfirmationModal` via `onNavigateToPortfolio` prop
- [x] 3.4: Verify navigation works after clicking "View Portfolio"

### Task 4: Add E2E Test Coverage (AC: ALL) ✅

Create comprehensive E2E tests for the confirmation flow.

- [x] 4.1: Create `tests/e2e/investment-confirmation.spec.ts`
- [x] 4.2: Test: Opens confirmation modal on button click
- [x] 4.3: Test: Pre-fills recommended amounts in fields
- [x] 4.4: Test: Real-time total updates when editing amounts
- [x] 4.5: Test: Confirms and shows success state
- [x] 4.6: Test: Shows before/after allocation comparison
- [x] 4.7: Test: Handles $0 amounts (skip investment)
- [x] 4.8: Test: Accepts over-budget amounts (after Task 1)
- [x] 4.9: Test: Navigate to portfolio after confirmation

## Dev Notes

### Existing Implementation Files

| Component                | Location                                                        | Status    |
| ------------------------ | --------------------------------------------------------------- | --------- |
| ConfirmationModal        | `src/components/recommendations/confirmation-modal.tsx`         | Modify    |
| InvestmentAmountRow      | `src/components/recommendations/investment-amount-row.tsx`      | No change |
| AllocationComparisonView | `src/components/recommendations/allocation-comparison-view.tsx` | Modify    |
| useConfirmInvestments    | `src/hooks/use-confirm-investments.ts`                          | Modify    |
| Investment Schemas       | `src/lib/validations/investment-schemas.ts`                     | Modify    |
| Confirm API Route        | `src/app/api/investments/confirm/route.ts`                      | Modify    |
| Dashboard Page           | `src/app/(dashboard)/page.tsx`                                  | Modify    |

### Critical Decision: Over-Budget Behavior

**Background:** The current implementation (Story 7.8) added validation to PREVENT over-budget confirmation, likely as a safety measure. However, AC-6.5.5 from the epics document explicitly states the system should ACCEPT higher amounts.

**Recommended Approach:**

1. Remove the blocking validation
2. Add an INFO-level visual indicator (not error) showing user is investing more than available capital
3. Keep the remaining amount display (can go negative)
4. Trust the user knows they have additional funds

**Alternative:** If blocking is desired, update the epics document AC-6.5.5 instead.

### Testing Standards

Per CLAUDE.md:

- Unit tests for all modified functions
- Integration tests for API endpoint changes
- E2E tests for user flow (Task 4)
- Use `vitest` for unit/integration, `playwright` for E2E

### Number Formatting

Per CLAUDE.md ESLint rules:

- Use `useNumberFormat()` hook for displaying currency amounts
- Never use `.toFixed()` or `.toLocaleString()` directly

### Known Deferred Items

**Price Per Unit (TODO):** The `pricePerUnit` is hardcoded to "1.00" with a TODO comment. This is intentionally deferred to a future story for market data integration. Do NOT address in this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.5] - Original AC
- [Source: docs/sprint-artifacts/7-8-confirm-recommendations.md] - Previous implementation spec
- [Source: docs/sprint-artifacts/7-10-view-updated-allocation.md] - Success state spec
- [Source: CLAUDE.md#Test-Requirements] - Testing standards
- [Source: CLAUDE.md#Architecture-Patterns] - Number formatting rules

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Unit tests: 60/60 passing
- Lint: No errors
- Build: Successful
- Type check: No errors

### Completion Notes List

1. **Task 1 (Over-Budget):** Removed blocking validation in modal, API route, and button. Changed visual indicator from red error to blue info. Updated tests to reflect AC-6.5.5 allowing over-budget confirmation.

2. **Task 2 (Success Message):** Changed toast from "Investments confirmed!" to "{Month} investments recorded" using `Intl.DateTimeFormat`. Updated AllocationComparisonView header to match.

3. **Task 3 (Navigation):** Added `useRouter` to dashboard, created `handleNavigateToPortfolio` callback, passed to modal with `confirmationResult` for success state display.

4. **Task 4 (E2E Tests):** Created comprehensive test suite covering all ACs including over-budget, success states, navigation, and accessibility.

### Change Log

| Date       | Change                | Reason                                                                                                   |
| ---------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| 2026-01-02 | Story created         | Gap analysis identified missing AC implementation                                                        |
| 2026-01-02 | All tasks completed   | Implementation of all gap fixes                                                                          |
| 2026-01-02 | Code review completed | Fixed 4 issues: test expecting old validation, pluralization grammar, hardcoded locale, improved comment |

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5
**Date:** 2026-01-02
**Outcome:** ✅ APPROVED (after fixes)

**Issues Found and Fixed:**

| Severity | Issue                                                                             | Resolution                                                     |
| -------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| HIGH     | Test `should return 400 if total exceeds available capital` contradicted AC-6.5.5 | Updated test to verify over-budget IS allowed                  |
| MEDIUM   | Success toast used "1 assets updated" (bad grammar)                               | Fixed to "1 asset updated" with proper pluralization           |
| MEDIUM   | Hardcoded `en-US` locale in Intl.DateTimeFormat                                   | Changed to `undefined` to respect browser locale               |
| LOW      | Unclear eslint-disable comment                                                    | Added explanatory comment about why toFixed is acceptable here |

**Verification:**

- ✅ All 4989 unit tests passing
- ✅ Lint passing
- ✅ Type check passing
- ✅ All ACs verified as implemented

### File List

**Files to Modify:**

- `src/components/recommendations/confirmation-modal.tsx`
- `src/components/recommendations/allocation-comparison-view.tsx`
- `src/hooks/use-confirm-investments.ts`
- `src/lib/validations/investment-schemas.ts`
- `src/app/api/investments/confirm/route.ts`
- `src/app/(dashboard)/page.tsx`
- `tests/unit/components/confirmation-modal.test.ts`
- `tests/unit/lib/validations/investment-schemas.test.ts`
- `tests/unit/hooks/use-confirm-investments.test.ts`

**Files to Create:**

- `tests/e2e/investment-confirmation.spec.ts`
