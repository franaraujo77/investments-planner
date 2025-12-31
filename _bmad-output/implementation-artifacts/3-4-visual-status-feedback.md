# Story 3.4: Visual Status Feedback

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **color-coded feedback on my allocation health**,
So that **I can quickly identify problems and understand how to fix them**.

## Acceptance Criteria

### AC-3.4.1: Healthy Allocation Display (Within Range)

- **Given** my allocation is within target ranges
- **When** I view the allocation display
- **Then** items are shown in green (healthy)

### AC-3.4.2: Attention Needed Display (Slightly Outside)

- **Given** my allocation is slightly outside target range (within 5%)
- **When** I view the allocation display
- **Then** items are shown in yellow/amber (attention needed)

### AC-3.4.3: Problem Display (Significantly Outside)

- **Given** my allocation is significantly outside target range (>5%)
- **When** I view the allocation display
- **Then** items are shown in red (problem)

### AC-3.4.4: Error Messages with Guidance

- **Given** I have a validation error
- **When** the error is displayed
- **Then** I see a clear message explaining the issue
- **And** guidance on how to fix it (e.g., "Reduce stocks by 10% to reach 100%")

### AC-3.4.5: Field-Level Error Styling

- **Given** a field has an error
- **When** I view the form
- **Then** the field border is red
- **And** error text appears below the field

### AC-3.4.6: Field-Level Valid Styling

- **Given** a field is valid and has been touched
- **When** I view the form
- **Then** the field border is green
- **And** no error text is shown

## Tasks / Subtasks

### CRITICAL NOTE: BUILD ON EXISTING INFRASTRUCTURE

Stories 3.1, 3.2, and 3.3 created significant foundation for this story:

**From Story 3.2 - Already Exists:**

```typescript
// src/components/forms/allocation-indicator.tsx
export type AllocationState = "underallocated" | "valid" | "overallocated";
export function getState(remaining: number, valid: boolean): AllocationState;
export function getStateStyles(state: AllocationState): { textColor; bgColor; progressColor };
```

**From project-context.md - Already Established:**

```typescript
// Form validation UX pattern
className={cn(
  "border",
  errors.percentage && "border-destructive",
  !errors.percentage && touchedFields.percentage && "border-green-500"
)}
```

**DO NOT recreate existing logic.** Extend the current `getStateStyles()` for range-based states.

### Task 1: Extend AllocationState for Range-Based Feedback (AC: 3.4.1-3.4.3)

- [x] Subtask 1.1: Update `src/components/forms/allocation-indicator.tsx`
- [x] Subtask 1.2: Add new state type for range-based feedback:
  ```typescript
  export type AllocationHealthState =
    | "healthy" // Within target range (green)
    | "attention" // Within 5% of range (amber/yellow)
    | "problem"; // >5% outside range (red)
  ```
- [x] Subtask 1.3: Create helper function:
  ```typescript
  export function getAllocationHealthState(
    current: number,
    targetMin: number,
    targetMax: number,
    tolerance: number = 5
  ): AllocationHealthState {
    // Within range → healthy
    // Within tolerance → attention
    // Outside tolerance → problem
  }
  ```
- [x] Subtask 1.4: Create styling function:
  ```typescript
  export function getHealthStateStyles(state: AllocationHealthState): {
    textColor: string;
    bgColor: string;
    borderColor: string;
  };
  ```
- [x] Subtask 1.5: Export new types and functions from `src/components/forms/index.ts`

### Task 2: Create AllocationGuidance Component (AC: 3.4.4)

- [x] Subtask 2.1: Create `src/components/forms/allocation-guidance.tsx`
- [x] Subtask 2.2: Implement component that generates actionable guidance:
  ```typescript
  interface AllocationGuidanceProps {
    current: number;
    target: number; // Target value (e.g., 100%)
    targetMin?: number; // Min of range (for range-based)
    targetMax?: number; // Max of range (for range-based)
    assetClassName?: string; // For specific messaging
    className?: string;
  }
  ```
