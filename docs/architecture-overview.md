# Architecture Overview

> Investments Planner System Architecture Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   React 19      │  │  React Hook     │  │   Tailwind +    │              │
│  │   Components    │  │  Form + Zod     │  │   Radix UI      │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│  ┌────────┴────────────────────┴────────────────────┴────────┐              │
│  │                    Custom React Hooks (21)                 │              │
│  │    useDashboard, useRecommendations, useCriteria, etc.    │              │
│  └────────────────────────────┬──────────────────────────────┘              │
└───────────────────────────────┼──────────────────────────────────────────────┘
                                │ HTTP/REST
┌───────────────────────────────┼──────────────────────────────────────────────┐
│                               │                                              │
│  ┌────────────────────────────▼──────────────────────────────┐              │
│  │                    Next.js App Router                      │              │
│  │              (Route Handlers + Middleware)                 │              │
│  └────────────────────────────┬──────────────────────────────┘              │
│                               │                                              │
│  ┌────────────────────────────▼──────────────────────────────┐              │
│  │                    API LAYER (59 Endpoints)                │  SERVER     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  LAYER      │
│  │  │   Auth   │  │Portfolio │  │  Scores  │  │  Recs    │   │              │
│  │  │ (9 eps)  │  │ (5 eps)  │  │ (5 eps)  │  │ (3 eps)  │   │              │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │              │
│  └────────────────────────────┬──────────────────────────────┘              │
│                               │                                              │
│  ┌────────────────────────────▼──────────────────────────────┐              │
│  │                  SERVICE LAYER (26 Services)               │              │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │              │
│  │  │ Score Service  │  │ Recommendation │  │  Portfolio   │ │              │
│  │  │   + Engine     │  │    Service     │  │   Service    │ │              │
│  │  └────────────────┘  └────────────────┘  └──────────────┘ │              │
│  └────────────────────────────┬──────────────────────────────┘              │
│                               │                                              │
└───────────────────────────────┼──────────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────────┐
│                               │                                              │
│  ┌────────────────┐  ┌────────▼───────┐  ┌────────────────┐   DATA LAYER   │
│  │   Vercel KV    │  │   PostgreSQL   │  │   External     │                │
│  │   (Cache)      │  │   (Drizzle)    │  │   Providers    │                │
│  │                │  │                │  │                │                │
│  │ - Dashboard    │  │ - 17 Tables    │  │ - Gemini API   │                │
│  │ - Recs cache   │  │ - Relations    │  │ - Yahoo Finance│                │
│  │ - Rate limits  │  │ - Indexes      │  │ - ExchangeRate │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           BACKGROUND LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Inngest Job Queue                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │   Email      │  │  Overnight   │  │    Cache     │  │   Purge     │  │ │
│  │  │  Sending     │  │   Scoring    │  │   Warming    │  │   User      │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### 1. Protected API Request

```
Client Request
      │
      ▼
┌─────────────────┐
│   Middleware    │ ◄─── Check access token cookie
│  (Edge Runtime) │      Verify JWT signature
└────────┬────────┘
         │ Valid token
         ▼
┌─────────────────┐
│  Route Handler  │ ◄─── withAuth wrapper
│   /api/...      │      Extract userId from token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Zod Validation │ ◄─── Validate request body/params
│                 │      Return 400 on invalid
└────────┬────────┘
         │ Valid input
         ▼
┌─────────────────┐
│ Service Layer   │ ◄─── Business logic
│                 │      Multi-tenant scoping
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Drizzle ORM   │ ◄─── Type-safe queries
│                 │      PostgreSQL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ JSON Response   │ ◄─── Standardized format
│                 │      { data, meta?, error? }
└─────────────────┘
```

### 2. Dashboard Cache Flow

```
GET /api/dashboard
         │
         ▼
┌─────────────────┐
│  Check Cache    │ ◄─── Vercel KV lookup
│  (Vercel KV)    │      Key: dashboard:{userId}
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  HIT       MISS
    │         │
    ▼         ▼
┌────────┐ ┌─────────────┐
│ Return │ │ Query DB    │
│ Cached │ │ + External  │
└────────┘ └──────┬──────┘
                  │
                  ▼
           ┌─────────────┐
           │ Set Cache   │ ◄─── TTL: 24 hours
           │ + Return    │
           └─────────────┘
```

### 3. Score Calculation Flow

