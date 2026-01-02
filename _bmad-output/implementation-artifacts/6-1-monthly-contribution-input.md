# Story 6.1: Monthly Contribution Input

Status: ready-for-dev

## Story

As a **user**,
I want **to enter my monthly contribution and dividends received**,
so that **the system knows how much capital I have to invest**.

## Acceptance Criteria

1. **AC-6.1.1: Contribution Input Display**
   - Given I am on the recommendations page
   - When I start a new investment cycle
   - Then I see input fields for: monthly contribution and dividends received

2. **AC-6.1.2: Contribution Validation**
   - Given I enter my monthly contribution (e.g., $2,000)
   - When the value is entered
   - Then the amount is validated (must be positive number)
   - And the value is displayed in my locale format

3. **AC-6.1.3: Dividends Entry**
   - Given I enter dividends received (e.g., $150)
   - When the value is entered
   - Then this is added to my investable capital
   - And I can optionally specify which assets generated dividends

4. **AC-6.1.4: Total Capital Summary**
   - Given I have entered contribution and dividends
   - When I view the summary
   - Then I see total investable capital: contribution + dividends
   - And the calculation is shown: "$2,000 + $150 = $2,150 available"

5. **AC-6.1.5: Optional Dividends**
   - Given I want to skip dividends entry
   - When I leave the field empty or enter 0
   - Then only the contribution is used
   - And this is valid (dividends are optional)

## Tasks / Subtasks

### Task 1: Validate Existing Contribution Infrastructure (AC: 6.1.1, 6.1.2, 6.1.3, 6.1.4, 6.1.5)

- [ ] 1.1: Verify `useContribution` hook in `src/hooks/use-contribution.ts` implements all AC requirements
- [ ] 1.2: Verify `RecommendationInputSection` in `src/components/dashboard/recommendation-input-section.tsx` displays contribution and dividends inputs
- [ ] 1.3: Verify `ContributionInput` component handles validation and locale formatting
- [ ] 1.4: Verify `DividendsInput` component defaults to zero and validates properly
- [ ] 1.5: Verify total investable calculation in `useContribution` hook
- [ ] 1.6: Document existing implementation status in Dev Notes

### Task 2: Gap Analysis and Missing Features (All AC)

- [ ] 2.1: Compare existing implementation against AC-6.1.1 through AC-6.1.5
- [ ] 2.2: Identify any missing features from existing implementation
- [ ] 2.3: Document gaps that need implementation
- [ ] 2.4: If no gaps found, document that story is already implemented

### Task 3: Validate Default Contribution Save Feature (AC: 6.1.2)

- [ ] 3.1: Verify `saveAsDefault` function in `useContribution` hook
- [ ] 3.2: Verify API endpoint `/api/user/settings` accepts defaultContribution updates
- [ ] 3.3: Verify default contribution is loaded on mount

### Task 4: Validate Locale-Aware Display (AC: 6.1.2, 6.1.4)

- [ ] 4.1: Verify `SimpleCurrencyDisplay` component uses `useNumberFormat` for locale formatting
- [ ] 4.2: Verify currency symbol matches user's base currency
- [ ] 4.3: Verify decimal separator matches user's locale

### Task 5: Unit Tests Validation (All AC)

- [ ] 5.1: Verify existing unit tests for `useContribution` hook
- [ ] 5.2: Add any missing unit tests for contribution validation
- [ ] 5.3: Add any missing unit tests for dividends validation
- [ ] 5.4: Add tests for total investable calculation

### Task 6: Integration Tests (AC: 6.1.1, 6.1.4)

- [ ] 6.1: Verify existing integration tests for `/api/user/settings` endpoint
- [ ] 6.2: Add integration test for saving default contribution
- [ ] 6.3: Add integration test for loading default contribution

### Task 7: E2E Tests (All AC)

- [ ] 7.1: Add E2E test for entering contribution on dashboard
- [ ] 7.2: Add E2E test for entering dividends on dashboard
- [ ] 7.3: Add E2E test for verifying total investable display
- [ ] 7.4: Add E2E test for saving contribution as default

## Dev Notes

### Existing Infrastructure (SUBSTANTIALLY IMPLEMENTED)