- [x] Subtask 2.3: Generate contextual messages:
  - Underallocated: "Add {X}% more to reach 100%"
  - Overallocated: "Reduce by {X}% to reach 100%"
  - Range-based: "Reduce {class} by {X}% to reach target range"
- [x] Subtask 2.4: Use lucide-react icons for visual emphasis (Info, AlertTriangle, CheckCircle2)
- [x] Subtask 2.5: Use `useNumberFormat()` for i18n-aware percentage display
- [x] Subtask 2.6: Add accessibility: `role="alert"` for error states, `aria-live="polite"`
- [x] Subtask 2.7: Export from `src/components/forms/index.ts`

### Task 3: Create FormFieldStatus Component (AC: 3.4.5, 3.4.6)

- [x] Subtask 3.1: Create `src/components/forms/form-field-status.tsx`
- [x] Subtask 3.2: Implement reusable field wrapper with status styling:
  ```typescript
  interface FormFieldStatusProps {
    hasError: boolean;
    isTouched: boolean;
    isValid: boolean;
    errorMessage?: string;
    className?: string;
    children: React.ReactNode;
  }
  ```
- [x] Subtask 3.3: Apply border styling per project-context.md:
  - Error: `border-destructive` (red)
  - Valid + Touched: `border-green-500`
  - Default: inherit from parent/Input
- [x] Subtask 3.4: Render error message below field when `hasError`:
  ```tsx
  <p className="text-sm text-destructive mt-1">{errorMessage}</p>
  ```
- [x] Subtask 3.5: Make component work with any form library (not just react-hook-form)
- [x] Subtask 3.6: Export from `src/components/forms/index.ts`

### Task 4: Create FormFieldStatusHook for react-hook-form (AC: 3.4.5, 3.4.6)

- [x] Subtask 4.1: Create `src/hooks/useFormFieldStatus.ts`
- [x] Subtask 4.2: Implement hook that extracts status from react-hook-form:

  ```typescript
  interface UseFormFieldStatusOptions<TFieldValues extends FieldValues> {
    name: Path<TFieldValues>;
  }

  interface FormFieldStatusResult {
    hasError: boolean;
    isTouched: boolean;
    isValid: boolean;
    errorMessage: string | undefined;
    borderClassName: string; // Pre-computed border class
  }

  export function useFormFieldStatus<TFieldValues extends FieldValues>(
    options: UseFormFieldStatusOptions<TFieldValues>
  ): FormFieldStatusResult;
  ```

- [x] Subtask 4.3: Use `useFormContext()` to get form state
- [x] Subtask 4.4: Compute border class based on error/touched/valid:
  ```typescript
  const borderClassName = useMemo(() => {
    if (hasError) return "border-destructive";
    if (isTouched && !hasError) return "border-green-500";
    return "";
  }, [hasError, isTouched]);
  ```
- [x] Subtask 4.5: Create barrel export `src/hooks/index.ts` if doesn't exist
- [x] Subtask 4.6: Export from hooks barrel

### Task 5: Create AllocationHealthIndicator Component (AC: 3.4.1-3.4.3)

- [x] Subtask 5.1: Create `src/components/forms/allocation-health-indicator.tsx`
- [x] Subtask 5.2: Implement component for range-based allocation feedback:
  ```typescript
  interface AllocationHealthIndicatorProps {
    current: number;
    targetMin: number;
    targetMax: number;
    label?: string; // e.g., "Stocks", "Bonds"
    tolerance?: number; // Default 5%
    showGuidance?: boolean; // Show guidance message
    className?: string;
  }
  ```
- [x] Subtask 5.3: Use `getAllocationHealthState()` for state calculation
- [x] Subtask 5.4: Use `getHealthStateStyles()` for consistent styling
- [x] Subtask 5.5: Integrate `AllocationGuidance` when `showGuidance` is true
- [x] Subtask 5.6: Add accessibility attributes
- [x] Subtask 5.7: Export from `src/components/forms/index.ts`

