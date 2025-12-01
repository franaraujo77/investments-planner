# System-Level Test Design Document

**Project:** Investments Planner
**Date:** 2025-11-29
**Author:** TEA (Murat)
**Assessment Type:** Phase 3 Testability Review (Pre-Implementation)

---

## Executive Summary

This document establishes the testing foundation for the Investments Planner platform before implementation begins. The architecture demonstrates **excellent testability** due to event-sourced calculations, provider abstraction patterns, and deterministic financial precision with decimal.js.

**Key Findings:**
- **Testability Rating:** HIGH
- **Primary Testing Frameworks:** Vitest (unit/integration) + Playwright (E2E) + k6 (performance)
- **Critical Test Coverage Areas:** Scoring engine, multi-currency calculations, overnight processing
- **Risk Mitigation:** Provider abstraction enables comprehensive mocking; event sourcing enables calculation replay

---

## 1. Architecture Testability Assessment

### 1.1 Controllability Assessment

| Factor | Rating | Evidence |
|--------|--------|----------|
| **Input Control** | HIGH | Event-sourced calculations capture all inputs (criteria, prices, rates) |
| **State Control** | HIGH | PostgreSQL + Drizzle ORM with clear schema; immutable criteria versioning |
| **Dependency Control** | HIGH | Provider abstraction pattern (ADR-005) enables mocking external APIs |
| **Time Control** | MEDIUM | Previous day's exchange rates (fixed point); overnight scheduling needs test fixtures |
| **Environment Control** | HIGH | Serverless architecture with clear environment variable configuration |

**Controllability Strengths:**
```typescript
// Provider abstraction enables complete dependency mocking
interface PriceProvider {
  name: string;
  fetchPrices(symbols: string[]): Promise<PriceResult[]>;
  healthCheck(): Promise<boolean>;
}

// Event sourcing captures all inputs for replay
type CalculationEvent =
  | { type: 'CALC_STARTED'; correlationId: string; userId: string; timestamp: Date }
  | { type: 'INPUTS_CAPTURED'; criteriaVersionId: string; criteria: CriteriaConfig;
      prices: PriceSnapshot[]; rates: ExchangeRateSnapshot[]; assetIds: string[] }
  | { type: 'SCORES_COMPUTED'; results: Array<{ assetId: string; score: string; breakdown: CriterionScore[] }> }
  | { type: 'CALC_COMPLETED'; correlationId: string; duration: number; assetCount: number };
```

**Controllability Concerns:**
- Date/time dependencies in overnight scheduling require test fixtures
- External API rate limits require careful test isolation

### 1.2 Observability Assessment

| Factor | Rating | Evidence |
|--------|--------|----------|
| **Output Visibility** | HIGH | Score breakdowns, allocation percentages, recommendation calculations exposed |
| **State Visibility** | HIGH | Event store captures all state transitions; calculation audit trail |
| **Side Effect Visibility** | HIGH | OpenTelemetry job-level spans; DataFreshnessBadge shows data provenance |
| **Error Visibility** | HIGH | Event store logs failures; provider abstraction logs API errors |

**Observability Strengths:**
```typescript
// OpenTelemetry provides comprehensive tracing
async function runOvernightJob(userId: string) {
  return tracer.startActiveSpan('overnight-job', async (span) => {
    span.setAttribute('user.id', userId);
    span.setAttribute('fetch_rates_ms', Date.now() - t0);
    span.setAttribute('fetch_prices_ms', Date.now() - t1);
    span.setAttribute('compute_scores_ms', Date.now() - t2);
    // ...
  });
}

// Event store enables calculation replay for verification
interface CalculationEventStore {
  append(event: CalculationEvent): Promise<void>;
  getByCorrelationId(id: string): Promise<CalculationEvent[]>;
  replay(correlationId: string): Promise<CalculationResult>; // Deterministic replay
}
```

**Observability Rating:** EXCELLENT - Event sourcing + OpenTelemetry provide complete audit trail

### 1.3 Reliability Assessment (Test Determinism)

| Factor | Rating | Evidence |
|--------|--------|----------|
| **Calculation Determinism** | HIGH | decimal.js with explicit precision; PostgreSQL numeric types |
| **State Determinism** | HIGH | Event sourcing enables exact replay; immutable criteria versions |
| **External Determinism** | HIGH | Provider abstraction allows consistent mocking |
| **Timing Determinism** | MEDIUM | Previous day's rates are fixed; overnight scheduling needs fixture |

