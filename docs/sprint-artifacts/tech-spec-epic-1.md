# Epic Technical Specification: Foundation

Date: 2025-11-29
Author: Bmad
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the complete technical foundation for Investments Planner - a fintech SaaS platform that automates investment portfolio analysis. This foundation epic implements the critical infrastructure patterns identified through pre-mortem analysis: financial precision (decimal.js + PostgreSQL numeric), audit capability (event-sourced calculations), and performance (pre-computed overnight processing with Vercel KV cache).

The architecture follows a hybrid approach: fresh Next.js 15 build with the SaaS Starter as pattern reference only. This avoids Stripe coupling while enabling purpose-built fintech patterns from day one. All 8 stories in this epic create infrastructure that enables the remaining 65 stories across Epics 2-9.

## Objectives and Scope

### In Scope

- Project initialization with Next.js 15, TypeScript strict mode, Tailwind CSS v4, shadcn/ui
- PostgreSQL database with Drizzle ORM using `numeric(19,4)` for all currency fields
- Custom JWT authentication with refresh token rotation (15min access, 7d refresh)
- Event-sourced calculation pipeline with 4 event types (CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED)
- OpenTelemetry instrumentation at job-level spans (not per-operation)
- Vercel KV cache infrastructure for <2s dashboard load
- Vitest unit testing + Playwright E2E testing frameworks
- App shell with Command Center layout (persistent sidebar, Focus Mode content area)

### Out of Scope

- Business logic implementation (scoring engine, recommendations) - Epic 5, 7
- External API integrations (Gemini, exchange rates) - Epic 6
- User-facing features (portfolio management, criteria configuration) - Epics 2-4
- Alerts and notifications - Epic 9
- Stripe/payment integration (monetization deferred per PRD)

## System Architecture Alignment

This epic implements the foundation layer from the architecture document:

| Architecture Component | Story | Implementation |
|------------------------|-------|----------------|
| Hybrid Approach (ADR-001) | 1.1 | Fresh create-next-app + starter as reference |
| Event-Sourced Calculations (ADR-002) | 1.4 | 4-event pipeline with correlation IDs |
| Inngest Background Jobs (ADR-003) | (Epic 8) | Infrastructure prepared, not implemented |
| Vercel Deployment (ADR-004) | 1.6 | Vercel KV cache setup |
| Provider Abstraction (ADR-005) | (Epic 6) | Interfaces defined, not implemented |

**Critical Risk Mitigations Addressed:**
- Float precision errors → decimal.js + PostgreSQL numeric (Story 1.2)
- Audit gaps → Event-sourced calculations (Story 1.4)
- Dashboard performance → Vercel KV cache (Story 1.6)
- Auth security → JWT + refresh token rotation (Story 1.3)

---

## Detailed Design

### Services and Modules

| Module | Responsibility | Location | Dependencies |
|--------|---------------|----------|--------------|
| **Auth Service** | JWT issue/verify, refresh token rotation, session management | `lib/auth/` | PostgreSQL, Vercel KV |
| **Database Client** | Drizzle ORM connection, query builder | `lib/db/` | PostgreSQL |
| **Event Store** | Calculation event persistence, replay capability | `lib/events/` | PostgreSQL |
| **Cache Service** | Vercel KV operations, TTL management | `lib/cache/` | Vercel KV |
| **Telemetry** | OpenTelemetry span creation, OTLP export | `lib/telemetry/` | OTLP endpoint |
| **Decimal Utils** | Financial precision calculations | `lib/calculations/decimal-utils.ts` | decimal.js |

### Data Models and Contracts

#### Core Schema (Drizzle ORM)

```typescript
// lib/db/schema.ts

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull().default('USD'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Refresh tokens for JWT rotation
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Calculation events (event sourcing)
export const calculationEvents = pgTable('calculation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  correlationId: uuid('correlation_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Indexes
export const eventsCorrelationIdx = index('events_correlation_id_idx')
  .on(calculationEvents.correlationId);
export const eventsUserIdx = index('events_user_id_idx')
  .on(calculationEvents.userId);
```

#### Event Types (Event Sourcing)

