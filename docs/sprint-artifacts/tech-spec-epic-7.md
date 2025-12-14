# Epic Technical Specification: Recommendations

Date: 2025-12-13
Author: Bmad
Epic ID: 7
Status: Draft

---

## Overview

Epic 7 delivers the **core product value** of Investments Planner: simple, actionable investment recommendations. This is the "signature moment" where users answer "What should I buy this month?" in under 5 minutes.

The epic implements the complete recommendation workflow from capital input to investment confirmation, including:

- Monthly contribution and dividend entry
- Automated recommendation generation based on scores and allocation targets
- Focus Mode display with the flagship RecommendationCard component
- Zero-buy signals for over-allocated assets
- Interactive confirmation flow with actual amount entry
- Real-time portfolio updates after confirmation

**Core Philosophy:** "Simplicity in front, complexity behind" - the UI shows simple answers ("Invest $X in Asset A") while sophisticated allocation algorithms work behind the scenes.

## Objectives and Scope

### In Scope

- **FR45:** Users can enter their monthly contribution amount
- **FR46:** Users can enter dividends received for the period
- **FR47:** System calculates total investable capital (contribution + dividends)
- **FR48:** System generates investment recommendations based on scores and allocation targets
- **FR49:** System displays recommendations as simple actionable items
- **FR50:** System shows zero buy signal for assets/classes that are over-allocated
- **FR51:** System alerts when higher-scoring assets exist but portfolio is at capacity (partial - alert display only)
- **FR52:** Users can view the calculation breakdown for any recommendation
- **FR53:** Users can confirm recommendations and enter actual invested amounts
- **FR54:** System updates portfolio allocation after investment confirmation
- **FR55:** Users can view updated allocation percentages immediately after confirmation

### Out of Scope

- Overnight pre-computation (Epic 8)
- Opportunity alerts for better-scoring assets (Epic 9)
- Email notifications (Growth phase)
- Brokerage API integration (Vision phase)

### Dependencies

| Dependency                     | Epic   | Status      | Notes                                     |
| ------------------------------ | ------ | ----------- | ----------------------------------------- |
| Scoring Engine (Story 5.8)     | Epic 5 | ✅ Complete | Required for score-based recommendations  |
| Allocation Config (Story 4.3)  | Epic 4 | ✅ Complete | Required for target allocation ranges     |
| Portfolio Holdings (Story 3.6) | Epic 3 | ✅ Complete | Required for current allocation           |
| Event Sourcing (Story 1.4)     | Epic 1 | ✅ Complete | Required for audit trail                  |
| Vercel KV Cache (Story 1.6)    | Epic 1 | ✅ Complete | Required for pre-computed recommendations |

## System Architecture Alignment

### Component Integration

Epic 7 integrates with the existing architecture as follows:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dashboard (Focus Mode)                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ ContributionInput │  │ DividendInput │  │ TotalDisplay    │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  RecommendationCard List                   │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │   │
│  │  │ Asset A    │ │ Asset B    │ │ Asset C    │           │   │
│  │  │ Score: 87  │ │ Score: 82  │ │ Score: 79  │           │   │
│  │  │ $800       │ │ $650       │ │ $700       │           │   │
│  │  └────────────┘ └────────────┘ └────────────┘           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ConfirmationModal                             │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ Editable amounts → Confirm → Portfolio Update       │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (/api/...)                          │
│  ┌────────────────┐ ┌─────────────────┐ ┌──────────────────┐   │
│  │ /recommendations│ │ /investments    │ │ /portfolio       │   │
│  │   /route.ts     │ │   /confirm      │ │   /allocation    │   │
│  └────────────────┘ └─────────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              RecommendationService                         │  │
│  │  - calculateRecommendations(userId, contribution, divs)   │  │
│  │  - applyAllocationRules(scores, targets, capital)         │  │
│  │  - handleOverAllocated(currentAlloc, targetRange)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              InvestmentService                             │  │
│  │  - confirmInvestments(userId, investments[])              │  │
│  │  - updatePortfolioHoldings(portfolioId, changes)          │  │
│  │  - calculateNewAllocations(portfolioId)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                    │
│  ┌────────────────┐ ┌─────────────────┐ ┌──────────────────┐   │
│  │ recommendations │ │ investments     │ │ portfolio_assets │   │
│  │ (Vercel KV)     │ │ (PostgreSQL)    │ │ (PostgreSQL)     │   │
│  └────────────────┘ └─────────────────┘ └──────────────────┘   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Event Store (calculation_events)               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Constraints