### Task 6: Unit Tests

- [x] Subtask 6.1: Create `tests/unit/components/allocation-guidance.test.tsx`
  - Test underallocated message generation
  - Test overallocated message generation
  - Test range-based message generation
  - Test i18n formatting
  - Test accessibility attributes
- [x] Subtask 6.2: Create `tests/unit/components/allocation-health-indicator.test.tsx`
  - Test healthy state (within range)
  - Test attention state (within 5% tolerance)
  - Test problem state (>5% outside range)
  - Test edge cases (0%, 100%, boundary values)
  - Test with custom tolerance values
- [x] Subtask 6.3: Create `tests/unit/components/form-field-status.test.tsx`
  - Test error state rendering
  - Test valid + touched state rendering
  - Test default state rendering
  - Test error message display
- [x] Subtask 6.4: Create `tests/unit/hooks/useFormFieldStatus.test.ts`
  - Test error detection from form context
  - Test touched detection
  - Test border class computation
  - Test within FormProvider context
- [x] Subtask 6.5: Extend `tests/unit/components/allocation-indicator.test.tsx`
  - Add tests for `getAllocationHealthState()`
  - Add tests for `getHealthStateStyles()`

### Task 7: Integration into Existing Forms

- [x] Subtask 7.1: Update `src/components/portfolio/edit-holding-modal.tsx`
  - Applied `getFieldBorderClassName()` for quantity and purchasePrice fields
  - Added `touchedFields` to formState destructure
  - Added `role="alert"` to error messages
- [x] Subtask 7.2: Update `src/components/portfolio/add-asset-modal.tsx`
  - Applied `getFieldBorderClassName()` for quantity and purchasePrice fields
  - Added `touchedFields` to formState destructure
  - Added `role="alert"` to error messages
- [x] Subtask 7.3: Update `src/components/portfolio/portfolio-edit-form.tsx`
  - Applied `getFieldBorderClassName()` for name field
  - Added `touchedFields` to formState destructure
- [x] Subtask 7.4: Update `src/components/portfolio/portfolio-create-form.tsx`
  - Applied `getFieldBorderClassName()` for name field
  - Added `touchedFields` to formState destructure
- [x] Subtask 7.5: Document integration pattern in Dev Notes for future forms

### Task 8: E2E Tests

- [x] Subtask 8.1: Add tests to `tests/e2e/portfolio.spec.ts` for Story 3.4
- [x] Subtask 8.2: Test green border on valid touched fields (Edit Modal, Add Modal, Create Form)
- [x] Subtask 8.3: Test red border on error fields (Edit Modal, Add Modal)
- [x] Subtask 8.4: Test error message display with role="alert" for accessibility
- [x] Subtask 8.5: Test color transitions between error and valid states
- [x] Subtask 8.6: Tests cover Edit Holding Modal, Add Asset Modal, Portfolio Create Form

### Task 9: Verification

- [x] Subtask 9.1: `pnpm lint` - 0 errors (fixed unused variable warnings)
- [x] Subtask 9.2: `pnpm build` - successful build (fixed exactOptionalPropertyTypes issues)
- [x] Subtask 9.3: `pnpm test:unit` - all 4018 tests pass (178 test files)
- [x] Subtask 9.4: Visual verification (E2E tests cover border colors and transitions)

## Dev Notes

### CRITICAL: Reuse Existing Infrastructure

**From Story 3.2:**

```typescript
// Already exists in src/components/forms/allocation-indicator.tsx
export type AllocationState = "underallocated" | "valid" | "overallocated";
export function getState(remaining: number, valid: boolean): AllocationState;
export function getStateStyles(state: AllocationState): { textColor; bgColor; progressColor };
```

**DO NOT duplicate this logic.** This story EXTENDS it with:

1. New `AllocationHealthState` type for range-based states (healthy/attention/problem)
2. New `getAllocationHealthState()` function for range calculations
3. New `getHealthStateStyles()` function for range-based styling