```typescript
// lib/events/types.ts

export type CalculationEvent =
  | {
      type: 'CALC_STARTED';
      correlationId: string;
      userId: string;
      timestamp: Date;
      market?: string;
    }
  | {
      type: 'INPUTS_CAPTURED';
      correlationId: string;
      criteriaVersionId: string;
      criteria: CriteriaConfig;
      prices: PriceSnapshot[];
      rates: ExchangeRateSnapshot[];
      assetIds: string[];
    }
  | {
      type: 'SCORES_COMPUTED';
      correlationId: string;
      results: Array<{
        assetId: string;
        score: string;
        breakdown: CriterionScore[];
      }>;
    }
  | {
      type: 'CALC_COMPLETED';
      correlationId: string;
      duration: number;
      assetCount: number;
      status: 'success' | 'partial' | 'failed';
    };

export interface PriceSnapshot {
  symbol: string;
  price: string; // Decimal string
  currency: string;
  timestamp: Date;
  source: string;
}

export interface ExchangeRateSnapshot {
  base: string;
  target: string;
  rate: string; // Decimal string
  timestamp: Date;
  source: string;
}
```

#### JWT Payload

```typescript
// lib/auth/types.ts

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}
```

### APIs and Interfaces

#### Authentication Endpoints

| Method | Path | Request | Response | Auth |
|--------|------|---------|----------|------|
| POST | `/api/auth/register` | `{ email, password, name? }` | `{ user, accessToken }` | No |
| POST | `/api/auth/login` | `{ email, password, remember? }` | `{ user, accessToken }` | No |
| POST | `/api/auth/logout` | - | `{ success: true }` | JWT |
| POST | `/api/auth/refresh` | - (refresh token in cookie) | `{ accessToken }` | Refresh |
| GET | `/api/auth/me` | - | `{ user }` | JWT |

#### Auth Middleware

```typescript
// lib/auth/middleware.ts

export async function verifyAuth(request: NextRequest): Promise<Session | null> {
  const accessToken = request.cookies.get('access_token')?.value;
  if (!accessToken) return null;

  try {
    const payload = await verifyJwt(accessToken);
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (request: NextRequest) => {
    const session = await verifyAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, session);
  };
}
```

### Workflows and Sequencing

#### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. LOGIN REQUEST                                                    │
│     POST /api/auth/login { email, password }                        │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. VERIFY CREDENTIALS                                               │
│     - Fetch user by email                                           │
│     - Compare password hash (bcrypt, cost 12)                       │
│     - Check email verified                                          │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. GENERATE TOKENS                                                  │
│     - Access token: JWT, 15 min expiry                              │
│     - Refresh token: JWT, 7d expiry (30d if "remember me")          │
│     - Store refresh token hash in database                          │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SET COOKIES                                                      │
│     - access_token: httpOnly, secure, sameSite=strict, maxAge=15m   │
│     - refresh_token: httpOnly, secure, sameSite=strict, maxAge=7d   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. ACCESS TOKEN EXPIRED                                             │
│     Client receives 401 Unauthorized                                │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. REFRESH REQUEST                                                  │
│     POST /api/auth/refresh (refresh_token cookie)                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. VALIDATE & ROTATE                                                │
│     - Verify refresh token signature                                │
│     - Check token exists in DB and not expired                      │
│     - Delete old refresh token (rotation)                           │
│     - Generate new access + refresh tokens                          │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. UPDATE COOKIES                                                   │
│     - Set new access_token cookie                                   │
│     - Set new refresh_token cookie                                  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Event Sourcing Flow (Future - Epic 5+)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CALC_STARTED                                                        │
│  { correlationId, userId, timestamp, market }                       │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  INPUTS_CAPTURED                                                     │
│  { correlationId, criteriaVersionId, criteria, prices, rates }      │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SCORES_COMPUTED                                                     │
│  { correlationId, results: [{ assetId, score, breakdown }] }        │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CALC_COMPLETED                                                      │
│  { correlationId, duration, assetCount, status }                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Non-Functional Requirements

### Performance

| Target | Metric | Story | Implementation |
|--------|--------|-------|----------------|
| Dashboard load | < 2 seconds | 1.6 | Vercel KV cache for pre-computed data |
| Auth operations | < 500ms | 1.3 | Connection pooling, indexed queries |
| Event store write | < 50ms | 1.4 | Batch inserts, async where possible |
| Dev server start | < 10 seconds | 1.1 | Optimized Next.js config |

