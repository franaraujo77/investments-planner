# Epic Technical Specification: Data Pipeline

Date: 2025-12-10
Author: Bmad
Epic ID: 6
Status: Draft

---

## Overview

Epic 6 delivers the external data integration layer that powers the scoring engine and portfolio valuations. This epic implements the provider abstraction pattern (ADR-005) to fetch asset fundamentals, daily prices, and exchange rates from external APIs. The data pipeline ensures fresh, accurate market data flows into the system while maintaining transparency about data sources and timestamps.

This epic is critical for enabling the core value proposition: automated recommendations based on current market data. Without reliable data fetching, scores cannot be calculated, portfolios cannot be valued in base currency, and recommendations cannot be generated.

## Objectives and Scope

### In Scope

- **Provider Abstraction Layer** - Interface-based design for external APIs with retry logic, circuit breaker, and fallback chains
- **Asset Fundamentals Fetching** - Fetch P/E, P/B, dividend yield, market cap from Gemini API (7-day cache)
- **Daily Price Fetching** - Fetch OHLCV data from price providers with Yahoo Finance fallback (24h cache)
- **Exchange Rate Fetching** - Fetch previous trading day rates for multi-currency support (24h cache)
- **Currency Conversion Logic** - Convert asset values to user's base currency using decimal.js
- **Force Refresh Capability** - User-initiated data refresh with rate limiting (5/hour)
- **Data Freshness Display** - DataFreshnessBadge showing timestamp and source for all data
- **Data Source Attribution** - Track and display which API provided each data point
- **Calculation Breakdown Access** - View inputs used in score calculations

### Out of Scope

- Overnight job orchestration (Epic 8)
- Score calculation logic (Epic 5 - already complete)
- Recommendation generation (Epic 7)
- Real-time streaming data
- Historical data backfill beyond 7 days

## System Architecture Alignment

### Architecture Components Referenced

| Component             | Location                                 | Purpose                         |
| --------------------- | ---------------------------------------- | ------------------------------- |
| Provider Abstraction  | `lib/providers/`                         | External API integration layer  |
| Price Service         | `lib/providers/price-service.ts`         | Price aggregation with fallback |
| Exchange Rate Service | `lib/providers/exchange-rate-service.ts` | Currency rate management        |
| Cache Layer           | `lib/cache/`                             | Vercel KV for data caching      |
| Event Store           | `lib/events/`                            | Audit trail for data fetches    |

### Architecture Constraints

- **Provider Pattern (ADR-005)**: All external APIs accessed through interface abstraction
- **Fallback Chain**: Primary → Fallback → Cached (stale flag)
- **Decimal Precision**: All currency operations use decimal.js (never float)
- **Cache TTL**: Prices 24h, Exchange rates 24h, Fundamentals 7 days
- **Rate Limiting**: Respect API provider limits; batch requests where possible

### Integration Points

- **Gemini API** - Primary for prices and fundamentals (100 req/min)
- **Yahoo Finance** - Fallback for prices
- **ExchangeRate-API** - Primary for currency rates (1500/month)
- **Open Exchange Rates** - Fallback for currency rates
- **Vercel KV** - Data caching layer
- **PostgreSQL** - Persistent storage for fetched data

## Detailed Design

### Services and Modules

| Service/Module                     | Responsibility                           | Inputs          | Outputs              |
| ---------------------------------- | ---------------------------------------- | --------------- | -------------------- |
| `PriceProvider` (interface)        | Define price fetch contract              | symbols[]       | PriceResult[]        |
| `ExchangeRateProvider` (interface) | Define rate fetch contract               | base, targets[] | ExchangeRateResult   |
| `FundamentalsProvider` (interface) | Define fundamentals fetch contract       | symbols[]       | FundamentalsResult[] |
| `GeminiProvider`                   | Gemini API implementation                | symbols[]       | prices, fundamentals |
| `YahooProvider`                    | Yahoo Finance implementation             | symbols[]       | prices               |
| `ExchangeRateAPIProvider`          | ExchangeRate-API implementation          | base, targets   | rates                |
| `OpenExchangeProvider`             | Open Exchange Rates implementation       | base, targets   | rates                |
| `PriceService`                     | Orchestrate price fetching with fallback | symbols[]       | PriceResult[]        |
| `ExchangeRateService`              | Orchestrate rate fetching with fallback  | base, targets   | rates                |
| `FundamentalsService`              | Orchestrate fundamentals with fallback   | symbols[]       | FundamentalsResult[] |
| `CurrencyConverter`                | Convert values between currencies        | value, from, to | converted value      |
| `DataFreshnessService`             | Track and report data timestamps         | dataKey         | FreshnessInfo        |