**Determinism Guarantees:**
```typescript
// decimal.js ensures deterministic financial calculations
import Decimal from 'decimal.js';
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Drizzle schema uses PostgreSQL numeric for precision
value: numeric('value', { precision: 19, scale: 4 }).notNull()
```

**Testability Verdict:** The architecture is highly testable. Event sourcing provides deterministic replay, provider abstraction enables comprehensive mocking, and decimal.js ensures calculation precision.

---

## 2. Architecturally Significant Requirements (ASRs)

ASRs extracted from PRD NFRs that drive testing strategy:

### 2.1 Performance ASRs

| ASR | Target | Test Approach | Priority |
|-----|--------|---------------|----------|
| **ASR-PERF-01** | Dashboard load < 2 seconds | k6 load test against Vercel KV cached endpoints | CRITICAL |
| **ASR-PERF-02** | Score calculation < 100ms per asset | Vitest unit benchmarks on scoring engine | CRITICAL |
| **ASR-PERF-03** | API response times < 500ms | k6 API latency tests | HIGH |
| **ASR-PERF-04** | Overnight processing before 6 AM | Integration test with timing validation | HIGH |
| **ASR-PERF-05** | Portfolio recalculation < 1 second | Vitest integration benchmark | MEDIUM |

### 2.2 Security ASRs

| ASR | Target | Test Approach | Priority |
|-----|--------|---------------|----------|
| **ASR-SEC-01** | JWT + refresh token authentication | Playwright E2E auth flows + token expiry tests | CRITICAL |
| **ASR-SEC-02** | Tenant isolation (no cross-user data) | Integration tests verifying user scoping | CRITICAL |
| **ASR-SEC-03** | Data encryption at rest (AES-256) | Infrastructure validation (deployment check) | HIGH |
| **ASR-SEC-04** | Input validation (SQL injection, XSS) | Vitest unit tests + Playwright security flows | HIGH |
| **ASR-SEC-05** | Session management (httpOnly, timeout) | Playwright session lifecycle tests | HIGH |

### 2.3 Reliability ASRs

| ASR | Target | Test Approach | Priority |
|-----|--------|---------------|----------|
| **ASR-REL-01** | 99.5% uptime | Monitoring + synthetic uptime checks | HIGH |
| **ASR-REL-02** | Data durability (no loss) | Event store replay validation; backup verification | CRITICAL |
| **ASR-REL-03** | Graceful degradation (API failures) | Integration tests with failing provider mocks | HIGH |
| **ASR-REL-04** | Recovery < 4 hours | Disaster recovery procedure testing | MEDIUM |

### 2.4 Data Accuracy ASRs

| ASR | Target | Test Approach | Priority |
|-----|--------|---------------|----------|
| **ASR-DATA-01** | Multi-currency accuracy to the cent | Vitest unit tests with edge cases | CRITICAL |
| **ASR-DATA-02** | Exchange rates from previous trading day | Integration test with date validation | HIGH |
| **ASR-DATA-03** | Allocation percentages sum correctly | Vitest unit tests for allocation calculations | CRITICAL |
| **ASR-DATA-04** | Score reproducibility (deterministic) | Event replay verification tests | CRITICAL |

---

## 3. Test Levels Strategy

### 3.1 Test Level Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│                         TEST PYRAMID                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                           ▲                                      │
│                          /E\         E2E (Playwright)            │
│                         /2E \        10-15% of tests             │
│                        /────-\       Critical user journeys      │
│                       /      \                                   │
│                      / INTEG  \      Integration (Vitest)        │
│                     / RATION   \     25-30% of tests             │
│                    /────────────\    APIs, DB, providers         │
│                   /              \                                │
│                  /     UNIT       \  Unit (Vitest)               │
│                 /                  \ 55-65% of tests             │
│                /────────────────────\ Scoring, calculations      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Unit Tests (Vitest) - 55-65%

**Scope:** Pure business logic with no external dependencies

| Component | Test Focus | Critical Tests |
|-----------|------------|----------------|
| **Scoring Engine** | Criteria-driven scoring, aggregation | Edge cases, boundary conditions |
| **Decimal Utils** | Currency conversion, precision | Rounding, overflow, multi-currency |
| **Allocation Calculator** | Percentage calculations, limits | Range validation, sum verification |
| **Quick-Calc Preview** | Sample-based scoring | Performance, accuracy vs full calc |
| **Criteria Validation** | Schema validation, operators | Invalid inputs, edge cases |