### Color Palette (Consistent with Previous Stories)

| State     | Text Color                               | Background                                 |
| --------- | ---------------------------------------- | ------------------------------------------ |
| Healthy   | `text-emerald-600 dark:text-emerald-400` | `bg-emerald-100/50 dark:bg-emerald-900/20` |
| Attention | `text-amber-600 dark:text-amber-400`     | `bg-amber-100/50 dark:bg-amber-900/20`     |
| Problem   | `text-red-600 dark:text-red-400`         | `bg-red-100/50 dark:bg-red-900/20`         |

### Field Styling Per project-context.md

```typescript
// MANDATORY pattern from project-context.md
className={cn(
  "border",
  errors.percentage && "border-destructive",
  !errors.percentage && touchedFields.percentage && "border-green-500"
)}
```

The `useFormFieldStatus()` hook encapsulates this logic for reuse.

### Guidance Message Generation Logic

```typescript
// Underallocated (simple 100% target)
if (current < 100) {
  const needed = Math.abs(100 - current);
  return `Add ${formatPercent(needed / 100)} more to reach 100%`;
}

// Overallocated (simple 100% target)
if (current > 100) {
  const excess = current - 100;
  return `Reduce by ${formatPercent(excess / 100)} to reach 100%`;
}

// Range-based (e.g., Stocks should be 40-50%)
if (current < targetMin) {
  const needed = targetMin - current;
  return `Increase ${assetClassName} by ${formatPercent(needed / 100)} to reach minimum`;
}
if (current > targetMax) {
  const excess = current - targetMax;
  return `Reduce ${assetClassName} by ${formatPercent(excess / 100)} to reach maximum`;
}
```

### Floating-Point Tolerance

Per project-context.md and Story 3.3, use tolerance for floating-point precision:

```typescript
// Allow tiny floating point errors
const isWithinRange = current >= targetMin - 0.01 && current <= targetMax + 0.01;
```

### i18n Number Formatting

**MANDATORY:** Use `useNumberFormat()` hook for all displayed percentages:

```typescript
const { formatPercent } = useNumberFormat();
// formatPercent expects decimal: 0.45 for 45%
<span>{formatPercent(current / 100)}</span>
```

### Component Locations

Per architecture document:

```
src/components/forms/
├── allocation-indicator.tsx           ← UPDATE (add health state functions)
├── allocation-guidance.tsx            ← NEW (this story)
├── allocation-health-indicator.tsx    ← NEW (this story)
├── form-field-status.tsx              ← NEW (this story)
└── index.ts                           ← UPDATE exports

src/hooks/
├── useFormFieldStatus.ts              ← NEW (this story)
├── useUnsavedChangesWarning.ts        ← EXISTS (Story 2.3)
└── index.ts                           ← NEW (barrel export)
```

### Accessibility Requirements

| Component                 | ARIA Attributes                                |
| ------------------------- | ---------------------------------------------- |
| AllocationGuidance        | `role="alert"` (error), `role="status"` (info) |
| AllocationHealthIndicator | `role="status"`, `aria-live="polite"`          |
| FormFieldStatus           | Error message with `role="alert"`              |
| All icons                 | `aria-hidden="true"`                           |

### Previous Story Intelligence

**From Story 3.2 (Live Allocation Indicator):**

1. **Export helper functions for testing** - Don't duplicate logic in tests; import actual functions
2. **Integration verification required** - Ensure new components are actually used in forms
3. **E2E tests must navigate and assert** - Tests should verify component visibility before testing
4. **Accessibility attributes mandatory** - `role="status"`, `aria-live="polite"` on dynamic elements

**From Story 3.3 (Allocation Validation) - Parallel Story:**

- Story 3.3 is `ready-for-dev` and creates `FormValidityIndicator`
- This story's `FormFieldStatus` is for **field-level** feedback
- Story 3.3's component is for **form-level** (save button) feedback
- **No conflict** - different levels of abstraction