### Security

| Requirement | Implementation | Story |
|-------------|----------------|-------|
| Password hashing | bcrypt, cost factor 12 | 1.3 |
| Token signing | RS256 asymmetric (or HS256 with secret rotation) | 1.3 |
| Cookie security | httpOnly, secure, sameSite=strict | 1.3 |
| Rate limiting | 100 req/min per IP on auth routes | 1.3 |
| SQL injection | Drizzle parameterized queries | 1.2 |
| XSS prevention | React default escaping + CSP headers | 1.1 |
| Tenant isolation | All queries include userId filter | 1.2 |

**Security Headers (next.config.js):**
```javascript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline';" }
];
```

### Reliability/Availability

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| Database uptime | 99.9% | Vercel Postgres / Neon managed |
| Cache availability | 99.9% | Vercel KV managed |
| Error recovery | Graceful degradation | Try-catch with fallbacks |
| Data durability | Zero loss | PostgreSQL with daily backups |

### Observability

| Signal | Implementation | Story |
|--------|----------------|-------|
| Traces | OpenTelemetry spans (job-level) | 1.5 |
| Metrics | Span attributes (durations, counts) | 1.5 |
| Logs | Structured JSON, console.log | 1.1 |
| Errors | Error spans with messages | 1.5 |

**OpenTelemetry Configuration:**
```typescript
// lib/telemetry/index.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('investments-planner', '1.0.0');

export function createJobSpan(name: string, attributes: Record<string, string>) {
  return tracer.startSpan(name, { attributes });
}

// Export setup for Vercel - configure in instrumentation.ts
```

---

## Dependencies and Integrations

### NPM Dependencies

| Package | Version | Purpose | Story |
|---------|---------|---------|-------|
| next | ^15.x | Framework | 1.1 |
| react | ^19.x | UI library | 1.1 |
| typescript | ^5.x | Type safety | 1.1 |
| tailwindcss | ^4.x | Styling | 1.1 |
| drizzle-orm | ^0.36.x | Database ORM | 1.2 |
| postgres | ^3.x | PostgreSQL driver | 1.2 |
| decimal.js | ^10.x | Financial precision | 1.2 |
| zod | ^3.x | Validation | 1.2 |
| bcrypt | ^5.x | Password hashing | 1.3 |
| jose | ^5.x | JWT signing/verification | 1.3 |
| @vercel/kv | ^2.x | Redis cache | 1.6 |
| @opentelemetry/api | ^1.x | Tracing API | 1.5 |
| @opentelemetry/sdk-node | ^0.x | Tracing SDK | 1.5 |

### Dev Dependencies

| Package | Version | Purpose | Story |
|---------|---------|---------|-------|
| drizzle-kit | ^0.x | Migrations | 1.2 |
| vitest | ^2.x | Unit testing | 1.7 |
| @playwright/test | ^1.x | E2E testing | 1.7 |
| eslint | ^9.x | Linting | 1.1 |
| prettier | ^3.x | Formatting | 1.1 |

### External Services

| Service | Purpose | Environment Variables |
|---------|---------|----------------------|
| PostgreSQL (Vercel/Neon) | Primary database | DATABASE_URL |
| Vercel KV | Cache layer | KV_REST_API_URL, KV_REST_API_TOKEN |
| OTLP endpoint | Trace export | OTEL_EXPORTER_OTLP_ENDPOINT |

---

## Acceptance Criteria (Authoritative)

### Story 1.1: Project Setup & Core Infrastructure

