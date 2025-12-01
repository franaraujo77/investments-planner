# Architecture

## Executive Summary

**Investments Planner** is a fintech SaaS platform that automates investment portfolio analysis, transforming a 3-hour monthly spreadsheet process into a 5-minute decision workflow.

### Architecture Philosophy

> *"Tell me what to buy based on MY rules, and trust that the math is right."*

This architecture prioritizes:
1. **Financial Precision** - decimal.js + PostgreSQL numeric types for accurate calculations
2. **Auditability** - Event-sourced calculations enable replay and verification
3. **Performance** - Pre-computed overnight, <2s dashboard load via Vercel KV
4. **Trust** - Every number explainable on demand

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Foundation | Hybrid (fresh + starter reference) | Purpose-built fintech architecture |
| Stack | Next.js 15, Drizzle, shadcn/ui | UX spec alignment, type safety |
| Background Jobs | Inngest | Event-driven, Vercel-native |
| Caching | Vercel KV | Serverless, instant dashboard |
| Audit Trail | Event-sourced (4 events) | Perfect replay capability |
| Observability | OpenTelemetry (job-level) | Performance insights without complexity |
| Deployment | Vercel | Zero DevOps, escape hatch preserved |

### ADR Summary

| ADR | Decision |
|-----|----------|
| ADR-001 | Hybrid Approach - fresh build with starter as reference |
| ADR-002 | Event-Sourced Calculations with OpenTelemetry |
| ADR-003 | Inngest for Background Jobs |
| ADR-004 | Vercel Deployment with escape hatch |
| ADR-005 | Provider Abstraction Pattern |

### Epic 0 Foundation (30h time-box)

The first implementation phase establishes:
- Project setup with create-next-app + shadcn/ui
- Custom auth with JWT + refresh tokens
- Drizzle schema with fintech types (numeric)
- Event-sourced calculation pipeline
- OpenTelemetry instrumentation
- Vercel KV caching
- Custom fintech components
- Vitest + Playwright + Storybook

## Project Initialization

