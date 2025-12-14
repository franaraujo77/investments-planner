# Story 7.8: Confirm Recommendations

**Status:** done
**Epic:** Epic 7 - Recommendations
**Previous Story:** 7.7 View Recommendation Breakdown (Status: done)

---

## Story

**As a** user
**I want** to confirm recommendations and enter actual invested amounts
**So that** my portfolio updates with real transactions

---

## Acceptance Criteria

### AC-7.8.1: Click Opens Confirmation Modal with Pre-filled Amounts

- **Given** I am viewing recommendations on the Dashboard
- **When** I click "Confirm Investments"
- **Then** a confirmation modal opens
- **And** recommended amounts are pre-filled but editable for each asset
- **And** each row shows: ticker, asset name, recommended amount, editable actual amount input

### AC-7.8.2: Real-time Total Updates

- **Given** the confirmation modal is open
- **When** I adjust any individual amount
- **Then** the running total updates in real-time
- **And** the total is displayed prominently at the bottom of the modal
- **And** amounts are formatted in the user's base currency

### AC-7.8.3: Confirm Records Investments

- **Given** I have valid amounts entered
- **When** I click the "Confirm" button
- **Then** investments are recorded in the database
- **And** the modal closes
- **And** the portfolio is updated

### AC-7.8.4: Success Toast Notification

- **Given** confirmation succeeds
- **When** the transaction completes
- **Then** a toast notification shows "{Month} investments recorded"
- **And** the month is dynamically based on current date (e.g., "December investments recorded")

### AC-7.8.5: Validation Prevents Invalid Submissions

- **Given** the confirmation modal is open
- **When** any amount is negative OR total exceeds available capital
- **Then** the Confirm button is disabled
- **And** a validation message explains the issue (e.g., "Amount cannot be negative" or "Total exceeds available capital")

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 7 Tech Spec:

- Creates new `investments` table records
- Uses transaction for atomicity (create investments + update portfolio + mark recommendation confirmed)
- Emits `INVESTMENT_CONFIRMED` event for audit trail (per ADR-002)
- Invalidates Vercel KV cache after confirmation
- Uses decimal.js for all financial calculations (per architecture)

