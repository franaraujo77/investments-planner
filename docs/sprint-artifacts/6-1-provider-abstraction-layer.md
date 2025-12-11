# Story 6.1: Provider Abstraction Layer

**Status:** review
**Epic:** Epic 6 - Data Pipeline
**Previous Story:** 5.11 Score Breakdown View (Status: done)

---

## Story

**As a** developer
**I want** an abstraction layer for external data providers
**So that** providers can be swapped without code changes

---

## Acceptance Criteria

### AC-6.1.1: PriceProvider Interface Exists

- **Given** the provider abstraction is implemented
- **When** I need to fetch asset prices
- **Then** I can use the PriceProvider interface with `fetchPrices(symbols)` and `healthCheck()` methods
- **And** the interface is technology-agnostic and can be implemented by any provider

### AC-6.1.2: ExchangeRateProvider Interface Exists

- **Given** the provider abstraction is implemented
- **When** I need to fetch exchange rates
- **Then** I can use the ExchangeRateProvider interface with `fetchRates(base, targets)` and `healthCheck()` methods
- **And** the interface returns consistent data structure regardless of underlying provider

### AC-6.1.3: Provider Implementations Are Swappable

- **Given** provider implementations exist
- **When** I need to switch from one provider to another
- **Then** I can swap providers without changing business logic
- **And** the PriceService/ExchangeRateService orchestrators handle provider selection

### AC-6.1.4: Retry Logic Applied

- **Given** a provider request is made
- **When** the request fails
- **Then** retry logic applies 3 attempts with exponential backoff (1s, 2s, 4s)
- **And** each retry attempt is logged with attempt number
- **And** final failure is logged with all attempt details

### AC-6.1.5: Circuit Breaker Disables Failing Provider

- **Given** a provider is being used
- **When** it fails 5 consecutive times
- **Then** the circuit breaker disables that provider for 5 minutes
- **And** requests automatically route to fallback provider
- **And** circuit breaker state is logged
- **And** after 5 minutes, provider is re-enabled for a single test request

---

## Technical Notes

### Architecture Alignment (ADR-005)

Per architecture document ADR-005, provider abstraction implements:

```
Primary Provider → Fallback Provider → Cached Data (with stale flag)
```

Provider chain configuration:

- **Asset Prices:** Gemini API (primary) → Yahoo Finance (fallback)
- **Exchange Rates:** ExchangeRate-API (primary) → Open Exchange Rates (fallback)
- **Fundamentals:** Gemini API (primary) → Alpha Vantage (fallback)

