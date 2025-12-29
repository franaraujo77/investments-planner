# Story 2.1: Create Portfolio

Status: done

## Story

As a **user**,
I want **to create a new portfolio with name, currency, industry sector, and asset types**,
So that **I can organize my investments by sector and strategy**.

## Acceptance Criteria

### AC-2.1.1: Portfolio Creation Form

**Given** I am on the portfolios page
**When** I click "Create Portfolio"
**Then** I see a form to enter: portfolio name, base currency, industry sector, and accepted asset types

### AC-2.1.2: Industry Sector Selection

**Given** I enter a valid portfolio name
**When** I select an industry sector (e.g., Insurance, Banking, Software, Aerospace & Defense)
**Then** my portfolio is tagged with that sector for organization and filtering

### AC-2.1.3: Asset Types Selection

**Given** I select accepted asset types (e.g., Stocks, ETFs, REITs, Bonds)
**When** I submit the form
**Then** a new portfolio is created with these settings
**And** only assets matching these types can be added to this portfolio

### AC-2.1.4: Duplicate Name Warning

**Given** I enter a name similar to an existing portfolio (case-insensitive match)
**When** I am typing the name
**Then** I see a warning: "You have a portfolio with a similar name: [existing name]"
**And** I can still proceed if I choose to

### AC-2.1.5: Validation

**Given** I try to create a portfolio without required fields
**When** I submit the form
**Then** I see validation errors for: name, industry sector, and at least one asset type required

## Tasks / Subtasks