**Example Unit Test Pattern:**
```typescript
// tests/unit/calculations/scoring-engine.test.ts
import { describe, it, expect } from 'vitest';
import { calculateScore } from '@/lib/calculations/scoring-engine';
import Decimal from 'decimal.js';

describe('ScoringEngine', () => {
  describe('calculateScore', () => {
    it('applies criteria-driven scoring with decimal precision', () => {
      const criteria = [
        { name: '5-year-surplus', operator: 'consecutive_years', threshold: 5, points: 5 },
        { name: 'p-e-ratio', operator: 'less_than', threshold: 15, points: 3 },
      ];
      const assetData = { surplusYears: 5, peRatio: 12.5 };

      const result = calculateScore(assetData, criteria);

      expect(result.totalScore).toBe(new Decimal(8)); // 5 + 3
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].contribution).toBe(new Decimal(5));
    });

    it('handles missing data gracefully with penalty', () => {
      const criteria = [
        { name: '5-year-surplus', operator: 'consecutive_years', threshold: 5, points: 5, missingPenalty: -2 },
      ];
      const assetData = { surplusYears: null }; // Missing data

      const result = calculateScore(assetData, criteria);

      expect(result.totalScore).toBe(new Decimal(-2));
    });
  });
});
```

**Unit Test Quality Standards:**
- No external dependencies (database, API, filesystem)
- Execution time < 50ms per test
- Explicit assertions (no hidden assertion helpers)
- Test isolation with no shared state
- Coverage target: ≥80% for calculation modules

### 3.3 Integration Tests (Vitest) - 25-30%

**Scope:** Component interactions, database operations, provider abstractions

| Component | Test Focus | Critical Tests |
|-----------|------------|----------------|
| **Event Store** | Event append, query, replay | Correlation ID retrieval, replay accuracy |
| **Provider Abstraction** | Primary → fallback → cache chain | Failure scenarios, stale data flags |
| **Database Operations** | Drizzle queries, migrations | Tenant isolation, transaction integrity |
| **Cache Operations** | Vercel KV read/write/invalidate | TTL behavior, cache miss handling |
| **Auth Flow** | JWT issue/verify, refresh rotation | Token expiry, refresh rotation |

**Example Integration Test Pattern:**
```typescript
// tests/integration/providers/price-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PriceService } from '@/lib/providers/price-service';
import { createMockPriceProvider, createMockCache } from '../fixtures/providers';

describe('PriceService', () => {
  let service: PriceService;
  let mockPrimary: MockPriceProvider;
  let mockFallback: MockPriceProvider;
  let mockCache: MockCache;

  beforeEach(() => {
    mockPrimary = createMockPriceProvider('gemini');
    mockFallback = createMockPriceProvider('yahoo');
    mockCache = createMockCache();
    service = new PriceService(mockPrimary, mockFallback, mockCache);
  });

  it('falls back to secondary provider when primary fails', async () => {
    mockPrimary.fetchPrices.mockRejectedValue(new Error('API rate limited'));
    mockFallback.fetchPrices.mockResolvedValue([{ symbol: 'AAPL', price: 150.00 }]);

    const result = await service.getPrices(['AAPL']);

    expect(mockFallback.fetchPrices).toHaveBeenCalled();
    expect(result[0].price).toBe(150.00);
  });

  it('returns cached data with stale flag when all providers fail', async () => {
    mockPrimary.fetchPrices.mockRejectedValue(new Error('Primary down'));
    mockFallback.fetchPrices.mockRejectedValue(new Error('Fallback down'));
    mockCache.get.mockResolvedValue([{ symbol: 'AAPL', price: 145.00 }]);

    const result = await service.getPrices(['AAPL']);

    expect(result[0].stale).toBe(true);
    expect(result[0].price).toBe(145.00);
  });
});
```

**Integration Test Quality Standards:**
- Use in-memory database or test containers
- Mock external APIs at provider boundary
- Execution time < 500ms per test
- Clean up test data in fixtures (self-cleaning)
- Coverage target: ≥70% for service modules

### 3.4 E2E Tests (Playwright) - 10-15%

**Scope:** Critical user journeys, cross-system workflows