### Data Models and Contracts

#### Asset Prices Table

```sql
CREATE TABLE asset_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  open NUMERIC(19,4),
  high NUMERIC(19,4),
  low NUMERIC(19,4),
  close NUMERIC(19,4) NOT NULL,
  volume NUMERIC(19,0),
  currency VARCHAR(3) NOT NULL,
  source VARCHAR(50) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  price_date DATE NOT NULL,
  is_stale BOOLEAN DEFAULT FALSE,
  UNIQUE(symbol, price_date)
);

CREATE INDEX idx_asset_prices_symbol ON asset_prices(symbol);
CREATE INDEX idx_asset_prices_fetched ON asset_prices(fetched_at);
```

#### Exchange Rates Table

```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(19,8) NOT NULL,
  source VARCHAR(50) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  rate_date DATE NOT NULL,
  UNIQUE(base_currency, target_currency, rate_date)
);

CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency);
```

#### Asset Fundamentals Table

```sql
CREATE TABLE asset_fundamentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  pe_ratio NUMERIC(10,2),
  pb_ratio NUMERIC(10,2),
  dividend_yield NUMERIC(8,4),
  market_cap NUMERIC(19,0),
  revenue NUMERIC(19,2),
  earnings NUMERIC(19,2),
  sector VARCHAR(100),
  industry VARCHAR(100),
  source VARCHAR(50) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  data_date DATE NOT NULL,
  UNIQUE(symbol, data_date)
);

CREATE INDEX idx_fundamentals_symbol ON asset_fundamentals(symbol);
```

#### TypeScript Types

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

export interface FreshnessInfo {
  source: string;
  fetchedAt: Date;
  isStale: boolean;
  staleSince?: Date;
}
```

### APIs and Interfaces

#### GET /api/data/prices

Fetch current prices for specified symbols.

```typescript
// Request
GET /api/data/prices?symbols=PETR4,VALE3,ITUB4

// Response 200
{
  "data": {
    "prices": [
      {
        "symbol": "PETR4",
        "close": "38.45",
        "currency": "BRL",
        "source": "gemini",
        "fetchedAt": "2025-12-10T04:00:00Z",
        "priceDate": "2025-12-09",
        "isStale": false
      }
    ]
  }
}

// Response 502 (all providers failed)
{
  "error": "All price providers failed",
  "code": "PROVIDER_ERROR"
}
```

#### GET /api/data/exchange-rates

Fetch exchange rates for base currency.

```typescript
// Request
GET /api/data/exchange-rates?base=USD&targets=BRL,EUR,GBP

// Response 200
{
  "data": {
    "base": "USD",
    "rates": {
      "BRL": "5.0123",
      "EUR": "0.9234",
      "GBP": "0.7856"
    },
    "source": "exchangerate-api",
    "fetchedAt": "2025-12-10T04:00:00Z",
    "rateDate": "2025-12-09"
  }
}
```

#### GET /api/data/fundamentals

Fetch fundamentals for specified symbols.

```typescript
// Request
GET /api/data/fundamentals?symbols=PETR4,VALE3

// Response 200
{
  "data": {
    "fundamentals": [
      {
        "symbol": "PETR4",
        "peRatio": "4.52",
        "pbRatio": "0.98",
        "dividendYield": "12.34",
        "marketCap": "450000000000",
        "source": "gemini",
        "fetchedAt": "2025-12-08T04:00:00Z"
      }
    ]
  }
}
```

#### POST /api/data/refresh

Force refresh data (rate limited: 5/hour/user).

```typescript
// Request
POST /api/data/refresh
{
  "type": "prices" | "rates" | "fundamentals" | "all",
  "symbols": ["PETR4", "VALE3"]  // optional, defaults to user's portfolio
}

