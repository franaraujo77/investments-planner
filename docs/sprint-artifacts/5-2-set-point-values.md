# Story 5.2: Set Point Values

**Status:** done
**Epic:** Epic 5 - Scoring Engine
**Previous Story:** 5.1 Define Scoring Criteria (Status: review)

---

## Story

**As a** user
**I want to** set point values for each criterion
**So that** I can weight factors based on importance to my investment strategy

---

## Acceptance Criteria

### AC-5.2.1: Points Input Accepts Valid Range

- **Given** I am editing a criterion's points value
- **When** I enter a value
- **Then** the system accepts integers from -100 to +100
- **And** values outside this range are rejected with validation error

### AC-5.2.2: Visual Point Value Indicators

- **Given** I am viewing criteria in the criteria list
- **When** points are displayed
- **Then** positive points are displayed with green indicator/badge
- **And** negative points are displayed with red indicator/badge
- **And** zero points display with neutral/gray indicator

### AC-5.2.3: Cerrado Historical Surplus Scoring Support

- **Given** I am creating a criterion for historical surplus consistency
- **When** I select the "surplus_years" metric
- **Then** the system supports the Cerrado methodology:
  - +5 points for 5 consecutive years of surplus
  - -2 points per missing year of surplus
- **And** this calculation can be configured as a criterion template

### AC-5.2.4: Point Impact Preview on Hover

- **Given** I am viewing a criterion in the list
- **When** I hover over the points badge
- **Then** I see a tooltip showing the potential impact:
  - "This criterion awards +10 points to matching assets"
  - Or "This criterion penalizes -5 points from non-matching assets"

---

## Technical Notes

### Building on Story 5.1

This story extends the criteria functionality implemented in Story 5.1. The `points` field and basic validation were already added to the `CriterionRule` interface:

```typescript
// From Story 5.1 - lib/validations/criteria-schemas.ts
interface CriterionRule {
  id: string;
  name: string;
  metric: string;
  operator: "gt" | "lt" | "gte" | "lte" | "between" | "equals" | "exists";
  value: string;
  value2?: string;
  points: number; // -100 to +100
  requiredFundamentals: string[];
  sortOrder: number;
}
```