| Journey | Flow | Critical Assertions |
|---------|------|---------------------|
| **Monthly Investment Review** | Login → Dashboard → Recommendations → Confirm | Load time, recommendation display, confirmation |
| **Criteria Configuration** | Login → Criteria → Edit → Preview → Save | Validation, preview accuracy, save confirmation |
| **Authentication** | Register → Verify → Login → Logout | Token handling, session management |
| **Score Transparency** | Dashboard → Asset → Score Breakdown | Breakdown display, criteria contribution |
| **Multi-Currency Display** | Portfolio → Asset values in both currencies | Conversion accuracy, rate display |

**Example E2E Test Pattern:**
```typescript
// tests/e2e/monthly-review.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from './pages';
import { seedTestUser, cleanupTestUser } from './fixtures/users';

test.describe('Monthly Investment Review Flow', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = await seedTestUser({
      portfolio: { assets: 5, totalValue: 50000 },
      criteria: 'default-reit',
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  test('displays recommendations within 2 seconds of login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);

    // Measure dashboard load time (ASR-PERF-01)
    const startTime = Date.now();
    await dashboardPage.waitForRecommendations();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
    await expect(dashboardPage.recommendationCards).toHaveCount({ minimum: 1 });
  });

  test('confirms investment and updates allocation', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goto();
    await dashboardPage.waitForRecommendations();

    const initialAllocation = await dashboardPage.getAllocation('Variable Income');

    await dashboardPage.confirmRecommendation(0, { amount: 1000 });

    await expect(dashboardPage.confirmationSuccess).toBeVisible();
    const newAllocation = await dashboardPage.getAllocation('Variable Income');

    expect(newAllocation).not.toBe(initialAllocation);
  });
});
```

**E2E Test Quality Standards:**
- Focus on critical user journeys only (avoid E2E for business logic)
- Use Page Object Model for maintainability
- Execution time < 90 seconds per test
- Self-cleaning test data with fixtures
- No hard waits (use `waitForResponse`, `waitForSelector`)
- Explicit assertions (never hidden in page objects)

---

## 4. NFR Testing Strategy

### 4.1 Performance Testing (k6)

**Tool:** k6 (NOT Playwright for load testing)

**Test Scenarios:**

| Scenario | Type | Target | Threshold |
|----------|------|--------|-----------|
| Dashboard Load | Load Test | 100 concurrent users | p95 < 2s |
| API Latency | Latency Test | Single user | p99 < 500ms |
| Overnight Processing | Stress Test | 1000 users | Complete < 4h |
| Score Calculation | Spike Test | Burst to 500 concurrent | No errors |

**k6 Test Example:**
```javascript
// tests/performance/dashboard-load.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '3m', target: 100 },  // Sustain
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // ASR-PERF-01
    http_req_failed: ['rate<0.01'],    // 99% success rate
  },
};

export default function () {
  const res = http.get('https://investments-planner.vercel.app/api/dashboard', {
    headers: { Authorization: `Bearer ${__ENV.TEST_JWT_TOKEN}` },
  });

  check(res, {
    'dashboard loads under 2s': (r) => r.timings.duration < 2000,
    'status is 200': (r) => r.status === 200,
    'recommendations present': (r) => JSON.parse(r.body).recommendations.length > 0,
  });

  sleep(1);
}
```

**Performance Test Schedule:**
- **Pre-release:** Full load test suite
- **Weekly:** Smoke tests for critical endpoints
- **On-demand:** After significant architecture changes

### 4.2 Security Testing