### Git Intelligence from Recent Commits

Commit patterns from Story 3.2 (`7d80cbc`):

- Create component with accessibility features
- Export helper functions for testing (not just internal use)
- Integration into actual pages (not just creating isolated components)
- Comprehensive unit tests testing exported functions
- E2E tests on actual pages where component is rendered
- Code review identified missing integration - same risk for this story

### Dependencies

Ensure these are available (should already be installed):

- `react-hook-form` - Form context and watch
- `lucide-react` - Icons (Info, AlertTriangle, CheckCircle2)
- shadcn components: Already using in project

### Performance Considerations

- Use `useMemo` for computed styles and messages
- `useFormFieldStatus()` should use `useMemo` for border class computation
- Components should only re-render when relevant props change

### Integration Pattern for Future Forms

To apply visual status feedback to any react-hook-form Input field:

```typescript
// 1. Import dependencies
import { cn } from "@/lib/utils";
import { getFieldBorderClassName } from "@/components/forms/form-field-status";

// 2. Add touchedFields to formState destructure
const { formState: { errors, touchedFields } } = useForm();

// 3. Apply to Input component
<Input
  aria-invalid={!!errors.fieldName}
  aria-describedby={errors.fieldName ? "fieldName-error" : undefined}
  className={cn(
    "border",
    getFieldBorderClassName({
      hasError: !!errors.fieldName,
      isTouched: !!touchedFields.fieldName,
      isValid: !errors.fieldName && !!touchedFields.fieldName,
    })
  )}
  {...register("fieldName")}
/>

// 4. Add role="alert" to error messages
{errors.fieldName && (
  <p id="fieldName-error" role="alert" className="text-sm text-destructive">
    {errors.fieldName.message}
  </p>
)}
```

**Key Points:**

- Use `getFieldBorderClassName()` for consistent styling across all forms
- Always add `role="alert"` to error messages for accessibility
- Include `aria-invalid` and `aria-describedby` for screen readers
- Combine with `cn()` utility to preserve existing classes

### Project Structure Notes

**Alignment with unified project structure:**

- New components: `src/components/forms/allocation-guidance.tsx`, `form-field-status.tsx`, `allocation-health-indicator.tsx`
- Updated component: `src/components/forms/allocation-indicator.tsx` (add health state functions)
- New hook: `src/hooks/useFormFieldStatus.ts`
- New barrel: `src/hooks/index.ts`
- Tests: `tests/unit/components/`, `tests/unit/hooks/`, `tests/e2e/portfolio.spec.ts`

**No conflicts detected** - All are new files or additive changes.

### References

