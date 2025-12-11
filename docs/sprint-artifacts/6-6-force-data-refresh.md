# Story 6.6: Force Data Refresh

**Status:** done
**Epic:** Epic 6 - Data Pipeline
**Previous Story:** 6.5 Currency Conversion Logic (Status: done)

---

## Story

**As a** user
**I want** to force an immediate data refresh
**So that** I can get the latest market data when needed

---

## Acceptance Criteria

### AC-6.6.1: Refresh Button Available on Dashboard and Portfolio

- **Given** I am viewing the dashboard or portfolio page
- **When** the page loads
- **Then** a "Refresh Data" button is visible
- **And** the button is accessible and clearly labeled
- **And** the button appears in a consistent location across both pages

### AC-6.6.2: Loading Spinner Shown During Refresh

- **Given** I click the "Refresh Data" button
- **When** the refresh operation is in progress
- **Then** a loading spinner is displayed
- **And** the refresh button is disabled during the operation
- **And** the user is informed that data is being refreshed

### AC-6.6.3: Success Toast with Timestamp

- **Given** I have initiated a data refresh
- **When** the refresh completes successfully
- **Then** a success toast notification is displayed: "Data refreshed as of [timestamp]"
- **And** the timestamp shows the actual refresh time
- **And** any displayed data is updated with the new values

### AC-6.6.4: Rate Limit of 5 Refreshes Per Hour Per User

- **Given** I am a user with refresh capability
- **When** I attempt to refresh data
- **Then** the system tracks my refresh count per hour
- **And** the limit is 5 refreshes per hour per user
- **And** the rate limit is enforced at the API level

### AC-6.6.5: Rate Limit Exceeded Shows Countdown

- **Given** I have exhausted my 5 refreshes for the current hour
- **When** I attempt another refresh
- **Then** I see an error message: "Refresh limit exceeded. Try again in [X] minutes."
- **And** the message shows a countdown to when the next refresh is available
- **And** the refresh button is disabled until the rate limit resets

---

## Technical Notes

### Architecture Alignment (ADR-005)

Per architecture document, force refresh must:

- Use the provider abstraction pattern with primary → fallback → cache chain
- Invalidate relevant caches before fetching
- Respect API rate limits of external providers