**Authentication & Authorization:**
```typescript
// tests/e2e/security/auth-security.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Security', () => {
  test('JWT expires and requires refresh', async ({ page, request }) => {
    // Login to get tokens
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'password' },
    });
    const { accessToken, refreshToken } = await loginResponse.json();

    // Wait for access token expiry (or mock time)
    // Attempt API call with expired token
    const expiredResponse = await request.get('/api/dashboard', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(expiredResponse.status()).toBe(401);

    // Use refresh token to get new access token
    const refreshResponse = await request.post('/api/auth/refresh', {
      data: { refreshToken },
    });

    expect(refreshResponse.status()).toBe(200);
  });

  test('tenant isolation prevents cross-user data access', async ({ request }) => {
    const user1Token = await getTokenForUser('user1@test.com');
    const user2Token = await getTokenForUser('user2@test.com');

    // User 1 creates a portfolio
    const createResponse = await request.post('/api/portfolio', {
      headers: { Authorization: `Bearer ${user1Token}` },
      data: { name: 'User 1 Portfolio' },
    });
    const { id: portfolioId } = await createResponse.json();

    // User 2 attempts to access User 1's portfolio
    const accessResponse = await request.get(`/api/portfolio/${portfolioId}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    expect(accessResponse.status()).toBe(404); // Or 403
  });
});
```

**Input Validation Testing:**
```typescript
// tests/unit/validation/criteria-validation.test.ts
describe('Criteria Input Validation', () => {
  it('rejects SQL injection attempts in criteria name', () => {
    const maliciousInput = "'; DROP TABLE users; --";

    expect(() => validateCriteriaName(maliciousInput)).toThrow('Invalid characters');
  });

  it('sanitizes XSS attempts in criteria description', () => {
    const xssInput = '<script>alert("xss")</script>';

    const sanitized = sanitizeCriteriaDescription(xssInput);

    expect(sanitized).not.toContain('<script>');
  });
});
```

### 4.3 Reliability Testing

**Provider Fallback Testing:**
```typescript
// tests/integration/reliability/provider-fallback.test.ts
describe('Provider Fallback Chain', () => {
  it('degrades gracefully through fallback chain', async () => {
    // Simulate primary failure
    mockGeminiProvider.fail();

    // Verify fallback provider is used
    const result = await priceService.getPrices(['AAPL']);

    expect(result.source).toBe('yahoo-finance');
    expect(result.stale).toBe(false);
  });

  it('returns stale cached data when all providers fail', async () => {
    mockGeminiProvider.fail();
    mockYahooProvider.fail();
    mockCache.set('prices', { AAPL: 150.00, timestamp: Date.now() - 86400000 });

    const result = await priceService.getPrices(['AAPL']);

    expect(result.stale).toBe(true);
    expect(result.price).toBe(150.00);
  });

  it('surfaces DataFreshnessBadge warning for stale data', async ({ page }) => {
    // Setup stale data scenario
    await seedStaleDataScenario();

    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="freshness-badge"]')).toContainText('Stale');
    await expect(page.locator('[data-testid="freshness-badge"]')).toHaveClass(/warning/);
  });
});
```

**Circuit Breaker Testing:**
```typescript
describe('Circuit Breaker Behavior', () => {
  it('opens circuit after consecutive failures', async () => {
    // Trigger 5 consecutive failures
    for (let i = 0; i < 5; i++) {
      mockProvider.failOnce();
      await priceService.getPrices(['AAPL']).catch(() => {});
    }

    // Verify circuit is open (fast fail, no API call)
    const startTime = Date.now();
    await priceService.getPrices(['AAPL']).catch(() => {});
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(50); // Fast fail
    expect(mockProvider.callCount).toBe(5); // No new calls
  });
});
```

### 4.4 Maintainability Testing

**Coverage & Quality Gates:**

| Metric | Target | Tool |
|--------|--------|------|
| Line Coverage | ≥80% | Vitest coverage |
| Branch Coverage | ≥70% | Vitest coverage |
| Code Duplication | <5% | jscpd |
| Security Vulnerabilities | 0 critical/high | npm audit |
| Test Execution Time | <5 min (unit), <15 min (E2E) | CI timing |

**CI Quality Gate Configuration:**
```yaml
# .github/workflows/quality-gates.yml
quality-gates:
  runs-on: ubuntu-latest
  steps:
    - name: Run Tests with Coverage
      run: pnpm test:coverage

    - name: Check Coverage Thresholds
      run: |
        if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
          echo "Coverage below 80%"
          exit 1
        fi

    - name: Check Code Duplication
      run: npx jscpd --threshold 5 src/

    - name: Security Audit
      run: npm audit --audit-level=high
```

---

## 5. Test Data Strategy

### 5.1 Test Data Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Fixtures** | Consistent test data across tests | JSON/TypeScript factory functions |
| **Seeding** | E2E test setup | Database seeders with cleanup |
| **Mocking** | External API responses | Vitest mock functions |
| **Factories** | Dynamic test data generation | Factory functions with defaults |

**Fixture Example:**
```typescript
// tests/fixtures/portfolio.ts
export const createPortfolioFixture = (overrides: Partial<Portfolio> = {}): Portfolio => ({
  id: 'test-portfolio-1',
  userId: 'test-user-1',
  name: 'Test Portfolio',
  baseCurrency: 'USD',
  assets: [
    { symbol: 'AAPL', quantity: 10, purchasePrice: 150.00, currency: 'USD' },
    { symbol: 'PETR4', quantity: 100, purchasePrice: 35.50, currency: 'BRL' },
  ],
  ...overrides,
});

