# Epic 5 Prep Research: Market Data & Scoring Engine

**Date:** 2025-12-31
**Prepared by:** Charlie (Senior Dev)
**Status:** Ready for Epic 5

---

## Executive Summary

Epic 5 builds on substantial existing infrastructure. The provider abstraction layer, Inngest job structure, and caching strategy are already implemented. The primary work is:

1. **Connect real data providers** (replace mock endpoints)
2. **Add fundamentals fetching step** to overnight job
3. **End-to-end testing** of complete pipeline

---

## Research Findings

### 1. Provider Abstraction Layer (Already Implemented)

**Location:** `src/lib/providers/`

| Interface              | Purpose                         | Status         |
| ---------------------- | ------------------------------- | -------------- |
| `PriceProvider`        | Daily asset prices              | ✅ Implemented |
| `FundamentalsProvider` | P/E, dividend yield, market cap | ✅ Implemented |
| `ExchangeRateProvider` | Currency conversion rates       | ✅ Implemented |

**Implementations:**

- `GeminiFundamentalsProvider` - Mock/placeholder (`https://api.gemini.example.com`)
- `GeminiPriceProvider` - Mock/placeholder
- `YahooPriceProvider` - Backup price source

**Configuration:**
| Setting | Value |
|---------|-------|
| Rate Limit | 100 requests/minute |
| Batch Size | 50 symbols per request |
| Retry | 3 attempts, exponential backoff (1s, 2s, 4s) |
| Timeout | 10 seconds |
| Circuit Breaker | Opens after 5 failures, resets after 5 minutes |

**Cache TTL (from `types.ts`):**
| Data Type | TTL |
|-----------|-----|
| Prices | 24 hours |
| Exchange Rates | 24 hours |
| Fundamentals | 7 days |

### 2. Inngest Job Structure (Already Implemented)

**File:** `src/lib/inngest/functions/overnight-scoring.ts`

**Pipeline Steps:**

```
Step 1: Setup
  └─ Create correlationId, record job run in database

Step 2: Fetch Exchange Rates (ONCE)
  └─ USD as base currency, get all target currencies

Step 3: Get Active Users
  └─ Query users with active portfolios

Step 4: Fetch Asset Prices
  └─ Batch fetch for all unique asset symbols

Step 5: Score Portfolios
  └─ Process users in batches of 50
  └─ Emit 4 events per user for audit trail

Step 5b: Detect Opportunity Alerts
  └─ Story 9.1: Find better alternatives (10+ points higher)

Step 5c: Detect Drift Alerts
  └─ Story 9.2: Allocation outside target range

Step 6: Generate Recommendations
  └─ Pre-generate for instant access

Step 7: Warm Cache
  └─ Store in Vercel KV (key: recs:${userId}, TTL: 24h)

Step 8: Finalize
  └─ Update job status with metrics
```

**Schedule:** `0 4 * * *` (4 AM UTC daily)

**Observability:**

- OpenTelemetry spans with correlation IDs
- Structured logging via `logger`
- Job run metrics stored in database

### 3. Caching Strategy (Already Implemented)

**Service:** `src/lib/services/cache-warmer-service.ts`

| Aspect        | Implementation                         |
| ------------- | -------------------------------------- |
| Cache Storage | Vercel KV (Redis-compatible)           |
| Key Pattern   | `recs:${userId}`                       |
| TTL           | 24 hours                               |
| Warming       | Inline after recommendations generated |
| Fallback      | PostgreSQL if cache miss               |

**Data Flow:**

```
Inngest Cron (overnight)
    ↓
PostgreSQL (source of truth - scores, recommendations)
    ↓
Vercel KV (hot cache - user recommendations)
    ↓
User reads from KV first → fallback to PostgreSQL if miss
```

### 4. Real Data Provider Options

**Recommendation:** Choose ONE provider for MVP, add fallbacks later.

| Provider                | Free Tier     | Rate Limit | Best For                    |
| ----------------------- | ------------- | ---------- | --------------------------- |
| Alpha Vantage           | 25 calls/day  | 5/min      | Stocks, basic fundamentals  |
| Yahoo Finance           | Unlimited\*   | None       | Prices, unofficial API      |
| Polygon.io              | 5 calls/min   | Varies     | High-quality, stocks+crypto |
| Financial Modeling Prep | 250 calls/day | 5/sec      | Fundamentals, financials    |

\*Yahoo Finance has no official API; use at own risk.

**Decision Needed:** Which provider for production?

---

## Epic 5 Work Scope (Revised)

Based on research, Epic 5 stories may need adjustment:

### Already Done (from prior epics):

- [x] Provider abstraction layer (Epic 6)
- [x] Inngest job infrastructure (Epic 8)
- [x] Overnight scoring pipeline (Epic 8)
- [x] Recommendation pre-generation (Epic 8)
- [x] Cache warming (Epic 8)
- [x] Alert detection (Epic 9)

### Epic 5 Actual Scope:

1. **Story 5.1: Connect Real Price Provider**
   - Implement actual API integration (Alpha Vantage/Yahoo/Polygon)
   - Add API key configuration
   - Test with real market data

2. **Story 5.2: Connect Real Fundamentals Provider**
   - Implement actual fundamentals API
   - Map API response to `FundamentalsResult` schema
   - Add fundamentals step to overnight job

3. **Story 5.3: Connect Real Exchange Rate Provider**
   - Implement exchange rate API (e.g., exchangerate-api.com)
   - Test multi-currency scenarios

4. **Story 5.4: End-to-End Pipeline Testing**
   - Integration tests with real APIs
   - Performance validation (<4 hours for 1000 users)
   - Error handling and circuit breaker testing

5. **Story 5.5: Historical Score Storage**
   - Store score history for trend analysis
   - Query API for historical scores

---

## Pre-Epic Checklist

- [x] Provider abstraction layer ready
- [x] Inngest job structure documented
- [x] Caching strategy implemented
- [x] Decimal.js edge cases documented in project-context.md
- [ ] **TODO:** Select production data provider
- [ ] **TODO:** Obtain API keys for selected provider
- [ ] **TODO:** Review Epic 5 story definitions against existing code

---

## Action Items for Epic 5 Planning

1. **Select Primary Data Provider** - Team decision needed
2. **Obtain API Keys** - Set up accounts with selected provider
3. **Review Epic 5 Stories** - Align with existing infrastructure
4. **Update Environment Variables** - Add API key configs to deployment

---

## References

- `src/lib/providers/types.ts` - Provider interfaces and configs
- `src/lib/providers/implementations/gemini-provider.ts` - Fundamentals provider template
- `src/lib/providers/implementations/gemini-price-provider.ts` - Price provider template
- `src/lib/inngest/functions/overnight-scoring.ts` - Complete job pipeline
- `src/lib/services/cache-warmer-service.ts` - Cache warming implementation

---

_Prepared: 2025-12-31_