1. **Decimal Precision:** All monetary calculations use `decimal.js` with precision: 20, rounding: ROUND_HALF_UP
2. **Event Sourcing:** All recommendation calculations emit events for audit trail (per ADR-002)
3. **Caching:** Pre-computed recommendations stored in Vercel KV with 24h TTL (per ADR-004)
4. **Multi-Currency:** All amounts normalized to base currency before calculations (per Architecture Section)

## Detailed Design

### Services and Modules

| Service/Module            | Responsibility                                            | Location                                 |
| ------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| **RecommendationService** | Generate recommendations from scores + allocation targets | `lib/services/recommendation-service.ts` |
| **InvestmentService**     | Record investments and update portfolio                   | `lib/services/investment-service.ts`     |
| **AllocationCalculator**  | Calculate allocation percentages and gaps                 | `lib/calculations/allocation.ts`         |
| **RecommendationEngine**  | Core algorithm for distributing capital                   | `lib/calculations/recommendations.ts`    |

### Data Models and Contracts

#### New Tables

```typescript
// lib/db/schema.ts - additions

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  contribution: numeric("contribution", { precision: 19, scale: 4 }).notNull(),
  dividends: numeric("dividends", { precision: 19, scale: 4 }).notNull().default("0"),
  totalInvestable: numeric("total_investable", { precision: 19, scale: 4 }).notNull(),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, confirmed, expired
});

export const recommendationItems = pgTable("recommendation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  recommendationId: uuid("recommendation_id")
    .notNull()
    .references(() => recommendations.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id),
  ticker: varchar("ticker", { length: 20 }).notNull(),
  score: numeric("score", { precision: 7, scale: 4 }).notNull(),
  currentAllocation: numeric("current_allocation", { precision: 7, scale: 4 }).notNull(),
  targetAllocation: numeric("target_allocation", { precision: 7, scale: 4 }).notNull(),
  allocationGap: numeric("allocation_gap", { precision: 7, scale: 4 }).notNull(),
  recommendedAmount: numeric("recommended_amount", { precision: 19, scale: 4 }).notNull(),
  isOverAllocated: boolean("is_over_allocated").notNull().default(false),
  breakdown: jsonb("breakdown").notNull(), // Calculation breakdown JSON
});

export const investments = pgTable("investments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  recommendationId: uuid("recommendation_id").references(() => recommendations.id),
  ticker: varchar("ticker", { length: 20 }).notNull(),
  quantity: numeric("quantity", { precision: 19, scale: 8 }).notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 19, scale: 4 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 19, scale: 4 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  recommendedAmount: numeric("recommended_amount", { precision: 19, scale: 4 }), // What was recommended
  actualAmount: numeric("actual_amount", { precision: 19, scale: 4 }).notNull(), // What user invested
  investedAt: timestamp("invested_at").defaultNow(),
});
```

#### Type Definitions