[Source: docs/sprint-artifacts/5-1-define-scoring-criteria.md#Technical-Notes]

### Points Validation Schema Enhancement

Enhance the existing validation to include better error messages:

```typescript
// lib/validations/criteria-schemas.ts
export const pointsSchema = z
  .number()
  .int({ message: "Points must be a whole number" })
  .min(-100, { message: "Points cannot be less than -100" })
  .max(100, { message: "Points cannot exceed +100" });
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Non-Functional-Requirements]

### PointsBadge Component

Per architecture component inventory, create a dedicated component for points display:

```typescript
// src/components/criteria/points-badge.tsx
interface PointsBadgeProps {
  points: number;
  showTooltip?: boolean;
}
```

| Points Value   | Background Color | Text Color | Icon          |
| -------------- | ---------------- | ---------- | ------------- |
| > 0 (positive) | green-100        | green-700  | Plus or none  |
| < 0 (negative) | red-100          | red-700    | Minus or none |
| = 0 (neutral)  | gray-100         | gray-600   | None          |

[Source: docs/architecture.md#Frontstage-UI-Components]

### Cerrado Methodology Implementation

The Cerrado methodology for historical surplus scoring is a specific pattern used in Brazilian market analysis:

- **5 consecutive years of surplus:** Award maximum points (+5 as base)
- **Missing years:** Deduct points per missing year (-2 per year)
- **Formula:** `points = basePoints - (missingYears × penaltyPerYear)`

This should be implemented as a criterion template that users can add:

```typescript
// Example Cerrado criterion template
const cerradoTemplate: CriterionRule = {
  id: generateId(),
  name: "Historical Surplus Consistency (Cerrado)",
  metric: "surplus_years",
  operator: "gte",
  value: "5",
  points: 5, // Base award for meeting threshold
  requiredFundamentals: ["surplus_history"],
  sortOrder: 0,
};
```

[Source: docs/epics.md#Story-5.2-Set-Point-Values]

### UI Integration with CriteriaBlock

The points input should integrate with the existing CriteriaBlock component from Story 5.1:

- Points field uses number input with +/- buttons
- Auto-save on blur (same pattern as other fields)
- Visual feedback on save (checkmark animation)
- Color indicator updates immediately on value change

[Source: docs/sprint-artifacts/5-1-define-scoring-criteria.md#Tasks]

---

## Tasks

### Task 1: Enhance Points Validation Schema (AC: 5.2.1)

**Files:** `src/lib/validations/criteria-schemas.ts`

- [x] Add dedicated `pointsSchema` with descriptive error messages
- [x] Ensure integer-only validation (no decimals)
- [x] Add validation for range -100 to +100
- [x] Unit tests for validation edge cases (-100, 0, +100, -101, +101, 50.5)

### Task 2: Create PointsBadge Component (AC: 5.2.2)

**Files:** `src/components/criteria/points-badge.tsx`

- [x] Create PointsBadge component with color-coded display _(Existed from Story 5.1)_
- [x] Implement green/red/gray backgrounds based on point value _(Existed from Story 5.1)_
- [x] Add +/- prefix to display _(Existed from Story 5.1)_
- [x] Support size variants (sm, md, lg) _(Existed from Story 5.1)_
- [x] Accessible with proper aria-labels _(Existed from Story 5.1)_
- [x] Unit tests for color logic _(Existed from Story 5.1)_

### Task 3: Add Tooltip to PointsBadge (AC: 5.2.4)

**Files:** `src/components/criteria/points-badge.tsx`

- [x] Add optional tooltip prop using shadcn Tooltip _(Existed from Story 5.1)_
- [x] Tooltip content shows impact description _(Existed from Story 5.1)_
- [x] Dynamic text based on positive/negative _(Existed from Story 5.1)_
- [x] Test tooltip accessibility _(Existed from Story 5.1)_

### Task 4: Integrate Points Input in CriteriaBlock (AC: 5.2.1, 5.2.2)

**Files:** `src/components/fintech/criteria-block.tsx`

- [x] Replace basic points input with enhanced number input _(Existed from Story 5.1)_
- [x] Add +/- increment buttons _(Existed from Story 5.1)_
- [x] Add PointsBadge next to input for visual feedback _(Existed from Story 5.1)_
- [x] Ensure auto-save on blur works correctly _(Existed from Story 5.1)_
- [x] Color indicator updates in real-time _(Existed from Story 5.1)_
- [x] Test keyboard navigation (arrow keys for increment) _(Existed from Story 5.1)_

### Task 5: Create Cerrado Criterion Template (AC: 5.2.3)

**Files:** `src/lib/constants/criteria-templates.ts`

- [x] Create new file for criterion templates
- [x] Add Cerrado surplus consistency template
- [x] Export template for use in criteria form
- [x] Document template purpose and methodology

### Task 6: Add Template Selection to CriteriaForm (AC: 5.2.3)

**Files:** `src/components/criteria/criteria-form.tsx`

- [x] Add "Start from template" dropdown in form
- [x] Include Cerrado template option
- [x] Pre-fill form fields when template selected
- [x] Allow modification after template selection
- [x] Test template selection flow

### Task 7: Update CriteriaList to Use PointsBadge (AC: 5.2.2, 5.2.4)

**Files:** `src/components/criteria/criteria-list.tsx`

- [x] Replace inline points display with PointsBadge component _(Via CriteriaBlock from Story 5.1)_
- [x] Enable tooltips in list view _(Via CriteriaBlock from Story 5.1)_
- [x] Verify visual consistency across list items

### Task 8: Create Unit Tests for Points Functionality (AC: All)

**Files:** `tests/unit/components/points-badge.test.tsx`, `tests/unit/validations/points.test.ts`

- [x] PointsBadge renders correct colors for positive/negative/zero _(Covered in Story 5.1)_
- [x] PointsBadge displays tooltip on hover _(Covered in Story 5.1)_
- [x] Points validation rejects out-of-range values
- [x] Points validation rejects decimal values
- [x] Cerrado template has correct default values

### Task 9: Create Integration Tests (AC: All)

**Files:** `tests/unit/api/criteria-points.test.ts`

- [x] API accepts valid points values _(Covered in Story 5.1)_
- [x] API rejects invalid points values with proper error _(Covered in Story 5.1)_
- [x] Criteria update with new points creates new version _(Covered in Story 5.1)_
- [x] Points value persists correctly in database _(Covered in Story 5.1)_

### Task 10: Run Verification

- [x] `pnpm lint` - warnings only (pre-existing console.log from previous stories)
- [x] `pnpm build` - successful build
- [x] `pnpm test` - 1068 tests pass (25 skipped)

---

## Dependencies

- **Story 5.1:** Define Scoring Criteria (Status: review) - provides CriteriaBlock, CriteriaForm, criteria-schemas.ts, criteria-service.ts
- **Story 1.2:** Database Schema (Complete) - provides database infrastructure
- **Story 1.3:** Authentication (Complete) - provides auth middleware

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Validation:** All inputs validated with Zod schemas (server-side enforcement)
- **decimal.js:** While points are integers, any calculations involving scores use decimal.js
- **Immutable Versioning:** Point value changes create new criteria versions
- **User Isolation:** All queries scoped by userId
- **React Query:** Use mutations with proper cache invalidation

[Source: docs/architecture.md#Implementation-Patterns]
[Source: docs/architecture.md#Consistency-Rules]

### UX Guidelines

Per UX and architecture specifications:

- **Color coding:** Use semantic colors - green for positive, red for negative (not arbitrary)
- **shadcn/ui:** Use existing Badge and Tooltip components as base
- **Auto-save:** Follow same pattern established in CriteriaBlock (Story 5.1)
- **Feedback:** Visual confirmation (checkmark) on successful save

[Source: docs/architecture.md#Frontstage-UI-Components]

### Testing Standards

Per CLAUDE.md:

- Every code change requires test coverage
- Unit tests for validation schemas and component logic
- Integration tests for API routes
- Component tests using Vitest + Testing Library

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

Following unified project structure from previous stories:

- **Components:** `src/components/criteria/points-badge.tsx` (feature-specific)
- **Validations:** Extend `src/lib/validations/criteria-schemas.ts`
- **Constants:** Create `src/lib/constants/criteria-templates.ts` for reusable templates
- **Tests:** `tests/unit/components/`, `tests/unit/validations/`

[Source: docs/architecture.md#Project-Structure]

### Learnings from Previous Story

**From Story 5.1 - Define Scoring Criteria (Status: review)**

Key context from previous story implementation:

- **Files Created:**
  - `src/lib/validations/criteria-schemas.ts` - Contains `criterionRuleSchema` with points validation
  - `src/lib/services/criteria-service.ts` - Service for criteria CRUD operations
  - `src/components/fintech/criteria-block.tsx` - Notion-style inline editing component
  - `src/components/criteria/criteria-form.tsx` - Form for creating/editing criteria
  - `src/components/criteria/criteria-list.tsx` - List with tabs by asset type
  - `src/hooks/use-criteria.ts` - React Query hooks for criteria
  - `src/app/api/criteria/route.ts` - API routes for criteria management

- **Patterns Established:**
  - Auto-save on blur pattern for inline editing
  - CriteriaService uses immutable versioning (each change = new version)
  - Use `sonner` toast for success/error feedback
  - Tabs component for organizing by asset type

- **Reuse, Don't Recreate:**
  - Use existing `criterionRuleSchema` as base for points validation
  - Extend CriteriaBlock component rather than create new
  - Follow same React Query mutation patterns from `use-criteria.ts`

- **Note:** Story 5.1 is in "review" status - any findings from code review should be incorporated into this story's implementation if applicable.

[Source: docs/sprint-artifacts/5-1-define-scoring-criteria.md#Tasks]
[Source: docs/sprint-artifacts/5-1-define-scoring-criteria.md#Technical-Notes]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.2]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Acceptance-Criteria]
- [Source: docs/epics.md#Story-5.2-Set-Point-Values]
- [Source: docs/architecture.md#Implementation-Patterns]
- [Source: docs/architecture.md#Frontstage-UI-Components]
- [Source: docs/sprint-artifacts/5-1-define-scoring-criteria.md]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/5-2-set-point-values.context.xml`

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes

**Completed:** 2025-12-08
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### Completion Notes List

1. **AC-5.2.1 (Points Input Range):** Enhanced `pointsSchema` with descriptive error messages (POINTS_MUST_BE_INTEGER, POINTS_TOO_LOW, POINTS_TOO_HIGH). Validation accepts integers -100 to +100, rejects decimals and out-of-range values.

2. **AC-5.2.2 (Visual Indicators):** PointsBadge component already existed from Story 5.1 with full color-coding (green/red/gray) and size variants. Verified and integrated into CriteriaBlock and CriteriaList.

3. **AC-5.2.3 (Cerrado Methodology):** Created `criteria-templates.ts` with 7 templates including CERRADO_SURPLUS_TEMPLATE. Added template selector to CriteriaForm with category grouping and pre-fill functionality.

4. **AC-5.2.4 (Tooltip on Hover):** PointsBadge already included tooltip with impact description from Story 5.1. Verified functionality.

5. **Tests:** Added 25+ new tests for pointsSchema validation, error message verification, and criterion templates.

### File List

**New Files:**

- `src/lib/constants/criteria-templates.ts` - Criterion templates including Cerrado methodology

**Modified Files:**

- `src/lib/validations/criteria-schemas.ts` - Enhanced pointsSchema with descriptive error messages
- `src/components/criteria/criteria-form.tsx` - Added template selector dropdown
- `tests/unit/validations/criteria.test.ts` - Added Story 5.2 test cases

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-08 | Story drafted from tech-spec-epic-5.md and epics.md | SM Agent (create-story workflow) |
| 2025-12-08 | Code review completed - APPROVED                    | SM Agent (code-review workflow)  |

---

## Code Review

### Review Date

2025-12-08

### Reviewer

SM Agent (code-review workflow)

### Review Outcome

**APPROVE**

### Acceptance Criteria Validation

| AC                                                   | Status | Evidence                                                                                                                                                                                       |
| ---------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-5.2.1: Points Input Accepts Valid Range           | PASS   | `src/lib/validations/criteria-schemas.ts:193-197` - `pointsSchema` validates integers -100 to +100 with descriptive error messages at lines 145-149                                            |
| AC-5.2.2: Visual Point Value Indicators              | PASS   | `src/components/criteria/points-badge.tsx:65-74` - `getStatusStyles()` returns green for positive, red for negative, gray for neutral                                                          |
| AC-5.2.3: Cerrado Historical Surplus Scoring Support | PASS   | `src/lib/constants/criteria-templates.ts:42-56` - CERRADO_SURPLUS_TEMPLATE with correct values; `src/components/criteria/criteria-form.tsx:170-244` - template selector with category grouping |
| AC-5.2.4: Point Impact Preview on Hover              | PASS   | `src/components/criteria/points-badge.tsx:52-60` - `getTooltipText()` generates impact descriptions; lines 129-151 integrate Tooltip component                                                 |

### Task Verification

| Task                                            | Status   | Notes                                                                                                           |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| Task 1: Enhance Points Validation Schema        | VERIFIED | `criteria-schemas.ts:145-149, 193-197` - POINTS_MUST_BE_INTEGER, POINTS_TOO_LOW, POINTS_TOO_HIGH messages added |
| Task 2: Create PointsBadge Component            | VERIFIED | Existed from Story 5.1 - fully functional                                                                       |
| Task 3: Add Tooltip to PointsBadge              | VERIFIED | Existed from Story 5.1 - fully functional                                                                       |
| Task 4: Integrate Points Input in CriteriaBlock | VERIFIED | Existed from Story 5.1 - fully functional                                                                       |
| Task 5: Create Cerrado Criterion Template       | VERIFIED | `criteria-templates.ts:42-56` - 7 templates created including Cerrado                                           |
| Task 6: Add Template Selection to CriteriaForm  | VERIFIED | `criteria-form.tsx:170-244` - handleTemplateSelect callback, template selector dropdown                         |
| Task 7: Update CriteriaList to Use PointsBadge  | VERIFIED | Via CriteriaBlock integration from Story 5.1                                                                    |
| Task 8: Create Unit Tests for Points            | VERIFIED | `criteria.test.ts:474-648` - 25+ tests for pointsSchema and templates                                           |
| Task 9: Create Integration Tests                | VERIFIED | Covered in Story 5.1 API tests                                                                                  |
| Task 10: Run Verification                       | VERIFIED | Build, lint, test pass (1068 tests, 25 skipped)                                                                 |

### Code Quality Assessment

**Strengths:**

- Clean separation of concerns with dedicated `criteria-templates.ts` file
- Comprehensive test coverage (25+ new tests for Story 5.2)
- Proper Zod v4 error message handling in tests
- Template selector with category grouping provides excellent UX
- All 7 templates have valid metrics and operators

**TypeScript Quality:**

- Type-safe template interface with proper exports
- Form integration properly typed with react-hook-form

**Minor Observations:**

- `criteria-form.tsx:154-156` has `@typescript-eslint/no-explicit-any` eslint-disable - acceptable for react-hook-form/zod resolver compatibility (same pattern established in Story 5.1)

### Security Review

- No security concerns identified
- Points validation enforced server-side via Zod schemas
- No user input injection vectors
- All templates use validated metrics and operators from constants

### Test Coverage

- `tests/unit/validations/criteria.test.ts:474-532` - pointsSchema boundary tests (-100, 0, +100, -101, +101, decimals)
- `tests/unit/validations/criteria.test.ts:534-648` - Cerrado template tests, getTemplateById, getTemplatesByCategory

### Recommendation

**APPROVED** - All acceptance criteria verified with evidence. Implementation is clean, well-tested, and follows established patterns from Story 5.1.
