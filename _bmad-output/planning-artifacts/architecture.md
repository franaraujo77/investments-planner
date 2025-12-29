---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-26'
inputDocuments:
  - docs/prd-v2.md
  - docs/product-brief-investments-planner-2025-12-26.md
  - docs/ux-design-specification.md
  - docs/research-technical-2025-12-26.md
  - docs/research-domain-2025-12-26.md
  - docs/research-competitive-2025-12-26.md
  - docs/research-market-2025-12-26.md
  - docs/research-user-2025-12-26.md
workflowType: 'architecture'
project_name: 'investments-planner'
user_name: 'Bmad'
date: '2025-12-26'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
95 functional requirements spanning user management, portfolio operations, visual feedback, scoring engine, recommendations, and data pipeline. Key architectural drivers include:

- Full CRUD for portfolios (Trust Death Spiral prevention)
- Real-time visual feedback (pie charts, live allocation %)
- Two-tier data refresh (scheduled API → cache → user refresh)
- Overnight pre-computation for instant recommendations
- Event sourcing for calculation audit trail

**Non-Functional Requirements:**

| Category      | Requirement                      | Architectural Impact                      |
| ------------- | -------------------------------- | ----------------------------------------- |
| Performance   | Dashboard <2s, pie render <100ms | Edge caching, pre-computation             |
| Security      | RLS, JWT, bcrypt, AES-256        | Multi-tenant isolation, auth middleware   |
| Scalability   | 1,000+ concurrent users          | Serverless architecture, queue-based jobs |
| Reliability   | 99.5% uptime, zero data loss     | Database backups, graceful degradation    |
| i18n          | Regional number formats          | Intl.NumberFormat, locale context         |
| Accessibility | WCAG 2.1 AA                      | Radix UI primitives, semantic HTML        |

**Scale & Complexity:**

- Primary domain: Full-stack SaaS (Next.js 16 + PostgreSQL)
- Complexity level: High
- Estimated architectural components: ~15 major domains

### Technical Constraints & Dependencies

**Existing Stack (Brownfield):**

- Next.js 16 with React 19 (App Router, Server Components)
- PostgreSQL with Drizzle ORM (type-safe queries)
- Vercel deployment (Edge runtime, KV cache)
- Inngest for background jobs
- Recharts for visualization (already installed)

**External Dependencies:**

- Market data API (Gemini primary, Yahoo Finance fallback)
- Exchange rate API (ExchangeRate-API primary, OpenExchangeRates fallback)
- Email provider (Resend for verification, password reset)

**Constraints:**

- API rate limits require aggressive caching
- Financial precision requires Decimal.js (not native floats)
- GDPR compliance requires data export/deletion capabilities

### Cross-Cutting Concerns Identified

| Concern                 | Scope                      | Architectural Pattern                  |
| ----------------------- | -------------------------- | -------------------------------------- |
| **Multi-tenancy**       | All data access            | userId scoping on every query          |
| **Authentication**      | API routes, pages          | JWT middleware, refresh token flow     |
| **Caching**             | Dashboard, recommendations | Vercel KV with 24h TTL                 |
| **Financial Precision** | All calculations           | Decimal.js with 20-digit precision     |
| **Event Sourcing**      | Score calculations         | Immutable event log for audit          |
| **Error Handling**      | API layer                  | Standardized responses, error codes    |
| **Observability**       | All services               | OpenTelemetry tracing, structured logs |
| **i18n**                | Number/currency display    | Intl API, future next-intl             |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack SaaS (Next.js 16 + PostgreSQL) - **Brownfield project with established codebase**

### Existing Foundation Assessment

This is a brownfield project with 9 completed epics and a mature technical foundation. Rather than selecting a new starter template, we validate the existing stack against PRD v2.0 requirements.

### Current Technical Stack

| Layer               | Technology            | Version         | Alignment                      |
| ------------------- | --------------------- | --------------- | ------------------------------ |
| **Framework**       | Next.js               | 16.0.10         | ✅ Optimal for React 19        |
| **React**           | React                 | 19.2.0          | ✅ Latest features             |
| **Database**        | PostgreSQL + Drizzle  | 0.44.7          | ✅ Type-safe, production-ready |
| **Styling**         | Tailwind CSS          | 4.x             | ✅ Modern utility-first        |
| **UI Components**   | Radix UI + shadcn/ui  | Latest          | ✅ WCAG accessible             |
| **Forms**           | react-hook-form + Zod | 7.67.0 / 4.1.13 | ✅ Validation ready            |
| **Charts**          | Recharts              | 3.5.1           | ✅ Pie charts ready            |
| **Testing**         | Vitest + Playwright   | Latest          | ✅ Unit + E2E                  |
| **Background Jobs** | Inngest               | 3.46.0          | ✅ Serverless overnight        |
| **Caching**         | Vercel KV             | 3.0.0           | ✅ Edge caching                |
| **Observability**   | OpenTelemetry         | 1.x             | ✅ Tracing ready               |
| **Email**           | Resend                | 6.5.2           | ✅ Verification flows          |

