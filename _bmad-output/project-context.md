---
project_name: "investments-planner"
user_name: "Bmad"
date: "2025-12-31"
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - critical_rules
status: "complete"
rule_count: 47
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Technology      | Version | Critical Notes                               |
| --------------- | ------- | -------------------------------------------- |
| Next.js         | 16.0.10 | App Router, Server Components                |
| React           | 19.2.0  | use() hook available                         |
| TypeScript      | 5.x     | Strict mode + noUncheckedIndexedAccess       |
| Drizzle ORM     | 0.44.7  | PostgreSQL, snake_case tables                |
| Tailwind CSS    | 4.x     | tw-animate-css for animations                |
| react-hook-form | 7.67.0  | Use watch() for real-time feedback           |
| Zod             | 4.1.13  | Schema-first validation                      |
| Decimal.js      | 10.6.0  | **MANDATORY** for all financial calculations |
| Inngest         | 3.46.0  | Serverless background jobs                   |
| Vercel KV       | 3.0.0   | Redis cache, TTL-based                       |
| Recharts        | 3.5.1   | Pie charts, responsive                       |

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

**TypeScript Configuration:**

- `noUncheckedIndexedAccess: true` - Always handle `undefined` when accessing arrays/objects by index
- `exactOptionalPropertyTypes: true` - `prop?: T` means "missing", not `undefined`
- Path alias: Use `@/` for all imports from `src/`

**Critical Patterns:**

- NEVER use `console.log`, `console.error`, `console.warn`
- ALWAYS use `logger` from `@/lib/telemetry/logger`
- NEVER leave unused variables without `_` prefix
- ALWAYS prefix intentionally unused params: `_event`, `_context`

**Financial Calculations:**

- NEVER use native `number` for money: `0.1 + 0.2 = 0.30000000000000004`
- ALWAYS use `Decimal.js`: `new Decimal("0.1").plus("0.2")` = `0.3`
- Import from `@/lib/calculations/decimal-utils.ts`

**Decimal.js Edge Cases (CRITICAL):**

| Issue               | Problem                                                               | Solution                                                             |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `-0` vs `+0`        | `new Decimal(0).times(-2)` returns `-0`, which fails `toEqual(0)`     | Use explicit zero check: `result.isZero() ? new Decimal(0) : result` |
| String comparison   | `new Decimal("10").eq("10.00")` is `true`, but `===` comparison fails | Always use `.eq()`, `.lt()`, `.gt()` methods, never `===`            |
| Constructor strings | `new Decimal(0.1)` has precision issues                               | Always use string literals: `new Decimal("0.1")`                     |
| Rounding modes      | Default rounding may differ from financial standards                  | Specify mode: `.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`           |

```typescript
// CORRECT - Handle -0 edge case
const penalty = missingYears > 0 ? new Decimal(missingYears).times(-2) : new Decimal(0); // Explicit zero, not times(0)

// WRONG - May produce -0
const penalty = new Decimal(missingYears).times(-2); // When missingYears=0, returns -0
```

**Error Handling:**

```typescript
// CORRECT
logger.error("Operation failed", { userId, errorMessage: error.message });

// WRONG
console.error("Operation failed", error);
```

### Framework-Specific Rules (Next.js + React)

**Next.js App Router:**

- Default to Server Components; add `"use client"` only when necessary
- API routes use standardized responses from `@/lib/api/responses.ts`
- Error codes from `@/lib/api/error-codes.ts`

**API Response Pattern:**

```typescript
// CORRECT - Use standardized responses
import { successResponse, errorResponse } from "@/lib/api/responses";
import { ERROR_CODES } from "@/lib/api/error-codes";

return successResponse({ data });
return errorResponse("Not found", ERROR_CODES.NOT_FOUND, 404);

// WRONG - Custom response shapes
return NextResponse.json({ error: "Failed" });
```

**React Form Patterns:**

- Use `watch()` from react-hook-form for live allocation feedback
- Block form submission until validation passes (100% allocation rule)
- Visual states: `border-destructive` for errors, `border-green-500` for valid

**i18n Number Formatting:**

```typescript
// CORRECT - Use the hook
const { formatNumber, formatPercent } = useNumberFormat();
<span>{formatPercent(value)}</span>

// WRONG - Direct formatting
<span>{value.toFixed(2)}%</span>
```

**Component Location:**

- UI primitives: `src/components/ui/` (shadcn/ui)
- Charts: `src/components/charts/`
- Forms: `src/components/forms/`
- Feature components: `src/components/{feature}/`

### Testing Rules

**Test Organization:**

- Unit tests: `tests/unit/{mirror-src-structure}/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/` (Playwright)

**Coverage Requirements:**

- Minimum 80% for lines, functions, branches, statements
- Every code change MUST include corresponding tests
- Bug fixes require: test reproducing bug + verification test

**Test File Naming:**

- Unit/Integration: `*.test.ts` or `*.test.tsx`
- E2E: `*.spec.ts`