**Approach:** Hybrid (Fresh Build + Starter as Reference)
**Reference Repository:** [github.com/nextjs/saas-starter](https://github.com/nextjs/saas-starter) (for patterns only)

### First Principles Decision

After First Principles analysis, we chose a **Hybrid Approach** over direct starter cloning:

| Approach | Effort | Tech Debt | Alignment |
|----------|--------|-----------|-----------|
| Use Starter + Customize | 22 hours | Medium | 70% |
| Custom Build | 18 hours | Low | 95% |
| **Hybrid (chosen)** | **16 hours** | **Low** | **90%** |

**Rationale:** Starter saves ~2 hours net but introduces Stripe baggage and generic patterns that don't fit fintech requirements. Building fresh with starter as reference gives purpose-built architecture.

### First Implementation Story: Project Setup

```bash
# Create fresh Next.js app
npx create-next-app@latest investments-planner --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd investments-planner

# Initialize shadcn/ui
npx shadcn@latest init

# Add essential shadcn components
npx shadcn@latest add button card dialog dropdown-menu form input select table tabs toast tooltip sidebar sheet skeleton badge progress alert

# Install core dependencies
pnpm add drizzle-orm postgres decimal.js zod
pnpm add -D drizzle-kit @types/node vitest @playwright/test

# Install OpenTelemetry for observability
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
pnpm add @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions

# Install Storybook for component documentation
pnpm dlx storybook@latest init

# Install Inngest for background jobs
pnpm add inngest

# Clone starter as reference (separate directory)
git clone https://github.com/nextjs/saas-starter ../saas-starter-reference

# Initialize database
pnpm db:generate
pnpm db:migrate

# Start development server
pnpm dev
```

### Technology Decisions

| Category | Decision | Source | Rationale |
|----------|----------|--------|-----------|
| Frontend Framework | Next.js 15 (App Router) | create-next-app | Latest stable, Server Components |
| Styling | Tailwind CSS v4 | create-next-app | UX spec alignment |
| UI Components | shadcn/ui | Manual add | UX spec requirement |
| Database | PostgreSQL | Manual setup | Financial data, `numeric` type |
| ORM | Drizzle | Manual add | Type-safe, modern |
| Authentication | Custom JWT + refresh tokens | Build (reference starter) | Fintech security needs |
| Validation | Zod schemas | Manual add | Type-safe validation |
| Decimal Precision | decimal.js | Manual add | Financial accuracy |
| Background Jobs | Inngest | Build fresh | Event-driven, Vercel-native, built-in retries |
| Testing | Vitest + Playwright | Manual add | Quality assurance |
| Observability | OpenTelemetry | Manual add | Distributed tracing for calculations |
| Calculation Audit | Event-sourced pattern | Build fresh | Perfect audit trail, replay capability |
| Component Docs | Storybook | Manual add | Custom fintech component reference |

### What We're NOT Including

| Component | Why Excluded |
|-----------|--------------|
| Stripe integration | Monetization deferred per PRD; avoid coupling |
| Generic activity logging | Building calculation audit trail instead |
| Marketing landing page | Build later when needed |
| Pricing page | Monetization deferred |
| RBAC (Owner/Member) | Single-user MVP; add later if needed |

### What We Build Purpose-Built

| Capability | Fintech-Specific Design |
|------------|------------------------|
| Auth system | JWT + refresh tokens, session storage for sensitive ops |
| Database schema | `numeric` types for currency, calculation audit tables |
| Activity logging | Calculation trace (inputs, outputs, criteria versions) |
| Dashboard | Focus Mode layout per UX spec (not generic CRUD) |
| Background jobs | Overnight processing architecture from Day 1 |
| Provider abstraction | Retry, circuit breaker, graceful degradation |
| Scoring engine | decimal.js precision, deterministic calculations |

### Critical Risk Mitigations (Pre-mortem Analysis)

The following risks were identified through pre-mortem analysis and MUST be addressed in architecture:

| Risk | Failure Mode | Mitigation | Priority |
|------|--------------|------------|----------|
| No background jobs | Overnight processing doesn't scale; API routes timeout at 50+ users | Add BullMQ/Redis or Inngest from Day 1; dedicated worker infrastructure | CRITICAL |
| Float precision | Multi-currency rounding errors erode trust; $50K shows as $49.8K | Use decimal.js library; PostgreSQL `numeric` type for all currency fields | CRITICAL |
| API fragility | Gemini/exchange rate API failures cascade; incomplete scores | Provider abstraction layer with retry logic, circuit breaker, cached fallback | CRITICAL |
| Audit gaps | Cannot reproduce calculations; regulatory/user disputes unresolvable | Design calculation audit schema; version criteria snapshots; log all inputs/outputs | CRITICAL |
| Stripe coupling | Payment provider change requires 3+ weeks of refactoring | Isolate Stripe to `lib/payments/` module; abstract behind interface | HIGH |
| JWT security | Token theft in financial app has higher stakes | Add refresh token rotation; consider session storage for sensitive operations | HIGH |

### Architecture Decisions Required Before Implementation

These decisions are **blocking** - must be resolved before first implementation story:

1. **Background Job Framework** - BullMQ vs Inngest vs Trigger.dev
2. **Decimal Precision Strategy** - decimal.js configuration, Drizzle schema patterns
3. **Provider Abstraction Pattern** - Interface design for external APIs
4. **Calculation Audit Schema** - Data model for reproducible calculations

### Risk Matrix: Decision Prioritization

Risks mapped by Probability × Impact to determine decision order:

| Risk | P | I | Score | Priority |
|------|---|---|-------|----------|
| Decimal precision errors | 4 | 5 | **20** | 🔴 CRITICAL |
| Scoring engine too slow | 3 | 5 | **15** | 🔴 CRITICAL |
| Audit trail incomplete | 3 | 5 | **15** | 🔴 CRITICAL |
| Wrong background job choice | 3 | 4 | **12** | 🟠 HIGH |
| Insufficient test coverage | 4 | 3 | **12** | 🟠 HIGH |
| Caching causes stale data | 3 | 4 | **12** | 🟠 HIGH |
| Auth security insufficient | 2 | 5 | **10** | 🟠 HIGH |
| Database schema inflexible | 3 | 3 | **9** | 🟡 MEDIUM |
| Vercel costs explode | 2 | 4 | **8** | 🟡 MEDIUM |
| Provider abstraction too simple | 2 | 4 | **8** | 🟡 MEDIUM |

#### Fintech Triangle of Critical Risks

```
         Precision (R2)
            /\
           /  \
          /    \
         /______\
   Audit (R5)    Performance (R7)
```

These three risks are interconnected and must be addressed together in a unified "Calculation Infrastructure" design.

#### Decision Order by Risk Score

**Epic 0 - Foundation (CRITICAL + HIGH):**
1. Decimal Precision Strategy (Score: 20)
2. Scoring Engine Architecture (Score: 15)
3. Calculation Audit Schema (Score: 15)
4. Background Job Framework (Score: 12)
5. Testing Strategy (Score: 12)
6. Caching Strategy (Score: 12)
7. Auth Security Enhancement (Score: 10)

**Epic 1 (MEDIUM):**
8. Database Schema Patterns (Score: 9)
9. Deployment Architecture (Score: 8)
10. Provider Abstraction Level (Score: 8)

#### Critical Risk Mitigation Patterns

**Decimal Precision (MUST implement):**
```typescript
// decimal.js configuration
import Decimal from 'decimal.js';
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Drizzle schema - ALWAYS use numeric for currency
value: numeric('value', { precision: 19, scale: 4 }).notNull()
// NEVER use real or double precision for money
```

**Calculation Audit - Event-Sourced (MUST implement):**

Store calculation events, not just results. Enables perfect audit trail and replay capability.

**Simplified after Devil's Advocate review** (4 events, not 7):

```typescript
// Event types for calculation pipeline (simplified)
type CalculationEvent =
  | { type: 'CALC_STARTED'; correlationId: string; userId: string; timestamp: Date }
  | { type: 'INPUTS_CAPTURED'; criteriaVersionId: string; criteria: CriteriaConfig;
      prices: PriceSnapshot[]; rates: ExchangeRateSnapshot[]; assetIds: string[] }
  | { type: 'SCORES_COMPUTED'; results: Array<{ assetId: string; score: string; breakdown: CriterionScore[] }> }
  | { type: 'CALC_COMPLETED'; correlationId: string; duration: number; assetCount: number };

// Event store interface
interface CalculationEventStore {
  append(event: CalculationEvent): Promise<void>;
  getByCorrelationId(id: string): Promise<CalculationEvent[]>;
  replay(correlationId: string): Promise<CalculationResult>; // Deterministic replay
}
```

**Why 4 events, not 7:** Devil's Advocate revealed that granular events (per-price-fetch, per-criterion) add complexity without proportional audit value. INPUTS_CAPTURED captures everything needed for replay in one event.

**OpenTelemetry Integration (MUST implement):**

Use OpenTelemetry for distributed tracing across calculation pipeline.

**Simplified after Devil's Advocate review** (job-level spans, not per-operation):

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('investments-planner');

async function runOvernightJob(userId: string) {
  return tracer.startActiveSpan('overnight-job', async (span) => {
    span.setAttribute('user.id', userId);

    try {
      // Use attributes for timing, not nested spans (simpler)
      const t0 = Date.now();
      const rates = await fetchExchangeRates();
      span.setAttribute('fetch_rates_ms', Date.now() - t0);

      const t1 = Date.now();
      const prices = await fetchPrices(userAssets);
      span.setAttribute('fetch_prices_ms', Date.now() - t1);
      span.setAttribute('assets_count', prices.length);

      const t2 = Date.now();
      const scores = await computeScores(prices, rates, criteria);
      span.setAttribute('compute_scores_ms', Date.now() - t2);

      span.setAttribute('total_duration_ms', Date.now() - t0);
      span.setStatus({ code: SpanStatusCode.OK });
      return scores;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**Why job-level spans:** Devil's Advocate revealed that per-operation spans add boilerplate without proportional debugging value. Span attributes capture timing breakdown; add granular spans in production only if debugging requires.

**Benefits of Event-Sourced + OpenTelemetry:**
- **Audit:** Replay any calculation to verify result (event store)
- **Debugging:** Span attributes show WHERE time was spent
- **Observability:** Monitor overnight processing performance
- **Compliance:** Complete record of all calculation inputs/outputs

**Scoring Engine Performance (MUST implement):**
```typescript
interface ScoringJob {
  userId: string;
  assetBatch: string[];  // Batch of 100 assets
  criteriaVersion: string;
  progress: { completed: number; total: number; };
}
// Design for parallelization from Day 1
```

### ADR-001: Project Foundation Approach

**Status:** Accepted (Revised after First Principles Analysis)
**Date:** 2025-11-28

**Context:** Need to select a foundation for the Investments Planner SaaS platform that balances speed-to-market with fintech requirements.

**Initial Decision:** Use Next.js SaaS Starter directly

**Revised Decision:** **Hybrid Approach** - Fresh build with starter as reference

**Why We Revised:**
First Principles analysis revealed that:
- Starter saves only ~2 hours net (12h build vs 10h+ customization)
- Stripe integration is pure baggage (monetization deferred)
- Generic patterns don't fit fintech requirements
- Purpose-built architecture has 90% alignment vs 70%

**Alternatives Considered:**

| Option | Effort | Tech Debt | Alignment | Verdict |
|--------|--------|-----------|-----------|---------|
| Starter + Customize | 22h | Medium | 70% | Rejected - baggage outweighs benefits |
| Custom Build | 18h | Low | 95% | Good but slower |
| **Hybrid (chosen)** | **16h** | **Low** | **90%** | Best balance |
| Supabase Starter | 20h | High | 50% | Rejected - wrong fit |

**Evaluation Criteria (Weighted):**
- UX Spec Alignment (20%): shadcn/ui requirement
- Time to First Feature (15%): Speed to validate core concept
- Fintech Suitability (20%): Precision, audit, security needs
- Background Jobs Fit (15%): Overnight processing requirement
- Scalability Path (10%): 1000+ user growth target
- Learning Curve (10%): Intermediate skill level
- Long-term Flexibility (10%): Avoid vendor lock-in

**Consequences of Hybrid Approach:**
- ✅ Zero Stripe baggage (not included at all)
- ✅ Purpose-built fintech schema from Day 1
- ✅ Calculation audit trail designed in, not bolted on
- ✅ Focus Mode dashboard built directly (not adapted from generic)
- ✅ Background job architecture included from start
- ⚠️ Auth patterns need to be built (use starter as reference)
- ⚠️ Slightly more initial setup (~4 hours more than starter clone)

### ADR-002: Event-Sourced Calculations with OpenTelemetry

**Status:** Accepted
**Date:** 2025-11-28

**Context:** Need to ensure calculation audit trail is complete, reproducible, and observable for fintech compliance and debugging.

**Decision:** Implement **Event-Sourced Calculations** with **OpenTelemetry** for distributed tracing.

**What This Means:**
- Store calculation **events**, not just results
- Every step in the scoring pipeline emits an event
- Events are immutable and append-only
- Any calculation can be replayed from its events
- OpenTelemetry traces span the entire calculation pipeline

**Why Event Sourcing Over Simple Logging:**

| Approach | Audit Trail | Replay | Debug | Compliance |
|----------|-------------|--------|-------|------------|
| Simple logging | Partial | ❌ No | Hard | Weak |
| Result snapshots | Good | ❌ No | Medium | Medium |
| **Event sourcing** | **Perfect** | **✅ Yes** | **Easy** | **Strong** |

**Why OpenTelemetry:**
- Industry standard for distributed tracing
- Vendor-agnostic (export to Jaeger, Honeycomb, Datadog, etc.)
- Built-in correlation across async operations
- Performance metrics for overnight processing optimization
- Context propagation through background job queues

**Event Types:**
```
CALCULATION_STARTED → CRITERIA_LOADED → PRICE_FETCHED →
EXCHANGE_RATE_APPLIED → CRITERION_EVALUATED (×N) →
SCORE_AGGREGATED → CALCULATION_COMPLETED
```

**Consequences:**
- ✅ Perfect audit trail for regulatory/user disputes
- ✅ "Replay" any past calculation with original inputs
- ✅ Debug calculation issues by tracing event sequence
- ✅ Monitor overnight processing performance
- ✅ Vendor-agnostic observability
- ⚠️ More storage required (events + results)
- ⚠️ Slightly more complexity in calculation pipeline

### ADR-003: Background Jobs Framework

**Status:** Accepted
**Date:** 2025-11-28

**Context:** Need reliable background job infrastructure for overnight scoring, with per-market scheduling, retries, and observability.

**Decision:** Use **Inngest** for background job orchestration.

**Alternatives Considered:**

| Option | Verdict |
|--------|---------|
| BullMQ + Redis | Rejected - requires Redis infra management |
| Vercel Cron | Rejected - limited to single schedule, no queue semantics |
| **Inngest** | **Accepted** - serverless, event-driven, Vercel-native |

**Why Inngest:**
- Native Vercel integration (zero infrastructure)
- Event-driven model matches our event-sourced architecture
- Built-in retries with exponential backoff
- Step functions for complex workflows (fetch → score → cache)
- Per-market scheduling via multiple cron triggers
- Built-in observability dashboard
- TypeScript-first with excellent DX

**Implementation Pattern:**
```typescript
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'investments-planner' });

export const overnightScoringJob = inngest.createFunction(
  { id: 'overnight-scoring', name: 'Overnight Scoring' },
  { cron: '0 4 * * *' }, // Per-market: multiple functions with different crons
  async ({ step }) => {
    const rates = await step.run('fetch-rates', fetchExchangeRates);
    const prices = await step.run('fetch-prices', fetchPrices);
    const users = await step.run('get-users', getActiveUsers);

    // Fan-out: score each user
    await step.run('score-users', async () => {
      for (const user of users) {
        await scoreUserPortfolio(user.id, rates, prices);
      }
    });

    await step.run('warm-cache', warmVercelKVCache);
  }
);
```

**Consequences:**
- ✅ Zero infrastructure management
- ✅ Built-in retries and error handling
- ✅ Observability via Inngest dashboard
- ✅ Step functions enable checkpointing
- ⚠️ Vendor dependency on Inngest
- ⚠️ Cost at scale (evaluate if >1000 users)

### ADR-004: Deployment Architecture

**Status:** Accepted
**Date:** 2025-11-28

**Context:** Need deployment platform that supports Next.js, background jobs (Inngest), and PostgreSQL with minimal DevOps overhead.

**Decision:** Deploy to **Vercel** with escape hatch for self-hosting.

**Alternatives Considered:**

| Option | Verdict |
|--------|---------|
| **Vercel** | **Accepted** - native Next.js, Inngest, KV integration |
| Self-hosted (Docker) | Deferred - evaluate if costs exceed threshold |
| AWS/GCP | Rejected - unnecessary complexity for MVP |

**Why Vercel:**
- Zero-config Next.js deployment
- Native Inngest integration
- Vercel KV (Redis) already chosen for caching
- Vercel Postgres available (or use Neon/Supabase)
- Edge functions for API routes
- Preview deployments for PRs
- Built-in analytics and monitoring

**Escape Hatch (Self-Hosting):**
Architecture decisions preserve portability:
- PostgreSQL (standard, not Vercel-specific)
- Inngest can run self-hosted
- Next.js supports Docker deployment
- No proprietary Vercel features required

**Cost Evaluation Trigger:**
- Review if monthly costs exceed $100
- Review if user count exceeds 500
- Review if overnight job duration exceeds Vercel function limits

**Deployment Configuration:**
```
Vercel Project
├── Framework: Next.js
├── Build Command: pnpm build
├── Output Directory: .next
├── Node.js Version: 20.x
├── Environment Variables:
│   ├── DATABASE_URL (PostgreSQL)
│   ├── KV_REST_API_URL (Vercel KV)
│   ├── KV_REST_API_TOKEN
│   ├── INNGEST_EVENT_KEY
│   ├── INNGEST_SIGNING_KEY
│   ├── GEMINI_API_KEY
│   └── EXCHANGE_RATE_API_KEY
└── Integrations:
    ├── Vercel KV
    ├── Vercel Postgres (or Neon)
    └── Inngest
```

**Consequences:**
- ✅ Zero DevOps overhead for MVP
- ✅ Automatic scaling
- ✅ Preview deployments for testing
- ✅ Native integrations with chosen stack
- ⚠️ Vendor dependency (mitigated by escape hatch)
- ⚠️ Function duration limits (mitigated by Inngest step functions)

### ADR-005: Provider Abstraction Pattern

**Status:** Accepted
**Date:** 2025-11-28

**Context:** Need to integrate external APIs (Gemini for prices, exchange rate APIs) with ability to swap providers and handle failures gracefully.

**Decision:** Implement **Provider Abstraction** with interface-based design, fallback chain, and cached degradation.

**Pattern:**

```typescript
// lib/providers/types.ts
interface PriceProvider {
  name: string;
  fetchPrices(symbols: string[]): Promise<PriceResult[]>;
  healthCheck(): Promise<boolean>;
}

interface ExchangeRateProvider {
  name: string;
  fetchRates(base: string, targets: string[]): Promise<ExchangeRateResult>;
  healthCheck(): Promise<boolean>;
}

// lib/providers/price-service.ts
class PriceService {
  constructor(
    private primary: PriceProvider,
    private fallback: PriceProvider | null,
    private cache: CacheService,
    private logger: Logger
  ) {}

  async getPrices(symbols: string[]): Promise<PriceResult[]> {
    // Try primary provider
    try {
      const prices = await this.primary.fetchPrices(symbols);
      await this.cache.set('prices', prices, { ttl: 86400 }); // 24h cache
      return prices;
    } catch (error) {
      this.logger.warn(`Primary provider ${this.primary.name} failed`, error);
    }

    // Try fallback provider
    if (this.fallback) {
      try {
        const prices = await this.fallback.fetchPrices(symbols);
        await this.cache.set('prices', prices, { ttl: 86400 });
        return prices;
      } catch (error) {
        this.logger.warn(`Fallback provider ${this.fallback.name} failed`, error);
      }
    }

    // Last resort: return cached data with stale flag
    const cached = await this.cache.get('prices');
    if (cached) {
      this.logger.warn('Using stale cached prices');
      return cached.map(p => ({ ...p, stale: true }));
    }

    throw new Error('All price providers failed and no cache available');
  }
}
```

**Provider Implementations:**

| Provider Type | Primary | Fallback | Cache TTL |
|---------------|---------|----------|-----------|
| Asset Prices | Gemini API | Yahoo Finance | 24 hours |
| Exchange Rates | ExchangeRate-API | Open Exchange Rates | 24 hours |
| Fundamentals | Gemini API | Alpha Vantage | 7 days |

**File Structure:**
```
lib/providers/
├── types.ts                 # Provider interfaces
├── price-service.ts         # Price aggregation with fallback
├── exchange-rate-service.ts # Exchange rate with fallback
├── implementations/
│   ├── gemini-provider.ts
│   ├── yahoo-provider.ts
│   ├── exchangerate-api.ts
│   └── open-exchange.ts
└── index.ts                 # Factory functions
```

**Consequences:**
- ✅ Swap providers without changing business logic
- ✅ Graceful degradation on API failures
- ✅ Stale data flag enables UI warning (DataFreshnessBadge)
- ✅ Easy to add new providers
- ⚠️ More abstraction layers to maintain
- ⚠️ Need to implement multiple providers

### Six Thinking Hats Synthesis

Analysis from six perspectives informed these key decisions:

| Hat | Key Insight | Action Taken |
|-----|-------------|--------------|
| 🎩 White (Facts) | 67 FRs, 3 critical risks, intermediate skill level | Data-driven prioritization |
| ❤️ Red (Emotions) | Auth from scratch feels risky | Dedicated 2h for starter auth pattern review |
| ⚫ Black (Caution) | Estimation optimism; auth vulnerabilities | Added 50% buffer; security-first auth design |
| 💛 Yellow (Benefits) | Clean architecture enables fast iteration | Committed to purpose-built approach |
| 💚 Green (Creative) | Event sourcing for calculations; Storybook for components | Adopted both enhancements |
| 🔵 Blue (Process) | Need structured Epic 0 checklist | Created detailed foundation checklist |

### Epic 0 Foundation Checklist

**Time-box: 30 hours maximum** (Devil's Advocate constraint - if exceeded, reassess approach)

```
[ ] Project setup (create-next-app + shadcn) ..................... ~2h
[ ] Review starter auth patterns (dedicated time) ................ ~2h
[ ] Implement auth with JWT + refresh tokens ..................... ~4h
[ ] Setup Drizzle with fintech schema (numeric types) ............ ~3h
[ ] Configure decimal.js for financial precision ................. ~1h
[ ] Implement event-sourced calculation pipeline (4 events) ...... ~4h
[ ] Setup OpenTelemetry instrumentation (job-level spans) ........ ~2h
[ ] Setup Vitest + Playwright testing ............................ ~2h
[ ] Setup Storybook for custom components ........................ ~2h
[ ] Setup Vercel KV for recommendations cache .................... ~1h
[ ] Document decisions in ADRs ................................... ~1h
[ ] Create custom fintech components: ............................ ~6h
    [ ] RecommendationCard
    [ ] ScoreBreakdown
    [ ] AllocationGauge
    [ ] CurrencyDisplay
    [ ] DataFreshnessBadge
                                                          Total: ~30h
```

**If exceeding 30h:** Stop and evaluate - are we over-engineering? Should we simplify further? Should we reconsider starter template?

### SWOT Analysis: Starter Template

#### Strengths (Leverage)
| Strength | Project Impact |
|----------|----------------|
| shadcn/ui pre-configured | Zero gap with UX spec; custom components extend established patterns |
| Drizzle ORM + PostgreSQL | Type-safe queries; `numeric` type available for financial precision |
| Auth system complete | FR1-FR5 covered; focus shifts to business logic |
| Dashboard scaffolding | CRUD patterns accelerate FR9-FR17 (portfolio management) |
| Vercel-optimized | Edge functions, serverless scale without DevOps overhead |
| App Router architecture | Server Components reduce bundle; faster dashboard loads (<2s target) |

#### Weaknesses (Address)
| Weakness | Risk | Mitigation |
|----------|------|------------|
| No background jobs | 🔴 CRITICAL | Add BullMQ/Inngest in Epic 1 |
| No decimal precision | 🔴 CRITICAL | Add decimal.js; Drizzle `numeric` type |
| Stripe coupling | 🟡 MEDIUM | Isolate to `lib/payments/`; abstract interface |
| No API provider abstraction | 🟡 MEDIUM | Design provider pattern before Gemini integration |
| No testing setup | 🟡 MEDIUM | Add Vitest + Playwright in setup story |

#### Opportunities (Exploit)
| Opportunity | Strategy |
|-------------|----------|
| Large Next.js ecosystem | Leverage compatible libraries for extensions |
| Vercel managed services | Consider Vercel Cron, KV for simplified infra |
| tRPC addition | Add later if scoring API type-safety becomes pain point |
| AI-assisted development | Well-documented patterns enable effective AI agent collaboration |

#### Threats (Mitigate)
| Threat | Probability | Contingency |
|--------|-------------|-------------|
| Next.js breaking changes | Medium | Pin versions; test upgrades in staging |
| Vercel pricing at scale | Medium | Architecture allows Docker self-hosting |
| External API changes (Gemini) | Medium | Provider abstraction with multi-provider fallback |
| Dependency vulnerabilities | Medium | Dependabot alerts; regular security audits |

#### Defensive Actions (Implement Immediately)
1. **Fork starter** - Don't track upstream after initial clone
2. **Add testing** - Vitest + Playwright in project setup
3. **Pin dependencies** - Lock versions with pnpm lockfile
4. **Document customizations** - All changes recorded in this architecture doc

## Decision Summary

| Category | Decision | Version | Affects FRs | Rationale |
| -------- | -------- | ------- | ----------- | --------- |
| Foundation | Hybrid Approach | 1.0 | All | Purpose-built fintech architecture |
| Frontend | Next.js 15 (App Router) | 15.x | All UI | UX spec alignment, Server Components |
| Styling | Tailwind CSS + shadcn/ui | 4.x | All UI | UX spec requirement |
| Database | PostgreSQL + Drizzle | - | All data | Type-safe, numeric types for currency |
| Precision | decimal.js | - | FR40-FR55 | Financial accuracy requirement |
| Audit | Event-sourced (4 events) | 1.0 | FR60-FR64 | Replay capability, compliance |
| Observability | OpenTelemetry (job-level) | - | FR56-FR59 | Performance insights |
| Cache | Vercel KV | - | FR56-FR59 | <2s dashboard requirement |
| Background Jobs | Inngest | - | FR56-FR59 | Event-driven, step functions |
| Deployment | Vercel | - | All | Zero DevOps, escape hatch |
| Providers | Abstraction pattern | 1.0 | FR31-FR39 | Swap providers, graceful degradation |
| Scheduling | Per-market (not timezone) | 1.0 | FR56-FR59 | Simpler than user timezone |
| Auth | JWT + refresh tokens | 1.0 | FR1-FR8 | Fintech security |
| Testing | Vitest + Playwright | - | All | Quality assurance |
| Docs | Storybook | - | UI components | Component reference |

## User-Centered Architecture

### Target User: "Strategic Sarah"

**Profile:** Advanced investor (35-50 yrs), 10+ years experience, $50K-$500K portfolio across multiple markets, monthly $1K-$5K contributions. Currently spends 2-3 hours monthly on spreadsheet analysis.

**Guiding Principle:**
> *"I don't want to analyze investments. I want to BE TOLD what to buy based on MY rules, and trust that the math is right."*

### Empathy-Driven Architecture Priorities

| Priority | User Insight | Architecture Response |
|----------|-------------|----------------------|
| **1. Instant dashboard** | Anxious when opening app after volatility | <2s load via pre-computed overnight processing |
| **2. Calculation transparency** | "Can I trust these numbers?" (always) | Event-sourced audit trail, score breakdown on click |
| **3. Simple recommendations** | "It tells me exactly what to buy" | Focus Mode layout, RecommendationCard component |
| **4. Multi-currency precision** | Multi-currency math is error-prone pain | decimal.js, PostgreSQL numeric types |
| **5. Data freshness visibility** | "I don't know if data is fresh" | DataFreshnessBadge on all displayed data |
| **6. Opportunity alerts** | "I might miss a better asset" fear | FR65 alert when better-scored assets exist |
| **7. Criteria preview** | Configuration anxiety | Preview impact before saving criteria changes |

### User Pain → Feature Mapping

| Pain Point | Severity | Feature Solution |
|------------|----------|------------------|
| Spreadsheet takes 3 hours | 🔴 Critical | Automated recommendations (core product) |
| Multi-currency errors | 🔴 Critical | decimal.js + event-sourced audit |
| Missing opportunities | 🟠 High | Opportunity alerts (FR65) |
| Stale data concerns | 🟠 High | DataFreshnessBadge component |
| Can't explain decisions | 🟠 High | Score breakdown + CSV export |
| Configuration anxiety | 🟡 Medium | Criteria preview with impact simulation |

### Critical Path (5 Minutes)

```
Login → Dashboard → Review Recommendations → [Score Breakdown?] → Confirm → Done
 30s      instant         2 min                  optional           1 min
```

Architecture must optimize this path. Everything else is secondary.

### Design Principles (from Empathy Analysis)

- ✅ **Automation over analysis tools** - Tell them what to buy, don't make them figure it out
- ✅ **Transparency over black box** - Every number explainable on demand
- ✅ **User rules over platform opinions** - Configuration-driven, no overrides
- ✅ **Trust through verifiability** - Audit trail enables verification

## Service Blueprint

### Primary Flows

**Flow 1: Monthly Investment Review (5 minutes)**
```
Login → Dashboard → Review Recs → [Score Breakdown] → Confirm → Done
  │         │           │              │                │
  │         │           │              │                └─► PostgreSQL (investments)
  │         │           │              └─► Event Store (audit replay)
  │         │           └─► Redis Cache (pre-computed)
  │         └─► Redis Cache (<2s load)
  └─► JWT + Refresh Token
```

**Flow 2: Overnight Processing (3+ hours)**
```
2:00 AM                    3:00 AM                   5:30 AM
   │                          │                         │
   ▼                          ▼                         ▼
CRON Trigger ──► Fetch Rates ──► Fetch Prices ──► Score Assets ──► Generate Recs ──► Warm Cache
   │                │              │                 │                  │              │
   ▼                ▼              ▼                 ▼                  ▼              ▼
Job Queue      Exchange      Gemini API      Event Store +      PostgreSQL      Redis
(BullMQ)       Rate API      (abstracted)    decimal.js         (per-user)      (instant)
```

**Flow 3: Criteria Configuration**
```
Open Criteria → Edit Block → Preview Impact → Save (New Version)
      │             │              │                │
      ▼             ▼              ▼                ▼
  Load versions   Client-side   Quick-calc     Immutable
  (PostgreSQL)    validation    (sample data)  versioning
```

### Component Inventory

#### Frontstage (UI Components)

| Component | Flow | Responsibility |
|-----------|------|----------------|
| Dashboard | Review | Focus Mode layout, metrics, instant load |
| RecommendationCard | Review | Asset, score, amount, expand to breakdown |
| ScoreBreakdown | Review | Criteria contributions, event audit link |
| ConfirmationModal | Review | Amount inputs, validation, submit |
| CriteriaBlock | Config | Notion-style inline editing |
| PreviewModal | Config | Simulated score impact |
| DataFreshnessBadge | All | Timestamp + source on all data |
| AllocationGauge | Review | Current vs target visual |
| CurrencyDisplay | All | Multi-currency with conversion rate |

#### Backstage (Services)

| Service | Responsibility | Dependencies |
|---------|----------------|--------------|
| AuthService | JWT issue/verify, refresh tokens | PostgreSQL, Session store |
| DashboardService | Load pre-computed recommendations | Redis, PostgreSQL |
| ScoreService | Query event store, replay calculations | Event store, decimal.js |
| InvestmentService | Record investments, emit events | PostgreSQL, Event store |
| CriteriaService | Version management, preview calc | PostgreSQL |
| AllocationService | Calculate percentages | decimal.js |

#### Support Processes

| Process | Technology | Criticality |
|---------|------------|-------------|
| Overnight Job Scheduler | Inngest (step functions) | 🔴 Critical |
| Exchange Rate Fetcher | Provider abstraction | 🔴 Critical |
| Price Fetcher | Gemini API abstracted | 🔴 Critical |
| Scoring Engine | decimal.js + OTel (job-level) | 🔴 Critical |
| Recommendation Generator | Allocation logic | 🔴 Critical |
| Cache Warmer | Vercel KV | 🟠 High |
| Event Store Writer | PostgreSQL (4 event types) | 🔴 Critical |
| OTel Exporter | OTLP HTTP (non-blocking) | 🟡 Medium |

### Hidden Complexity (Revealed by Blueprint)

| Layer | Hidden Complexity | Architecture Response |
|-------|-------------------|----------------------|
| Frontstage | Score breakdown needs event replay | Event store query API with correlation ID |
| Frontstage | Currency display needs rate + timestamp | CurrencyDisplay with metadata prop |
| Backstage | Dashboard instant but data computed | Vercel KV cache + overnight pre-computation |
| Backstage | Criteria preview without full overnight | Quick-calc mode with sample assets |
| Support | Different market open times | Per-MARKET scheduling (not per-user timezone) |
| Support | External API failures | Provider abstraction + cached fallback + warning badge |
| Support | Event store grows infinitely | Retention policy (keep 2 years, archive older) |

### Failure Points & Mitigations

| Failure Point | Impact | Mitigation |
|---------------|--------|------------|
| Redis cache miss | Slow dashboard | Pre-warm on job completion; fallback to DB |
| Exchange rate API down | Wrong conversions | Use last known rate + DataFreshnessBadge warning |
| Gemini API rate limited | Incomplete scores | Queue with backoff; partial results acceptable |
| Overnight job timeout | No recommendations | Batch processing with checkpoints; resume capability |
| Event store write fails | Lost audit trail | Retry queue; alert on persistent failure |
| OTel exporter down | No traces | Fire-and-forget; non-blocking; degraded observability OK |

### Architecture Decisions (from Blueprint + Devil's Advocate)

| Decision | Rationale |
|----------|-----------|
| Vercel KV for recommendations cache | Dashboard <2s; serverless simplifies ops (Devil's Advocate) |
| Event store in PostgreSQL (not separate DB) | Transactional consistency with main data |
| Per-MARKET scheduling (not per-user) | Simpler than timezone handling; user selects markets (Devil's Advocate) |
| Criteria versioning (immutable) | Audit trail requires point-in-time reconstruction |
| Provider abstraction layer | Swap Gemini/exchange APIs without code changes |
| Quick-calc mode for preview | Can't wait for full overnight to preview criteria |
| Non-blocking OTel export | Observability shouldn't impact user experience |
| 4 event types (not 7) | Simplified; INPUTS_CAPTURED bundles related data (Devil's Advocate) |
| Job-level OTel spans | Attributes capture timing; granular spans add boilerplate (Devil's Advocate) |

### Devil's Advocate Refinements

Stress-testing revealed opportunities to simplify without sacrificing value:

| Original Decision | Challenge | Outcome |
|-------------------|-----------|---------|
| Hybrid Approach | "Starter is battle-tested" | Keep, but add 30h time-box constraint |
| 7 event types | "Overkill for portfolio app" | **Simplified to 4 events** |
| Full OTel instrumentation | "Not a microservices platform" | **Simplified to job-level spans** |
| decimal.js everywhere | "JavaScript handles 15 digits" | **No change** (0.1+0.2 problem is real) |
| Redis required | "PostgreSQL can do <100ms" | **Use Vercel KV** (serverless, simpler ops) |
| Per-user timezone scheduling | "90% same timezone" | **Per-market scheduling** (user selects markets) |

**Per-Market Scheduling Pattern:**
```typescript
// User configures markets, not timezone
const userMarkets = ['NYSE', 'B3']; // From user settings
const earliestOpen = Math.min(...userMarkets.map(getMarketOpenUTC));
const jobTime = earliestOpen - 2 * HOURS; // Run 2h before earliest market
```

## Project Context Understanding

**Project:** Investments Planner
**Type:** SaaS B2B Platform (Fintech - Investment Portfolio Management)
**Complexity:** High
**Field Type:** Greenfield

### Functional Requirements Summary

| FR Category | Count | Key Capabilities |
|-------------|-------|------------------|
| User Account & Access | 8 | Authentication, profile management, data export/delete |
| Portfolio Management | 9 | Holdings CRUD, allocation tracking, investment recording |
| Asset Class Configuration | 6 | Classes/subclasses, allocation ranges, asset limits |
| Scoring Criteria Configuration | 7 | User-defined scoring rules, criteria library |
| Asset Data & Scoring | 9 | Data fetching (Gemini API), score calculation, refresh |
| Multi-Currency Support | 5 | Base currency, exchange rates, conversion |
| Recommendations & Allocation | 11 | Monthly recommendations engine, confirmation flow |
| Overnight Pre-Computation | 4 | Batch processing pipeline |
| Data Transparency & Trust | 5 | Audit trail, calculation breakdown, disclaimers |
| Alerts & Notifications | 3 | Opportunity alerts, allocation drift alerts |

**Total:** 67 Functional Requirements

### Non-Functional Requirements Summary

| Category | Key Targets |
|----------|-------------|
| Performance | Dashboard <2s, overnight processing before 6 AM, API <500ms |
| Security | AES-256 encryption, JWT auth, tenant isolation, TLS 1.3 |
| Scalability | 1,000+ concurrent users, 100K+ assets, horizontal scaling |
| Reliability | 99.5% uptime, daily backups, <4h recovery |
| Integration | Provider abstraction, retry logic, circuit breaker, graceful degradation |
| Auditability | Calculation logging, decision history, data source tracking |

### Architecture Drivers

1. **Pre-Computed Overnight Processing** - Central to value proposition; recommendations must be instant on login
2. **Multi-Currency Native** - International portfolios with consistent exchange rate handling
3. **Configuration Over Hardcoding** - User-defined scoring criteria, no manual overrides
4. **Financial Data Accuracy** - Deterministic calculations, audit trail, transparent breakdowns
5. **Multi-Tenant Isolation** - Strict user data separation in SaaS model

### UX Architecture Implications

- **Design System:** shadcn/ui (Radix + Tailwind)
- **Layout Pattern:** Command Center + Focus Mode hybrid
- **Platform:** Desktop-first, mobile-friendly
- **State Management:** React Query (server state) + Zustand (client state)
- **Custom Components:** RecommendationCard, ScoreBreakdown, AllocationGauge, CriteriaBlock, CurrencyDisplay, DataFreshnessBadge, MetricCard

## Project Structure

```
investments-planner/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth routes (login, register, reset)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (dashboard)/              # Protected dashboard routes
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   ├── page.tsx              # Focus Mode recommendations
│   │   │   ├── portfolio/
│   │   │   │   ├── page.tsx          # Portfolio overview
│   │   │   │   └── [assetId]/page.tsx
│   │   │   ├── criteria/
│   │   │   │   └── page.tsx          # Criteria configuration
│   │   │   ├── history/
│   │   │   │   └── page.tsx          # Investment history
│   │   │   └── settings/
│   │   │       └── page.tsx          # User settings
│   │   ├── api/                      # API routes
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── dashboard/route.ts
│   │   │   ├── recommendations/route.ts
│   │   │   ├── scores/[assetId]/breakdown/route.ts
│   │   │   ├── investments/route.ts
│   │   │   ├── criteria/
│   │   │   │   ├── route.ts
│   │   │   │   └── preview/route.ts
│   │   │   ├── portfolio/route.ts
│   │   │   └── inngest/route.ts      # Inngest webhook handler
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   │
│   ├── components/                   # UI Components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── fintech/                  # Custom fintech components
│   │   │   ├── recommendation-card.tsx
│   │   │   ├── score-breakdown.tsx
│   │   │   ├── allocation-gauge.tsx
│   │   │   ├── currency-display.tsx
│   │   │   ├── data-freshness-badge.tsx
│   │   │   └── criteria-block.tsx
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── sidebar.tsx
│   │   │   ├── metrics-row.tsx
│   │   │   └── focus-mode.tsx
│   │   └── forms/                    # Form components
│   │       ├── login-form.tsx
│   │       ├── confirmation-modal.tsx
│   │       └── criteria-editor.tsx
│   │
│   ├── lib/                          # Core libraries
│   │   ├── db/                       # Database (Drizzle)
│   │   │   ├── schema.ts             # Drizzle schema (fintech types)
│   │   │   ├── migrations/           # SQL migrations
│   │   │   └── index.ts              # DB client
│   │   ├── auth/                     # Authentication
│   │   │   ├── jwt.ts                # JWT + refresh tokens
│   │   │   ├── session.ts            # Session management
│   │   │   └── middleware.ts         # Auth middleware
│   │   ├── calculations/             # Scoring engine
│   │   │   ├── scoring-engine.ts     # Core scoring logic
│   │   │   ├── allocation.ts         # Allocation calculations
│   │   │   ├── decimal-utils.ts      # decimal.js utilities
│   │   │   └── quick-calc.ts         # Preview mode calculations
│   │   ├── providers/                # External API abstraction
│   │   │   ├── types.ts              # Provider interfaces
│   │   │   ├── price-service.ts      # Price aggregation
│   │   │   ├── exchange-rate-service.ts
│   │   │   └── implementations/
│   │   │       ├── gemini-provider.ts
│   │   │       └── exchangerate-api.ts
│   │   ├── events/                   # Event sourcing
│   │   │   ├── types.ts              # Event types (4 events)
│   │   │   ├── event-store.ts        # Event storage
│   │   │   └── replay.ts             # Calculation replay
│   │   ├── cache/                    # Vercel KV caching
│   │   │   └── index.ts              # Cache utilities
│   │   ├── inngest/                  # Background jobs
│   │   │   ├── client.ts             # Inngest client
│   │   │   └── functions/
│   │   │       ├── overnight-scoring.ts
│   │   │       └── cache-warmer.ts
│   │   └── telemetry/                # OpenTelemetry
│   │       └── index.ts              # OTel setup (job-level spans)
│   │
│   ├── hooks/                        # React hooks
│   │   ├── use-recommendations.ts
│   │   ├── use-portfolio.ts
│   │   └── use-criteria.ts
│   │
│   └── types/                        # TypeScript types
│       ├── portfolio.ts
│       ├── criteria.ts
│       ├── recommendations.ts
│       └── api.ts
│
├── tests/                            # Test files
│   ├── unit/                         # Vitest unit tests
│   │   ├── calculations/
│   │   │   ├── scoring-engine.test.ts
│   │   │   └── decimal-utils.test.ts
│   │   └── providers/
│   │       └── price-service.test.ts
│   └── e2e/                          # Playwright E2E tests
│       ├── auth.spec.ts
│       ├── dashboard.spec.ts
│       └── investment-flow.spec.ts
│
├── stories/                          # Storybook stories
│   ├── fintech/
│   │   ├── RecommendationCard.stories.tsx
│   │   ├── ScoreBreakdown.stories.tsx
│   │   └── AllocationGauge.stories.tsx
│   └── dashboard/
│       └── FocusMode.stories.tsx
│
├── drizzle/                          # Drizzle config
│   └── drizzle.config.ts
│
├── public/                           # Static assets
│
├── .env.example                      # Environment variables template
├── .env.local                        # Local environment (git ignored)
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
├── vitest.config.ts                  # Vitest configuration
├── playwright.config.ts              # Playwright configuration
└── package.json
```

## FR Category to Architecture Mapping

| FR Category | FRs | Primary Components | Key Files |
|-------------|-----|-------------------|-----------|
| User Account & Access | FR1-FR8 | AuthService, LoginForm | `lib/auth/`, `app/(auth)/` |
| Portfolio Management | FR9-FR17 | PortfolioService, Dashboard | `app/(dashboard)/portfolio/`, `lib/db/schema.ts` |
| Asset Class Configuration | FR18-FR23 | CriteriaService, AllocationService | `app/(dashboard)/criteria/`, `lib/calculations/allocation.ts` |
| Scoring Criteria Config | FR24-FR30 | CriteriaBlock, CriteriaEditor | `components/fintech/criteria-block.tsx`, `lib/db/schema.ts` |
| Asset Data & Scoring | FR31-FR39 | PriceService, ScoringEngine | `lib/providers/`, `lib/calculations/scoring-engine.ts` |
| Multi-Currency Support | FR40-FR44 | ExchangeRateService, CurrencyDisplay | `lib/providers/exchange-rate-service.ts`, `components/fintech/currency-display.tsx` |
| Recommendations & Allocation | FR45-FR55 | RecommendationCard, ConfirmationModal | `app/(dashboard)/page.tsx`, `components/fintech/recommendation-card.tsx` |
| Overnight Pre-Computation | FR56-FR59 | Inngest functions, Cache | `lib/inngest/functions/overnight-scoring.ts`, `lib/cache/` |
| Data Transparency & Trust | FR60-FR64 | EventStore, ScoreBreakdown, DataFreshnessBadge | `lib/events/`, `components/fintech/score-breakdown.tsx` |
| Alerts & Notifications | FR65-FR67 | AlertService (future) | TBD (Growth feature) |

## Technology Stack Details

### Core Technologies

| Technology | Version | Purpose | Configuration |
|------------|---------|---------|---------------|
| **Next.js** | 15.x | Full-stack React framework | App Router, Server Components, API Routes |
| **React** | 19.x | UI library | Provided by Next.js |
| **TypeScript** | 5.x | Type safety | Strict mode enabled |
| **Tailwind CSS** | 4.x | Utility-first styling | Default config + shadcn/ui theme |
| **shadcn/ui** | latest | Component library | Slate Professional theme |
| **Drizzle ORM** | 0.36.x | Database ORM | PostgreSQL driver, type-safe queries |
| **PostgreSQL** | 16.x | Primary database | Vercel Postgres or Neon |
| **decimal.js** | 10.x | Financial precision | precision: 20, ROUND_HALF_UP |
| **Zod** | 3.x | Schema validation | API input/output validation |
| **Inngest** | 3.x | Background jobs | Event-driven, step functions |
| **Vercel KV** | latest | Redis cache | Recommendations cache, session store |

**TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**decimal.js Global Configuration:**
```typescript
// lib/calculations/decimal-config.ts
import Decimal from 'decimal.js';

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21
});

export { Decimal };
```

### Integration Points

| Integration | Provider | Fallback | Rate Limit | Cache TTL |
|-------------|----------|----------|------------|-----------|
| **Asset Prices** | Gemini API | Yahoo Finance | 100/min | 24 hours |
| **Exchange Rates** | ExchangeRate-API | Open Exchange Rates | 1500/month | 24 hours |
| **Fundamentals** | Gemini API | Alpha Vantage | 100/min | 7 days |

**Provider Configuration:**
```typescript
// lib/providers/config.ts
export const providerConfig = {
  prices: {
    primary: 'gemini',
    fallback: 'yahoo',
    timeout: 10000,
    retries: 3,
    backoff: 'exponential'
  },
  exchangeRates: {
    primary: 'exchangerate-api',
    fallback: 'open-exchange',
    timeout: 5000,
    retries: 2
  }
};
```

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### API Route Pattern

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth/middleware';
import { ApiError, handleApiError } from '@/lib/errors';

const RequestSchema = z.object({
  // Define request body schema
});

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuth(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = RequestSchema.parse(body);

    // Business logic here
    const result = await someService.doSomething(validated, session.userId);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Service Layer Pattern

```typescript
// lib/services/portfolio-service.ts
import { db } from '@/lib/db';
import { portfolios, assets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Decimal } from '@/lib/calculations/decimal-config';

export class PortfolioService {
  async getPortfolio(userId: string, portfolioId: string) {
    const portfolio = await db.query.portfolios.findFirst({
      where: and(
        eq(portfolios.id, portfolioId),
        eq(portfolios.userId, userId) // Always scope by userId
      ),
      with: {
        assets: true
      }
    });

    if (!portfolio) {
      throw new NotFoundError('Portfolio not found');
    }

    return portfolio;
  }
}

export const portfolioService = new PortfolioService();
```

### React Query Pattern

```typescript
// hooks/use-portfolio.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function usePortfolio(portfolioId: string) {
  return useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => fetch(`/api/portfolio/${portfolioId}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePortfolioInput) =>
      fetch(`/api/portfolio/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }).then(r => r.json()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', variables.id] });
    }
  });
}
```

### Server Component Pattern

```typescript
// app/(dashboard)/portfolio/page.tsx
import { verifySession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { portfolioService } from '@/lib/services/portfolio-service';
import { PortfolioView } from '@/components/dashboard/portfolio-view';

export default async function PortfolioPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const portfolios = await portfolioService.getUserPortfolios(session.userId);

  return <PortfolioView portfolios={portfolios} />;
}
```

### Decimal Calculation Pattern

```typescript
// lib/calculations/allocation.ts
import { Decimal } from '@/lib/calculations/decimal-config';

export function calculateAllocationPercentage(
  assetValue: string,
  totalValue: string
): string {
  const asset = new Decimal(assetValue);
  const total = new Decimal(totalValue);

  if (total.isZero()) return '0';

  return asset.dividedBy(total).times(100).toFixed(4);
}

// NEVER use JavaScript arithmetic for money
// BAD:  const percentage = (assetValue / totalValue) * 100;
// GOOD: const percentage = new Decimal(assetValue).dividedBy(totalValue).times(100);
```

## Consistency Rules

### Naming Conventions

| Category | Convention | Example |
|----------|------------|---------|
| **Files - Components** | PascalCase | `RecommendationCard.tsx` |
| **Files - Utilities** | kebab-case | `decimal-utils.ts` |
| **Files - API Routes** | kebab-case folders | `app/api/portfolio/route.ts` |
| **Files - Tests** | `*.test.ts` or `*.spec.ts` | `scoring-engine.test.ts` |
| **Database Tables** | snake_case plural | `portfolios`, `asset_classes` |
| **Database Columns** | snake_case | `created_at`, `user_id` |
| **TypeScript Types** | PascalCase | `Portfolio`, `AssetClass` |
| **TypeScript Interfaces** | PascalCase with `I` prefix (optional) | `Portfolio` or `IPortfolio` |
| **Functions** | camelCase | `calculateScore`, `fetchPrices` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| **Environment Variables** | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `GEMINI_API_KEY` |
| **React Hooks** | camelCase with `use` prefix | `usePortfolio`, `useRecommendations` |
| **Event Types** | SCREAMING_SNAKE_CASE | `CALC_STARTED`, `INPUTS_CAPTURED` |
| **API Endpoints** | kebab-case | `/api/asset-classes`, `/api/exchange-rates` |

**Naming Examples:**
```typescript
// Database schema (snake_case)
export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  baseCurrency: varchar('base_currency', { length: 3 }),
  createdAt: timestamp('created_at').defaultNow()
});

// TypeScript types (PascalCase)
export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;

// Functions (camelCase)
export function calculateAllocationPercentage() {}
export function fetchExchangeRates() {}
```

### Code Organization

**Import Order (enforced by ESLint):**
```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react';
import { NextRequest } from 'next/server';

// 2. External packages
import { z } from 'zod';
import Decimal from 'decimal.js';

// 3. Internal aliases (@/)
import { db } from '@/lib/db';
import { portfolioService } from '@/lib/services/portfolio-service';

// 4. Relative imports
import { validateInput } from './utils';

// 5. Type imports (last)
import type { Portfolio, Asset } from '@/types';
```

**Module Structure:**
```
lib/
├── services/           # Business logic (classes)
│   ├── portfolio-service.ts
│   └── scoring-service.ts
├── calculations/       # Pure functions (no side effects)
│   ├── scoring-engine.ts
│   └── allocation.ts
├── providers/          # External API integrations
│   ├── types.ts
│   └── implementations/
└── db/                 # Database layer
    ├── schema.ts
    └── queries/
```

### Error Handling

**Custom Error Classes:**
```typescript
// lib/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ProviderError extends AppError {
  constructor(provider: string, message: string) {
    super(`${provider}: ${message}`, 'PROVIDER_ERROR', 502);
  }
}
```

**API Error Handler:**
```typescript
// lib/errors/api-handler.ts
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: error.flatten() },
      { status: 400 }
    );
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
```

**Error Handling Rules:**
1. Always use custom error classes for business errors
2. Never expose internal error details to clients
3. Log all unexpected errors with context
4. Return consistent error response format: `{ error, code, details? }`

### Logging Strategy

**Logging Levels:**
| Level | Use Case | Example |
|-------|----------|---------|
| `error` | Unexpected failures, exceptions | Provider failures, database errors |
| `warn` | Recoverable issues, degraded state | Using cached data, retry attempts |
| `info` | Business events, milestones | Job started, calculation completed |
| `debug` | Development details | Request/response payloads (dev only) |

**Structured Logging Pattern:**
```typescript
// lib/logger.ts
export const logger = {
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...context, timestamp: new Date().toISOString() }));
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
  },
  info: (message: string, context?: Record<string, unknown>) => {
    console.info(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() }));
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({ level: 'debug', message, ...context, timestamp: new Date().toISOString() }));
    }
  }
};
```

**Logging Rules:**
1. Always include `userId` for user-scoped operations
2. Never log sensitive data (passwords, tokens, full portfolio values)
3. Include `correlationId` for overnight processing jobs
4. Use structured JSON format for production logs

## Data Architecture

### Core Entities

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │───1:N─│   portfolios    │───1:N─│     assets      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ email           │       │ user_id (FK)    │       │ portfolio_id(FK)│
│ password_hash   │       │ name            │       │ symbol          │
│ name            │       │ base_currency   │       │ quantity        │
│ base_currency   │       │ created_at      │       │ purchase_price  │
│ created_at      │       └─────────────────┘       │ currency        │
└─────────────────┘                                 │ is_ignored      │
                                                    └─────────────────┘
```

### Drizzle Schema (Key Tables)

```typescript
// lib/db/schema.ts
import { pgTable, uuid, varchar, numeric, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  quantity: numeric('quantity', { precision: 19, scale: 8 }).notNull(),
  purchasePrice: numeric('purchase_price', { precision: 19, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  isIgnored: boolean('is_ignored').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const criteriaVersions = pgTable('criteria_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  assetType: varchar('asset_type', { length: 50 }).notNull(),
  market: varchar('market', { length: 50 }).notNull(),
  criteria: jsonb('criteria').notNull(), // Array of CriteriaRule
  version: integer('version').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const calculationEvents = pgTable('calculation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  correlationId: uuid('correlation_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

### Data Type Rules

| Data Type | PostgreSQL Type | TypeScript Type | Usage |
|-----------|-----------------|-----------------|-------|
| Currency amounts | `numeric(19,4)` | `string` (Decimal) | All money values |
| Quantities | `numeric(19,8)` | `string` (Decimal) | Asset quantities |
| Percentages | `numeric(7,4)` | `string` (Decimal) | Allocation %, scores |
| IDs | `uuid` | `string` | Primary/foreign keys |
| Timestamps | `timestamp` | `Date` | Created/updated times |
| JSON data | `jsonb` | Typed interfaces | Criteria, events |

## API Contracts

### Response Format

**Success Response:**
```typescript
{
  data: T,              // Response payload
  meta?: {              // Optional pagination/metadata
    page: number,
    pageSize: number,
    total: number
  }
}
```

**Error Response:**
```typescript
{
  error: string,        // Human-readable message
  code: string,         // Machine-readable code
  details?: object      // Validation details (optional)
}
```

### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account | No |
| POST | `/api/auth/login` | Login, get tokens | No |
| POST | `/api/auth/refresh` | Refresh access token | Refresh token |
| GET | `/api/dashboard` | Get recommendations | JWT |
| GET | `/api/portfolios` | List user portfolios | JWT |
| POST | `/api/portfolios` | Create portfolio | JWT |
| GET | `/api/portfolios/:id` | Get portfolio details | JWT |
| GET | `/api/portfolios/:id/assets` | List portfolio assets | JWT |
| POST | `/api/portfolios/:id/assets` | Add asset | JWT |
| GET | `/api/scores/:assetId/breakdown` | Get score breakdown | JWT |
| GET | `/api/criteria` | List user criteria | JWT |
| POST | `/api/criteria` | Create criteria version | JWT |
| POST | `/api/investments/confirm` | Confirm investment | JWT |

### Request/Response Examples

**GET /api/dashboard**
```typescript
// Response
{
  data: {
    recommendations: [
      {
        assetId: "uuid",
        symbol: "PETR4",
        score: "85.5",
        amount: "1500.00",
        currency: "BRL",
        breakdown: { criteriaCount: 5, topContributor: "dividend-yield" }
      }
    ],
    totalInvestable: "5000.00",
    baseCurrency: "USD",
    dataFreshness: "2025-11-28T04:00:00Z"
  }
}
```

**POST /api/investments/confirm**
```typescript
// Request
{
  investments: [
    { assetId: "uuid", amount: "1500.00" },
    { assetId: "uuid", amount: "3500.00" }
  ]
}

// Response
{
  data: {
    confirmed: true,
    newAllocations: {
      "Variable Income": "52.3%",
      "Fixed Income": "47.7%"
    }
  }
}
```

## Security Architecture

### Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Login  │────►│  Verify │────►│  Issue  │────►│  Store  │
│ Request │     │ Password│     │ Tokens  │     │ Session │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                     │
                         ┌───────────┴───────────┐
                         ▼                       ▼
                 Access Token (15m)      Refresh Token (7d)
                 (httpOnly cookie)       (httpOnly cookie)
```

### Token Strategy

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 minutes | httpOnly cookie | API authentication |
| Refresh Token | 7 days | httpOnly cookie | Token renewal |
| Session | 24 hours | Vercel KV | Sensitive operation validation |

### Security Controls

| Control | Implementation |
|---------|----------------|
| Password hashing | bcrypt with cost factor 12 |
| Token signing | RS256 (asymmetric) |
| CSRF protection | SameSite=Strict cookies |
| Rate limiting | 100 req/min per IP (API routes) |
| Input validation | Zod schemas on all endpoints |
| SQL injection | Drizzle parameterized queries |
| XSS prevention | React default escaping + CSP headers |
| Tenant isolation | All queries include `userId` filter |

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline';" }
];
```

## Performance Considerations

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Dashboard load | < 2s | Pre-computed overnight, Vercel KV cache |
| API response | < 500ms | Connection pooling, efficient queries |
| Score calculation | < 100ms/asset | Parallelization, batch processing |
| Overnight processing | < 4 hours (1000 users) | Inngest step functions |

### Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|----------------|-----|--------------|
| Recommendations | Vercel KV | 24h | Overnight job completion |
| Asset prices | Vercel KV | 24h | Daily refresh |
| Exchange rates | Vercel KV | 24h | Daily refresh |
| User session | Vercel KV | 24h | Logout, token refresh |

### Database Optimization

```typescript
// Indexes for common queries
// Add to schema.ts
export const portfoliosUserIdIdx = index('portfolios_user_id_idx').on(portfolios.userId);
export const assetsPortfolioIdIdx = index('assets_portfolio_id_idx').on(assets.portfolioId);
export const eventsCorrelationIdIdx = index('events_correlation_id_idx').on(calculationEvents.correlationId);
export const criteriaUserTypeIdx = index('criteria_user_type_idx').on(criteriaVersions.userId, criteriaVersions.assetType);
```

### Query Patterns

```typescript
// Use select with specific columns (not SELECT *)
const portfolioSummary = await db
  .select({
    id: portfolios.id,
    name: portfolios.name,
    assetCount: count(assets.id)
  })
  .from(portfolios)
  .leftJoin(assets, eq(assets.portfolioId, portfolios.id))
  .where(eq(portfolios.userId, userId))
  .groupBy(portfolios.id);

// Use batch operations for bulk inserts
await db.insert(calculationEvents).values(events); // Single statement
```

## Deployment Architecture

### Environment Strategy

| Environment | Purpose | URL Pattern | Database |
|-------------|---------|-------------|----------|
| Development | Local development | `localhost:3000` | Local PostgreSQL |
| Preview | PR review | `pr-{n}.investments-planner.vercel.app` | Preview branch DB |
| Production | Live users | `investments-planner.vercel.app` | Production DB |

### Vercel Configuration

```
investments-planner (Vercel Project)
├── Framework: Next.js
├── Build Command: pnpm build
├── Output Directory: .next
├── Node.js Version: 20.x
├── Install Command: pnpm install
│
├── Integrations:
│   ├── Vercel Postgres (or Neon)
│   ├── Vercel KV
│   └── Inngest
│
└── Environment Variables:
    ├── DATABASE_URL
    ├── KV_REST_API_URL
    ├── KV_REST_API_TOKEN
    ├── INNGEST_EVENT_KEY
    ├── INNGEST_SIGNING_KEY
    ├── GEMINI_API_KEY
    ├── EXCHANGE_RATE_API_KEY
    ├── JWT_SECRET
    └── JWT_REFRESH_SECRET
```

### CI/CD Pipeline

```
Push to main
    │
    ▼
┌─────────────────┐
│   Lint & Type   │ ← ESLint, TypeScript
│     Check       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Unit Tests    │ ← Vitest
│   (parallel)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Integration     │ ← Vitest + test DB
│   Tests         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Build         │ ← Next.js build
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   E2E Tests     │ ← Playwright
│ (preview URL)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Deploy to     │ ← Vercel
│   Production    │
└─────────────────┘
```

### Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema directly (development only)
pnpm db:push
```

## Development Environment

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| pnpm | 9.x | Package manager |
| PostgreSQL | 16.x | Database (local or Docker) |
| Git | 2.x | Version control |

**Optional:**
| Tool | Purpose |
|------|---------|
| Docker | Local PostgreSQL container |
| VS Code | Recommended IDE |
| Drizzle Studio | Database GUI |

### Environment Variables

Create `.env.local` from `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investments_planner"

# Vercel KV (local: use Redis or mock)
KV_REST_API_URL="http://localhost:6379"
KV_REST_API_TOKEN="local-dev-token"

# Inngest (local dev server)
INNGEST_EVENT_KEY="local-dev-key"
INNGEST_SIGNING_KEY="local-signing-key"

# External APIs (get from providers)
GEMINI_API_KEY="your-gemini-api-key"
EXCHANGE_RATE_API_KEY="your-exchangerate-api-key"

# Auth secrets (generate with: openssl rand -base64 32)
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
```

### Setup Commands

```bash
# Clone repository
git clone https://github.com/yourusername/investments-planner.git
cd investments-planner

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# Start PostgreSQL (Docker)
docker run --name investments-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# Create database
createdb investments_planner

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev

# Start Inngest dev server (separate terminal)
npx inngest-cli@latest dev

# Run tests
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests
pnpm test:coverage  # Coverage report

# Other useful commands
pnpm lint           # Run ESLint
pnpm type-check     # TypeScript check
pnpm db:studio      # Open Drizzle Studio
pnpm storybook      # Component documentation
```

## Architecture Decision Records (ADRs)

### ADR Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-001 | Hybrid Approach (fresh + starter reference) | Accepted | 2025-11-28 |
| ADR-002 | Event-Sourced Calculations with OpenTelemetry | Accepted | 2025-11-28 |
| ADR-003 | Inngest for Background Jobs | Accepted | 2025-11-28 |
| ADR-004 | Vercel Deployment with Escape Hatch | Accepted | 2025-11-28 |
| ADR-005 | Provider Abstraction Pattern | Accepted | 2025-11-28 |

### ADR Summary

**ADR-001: Hybrid Approach**
- Build fresh with `create-next-app`, use saas-starter as reference only
- Rationale: Avoid Stripe coupling, purpose-built fintech architecture

**ADR-002: Event-Sourced Calculations**
- 4 event types: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED
- OpenTelemetry job-level spans (not per-operation)
- Rationale: Perfect audit trail, deterministic replay

**ADR-003: Inngest for Background Jobs**
- Step functions for overnight processing
- Per-market scheduling
- Rationale: Serverless, Vercel-native, built-in retries

**ADR-004: Vercel Deployment**
- Primary deployment target
- Escape hatch: Docker self-hosting preserved
- Rationale: Zero DevOps, native integrations

**ADR-005: Provider Abstraction**
- Interface-based design for external APIs
- Primary → Fallback → Cache chain
- Rationale: Swap providers, graceful degradation

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-28_
_Updated: 2025-11-29 (placeholder sections completed)_
_For: Bmad_