### Required Additions for PRD v2.0

| Capability              | Required Technology | Installation              |
| ----------------------- | ------------------- | ------------------------- |
| **i18n Infrastructure** | next-intl           | `pnpm add next-intl`      |
| **Number Formatting**   | Intl.NumberFormat   | Built-in (create wrapper) |

### Architectural Decisions Already Established

**Language & Runtime:**

- TypeScript with strict mode
- Next.js App Router with Server/Client Components
- Edge runtime for middleware

**Styling Solution:**

- Tailwind CSS with custom tokens
- shadcn/ui component library (Slate Professional theme)
- CVA for component variants

**Build Tooling:**

- Turbopack (Next.js default)
- pnpm for package management
- drizzle-kit for migrations

**Testing Framework:**

- Vitest for unit/integration tests
- Playwright for E2E tests
- Test coverage reporting

**Code Organization:**

- Feature-based structure under `src/`
- Services layer for business logic (`src/lib/services/`)
- API utilities with standardized responses (`src/lib/api/`)

**Development Experience:**

- Hot reload via Next.js dev server
- TypeScript strict mode
- ESLint + Prettier
- Structured logging

**Note:** No new project initialization needed. Focus on adding i18n infrastructure and implementing new visual feedback components.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- i18n strategy: next-intl + Intl.NumberFormat
- Real-time visual feedback: react-hook-form watch()
- Form validation: Block save until 100% valid
- Number formatting: Context + hooks architecture

**Important Decisions (Shape Architecture):**

- Pie chart: Single reusable AllocationPieChart component
- Recalculation: Synchronous after portfolio CRUD
- Two-tier refresh: Inngest → PostgreSQL → KV cache
- Autocomplete: Hybrid cached common + API search

**Deferred Decisions (Post-MVP):**

- Full translation infrastructure (next-intl routing)
- Offline capability / PWA
- Mobile app architecture

### Data Architecture

| Decision                | Choice                    | Version  | Rationale                              |
| ----------------------- | ------------------------- | -------- | -------------------------------------- |
| **Database**            | PostgreSQL + Drizzle ORM  | 0.44.7   | Existing, type-safe                    |
| **Caching**             | Vercel KV (Redis)         | 3.0.0    | Edge-optimized, existing               |
| **Two-Tier Refresh**    | Inngest → PostgreSQL → KV | -        | DB as source of truth, KV for hot data |
| **Financial Precision** | Decimal.js                | Existing | 20-digit precision for calculations    |

**Two-Tier Refresh Pattern:**

```
Inngest Cron (overnight)
    ↓
Fetch from Market Data API (Gemini/Yahoo)
    ↓
Store in PostgreSQL (durable, source of truth)
    ↓
Warm Vercel KV cache (hot data for fast reads)
    ↓
User requests read from KV (cache-first)
    ↓
User "Force Refresh" → API → PostgreSQL → KV
```

### Authentication & Security

| Decision               | Choice                        | Rationale              |
| ---------------------- | ----------------------------- | ---------------------- |
| **Authentication**     | JWT (jose) + bcrypt           | Existing, proven       |
| **Session Management** | 15min access + 7d/30d refresh | Existing pattern       |
| **Authorization**      | RLS + userId scoping          | Multi-tenant isolation |
| **API Security**       | Rate limiting via Vercel KV   | Existing               |

_No new security decisions needed - existing patterns are sound._

### API & Communication Patterns

| Decision                  | Choice                             | Rationale                    |
| ------------------------- | ---------------------------------- | ---------------------------- |
| **API Style**             | REST with standardized responses   | Existing, consistent         |
| **Error Handling**        | Error codes + structured responses | Existing pattern             |
| **Recalculation Trigger** | Synchronous after CRUD             | <100ms per asset, simpler UX |

**Recalculation Flow (Portfolio Edit/Delete):**

```
User edits/deletes portfolio
    ↓
Server Action validates change
    ↓
Database update (Drizzle)
    ↓
Synchronous score recalculation
    ↓
Recommendation regeneration
    ↓
Cache invalidation (KV)
    ↓
Response with updated data
```

### Frontend Architecture