export const createCriteriaFixture = (overrides: Partial<Criteria> = {}): Criteria => ({
  id: 'test-criteria-1',
  userId: 'test-user-1',
  name: 'REIT Criteria',
  assetType: 'REIT',
  rules: [
    { name: 'dividend-yield', operator: 'greater_than', threshold: 6, points: 5 },
    { name: 'vacancy-rate', operator: 'less_than', threshold: 10, points: 3 },
  ],
  ...overrides,
});
```

### 5.2 Test Isolation

**Principles:**
- Each test owns its data (create in setup, clean in teardown)
- No shared mutable state between tests
- Database tests use transactions with rollback
- E2E tests use unique user per test suite

**Implementation:**
```typescript
// tests/setup/database.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

export const setupTestDatabase = async () => {
  const testDb = drizzle(process.env.TEST_DATABASE_URL);
  await migrate(testDb, { migrationsFolder: './drizzle' });
  return testDb;
};

export const cleanupTestData = async (db: Database, userId: string) => {
  await db.delete(portfolios).where(eq(portfolios.userId, userId));
  await db.delete(criteria).where(eq(criteria.userId, userId));
  await db.delete(events).where(eq(events.userId, userId));
};
```

---

## 6. Risk-Based Test Prioritization

### 6.1 Risk Matrix for Testing

| Risk ID | Description | P | I | Score | Test Coverage |
|---------|-------------|---|---|-------|---------------|
| **R1** | Decimal precision errors in multi-currency | 3 | 3 | 9 | Unit tests: decimal utils, allocation calc |
| **R2** | Scoring engine incorrect calculations | 2 | 3 | 6 | Unit tests: scoring engine with edge cases |
| **R3** | Audit trail incomplete (replay fails) | 2 | 3 | 6 | Integration tests: event store replay |
| **R4** | Provider failures cascade | 2 | 3 | 6 | Integration tests: fallback chain |
| **R5** | Dashboard performance degradation | 2 | 2 | 4 | k6 load tests |
| **R6** | Auth token vulnerabilities | 1 | 3 | 3 | E2E security tests |
| **R7** | Tenant data leakage | 1 | 3 | 3 | Integration tests: tenant isolation |

**P** = Probability (1-3), **I** = Impact (1-3), **Score** = P × I

### 6.2 Coverage Traceability

| ASR | Related FRs | Test Type | Test Files |
|-----|-------------|-----------|------------|
| ASR-PERF-01 | FR59 | k6 | `tests/performance/dashboard-load.k6.js` |
| ASR-PERF-02 | FR34 | Unit | `tests/unit/calculations/scoring-engine.test.ts` |
| ASR-SEC-01 | FR1-FR5 | E2E | `tests/e2e/security/auth-security.spec.ts` |
| ASR-SEC-02 | FR1-FR8 | Integration | `tests/integration/security/tenant-isolation.test.ts` |
| ASR-DATA-01 | FR40-FR44 | Unit | `tests/unit/calculations/decimal-utils.test.ts` |
| ASR-DATA-04 | FR60-FR64 | Integration | `tests/integration/events/event-replay.test.ts` |
| ASR-REL-03 | FR31-FR39 | Integration | `tests/integration/reliability/provider-fallback.test.ts` |

---

## 7. Test Infrastructure Recommendations

### 7.1 Tool Stack

| Category | Tool | Rationale |
|----------|------|-----------|
| **Unit/Integration** | Vitest | Fast, TypeScript-native, Vite-compatible |
| **E2E** | Playwright | Cross-browser, reliable selectors, network mocking |
| **Performance** | k6 | JavaScript-native, excellent metrics, CI integration |
| **Coverage** | Vitest built-in | Integrated with test runner |
| **Mocking** | Vitest + MSW | Native mocking + API mocking |
| **Component** | Storybook (already planned) | Visual testing, component isolation |

### 7.2 CI/CD Integration

**GitHub Actions Workflow:**
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:unit --coverage
      - run: pnpm test:integration
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  performance:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/performance/dashboard-load.k6.js
```

### 7.3 Test Execution Times