```typescript
// lib/types/recommendations.ts

export interface Recommendation {
  id: string;
  userId: string;
  portfolioId: string;
  contribution: string; // Decimal as string
  dividends: string;
  totalInvestable: string;
  baseCurrency: string;
  generatedAt: Date;
  items: RecommendationItem[];
}

export interface RecommendationItem {
  id: string;
  assetId: string;
  ticker: string;
  assetName?: string;
  score: string;
  currentAllocation: string;
  targetAllocation: string;
  allocationGap: string;
  recommendedAmount: string;
  isOverAllocated: boolean;
  breakdown: RecommendationBreakdown;
}

export interface RecommendationBreakdown {
  allocationGapPoints: number;
  scoreContribution: number;
  minimumAllocationApplied: boolean;
  overAllocationReason?: string;
  calculationNotes: string[];
}

export interface ConfirmInvestmentInput {
  recommendationId: string;
  investments: Array<{
    assetId: string;
    ticker: string;
    actualAmount: string;
    pricePerUnit: string;
  }>;
}

export interface ConfirmInvestmentResult {
  success: boolean;
  investmentIds: string[];
  newAllocations: Record<string, string>; // assetClass -> percentage
  beforeAllocations: Record<string, string>;
  afterAllocations: Record<string, string>;
}
```

### APIs and Interfaces

#### GET /api/recommendations

Returns current recommendations for the user.

```typescript
// Request
GET /api/recommendations
Headers: Authorization: Bearer <jwt>

// Response 200
{
  data: {
    id: "uuid",
    contribution: "2000.00",
    dividends: "150.00",
    totalInvestable: "2150.00",
    baseCurrency: "USD",
    generatedAt: "2025-12-13T04:00:00Z",
    dataFreshness: "2025-12-13T04:00:00Z",
    items: [
      {
        id: "uuid",
        assetId: "uuid",
        ticker: "PETR4",
        score: "87.5",
        currentAllocation: "18.0",
        targetAllocation: "20.0",
        allocationGap: "2.0",
        recommendedAmount: "800.00",
        isOverAllocated: false
      },
      // ...
    ]
  }
}

// Response 404 (no recommendations yet)
{
  error: "No recommendations available",
  code: "NO_RECOMMENDATIONS"
}
```

#### POST /api/recommendations/generate

Generates new recommendations based on user input.

```typescript
// Request
POST /api/recommendations/generate
Headers: Authorization: Bearer <jwt>
Body: {
  contribution: "2000.00",
  dividends: "150.00"
}

// Response 200
{
  data: {
    id: "uuid",
    // ... same as GET response
  }
}

// Response 400
{
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: {
    fieldErrors: { contribution: ["Must be greater than 0"] }
  }
}
```

#### GET /api/recommendations/:id/breakdown

Returns detailed calculation breakdown for a recommendation item.

```typescript
// Request
GET /api/recommendations/:id/breakdown?itemId=uuid
Headers: Authorization: Bearer <jwt>

// Response 200
{
  data: {
    item: { /* RecommendationItem */ },
    calculation: {
      inputs: {
        currentValue: "5000.00",
        portfolioTotal: "27777.77",
        currentPercentage: "18.0",
        targetRange: { min: "18.0", max: "22.0" },
        score: "87.5",
        criteriaVersion: "uuid"
      },
      steps: [
        { step: "Calculate allocation gap", value: "2.0%", formula: "target_mid - current" },
        { step: "Apply score weighting", value: "1.75", formula: "gap * (score/100)" },
        { step: "Distribute capital", value: "800.00", formula: "weighted_share * total_investable" }
      ],
      result: {
        recommendedAmount: "800.00",
        reasoning: "Asset is 2% below target allocation with high score (87.5)"
      }
    },
    auditTrail: {
      correlationId: "uuid",
      generatedAt: "2025-12-13T04:00:00Z",
      criteriaVersionId: "uuid"
    }
  }
}
```

#### POST /api/investments/confirm

Confirms investments and updates portfolio.

```typescript
// Request
POST /api/investments/confirm
Headers: Authorization: Bearer <jwt>
Body: {
  recommendationId: "uuid",
  investments: [
    {
      assetId: "uuid",
      ticker: "PETR4",
      actualAmount: "800.00",
      pricePerUnit: "35.50"
    },
    {
      assetId: "uuid",
      ticker: "VALE3",
      actualAmount: "650.00",
      pricePerUnit: "72.30"
    }
  ]
}

// Response 200
{
  data: {
    success: true,
    investmentIds: ["uuid1", "uuid2"],
    summary: {
      totalInvested: "1450.00",
      assetsUpdated: 2
    },
    allocations: {
      before: {
        "Variable Income": "48.5%",
        "Fixed Income": "51.5%"
      },
      after: {
        "Variable Income": "52.3%",
        "Fixed Income": "47.7%"
      }
    }
  }
}
```

