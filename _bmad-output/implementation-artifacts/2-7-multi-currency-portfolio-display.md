# Story 2.7: Multi-Currency Portfolio Display

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user with international investments**,
I want **to see all values converted to my base currency with clear exchange rate information**,
So that **I can understand my total portfolio value and the currencies involved**.

## Acceptance Criteria

### AC-2.7.1: Base Currency Conversion Display

**Given** I have holdings in different currencies (e.g., USD, BRL, EUR)
**When** I view my portfolio
**Then** all values are converted and displayed in my base currency
**And** the original currency value is shown alongside or on hover

### AC-2.7.2: Exchange Rate Visibility

**Given** an asset is in a currency different from my portfolio base currency
**When** I view that asset's value
**Then** I see a tooltip showing the exchange rate used (e.g., "1 USD = 5.50 BRL")
**And** I see an indicator that rates are from the previous trading day

### AC-2.7.3: Exchange Rate Freshness Indicator

**Given** exchange rates are fetched (or using MVP static rates)
**When** I view my portfolio
**Then** I see a data freshness indicator showing when exchange rates were last updated
**And** this is visually distinct from price freshness indicators

### AC-2.7.4: Multi-Currency Portfolio Summary

**Given** I have a portfolio with holdings in multiple currencies
**When** I view the portfolio header/summary
**Then** I see a visual indicator of the currencies present (e.g., "Currencies: USD, EUR, BRL")
**And** I understand the portfolio is multi-currency at a glance

### AC-2.7.5: Allocation Calculation Accuracy

**Given** I have a multi-currency portfolio
**When** allocation percentages are calculated
**Then** they are calculated based on converted base currency values
**And** the total equals 100% of portfolio value (using Decimal.js precision)

### AC-2.7.6: Regional Number Formatting

**Given** my locale is set (from Story 1.5)
**When** I view currency values
**Then** numbers display in my regional format (e.g., 1.234,56 for pt-BR)
**And** currency symbols match the currency code (R$ for BRL, $ for USD)

## Tasks / Subtasks

- [x] Task 1: Add Multi-Currency Summary to Portfolio Header (AC: 2.7.4)
  - [x] 1.1 Create `MultiCurrencyIndicator` component in `src/components/portfolio/`
  - [x] 1.2 Extract unique currencies from portfolio assets
  - [x] 1.3 Display currency badges in portfolio header (e.g., "Currencies: USD, EUR")
  - [x] 1.4 Add tooltip explaining "All values converted to [baseCurrency]"
  - [x] 1.5 Integrate into `portfolio-detail-client.tsx` and `portfolio-summary-card.tsx`

- [x] Task 2: Add Exchange Rate Freshness Display (AC: 2.7.2, 2.7.3)
  - [x] 2.1 Enhance `PortfolioSummaryCard` to show separate "Exchange Rate" freshness
  - [x] 2.2 Add exchange rate source info to freshness tooltip (e.g., "MVP Static Rates")
  - [x] 2.3 Add "T-1 rates" explanation tooltip (e.g., "Using previous trading day rates")
  - [x] 2.4 Update `getPortfolioWithValues()` to return `exchangeRateFreshness` separately

- [x] Task 3: Integrate CurrencyDisplay Component (AC: 2.7.1, 2.7.2)
  - [x] 3.1 Enhanced exchange rate tooltip in `holdings-table.tsx` with T-1 indicator
  - [x] 3.2 Ensure exchange rate tooltips display on hover for converted values
  - [x] 3.3 Add "T-1" indicator to exchange rate tooltip content
  - [x] 3.4 Verify consistency with existing `portfolio-table.tsx` (which already uses CurrencyDisplay)

- [x] Task 4: Verify Regional Formatting (AC: 2.7.6)
  - [x] 4.1 Verify `useNumberFormat()` hook is used in all currency displays
  - [x] 4.2 Verified E2E tests cover locale formatting
  - [x] 4.3 Verify currency symbols display correctly (R$ for BRL, not "BRL")