```
POST /api/scores/calculate
         │
         ▼
┌─────────────────┐
│ Emit CALC_      │ ◄─── Event sourcing
│ STARTED event   │      correlationId generated
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Load Criteria   │ ◄─── From criteria_versions
│ + Fundamentals  │      From asset_fundamentals
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Emit INPUTS_    │ ◄─── Snapshot all inputs
│ CAPTURED event  │      for replay capability
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│          SCORING ENGINE             │
│  ┌───────────────────────────────┐  │
│  │ For each criterion:           │  │
│  │   For each asset:             │  │
│  │     1. Check fundamentals     │  │
│  │     2. Evaluate condition     │  │
│  │     3. Award points           │  │
│  └───────────────────────────────┘  │
│  Uses Decimal.js (precision: 20)    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────┐
│ Emit SCORES_    │ ◄─── Results with breakdown
│ COMPUTED event  │      per asset, per criterion
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store Results   │ ◄─── asset_scores table
│ + History       │      score_history table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Emit CALC_      │ ◄─── Duration, status
│ COMPLETED event │
└─────────────────┘
```

---

## Core Patterns

### 1. Multi-Tenant Data Isolation

All user data is scoped by `userId` at the database level:

```typescript
// Example: Portfolio service
async getPortfolios(userId: string) {
  return db.query.portfolios.findMany({
    where: eq(portfolios.userId, userId),  // Always scoped
    with: { assets: true }
  });
}
```

**Enforcement:**

- Every table has `userId` column (except shared tables like prices)
- All queries include `where(userId, ...)` clause
- `withAuth` middleware injects `session.userId`
- No cross-tenant data access possible

### 2. Event Sourcing for Calculations

All calculations emit immutable events stored in `calculation_events`:

| Event Type        | Payload                                    |
| ----------------- | ------------------------------------------ |
| `CALC_STARTED`    | correlationId, userId, timestamp           |
| `INPUTS_CAPTURED` | criteriaVersionId, assetIds, prices, rates |
| `SCORES_COMPUTED` | Array<{ assetId, score, breakdown }>       |
| `CALC_COMPLETED`  | correlationId, duration, status            |

**Benefits:**

- Complete audit trail for financial calculations
- Replay capability for debugging
- Supports regulatory compliance

### 3. Decimal.js Financial Precision

All monetary/financial calculations use `Decimal.js`:

```typescript
import { Decimal } from "decimal.js";

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

// Example: allocation calculation
const allocation = new Decimal(assetValue).dividedBy(totalValue).times(100).toFixed(4);
```

**Reason:** JavaScript `Number` cannot represent financial values accurately due to floating-point precision issues.

### 4. Provider Abstraction with Circuit Breaker

External data providers wrapped with resilience patterns:

```typescript
// Provider interface
interface PriceProvider {
  getPrice(symbol: string): Promise<PriceData>;
  getName(): string;
}

// Circuit breaker protects from cascading failures
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
});

// Fallback chain
async function fetchPrice(symbol: string) {
  try {
    return await breaker.fire(() => geminiProvider.getPrice(symbol));
  } catch {
    return yahooProvider.getPrice(symbol); // Fallback
  }
}
```

### 5. Validation with Zod Schemas

All API inputs validated using Zod:

```typescript
// Schema definition
const createPortfolioSchema = z.object({
  name: z.string().min(1).max(50),
});

// Route handler usage
export const POST = withAuth(async (request, session) => {
  const body = await request.json();
  const result = createPortfolioSchema.safeParse(body);

  if (!result.success) {
    return errorResponse("Validation failed", 400, {
      issues: result.error.issues,
    });
  }

  // Proceed with validated data
  const { name } = result.data;
});
```

---

## Security Architecture

### Authentication Flow

```
                                    ┌──────────────┐
                                    │   Client     │
                                    └──────┬───────┘
                                           │
    ┌──────────────────────────────────────┼───────────────────────────────────┐
    │                                      │                                    │
    │  1. Login Request ───────────────────┼──────────────────────────►         │
    │     { email, password }              │                                    │
    │                                      │                                    │
    │  ┌───────────────────────────────────▼───────────────────────────────┐   │
    │  │                        API: /api/auth/login                        │   │
    │  │                                                                    │   │
    │  │  1. Validate credentials (bcrypt)                                  │   │
    │  │  2. Check email verified                                           │   │
    │  │  3. Generate access token (15min, HS256)                          │   │
    │  │  4. Generate refresh token (7d/30d, store hash in DB)             │   │
    │  │  5. Set httpOnly cookies                                           │   │
    │  └───────────────────────────────────┬───────────────────────────────┘   │
    │                                      │                                    │
    │  ◄───────────────────────────────────┼─── 2. Set-Cookie (httpOnly)       │
    │     access_token, refresh_token      │                                    │
    │                                      │                                    │
    │  3. Subsequent Requests ─────────────┼───── Cookie: access_token ──►     │
    │                                      │                                    │
    │  ┌───────────────────────────────────▼───────────────────────────────┐   │
    │  │                        Middleware (Edge)                           │   │
    │  │                                                                    │   │
    │  │  1. Extract token from cookie                                      │   │
    │  │  2. Verify JWT signature (HS256)                                   │   │
    │  │  3. Check expiration                                               │   │
    │  │  4. Allow or redirect to /login                                    │   │
    │  └───────────────────────────────────────────────────────────────────┘   │
    │                                                                           │
    └───────────────────────────────────────────────────────────────────────────┘
```