**Mandatory Test Coverage:**
| Change Type | Required Tests |
|-------------|----------------|
| Bug Fix | Unit test reproducing bug + fix verification |
| New Function | Unit tests for all code paths |
| API Endpoint | Unit + Integration tests |
| Security Fix | Unit + security scenario tests |

**Test Commands:**

```bash
pnpm test              # Run unit + integration tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
pnpm test:e2e          # Playwright E2E tests
```

**Mock Data Location:**

- Place mocks in `src/lib/mocks/` not in production routes
- Never import mock data in production code paths

### Code Quality & Style Rules

**Pre-Commit Checks (Husky + lint-staged):**

```bash
pnpm exec tsc --noEmit     # Type checking
pnpm lint                   # ESLint
pnpm test                   # Unit tests
pnpm security:check-rls     # RLS policy coverage
pnpm build                  # Build verification
```

**Naming Conventions:**
| Context | Convention | Example |
|---------|------------|---------|
| Database tables | snake_case, plural | `portfolios`, `scoring_criteria` |
| Database columns | snake_case | `user_id`, `created_at` |
| TypeScript functions | camelCase | `calculateScore`, `fetchPrices` |
| React components | PascalCase | `AllocationPieChart.tsx` |
| Types/Interfaces | PascalCase | `Portfolio`, `ScoringCriteria` |
| Props interfaces | PascalCase + Props | `PortfolioCardProps` |
| Constants | SCREAMING_SNAKE | `MAX_HOLDINGS`, `ERROR_CODES` |
| Cache keys | colon-separated | `user:123:recommendations` |

**API Endpoint Naming:**

- Endpoints: kebab-case, plural resources (`/api/portfolios`, `/api/scoring-criteria`)
- Route params: camelCase (`/api/portfolios/:portfolioId`)
- Query params: camelCase (`?includeHoldings=true`)

**Inngest Event Naming:**

- Domain events: `{domain}.{action}` (`portfolio.updated`, `scores.recalculated`)
- System events: `system.{action}` (`system.overnight-job-started`)

### Development Workflow Rules

**Branch & Commit Patterns:**

- Main branch: `main`
- Feature branches: `feature/{description}` or `fix/{description}`
- Commits include: `Co-Authored-By: Claude <noreply@anthropic.com>` for AI work

**PR Checklist (Mandatory):**

- [ ] `pnpm exec tsc --noEmit` - No type errors
- [ ] `pnpm lint` - No linting errors
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm security:check-rls` - RLS policies verified
- [ ] `pnpm build` - Production build succeeds

**Database Workflow:**

```bash
pnpm db:generate    # Generate migration from schema changes
pnpm db:migrate     # Apply migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio
```

**New Table Security (RLS):**

- Every new table MUST have RLS enabled
- Auth token tables need `REVOKE ALL FROM anon, authenticated`
- Run `pnpm security:check-rls` before committing

**Cache Invalidation Pattern:**

- Portfolio CRUD triggers synchronous recalculation
- Invalidate user-scoped cache keys after mutations
- TTL standards: recommendations=24h, quotes=1h, dashboard=15m

### Critical Don't-Miss Rules

**Anti-Patterns (NEVER DO):**

| Bad Pattern                 | Good Pattern                          | Why                         |
| --------------------------- | ------------------------------------- | --------------------------- |
| `console.error("Failed")`   | `logger.error("Failed", { context })` | Structured logging required |
| `value.toFixed(2)`          | `formatPercent(value)`                | i18n number formatting      |
| `0.1 + 0.2`                 | `new Decimal("0.1").plus("0.2")`      | Financial precision         |
| `db.select().filter(...)`   | `db.select().where(eq(...))`          | Drizzle ORM syntax          |
| `{ error: "msg" }`          | `errorResponse("msg", ERROR_CODES.X)` | Standardized responses      |
| `const data = ...` (unused) | `const _data = ...`                   | Prefix unused vars          |

**Database Query Rules:**

- NEVER do full table scans - always use `where()` with `eq()`, `inArray()`, etc.
- ALWAYS define foreign key constraints with appropriate `ON DELETE` behavior
- Add indexes for frequently queried columns

**Security Rules:**

- All data queries MUST be scoped by `userId` (multi-tenant isolation)
- New tables MUST have RLS enabled
- Auth tokens require `REVOKE ALL FROM anon, authenticated`
- Run `pnpm security:check-rls` before every commit

**Portfolio Business Rules:**

- Allocation percentages MUST sum to exactly 100%
- Block save button until allocation is valid
- When industry/asset type changes, incompatible assets must be REMOVED (with user confirmation)
- Recalculation is SYNCHRONOUS after portfolio CRUD (<100ms per asset)

**Data Refresh Pattern (Two-Tier):**

```
Inngest Cron (overnight) → PostgreSQL (source of truth) → Vercel KV (hot cache)
User reads from KV first → fallback to PostgreSQL if cache miss
User "Force Refresh" → API → PostgreSQL → KV invalidation
```

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

_Last Updated: 2025-12-31_
