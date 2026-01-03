# Story 7.7: API Precision i18n Refactoring

Status: backlog

## Story

As a **user with non-US locale**,
I want **calculation breakdowns and API responses to respect my locale settings**,
so that **numbers are displayed with my preferred decimal and thousand separators**.

## Background

This story addresses a technical debt item identified during PR review of Story 7.6. The current implementation uses `.toFixed()` for server-side formatting which:

- Uses en-US locale (period as decimal separator)
- Doesn't respect user's locale preference (e.g., pt-BR uses comma as decimal separator)
- Pre-formats values server-side instead of allowing client-side i18n formatting

**Current State (Documented in commit 5f37a9f):**

- API routes use `.toFixed()` for calculation transparency values
- JSDoc documentation explains precision expectations
- TODO(i18n) comments mark areas needing enhancement
- Values are consumed by calculation transparency modal

**Why This Works for Now:**

- Calculation transparency is audit-focused (precision > formatting)
- Formulas are in English (mathematical notation)
- Limited user impact (calculation modal, not primary UI)

## Acceptance Criteria

### AC-7.7.1: Raw Numeric Values in Breakdown API

**Given** the `/api/recommendations/:id/breakdown` endpoint returns calculation steps
**When** I call the API
**Then** values should include raw numeric data alongside display strings
**And** the response should include a `type` field ("percent", "currency", "number")

### AC-7.7.2: Client-Side Locale-Aware Formatting

**Given** the CalculationSteps component receives raw numeric values
**When** rendering values for pt-BR locale
**Then** percentages display with comma separator (e.g., "15,50%")
**And** currency displays with locale-appropriate formatting (e.g., "R$ 800,00")

### AC-7.7.3: Score Inputs API i18n Support

**Given** the `/api/scores/:assetId/inputs` endpoint returns score data
**When** I call the API
**Then** `percentage` and `maxPossible` fields include raw numeric values
**And** client-side formatting respects user locale

### AC-7.7.4: Backward Compatibility

**Given** existing consumers of these API endpoints
**When** the refactoring is deployed
**Then** pre-formatted `value` strings remain available for backward compatibility
**And** new `rawValue` and `type` fields are additive (non-breaking)

## Tasks / Subtasks

### Task 1: Define Extended CalculationStep Type (AC: 7.7.1, 7.7.4)

**Goal:** Extend the CalculationStep interface with raw numeric values.

- [ ] 1.1: Add `rawValue?: number` field to CalculationStep type
- [ ] 1.2: Add `valueType?: "percent" | "currency" | "number"` field
- [ ] 1.3: Keep existing `value: string` for backward compatibility
- [ ] 1.4: Update JSDoc documentation with migration guidance
- [ ] 1.5: Add unit tests for type validation

### Task 2: Update Breakdown API to Include Raw Values (AC: 7.7.1)

**Goal:** Modify buildCalculationSteps to return both formatted and raw values.

- [ ] 2.1: Update `buildCalculationSteps()` to include rawValue
- [ ] 2.2: Update `generateReasoning()` to use template tokens instead of inline formatting
- [ ] 2.3: Update `calculateTargetRange()` to return numeric values
- [ ] 2.4: Add unit tests for breakdown API response format
- [ ] 2.5: Update API documentation with new response schema

### Task 3: Update CalculationSteps Component (AC: 7.7.2)

**Goal:** Use useNumberFormat hook for locale-aware display.

- [ ] 3.1: Import useNumberFormat in CalculationSteps component
- [ ] 3.2: Create helper to format value based on type
- [ ] 3.3: Prefer rawValue + type when available, fallback to value string
- [ ] 3.4: Add unit tests for locale-specific formatting
- [ ] 3.5: Test with pt-BR and en-US locales

### Task 4: Update Score Inputs API (AC: 7.7.3)

**Goal:** Extend score inputs endpoint with raw numeric values.

- [ ] 4.1: Add rawPercentage and rawMaxPossible to response
- [ ] 4.2: Keep existing string fields for backward compatibility
- [ ] 4.3: Update unit tests for extended response
- [ ] 4.4: Update API documentation

### Task 5: Integration Testing (AC: 7.7.1, 7.7.2, 7.7.3)

**Goal:** Verify end-to-end i18n formatting works correctly.

- [ ] 5.1: Add E2E test with pt-BR locale user
- [ ] 5.2: Verify calculation modal displays locale-formatted values
- [ ] 5.3: Verify score inputs display correctly in score breakdown modal
- [ ] 5.4: Test backward compatibility with existing API consumers

## Technical Notes

### Files to Modify

**Types:**

- `src/lib/types/recommendations.ts` - CalculationStep interface

**API Routes:**

- `src/app/api/recommendations/[id]/breakdown/route.ts` - buildCalculationSteps, generateReasoning
- `src/app/api/scores/[assetId]/inputs/route.ts` - percentage, maxPossible

**Components:**

- `src/components/recommendations/calculation-steps.tsx` - use useNumberFormat

**Tests:**

- `tests/unit/api/breakdown.test.ts` - new file
- `tests/unit/components/calculation-steps.test.tsx` - add locale tests
- `tests/e2e/calculation-transparency.spec.ts` - add locale test

### Dependencies

- No new dependencies required
- Uses existing `useNumberFormat` hook from `@/lib/i18n/useNumberFormat`

### Risks and Mitigations

| Risk                            | Mitigation                                            |
| ------------------------------- | ----------------------------------------------------- |
| Breaking existing API consumers | Additive changes only, keep existing fields           |
| Increased response payload size | Minimal impact (~20 bytes per step)                   |
| Component rendering issues      | Fallback to existing string format if raw unavailable |

## Definition of Done

- [ ] All acceptance criteria verified
- [ ] Unit tests pass with >80% coverage for modified files
- [ ] E2E tests pass for both en-US and pt-BR locales
- [ ] API documentation updated
- [ ] No breaking changes to existing consumers
- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] PR approved and merged

## Related

- **Parent Epic:** Epic 7: Data Transparency & Alerts
- **Related Story:** Story 7.2: Calculation Transparency
- **Preceding Work:** Story 7.6 PR review (commit 5f37a9f)
- **FR Reference:** FR10 (System respects user's locale for number formatting)

## File List

Once implementation begins, this section will be populated with:

- Files created
- Files modified
- Files deleted
