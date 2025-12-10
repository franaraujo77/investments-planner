# Epic Technical Specification: Scoring Engine

Date: 2025-12-05
Author: Bmad
Epic ID: 5
Status: Draft

---

## Overview

Epic 5 delivers the Scoring Engine - the core intelligence layer that evaluates assets based on user-defined criteria and calculates scores that drive investment recommendations. This epic implements FR24-FR30 (Scoring Criteria Configuration) and FR34-FR37 (Asset Data & Scoring), enabling users to define their personal investment philosophy through configurable scoring rules and see how each asset performs against those rules.

The Scoring Engine is the heart of the "configuration over hardcoding" philosophy. Users define what matters to them (dividend yield thresholds, P/E ratios, historical surplus consistency), assign point values, and the system faithfully executes that strategy across all assets in their configured markets. This transforms subjective investment decisions into systematic, reproducible calculations.

## Objectives and Scope

### In Scope

- **FR24:** Define scoring criteria for each market/asset type (CRUD operations for criteria)
- **FR25:** Set point values for criteria (+/- points, Cerrado methodology support)
- **FR26:** Define criteria using operators (>, <, >=, <=, between, equals, exists)
- **FR27:** View criteria library organized by market/asset type
- **FR28:** Copy existing criteria sets to create variations
- **FR29:** Compare two criteria sets (A/B testing strategies)
- **FR30:** Preview criteria impact before saving (simulation mode)
- **FR34:** Calculate scores for all assets based on user criteria
- **FR35:** Store historical scores for trend analysis
- **FR36:** View current score for any asset
- **FR37:** View score breakdown (which criteria contributed)
- Criteria versioning (immutable versions for audit trail)
- Quick-calc mode for criteria preview (uses cached data)
- Integration with event-sourced calculation pipeline (from Epic 1)

### Out of Scope

- External data fetching (Epic 6: Data Pipeline)
- Recommendation generation based on scores (Epic 7: Recommendations)
- Overnight batch processing (Epic 8: Overnight Processing)
- Alert generation for score changes (Epic 9: Alerts & Polish)
- Real-time score updates (scores calculated on-demand or overnight)

## System Architecture Alignment

### Components Referenced (from Architecture Document)

