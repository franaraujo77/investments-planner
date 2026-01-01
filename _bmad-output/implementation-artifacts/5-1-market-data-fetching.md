# Story 5.1: Market Data Fetching

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want **to fetch comprehensive data including IR publications, prices, and exchange rates**,
so that **users have complete market data for their investment decisions**.

## Acceptance Criteria

1. **AC-5.1.1: Fundamentals Data Fetching**
   - Given the system has configured data providers
   - When the scheduled fetch runs
   - Then fundamental data is fetched from Gemini API for all tracked assets
   - And data includes: P/E ratio, dividend yield, market cap, sector, etc.

2. **AC-5.1.2: IR Publications Data**
   - Given assets have investor relations publications
   - When the data fetch runs
   - Then the system retrieves all available IR data including:
     - Annual reports and financial statements
     - Quarterly earnings reports
     - Dividend announcements and history
     - Revenue and profit margins
     - Debt levels and cash flow
     - Management guidance and forecasts
     - Surplus/deficit history per year

3. **AC-5.1.3: Price Data Fetching**
   - Given the system needs current prices
   - When the price fetch runs
   - Then daily closing prices are retrieved for all assets in user portfolios
   - And prices are stored with timestamp and source attribution

4. **AC-5.1.4: Exchange Rate Fetching**
   - Given the system needs exchange rates
   - When the exchange rate fetch runs
   - Then rates are retrieved for all currency pairs needed
   - And the previous trading day's rates are used for consistency

5. **AC-5.1.5: Retry and Error Handling**
   - Given an API call fails
   - When the error is detected
   - Then the system retries with exponential backoff (max 3 retries)
   - And failures are logged with structured logging
   - And cached data remains available

6. **AC-5.1.6: Rate Limiting**
   - Given API rate limits are approached
   - When requests are queued
   - Then the system batches requests to stay within limits
   - And prioritizes assets in active user portfolios

7. **AC-5.1.7: Data Attribution**
   - Given IR data is fetched
   - When data is stored
   - Then the source is attributed (e.g., "Company IR", "SEC Filing", "B3 Filing")
   - And publication date is recorded for freshness tracking

8. **AC-5.1.8: Cache Table Naming Convention**
   - Given tables are created to cache market data
   - When the schema is implemented
   - Then all cache tables use the prefix `cached_` (e.g., `cached_prices`, `cached_exchange_rates`, `cached_fundamentals`)
   - And each cache record includes a `cache_updated_at` timestamp column
   - And `cache_updated_at` is automatically set on insert/update
   - And this convention enables easy identification of cacheable vs. transactional data

## Tasks / Subtasks

### Task 1: Wire Up Exchange Rate Service to Overnight Job (AC: 5.1.4, 5.1.5)

- [ ] 1.1: Update `createExchangeRateService()` in overnight-scoring.ts to use `getExchangeRateService()` factory
- [ ] 1.2: Remove TODO(epic-8) placeholder and implement actual service initialization
- [ ] 1.3: Add environment variable validation for EXCHANGE_RATE_API_KEY
- [ ] 1.4: Verify retry and circuit breaker behavior with integration test
- [ ] 1.5: Add structured logging for exchange rate fetch success/failure

### Task 2: Wire Up Price Service to Overnight Job (AC: 5.1.3, 5.1.5, 5.1.6)

- [ ] 2.1: Update `createPriceService()` in overnight-scoring.ts to use `getPriceService()` factory
- [ ] 2.2: Remove TODO(epic-8) placeholder and implement actual service initialization
- [ ] 2.3: Add environment variable validation for GEMINI_API_KEY and YAHOO_FINANCE_API_KEY
- [ ] 2.4: Verify batch size limits (50 symbols per request per AC-6.3.5)
- [ ] 2.5: Add structured logging for price fetch success/partial/failure

### Task 3: Wire Up Fundamentals Service (AC: 5.1.1, 5.1.2)

- [ ] 3.1: Add fundamentals fetch step to overnight-scoring.ts (new Step 4b after prices)
- [ ] 3.2: Use `getFundamentalsService()` factory for Gemini fundamentals provider
- [ ] 3.3: Store fundamentals data with source attribution and timestamp
- [ ] 3.4: Add FundamentalsResult type to step result interfaces
- [ ] 3.5: Include fundamentals metrics in job run finalization

### Task 4: Environment Configuration and Validation (AC: 5.1.5)

- [ ] 4.1: Document all required environment variables in .env.example
- [ ] 4.2: Add startup validation for production environment
- [ ] 4.3: Create helper functions for environment variable parsing
- [ ] 4.4: Add graceful degradation for missing optional providers

### Task 5: Data Storage with Attribution (AC: 5.1.7)

- [ ] 5.1: Ensure PriceResult.source is propagated to stored prices
- [ ] 5.2: Ensure ExchangeRateResult.source is propagated to stored rates
- [ ] 5.3: Ensure FundamentalsResult.source and dataDate are stored
- [ ] 5.4: Verify freshness tracking timestamps are recorded correctly

### Task 6: Unit Tests (All AC)

- [ ] 6.1: Test overnight job with real provider factory functions
- [ ] 6.2: Test fallback behavior when primary provider fails
- [ ] 6.3: Test rate limiting error handling propagates correctly
- [ ] 6.4: Test environment variable validation logic
- [ ] 6.5: Mock provider failure scenarios (timeout, rate limit, auth failure)