| Decision               | Choice                              | Rationale                         |
| ---------------------- | ----------------------------------- | --------------------------------- |
| **i18n Library**       | next-intl                           | App Router native, smaller bundle |
| **Number Formatting**  | Context + useNumberFormat() hook    | Reactive to locale changes        |
| **Real-Time Feedback** | react-hook-form watch()             | Already installed, reactive       |
| **Form Validation UX** | Block save until valid              | PRD: "no silent failures"         |
| **Pie Chart**          | Single AllocationPieChart component | Reusable across views             |
| **Autocomplete**       | Hybrid: cached common + API search  | Balance speed vs. coverage        |

**Number Formatting Architecture:**

```tsx
// Context provides locale from user preferences
<NumberFormatProvider locale={user.locale}>
  <App />
</NumberFormatProvider>;

// Hook for formatting
const { formatNumber, formatCurrency, formatPercent } = useNumberFormat();

// Usage
formatNumber(1234.56); // "1,234.56" (en-US) or "1.234,56" (de-DE)
```

**Pie Chart Component API:**

```tsx
<AllocationPieChart
  data={holdings} // Array of { name, value, color? }
  showLabels={true} // Show percentage labels
  showLegend={true} // Show legend below
  size="md" // sm | md | lg
  interactive={true} // Hover tooltips
/>
```

**Live Allocation Sum Pattern:**

```tsx
const allocations = watch("holdings");
const total = allocations?.reduce((sum, h) => sum + (h.percentage || 0), 0) ?? 0;
const remaining = 100 - total;

// Visual feedback
<AllocationIndicator allocated={total} remaining={remaining} valid={remaining === 0} />;
```

### Infrastructure & Deployment

| Decision            | Choice         | Rationale                       |
| ------------------- | -------------- | ------------------------------- |
| **Hosting**         | Vercel         | Existing, optimized for Next.js |
| **Background Jobs** | Inngest        | Existing, serverless overnight  |
| **Monitoring**      | OpenTelemetry  | Existing, production-ready      |
| **CI/CD**           | GitHub Actions | Existing                        |

_No new infrastructure decisions needed - existing patterns are optimal._

### Decision Impact Analysis

**Implementation Sequence:**

1. Add next-intl + create NumberFormatProvider context
2. Create useNumberFormat() hook with Intl.NumberFormat
3. Build AllocationPieChart component (Recharts)
4. Implement live allocation feedback with RHF watch()
5. Add 100% validation to strategy forms
6. Implement synchronous recalculation on portfolio CRUD
7. Build autocomplete with hybrid data source

**Cross-Component Dependencies:**

- NumberFormatProvider must wrap entire app (layout.tsx)
- AllocationPieChart depends on useNumberFormat() for labels
- Strategy forms depend on AllocationPieChart + live feedback
- Recalculation affects recommendations cache (KV invalidation)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices - all now have consistent patterns defined.

### Naming Patterns

**Database Naming Conventions:**

| Element      | Convention                 | Example                                      |
| ------------ | -------------------------- | -------------------------------------------- |
| Tables       | snake_case, plural         | `portfolios`, `holdings`, `scoring_criteria` |
| Columns      | snake_case                 | `user_id`, `created_at`, `target_percentage` |
| Foreign Keys | `{table}_id`               | `portfolio_id`, `user_id`                    |
| Indexes      | `idx_{table}_{columns}`    | `idx_holdings_portfolio_id`                  |
| Constraints  | `{table}_{type}_{columns}` | `portfolios_check_total_allocation`          |

**API Naming Conventions:**

| Element          | Convention                   | Example                                    |
| ---------------- | ---------------------------- | ------------------------------------------ |
| Endpoints        | kebab-case, plural resources | `/api/portfolios`, `/api/scoring-criteria` |
| Route Parameters | camelCase                    | `/api/portfolios/:portfolioId`             |
| Query Parameters | camelCase                    | `?includeHoldings=true&sortBy=name`        |
| Headers          | X-Custom-Header              | `X-Request-ID`, `X-User-Locale`            |

**Code Naming Conventions:**

| Element          | Convention           | Example                                         |
| ---------------- | -------------------- | ----------------------------------------------- |
| React Components | PascalCase           | `AllocationPieChart.tsx`, `PortfolioCard.tsx`   |
| Hooks            | camelCase with `use` | `useNumberFormat.ts`, `usePortfolios.ts`        |
| Services         | camelCase            | `portfolioService.ts`, `scoringService.ts`      |
| Utilities        | camelCase            | `formatNumber.ts`, `calculateAllocation.ts`     |
| Types/Interfaces | PascalCase           | `Portfolio`, `Holding`, `ScoringCriteria`       |
| Props Interfaces | PascalCase + Props   | `AllocationPieChartProps`, `PortfolioCardProps` |
| Constants        | SCREAMING_SNAKE_CASE | `MAX_HOLDINGS`, `DEFAULT_LOCALE`                |

**Cache Key Conventions:**