- [x] Task 1: Schema Enhancement (AC: 2.1.1, 2.1.2, 2.1.3)
  - [x] 1.1 Add `industry_sector` column to portfolios table (varchar 50)
  - [x] 1.2 Add `base_currency` column to portfolios table (varchar 3, default user's currency)
  - [x] 1.3 Create `portfolio_asset_types` junction table (portfolio_id, asset_type varchar 20)
  - [x] 1.4 Generate Drizzle migration with `pnpm db:generate`
  - [x] 1.5 Apply migration with `pnpm db:migrate`
  - [x] 1.6 Add RLS policies for new table (`pnpm security:check-rls`)

- [x] Task 2: Zod Validation Schemas (AC: 2.1.5)
  - [x] 2.1 Updated `src/lib/validations/portfolio.ts` with new schemas
  - [x] 2.2 Define `createPortfolioSchema` with name (1-50 chars), industry_sector, base_currency, asset_types array
  - [x] 2.3 Define industry sector enum (INDUSTRY_SECTORS constant)
  - [x] 2.4 Define asset types enum (ASSET_TYPES constant)
  - [x] 2.5 Add unit tests for schema validation (36 tests)

- [x] Task 3: Portfolio Service Layer (AC: 2.1.1, 2.1.4)
  - [x] 3.1 Updated `src/lib/services/portfolio-service.ts` with new functions
  - [x] 3.2 Implement `createPortfolio(userId, data)` - inserts portfolio + asset types in transaction
  - [x] 3.3 Implement `checkSimilarPortfolioName(userId, name)` - Levenshtein distance fuzzy match
  - [x] 3.4 Implement `getUserPortfoliosWithAssetTypes(userId)` - list all portfolios with asset types
  - [x] 3.5 Add structured logging (use `logger` not console.log)
  - [x] 3.6 Add unit tests with Vitest

- [x] Task 4: API Route Handler (AC: 2.1.1, 2.1.5)
  - [x] 4.1 Updated `src/app/api/portfolios/route.ts` with POST handler for new fields
  - [x] 4.2 Validate request body with Zod schema
  - [x] 4.3 Use standardized responses from `@/lib/api/responses.ts`
  - [x] 4.4 Use error codes from `@/lib/api/error-codes.ts`
  - [x] 4.5 Integration tests via E2E tests

- [x] Task 5: Similar Name Check API (AC: 2.1.4)
  - [x] 5.1 Create `src/app/api/portfolios/check-name/route.ts`
  - [x] 5.2 Accept POST body with `name` and return similar portfolio names
  - [x] 5.3 Implement fuzzy matching (Levenshtein distance algorithm)
  - [x] 5.4 Integration tests via E2E tests

- [x] Task 6: Portfolio Creation Form Component (AC: 2.1.1, 2.1.2, 2.1.3)
  - [x] 6.1 Create `src/components/portfolio/portfolio-create-form.tsx`
  - [x] 6.2 Use react-hook-form with Zod resolver
  - [x] 6.3 Add name input with debounced similar name check (300ms)
  - [x] 6.4 Add currency select (from SUPPORTED_CURRENCIES)
  - [x] 6.5 Add industry sector select (shadcn Select component)
  - [x] 6.6 Add asset types multi-select (shadcn Checkbox group)
  - [x] 6.7 Display similar name warning inline (non-blocking)
  - [x] 6.8 Block submit until all required fields valid

- [x] Task 7: Portfolio Creation Page (AC: 2.1.1)
  - [x] 7.1 Create `src/app/dashboard/portfolios/new/page.tsx`
  - [x] 7.2 Import and render PortfolioCreateForm
  - [x] 7.3 Handle form submission → redirect to portfolio list on success
  - [x] 7.4 Display success toast notification

- [x] Task 8: Update Portfolios List Page
  - [x] 8.1 Updated `src/app/(dashboard)/portfolio/page.tsx` to use getUserPortfoliosWithAssetTypes
  - [x] 8.2 Display industry sector and asset types in portfolio cards (badges)
  - [x] 8.3 Updated client-safe types in `src/types/portfolio.ts`

- [x] Task 9: E2E Tests
  - [x] 9.1 Updated `tests/e2e/portfolio.spec.ts` with Story 2.1 tests
  - [x] 9.2 Test happy path: create portfolio with all fields
  - [x] 9.3 Test similar name warning display (debounced check)
  - [x] 9.4 Test validation error display
  - [x] 9.5 Test successful redirect and toast

## Dev Notes

### Architecture Patterns & Constraints

**Database:**

- Portfolios table already exists with `id, userId, name, createdAt, updatedAt`
- Need to ADD columns: `base_currency`, `industry_sector`
- Need to CREATE junction table: `portfolio_asset_types` for many-to-many
- Use Drizzle ORM with `numeric()` for any monetary values (Decimal.js on app side)
- All tables MUST have RLS enabled via migration

**API Pattern:**

```typescript
// CORRECT - Use standardized responses
import { successResponse, errorResponse } from "@/lib/api/responses";
import { ERROR_CODES } from "@/lib/api/error-codes";

return successResponse({ data });
return errorResponse("Not found", ERROR_CODES.NOT_FOUND, 404);
```

**Logging:**

```typescript
// NEVER use console.log/error
// ALWAYS use structured logger
import { logger } from "@/lib/telemetry/logger";
logger.info("Portfolio created", { userId, portfolioId });
```

**Form Validation UX:**

- Use `watch()` from react-hook-form for live validation feedback
- Visual states: `border-destructive` for errors, `border-green-500` for valid touched fields
- Block submit button until form is valid

### Industry Sectors (FR42)

From PRD: Users can set industry sector per portfolio

```typescript
export const INDUSTRY_SECTORS = [
  "Insurance",
  "Banking",
  "Software",
  "Aerospace & Defense",
  "Energy",
  "Healthcare",
  "Consumer Goods",
  "Real Estate",
  "Technology",
  "Financial Services",
  "Utilities",
  "Other",
] as const;
```

### Asset Types (FR43)

From PRD: Users can filter accepted asset types per portfolio

```typescript
export const ASSET_TYPES = [
  "Stocks",
  "ETFs",
  "REITs",
  "Bonds",
  "Crypto",
  "Funds",
  "Options",
  "Other",
] as const;
```

### Supported Currencies (from architecture)

```typescript
// AC-6.4.5 from architecture: Supported currencies
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;
```

### Project Structure Notes

**New Files to Create:**

- `src/lib/validation/portfolio-schemas.ts` - Zod schemas
- `src/lib/services/portfolio/portfolioService.ts` - Business logic
- `src/app/api/portfolios/route.ts` - POST handler
- `src/app/api/portfolios/check-name/route.ts` - Similar name check
- `src/components/portfolio/PortfolioCreateForm.tsx` - React form
- `src/app/(dashboard)/portfolios/new/page.tsx` - Create page
- `tests/unit/lib/services/portfolio/portfolioService.test.ts`
- `tests/integration/api/portfolios.test.ts`
- `tests/e2e/portfolio-create.spec.ts`

**Existing Files to Modify:**

- `src/lib/db/schema.ts` - Add columns and junction table
- `src/app/(dashboard)/portfolios/page.tsx` - Add create button

### Testing Requirements

From CLAUDE.md: Every code change MUST include tests

| Change Type      | Required Tests                                      |
| ---------------- | --------------------------------------------------- |
| Schema change    | Migration test (verify columns exist)               |
| Service function | Unit tests for all code paths                       |
| API endpoint     | Unit + Integration tests                            |
| React component  | Unit tests (if using @testing-library/react) or E2E |

**Test Commands:**

```bash
pnpm test              # Run unit + integration tests
pnpm test:e2e          # Playwright E2E tests
pnpm test:coverage     # With coverage report
```

### Previous Epic Intelligence

From Epic 1 Retrospective:

1. **Verification Story Pattern** - Most infrastructure exists, verify before reimplementing
2. **Rate Limiting Pattern** - Already established in Story 1-2, reuse for API endpoints
3. **Code Review Catches Real Issues** - Follow all patterns exactly

**Watch Items for Epic 2 (from retrospective):**

1. Multi-currency complexity - Exchange rate API integration needed (Story 2.7)
2. Portfolio recalculation performance - <100ms per asset requirement
3. Asset autocomplete - API provider and cache strategy TBD (Story 2.5)

### References

- [Source: docs/prd-v2.md#Epic 2] - Portfolio Management Foundation requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] - API patterns, caching
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] - Naming conventions
- [Source: _bmad-output/project-context.md#Critical Rules] - No console.log, use logger
- [Source: CLAUDE.md#PR Review Checklist] - Pre-commit checks
- [Source: src/lib/db/schema.ts#portfolios] - Existing portfolio table structure
- [Source: _bmad-output/implementation-artifacts/epic-1-retrospective.md] - Lessons learned

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