### Workflows and Sequencing

#### Recommendation Generation Flow

```
User enters contribution + dividends
         │
         ▼
┌─────────────────────────────────────┐
│  1. Validate inputs                  │
│     - contribution > 0               │
│     - dividends >= 0                 │
│     - total <= portfolio value * 2   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  2. Calculate total investable       │
│     total = contribution + dividends │
│     (using decimal.js)               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  3. Get current portfolio state      │
│     - Current allocations            │
│     - Asset scores (from cache)      │
│     - Target allocation ranges       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  4. Calculate allocation gaps        │
│     For each asset class:            │
│     - gap = target_mid - current     │
│     - identify over-allocated        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  5. Rank assets by priority          │
│     priority = gap * (score/100)     │
│     Sort descending                  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  6. Distribute capital               │
│     - Allocate to highest priority   │
│     - Respect min allocation values  │
│     - Skip over-allocated assets     │
│     - Continue until capital = 0     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  7. Emit events + store              │
│     - CALC_STARTED                   │
│     - INPUTS_CAPTURED                │
│     - RECS_COMPUTED                  │
│     - CALC_COMPLETED                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  8. Cache in Vercel KV               │
│     Key: recs:{userId}               │
│     TTL: 24 hours                    │
└─────────────────────────────────────┘
```

#### Investment Confirmation Flow

```
User clicks "Confirm Investments"
         │
         ▼
┌─────────────────────────────────────┐
│  1. Show ConfirmationModal           │
│     - Pre-filled with recommended    │
│     - Amounts editable               │
│     - Real-time total                │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  2. User adjusts amounts (optional)  │
│     - Can reduce/increase            │
│     - Cannot exceed available capital│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  3. User clicks Confirm              │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  4. API: POST /investments/confirm   │
│     - Validate amounts               │
│     - Begin transaction              │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Transaction (atomic)                                         │
│     a. Create investment records                                 │
│     b. Update portfolio_assets quantities                        │
│     c. Mark recommendation as "confirmed"                        │
│     d. Emit INVESTMENT_CONFIRMED event                           │
│     e. Invalidate KV cache                                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  6. Calculate new allocations        │
│     - Before vs After comparison     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  7. Return success + allocations     │
│     - Show success toast             │
│     - Display before/after           │
└─────────────────────────────────────┘
```

## Non-Functional Requirements

### Performance

| Requirement               | Target  | Implementation                                 |
| ------------------------- | ------- | ---------------------------------------------- |
| Recommendation display    | < 100ms | Pre-computed in Vercel KV cache                |
| Recommendation generation | < 2s    | Optimized algorithm, batch DB queries          |
| Investment confirmation   | < 1s    | Transactional update, async cache invalidation |
| Dashboard initial load    | < 2s    | Cached recommendations + skeleton loading      |

**Performance Strategies:**

- Pre-compute recommendations during overnight processing (Epic 8)
- Cache recommendations in Vercel KV with user-scoped keys
- Use React Query for optimistic updates in confirmation flow
- Batch database operations in transactions

### Security

| Requirement      | Implementation                                       |
| ---------------- | ---------------------------------------------------- |
| Authentication   | All endpoints require valid JWT                      |
| Authorization    | User can only access own recommendations/investments |
| Input validation | Zod schemas validate all inputs server-side          |
| Tenant isolation | All queries scoped by userId                         |
| Audit trail      | All calculations logged via event sourcing           |

**Sensitive Operations:**

- Investment confirmation modifies portfolio data - requires fresh JWT (not just refresh token)
- Amount validation prevents negative or excessive values
- Rate limiting: max 10 investment confirmations per hour per user