// Response 200
{
  "data": {
    "refreshed": true,
    "refreshedAt": "2025-12-10T14:30:00Z",
    "nextRefreshAvailable": "2025-12-10T15:30:00Z"
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

#### GET /api/data/freshness

Get data freshness information.

```typescript
// Request
GET /api/data/freshness?type=prices&symbols=PETR4

// Response 200
{
  "data": {
    "PETR4": {
      "source": "gemini",
      "fetchedAt": "2025-12-10T04:00:00Z",
      "isStale": false
    }
  }
}
```

#### GET /api/scores/[assetId]/inputs

Get calculation inputs for audit/verification.

```typescript
// Request
GET /api/scores/abc123/inputs

// Response 200
{
  "data": {
    "assetId": "abc123",
    "symbol": "PETR4",
    "calculatedAt": "2025-12-10T04:30:00Z",
    "inputs": {
      "price": {
        "value": "38.45",
        "currency": "BRL",
        "source": "gemini",
        "fetchedAt": "2025-12-10T04:00:00Z"
      },
      "exchangeRate": {
        "from": "BRL",
        "to": "USD",
        "rate": "0.1995",
        "source": "exchangerate-api",
        "fetchedAt": "2025-12-10T04:00:00Z"
      },
      "fundamentals": {
        "peRatio": "4.52",
        "dividendYield": "12.34",
        "source": "gemini",
        "fetchedAt": "2025-12-08T04:00:00Z"
      },
      "criteriaVersion": "v3",
      "criteriaSnapshot": { /* full criteria used */ }
    }
  }
}
```

### Workflows and Sequencing

#### Price Fetch Flow

```
1. PriceService.getPrices(symbols)
   │
   ├──► 2. Check Vercel KV cache
   │    └── If fresh (<24h): return cached
   │
   ├──► 3. Try primary provider (Gemini)
   │    ├── Success: cache + return
   │    └── Failure: log warning
   │
   ├──► 4. Try fallback provider (Yahoo)
   │    ├── Success: cache + return
   │    └── Failure: log warning
   │
   └──► 5. Return stale cache (if exists)
        └── Flag isStale: true
        └── If no cache: throw ProviderError
```

#### Currency Conversion Flow

```
1. User requests portfolio value in USD
   │
   ├──► 2. Get all asset values in native currencies
   │
   ├──► 3. For each unique currency:
   │    └── Get USD exchange rate (previous day)
   │
   ├──► 4. Convert each value:
   │    └── valueUSD = valueNative × rate
   │    └── Use decimal.js (NEVER float)
   │
   └──► 5. Return aggregated total + breakdown
```

#### Force Refresh Flow

```
1. User clicks "Refresh Data"
   │
   ├──► 2. Check rate limit (5/hour)
   │    └── If exceeded: return 429
   │
   ├──► 3. Invalidate relevant cache keys
   │
   ├──► 4. Fetch fresh data (price/rates/fundamentals)
   │    └── Using same provider chain
   │
   ├──► 5. Store with new timestamp
   │
   └──► 6. Return success + next available time
```

## Non-Functional Requirements

### Performance

| Metric                 | Target                     | Implementation                    |
| ---------------------- | -------------------------- | --------------------------------- |
| Price fetch latency    | < 2s for 50 symbols        | Batch requests, parallel fetching |
| Exchange rate fetch    | < 500ms                    | Single API call, 24h cache        |
| Cache hit rate         | > 95% during trading hours | 24h TTL, proactive warming        |
| Conversion calculation | < 10ms per asset           | decimal.js optimized              |
| Force refresh          | < 5s complete              | Async with progress indicator     |

### Security

| Requirement          | Implementation                               |
| -------------------- | -------------------------------------------- |
| API key protection   | Environment variables, never in code/logs    |
| User data isolation  | All fetches scoped by userId                 |
| Rate limiting        | Token bucket algorithm (5 req/hour)          |
| Input validation     | Zod schemas on all endpoints                 |
| Error message safety | No API keys or internal details in responses |

### Reliability/Availability

| Requirement          | Implementation                               |
| -------------------- | -------------------------------------------- |
| Provider redundancy  | Primary + fallback for each data type        |
| Graceful degradation | Stale cache with warning badge if all fail   |
| Circuit breaker      | Disable failing provider for 5 minutes       |
| Retry logic          | 3 attempts, exponential backoff (1s, 2s, 4s) |
| Timeout handling     | 10s per provider request                     |

### Observability

| Signal                  | Implementation                                |
| ----------------------- | --------------------------------------------- |
| Provider health metrics | Success/failure rate per provider             |
| Latency tracking        | P50/P95/P99 for each provider                 |
| Cache metrics           | Hit/miss ratio, stale serve count             |
| Rate limit tracking     | Usage per user, limit hits                    |
| Error logging           | Structured logs with provider, error, context |

## Dependencies and Integrations

### External Dependencies

| Dependency   | Version | Purpose                          |
| ------------ | ------- | -------------------------------- |
| `decimal.js` | ^10.6.0 | Financial precision calculations |
| `@vercel/kv` | ^3.0.0  | Data caching                     |
| `zod`        | ^4.1.13 | Request/response validation      |

### External API Integrations

| API                 | Purpose              | Rate Limit | Auth Method         |
| ------------------- | -------------------- | ---------- | ------------------- |
| Gemini API          | Prices, fundamentals | 100/min    | API Key header      |
| Yahoo Finance       | Fallback prices      | 2000/day   | API Key query param |
| ExchangeRate-API    | Primary rates        | 1500/month | API Key in URL      |
| Open Exchange Rates | Fallback rates       | 1000/month | App ID              |

### Internal Dependencies

| Dependency     | Provided By     | Purpose                          |
| -------------- | --------------- | -------------------------------- |
| User context   | Auth middleware | Scope data by user               |
| Event store    | Epic 1          | Audit trail for fetches          |
| Scoring engine | Epic 5          | Consumes price/fundamentals data |
| Portfolio data | Epic 3          | Provides symbols to fetch        |

## Acceptance Criteria (Authoritative)

### Story 6.1: Provider Abstraction Layer

1. **AC-6.1.1**: PriceProvider interface exists with fetchPrices() and healthCheck() methods
2. **AC-6.1.2**: ExchangeRateProvider interface exists with fetchRates() and healthCheck()
3. **AC-6.1.3**: Provider implementations can be swapped without changing business logic
4. **AC-6.1.4**: Retry logic applies 3 attempts with exponential backoff
5. **AC-6.1.5**: Circuit breaker disables failing provider after 5 consecutive failures

### Story 6.2: Fetch Asset Fundamentals

1. **AC-6.2.1**: Fundamentals fetched include: P/E, P/B, dividend yield, market cap
2. **AC-6.2.2**: Data cached with 7-day TTL in Vercel KV
3. **AC-6.2.3**: Only assets in user's configured markets are fetched
4. **AC-6.2.4**: Missing data for individual assets doesn't fail entire fetch
5. **AC-6.2.5**: Source (Gemini API) recorded with each data point

### Story 6.3: Fetch Daily Prices

1. **AC-6.3.1**: Prices include: open, high, low, close, volume
2. **AC-6.3.2**: Prices cached with 24-hour TTL
3. **AC-6.3.3**: Yahoo Finance fallback used if Gemini fails
4. **AC-6.3.4**: Missing prices show last known price with "stale" flag
5. **AC-6.3.5**: Batch requests limited to 50 symbols per call

### Story 6.4: Fetch Exchange Rates

1. **AC-6.4.1**: Rates fetched for all currencies in user portfolios
2. **AC-6.4.2**: Rates are previous trading day close (T-1)
3. **AC-6.4.3**: Open Exchange Rates fallback if primary fails
4. **AC-6.4.4**: Rate source and timestamp stored with rate
5. **AC-6.4.5**: Supported currencies: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF

### Story 6.5: Currency Conversion Logic

1. **AC-6.5.1**: All conversions use decimal.js (never floating point)
2. **AC-6.5.2**: Formula: value_base = value_native × rate
3. **AC-6.5.3**: Rounding: 4 decimal places, ROUND_HALF_UP
4. **AC-6.5.4**: Conversion logged for audit trail
5. **AC-6.5.5**: Rate used is always stored rate (not live)

### Story 6.6: Force Data Refresh

1. **AC-6.6.1**: Refresh button available on dashboard and portfolio
2. **AC-6.6.2**: Loading spinner shown during refresh
3. **AC-6.6.3**: Success toast: "Data refreshed as of [timestamp]"
4. **AC-6.6.4**: Rate limit: max 5 refreshes per hour per user
5. **AC-6.6.5**: Rate limit exceeded shows countdown to next available

### Story 6.7: Data Freshness Display

1. **AC-6.7.1**: DataFreshnessBadge shows timestamp and freshness indicator
2. **AC-6.7.2**: Colors: green (<24h), amber (1-3 days), red (>3 days)
3. **AC-6.7.3**: Hover shows: exact timestamp + source
4. **AC-6.7.4**: Click triggers refresh (if within rate limit)
5. **AC-6.7.5**: Badge appears on: prices, exchange rates, scores

### Story 6.8: Data Source Attribution

1. **AC-6.8.1**: Provider name displayed for each data point
2. **AC-6.8.2**: Format: "Price from Gemini API", "Rate from ExchangeRate-API"
3. **AC-6.8.3**: Available in asset detail panel and score breakdown
4. **AC-6.8.4**: Source stored with all data records

### Story 6.9: Calculation Breakdown Access

1. **AC-6.9.1**: View all input values used (prices, rates, fundamentals)
2. **AC-6.9.2**: View each criterion evaluation result
3. **AC-6.9.3**: View criteria version used for calculation
4. **AC-6.9.4**: Export breakdown as JSON available
5. **AC-6.9.5**: Replay produces identical results (deterministic)

## Traceability Mapping

| AC       | Spec Section               | Component(s)                     | Test Idea                                    |
| -------- | -------------------------- | -------------------------------- | -------------------------------------------- |
| AC-6.1.1 | Detailed Design - Services | `PriceProvider` interface        | Unit: interface contract validation          |
| AC-6.1.2 | Detailed Design - Services | `ExchangeRateProvider` interface | Unit: interface contract validation          |
| AC-6.1.3 | Detailed Design - Services | Provider factory                 | Integration: swap providers, verify behavior |
| AC-6.1.4 | Workflows - Price Fetch    | `PriceService`                   | Unit: mock failures, verify 3 retries        |
| AC-6.1.5 | NFR - Reliability          | Circuit breaker logic            | Unit: trigger 5 failures, verify disabled    |
| AC-6.2.1 | APIs - fundamentals        | `FundamentalsService`            | Integration: verify all fields fetched       |
| AC-6.2.2 | Data Models                | Vercel KV cache                  | Unit: verify 7-day TTL                       |
| AC-6.2.3 | Workflows                  | Market filtering                 | Integration: only configured markets         |
| AC-6.2.4 | NFR - Reliability          | Error handling                   | Unit: partial failures don't cascade         |
| AC-6.2.5 | Data Models                | `source` field                   | Unit: verify source populated                |
| AC-6.3.1 | APIs - prices              | `PriceResult`                    | Integration: verify OHLCV fields             |
| AC-6.3.2 | Data Models                | Cache TTL                        | Unit: 24h TTL enforced                       |
| AC-6.3.3 | Workflows                  | Fallback chain                   | Integration: Gemini fail → Yahoo used        |
| AC-6.3.4 | Workflows                  | Stale cache                      | Unit: stale flag set correctly               |
| AC-6.3.5 | NFR - Performance          | Batching                         | Unit: batch size <= 50                       |
| AC-6.4.1 | Workflows                  | Portfolio currency scan          | Integration: all currencies fetched          |
| AC-6.4.2 | Data Models                | Rate date                        | Unit: T-1 date used                          |
| AC-6.4.3 | Workflows                  | Fallback chain                   | Integration: primary fail → fallback         |
| AC-6.4.4 | Data Models                | `source`, `fetchedAt`            | Unit: fields populated                       |
| AC-6.4.5 | APIs                       | Currency support                 | Unit: all 8 currencies work                  |
| AC-6.5.1 | Data Models                | decimal.js                       | Unit: no float operations                    |
| AC-6.5.2 | Workflows                  | Conversion formula               | Unit: math correctness                       |
| AC-6.5.3 | NFR - Performance          | Rounding                         | Unit: ROUND_HALF_UP applied                  |
| AC-6.5.4 | Data Models                | Event store                      | Integration: conversion logged               |
| AC-6.5.5 | Workflows                  | Stored rates                     | Unit: no live rate calls during conversion   |
| AC-6.6.1 | APIs - refresh             | UI components                    | E2E: button visible on dashboard             |
| AC-6.6.2 | APIs - refresh             | Loading state                    | E2E: spinner during refresh                  |
| AC-6.6.3 | APIs - refresh             | Toast notification               | E2E: success toast shown                     |
| AC-6.6.4 | NFR - Security             | Rate limiting                    | Unit: 6th request rejected                   |
| AC-6.6.5 | APIs - refresh             | Rate limit response              | Unit: countdown in response                  |
| AC-6.7.1 | UI Components              | DataFreshnessBadge               | Component: render with timestamp             |
| AC-6.7.2 | UI Components              | Color logic                      | Unit: correct color per age                  |
| AC-6.7.3 | UI Components              | Tooltip                          | E2E: hover shows details                     |
| AC-6.7.4 | UI Components              | Click handler                    | E2E: click triggers refresh                  |
| AC-6.7.5 | UI Components              | Badge placement                  | E2E: badge on all data types                 |
| AC-6.8.1 | UI Components              | Source display                   | E2E: provider name shown                     |
| AC-6.8.2 | UI Components              | Format string                    | Unit: correct format                         |
| AC-6.8.3 | UI Components              | Panel integration                | E2E: source in breakdowns                    |
| AC-6.8.4 | Data Models                | `source` field                   | Unit: always populated                       |
| AC-6.9.1 | APIs - inputs              | Input snapshot                   | Integration: all inputs returned             |
| AC-6.9.2 | APIs - inputs              | Criterion results                | Integration: evaluations included            |
| AC-6.9.3 | APIs - inputs              | Criteria version                 | Unit: version in response                    |
| AC-6.9.4 | APIs - inputs              | JSON export                      | E2E: download works                          |
| AC-6.9.5 | NFR - Reliability          | Determinism                      | Integration: replay matches                  |

## Risks, Assumptions, Open Questions

### Risks

| Risk                                          | Probability | Impact | Mitigation                                   |
| --------------------------------------------- | ----------- | ------ | -------------------------------------------- |
| **R1**: Gemini API rate limits exceeded       | Medium      | High   | Implement aggressive caching, batch requests |
| **R2**: API provider pricing changes          | Low         | Medium | Provider abstraction allows quick switch     |
| **R3**: Stale data causes bad recommendations | Medium      | High   | Clear staleness indicators, force refresh    |
| **R4**: Exchange rate API downtime            | Low         | High   | Fallback provider, cached rates with warning |

### Assumptions

| Assumption                                          | Validation Needed                         |
| --------------------------------------------------- | ----------------------------------------- |
| **A1**: Gemini API provides all needed fundamentals | Review API docs for field coverage        |
| **A2**: Previous day exchange rates are acceptable  | User research - confirm T-1 is sufficient |
| **A3**: 24h price cache is acceptable freshness     | User research - confirm daily refresh ok  |
| **A4**: 5 refreshes/hour sufficient for users       | Monitor usage patterns post-launch        |

### Open Questions

| Question                                                       | Owner     | Due Date          |
| -------------------------------------------------------------- | --------- | ----------------- |
| **Q1**: What happens if an asset has no price data?            | Tech Lead | Before story 6.3  |
| **Q2**: Should we support more currencies beyond the 8 listed? | PM        | Before story 6.4  |
| **Q3**: Do we need historical price charts?                    | PM        | Post-MVP decision |

## Test Strategy Summary

### Unit Tests (Vitest)

- Provider interface contract tests
- Retry logic with mocked failures
- Circuit breaker state machine
- Currency conversion math (decimal.js)
- Rate limiting logic
- Cache TTL enforcement
- Color/freshness calculations

### Integration Tests

- Provider fallback chains (mock external APIs)
- Database storage/retrieval
- Event store audit logging
- API endpoint response formats
- Rate limiting across requests

### E2E Tests (Playwright)

- Force refresh flow with UI feedback
- DataFreshnessBadge interactions
- Source attribution display
- Calculation breakdown export
- Rate limit error handling

### Test Data

- Mock price responses from Gemini/Yahoo
- Mock exchange rate responses
- Test portfolio with multi-currency assets
- Edge cases: missing data, stale data, API failures

---

_Generated by BMAD Epic Tech Context Workflow v6_
_Date: 2025-12-10_