| Component                                | Role in Epic 5                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/calculations/scoring-engine.ts`     | Core scoring logic with decimal.js precision                                                        |
| `lib/calculations/quick-calc.ts`         | Preview mode calculations using cached data                                                         |
| `lib/db/schema.ts`                       | criteria_versions, asset_scores tables                                                              |
| `lib/events/`                            | Event-sourced calculation pipeline (CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED) |
| `app/(dashboard)/criteria/page.tsx`      | Criteria configuration UI (Notion-style blocks)                                                     |
| `components/fintech/criteria-block.tsx`  | Custom CriteriaBlock component                                                                      |
| `components/fintech/score-breakdown.tsx` | ScoreBreakdown visualization component                                                              |

### Architectural Constraints

1. **Decimal Precision:** All score calculations MUST use decimal.js (per ADR-002)
2. **Event Sourcing:** Every calculation MUST emit 4 events for audit trail
3. **Criteria Versioning:** Criteria are immutable; changes create new versions
4. **Deterministic:** Same inputs MUST always produce same scores (replay capability)
5. **User Isolation:** Criteria and scores are strictly scoped by user_id

---

## Detailed Design

### Services and Modules

| Service/Module                | Responsibility                            | Inputs                                   | Outputs                               |
| ----------------------------- | ----------------------------------------- | ---------------------------------------- | ------------------------------------- |
| **CriteriaService**           | CRUD for criteria, versioning, validation | CriteriaInput, userId                    | CriteriaVersion                       |
| **ScoringEngine**             | Core score calculation algorithm          | Assets[], Criteria[], Prices, Rates      | AssetScore[]                          |
| **QuickCalcService**          | Preview calculations with cached data     | CriteriaInput, sampleAssets              | PreviewResult                         |
| **ScoreQueryService**         | Query scores, breakdowns, history         | assetId, userId, dateRange               | Score, ScoreBreakdown, ScoreHistory[] |
| **CriteriaComparisonService** | Compare two criteria sets                 | criteriaSetA, criteriaSetB, sampleAssets | ComparisonResult                      |

### Data Models and Contracts

#### Criteria Version Schema

```typescript
// lib/db/schema.ts
export const criteriaVersions = pgTable("criteria_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  assetType: varchar("asset_type", { length: 50 }).notNull(), // e.g., 'stock', 'reit', 'etf'
  targetMarket: varchar("target_market", { length: 50 }).notNull(), // e.g., 'BR_BANKS', 'US_TECH'
  name: varchar("name", { length: 100 }).notNull(),
  criteria: jsonb("criteria").notNull().$type<CriterionRule[]>(),
  version: integer("version").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Criteria rule structure (stored in JSONB)
interface CriterionRule {
  id: string;
  name: string;
  metric: string; // 'dividend_yield', 'pe_ratio', 'pb_ratio', etc.
  operator: "gt" | "lt" | "gte" | "lte" | "between" | "equals" | "exists";
  value: string; // Decimal string
  value2?: string; // For 'between' operator
  points: number; // -100 to +100
  requiredFundamentals: string[]; // Data points needed
  sortOrder: number;
}
```

#### Asset Score Schema

```typescript
export const assetScores = pgTable("asset_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  assetId: uuid("asset_id").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  criteriaVersionId: uuid("criteria_version_id")
    .notNull()
    .references(() => criteriaVersions.id),
  score: numeric("score", { precision: 7, scale: 4 }).notNull(),
  breakdown: jsonb("breakdown").notNull().$type<CriterionResult[]>(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Score breakdown structure
interface CriterionResult {
  criterionId: string;
  criterionName: string;
  matched: boolean;
  pointsAwarded: number;
  actualValue?: string;
  skippedReason?: string; // 'missing_fundamental', 'data_stale', etc.
}
```

#### Score History Schema

```typescript
export const scoreHistory = pgTable(
  "score_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    assetId: uuid("asset_id").notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    score: numeric("score", { precision: 7, scale: 4 }).notNull(),
    criteriaVersionId: uuid("criteria_version_id").notNull(),
    calculatedAt: timestamp("calculated_at").notNull(),
  },
  (table) => ({
    // Index for efficient trend queries
    userAssetDateIdx: index("score_history_user_asset_date_idx").on(
      table.userId,
      table.assetId,
      table.calculatedAt
    ),
  })
);
```

### APIs and Interfaces

#### Criteria Management Endpoints

| Method | Path                     | Description                           | Request                                   | Response                      |
| ------ | ------------------------ | ------------------------------------- | ----------------------------------------- | ----------------------------- |
| GET    | `/api/criteria`          | List user's criteria sets             | `?assetType=stock`                        | `{ data: CriteriaVersion[] }` |
| GET    | `/api/criteria/:id`      | Get criteria version                  | -                                         | `{ data: CriteriaVersion }`   |
| POST   | `/api/criteria`          | Create new criteria set               | `CriteriaInput`                           | `{ data: CriteriaVersion }`   |
| PUT    | `/api/criteria/:id`      | Update criteria (creates new version) | `CriteriaInput`                           | `{ data: CriteriaVersion }`   |
| DELETE | `/api/criteria/:id`      | Soft delete criteria set              | -                                         | `{ success: true }`           |
| POST   | `/api/criteria/:id/copy` | Copy criteria set                     | `{ name: string, targetMarket?: string }` | `{ data: CriteriaVersion }`   |
| POST   | `/api/criteria/compare`  | Compare two criteria sets             | `{ setA: string, setB: string }`          | `{ data: ComparisonResult }`  |
| POST   | `/api/criteria/preview`  | Preview criteria impact               | `CriteriaInput`                           | `{ data: PreviewResult }`     |

#### Score Endpoints

| Method | Path                             | Description               | Request                   | Response                      |
| ------ | -------------------------------- | ------------------------- | ------------------------- | ----------------------------- |
| GET    | `/api/scores/:assetId`           | Get asset score           | -                         | `{ data: AssetScore }`        |
| GET    | `/api/scores/:assetId/breakdown` | Get score breakdown       | -                         | `{ data: ScoreBreakdown }`    |
| GET    | `/api/scores/:assetId/history`   | Get score history         | `?days=90`                | `{ data: ScoreHistory[] }`    |
| POST   | `/api/scores/calculate`          | Trigger score calculation | `{ assetIds?: string[] }` | `{ data: { jobId: string } }` |

#### Request/Response Examples

**POST /api/criteria**

```json
{
  "assetType": "stock",
  "targetMarket": "BR_BANKS",
  "name": "Brazilian Banks Criteria",
  "criteria": [
    {
      "name": "Dividend Yield > 6%",
      "metric": "dividend_yield",
      "operator": "gt",
      "value": "6",
      "points": 10,
      "requiredFundamentals": ["dividend_yield"]
    },
    {
      "name": "P/E between 5-15",
      "metric": "pe_ratio",
      "operator": "between",
      "value": "5",
      "value2": "15",
      "points": 8,
      "requiredFundamentals": ["pe_ratio"]
    },
    {
      "name": "5-year surplus consistency",
      "metric": "surplus_years",
      "operator": "gte",
      "value": "5",
      "points": 5,
      "requiredFundamentals": ["surplus_history"]
    }
  ]
}
```

**GET /api/scores/:assetId/breakdown**

```json
{
  "data": {
    "assetId": "uuid",
    "symbol": "ITUB4",
    "score": "85.5",
    "calculatedAt": "2025-12-05T04:00:00Z",
    "criteriaVersionId": "uuid",
    "breakdown": [
      {
        "criterionId": "uuid",
        "criterionName": "Dividend Yield > 6%",
        "matched": true,
        "pointsAwarded": 10,
        "actualValue": "7.2"
      },
      {
        "criterionId": "uuid",
        "criterionName": "P/E between 5-15",
        "matched": true,
        "pointsAwarded": 8,
        "actualValue": "9.5"
      },
      {
        "criterionId": "uuid",
        "criterionName": "5-year surplus consistency",
        "matched": false,
        "pointsAwarded": 0,
        "actualValue": "3",
        "skippedReason": null
      }
    ],
    "dataFreshness": "2025-12-04T23:00:00Z"
  }
}
```

### Workflows and Sequencing

#### Score Calculation Flow (Criteria-Driven Algorithm)

```
1. CALC_STARTED event emitted
   └── correlationId, userId, timestamp

2. For each criterion in user's active criteria set:
   a. Get criterion's target_market (e.g., "BR_BANKS")
   b. Find all assets in that market/sector
   c. For each matching asset:
      ├── Check if asset has required_fundamentals
      │   ├── Missing → skip criterion, record skippedReason
      │   └── Present → evaluate criterion condition
      │       ├── Condition met → add criterion points
      │       └── Condition not met → 0 points
      └── Record result in breakdown

3. INPUTS_CAPTURED event emitted
   └── criteriaVersionId, criteria config, prices snapshot, rates snapshot

4. Aggregate scores per asset
   └── score = sum(pointsAwarded) for all criteria

5. SCORES_COMPUTED event emitted
   └── Array<{ assetId, score, breakdown }>

6. Store scores in asset_scores table
7. Store historical entry in score_history table

8. CALC_COMPLETED event emitted
   └── correlationId, duration, assetCount
```

#### Criteria Preview Flow (Quick-Calc)

```
User edits criteria
       │
       ▼
[Preview Impact] clicked
       │
       ▼
QuickCalcService.preview()
  ├── Uses CACHED prices/fundamentals (no API calls)
  ├── Runs scoring algorithm on sample assets (top 20)
  └── Returns PreviewResult:
      ├── Top 10 scoring assets with new criteria
      ├── Comparison: "↑5 improved, ↓2 worse, →3 same"
      └── Score distribution chart data
```

---

## Non-Functional Requirements

### Performance

| Metric               | Target            | Implementation                                   |
| -------------------- | ----------------- | ------------------------------------------------ |
| Score calculation    | < 100ms per asset | Parallelized batch processing, decimal.js        |
| Criteria preview     | < 500ms total     | Quick-calc with cached data, sample of 20 assets |
| Score breakdown load | < 200ms           | Pre-computed, stored in JSONB                    |
| Criteria page load   | < 1s              | Server-side render with React Query prefetch     |
| History trend query  | < 300ms           | Indexed by (userId, assetId, calculatedAt)       |

### Security

| Requirement         | Implementation                                  |
| ------------------- | ----------------------------------------------- |
| User isolation      | All queries include `WHERE user_id = :userId`   |
| Input validation    | Zod schemas validate all criteria inputs        |
| Points range        | Server-side validation: -100 to +100            |
| Criteria versioning | Immutable versions prevent tampering            |
| Audit trail         | Event-sourced calculations with correlation IDs |

### Reliability/Availability

| Requirement              | Implementation                                       |
| ------------------------ | ---------------------------------------------------- |
| Calculation determinism  | decimal.js with fixed precision, consistent rounding |
| Replay capability        | Event store enables exact calculation replay         |
| Partial failure handling | Skip assets with missing data, continue with others  |
| Criteria rollback        | Previous versions always accessible                  |
| Data consistency         | Transaction wraps score writes + history writes      |

### Observability

| Signal                | Implementation                                    |
| --------------------- | ------------------------------------------------- |
| Calculation duration  | OpenTelemetry span attribute: `compute_scores_ms` |
| Assets processed      | Span attribute: `asset_count`                     |
| Criteria version used | Span attribute: `criteria_version_id`             |
| Skip reasons          | Logged in breakdown, aggregated in metrics        |
| Error rates           | Error events with context logged                  |

---

## Dependencies and Integrations

### Internal Dependencies

| Dependency           | Version | Purpose                          |
| -------------------- | ------- | -------------------------------- |
| Event Store (Epic 1) | -       | Calculation audit trail          |
| decimal.js           | ^10.6.0 | Financial precision calculations |
| Drizzle ORM          | ^0.44.7 | Database operations              |
| Zod                  | ^4.1.13 | Input validation                 |
| React Hook Form      | ^7.67.0 | Criteria form management         |

### External Dependencies

| Dependency              | Version | Purpose                                          |
| ----------------------- | ------- | ------------------------------------------------ |
| Asset fundamentals data | -       | Required for criterion evaluation (from Epic 6)  |
| Price data              | -       | Required for price-based criteria (from Epic 6)  |
| Exchange rates          | -       | Multi-currency score normalization (from Epic 6) |

### Integration Points

| Integration                 | Direction    | Contract                                      |
| --------------------------- | ------------ | --------------------------------------------- |
| Epic 6 Data Pipeline        | Consumes     | Fundamentals, prices via provider abstraction |
| Epic 7 Recommendations      | Provides     | Asset scores for allocation decisions         |
| Epic 8 Overnight Processing | Triggered by | Batch score calculation jobs                  |

---

## Acceptance Criteria (Authoritative)

### Story 5.1: Define Scoring Criteria

1. User can create a new criterion with name, metric, operator, value(s), and points
2. Criterion form validates: points in -100 to +100, values are valid decimals
3. Created criterion appears in criteria library immediately
4. CriteriaBlock component shows drag handle, inline editing, delete option

### Story 5.2: Set Point Values

1. Points input accepts integers from -100 to +100
2. Positive points displayed with green indicator, negative with red
3. Historical surplus scoring: +5 for 5 years, -2 per missing year (Cerrado)
4. Point impact preview shows when hovering criterion

### Story 5.3: Define Criteria Operators

1. Operators available: >, <, >=, <=, between, equals, exists
2. "between" operator shows two value inputs
3. Form prevents invalid criteria (e.g., between 10 and 5)
4. Operator selection adapts form fields appropriately

### Story 5.4: Criteria Library View

1. Criteria organized by market/asset type tabs
2. Each tab shows criteria count and last modified date
3. Criteria within tabs are sortable via drag-and-drop
4. Search/filter criteria by name works

### Story 5.5: Copy Criteria Set

1. "Copy to..." action available on criteria sets
2. User can select target market for copy
3. Copied criteria get "(Copy)" suffix
4. Confirmation shows count of copied criteria

### Story 5.6: Compare Criteria Sets

1. User can select two criteria sets to compare
2. Side-by-side comparison shows criteria differences
3. Average scores per set displayed (across sample assets)
4. Assets with different rankings highlighted

### Story 5.7: Criteria Preview

1. "Preview Impact" button available during editing
2. Preview shows top 10 scoring assets with current criteria
3. Preview updates live as criteria modified
4. Shows comparison: improved/worse/same counts

### Story 5.8: Score Calculation Engine

1. Algorithm iterates: criteria → markets → assets → fundamentals check → evaluate
2. Calculation uses decimal.js for all math operations
3. 4 events emitted: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED
4. Calculation is deterministic (same inputs = same output)

### Story 5.9: Store Historical Scores

1. Score history retained for 2 years
2. Can query: "score for asset X on date Y"
3. Historical scores not overwritten, always appended
4. Supports trend queries: last 30/60/90 days

### Story 5.10: View Asset Score

1. Score displayed as badge with color coding (green 80+, amber 50-79, red <50)
2. Score tooltip shows: "Score: 87 - Click for breakdown"
3. Assets without scores show "Not scored" indicator
4. Score freshness timestamp visible

### Story 5.11: Score Breakdown View

1. Click score badge opens breakdown panel (Sheet component)
2. Breakdown shows overall score prominently
3. Each criterion shows: name, condition, points awarded, pass/fail
4. Visual bar chart of point contributions
5. Link to edit criteria from breakdown view
6. Event audit link: "View calculation history"

---

## Traceability Mapping

| AC #     | Spec Section                       | Component/API             | Test Approach                            |
| -------- | ---------------------------------- | ------------------------- | ---------------------------------------- |
| 5.1.1    | Data Models - CriterionRule        | POST /api/criteria        | Unit: schema validation                  |
| 5.1.2    | APIs - POST /api/criteria          | CriteriaService           | Integration: API test with invalid input |
| 5.1.3    | APIs - GET /api/criteria           | criteria/page.tsx         | E2E: create and verify visible           |
| 5.1.4    | Components                         | CriteriaBlock             | Component test: Storybook                |
| 5.2.1-4  | Data Models                        | CriteriaBlock             | Unit: validation, visual                 |
| 5.3.1-4  | Data Models - operators            | CriteriaBlock             | Unit: operator form logic                |
| 5.4.1-4  | APIs - GET /api/criteria           | criteria/page.tsx         | E2E: library navigation                  |
| 5.5.1-4  | APIs - POST /api/criteria/:id/copy | CriteriaService           | Integration: copy operation              |
| 5.6.1-4  | APIs - POST /api/criteria/compare  | CriteriaComparisonService | Unit: comparison logic                   |
| 5.7.1-4  | APIs - POST /api/criteria/preview  | QuickCalcService          | Unit: preview calculation                |
| 5.8.1-4  | Workflows - Score Calculation      | ScoringEngine             | Unit: algorithm correctness              |
| 5.9.1-4  | Data Models - scoreHistory         | ScoreQueryService         | Integration: history queries             |
| 5.10.1-4 | Components                         | ScoreBadge                | Component test, E2E                      |
| 5.11.1-6 | Components                         | ScoreBreakdown            | E2E: full breakdown flow                 |

---

## Risks, Assumptions, Open Questions

### Risks

| Risk                                                 | Probability | Impact | Mitigation                                                               |
| ---------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------ |
| **R1:** Scoring algorithm complexity leads to bugs   | Medium      | High   | Extensive unit tests with known inputs/outputs; property-based testing   |
| **R2:** Quick-calc preview too slow with many assets | Low         | Medium | Limit sample size to 20 assets; use cached data only                     |
| **R3:** Criteria versioning storage grows unbounded  | Low         | Low    | Archive versions older than 2 years; only keep active + last 10 versions |
| **R4:** User creates criteria that never match       | Medium      | Low    | Preview mode shows zero matches warning; validation hints                |

### Assumptions

| Assumption                                            | Validation Approach                                           |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| **A1:** Asset fundamentals data available from Epic 6 | Mock data for Epic 5; real integration tested in Epic 6       |
| **A2:** Users understand scoring criteria concepts    | Provide templates and examples; inline help text              |
| **A3:** 20 assets sufficient for preview accuracy     | User testing; adjust sample size if feedback indicates issues |

### Open Questions

| Question                                                                   | Owner    | Target Resolution                                                |
| -------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| **Q1:** Should criteria support custom formulas (e.g., "PE \* PB < 22.5")? | PM       | Deferred to Growth - MVP uses simple operators only              |
| **Q2:** Maximum criteria per set?                                          | Dev Team | Propose 50 criteria per set; review based on performance testing |

---

## Test Strategy Summary

### Unit Tests

- **ScoringEngine:** Property-based tests ensuring determinism; boundary values for operators
- **decimal.js calculations:** Precision tests with known financial edge cases (0.1 + 0.2, currency rounding)
- **Criterion evaluation:** Each operator type with various inputs
- **Zod schemas:** Invalid input rejection

### Integration Tests

- **API endpoints:** CRUD operations, validation errors, user isolation
- **Database operations:** Criteria versioning, score history queries
- **Event emission:** Verify 4 events per calculation

### E2E Tests

- **Criteria management flow:** Create → Edit → Copy → Delete
- **Score viewing flow:** Asset list → Click score → View breakdown
- **Preview flow:** Edit criteria → Preview impact → Save

### Test Data

- Sample criteria sets for different markets (BR_BANKS, US_TECH, BR_REITS)
- Mock asset fundamentals with known values for deterministic testing
- Edge cases: missing fundamentals, zero values, negative points

---

_Generated by epic-tech-context workflow v1.0_
_For: Epic 5 - Scoring Engine_
_Date: 2025-12-05_