[Source: docs/architecture.md#ADR-005]

### Provider Interfaces

Per tech-spec, interfaces are defined as:

```typescript
// lib/providers/types.ts

export interface PriceResult {
  symbol: string;
  open?: string;
  high?: string;
  low?: string;
  close: string;
  volume?: string;
  currency: string;
  source: string;
  fetchedAt: Date;
  priceDate: Date;
  isStale?: boolean;
}

export interface ExchangeRateResult {
  base: string;
  rates: Record<string, string>;
  source: string;
  fetchedAt: Date;
  rateDate: Date;
}

export interface FundamentalsResult {
  symbol: string;
  peRatio?: string;
  pbRatio?: string;
  dividendYield?: string;
  marketCap?: string;
  revenue?: string;
  earnings?: string;
  sector?: string;
  industry?: string;
  source: string;
  fetchedAt: Date;
  dataDate: Date;
}

export interface PriceProvider {
  name: string;
  fetchPrices(symbols: string[]): Promise<PriceResult[]>;
  healthCheck(): Promise<boolean>;
}

export interface ExchangeRateProvider {
  name: string;
  fetchRates(base: string, targets: string[]): Promise<ExchangeRateResult>;
  healthCheck(): Promise<boolean>;
}

export interface FundamentalsProvider {
  name: string;
  fetchFundamentals(symbols: string[]): Promise<FundamentalsResult[]>;
  healthCheck(): Promise<boolean>;
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-6.md#TypeScript-Types]

### Service Layer Pattern

Services orchestrate providers with fallback chain:

```typescript
// lib/providers/price-service.ts
class PriceService {
  constructor(
    private primary: PriceProvider,
    private fallback: PriceProvider | null,
    private cache: CacheService,
    private logger: Logger
  ) {}

  async getPrices(symbols: string[]): Promise<PriceResult[]> {
    // Try primary → fallback → cached (stale)
  }
}
```

[Source: docs/architecture.md#ADR-005]

### Retry Logic Implementation

Per tech-spec NFR requirements:

```typescript
// Retry configuration
const RETRY_CONFIG = {
  attempts: 3,
  backoff: [1000, 2000, 4000], // Exponential backoff in ms
  timeout: 10000, // 10s per request
};
```

[Source: docs/sprint-artifacts/tech-spec-epic-6.md#Non-Functional-Requirements]

### Circuit Breaker Pattern

Per architecture reliability requirements:

```typescript
interface CircuitBreakerState {
  provider: string;
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
  nextAttempt: Date | null;
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 5 * 60 * 1000, // 5 minutes
};
```

[Source: docs/sprint-artifacts/tech-spec-epic-6.md#NFR-Reliability]

### File Structure

Per architecture, provider files should be organized as:

```
src/lib/providers/
├── types.ts                 # Provider interfaces and result types
├── price-service.ts         # Price aggregation with fallback
├── exchange-rate-service.ts # Exchange rate with fallback
├── fundamentals-service.ts  # Fundamentals with fallback
├── circuit-breaker.ts       # Circuit breaker implementation
├── retry.ts                 # Retry logic utilities
├── implementations/
│   ├── gemini-provider.ts   # (Placeholder for Story 6.2/6.3)
│   ├── yahoo-provider.ts    # (Placeholder for Story 6.3)
│   ├── exchangerate-api.ts  # (Placeholder for Story 6.4)
│   └── open-exchange.ts     # (Placeholder for Story 6.4)
└── index.ts                 # Factory functions and exports
```

[Source: docs/architecture.md#ADR-005]

---

## Tasks

### Task 1: Create Provider Type Definitions (AC: 6.1.1, 6.1.2)

**Files:** `src/lib/providers/types.ts`

- [x] Create PriceResult interface with all fields per tech-spec
- [x] Create ExchangeRateResult interface
- [x] Create FundamentalsResult interface
- [x] Create FreshnessInfo interface
- [x] Create PriceProvider interface with name, fetchPrices, healthCheck
- [x] Create ExchangeRateProvider interface with name, fetchRates, healthCheck
- [x] Create FundamentalsProvider interface with name, fetchFundamentals, healthCheck
- [x] Create ProviderError custom error class
- [x] Export all types

### Task 2: Implement Retry Utility (AC: 6.1.4)

**Files:** `src/lib/providers/retry.ts`

- [x] Create `withRetry<T>` higher-order function for retry logic
- [x] Implement exponential backoff with configurable delays (1s, 2s, 4s)
- [x] Add timeout handling per request
- [x] Log each retry attempt with attempt number
- [x] Log final failure with all attempt details
- [x] Export retry configuration type and defaults
- [x] Add unit tests for retry logic

### Task 3: Implement Circuit Breaker (AC: 6.1.5)

**Files:** `src/lib/providers/circuit-breaker.ts`

- [x] Create CircuitBreakerState interface
- [x] Create CircuitBreaker class with state management
- [x] Implement failure tracking (increment on failure)
- [x] Implement circuit open logic (5 consecutive failures)
- [x] Implement reset timeout (5 minutes)
- [x] Implement half-open state for single test request
- [x] Log state transitions (closed → open, open → half-open, half-open → closed/open)
- [x] Add unit tests for circuit breaker

### Task 4: Create Mock Providers for Testing (AC: 6.1.1, 6.1.2, 6.1.3)

**Files:** `src/lib/providers/implementations/mock-provider.ts`

- [x] Create MockPriceProvider implementing PriceProvider
- [x] Create MockExchangeRateProvider implementing ExchangeRateProvider
- [x] Create MockFundamentalsProvider implementing FundamentalsProvider
- [x] Add configurable success/failure modes for testing
- [x] Add configurable delays for timeout testing
- [x] Export for use in tests

### Task 5: Implement PriceService with Fallback Chain (AC: 6.1.3, 6.1.4, 6.1.5)

**Files:** `src/lib/providers/price-service.ts`

- [x] Create PriceService class with constructor accepting primary, fallback, cache
- [x] Implement getPrices method with fallback chain
- [x] Integrate retry logic for each provider attempt
- [x] Integrate circuit breaker for provider health
- [x] Cache successful results with TTL (24h for prices)
- [x] Return stale cached data with isStale flag when all providers fail
- [x] Throw ProviderError when no cached data available
- [x] Log provider selection and fallback events
- [x] Add unit tests for PriceService

### Task 6: Implement ExchangeRateService with Fallback Chain (AC: 6.1.3, 6.1.4, 6.1.5)

**Files:** `src/lib/providers/exchange-rate-service.ts`

- [x] Create ExchangeRateService class with constructor accepting primary, fallback, cache
- [x] Implement getRates method with fallback chain
- [x] Integrate retry logic for each provider attempt
- [x] Integrate circuit breaker for provider health
- [x] Cache successful results with TTL (24h for rates)
- [x] Return stale cached data when all providers fail
- [x] Throw ProviderError when no cached data available
- [x] Log provider selection and fallback events
- [x] Add unit tests for ExchangeRateService

### Task 7: Implement FundamentalsService with Fallback Chain (AC: 6.1.3, 6.1.4, 6.1.5)

**Files:** `src/lib/providers/fundamentals-service.ts`

- [x] Create FundamentalsService class with constructor accepting primary, fallback, cache
- [x] Implement getFundamentals method with fallback chain
- [x] Integrate retry logic for each provider attempt
- [x] Integrate circuit breaker for provider health
- [x] Cache successful results with TTL (7 days for fundamentals)
- [x] Return stale cached data when all providers fail
- [x] Throw ProviderError when no cached data available
- [x] Log provider selection and fallback events
- [x] Add unit tests for FundamentalsService

### Task 8: Create Provider Factory and Index (AC: 6.1.3)

**Files:** `src/lib/providers/index.ts`

- [x] Create factory functions for service instantiation
- [x] Create `getPriceService()` factory returning configured PriceService
- [x] Create `getExchangeRateService()` factory returning configured service
- [x] Create `getFundamentalsService()` factory returning configured service
- [x] Export all provider types
- [x] Export all services
- [x] Document provider configuration via environment variables

### Task 9: Create Integration Tests for Provider Services (AC: All)

**Files:** `tests/unit/providers/price-service.test.ts`, `tests/unit/providers/exchange-rate-service.test.ts`, `tests/unit/providers/fundamentals-service.test.ts`

- [x] Test primary provider success path
- [x] Test fallback to secondary provider on primary failure
- [x] Test return of stale cache when all providers fail
- [x] Test retry logic (3 attempts, exponential backoff)
- [x] Test circuit breaker opens after 5 failures
- [x] Test circuit breaker reset after timeout
- [x] Test provider swapping without code changes

### Task 10: Run Verification

- [x] TypeScript compilation successful (`npx tsc --noEmit`)
- [x] ESLint passes with no new errors (`pnpm lint`)
- [x] All unit tests pass (`pnpm test`)
- [x] Build succeeds (`pnpm build`)

---

## Dependencies

- **Story 1.1:** Project Setup & Core Infrastructure (Complete) - provides project structure
- **Story 1.6:** Vercel KV Cache Setup (Complete) - provides cache layer for provider results

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Provider Location:** Provider code goes in `src/lib/providers/`
- **decimal.js for Financial Data:** All price/rate values stored as strings to preserve precision
- **Logging:** Use structured logger from `@/lib/telemetry/logger`
- **Error Handling:** Use custom error classes extending AppError

[Source: docs/architecture.md#Implementation-Patterns]

### Learnings from Previous Story

**From Story 5.11 - Score Breakdown View (Status: done)**

- **Service Layer Pattern:** Services in `src/lib/services/` establish patterns for data access - follow similar patterns for provider services
- **Hook Integration:** React Query hooks provide data fetching patterns - provider services will be consumed by similar hooks in later stories
- **API Response Format:** Standardized `{ data: T }` or `{ error, code }` format - provider services should return consistent structures
- **Test Patterns:** Vitest unit tests with mock data - follow same patterns for provider tests
- **Color Coding Functions:** `getScoreColor()` established utility function pattern - create similar utilities for provider status

[Source: docs/sprint-artifacts/5-11-score-breakdown-view.md#Dev-Agent-Record]

### Cache Key Naming Convention

Per tech-spec, cache keys should follow pattern:

```typescript
// Price cache keys
`prices:${symbol}:${date}` // Individual price
`prices:batch:${hash}` // Batch request
// Exchange rate cache keys
`rates:${base}:${date}` // Rates for base currency
// Fundamentals cache keys
`fundamentals:${symbol}:${date}`; // Individual fundamentals
```

[Source: docs/sprint-artifacts/tech-spec-epic-6.md#Caching-Strategy]

### Environment Variables Required

Per tech-spec, providers will need:

```bash
# Provider API Keys (will be used in Story 6.2-6.4)
GEMINI_API_KEY=xxx
YAHOO_FINANCE_API_KEY=xxx
EXCHANGE_RATE_API_KEY=xxx
OPEN_EXCHANGE_APP_ID=xxx

# Timeouts and limits
PROVIDER_TIMEOUT_MS=10000
PROVIDER_RETRY_ATTEMPTS=3
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_RESET_MS=300000
```

[Source: docs/architecture.md#Environment-Variables]

### Project Structure Notes

Following unified project structure:

- **Types:** `src/lib/providers/types.ts`
- **Services:** `src/lib/providers/*-service.ts`
- **Utilities:** `src/lib/providers/retry.ts`, `src/lib/providers/circuit-breaker.ts`
- **Tests:** `tests/unit/providers/`

[Source: docs/architecture.md#Project-Structure]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-6.md#Story-6.1]
- [Source: docs/sprint-artifacts/tech-spec-epic-6.md#Services-and-Modules]
- [Source: docs/sprint-artifacts/tech-spec-epic-6.md#TypeScript-Types]
- [Source: docs/architecture.md#ADR-005]
- [Source: docs/architecture.md#Provider-Abstraction-Pattern]
- [Source: docs/epics.md#Story-6.1-Provider-Abstraction-Layer]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/6-1-provider-abstraction-layer.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- All provider interfaces implemented per tech-spec with financial precision (string types for decimal values)
- Retry logic uses configurable exponential backoff (default: 1s, 2s, 4s)
- Circuit breaker opens after 5 consecutive failures, resets after 5 minutes (configurable)
- Half-open state allows single test request before fully closing
- All services implement fallback chain: Primary → Fallback → Stale Cache
- Cache TTLs: Prices 24h, Exchange Rates 24h, Fundamentals 7 days
- Mock providers created for comprehensive testing (82 tests passing)
- Factory functions provide dependency injection for services
- TypeScript strict mode (`exactOptionalPropertyTypes`) handled correctly

### File List

**Source Files Created:**

- `src/lib/providers/types.ts` - Provider interfaces, result types, error classes
- `src/lib/providers/retry.ts` - Retry utility with exponential backoff
- `src/lib/providers/circuit-breaker.ts` - Circuit breaker pattern implementation
- `src/lib/providers/price-service.ts` - Price aggregation with fallback chain
- `src/lib/providers/exchange-rate-service.ts` - Exchange rate service with fallback
- `src/lib/providers/fundamentals-service.ts` - Fundamentals service with fallback
- `src/lib/providers/index.ts` - Factory functions and exports
- `src/lib/providers/implementations/mock-provider.ts` - Mock providers for testing

**Test Files Created:**

- `tests/unit/providers/retry.test.ts` - Retry utility tests (10 tests)
- `tests/unit/providers/circuit-breaker.test.ts` - Circuit breaker tests (23 tests)
- `tests/unit/providers/price-service.test.ts` - PriceService tests (17 tests)
- `tests/unit/providers/exchange-rate-service.test.ts` - ExchangeRateService tests (15 tests)
- `tests/unit/providers/fundamentals-service.test.ts` - FundamentalsService tests (17 tests)

---

## Change Log

| Date       | Change                                                  | Author                           |
| ---------- | ------------------------------------------------------- | -------------------------------- |
| 2025-12-10 | Story drafted from tech-spec-epic-6.md and epics.md     | SM Agent (create-story workflow) |
| 2025-12-10 | Implementation complete - all ACs met, 82 tests passing | Dev Agent (Claude Opus 4.5)      |
| 2025-12-10 | Code review complete - APPROVED with minor notes        | Code Review Workflow             |

---

## Code Review Record

**Review Date:** 2025-12-10
**Reviewer:** Senior Developer (Code Review Workflow)
**Review Status:** ✅ **APPROVED**

### Summary

Story 6.1 implementation is **APPROVED** for merge. The provider abstraction layer is well-designed, follows the tech-spec precisely, and meets all acceptance criteria. The implementation demonstrates excellent separation of concerns, proper TypeScript typing with strict mode compliance, comprehensive test coverage (82 tests), and adherence to CLAUDE.md standards.

### Acceptance Criteria Verification

| AC                                                     | Status  | Notes                                                                           |
| ------------------------------------------------------ | ------- | ------------------------------------------------------------------------------- |
| **AC-6.1.1**: PriceProvider interface                  | ✅ PASS | Interface at `types.ts:128-147` with `fetchPrices()` and `healthCheck()`        |
| **AC-6.1.2**: ExchangeRateProvider interface           | ✅ PASS | Interface at `types.ts:154-174` with `fetchRates()` and `healthCheck()`         |
| **AC-6.1.3**: Provider swappability                    | ✅ PASS | Factory functions in `index.ts`, services accept providers via constructor DI   |
| **AC-6.1.4**: Retry logic (3 attempts, 1s/2s/4s)       | ✅ PASS | Implemented in `retry.ts:100-196`, each attempt logged, final failure logged    |
| **AC-6.1.5**: Circuit breaker (5 failures, 5min reset) | ✅ PASS | Implemented in `circuit-breaker.ts:97-345`, half-open state, transitions logged |

### Code Quality Assessment

#### Strengths

1. **Architecture Alignment**: Follows ADR-005 provider abstraction pattern precisely
2. **Type Safety**: All numeric values as strings for decimal.js precision (per tech-spec)
3. **Error Handling**: Custom `ProviderError` class with codes, proper error propagation
4. **Testability**: Mock providers with configurable failure/delay modes
5. **Separation of Concerns**: Clear distinction between types, utilities, services, implementations
6. **Documentation**: Excellent JSDoc comments, usage examples, module documentation
7. **Logging**: Structured logging with proper context objects throughout
8. **Configuration**: Environment variable overrides documented and implemented
9. **Test Coverage**: 82 tests covering happy path, failures, edge cases

#### Files Reviewed

| File                       | Lines | Status   | Notes                                        |
| -------------------------- | ----- | -------- | -------------------------------------------- |
| `types.ts`                 | 360   | ✅ Clean | Well-structured interfaces and types         |
| `retry.ts`                 | 225   | ✅ Clean | Proper exponential backoff, timeout handling |
| `circuit-breaker.ts`       | 414   | ✅ Clean | State machine well-implemented               |
| `price-service.ts`         | 441   | ✅ Clean | Fallback chain correctly ordered             |
| `exchange-rate-service.ts` | 461   | ✅ Clean | Consistent with PriceService                 |
| `fundamentals-service.ts`  | 449   | ✅ Clean | 7-day TTL correctly configured               |
| `index.ts`                 | 316   | ✅ Clean | Good factory pattern, exports organized      |
| `mock-provider.ts`         | 469   | ✅ Clean | Flexible mocks for testing                   |

#### CLAUDE.md Compliance

| Requirement                | Status  | Evidence                                    |
| -------------------------- | ------- | ------------------------------------------- |
| No `console.log/error`     | ✅ PASS | Uses `logger` from `@/lib/telemetry/logger` |
| No explicit `any` types    | ✅ PASS | All types properly defined                  |
| Standardized API responses | ✅ PASS | Consistent result wrappers with freshness   |
| Test coverage for new code | ✅ PASS | 82 tests across 5 test files                |
| Structured error codes     | ✅ PASS | `PROVIDER_ERROR_CODES` constant object      |

### Minor Notes (Non-Blocking)

1. **Factory Functions**: Currently default to mock providers - this is intentional per story scope and documented with `TODO` comment for Stories 6.2-6.4

2. **Cache Key Generation**: Uses date in cache key (`YYYY-MM-DD`) which means cache naturally expires daily. This is appropriate for the 24h TTL but noted for awareness.

3. **Circuit Breaker Registry**: Singleton pattern used (`circuitBreakerRegistry`) - works well for current scope but may need per-request instances in future if multi-tenant support is added

### Test Results

```
Test Files: 5 passed | 5 total
Tests:      82 passed | 82 total

- retry.test.ts:           10 tests
- circuit-breaker.test.ts: 23 tests
- price-service.test.ts:   17 tests
- exchange-rate-service.test.ts: 15 tests
- fundamentals-service.test.ts:  17 tests
```

### Build Verification

- ✅ TypeScript compilation: No errors
- ✅ ESLint: No warnings
- ✅ Build: Successful

### Recommendation

**APPROVED for merge.** Implementation is production-ready and meets all acceptance criteria. The provider abstraction layer provides a solid foundation for the real provider implementations in Stories 6.2-6.4.