- [Source: epics.md#Story-3.4] - Story requirements and acceptance criteria
- [Source: project-context.md#Framework-Specific-Rules] - Form validation UX pattern
- [Source: project-context.md#Technology-Stack] - Tailwind color classes, react-hook-form
- [Source: src/components/forms/allocation-indicator.tsx] - getState/getStateStyles functions
- [Source: src/lib/i18n/useNumberFormat.ts] - i18n formatting hook
- [Source: 3-2-live-allocation-indicator.md#Dev-Notes] - Previous story learnings
- [Source: 3-3-allocation-validation.md#Dev-Notes] - Related story context

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed floating-point tolerance issue: `|99.99 - 100| = 0.010000000000005116` required increasing FP_TOLERANCE from 0.01 to 0.02
- Fixed exactOptionalPropertyTypes compliance: Added `| undefined` to optional props in AllocationGuidanceProps and HealthIndicatorData
- Fixed unused variable linting warnings: Added underscore prefix to unused destructured params

### Completion Notes List

1. **Task 1-5**: Created core visual feedback infrastructure:
   - Extended AllocationState with AllocationHealthState (healthy/attention/problem)
   - Created AllocationGuidance component with contextual messages
   - Created FormFieldStatus component and getFieldBorderClassName utility
   - Created useFormFieldStatus hook for react-hook-form integration
   - Created AllocationHealthIndicator for range-based allocation display

2. **Task 6**: All unit tests implemented and passing (132 new tests across 5 test files)

3. **Task 7**: Integrated visual feedback into existing forms:
   - edit-holding-modal.tsx: quantity and purchasePrice fields
   - add-asset-modal.tsx: quantity and purchasePrice fields
   - portfolio-edit-form.tsx: name field
   - portfolio-create-form.tsx: name field

4. **Task 8**: E2E tests added to portfolio.spec.ts testing border colors, error messages, and state transitions

5. **Task 9**: All verifications passed:
   - `pnpm lint`: 0 errors
   - `pnpm build`: successful
   - `pnpm test:unit`: 4018 tests pass (178 test files)

### File List

**New Files Created:**

- `src/components/forms/allocation-guidance.tsx`
- `src/components/forms/form-field-status.tsx`
- `src/components/forms/allocation-health-indicator.tsx`
- `src/hooks/useFormFieldStatus.ts`
- `src/hooks/index.ts`
- `tests/unit/components/allocation-guidance.test.tsx`
- `tests/unit/components/form-field-status.test.tsx`
- `tests/unit/components/allocation-health-indicator.test.tsx`
- `tests/unit/hooks/useFormFieldStatus.test.ts`

**Files Modified:**

- `src/components/forms/allocation-indicator.tsx` - Added AllocationHealthState, getAllocationHealthState(), getHealthStateStyles()
- `src/components/forms/index.ts` - Added exports for new components
- `src/components/portfolio/edit-holding-modal.tsx` - Added visual status feedback
- `src/components/portfolio/add-asset-modal.tsx` - Added visual status feedback
- `src/components/portfolio/portfolio-edit-form.tsx` - Added visual status feedback
- `src/components/portfolio/portfolio-create-form.tsx` - Added visual status feedback
- `tests/unit/components/allocation-indicator.test.tsx` - Added tests for health state functions
- `tests/e2e/portfolio.spec.ts` - Added Story 3.4 visual status feedback tests

---

## Code Review

### Review Summary

**Reviewed by:** Claude Opus 4.5 (code-review workflow)
**Date:** 2025-12-30
**Outcome:** APPROVED with fixes applied

### Issues Identified and Fixed

| Severity | Issue                                                                                             | Fix Applied                                                            |
| -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| MEDIUM   | FormFieldStatus component had unused `isTouched`/`isValid` props                                  | Added `data-touched`, `data-valid`, `data-error` attributes to wrapper |
| MEDIUM   | Missing `role="alert"` on error messages in portfolio-edit-form.tsx and portfolio-create-form.tsx | Added `role="alert"` to name field error messages                      |
| MEDIUM   | Hooks barrel export missing useUnsavedChangesWarning                                              | Added export + fixed interface to be exported                          |
| LOW      | Inconsistent floating-point tolerance (0.01 vs 0.02)                                              | Created unified `ALLOCATION_FP_TOLERANCE = 0.02` constant              |
| LOW      | Misleading test comments about E2E coverage                                                       | Updated comments to clarify infrastructure component status            |
| LOW      | E2E tests used fragile `waitForTimeout(100)`                                                      | Replaced with Playwright's `toHaveClass(/regex/)` assertions           |

### Verification Results

- **TypeScript:** Clean compilation, no errors
- **ESLint:** 0 errors, 0 warnings
- **Unit Tests:** 4018 tests passing (178 files)
- **Git/Story Alignment:** All files match story File List

---

## Change Log

| Date       | Change                                         | Author                        |
| ---------- | ---------------------------------------------- | ----------------------------- |
| 2025-12-30 | Story created via create-story workflow        | SM Agent                      |
| 2025-12-30 | Implementation complete - Status: review       | Dev Agent (Claude Opus 4.5)   |
| 2025-12-30 | Code review complete with fixes - Status: done | Code Review (Claude Opus 4.5) |