### Reliability/Availability

| Requirement                 | Target             | Strategy                                 |
| --------------------------- | ------------------ | ---------------------------------------- |
| Investment confirmation     | 99.9% success rate | Database transactions with rollback      |
| Recommendation availability | 99.5%              | Fallback to PostgreSQL if KV cache miss  |
| Data consistency            | ACID guarantees    | PostgreSQL transactions for confirmation |

**Failure Handling:**

- If Vercel KV unavailable → fall back to PostgreSQL query
- If investment confirmation fails → rollback entire transaction
- If recommendation generation fails → return cached recommendations with stale warning

### Observability

| Signal      | Implementation                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------- |
| **Traces**  | OpenTelemetry spans for recommendation generation and investment confirmation                     |
| **Metrics** | recommendation_generated_total, investment_confirmed_total, recommendation_generation_duration_ms |
| **Logs**    | Structured JSON logs with userId, recommendationId, amounts                                       |

**Key Observability Points:**

- Recommendation generation span with timing breakdown
- Investment confirmation transaction span
- Cache hit/miss ratio for recommendations

## Dependencies and Integrations

### Internal Dependencies

| Dependency                           | Type    | Usage                            |
| ------------------------------------ | ------- | -------------------------------- |
| `lib/calculations/scoring-engine.ts` | Service | Get asset scores for ranking     |
| `lib/calculations/allocation.ts`     | Utility | Calculate allocation percentages |
| `lib/calculations/decimal-utils.ts`  | Utility | Precise financial math           |
| `lib/events/event-store.ts`          | Service | Emit audit events                |
| `lib/cache/index.ts`                 | Service | Vercel KV cache operations       |
| `lib/db/schema.ts`                   | Schema  | Database table definitions       |

### External Dependencies

| Package                 | Version | Purpose                          |
| ----------------------- | ------- | -------------------------------- |
| `decimal.js`            | ^10.x   | Financial precision calculations |
| `@vercel/kv`            | ^2.x    | Recommendation caching           |
| `zod`                   | ^3.x    | Input validation                 |
| `@tanstack/react-query` | ^5.x    | Client-side data fetching        |

### API Dependencies

| API       | Usage                 | Fallback                |
| --------- | --------------------- | ----------------------- |
| Vercel KV | Cache recommendations | PostgreSQL direct query |

## Acceptance Criteria (Authoritative)

### Story 7.1: Enter Monthly Contribution

1. **AC7.1.1:** Given I am on the Dashboard, when I enter a contribution amount > 0, then the amount is validated and saved
2. **AC7.1.2:** Given I enter an invalid amount (≤0, non-numeric), when I submit, then inline validation error appears below field
3. **AC7.1.3:** Given I save a contribution, when I return next month, then my previous amount is pre-filled as default
4. **AC7.1.4:** Given I am entering contribution, then amount displays in my base currency with proper formatting

### Story 7.2: Enter Dividends Received

5. **AC7.2.1:** Given I am on the Dashboard, when I enter dividends amount ≥ 0, then the amount is saved
6. **AC7.2.2:** Given I don't enter dividends, when recommendations generate, then dividends default to $0
7. **AC7.2.3:** Given I enter contribution and dividends, then I see breakdown: "Contribution: $X + Dividends: $Y = $Z to invest"

### Story 7.3: Calculate Total Investable Capital

8. **AC7.3.1:** Given contribution and dividends entered, when calculation runs, then total = contribution + dividends (using decimal.js)
9. **AC7.3.2:** Given inputs change, when I modify either amount, then total updates immediately
10. **AC7.3.3:** Given total is calculated, then display shows "You have $X to invest" prominently

### Story 7.4: Generate Investment Recommendations