- [x] Task 5: Unit Tests
  - [x] 5.1 Create `tests/unit/components/multi-currency-indicator.test.tsx`
  - [x] 5.2 Test currency extraction from mixed-currency portfolio
  - [x] 5.3 Test empty currencies case (single-currency portfolio shows no indicator)
  - [x] 5.4 Test exchange rate freshness calculation

- [x] Task 6: E2E Tests
  - [x] 6.1 Add multi-currency display tests to `tests/e2e/portfolio.spec.ts`
  - [x] 6.2 Test currency indicator visibility with multi-currency holdings
  - [x] 6.3 Test exchange rate tooltip content
  - [x] 6.4 Test freshness badge for exchange rates
  - [x] 6.5 Test allocation percentages display

## Dev Notes

### Architecture Patterns & Constraints

**Key Principle:** This story focuses on UI/UX enhancements for multi-currency display. The core conversion logic (FR65, FR68) is already implemented in Story 2.2.

**Existing Infrastructure:**

```typescript
// From src/lib/services/portfolio-service.ts (Story 2.2)
export async function getPortfolioWithValues(
  userId: string,
  portfolioId: string
): Promise<PortfolioWithValues>;

// Already returns:
// - valueNative: string (value in asset's currency)
// - valueBase: string (value converted to portfolio base currency)
// - exchangeRate: string (rate used for conversion)
// - allocationPercent: string (% of total portfolio)
```

**Existing Components to Reuse:**

```typescript
// From src/components/fintech/currency-display.tsx
<CurrencyDisplay
  value={asset.valueNative}
  currency={asset.currency}
  baseCurrency={baseCurrency}
  baseValue={asset.valueBase}
  exchangeRate={asset.exchangeRate}
  showExchangeRate={true}
/>

// From src/components/fintech/data-freshness-badge.tsx
<DataFreshnessBadge
  updatedAt={exchangeRateFreshness}
  source="Exchange Rates"
  size="sm"
/>
```

**i18n Number Formatting (MANDATORY):**

```typescript
// CORRECT - Always use the hook
import { useNumberFormat } from "@/lib/i18n/useNumberFormat";
const { formatCurrency, formatPercent } = useNumberFormat();

// WRONG - Never use direct formatting
value.toFixed(2)
new Intl.NumberFormat(...).format(value)
```

**Exchange Rate Service (MVP):**

```typescript
// From src/lib/services/exchange-rate-service.ts
// MVP uses static rates - Epic 6 will add real providers
export function getExchangeRate(from: string, to: string): number;
export function getCurrencySymbol(currency: string): string;
export function getAllRatesToBase(baseCurrency: string): Map<string, number>;

// Supported currencies: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF
```

### Project Structure Notes

**New Files to Create:**

- `src/components/portfolio/multi-currency-indicator.tsx` - Currency badges component
- `tests/unit/components/multi-currency-indicator.test.tsx` - Unit tests

**Files to Modify:**

- `src/app/(dashboard)/portfolio/[portfolioId]/portfolio-detail-client.tsx` - Add currency indicator
- `src/components/portfolio/portfolio-summary-card.tsx` - Add exchange rate freshness
- `src/components/portfolio/holdings-table.tsx` - Use CurrencyDisplay component
- `src/lib/services/portfolio-service.ts` - Add exchangeRateFreshness to return type
- `tests/e2e/portfolio.spec.ts` - Add multi-currency tests

**Files to Reuse (no changes needed):**

- `src/components/fintech/currency-display.tsx` - Already has dual display with tooltips
- `src/components/fintech/data-freshness-badge.tsx` - Already has freshness indicators
- `src/lib/i18n/useNumberFormat.ts` - Already handles regional formatting

### Key Data Types

**AssetWithValue (from portfolio-service.ts):**

```typescript
interface AssetWithValue {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string | null;
  quantity: string;
  purchasePrice: string;
  currency: string; // Native currency (USD, BRL, EUR, etc.)
  isIgnored: boolean;
  currentPrice: string;
  valueNative: string; // Value in native currency
  valueBase: string; // Value in portfolio base currency
  exchangeRate: string; // Rate used for conversion
  allocationPercent: string; // % of portfolio (0-100)
  priceUpdatedAt: Date;
}
```