### Token Specifications

| Token Type    | Algorithm | Expiry                       | Storage          |
| ------------- | --------- | ---------------------------- | ---------------- |
| Access Token  | HS256     | 15 minutes                   | httpOnly cookie  |
| Refresh Token | HS256     | 7 days (30 with remember-me) | Cookie + DB hash |

### Rate Limiting

| Endpoint            | Limit             | Window | Store     |
| ------------------- | ----------------- | ------ | --------- |
| Login               | 5 failed attempts | 1 hour | Vercel KV |
| Resend Verification | 3 requests        | 1 hour | Vercel KV |
| Data Refresh        | 5 requests        | 1 hour | Vercel KV |

---

## Caching Strategy

### Layer 1: Vercel KV (Redis)

| Key Pattern                   | Data               | TTL      |
| ----------------------------- | ------------------ | -------- |
| `dashboard:{userId}`          | Dashboard JSON     | 24 hours |
| `recs:{userId}:{portfolioId}` | Recommendations    | 24 hours |
| `rate:{userId}:{action}`      | Rate limit counter | Varies   |

### Layer 2: In-Memory (Client)

| Hook           | Cache                    | Stale Time |
| -------------- | ------------------------ | ---------- |
| `useFreshness` | Freshness data           | 5 minutes  |
| `useBreakdown` | Recommendation breakdown | Session    |

### Cache Invalidation

```typescript
// On profile currency change
await invalidateDashboardCache(userId);
await invalidateRecommendationsCache(userId);

// On recommendation generation
await setRecommendationsCache(userId, portfolioId, data);
```

---

## Background Job Architecture

### Inngest Functions

| Function                    | Trigger                                | Purpose                        |
| --------------------------- | -------------------------------------- | ------------------------------ |
| `send-verification-email`   | Event: `user/registered`               | Send email verification        |
| `send-password-reset-email` | Event: `user/password-reset-requested` | Send password reset            |
| `overnight-scoring`         | Cron: Daily                            | Recalculate all scores         |
| `cache-warming`             | Cron: After scoring                    | Pre-warm dashboard cache       |
| `purge-deleted-user`        | Event: `user/deleted`                  | Remove user data after 30 days |

### Job Monitoring

Jobs are tracked in `overnight_job_runs` table:

- `job_type`: scoring, recommendations, cache-warm
- `status`: started, completed, failed, partial
- `metrics`: JSON with timing and counts
- `error_details`: JSON with failure information

---

## Error Handling

### API Error Response Format

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {
    /* optional context */
  }
}
```

### Error Codes

| Code               | HTTP Status | Meaning                 |
| ------------------ | ----------- | ----------------------- |
| `VALIDATION_ERROR` | 400         | Input validation failed |
| `UNAUTHORIZED`     | 401         | Missing or invalid auth |
| `FORBIDDEN`        | 403         | Permission denied       |
| `NOT_FOUND`        | 404         | Resource not found      |
| `CONFLICT`         | 409         | Resource already exists |
| `RATE_LIMITED`     | 429         | Too many requests       |
| `SERVER_ERROR`     | 500         | Internal server error   |
| `PROVIDER_ERROR`   | 502         | External service failed |

### Service Layer Errors

```typescript
// Custom error classes
throw new CriteriaSetLimitError(MAX_CRITERIA_SETS);
throw new InvestmentAssetNotFoundError(assetId);
throw new PortfolioLimitExceededError(MAX_PORTFOLIOS);

// Caught in route handlers
catch (error) {
  if (error instanceof CriteriaSetLimitError) {
    return errorResponse(error.message, 400, { code: 'LIMIT_EXCEEDED' });
  }
  throw error;
}
```

---

## Performance Considerations

### Database Indexes

Critical indexes defined in schema:

- `portfolios_user_id_idx` - Portfolio lookups by user
- `asset_scores_user_asset_idx` - Score queries
- `score_history_user_asset_date_idx` - Historical trends
- `recommendations_portfolio_id_idx` - Recommendation queries

### Query Optimization

- All queries use proper `where` clauses (no full table scans)
- Relations loaded with explicit `with` clause
- Pagination enforced on list endpoints
- Count queries separated from data queries

### Target Performance

| Operation                 | Target                | Measure |
| ------------------------- | --------------------- | ------- |
| Dashboard load            | < 500ms               | P95     |
| Score calculation         | < 2s for 100 assets   | P95     |
| Recommendation generation | < 3s                  | P95     |
| Overnight scoring         | < 5min for 1000 users | Batch   |

---

_For detailed API documentation, see [API Reference](./api-reference.md)._