11. **AC7.4.1:** Given scores and allocation targets exist, when recommendations generate, then assets are prioritized by (allocation_gap × score)
12. **AC7.4.2:** Given an asset class is below target, when recommendations generate, then higher-scoring assets in that class receive recommendations
13. **AC7.4.3:** Given total capital to distribute, when recommendations complete, then sum of recommendations = total investable
14. **AC7.4.4:** Given minimum allocation values are set, when an asset would receive less than minimum, then amount is redistributed to next priority
15. **AC7.4.5:** Given calculation runs, then events CALC_STARTED, INPUTS_CAPTURED, RECS_COMPUTED, CALC_COMPLETED are emitted

### Story 7.5: Display Recommendations (Focus Mode)

16. **AC7.5.1:** Given recommendations exist, when Dashboard loads, then Focus Mode displays with header "Ready to invest. You have $X available"
17. **AC7.5.2:** Given recommendations exist, then each RecommendationCard shows: ticker, score badge, recommended amount, allocation gauge
18. **AC7.5.3:** Given recommendations exist, then cards are sorted by recommended amount (highest first)
19. **AC7.5.4:** Given no recommendations needed, then display shows "Your portfolio is perfectly balanced this month!"
20. **AC7.5.5:** Given recommendations, then total summary shows "N assets totaling $X"

### Story 7.6: Zero Buy Signal for Over-Allocated

21. **AC7.6.1:** Given an asset class is above target range, when recommendations display, then that class shows $0 with "(over-allocated)" label
22. **AC7.6.2:** Given over-allocated asset, then card is visually distinct (grayed out styling)
23. **AC7.6.3:** Given over-allocated asset clicked, then explanation shows current vs target with rebalancing message

### Story 7.7: View Recommendation Breakdown

24. **AC7.7.1:** Given I click a RecommendationCard, when detail panel opens, then I see allocation gap calculation
25. **AC7.7.2:** Given breakdown panel open, then I see score breakdown link
26. **AC7.7.3:** Given breakdown panel open, then I see formula: "Gap: X%, Score contribution: Y, Amount: $Z"
27. **AC7.7.4:** Given breakdown panel open, then audit trail link shows correlation ID and timestamp

### Story 7.8: Confirm Recommendations

28. **AC7.8.1:** Given I click "Confirm Investments", when modal opens, then recommended amounts are pre-filled but editable
29. **AC7.8.2:** Given I adjust amounts, when total changes, then running total updates in real-time
30. **AC7.8.3:** Given I enter valid amounts, when I click Confirm, then investments are recorded and modal closes
31. **AC7.8.4:** Given confirmation succeeds, then toast shows "November investments recorded"
32. **AC7.8.5:** Given any amount is negative or total exceeds available, then Confirm button is disabled with validation message

### Story 7.9: Update Portfolio After Confirmation

33. **AC7.9.1:** Given investments confirmed, when transaction completes, then portfolio_assets quantities are updated
34. **AC7.9.2:** Given investments confirmed, then allocation percentages recalculate immediately
35. **AC7.9.3:** Given investments confirmed, then KV cache is invalidated for this user
36. **AC7.9.4:** Given investments confirmed, then INVESTMENT_CONFIRMED event is emitted with full details

### Story 7.10: View Updated Allocation

37. **AC7.10.1:** Given investments confirmed, when success screen shows, then I see before/after allocation comparison
38. **AC7.10.2:** Given before/after shown, then improved allocations are highlighted (green for closer to target)
39. **AC7.10.3:** Given confirmation complete, then I can navigate to Portfolio view for full details

## Traceability Mapping