1. Running `pnpm install && pnpm dev` starts the development server successfully on localhost:3000
2. shadcn/ui components are available and styled correctly
3. Tailwind CSS v4 is configured with the Slate Professional theme
4. TypeScript strict mode is enabled with noUncheckedIndexedAccess
5. ESLint and Prettier are configured for code quality
6. Path aliases (@/*) resolve to src/*

### Story 1.2: Database Schema with Fintech Types

1. Running `pnpm db:migrate` creates all tables with correct types
2. All currency/monetary fields use `numeric(19,4)` type (NEVER float/double)
3. decimal.js is configured with precision: 20, rounding: ROUND_HALF_UP
4. Drizzle schema includes: users, refresh_tokens, calculation_events tables
5. Multi-tenant isolation is enforced via user_id foreign keys

### Story 1.3: Authentication System with JWT + Refresh Tokens

1. User login with valid credentials returns JWT access token (15min expiry) and refresh token (7d expiry)
2. Refresh tokens are rotated on each use (old token invalidated in database)
3. Passwords are hashed with bcrypt (cost factor 12)
4. Session cookies are httpOnly, secure, sameSite: strict
5. Failed login attempts are rate-limited (5 per hour per IP)

### Story 1.4: Event-Sourced Calculation Pipeline

1. Calculation events are stored with 4 types: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED
2. Events include correlation_id linking the entire calculation
3. INPUTS_CAPTURED stores criteria version, prices snapshot, exchange rates
4. Any calculation can be replayed using `eventStore.replay(correlationId)`
5. Replay produces identical results (deterministic)

### Story 1.5: OpenTelemetry Instrumentation

1. Job execution creates a span with: job name, user_id, duration, asset_count
2. Span attributes capture timing breakdown (fetch_rates_ms, fetch_prices_ms, compute_scores_ms)
3. Errors set span status to ERROR with message
4. Traces export to OTLP HTTP endpoint (configurable)
5. Export is non-blocking (doesn't slow down jobs)

### Story 1.6: Vercel KV Cache Setup

1. Recommendations stored in Vercel KV are retrieved in <100ms
2. Cache keys are namespaced per user: `recs:${userId}`
3. TTL is set to 24 hours
4. Cache miss falls back to PostgreSQL
5. Cache utilities provide get/set/delete operations

### Story 1.7: Vitest + Playwright Testing Setup

1. Running `pnpm test` executes Vitest unit tests in `tests/unit/`
2. Running `pnpm test:e2e` executes Playwright tests in `tests/e2e/`
3. Test coverage reports are generated
4. CI can run tests in headless mode
5. At least one test exists for decimal calculations

### Story 1.8: App Shell & Layout Components

1. Dashboard displays Command Center layout with persistent sidebar (240px on desktop)
2. Sidebar collapses to icons on tablet, hamburger menu on mobile
3. Main content area displays Focus Mode recommendations placeholder
4. Sidebar contains: Dashboard, Portfolio, Criteria, History, Settings
5. Active route is highlighted in sidebar
6. Layout responds to breakpoints: sm (640px), md (768px), lg (1024px)

---

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Idea |
|----|--------------|--------------|-----------|
| 1.1.1 | Project Setup | package.json, next.config.js | Verify dev server starts |
| 1.1.2 | shadcn/ui Setup | components/ui/* | Render Button, Card |
| 1.1.3 | Tailwind Config | tailwind.config.ts | Check color tokens |
| 1.1.4 | TypeScript Config | tsconfig.json | Compile with strict mode |
| 1.2.1 | Database Schema | lib/db/schema.ts | Migration creates tables |
| 1.2.2 | Numeric Types | lib/db/schema.ts | Column types are numeric |
| 1.2.3 | Decimal Config | lib/calculations/decimal-config.ts | Precision test: 0.1 + 0.2 |
| 1.3.1 | JWT Tokens | lib/auth/jwt.ts | Token has correct expiry |
| 1.3.2 | Token Rotation | lib/auth/refresh.ts | Old token invalid after use |
| 1.3.3 | Password Hash | lib/auth/password.ts | bcrypt.compare succeeds |
| 1.3.4 | Cookie Security | app/api/auth/*/route.ts | Check cookie attributes |
| 1.3.5 | Rate Limiting | lib/auth/rate-limit.ts | 6th request blocked |
| 1.4.1 | Event Types | lib/events/types.ts | 4 event types defined |
| 1.4.2 | Correlation ID | lib/events/event-store.ts | All events share ID |
| 1.4.3 | INPUTS_CAPTURED | lib/events/types.ts | Payload includes snapshots |
| 1.4.4 | Replay Function | lib/events/replay.ts | Replay returns result |
| 1.4.5 | Determinism | lib/events/replay.ts | Same inputs = same output |
| 1.5.1 | Job Span | lib/telemetry/index.ts | Span has attributes |
| 1.5.2 | Timing Attrs | lib/telemetry/index.ts | Duration captured |
| 1.5.3 | Error Status | lib/telemetry/index.ts | Error sets span status |
| 1.5.4 | OTLP Export | lib/telemetry/index.ts | Traces sent to endpoint |
| 1.5.5 | Non-blocking | lib/telemetry/index.ts | Export doesn't block |
| 1.6.1 | Cache Speed | lib/cache/index.ts | Get completes <100ms |
| 1.6.2 | Key Namespace | lib/cache/index.ts | Keys include userId |
| 1.6.3 | TTL | lib/cache/index.ts | 24h expiry configured |
| 1.6.4 | Fallback | lib/cache/index.ts | Miss returns from DB |
| 1.7.1 | Unit Tests | tests/unit/* | pnpm test passes |
| 1.7.2 | E2E Tests | tests/e2e/* | pnpm test:e2e passes |
| 1.7.3 | Coverage | vitest.config.ts | Coverage report generated |
| 1.7.4 | CI Headless | playwright.config.ts | CI mode configured |
| 1.7.5 | Decimal Test | tests/unit/decimal.test.ts | Test exists and passes |
| 1.8.1 | Sidebar | components/dashboard/sidebar.tsx | Renders 240px wide |
| 1.8.2 | Responsive | components/dashboard/sidebar.tsx | Collapses correctly |
| 1.8.3 | Focus Mode | app/(dashboard)/page.tsx | Main content renders |
| 1.8.4 | Nav Items | components/dashboard/sidebar.tsx | 5 items present |
| 1.8.5 | Active State | components/dashboard/sidebar.tsx | Current route highlighted |
| 1.8.6 | Breakpoints | app/(dashboard)/layout.tsx | Layout responds |

---

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | Auth implementation takes longer than estimated | Medium | High | Use starter patterns as reference; time-box to 4h |
| R2 | decimal.js edge cases in currency conversion | Low | Critical | Comprehensive unit tests; document rounding rules |
| R3 | Vercel KV rate limits during development | Low | Medium | Use local Redis for development |
| R4 | OpenTelemetry adds latency | Low | Low | Fire-and-forget export pattern; measure baseline |

### Assumptions

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| A1 | bcrypt is sufficient (vs Argon2) | May need to re-hash passwords |
| A2 | 15min access token is acceptable | May need adjustment based on UX feedback |
| A3 | Single refresh token per user is sufficient | May need device-specific tokens |
| A4 | PostgreSQL numeric handles all precision needs | Already validated in architecture |

### Open Questions

| ID | Question | Decision Needed By | Owner |
|----|----------|--------------------|-------|
| Q1 | Should we use Argon2 instead of bcrypt? | Story 1.3 implementation | Dev |
| Q2 | Do we need email verification before login? | Story 1.3 implementation | PM |
| Q3 | Should rate limiting use Redis or in-memory? | Story 1.3 implementation | Dev |

---

## Test Strategy Summary

### Unit Testing (Vitest)

**Focus Areas:**
- Decimal calculations (precision, rounding)
- JWT token generation/verification
- Password hashing/comparison
- Event store operations
- Cache key generation

**Coverage Target:** 80% for lib/* modules

### Integration Testing (Vitest + Test DB)

**Focus Areas:**
- Database migrations
- Auth flow (register → login → refresh → logout)
- Event persistence and retrieval

### E2E Testing (Playwright)

**Focus Areas:**
- Login/logout flow
- Dashboard loads within 2 seconds
- Responsive layout behavior

**Test Environment:**
- Test database (separate from development)
- Mock external services
- CI runs in headless mode

### Test File Structure

```
tests/
├── unit/
│   ├── calculations/
│   │   └── decimal-utils.test.ts
│   ├── auth/
│   │   ├── jwt.test.ts
│   │   └── password.test.ts
│   └── events/
│       └── event-store.test.ts
├── integration/
│   ├── auth-flow.test.ts
│   └── database.test.ts
└── e2e/
    ├── auth.spec.ts
    └── dashboard.spec.ts
```