[Source: docs/architecture.md#ADR-005-Provider-Abstraction-Pattern]

### Rate Limiting Strategy

Per tech-spec, rate limiting uses token bucket algorithm:

- **Limit:** 5 requests per hour per user
- **Storage:** Track in database or Vercel KV
- **Response:** Include remaining count and reset time

[Source: docs/sprint-artifacts/tech-spec-epic-6.md#NFR-Security]

### API Endpoint Design

```typescript
// POST /api/data/refresh
// Request
{
  "type": "prices" | "rates" | "fundamentals" | "all",
  "symbols": ["PETR4", "VALE3"]  // optional, defaults to user's portfolio
}

// Response 200
{
  "data": {
    "refreshed": true,
    "refreshedAt": "2025-12-10T14:30:00Z",
    "nextRefreshAvailable": "2025-12-10T15:30:00Z",
    "remaining": 4
  }
}

// Response 429 (rate limited)
{
  "error": "Refresh limit exceeded. Try again in 45 minutes.",
  "code": "RATE_LIMITED",
  "details": {
    "remaining": 0,
    "resetAt": "2025-12-10T15:30:00Z"
  }
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-6.md#APIs-and-Interfaces]

### Existing Infrastructure (From Previous Stories)

The following infrastructure is available from completed stories:

**From Story 6.1 - Provider Abstraction Layer:**

- `PriceProvider`, `ExchangeRateProvider`, `FundamentalsProvider` interfaces
- Retry logic with 3 attempts and exponential backoff
- Circuit breaker pattern for failing providers
- Factory functions in `src/lib/providers/index.ts`

**From Story 6.2 - Fetch Asset Fundamentals:**

- `GeminiFundamentalsProvider` implementation
- `FundamentalsRepository` for database operations
- `GET /api/data/fundamentals` endpoint

**From Story 6.3 - Fetch Daily Prices:**

- `GeminiPricesProvider` and `YahooPricesProvider` implementations
- `PricesRepository` for database operations
- `GET /api/data/prices` endpoint

**From Story 6.4 - Fetch Exchange Rates:**

- `ExchangeRateAPIProvider` and `OpenExchangeRatesProvider` implementations
- `ExchangeRatesRepository` for database operations
- `GET /api/data/exchange-rates` endpoint

**From Story 6.5 - Currency Conversion Logic:**

- `CurrencyConverter` service
- Audit trail logging for conversions

[Source: docs/sprint-artifacts/6-5-currency-conversion-logic.md#Dev-Agent-Record]

### Cache Invalidation Strategy

Per the architecture and tech-spec:

1. Invalidate Vercel KV cache keys for the requested data type
2. Fetch fresh data from providers (primary → fallback chain)
3. Store with new timestamp
4. Update DataFreshnessBadge indicators

Cache keys to invalidate:

- Prices: `prices:${userId}:${symbol}`
- Exchange rates: `rates:${base}`
- Fundamentals: `fundamentals:${symbol}`

### Rate Limit Implementation

```typescript
// lib/rate-limit/refresh-limiter.ts
interface RefreshRateLimiter {
  checkLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }>;
  recordRefresh(userId: string): Promise<void>;
}
```

Storage options:

1. **Vercel KV (preferred):** Key `refresh:${userId}` with TTL of 1 hour
2. **Database:** `user_refresh_tokens` table with timestamp tracking

---

## Tasks

### Task 1: Create Rate Limit Service (AC: 6.6.4, 6.6.5)

**Files:** `src/lib/rate-limit/refresh-limiter.ts`

- [x] Create RefreshRateLimiter class
- [x] Implement `checkLimit(userId)` method
- [x] Implement `recordRefresh(userId)` method
- [x] Use Vercel KV for storage with 1-hour TTL
- [x] Return remaining refreshes and reset time
- [x] Handle edge cases (first request, expired window)

### Task 2: Create Data Refresh Service (AC: 6.6.1, 6.6.2, 6.6.3)

**Files:** `src/lib/services/data-refresh-service.ts`

- [x] Create DataRefreshService class
- [x] Implement `refresh(userId, type, symbols?)` method
- [x] Integrate with existing provider services (prices, rates, fundamentals)
- [x] Invalidate relevant caches before fetching
- [x] Use provider fallback chain for resilience
- [x] Return refresh result with timestamp
- [x] Emit audit trail event for refresh operation

### Task 3: Create Zod Validation Schemas (AC: All)

**Files:** `src/lib/validations/refresh-schemas.ts`

- [x] Create RefreshRequestSchema for input validation
- [x] Create RefreshResponseSchema for output typing
- [x] Validate type enum: "prices" | "rates" | "fundamentals" | "all"
- [x] Validate symbols array (optional, string array)
- [x] Create RateLimitErrorSchema for 429 responses

### Task 4: Create API Route (AC: All)

**Files:** `src/app/api/data/refresh/route.ts`

- [x] Create POST handler for /api/data/refresh
- [x] Add auth middleware (withAuth)
- [x] Check rate limit before processing
- [x] Validate request with Zod schema
- [x] Call DataRefreshService.refresh()
- [x] Return standardized response format
- [x] Return 429 with countdown if rate limited

### Task 5: Create React Hook for Refresh (AC: 6.6.1, 6.6.2, 6.6.3, 6.6.5)

**Files:** `src/hooks/use-data-refresh.ts`

- [x] Create useDataRefresh hook
- [x] Implement refresh function with loading state
- [x] Handle success/error states
- [x] Show toast notifications (success/error)
- [x] Track rate limit status
- [x] Integrate with React Query for cache invalidation

### Task 6: Create RefreshButton Component (AC: 6.6.1, 6.6.2, 6.6.5)

**Files:** `src/components/data/refresh-button.tsx`

- [x] Create RefreshButton component using shadcn/ui Button
- [x] Show loading spinner during refresh (Loader2 icon)
- [x] Disable button during refresh and when rate limited
- [x] Show countdown when rate limited
- [x] Accept type and symbols props for targeted refresh
- [x] Accessible with aria labels

### Task 7: Integrate RefreshButton into Dashboard (AC: 6.6.1)

**Files:** `src/app/(dashboard)/page.tsx` or related dashboard components

- [x] Add RefreshButton to dashboard header area
- [x] Configure for "all" refresh type
- [x] Style consistently with dashboard layout
- [x] Position in accessible location

### Task 8: Integrate RefreshButton into Portfolio (AC: 6.6.1)

**Files:** `src/app/(dashboard)/portfolio/page.tsx` or related portfolio components

- [x] Add RefreshButton to portfolio page
- [x] Configure for portfolio-specific refresh
- [x] Pass user's portfolio symbols
- [x] Position consistently with dashboard

### Task 9: Write Unit Tests (AC: All)

**Files:** `tests/unit/rate-limit/refresh-limiter.test.ts`, `tests/unit/services/data-refresh.test.ts`

- [x] Test rate limit checking (under/at/over limit)
- [x] Test rate limit recording
- [x] Test rate limit reset after 1 hour
- [x] Test countdown calculation
- [x] Test refresh service with mocked providers
- [x] Test cache invalidation
- [x] Test various refresh types (prices, rates, fundamentals, all)
- [x] Test refresh with/without specific symbols

### Task 10: Write API Integration Tests (AC: All)

**Files:** `tests/unit/api/data-refresh.test.ts`

- [x] Test POST /api/data/refresh endpoint
- [x] Test authentication requirement
- [x] Test successful refresh response
- [x] Test rate limit enforcement (429 response)
- [x] Test rate limit countdown in response
- [x] Test invalid request validation
- [x] Test various refresh types

### Task 11: Run Verification

- [x] TypeScript compilation successful (`npx tsc --noEmit`)
- [x] ESLint passes with no new errors (`pnpm lint`)
- [x] All unit tests pass (`pnpm test`)
- [x] Build succeeds (`pnpm build`)

---

## Dependencies

- **Story 6.1:** Provider Abstraction Layer (Complete) - provides provider interfaces and factory functions
- **Story 6.2:** Fetch Asset Fundamentals (Complete) - provides fundamentals fetching
- **Story 6.3:** Fetch Daily Prices (Complete) - provides prices fetching
- **Story 6.4:** Fetch Exchange Rates (Complete) - provides exchange rates fetching
- **Story 6.5:** Currency Conversion Logic (Complete) - provides audit trail pattern
- **Story 1.6:** Vercel KV Cache Setup (Complete) - provides cache utilities

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Provider Pattern:** Use existing provider abstraction with fallback chain
- **Rate Limiting:** Enforce at API level, not client-side only
- **Cache Invalidation:** Clear relevant caches before fetching fresh data
- **Logging:** Use structured logger from `@/lib/telemetry/logger`
- **Audit Trail:** Log refresh operations for transparency

[Source: docs/architecture.md#Implementation-Patterns]

### Learnings from Previous Story

**From Story 6.5 - Currency Conversion Logic (Status: done)**

- **Event Type Pattern:** Added new event type to `src/lib/events/types.ts` with type guard
- **Factory Functions:** Added to `src/lib/providers/index.ts` for dependency injection
- **Zod v4 Compatibility:** `z.record()` requires 2 arguments: `z.record(z.string(), z.unknown())`
- **TypeScript Strict Mode:** Handle `exactOptionalPropertyTypes` correctly
- **Test Structure:** Follow established pattern with 35+ unit tests covering all ACs
- **API Tests:** Create comprehensive API integration tests (23 tests in story 6.5)
- **Error Handling:** Use `ProviderError` for consistent error handling

[Source: docs/sprint-artifacts/6-5-currency-conversion-logic.md#Dev-Agent-Record]

### UI Component Guidelines

Per UX spec and architecture:

- Use shadcn/ui Button component with loading state
- Use Loader2 icon from lucide-react for spinner
- Toast notifications via shadcn/ui toast system
- Accessible: include aria-label for screen readers
- Disabled state styling: reduced opacity, cursor not-allowed

### Rate Limit UX Best Practices

- Show remaining refreshes proactively: "4 refreshes remaining this hour"
- When rate limited, show exact time until reset: "Available in 45 minutes"
- Consider showing a subtle countdown timer when close to rate limit
- Don't hide the button when rate limited - show disabled state with explanation

### Project Structure Notes

Following unified project structure:

- **Rate Limit Service:** `src/lib/rate-limit/refresh-limiter.ts`
- **Refresh Service:** `src/lib/services/data-refresh-service.ts`
- **Schemas:** `src/lib/validations/refresh-schemas.ts`
- **API Route:** `src/app/api/data/refresh/route.ts`
- **Hook:** `src/hooks/use-data-refresh.ts`
- **Component:** `src/components/data/refresh-button.tsx`
- **Tests:** `tests/unit/rate-limit/`, `tests/unit/services/`, `tests/unit/api/`

[Source: docs/architecture.md#Project-Structure]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-6.md#Story-6.6]
- [Source: docs/sprint-artifacts/tech-spec-epic-6.md#APIs-and-Interfaces]
- [Source: docs/sprint-artifacts/tech-spec-epic-6.md#Workflows-and-Sequencing]
- [Source: docs/architecture.md#ADR-005-Provider-Abstraction-Pattern]
- [Source: docs/epics.md#Story-6.6-Force-Data-Refresh]
- [Source: docs/sprint-artifacts/6-5-currency-conversion-logic.md]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/6-6-force-data-refresh.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Implemented rate limiting with Vercel KV cache storage and 1-hour TTL
- Fixed bug in calculateResetAt function to use instance windowSeconds instead of global constant
- Added DataRefreshedEvent type to event types for audit trail
- Updated schema test to include new DATA_REFRESHED event type (now 6 event types)
- Fixed TypeScript exactOptionalPropertyTypes issues with optional properties
- Fixed LogContext type constraints (arrays/objects must be serialized to JSON strings)
- All 1790 tests pass with comprehensive test coverage for Story 6.6

### File List

**New Files Created:**

- `src/lib/rate-limit/refresh-limiter.ts` - Rate limit service with token bucket algorithm
- `src/lib/rate-limit/index.ts` - Barrel export for rate limit module
- `src/lib/services/data-refresh-service.ts` - Data refresh orchestration service
- `src/lib/validations/refresh-schemas.ts` - Zod schemas for request/response validation
- `src/app/api/data/refresh/route.ts` - POST endpoint for force refresh
- `src/hooks/use-data-refresh.ts` - React hook with loading state and rate limit tracking
- `src/components/data/refresh-button.tsx` - RefreshButton component with spinner
- `tests/unit/rate-limit/refresh-limiter.test.ts` - 21 unit tests for rate limiter
- `tests/unit/services/data-refresh.test.ts` - 15 unit tests for refresh service
- `tests/unit/api/data-refresh.test.ts` - 26 API integration tests

**Modified Files:**

- `src/lib/events/types.ts` - Added DataRefreshedEvent type and type guard
- `src/app/(dashboard)/page.tsx` - Integrated RefreshButton into dashboard
- `src/app/(dashboard)/portfolio/page.tsx` - Integrated RefreshButton into portfolio
- `tests/unit/db/schema.test.ts` - Updated event type count from 5 to 6

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-10 | Story drafted from tech-spec-epic-6.md and epics.md | SM Agent (create-story workflow) |
| 2025-12-11 | Story implementation completed (all 11 tasks)       | Dev Agent (dev-story workflow)   |