[Source: docs/architecture.md#Architecture-Philosophy]
[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Story-7.8]

### Tech Spec Reference

Per Epic 7 Tech Spec (AC7.8.1-7.8.5):

- AC7.8.1: Modal opens with recommended amounts pre-filled but editable
- AC7.8.2: Running total updates in real-time when amounts change
- AC7.8.3: Confirm button saves investment records and closes modal
- AC7.8.4: Success toast shows "{Month} investments recorded"
- AC7.8.5: Confirm disabled if any amount negative or total exceeds available

[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Story-7.8-Confirm-Recommendations]
[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Acceptance-Criteria-Authoritative]

### API Reference

Per Tech Spec - POST /api/investments/confirm:

```typescript
// Request
POST /api/investments/confirm
Headers: Authorization: Bearer <jwt>
Body: {
  recommendationId: "uuid",
  investments: [
    {
      assetId: "uuid",
      ticker: "PETR4",
      actualAmount: "800.00",
      pricePerUnit: "35.50"
    },
    {
      assetId: "uuid",
      ticker: "VALE3",
      actualAmount: "650.00",
      pricePerUnit: "72.30"
    }
  ]
}

// Response 200
{
  data: {
    success: true,
    investmentIds: ["uuid1", "uuid2"],
    summary: {
      totalInvested: "1450.00",
      assetsUpdated: 2
    },
    allocations: {
      before: {
        "Variable Income": "48.5%",
        "Fixed Income": "51.5%"
      },
      after: {
        "Variable Income": "52.3%",
        "Fixed Income": "47.7%"
      }
    }
  }
}

// Response 400
{
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: {
    fieldErrors: { investments: ["Amount cannot be negative"] }
  }
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-7.md#APIs-and-Interfaces]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **RecommendationList** - `src/components/recommendations/recommendation-list.tsx`
   - Contains the recommendation items to confirm
   - Already displays recommendation amounts

2. **Recommendation Type** - `src/lib/types/recommendations.ts`
   - Has all needed types: `Recommendation`, `RecommendationItem`
   - `ConfirmInvestmentInput` and `ConfirmInvestmentResult` already defined

3. **useRecommendations Hook** - `src/hooks/use-recommendations.ts`
   - Provides recommendation data
   - Can be extended or a new hook can be created for confirmation

4. **Currency Formatting** - `src/lib/utils/currency-format.ts`
   - `formatCurrency()` for amount display

5. **Dialog Component** - shadcn/ui Dialog
   - Use for confirmation modal

6. **Toast Component** - shadcn/ui Toast
   - For success notification

7. **Event Types** - `src/lib/events/types.ts`
   - Extend with `INVESTMENT_CONFIRMED` event type

8. **Database Schema** - `src/lib/db/schema.ts`
   - `investments` table already defined per tech spec

[Source: docs/sprint-artifacts/7-7-view-recommendation-breakdown.md#Dev-Agent-Record]
[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Data-Models-and-Contracts]

### Data Model Reference

```typescript
// Existing types from lib/types/recommendations.ts
export interface ConfirmInvestmentInput {
  recommendationId: string;
  investments: Array<{
    assetId: string;
    ticker: string;
    actualAmount: string;
    pricePerUnit: string;
  }>;
}

export interface ConfirmInvestmentResult {
  success: boolean;
  investmentIds: string[];
  newAllocations: Record<string, string>; // assetClass -> percentage
  beforeAllocations: Record<string, string>;
  afterAllocations: Record<string, string>;
}

// NEW: For modal state management
export interface ConfirmationModalState {
  isOpen: boolean;
  recommendation: Recommendation | null;
  editedAmounts: Record<string, string>; // assetId -> amount
  isSubmitting: boolean;
  error: string | null;
}

// NEW: For investment service
export interface InvestmentRecord {
  userId: string;
  portfolioId: string;
  recommendationId: string;
  ticker: string;
  quantity: string;
  pricePerUnit: string;
  totalAmount: string;
  currency: string;
  recommendedAmount: string;
  actualAmount: string;
  investedAt: Date;
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Type-Definitions]

### New Components to Create

1. **ConfirmationModal** - `src/components/recommendations/confirmation-modal.tsx`
   - Props: `recommendation: Recommendation, open: boolean, onOpenChange: (open: boolean) => void, onConfirm: (result: ConfirmInvestmentResult) => void`
   - Renders Dialog with investment confirmation form
   - Editable amount inputs for each recommendation item
   - Real-time total calculation
   - Validation for negative amounts and total exceeds available
   - Confirm and Cancel buttons

2. **InvestmentAmountRow** - `src/components/recommendations/investment-amount-row.tsx`
   - Props: `item: RecommendationItem, value: string, onChange: (value: string) => void, currency: string`
   - Single row for editing investment amount
   - Shows ticker, name, recommended vs actual
   - Input validation

3. **InvestmentService** - `src/lib/services/investment-service.ts`
   - `confirmInvestments(userId, input: ConfirmInvestmentInput): Promise<ConfirmInvestmentResult>`
   - Creates investment records
   - Updates portfolio_assets quantities
   - Marks recommendation as "confirmed"
   - Emits INVESTMENT_CONFIRMED event
   - Invalidates cache
   - Calculates before/after allocations

4. **API Route** - `src/app/api/investments/confirm/route.ts`
   - POST handler for investment confirmation
   - Validates user authorization
   - Validates input amounts
   - Calls InvestmentService
   - Returns result with allocations

5. **useConfirmInvestments Hook** - `src/hooks/use-confirm-investments.ts`
   - Handles API call for confirmation
   - Loading, error, success states
   - Cache invalidation after success

### Update Dashboard Integration

**Files:** `src/app/(dashboard)/page.tsx`

- Add "Confirm Investments" button when recommendations exist
- Integrate ConfirmationModal component
- Handle confirmation success (refresh recommendations, show toast)

[Source: docs/sprint-artifacts/tech-spec-epic-7.md#Component-Integration]

### UI/UX Requirements

Per UX Design Specification:

- Dialog modal for confirmation (not Sheet)
- Clear visual hierarchy: summary at top, items in middle, actions at bottom
- Editable inputs with currency formatting
- Real-time total with visual feedback on changes
- Disabled state for invalid inputs with clear messaging
- Success toast matches "Month investments recorded" format
- Loading state during submission

[Source: docs/ux-design-specification.md]
[Source: docs/epics.md#Story-7.8]

---

## Tasks

### Task 1: Extend Types for Investment Confirmation (AC: 7.8.1, 7.8.3)

**Files:** `src/lib/types/recommendations.ts`, `src/lib/events/types.ts`

- [ ] Verify `ConfirmInvestmentInput` and `ConfirmInvestmentResult` exist (add if missing)
- [ ] Add `ConfirmationModalState` interface for modal state management
- [ ] Add `InvestmentRecord` interface for service layer
- [ ] Add `INVESTMENT_CONFIRMED` event type to events/types.ts
- [ ] Export all new types

### Task 2: Create Investment Validation Schema (AC: 7.8.5)

**Files:** `src/lib/validations/investment-schemas.ts`

- [ ] Create Zod schema for `ConfirmInvestmentInput`
- [ ] Validate: recommendationId is UUID
- [ ] Validate: investments array is not empty
- [ ] Validate: each actualAmount is positive decimal string
- [ ] Validate: each pricePerUnit is positive decimal string
- [ ] Export validation schema

### Task 3: Create InvestmentService (AC: 7.8.3, 7.8.4)

**Files:** `src/lib/services/investment-service.ts`

- [ ] Create `InvestmentService` class
- [ ] Implement `confirmInvestments(userId, input)` method
- [ ] Use database transaction for atomicity
- [ ] Create investment records in `investments` table
- [ ] Update `portfolio_assets` quantities using decimal.js
- [ ] Mark `recommendations` record as "confirmed"
- [ ] Emit `INVESTMENT_CONFIRMED` event with correlation ID
- [ ] Invalidate Vercel KV cache for user
- [ ] Calculate before/after allocation percentages
- [ ] Return `ConfirmInvestmentResult`

### Task 4: Create Confirm API Route (AC: 7.8.3, 7.8.5)

**Files:** `src/app/api/investments/confirm/route.ts`

- [ ] Create POST handler
- [ ] Validate user authentication
- [ ] Validate request body with Zod schema
- [ ] Verify user owns the recommendation
- [ ] Call `InvestmentService.confirmInvestments()`
- [ ] Return success response with allocations
- [ ] Handle and return validation errors

### Task 5: Create InvestmentAmountRow Component (AC: 7.8.1, 7.8.2)

**Files:** `src/components/recommendations/investment-amount-row.tsx`

- [ ] Create component with props: `item`, `value`, `onChange`, `currency`
- [ ] Display ticker and asset name
- [ ] Display recommended amount (read-only, for reference)
- [ ] Editable input for actual amount
- [ ] Currency formatting on input
- [ ] Visual indicator if amount differs from recommended

### Task 6: Create ConfirmationModal Component (AC: 7.8.1, 7.8.2, 7.8.5)

**Files:** `src/components/recommendations/confirmation-modal.tsx`

- [ ] Create Dialog-based component
- [ ] Accept props: `recommendation`, `open`, `onOpenChange`, `onConfirm`
- [ ] Display header: "Confirm {Month} Investments"
- [ ] Display total investable capital at top
- [ ] Render InvestmentAmountRow for each item
- [ ] Calculate and display running total using decimal.js
- [ ] Validation: disable Confirm if any amount negative
- [ ] Validation: disable Confirm if total exceeds available
- [ ] Show validation message when disabled
- [ ] Loading state during submission
- [ ] Call onConfirm with result on success

### Task 7: Create useConfirmInvestments Hook (AC: 7.8.3, 7.8.4)

**Files:** `src/hooks/use-confirm-investments.ts`

- [ ] Create hook to call confirm API
- [ ] Accept `onSuccess` callback for toast handling
- [ ] Handle loading state
- [ ] Handle error state
- [ ] Invalidate recommendation queries on success
- [ ] Return `{ confirm, isLoading, error }`

### Task 8: Update Dashboard with Confirmation Flow (AC: 7.8.1, 7.8.4)

**Files:** `src/app/(dashboard)/page.tsx`

- [ ] Add "Confirm Investments" button below recommendations
- [ ] Add state for confirmation modal open/close
- [ ] Integrate ConfirmationModal component
- [ ] Handle onConfirm: show success toast with month name
- [ ] Refresh recommendations after confirmation
- [ ] Button disabled when no recommendations or already confirmed

### Task 9: Update Component Barrel Export

**Files:** `src/components/recommendations/index.ts`

- [ ] Export ConfirmationModal
- [ ] Export InvestmentAmountRow

### Task 10: Write Unit Tests - Validation Schema (AC: 7.8.5)

**Files:** `tests/unit/lib/validations/investment-schemas.test.ts`

- [ ] Test valid input passes validation
- [ ] Test empty investments array fails
- [ ] Test negative amount fails
- [ ] Test invalid UUID fails
- [ ] Test missing required fields fail

### Task 11: Write Unit Tests - InvestmentService (AC: 7.8.3)

**Files:** `tests/unit/services/investment-service.test.ts`

- [ ] Test investment creation
- [ ] Test portfolio update calculation
- [ ] Test recommendation status update
- [ ] Test event emission
- [ ] Test allocation calculation

### Task 12: Write Unit Tests - API Route (AC: 7.8.3, 7.8.5)

**Files:** `tests/unit/api/investments-confirm.test.ts`

- [ ] Test POST handler authorization
- [ ] Test input validation
- [ ] Test successful confirmation response
- [ ] Test error handling (not found, validation)

### Task 13: Write Unit Tests - Components (AC: 7.8.1, 7.8.2)

**Files:** `tests/unit/components/confirmation-modal.test.ts`, `tests/unit/components/investment-amount-row.test.ts`

- [ ] Test ConfirmationModal props interface
- [ ] Test total calculation logic
- [ ] Test validation logic (negative amounts, exceeds available)
- [ ] Test InvestmentAmountRow props interface
- [ ] Test onChange behavior

### Task 14: Write Unit Tests - useConfirmInvestments Hook

**Files:** `tests/unit/hooks/use-confirm-investments.test.ts`

- [ ] Test hook API call behavior
- [ ] Test loading state
- [ ] Test error state
- [ ] Test success callback

### Task 15: Run Verification

- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] ESLint passes with no new errors
- [ ] All unit tests pass
- [ ] Build verification (`pnpm build`)

---

## Dependencies

- **Story 7.7:** View Recommendation Breakdown (Complete) - provides recommendation data and types
- **Story 7.5:** Display Recommendations Focus Mode (Complete) - provides RecommendationList
- **Story 7.4:** Generate Investment Recommendations (Complete) - provides recommendation generation
- **Story 3.8:** Record Investment Amount (Complete) - provides investment recording concept
- **Story 1.4:** Event-Sourced Calculation Pipeline (Complete) - provides event emission infrastructure

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Event Sourcing:** Emit `INVESTMENT_CONFIRMED` event with correlation ID (ADR-002)
- **Decimal Precision:** All amount calculations use decimal.js (ADR)
- **Transactions:** Use database transaction for atomicity
- **Cache Invalidation:** Invalidate Vercel KV cache after confirmation

[Source: docs/architecture.md#Key-Decisions]
[Source: docs/epics.md#Story-7.8]

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for component interfaces and utility functions
- Test validation logic thoroughly (negative amounts, exceeds available)
- Test service layer with mocked database
- Follow existing pattern: interface/utility testing (no @testing-library/react)
- All tests must pass before marking complete

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Learnings from Previous Story

**From Story 7-7-view-recommendation-breakdown (Status: done)**

- **Sheet Pattern for Details:** Used Sheet for breakdown - use Dialog for confirmation (different purpose)
- **Types Extended:** recommendation types already extended with breakdown types
- **Testing Pattern:** Interface/utility testing only (no @testing-library/react)
- **TypeScript exactOptionalPropertyTypes:** Add `| undefined` to optional props
- **Dashboard Integration:** Dashboard page already has state management for panels
- **useBreakdown Pattern:** Hook pattern with in-memory cache established

**What to Build On:**

- Follow same type extension pattern in recommendations.ts
- Follow same testing patterns (interface tests, not rendering)
- Use similar hook structure as useBreakdown
- Dashboard already has recommendation state - add confirmation state

[Source: docs/sprint-artifacts/7-7-view-recommendation-breakdown.md#Dev-Agent-Record]
[Source: docs/sprint-artifacts/7-7-view-recommendation-breakdown.md#Completion-Notes-List]

### Project Structure Notes

Following unified project structure:

- **Components:** `src/components/recommendations/` (extend existing)
- **Types:** `src/lib/types/recommendations.ts` (extend)
- **Services:** `src/lib/services/investment-service.ts` (new)
- **API Routes:** `src/app/api/investments/confirm/route.ts` (new)
- **Hooks:** `src/hooks/use-confirm-investments.ts` (new)
- **Validations:** `src/lib/validations/investment-schemas.ts` (new)
- **Tests:** `tests/unit/components/`, `tests/unit/api/`, `tests/unit/hooks/`, `tests/unit/services/`

[Source: docs/architecture.md#Project-Structure]

### Month Name Formatting

For AC-7.8.4, use JavaScript `Intl.DateTimeFormat` for month name:

```typescript
const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());
// Returns "December" for December 2025
```

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-7.md#Story-7.8-Confirm-Recommendations]
- [Source: docs/sprint-artifacts/tech-spec-epic-7.md#Acceptance-Criteria-Authoritative]
- [Source: docs/sprint-artifacts/tech-spec-epic-7.md#APIs-and-Interfaces]
- [Source: docs/epics.md#Story-7.8]
- [Source: docs/architecture.md#Key-Decisions]
- [Source: docs/sprint-artifacts/7-7-view-recommendation-breakdown.md#Dev-Agent-Record]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/7-8-confirm-recommendations.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

1. **TypeScript Error Fix - Invalid ErrorCode**: Used `VALIDATION_ERRORS.INVALID_INPUT` instead of non-existent `"VALIDATION_EXPIRED_RECOMMENDATION"` constant
2. **exactOptionalPropertyTypes Fix**: Changed `error?: string` to `error?: string | undefined` to support optional prop compatibility
3. **ESLint react-hooks/set-state-in-effect**: Added `// eslint-disable-next-line react-hooks/set-state-in-effect` comment for intentional state reset when modal opens
4. **ESLint unused variable**: Renamed `recommendationId` to `_recommendationId` in ConfirmationModal since the prop is received but used through parent component
5. **Component Tests Without @testing-library/react**: Rewrote component tests to test props interface, type definitions, and calculation logic rather than actual rendering (following project pattern from Story 7.7)
6. **Investment Service**: Extended existing `investment-service.ts` with `confirmInvestments()` function for Story 7.8
7. **Event Type Extension**: Added `INVESTMENT_CONFIRMED` event type with full audit trail fields per ADR-002

### File List

**New Files Created:**

- `src/lib/validations/investment-schemas.ts` - Zod validation schemas for investment confirmation
- `src/app/api/investments/confirm/route.ts` - POST endpoint for confirming investments
- `src/components/recommendations/investment-amount-row.tsx` - Row component for editable investment amounts
- `src/components/recommendations/confirmation-modal.tsx` - Modal dialog for investment confirmation
- `src/hooks/use-confirm-investments.ts` - Hook for API interaction and toast notifications
- `tests/unit/lib/validations/investment-schemas.test.ts` - 24 validation schema tests
- `tests/unit/services/investment-confirm.test.ts` - 14 investment service tests
- `tests/unit/api/investments-confirm.test.ts` - 11 API route tests
- `tests/unit/components/investment-amount-row.test.ts` - 11 component logic tests
- `tests/unit/components/confirmation-modal.test.ts` - 21 component logic tests
- `tests/unit/hooks/use-confirm-investments.test.ts` - 13 hook tests

**Modified Files:**

- `src/lib/types/recommendations.ts` - Extended with `ConfirmInvestmentInput`, `ConfirmInvestmentResult`, `ConfirmationModalState`, `InvestmentRecord`, `ConfirmInvestmentResponse`
- `src/lib/events/types.ts` - Added `InvestmentConfirmedEvent` type and `INVESTMENT_CONFIRMED` constant
- `src/lib/services/investment-service.ts` - Added `confirmInvestments()` function
- `src/app/(dashboard)/page.tsx` - Integrated ConfirmationModal and "Confirm Investments" button
- `src/components/recommendations/index.ts` - Exported new components

### Test Summary

- **Total Tests:** 94 tests passing
- **Validation Schema:** 24 tests
- **Investment Service:** 14 tests
- **API Route:** 11 tests
- **InvestmentAmountRow Component:** 11 tests
- **ConfirmationModal Component:** 21 tests
- **useConfirmInvestments Hook:** 13 tests

---

## Change Log

| Date       | Change                                              | Author                            |
| ---------- | --------------------------------------------------- | --------------------------------- |
| 2025-12-14 | Story drafted from tech-spec-epic-7.md and epics.md | SM Agent (create-story workflow)  |
| 2025-12-14 | Technical context XML generated, story marked ready | SM Agent (story-context workflow) |