| AC              | Spec Section                        | Component/API                            | Test Approach                        |
| --------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------ |
| AC7.1.1         | APIs/POST recommendations/generate  | ContributionInput, RecommendationService | Unit: validation, Integration: API   |
| AC7.1.2         | Data Models/validation              | ContributionInput                        | Unit: Zod schema                     |
| AC7.1.3         | Data Models/user_settings           | UserSettings, localStorage               | Integration: persistence             |
| AC7.1.4         | Components/CurrencyDisplay          | CurrencyInput                            | Unit: formatting                     |
| AC7.2.1-7.2.3   | APIs/POST recommendations/generate  | DividendInput                            | Unit + Integration                   |
| AC7.3.1-7.3.3   | Services/RecommendationService      | AllocationCalculator                     | Unit: decimal.js                     |
| AC7.4.1-7.4.5   | Workflows/Recommendation Generation | RecommendationEngine                     | Unit: algorithm, Integration: events |
| AC7.5.1-7.5.5   | Components/Dashboard                | RecommendationCard, FocusMode            | E2E: dashboard load                  |
| AC7.6.1-7.6.3   | Services/handleOverAllocated        | RecommendationCard                       | Unit: over-allocation                |
| AC7.7.1-7.7.4   | APIs/GET breakdown                  | BreakdownPanel                           | Integration: breakdown API           |
| AC7.8.1-7.8.5   | APIs/POST confirm                   | ConfirmationModal                        | Integration: confirmation flow       |
| AC7.9.1-7.9.4   | Workflows/Investment Confirmation   | InvestmentService                        | Integration: transaction             |
| AC7.10.1-7.10.3 | Components/AllocationComparison     | SuccessScreen                            | E2E: full flow                       |

## Risks, Assumptions, Open Questions

### Risks

| Risk                                                 | Probability | Impact | Mitigation                                                               |
| ---------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------ |
| Recommendation algorithm produces unexpected results | Medium      | High   | Extensive unit tests with edge cases, user-visible calculation breakdown |
| Cache invalidation race conditions                   | Medium      | Medium | Use atomic operations, implement cache versioning                        |
| Large portfolios slow down generation                | Low         | Medium | Batch processing, pagination if needed                                   |
| Decimal precision edge cases                         | Low         | High   | Comprehensive decimal.js testing, rounding verification                  |

### Assumptions

1. **Scores Available:** Asset scores from Epic 5 are pre-computed and cached
2. **Allocation Targets Set:** Users have configured allocation ranges in Epic 4
3. **Single Portfolio:** MVP focuses on single portfolio per user (per PRD)
4. **Previous Day Prices:** Calculations use cached prices, not real-time
5. **Base Currency Consistent:** All amounts normalized to user's base currency

### Open Questions

1. **Q:** Should we allow partial confirmation (only some recommended assets)?
   **A:** Yes, amounts are editable per asset. User can set any to $0.

2. **Q:** What happens if user changes criteria after recommendations generated?
   **A:** Cache invalidates, user must regenerate recommendations.

3. **Q:** How do we handle recommendations during market holidays?
   **A:** Use last available price with DataFreshnessBadge warning.

## Test Strategy Summary

### Test Levels

| Level           | Framework  | Focus Areas                                                      |
| --------------- | ---------- | ---------------------------------------------------------------- |
| **Unit**        | Vitest     | Recommendation algorithm, decimal calculations, allocation logic |
| **Integration** | Vitest     | API routes, database transactions, event emission                |
| **E2E**         | Playwright | Complete recommendation → confirmation flow                      |

### Critical Test Scenarios

1. **Algorithm Accuracy:**
   - Recommendation amounts sum to total investable
   - Higher-scored assets receive priority
   - Over-allocated assets receive $0
   - Minimum allocation values respected

2. **Decimal Precision:**
   - Multi-currency conversion accuracy
   - Rounding behavior consistency
   - No floating-point errors in financial math

3. **Transaction Integrity:**
   - Confirmation creates investment records
   - Portfolio assets update correctly
   - Rollback on failure
   - Event emission on success

4. **Cache Behavior:**
   - Recommendations cached after generation
   - Cache invalidated after confirmation
   - Fallback to DB on cache miss

### Test Coverage Targets

| Component            | Coverage Target |
| -------------------- | --------------- |
| RecommendationEngine | 95%             |
| AllocationCalculator | 95%             |
| InvestmentService    | 90%             |
| API Routes           | 85%             |
| UI Components        | 80%             |

---

_Generated by BMAD Epic Tech Context Workflow v1.0_
_Epic 7: Recommendations - The Core Product Value_