### Task 7: Integration Tests (AC: 5.1.3, 5.1.4, 5.1.5)

- [ ] 7.1: Integration test: Exchange rate service with mock API responses
- [ ] 7.2: Integration test: Price service with mock API responses
- [ ] 7.3: Integration test: Full overnight job step sequence (mocked providers)
- [ ] 7.4: Verify circuit breaker state transitions

### Task 8: Documentation (All AC)

- [ ] 8.1: Update overnight-scoring.ts header comments with implemented provider details
- [ ] 8.2: Add API key setup instructions to README or deployment docs
- [ ] 8.3: Document retry/backoff configuration options

## Dev Notes

### Existing Infrastructure (Already Built - Verification Focus)

The provider abstraction layer is **already implemented** in `src/lib/providers/`:

| Component                    | Location                                                            | Status   |
| ---------------------------- | ------------------------------------------------------------------- | -------- |
| Provider interfaces          | `src/lib/providers/types.ts`                                        | Complete |
| PriceProvider                | `src/lib/providers/implementations/gemini-price-provider.ts`        | Complete |
| FallbackPriceProvider        | `src/lib/providers/implementations/yahoo-price-provider.ts`         | Complete |
| ExchangeRateProvider         | `src/lib/providers/implementations/exchangerate-api-provider.ts`    | Complete |
| FallbackExchangeRateProvider | `src/lib/providers/implementations/open-exchange-rates-provider.ts` | Complete |
| FundamentalsProvider         | `src/lib/providers/implementations/gemini-provider.ts`              | Complete |
| Service factories            | `src/lib/providers/index.ts`                                        | Complete |
| Retry logic                  | `src/lib/providers/retry.ts`                                        | Complete |
| Circuit breaker              | `src/lib/providers/circuit-breaker.ts`                              | Complete |
| Caching                      | `src/lib/providers/prices-cache.ts`, `exchange-rates-cache.ts`      | Complete |

### Key Files to Modify

1. **`src/lib/inngest/functions/overnight-scoring.ts`** (lines 186-239)
   - Replace TODO(epic-8) placeholders with actual provider initialization
   - `createExchangeRateService()` → Use `getExchangeRateService()` from providers
   - `createPriceService()` → Use `getPriceService()` from providers

2. **Environment Variables** (update `.env.example`)

   ```bash
   # Price Providers
   GEMINI_API_KEY=xxx
   YAHOO_FINANCE_API_KEY=xxx

   # Exchange Rate Providers
   EXCHANGE_RATE_API_KEY=xxx
   OPEN_EXCHANGE_RATES_APP_ID=xxx

   # Provider Configuration (optional, has defaults)
   PROVIDER_TIMEOUT_MS=10000
   PROVIDER_RETRY_ATTEMPTS=3
   CIRCUIT_BREAKER_THRESHOLD=5
   CIRCUIT_BREAKER_RESET_MS=300000
   ```

### Architecture Patterns

Per architecture document and existing implementation:

- **Primary/Fallback Pattern**: Each service has primary + fallback provider
  - Prices: Gemini (primary) → Yahoo Finance (fallback)
  - Exchange Rates: ExchangeRate-API (primary) → Open Exchange Rates (fallback)
  - Fundamentals: Gemini (primary) → Mock (fallback for dev)

- **Retry with Exponential Backoff**: Default 3 attempts, 1s/2s/4s delays, 10s timeout
  - Configured in `DEFAULT_RETRY_CONFIG` in types.ts

- **Circuit Breaker**: 5 failures opens circuit, 5 minute reset timeout
  - Configured in `DEFAULT_CIRCUIT_BREAKER_CONFIG` in types.ts

- **Cache TTL**: 24h for prices/rates, 7 days for fundamentals
  - Configured in `DEFAULT_CACHE_TTL` in types.ts

### Decimal.js Considerations (Epic 4 Lesson)

All numeric values from providers are strings to preserve decimal.js precision:

- `PriceResult.close`, `open`, `high`, `low`, `volume` are all strings
- `ExchangeRateResult.rates` values are strings
- `FundamentalsResult.peRatio`, `pbRatio`, etc. are strings

### Testing Standards

Per CLAUDE.md:

- Unit tests: `tests/unit/inngest/overnight-scoring.test.ts`
- Integration tests: `tests/integration/inngest/overnight-scoring.test.ts`
- Use vitest with existing mock patterns from provider tests
- Mock providers are available: `MockPriceProvider`, `MockExchangeRateProvider`, `MockFundamentalsProvider`

### Project Structure Notes

Files follow established patterns:

- Services in `src/lib/providers/`
- Inngest functions in `src/lib/inngest/functions/`
- Tests mirror source structure in `tests/`

No structural conflicts detected.

### References

- [Source: `src/lib/providers/index.ts`] - Factory functions `getPriceService()`, `getExchangeRateService()`, `getFundamentalsService()`
- [Source: `src/lib/providers/types.ts`] - Provider interfaces and configuration types
- [Source: `src/lib/inngest/functions/overnight-scoring.ts:186-239`] - TODO placeholders to replace
- [Source: `_bmad-output/implementation-artifacts/epic-5-prep-research.md`] - Epic 5 scope definition
- [Source: `_bmad-output/implementation-artifacts/epic-4-retrospective.md`] - Decimal.js lesson learned
- [Source: `CLAUDE.md#Development Standards`] - Test requirements

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