| Pattern       | Format                          | Example                    |
| ------------- | ------------------------------- | -------------------------- |
| User-scoped   | `user:{userId}:{resource}`      | `user:123:recommendations` |
| Global        | `global:{resource}`             | `global:market-quotes`     |
| With TTL hint | `{scope}:{resource}:v{version}` | `user:123:dashboard:v2`    |

### Structure Patterns

**Project Organization:**

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── (auth)/            # Auth route group
│   └── dashboard/         # Protected routes
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── charts/            # Chart components (NEW)
│   │   ├── AllocationPieChart.tsx
│   │   └── index.ts
│   ├── forms/             # Form components
│   └── portfolio/         # Portfolio feature components
├── contexts/              # React contexts (auth, theme)
├── hooks/                 # Custom React hooks
├── lib/
│   ├── api/               # API utilities (responses, error-codes)
│   ├── db/                # Database (schema, migrations)
│   ├── i18n/              # i18n utilities (NEW)
│   │   ├── NumberFormatProvider.tsx
│   │   ├── useNumberFormat.ts
│   │   └── index.ts
│   ├── services/          # Business logic services
│   └── utils/             # General utilities
└── types/                 # TypeScript type definitions
```

**Test Organization:**

```
tests/
├── unit/                  # Unit tests (mirror src/ structure)
│   ├── lib/
│   │   └── i18n/
│   │       └── useNumberFormat.test.ts
│   └── components/
│       └── charts/
│           └── AllocationPieChart.test.tsx
├── integration/           # API integration tests
└── e2e/                   # Playwright E2E tests
```

### Format Patterns

**API Response Formats:**

Success Response:

```typescript
// From src/lib/api/responses.ts
{
  success: true,
  data: { ... },
  meta?: { page, limit, total }
}
```

Error Response:

```typescript
// From src/lib/api/responses.ts
{
  success: false,
  error: {
    code: "PORTFOLIO_NOT_FOUND",
    message: "Portfolio not found",
    details?: { ... }
  }
}
```

**Date/Time Formats:**

| Context    | Format          | Example                      |
| ---------- | --------------- | ---------------------------- |
| API JSON   | ISO 8601 string | `"2025-12-26T10:30:00.000Z"` |
| Database   | timestamptz     | PostgreSQL native            |
| UI Display | Locale-aware    | Via `Intl.DateTimeFormat`    |

**Number Formats:**

| Context      | Format           | Example                  |
| ------------ | ---------------- | ------------------------ |
| API JSON     | Number primitive | `1234.56`                |
| Database     | DECIMAL(20,10)   | For financial precision  |
| UI Display   | Locale-aware     | Via `useNumberFormat()`  |
| Calculations | Decimal.js       | `new Decimal("1234.56")` |

### Communication Patterns

**Inngest Event Patterns:**

| Event Type    | Format              | Example                                    |
| ------------- | ------------------- | ------------------------------------------ |
| Domain events | `{domain}.{action}` | `portfolio.updated`, `scores.recalculated` |
| System events | `system.{action}`   | `system.overnight-job-started`             |
| User events   | `user.{action}`     | `user.force-refresh-requested`             |

Event Payload Structure:

```typescript
{
  name: "portfolio.updated",
  data: {
    userId: string,
    portfolioId: string,
    changes: { ... },
    timestamp: string // ISO 8601
  }
}
```

**State Management Patterns:**

| State Type     | Pattern            | Example                               |
| -------------- | ------------------ | ------------------------------------- |
| Loading states | `isLoading` prefix | `isLoadingPortfolios`, `isSubmitting` |
| Error states   | `error` suffix     | `portfolioError`, `submitError`       |
| Data states    | Descriptive noun   | `portfolios`, `recommendations`       |

### Process Patterns

**Error Handling Patterns:**

Structured Logging:

```typescript
// CORRECT
logger.error("Portfolio update failed", {
  userId,
  portfolioId,
  operation: "updatePortfolio",
  errorMessage: error.message,
  errorName: error.name,
});

// INCORRECT - Never use console.error
console.error("Failed"); // ❌
```

User-Facing Errors:

```typescript
// Show user-friendly message, log technical details
try {
  await updatePortfolio(data);
} catch (error) {
  logger.error("Portfolio update failed", { error, userId });
  toast.error("Unable to save changes. Please try again.");
}
```

**Form Validation Patterns:**

Inline Validation Display:

```tsx
<Input {...register("percentage")} />;
{
  errors.percentage && <p className="text-sm text-destructive mt-1">{errors.percentage.message}</p>;
}
```

Visual States:

```tsx
className={cn(
  "border",
  errors.percentage && "border-destructive",
  !errors.percentage && touchedFields.percentage && "border-green-500"
)}
```

**Loading State Patterns:**

```tsx
// Component level
const [isLoading, setIsLoading] = useState(false);