This story's functionality appears to **already be implemented**. The existing codebase contains:

| Component          | Location                                                    | Status   |
| ------------------ | ----------------------------------------------------------- | -------- |
| Contribution Hook  | `src/hooks/use-contribution.ts`                             | Complete |
| Contribution Input | `src/components/recommendations/contribution-input.tsx`     | Complete |
| Dividends Input    | `src/components/recommendations/dividends-input.tsx`        | Complete |
| Input Section      | `src/components/dashboard/recommendation-input-section.tsx` | Complete |
| Validation         | `src/lib/validations/recommendation-schemas.ts`             | Complete |
| Settings API       | `src/app/api/user/settings/route.ts`                        | Complete |

**NOTE:** The existing code references "Story 7.1", "7.2", "7.3" in comments, indicating this was likely implemented during a previous sprint under different story numbers. This story validates the existing implementation meets current AC requirements.

### Existing useContribution Hook Features

From `src/hooks/use-contribution.ts`:

```typescript
interface UseContributionReturn {
  contribution: string; // AC-6.1.1
  setContribution: (value: string) => void;
  error: string | undefined; // AC-6.1.2
  validate: () => boolean; // AC-6.1.2
  isLoading: boolean;
  isSaving: boolean;
  saveAsDefault: () => Promise<boolean>; // Bonus feature
  baseCurrency: string; // AC-6.1.2 locale
  dividends: string; // AC-6.1.3
  setDividends: (value: string) => void; // AC-6.1.3
  dividendsError: string | undefined; // AC-6.1.3
  validateDividendsValue: () => boolean; // AC-6.1.3
  totalInvestable: string; // AC-6.1.4
  refresh: () => Promise<void>;
}
```

### Existing RecommendationInputSection UI

From `src/components/dashboard/recommendation-input-section.tsx`:

- **Contribution Input** with label, validation, and save-as-default option
- **Dividends Input** defaulting to zero with validation
- **Total Investable Display** with currency formatting
- **Hero-style "You have $X to invest"** prominent display (AC-6.1.4)
- **Capital Breakdown** showing "Contribution + Dividends = Total"

### What This Story Should Validate

Since implementation exists, this story should:

1. **Verify** existing implementation meets all AC requirements
2. **Add tests** if missing for any AC
3. **Fix** any gaps between existing code and AC requirements
4. **Document** completion once validated

### Expected Outcome

This story is likely a **validation story** confirming existing implementation. Tasks focus on:

- Gap analysis against AC
- Test coverage validation
- Documentation of existing functionality

### Critical Implementation Rules (From project-context.md)

- NEVER use `console.log/error` - use `logger` from `@/lib/telemetry/logger`
- Use standardized responses from `@/lib/api/responses.ts`
- Use `Decimal.js` for all financial calculations (already used in `use-contribution.ts`)
- Use `useNumberFormat()` for locale-aware display (verify usage)

### Previous Epic Learnings

**From Epic 5:**

1. Existing infrastructure often suffices - focus on validation and gap analysis
2. E2E tests should be defensive with conditional skips for CI
3. Integration tests are critical for validating data flow

**From Epic 3:**

1. Visual feedback components (like the total investable hero) need E2E verification
2. Ensure component is properly wired into parent pages

### File Structure Notes

Test files should follow established patterns:

- Unit tests: `tests/unit/hooks/use-contribution.test.ts`
- Integration tests: `tests/integration/user-settings.test.ts`
- E2E tests: `tests/e2e/contribution.spec.ts`

### References

- [Source: `src/hooks/use-contribution.ts`] - Contribution hook implementation
- [Source: `src/components/dashboard/recommendation-input-section.tsx`] - UI component
- [Source: `src/components/recommendations/contribution-input.tsx`] - Input component
- [Source: `src/components/recommendations/dividends-input.tsx`] - Dividends input
- [Source: `src/lib/validations/recommendation-schemas.ts`] - Validation schemas
- [Source: `src/app/api/user/settings/route.ts`] - Settings API
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 6.1`] - Story requirements
- [Source: `_bmad-output/project-context.md`] - Implementation rules

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