**New Type to Add:**

```typescript
// Enhancement to PortfolioWithValues
interface PortfolioWithValues {
  // ... existing fields ...
  exchangeRateFreshness: Date; // NEW: When exchange rates were last updated
  currencies: string[]; // NEW: Unique currencies in portfolio
}
```

### Testing Requirements

From CLAUDE.md: Every code change MUST include tests

| Change Type                            | Required Tests                         |
| -------------------------------------- | -------------------------------------- |
| New component (MultiCurrencyIndicator) | Unit tests for rendering, empty states |
| UI modifications                       | E2E tests covering user flows          |
| Service changes                        | Unit tests for new fields              |

**Test Commands:**

```bash
pnpm test:unit           # Run unit tests
pnpm test:e2e            # Playwright E2E tests
pnpm lint                # ESLint checks
pnpm exec tsc --noEmit   # TypeScript checks
```

### Edge Cases to Handle

1. **Single-Currency Portfolio:**
   - Don't show MultiCurrencyIndicator
   - Don't show exchange rate in tooltips (rate is 1:1)

2. **All Assets Same Currency as Base:**
   - Show simplified display without conversion indicators
   - exchangeRate = "1" for all assets

3. **Exotic Currencies (JPY):**
   - Handle currencies without decimal places properly
   - Exchange rates may have more decimal places (1 USD = 150.50 JPY)

4. **Static Rate Disclaimer:**
   - Clearly indicate MVP uses static rates
   - Tooltip: "Using static rates (Epic 6 will add live rates)"

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7] - Story requirements
- [Source: _bmad-output/planning-artifacts/epics.md#FR64-FR69] - Multi-currency FRs
- [Source: _bmad-output/implementation-artifacts/2-2-view-portfolio-and-holdings.md] - Previous story patterns
- [Source: src/lib/services/portfolio-service.ts#getPortfolioWithValues] - Core conversion logic
- [Source: src/components/fintech/currency-display.tsx] - Existing CurrencyDisplay component
- [Source: src/components/fintech/data-freshness-badge.tsx] - Existing DataFreshnessBadge
- [Source: src/lib/i18n/useNumberFormat.ts] - Regional formatting hook
- [Source: CLAUDE.md#Test Requirements] - Testing standards

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript check passed: `pnpm exec tsc --noEmit`
- Unit tests passed: 19/19 tests in `multi-currency-indicator.test.tsx`
- Lint check passed on all modified files

### Completion Notes List

- MultiCurrencyIndicator component created with proper currency badge display
- Exchange rate freshness display added to PortfolioSummaryCard
- T-1 indicator tooltips added to holdings-table.tsx
- Unit tests cover currency extraction, display logic, and edge cases
- E2E tests cover multi-currency indicator visibility and exchange rate display

### File List

**Created:**

- `src/components/portfolio/multi-currency-indicator.tsx` - MultiCurrencyIndicator component (AC-2.7.4)
- `tests/unit/components/multi-currency-indicator.test.tsx` - Unit tests for currency logic

**Modified:**

- `src/app/(dashboard)/portfolio/[portfolioId]/portfolio-detail-client.tsx` - Integrated MultiCurrencyIndicator (Task 1.5)
- `src/components/portfolio/portfolio-summary-card.tsx` - Added exchange rate freshness display (Task 2.1-2.3)
- `src/components/portfolio/holdings-table.tsx` - Enhanced exchange rate tooltips with T-1 indicator (Task 3.1-3.3)
- `src/lib/services/portfolio-service.ts` - Added exchangeRateFreshness and currencies to return type (Task 2.4)
- `tests/e2e/portfolio.spec.ts` - Added Story 2.7 E2E tests (Task 6.1-6.5)

### Change Log

| Date       | Change                                                                                 | Author            |
| ---------- | -------------------------------------------------------------------------------------- | ----------------- |
| 2025-12-29 | Initial implementation of all tasks                                                    | Dev Agent         |
| 2025-12-29 | Code review fixes: CurrencyDisplay integration, toFixed replacement, test improvements | Code Review Agent |