// Form submission
const {
  formState: { isSubmitting },
} = useForm();

// Data fetching (Server Components preferred)
<Suspense fallback={<Skeleton />}>
  <PortfolioList />
</Suspense>;
```

### Enforcement Guidelines

**All AI Agents MUST:**

1. Use structured logger (`@/lib/telemetry/logger`) - never `console.log/error`
2. Import error codes from `@/lib/api/error-codes.ts`
3. Use standardized responses from `@/lib/api/responses.ts`
4. Prefix unused variables with `_` (e.g., `_unusedParam`)
5. Run `pnpm lint` and `pnpm test` before committing
6. Add RLS policies for new tables (`pnpm security:check-rls`)
7. Use `Decimal.js` for all financial calculations
8. Format numbers via `useNumberFormat()` hook in UI

**Pattern Enforcement:**

- ESLint rules catch console usage and unused variables
- TypeScript strict mode catches type violations
- PR review checklist verifies patterns (see CLAUDE.md)
- CI pipeline runs lint + tests before merge

### Pattern Examples

**Good Examples:**

```typescript
// ✅ Correct: i18n-aware number display
const { formatPercent } = useNumberFormat();
<span>{formatPercent(holding.percentage)}</span>

// ✅ Correct: Structured error logging
logger.error("Score calculation failed", {
  userId,
  assetId,
  errorMessage: error.message
});

// ✅ Correct: Cache key naming
const cacheKey = `user:${userId}:recommendations`;
await kv.set(cacheKey, recommendations, { ex: 86400 });

// ✅ Correct: Event naming
await inngest.send({
  name: "portfolio.updated",
  data: { userId, portfolioId, changes }
});
```

**Anti-Patterns:**

```typescript
// ❌ Wrong: Hardcoded number format
<span>{holding.percentage.toFixed(2)}%</span>

// ❌ Wrong: Console logging
console.error("Failed to calculate score");

// ❌ Wrong: Inconsistent cache key
const key = `recommendations_${userId}`;

// ❌ Wrong: Inconsistent event naming
await inngest.send({ name: "PortfolioUpdated", ... });