| Test Suite | Target | Max Allowed |
|------------|--------|-------------|
| Unit Tests | < 2 min | 5 min |
| Integration Tests | < 5 min | 10 min |
| E2E Tests | < 10 min | 15 min |
| Performance Tests | < 5 min | 10 min |
| **Total Pipeline** | < 15 min | 25 min |

---

## 8. Epic 1 Test Setup Checklist

**Foundation testing infrastructure to establish in Epic 1:**

```
[ ] Configure Vitest with coverage reporting
    - vitest.config.ts with coverage thresholds
    - Coverage reporters: text, lcov, html

[ ] Configure Playwright for E2E
    - playwright.config.ts with browser settings
    - Base URL configuration for environments
    - Reporter configuration

[ ] Create test directory structure
    tests/
    ├── unit/
    │   └── calculations/
    ├── integration/
    │   ├── providers/
    │   └── events/
    ├── e2e/
    │   ├── pages/           # Page objects
    │   ├── fixtures/        # Test data
    │   └── *.spec.ts
    ├── performance/
    │   └── *.k6.js
    └── fixtures/
        ├── portfolio.ts
        └── criteria.ts

[ ] Establish test fixture patterns
    - Factory functions for test data
    - Database seeding utilities
    - Cleanup utilities

[ ] Create first critical tests
    - Scoring engine unit test (reference implementation)
    - Provider abstraction integration test
    - Login flow E2E test

[ ] Configure CI pipeline
    - GitHub Actions workflow
    - Coverage upload to Codecov
    - Playwright report artifacts

[ ] Document testing standards
    - Test naming conventions
    - Assertion patterns
    - Mocking guidelines
```

---

## 9. Recommendations & Next Steps

### 9.1 Immediate Actions (Epic 1)

1. **Establish test infrastructure** per checklist above
2. **Write scoring engine unit tests** as reference implementation
3. **Create provider mock utilities** for integration testing
4. **Set up E2E fixtures** for user/portfolio/criteria

### 9.2 Per-Epic Testing Strategy

| Epic | Test Focus |
|------|------------|
| **Epic 1 (Foundation)** | Test infrastructure, scoring engine unit tests |
| **Epic 2 (Auth)** | Auth E2E flows, session management, tenant isolation |
| **Epic 3 (Portfolio)** | CRUD operations, allocation calculations |
| **Epic 4 (Asset Classes)** | Configuration validation, limit enforcement |
| **Epic 5 (Scoring)** | Criteria-driven scoring, breakdown accuracy |
| **Epic 6 (Data Pipeline)** | Provider fallback, data freshness |
| **Epic 7 (Recommendations)** | Full flow E2E, confirmation workflow |
| **Epic 8 (Overnight)** | Inngest job testing, cache warming |
| **Epic 9 (Alerts)** | Alert triggering, notification delivery |

### 9.3 Quality Gates

**Definition of Done (DoD) Testing Requirements:**

- [ ] Unit tests for all calculation logic (≥80% coverage)
- [ ] Integration tests for service layer
- [ ] E2E tests for critical user journeys
- [ ] No critical/high security vulnerabilities
- [ ] Performance within SLA (documented thresholds)
- [ ] All tests passing in CI

---

## Appendix A: Test Quality Checklist

**Use this checklist when reviewing test code:**

```
□ Test name describes behavior, not implementation
□ Single assertion concept per test (can have multiple expects)
□ No hard waits (use waitForResponse, waitForSelector)
□ No conditionals in test code
□ Test data created in setup, cleaned in teardown
□ Explicit assertions (not hidden in helpers)
□ Test file < 300 lines
□ Individual test execution < 90 seconds
□ No flaky tests (deterministic)
□ Mocks at boundaries only (not internal modules)
```

---

## Appendix B: Performance Test Thresholds

| Endpoint | p50 | p95 | p99 | Max |
|----------|-----|-----|-----|-----|
| `GET /api/dashboard` | 500ms | 1500ms | 2000ms | 3000ms |
| `GET /api/recommendations` | 200ms | 400ms | 500ms | 1000ms |
| `POST /api/investments/confirm` | 300ms | 500ms | 700ms | 1000ms |
| `GET /api/scores/:id/breakdown` | 100ms | 200ms | 300ms | 500ms |
| `POST /api/criteria` | 200ms | 400ms | 500ms | 1000ms |

---

_This test design document establishes the testing foundation for Investments Planner. Update as architecture evolves during implementation._

_Generated by TEA (Test Architect Agent) - BMAD Method v6-alpha_
_Date: 2025-11-29_
