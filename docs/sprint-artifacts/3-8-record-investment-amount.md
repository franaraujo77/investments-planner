# Story 3.8: Record Investment Amount

**Status:** done
**Epic:** Epic 3 - Portfolio Core
**Previous Story:** 3.7 Allocation Percentage View

---

## Story

**As a** user
**I want to** record actual investment amounts after making purchases
**So that** my portfolio reflects real transactions

---

## Acceptance Criteria

### AC-3.8.1: Investment Record Data Completeness

- **Given** I have confirmed a recommendation or am making a manual investment
- **When** I enter the actual amount invested and ticker
- **Then** the investment is recorded with: date, ticker, quantity, price per unit, total amount, currency
- **And** the investment record is persisted to the database

### AC-3.8.2: Portfolio Holdings Auto-Update

- **Given** an investment is recorded
- **When** the recording transaction completes
- **Then** the corresponding portfolio asset quantity updates automatically
- **And** the new quantity equals previous quantity plus invested quantity
- **And** the update is atomic (transaction)

### AC-3.8.3: Investment Confirmation UI Feedback

- **Given** I have successfully recorded an investment
- **When** the transaction completes
- **Then** a success toast shows: "[Month] investment recorded" (e.g., "December investment recorded")
- **And** the month is dynamically determined from the investment date

### AC-3.8.4: Updated Allocation Display

- **Given** I have just recorded an investment
- **When** viewing the confirmation or portfolio page
- **Then** I see the updated allocation percentages reflecting the new investment

### AC-3.8.5: Investment Form Validation

- **Given** I am recording an investment
- **When** I enter invalid data (quantity <= 0, price <= 0)
- **Then** validation errors appear inline below the fields
- **And** the form cannot be submitted until errors are corrected

### AC-3.8.6: Recommended vs Actual Amount Tracking

- **Given** I am recording an investment that was previously recommended
- **When** I enter the actual amount
- **Then** both the recommended amount and actual amount are stored
- **And** they can be compared later in investment history

---

## Technical Notes

### Existing Infrastructure

The following components are **already implemented** and should be reused:

| Component               | Location                                      | Purpose                                      |
| ----------------------- | --------------------------------------------- | -------------------------------------------- |
| Investment table schema | `src/lib/db/schema.ts`                        | `investments` table with all required fields |
| Portfolio assets table  | `src/lib/db/schema.ts`                        | `portfolioAssets` table for quantity updates |
| PortfolioService        | `src/lib/services/portfolio-service.ts`       | Asset CRUD operations                        |
| decimal.js config       | `src/lib/calculations/decimal-config.ts`      | Financial precision                          |
| Zod schemas             | `src/lib/validations/portfolio.ts`            | recordInvestmentSchema                       |
| CurrencyDisplay         | `src/components/fintech/currency-display.tsx` | Value formatting                             |
| Toast notifications     | Uses `sonner` package                         | Success/error feedback                       |

### What Needs to Be Built

#### 1. InvestmentService (`src/lib/services/investment-service.ts`)

Create service for recording and querying investments:

```typescript
interface InvestmentService {
  recordInvestments(userId: string, investments: RecordInvestmentInput[]): Promise<Investment[]>;
  getInvestmentHistory(userId: string, options?: { from?: Date; to?: Date }): Promise<Investment[]>;
}
```

Key implementation requirements:

- Use database transaction for atomicity (investment record + quantity update)
- Emit `INVESTMENT_RECORDED` event for audit trail
- Calculate totalAmount using decimal.js: `quantity × pricePerUnit`
- Update portfolioAssets.quantity atomically

#### 2. Investment API Endpoints

Create API routes per tech spec:

| Endpoint                | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `POST /api/investments` | Record new investments                     |
| `GET /api/investments`  | Get investment history with date filtering |

#### 3. Investment Recording Form (`src/components/portfolio/investment-form.tsx`)

Form component for recording individual investments:

```typescript
interface InvestmentFormProps {
  portfolioId: string;
  assetId: string;
  symbol: string;
  recommendedAmount?: string;
  onSuccess: () => void;
}
```

Features:

- Quantity input (decimal, up to 8 places)
- Price per unit input (decimal, up to 4 places)
- Calculated total amount (read-only, computed field)
- Currency display
- Validation per Zod schema

#### 4. Confirmation Modal Enhancement

Enhance or create confirmation modal for batch investment recording:

```typescript
interface InvestmentConfirmationModalProps {
  investments: Array<{
    assetId: string;
    symbol: string;
    recommendedAmount: string;
  }>;
  onConfirm: (actualInvestments: RecordInvestmentInput[]) => Promise<void>;
}
```

Features:

- List of recommended amounts (editable to actual)
- Total calculation at bottom
- Validation for all fields
- Submit triggers POST /api/investments

### Calculation Logic

All calculations **MUST use decimal.js** per architecture requirements:

```typescript
import { Decimal } from "@/lib/calculations/decimal-config";

function calculateTotalAmount(quantity: string, pricePerUnit: string): string {
  return new Decimal(quantity).times(pricePerUnit).toFixed(4);
}

function updateAssetQuantity(currentQty: string, addedQty: string): string {
  return new Decimal(currentQty).plus(addedQty).toString();
}
```

### Transaction Pattern

Per architecture and tech-spec, investment recording **MUST be atomic**:

```typescript
async recordInvestments(userId: string, investments: InvestmentInput[]) {
  return await db.transaction(async (tx) => {
    const records: Investment[] = [];

    for (const inv of investments) {
      // 1. Create investment record
      const [record] = await tx.insert(investmentsTable).values({
        userId,
        portfolioId: inv.portfolioId,
        assetId: inv.assetId,
        symbol: inv.symbol,
        quantity: inv.quantity,
        pricePerUnit: inv.pricePerUnit,
        totalAmount: calculateTotalAmount(inv.quantity, inv.pricePerUnit),
        currency: inv.currency,
        recommendedAmount: inv.recommendedAmount ?? null,
        investedAt: new Date()
      }).returning();

      // 2. Update portfolio asset quantity
      await tx.update(portfolioAssets)
        .set({
          quantity: sql`${portfolioAssets.quantity} + ${inv.quantity}`,
          updatedAt: new Date()
        })
        .where(eq(portfolioAssets.id, inv.assetId));

      records.push(record);
    }

    // 3. Emit audit event
    await tx.insert(calculationEvents).values({
      correlationId: crypto.randomUUID(),
      userId,
      eventType: 'INVESTMENT_RECORDED',
      payload: { investmentIds: records.map(r => r.id) }
    });

    return records;
  });
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Transaction-Pattern-for-Investments]

### Dynamic Month Toast

The success toast should display the month dynamically:

```typescript
const monthName = new Date().toLocaleDateString("en-US", { month: "long" });
toast.success(`${monthName} investment recorded`);
```

---

## Tasks

### [x] Task 1: Create InvestmentService (AC: 3.8.1, 3.8.2)

**Files:** `src/lib/services/investment-service.ts`

- Create InvestmentService class
- Implement `recordInvestments()` with database transaction
- Implement quantity update in same transaction
- Emit `INVESTMENT_RECORDED` audit event
- Implement `getInvestmentHistory()` with date filtering
- Use decimal.js for all calculations

### [x] Task 2: Create Investment API Routes (AC: 3.8.1, 3.8.2)

**Files:** `src/app/api/investments/route.ts`

- Create POST handler for recording investments
- Create GET handler for investment history
- Apply auth middleware
- Validate input with Zod recordInvestmentSchema
- Handle errors per architecture patterns
- Return proper response format

### [x] Task 3: Create InvestmentForm Component (AC: 3.8.1, 3.8.5)

**Files:** `src/components/portfolio/investment-form.tsx`

- Build form with react-hook-form + Zod resolver
- Quantity input with decimal support (8 places)
- Price per unit input with decimal support (4 places)
- Calculated total amount (read-only)
- Currency display
- Inline validation errors
- Submit disabled until valid

### [x] Task 4: Create Investment Confirmation Modal (AC: 3.8.3, 3.8.4, 3.8.6)

**Files:** `src/components/portfolio/investment-confirmation-modal.tsx`

- Modal showing list of investments to confirm
- Editable actual amounts (pre-filled with recommended)
- Total calculation at bottom
- Success toast with dynamic month
- Trigger portfolio data refresh on success
- Store recommended vs actual amounts

### [x] Task 5: Integrate with Portfolio Page (AC: 3.8.4)

**Files:** `src/app/(dashboard)/portfolio/page.tsx`, `src/app/(dashboard)/portfolio/portfolio-page-client.tsx`

- Add "Record Investment" action button
- Open InvestmentForm or ConfirmationModal
- Invalidate portfolio cache after recording
- Show updated allocation immediately

### [x] Task 6: Create React Query Hooks (AC: All)

**Files:** `src/hooks/use-investments.ts`

- Create `useRecordInvestments` mutation hook
- Create `useInvestmentHistory` query hook
- Handle cache invalidation for portfolio data
- Optimistic UI updates where appropriate

### [x] Task 7: Create Unit Tests (AC: 3.8.1, 3.8.2)

**Files:** `tests/unit/services/investment-service.test.ts`

Test cases:

- Investment record creation with all fields
- Quantity update calculation (decimal precision)
- Transaction rollback on failure
- Audit event emission
- Total amount calculation accuracy
- Recommended vs actual amount storage

### [x] Task 8: Create API Integration Tests (AC: 3.8.1, 3.8.2)

**Files:** `tests/unit/api/investments.test.ts`

Test cases:

- POST /api/investments with valid data
- POST /api/investments with invalid data (validation errors)
- GET /api/investments with date filters
- Auth middleware enforcement
- Multi-tenant isolation (user can't access other's investments)

### [x] Task 9: Create E2E Tests (AC: All)

**Files:** `tests/e2e/portfolio.spec.ts` (extend existing)

Test cases:

- Record investment flow from portfolio page
- Form validation errors display
- Success toast with month name
- Portfolio quantity updates after recording
- Allocation percentages update after recording
- Investment appears in history

### [x] Task 10: Run Verification

- `pnpm lint` - 0 errors
- `pnpm build` - successful build
- `pnpm test` - all tests pass

---

## Dependencies

- Story 3.3: Update Asset Holdings (provides asset quantity update pattern) - **COMPLETE**
- Story 3.6: Portfolio Overview with Values (provides portfolio value display) - **COMPLETE**
- Story 3.7: Allocation Percentage View (provides allocation display) - **READY FOR DEV**
- Epic 7 Stories: Recommendations generation (will use this for confirmation flow) - **NOT YET**

**Note:** Story 3.8 can be implemented independently of Epic 7. The investment recording capability works for manual investments. Epic 7 will enhance it with recommendation-based flows.

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **All monetary calculations use decimal.js** - Never native JavaScript arithmetic
- **PostgreSQL numeric(19,4) for amounts** - Stored as strings in TypeScript
- **Database transactions for compound operations** - Investment + quantity update must be atomic
- **Event sourcing for audit trail** - Emit INVESTMENT_RECORDED event
- **Multi-tenant isolation** - All queries scoped by user_id

[Source: docs/architecture.md#Decimal-Precision-Strategy]
[Source: docs/architecture.md#Event-Sourced-Calculations]

### Testing Standards

Per tech-spec:

- Unit test coverage ≥ 80%
- Calculation functions require 100% coverage
- Integration tests for all CRUD operations
- E2E tests for critical user flows

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Test-Strategy-Summary]

### Investment Schema Reference

The `investments` table is already defined in schema:

```typescript
export const investments = pgTable("investments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => portfolioAssets.id),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  quantity: numeric("quantity", { precision: 19, scale: 8 }).notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 19, scale: 4 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 19, scale: 4 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  recommendedAmount: numeric("recommended_amount", { precision: 19, scale: 4 }),
  investedAt: timestamp("invested_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Database-Schema-Drizzle]

### Project Structure Notes

New files to create:

- `src/lib/services/investment-service.ts` - Investment business logic
- `src/app/api/investments/route.ts` - Investment API endpoints
- `src/components/portfolio/investment-form.tsx` - Recording form
- `src/components/portfolio/investment-confirmation-modal.tsx` - Confirmation UI
- `src/hooks/use-investments.ts` - React Query hooks

Files to extend:

- `src/app/(dashboard)/portfolio/page.tsx` - Add record investment action
- `tests/e2e/portfolio.spec.ts` - Add investment recording tests

### Learnings from Previous Story

**From Story 3-7-allocation-percentage-view (Status: ready-for-dev)**

Story 3.7 is not yet complete (status: ready-for-dev), so no implementation learnings are available. However, the story defines patterns to follow:

- **Allocation calculation patterns** - Reuse for showing updated allocations after investment
- **Portfolio service extension patterns** - Follow same service architecture
- **React Query caching patterns** - Use same invalidation strategies

**Note:** Story 3.8 can proceed independently. When 3.7 is complete, verify allocation display integration works correctly.

[Source: docs/sprint-artifacts/3-7-allocation-percentage-view.md]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#AC-3.9]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#Transaction-Pattern-for-Investments]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#Test-Strategy-Summary]
- [Source: docs/epics.md#Story-3.8]
- [Source: docs/architecture.md#Decimal-Precision-Strategy]
- [Source: docs/architecture.md#Event-Sourced-Calculations]
- [Source: docs/architecture.md#API-Route-Pattern]

---

## Dev Agent Record

### Context Reference

- [docs/sprint-artifacts/3-8-record-investment-amount.context.xml](3-8-record-investment-amount.context.xml)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No significant debugging issues encountered.

### Completion Notes List

1. **InvestmentService Implementation**: Created comprehensive service with atomic transaction support for recording investments and updating portfolio asset quantities simultaneously. Uses decimal.js for all monetary calculations per architecture requirements.

2. **API Routes**: Implemented POST /api/investments for recording and GET /api/investments for history with date range, portfolio, and asset filtering support.

3. **Form Components**: Created InvestmentForm and InvestmentConfirmationModal with react-hook-form + Zod validation. Modal displays recommended amount and calculates total using decimal.js.

4. **Dynamic Month Toast**: Success toast displays "[Month] investment recorded" with dynamic month name (AC-3.8.3).

5. **Portfolio Integration**: Added "Record Investment" action button to portfolio table rows. Modal opens with asset context and triggers portfolio refresh on success.

6. **React Query Hooks**: Created useRecordInvestments mutation and useInvestmentHistory query hooks with proper cache invalidation.

7. **Test Coverage**:
   - 24 unit tests for InvestmentService
   - 13 API integration tests
   - Extended E2E tests for investment recording flow
   - All 658 tests passing

8. **Verification Results**:
   - `pnpm lint` - 0 errors (9 warnings from pre-existing code)
   - `pnpm build` - successful
   - `pnpm test` - 658 passed, 25 skipped

### File List

**Created Files:**

- `src/lib/services/investment-service.ts` - Investment business logic with atomic transactions
- `src/app/api/investments/route.ts` - POST/GET investment API endpoints
- `src/components/portfolio/investment-form.tsx` - Investment recording form
- `src/components/portfolio/investment-confirmation-modal.tsx` - Modal with dynamic month toast
- `src/hooks/use-investments.ts` - React Query hooks
- `tests/unit/services/investment-service.test.ts` - Unit tests (24 tests)
- `tests/unit/api/investments.test.ts` - API integration tests (13 tests)

**Modified Files:**

- `src/lib/db/schema.ts` - Added investments table, relations, and type exports
- `src/lib/validations/portfolio.ts` - Added investment validation schemas and messages
- `src/components/portfolio/portfolio-table.tsx` - Added invest button to asset rows
- `tests/e2e/portfolio.spec.ts` - Extended with investment E2E tests

---

## Change Log

| Date       | Change                                     | Author                           |
| ---------- | ------------------------------------------ | -------------------------------- |
| 2025-12-04 | Story drafted from epics/tech-spec         | SM Agent (create-story workflow) |
| 2025-12-04 | Story implemented - all 10 tasks completed | Dev Agent (Claude Opus 4.5)      |