// ❌ Wrong: Floating point for money
const total = 0.1 + 0.2; // 0.30000000000000004
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
investments-planner/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI pipeline
├── docs/                             # Project documentation
│   ├── index.md
│   ├── prd-v2.md                     # PRD source
│   ├── architecture.md               # This document (output)
│   └── ...
├── public/
│   └── assets/                       # Static assets
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── portfolios/
│   │   │   │   ├── [portfolioId]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx  # Portfolio edit (FR12)
│   │   │   │   └── page.tsx
│   │   │   ├── strategies/
│   │   │   ├── recommendations/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── portfolios/
│   │   │   │   ├── route.ts          # GET/POST portfolios
│   │   │   │   └── [portfolioId]/
│   │   │   │       └── route.ts      # GET/PUT/DELETE portfolio (FR11-14)
│   │   │   ├── assets/
│   │   │   │   └── search/
│   │   │   │       └── route.ts      # Asset autocomplete (FR24)
│   │   │   ├── scores/
│   │   │   └── recommendations/
│   │   ├── globals.css
│   │   ├── layout.tsx                # Root layout (NumberFormatProvider)
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── charts/                   # (NEW) Chart components
│   │   │   ├── AllocationPieChart.tsx        # (NEW) FR26-27
│   │   │   ├── AllocationPieChart.test.tsx   # (NEW) Tests
│   │   │   └── index.ts
│   │   ├── forms/
│   │   │   ├── AllocationIndicator.tsx       # (NEW) FR28-34
│   │   │   ├── AssetAutocomplete.tsx         # (NEW) FR24
│   │   │   ├── PortfolioForm.tsx
│   │   │   ├── StrategyForm.tsx
│   │   │   └── index.ts
│   │   ├── portfolio/
│   │   │   ├── PortfolioCard.tsx
│   │   │   ├── PortfolioList.tsx
│   │   │   ├── PortfolioActions.tsx          # Edit/Delete buttons (FR12-14)
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── Skeleton.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePortfolios.ts
│   │   └── useRecommendations.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── responses.ts           # Standardized API responses
│   │   │   ├── error-codes.ts         # Error code constants
│   │   │   └── middleware.ts
│   │   ├── db/
│   │   │   ├── schema.ts              # Drizzle schema
│   │   │   ├── index.ts               # DB connection
│   │   │   └── migrations/
│   │   ├── i18n/                      # (NEW) i18n infrastructure
│   │   │   ├── NumberFormatProvider.tsx      # (NEW) FR69
│   │   │   ├── useNumberFormat.ts            # (NEW) FR69
│   │   │   ├── locales.ts                    # (NEW) Locale configs
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   │   └── authService.ts
│   │   │   ├── portfolio/
│   │   │   │   ├── portfolioService.ts
│   │   │   │   └── portfolioValidation.ts   # 100% allocation (FR30-34)
│   │   │   ├── scoring/
│   │   │   │   ├── scoringService.ts
│   │   │   │   └── recalculationService.ts  # Sync recalc (FR12-14)
│   │   │   ├── market/
│   │   │   │   ├── marketDataService.ts
│   │   │   │   └── assetSearchService.ts    # Autocomplete (FR24)
│   │   │   └── recommendations/
│   │   │       └── recommendationService.ts
│   │   ├── telemetry/
│   │   │   ├── logger.ts              # Structured logger
│   │   │   └── tracing.ts             # OpenTelemetry
│   │   └── utils/
│   │       ├── decimal.ts             # Decimal.js helpers
│   │       └── validation.ts
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── refresh-market-data.ts # Overnight job (FR83-86)
│   │       ├── recalculate-scores.ts
│   │       └── cache-warming.ts       # Two-tier refresh (FR62)
│   ├── types/
│   │   ├── portfolio.ts
│   │   ├── holding.ts
│   │   ├── scoring.ts
│   │   └── api.ts
│   └── middleware.ts                  # Auth middleware
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── i18n/
│   │   │   │   └── useNumberFormat.test.ts   # (NEW)
│   │   │   └── services/
│   │   │       └── portfolioService.test.ts
│   │   └── components/
│   │       └── charts/
│   │           └── AllocationPieChart.test.tsx  # (NEW)
│   ├── integration/
│   │   ├── api/
│   │   │   ├── portfolios.test.ts
│   │   │   └── assets-search.test.ts         # (NEW)
│   │   └── services/
│   └── e2e/
│       ├── portfolio-crud.spec.ts            # (NEW) FR11-14
│       ├── allocation-feedback.spec.ts       # (NEW) FR28-34
│       └── fixtures/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── pnpm-lock.yaml
├── .env.local
├── .env.example
├── .eslintrc.js
├── .prettierrc
└── CLAUDE.md                          # AI agent instructions
```

### Architectural Boundaries

**API Boundaries:**

| Boundary  | Endpoint Pattern         | Auth Required     | Rate Limited  |
| --------- | ------------------------ | ----------------- | ------------- |
| Public    | `/api/auth/*`            | No                | Yes (5/min)   |
| Protected | `/api/portfolios/*`      | JWT               | Yes (100/min) |
| Protected | `/api/assets/*`          | JWT               | Yes (200/min) |
| Protected | `/api/recommendations/*` | JWT               | Yes (50/min)  |
| Internal  | `/api/inngest`           | Inngest signature | No            |

**Component Boundaries:**

```
┌─────────────────────────────────────────────────────────────┐
│                       App Router (pages)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Layout    │  │   Forms     │  │      Charts         │  │
│  │ Components  │  │ Components  │  │    Components       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                    │
│                    ┌─────▼─────┐                             │
│                    │   Hooks   │                              │
│                    │ (useAuth, │                              │
│                    │  usePort) │                              │
│                    └─────┬─────┘                             │
├──────────────────────────┼──────────────────────────────────┤
│                    ┌─────▼─────┐                             │
│                    │ Services  │                              │
│                    │  Layer    │                              │
│                    └─────┬─────┘                             │
├──────────────────────────┼──────────────────────────────────┤
│         ┌────────────────┼────────────────┐                  │
│         │                │                │                  │
│   ┌─────▼─────┐    ┌─────▼─────┐   ┌─────▼─────┐            │
│   │ Drizzle   │    │ Vercel KV │   │  Inngest  │            │
│   │   (DB)    │    │  (Cache)  │   │  (Jobs)   │            │
│   └───────────┘    └───────────┘   └───────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**Service Boundaries:**

| Service                 | Responsibility           | Dependencies              |
| ----------------------- | ------------------------ | ------------------------- |
| `authService`           | Login, register, session | DB, bcrypt, jose          |
| `portfolioService`      | CRUD, validation         | DB, scoringService        |
| `scoringService`        | Calculate scores         | DB, Decimal.js            |
| `recalculationService`  | Sync recalc              | scoringService, KV        |
| `marketDataService`     | Fetch quotes             | External API, KV          |
| `assetSearchService`    | Autocomplete             | DB (cached), External API |
| `recommendationService` | Generate recommendations | scoringService, KV        |

**Data Boundaries:**

| Layer         | Access Pattern            | Isolation            |
| ------------- | ------------------------- | -------------------- |
| PostgreSQL    | Drizzle ORM queries       | RLS + userId scoping |
| Vercel KV     | `kv.get/set` with TTL     | User-scoped keys     |
| External APIs | Service layer abstraction | API key in env       |

### Requirements to Structure Mapping

**Portfolio CRUD (FR11-FR14):**

```
FR11 (View): src/app/(dashboard)/portfolios/page.tsx
FR12 (Edit): src/app/(dashboard)/portfolios/[portfolioId]/edit/page.tsx
             src/app/api/portfolios/[portfolioId]/route.ts (PUT)
             src/lib/services/portfolio/portfolioService.ts
FR13 (Delete): src/app/api/portfolios/[portfolioId]/route.ts (DELETE)
               src/components/portfolio/PortfolioActions.tsx
FR14 (Recalc): src/lib/services/scoring/recalculationService.ts
```

**Visual Feedback (FR26-FR34):**

```
FR26-27 (Pie): src/components/charts/AllocationPieChart.tsx
FR28-29 (Sum): src/components/forms/AllocationIndicator.tsx
FR30-34 (Validate): src/lib/services/portfolio/portfolioValidation.ts
                    src/components/forms/StrategyForm.tsx
```

**i18n (FR69):**

```
FR69 (Number Format): src/lib/i18n/NumberFormatProvider.tsx
                      src/lib/i18n/useNumberFormat.ts
                      src/app/layout.tsx (provider wrap)
```

**Autocomplete (FR24):**

```
FR24 (Asset Search): src/components/forms/AssetAutocomplete.tsx
                     src/app/api/assets/search/route.ts
                     src/lib/services/market/assetSearchService.ts
```

### Integration Points

**Internal Communication:**

```
Form → useForm() → watch() → AllocationIndicator (real-time)
Form Submit → Server Action → portfolioService → DB → KV invalidation
Inngest Cron → marketDataService → DB → KV cache warming
```

**External Integrations:**

| Integration      | Purpose                | Location                   |
| ---------------- | ---------------------- | -------------------------- |
| Gemini API       | Market data (primary)  | `src/lib/services/market/` |
| Yahoo Finance    | Market data (fallback) | `src/lib/services/market/` |
| ExchangeRate-API | Currency rates         | `src/lib/services/market/` |
| Resend           | Email notifications    | `src/lib/services/email/`  |

**Data Flow:**

```
User Action
    ↓
App Router (page.tsx)
    ↓
Server Component OR Client Component
    ↓
Hooks (usePortfolios) OR Server Actions
    ↓
Service Layer (portfolioService)
    ↓
Data Layer (Drizzle → PostgreSQL, KV cache)
    ↓
Response → UI Update
```

### New Files for PRD v2.0

Files marked with 🆕 need to be created:

```
🆕 src/components/charts/AllocationPieChart.tsx
🆕 src/components/charts/index.ts
🆕 src/components/forms/AllocationIndicator.tsx
🆕 src/components/forms/AssetAutocomplete.tsx
🆕 src/lib/i18n/NumberFormatProvider.tsx
🆕 src/lib/i18n/useNumberFormat.ts
🆕 src/lib/i18n/locales.ts
🆕 src/lib/i18n/index.ts
🆕 src/lib/services/scoring/recalculationService.ts
🆕 src/lib/services/market/assetSearchService.ts
🆕 tests/unit/lib/i18n/useNumberFormat.test.ts
🆕 tests/unit/components/charts/AllocationPieChart.test.tsx
🆕 tests/e2e/portfolio-crud.spec.ts
🆕 tests/e2e/allocation-feedback.spec.ts
```

### Development Workflow Integration

**Development Commands:**

```bash
pnpm dev              # Start dev server
pnpm lint             # ESLint check
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright E2E tests
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm security:check-rls  # Verify RLS policies
pnpm build            # Production build
```

**Build Output:**

```
.next/               # Next.js build output (gitignored)
├── static/          # Static assets
├── server/          # Server-side code
└── cache/           # Build cache
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together seamlessly. Next.js 16 with React 19 provides the foundation, Drizzle ORM ensures type-safe database access, and Recharts handles visualization. The addition of next-intl for i18n integrates cleanly with the App Router architecture. No version conflicts exist between any dependencies.

**Pattern Consistency:**
Implementation patterns align with technology choices:

- snake_case for database (Drizzle convention)
- camelCase for TypeScript code (JS ecosystem standard)
- PascalCase for React components (React convention)
- Structured logging via OpenTelemetry (existing pattern)

**Structure Alignment:**
Project structure supports all architectural decisions:

- i18n files grouped under `src/lib/i18n/`
- Charts components under `src/components/charts/`
- Services layer handles business logic separation
- Test structure mirrors source structure

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
All 95 functional requirements from PRD v2.0 are architecturally supported:

- Portfolio CRUD (FR11-14): API routes + services + recalculation
- Visual Feedback (FR26-34): AllocationPieChart + AllocationIndicator + RHF watch()
- i18n (FR69): NumberFormatProvider + useNumberFormat hook
- Autocomplete (FR24): Hybrid cached + API search architecture

**Functional Requirements Coverage:**
| FR Category | Count | Coverage |
|-------------|-------|----------|
| User Management | 10 | ✅ Existing auth infrastructure |
| Portfolio Operations | 25 | ✅ CRUD + recalculation patterns |
| Visual Feedback | 15 | ✅ New chart + indicator components |
| Scoring Engine | 20 | ✅ Existing + sync recalculation |
| Recommendations | 10 | ✅ Overnight pre-computation |
| Data Pipeline | 15 | ✅ Two-tier refresh architecture |

**Non-Functional Requirements Coverage:**

- Performance (<2s dashboard, <100ms pie): Edge caching + pre-computation ✅
- Security (RLS, JWT): Existing multi-tenant isolation ✅
- Scalability (1,000+ users): Serverless Inngest + KV cache ✅
- i18n (regional formats): Intl.NumberFormat context ✅
- Accessibility (WCAG 2.1 AA): Radix UI primitives ✅

### Implementation Readiness Validation ✅

**Decision Completeness:**

- 8 critical decision categories documented with specific versions
- next-intl version: latest (App Router compatible)
- Recharts version: 3.5.1 (already installed)
- All integration patterns specified with code examples

**Structure Completeness:**

- 14 new files identified for PRD v2.0 features
- Complete directory tree with all paths
- Test file locations for each new component
- Clear separation of concerns (components/services/lib)

**Pattern Completeness:**

- 12 potential conflict points addressed
- Naming conventions for DB, API, code, cache keys
- Event patterns for Inngest communication
- Error handling with structured logging

### Gap Analysis Results

**Critical Gaps:** None identified

**Important Gaps (Addressed):**

- i18n library selection: Resolved → next-intl
- Recalculation timing: Resolved → Synchronous after CRUD
- Pie chart library: Resolved → Recharts (existing)

**Nice-to-Have Gaps (Post-MVP):**

- Full next-intl routing for language switching
- Offline/PWA capability
- Mobile app architecture

### Validation Issues Addressed

No critical issues found during validation. All architectural decisions are coherent, complete, and ready for implementation.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed (95 FRs, NFRs mapped)
- [x] Scale and complexity assessed (High complexity, ~15 domains)
- [x] Technical constraints identified (API rate limits, Decimal.js)
- [x] Cross-cutting concerns mapped (multi-tenancy, auth, caching, i18n)

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (Next.js 16, React 19, Drizzle)
- [x] Integration patterns defined (two-tier refresh, sync recalc)
- [x] Performance considerations addressed (KV cache, pre-computation)

**✅ Implementation Patterns**

- [x] Naming conventions established (12 pattern categories)
- [x] Structure patterns defined (src/, tests/, components/)
- [x] Communication patterns specified (Inngest events, state)
- [x] Process patterns documented (error handling, loading states)

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION ✅

**Confidence Level:** HIGH based on:

- Brownfield project with proven existing patterns
- All new decisions build on established foundation
- Comprehensive validation with no critical gaps
- Clear implementation sequence defined

**Key Strengths:**

- Mature existing codebase (9 completed epics)
- Type-safe stack (TypeScript + Drizzle)
- Proven auth and multi-tenancy patterns
- Existing test infrastructure (Vitest + Playwright)
- Production-ready observability (OpenTelemetry)

**Areas for Future Enhancement:**

- Full translation infrastructure (next-intl routing)
- Offline capability / PWA
- Mobile app architecture
- Advanced analytics dashboard

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Add next-intl and create NumberFormatProvider context

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2025-12-26
**Document Location:** \_bmad-output/planning-artifacts/architecture.md

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 8 architectural decision categories made
- 12 implementation pattern categories defined
- 15 architectural components specified
- 95 functional requirements fully supported

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing investments-planner. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**

1. Install next-intl: `pnpm add next-intl`
2. Create NumberFormatProvider context
3. Build AllocationPieChart component

**Development Sequence:**

1. Add i18n infrastructure (NumberFormatProvider, useNumberFormat)
2. Create chart components (AllocationPieChart)
3. Build form feedback components (AllocationIndicator, AssetAutocomplete)
4. Implement synchronous recalculation service
5. Add E2E tests for new flows

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**

- [x] All 95 functional requirements are supported
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All 95 functional requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**🏗️ Solid Foundation**
The existing brownfield codebase with 9 completed epics provides a production-ready foundation that new features build upon naturally.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
