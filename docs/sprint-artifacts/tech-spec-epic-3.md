# Epic Technical Specification: Portfolio Core

Date: 2025-12-03
Author: Bmad
Epic ID: 3
Status: Complete

---

## Overview

Epic 3 establishes the core portfolio management capabilities for Investments Planner. This epic enables users to create portfolios, add and manage assets, view holdings with multi-currency support, track allocation percentages, and record investment history. These capabilities form the foundation upon which scoring, recommendations, and the entire investment decision workflow are built.

The portfolio module is central to the product's value proposition: transforming a 3-hour monthly spreadsheet process into a 5-minute decision workflow. Users must be able to efficiently manage their holdings with financial-grade precision before the system can generate meaningful recommendations.

**Key Value Delivered:**

- Users can track all investment holdings in one place
- Multi-currency portfolios display correctly in user's base currency
- Allocation percentages provide instant portfolio health visibility
- Investment history enables tracking and analysis of past decisions

## Objectives and Scope

### In Scope

- **Portfolio CRUD Operations:** Create, read, update, delete portfolios (FR9)
- **Asset Management:** Add, update, remove assets with quantity/price (FR10-FR12)
- **Ignore Functionality:** Mark assets as ignored for allocation exclusion (FR13)
- **Portfolio View:** Display holdings with values in base currency (FR14)
- **Dual Currency Display:** Show values in original and base currency (FR43)
- **Allocation Visualization:** Current percentages by class/subclass (FR15)
- **Investment Recording:** Record actual invested amounts (FR16)
- **History Tracking:** View investment history timeline (FR17)

### Out of Scope (Addressed in Other Epics)

- Asset class/subclass configuration (Epic 4)
- Scoring and criteria configuration (Epic 5)
- External data fetching (Epic 6)
- Recommendations generation (Epic 7)
- Overnight processing (Epic 8)

### Dependencies

| Dependency                         | Source             | Required For                |
| ---------------------------------- | ------------------ | --------------------------- |
| User authentication                | Epic 1 (Story 1.3) | All portfolio operations    |
| Database schema with fintech types | Epic 1 (Story 1.2) | Data persistence            |
| App shell layout                   | Epic 1 (Story 1.8) | Portfolio UI navigation     |
| Base currency setting              | Epic 2 (Story 2.6) | Currency conversion display |
| decimal.js configuration           | Epic 1 (Story 1.2) | Financial calculations      |

## System Architecture Alignment

### Architecture Components Referenced

| Component                | Architecture Section | Epic 3 Usage                        |
| ------------------------ | -------------------- | ----------------------------------- |
| **Drizzle ORM**          | Technology Stack     | Portfolio/asset CRUD operations     |
| **PostgreSQL numeric**   | Data Architecture    | Quantity, price, value storage      |
| **decimal.js**           | Precision Strategy   | All monetary calculations           |
| **React Query**          | State Management     | Portfolio data fetching/caching     |
| **shadcn/ui Data Table** | Component Library    | Asset listing with sort/filter      |
| **CurrencyDisplay**      | Custom Components    | Dual currency value display         |
| **AllocationGauge**      | Custom Components    | Allocation percentage visualization |

### Architectural Constraints

1. **All monetary values use `numeric(19,4)` in PostgreSQL** - Never float/double
2. **All calculations use decimal.js** - Configured with precision: 20, ROUND_HALF_UP
3. **Multi-tenant isolation** - All queries scoped by `user_id`
4. **Event sourcing** - Investment records emit audit events
5. **Server-first rendering** - Portfolio pages use Server Components where possible

### File Structure Alignment

```
src/
├── app/(dashboard)/
│   ├── portfolio/
│   │   ├── page.tsx              # Portfolio overview (FR14, FR15)
│   │   └── [assetId]/page.tsx    # Asset detail view
│   └── history/
│       └── page.tsx              # Investment history (FR17)
├── components/
│   ├── fintech/
│   │   ├── currency-display.tsx  # Dual currency (FR43)
│   │   └── allocation-gauge.tsx  # Allocation viz (FR15)
│   └── portfolio/
│       ├── portfolio-table.tsx   # Asset listing
│       ├── add-asset-modal.tsx   # Add asset form (FR10)
│       └── investment-form.tsx   # Record investment (FR16)
├── lib/
│   ├── db/
│   │   └── schema.ts             # portfolios, assets tables
│   ├── services/
│   │   └── portfolio-service.ts  # Business logic
│   └── calculations/
│       ├── allocation.ts         # Allocation math
│       └── currency.ts           # Conversion logic
└── hooks/
    └── use-portfolio.ts          # React Query hooks
```

## Detailed Design

### Services and Modules

| Service/Module           | Responsibility                                           | Location                              |
| ------------------------ | -------------------------------------------------------- | ------------------------------------- |
| **PortfolioService**     | Portfolio CRUD, asset management, allocation calculation | `lib/services/portfolio-service.ts`   |
| **AllocationCalculator** | Percentage calculations with decimal.js precision        | `lib/calculations/allocation.ts`      |
| **CurrencyConverter**    | Multi-currency conversion using stored exchange rates    | `lib/calculations/currency.ts`        |
| **InvestmentService**    | Record investments, update holdings, emit audit events   | `lib/services/investment-service.ts`  |
| **PortfolioRepository**  | Database queries for portfolios and assets               | `lib/db/queries/portfolio-queries.ts` |

#### PortfolioService Interface

```typescript
// lib/services/portfolio-service.ts
interface PortfolioService {
  // Portfolio operations
  createPortfolio(userId: string, name: string): Promise<Portfolio>;
  getPortfolio(userId: string, portfolioId: string): Promise<Portfolio>;
  getUserPortfolios(userId: string): Promise<Portfolio[]>;
  updatePortfolio(
    userId: string,
    portfolioId: string,
    data: UpdatePortfolioInput
  ): Promise<Portfolio>;
  deletePortfolio(userId: string, portfolioId: string): Promise<void>;

  // Asset operations
  addAsset(userId: string, portfolioId: string, asset: AddAssetInput): Promise<Asset>;
  updateAsset(userId: string, assetId: string, data: UpdateAssetInput): Promise<Asset>;
  removeAsset(userId: string, assetId: string): Promise<void>;
  toggleAssetIgnored(userId: string, assetId: string): Promise<Asset>;

  // Calculations
  getPortfolioWithValues(
    userId: string,
    portfolioId: string,
    baseCurrency: string
  ): Promise<PortfolioWithValues>;
  getAllocations(userId: string, portfolioId: string): Promise<AllocationBreakdown>;
}
```

#### AllocationCalculator

```typescript
// lib/calculations/allocation.ts
import { Decimal } from "@/lib/calculations/decimal-config";

export function calculateAllocationPercentage(assetValue: string, totalValue: string): string {
  const asset = new Decimal(assetValue);
  const total = new Decimal(totalValue);
  if (total.isZero()) return "0";
  return asset.dividedBy(total).times(100).toFixed(4);
}

export function calculateAssetValue(quantity: string, price: string): string {
  return new Decimal(quantity).times(price).toFixed(4);
}

export function aggregateByClass(
  assets: AssetWithValue[],
  classes: AssetClass[]
): ClassAllocation[] {
  // Group assets by class, sum values, calculate percentages
}
```

### Data Models and Contracts

#### Database Schema (Drizzle)

```typescript
// lib/db/schema.ts - Epic 3 additions

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const portfolioAssets = pgTable(
  "portfolio_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 100 }),
    quantity: numeric("quantity", { precision: 19, scale: 8 }).notNull(),
    purchasePrice: numeric("purchase_price", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    assetClassId: uuid("asset_class_id").references(() => assetClasses.id),
    subclassId: uuid("subclass_id").references(() => assetSubclasses.id),
    isIgnored: boolean("is_ignored").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    portfolioSymbolUnique: unique().on(table.portfolioId, table.symbol),
    portfolioIdIdx: index("portfolio_assets_portfolio_id_idx").on(table.portfolioId),
  })
);

export const investments = pgTable(
  "investments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => portfolioAssets.id),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    quantity: numeric("quantity", { precision: 19, scale: 8 }).notNull(),
    pricePerUnit: numeric("price_per_unit", { precision: 19, scale: 4 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    recommendedAmount: numeric("recommended_amount", { precision: 19, scale: 4 }),
    investedAt: timestamp("invested_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("investments_user_id_idx").on(table.userId),
    investedAtIdx: index("investments_invested_at_idx").on(table.investedAt),
  })
);

// Relations
export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, { fields: [portfolios.userId], references: [users.id] }),
  assets: many(portfolioAssets),
  investments: many(investments),
}));

export const portfolioAssetsRelations = relations(portfolioAssets, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioAssets.portfolioId],
    references: [portfolios.id],
  }),
  assetClass: one(assetClasses, {
    fields: [portfolioAssets.assetClassId],
    references: [assetClasses.id],
  }),
  subclass: one(assetSubclasses, {
    fields: [portfolioAssets.subclassId],
    references: [assetSubclasses.id],
  }),
}));
```

#### TypeScript Types

```typescript
// types/portfolio.ts

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string | null;
  quantity: string; // Stored as string for decimal precision
  purchasePrice: string; // Stored as string for decimal precision
  currency: string;
  assetClassId: string | null;
  subclassId: string | null;
  isIgnored: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetWithValue extends Asset {
  currentPrice: string;
  valueNative: string; // quantity × currentPrice
  valueBase: string; // valueNative converted to base currency
  exchangeRate: string;
  allocationPercent: string;
}

export interface PortfolioWithValues {
  portfolio: Portfolio;
  assets: AssetWithValue[];
  totalValueBase: string;
  baseCurrency: string;
  dataFreshness: Date;
}

export interface Investment {
  id: string;
  userId: string;
  portfolioId: string;
  assetId: string;
  symbol: string;
  quantity: string;
  pricePerUnit: string;
  totalAmount: string;
  currency: string;
  recommendedAmount: string | null;
  investedAt: Date;
}

export interface AllocationBreakdown {
  byClass: ClassAllocation[];
  bySubclass: SubclassAllocation[];
  totalValue: string;
  baseCurrency: string;
}

export interface ClassAllocation {
  classId: string;
  className: string;
  value: string;
  percentage: string;
  assetCount: number;
  targetMin?: string;
  targetMax?: string;
  status: "under" | "on-target" | "over";
}
```

#### Zod Schemas (API Validation)

```typescript
// lib/validations/portfolio.ts
import { z } from "zod";

export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(50),
});

export const addAssetSchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase(),
  name: z.string().max(100).optional(),
  quantity: z.string().refine((val) => parseFloat(val) > 0, "Quantity must be positive"),
  purchasePrice: z.string().refine((val) => parseFloat(val) > 0, "Price must be positive"),
  currency: z.string().length(3),
  assetClassId: z.string().uuid().optional(),
  subclassId: z.string().uuid().optional(),
});

export const updateAssetSchema = z.object({
  quantity: z
    .string()
    .refine((val) => parseFloat(val) > 0)
    .optional(),
  purchasePrice: z
    .string()
    .refine((val) => parseFloat(val) > 0)
    .optional(),
  assetClassId: z.string().uuid().nullable().optional(),
  subclassId: z.string().uuid().nullable().optional(),
});

export const recordInvestmentSchema = z.object({
  investments: z.array(
    z.object({
      assetId: z.string().uuid(),
      quantity: z.string().refine((val) => parseFloat(val) > 0),
      pricePerUnit: z.string().refine((val) => parseFloat(val) > 0),
      totalAmount: z.string().refine((val) => parseFloat(val) >= 0),
    })
  ),
});
```

### APIs and Interfaces

#### REST API Endpoints

| Method | Endpoint                          | Description               | Request Body          | Response                        |
| ------ | --------------------------------- | ------------------------- | --------------------- | ------------------------------- |
| GET    | `/api/portfolios`                 | List user portfolios      | -                     | `{ data: Portfolio[] }`         |
| POST   | `/api/portfolios`                 | Create portfolio          | `{ name }`            | `{ data: Portfolio }`           |
| GET    | `/api/portfolios/:id`             | Get portfolio with assets | -                     | `{ data: PortfolioWithValues }` |
| PATCH  | `/api/portfolios/:id`             | Update portfolio          | `{ name }`            | `{ data: Portfolio }`           |
| DELETE | `/api/portfolios/:id`             | Delete portfolio          | -                     | `{ success: true }`             |
| GET    | `/api/portfolios/:id/assets`      | List assets               | -                     | `{ data: AssetWithValue[] }`    |
| POST   | `/api/portfolios/:id/assets`      | Add asset                 | AddAssetInput         | `{ data: Asset }`               |
| PATCH  | `/api/assets/:id`                 | Update asset              | UpdateAssetInput      | `{ data: Asset }`               |
| DELETE | `/api/assets/:id`                 | Remove asset              | -                     | `{ success: true }`             |
| PATCH  | `/api/assets/:id/ignore`          | Toggle ignored            | -                     | `{ data: Asset }`               |
| GET    | `/api/portfolios/:id/allocations` | Get allocation breakdown  | -                     | `{ data: AllocationBreakdown }` |
| POST   | `/api/investments`                | Record investments        | RecordInvestmentInput | `{ data: Investment[] }`        |
| GET    | `/api/investments`                | Get investment history    | `?from&to`            | `{ data: Investment[], meta }`  |

#### API Route Implementation Pattern

```typescript
// app/api/portfolios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { portfolioService } from "@/lib/services/portfolio-service";
import { createPortfolioSchema } from "@/lib/validations/portfolio";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const portfolios = await portfolioService.getUserPortfolios(session.userId);
    return NextResponse.json({ data: portfolios });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name } = createPortfolioSchema.parse(body);

    const portfolio = await portfolioService.createPortfolio(session.userId, name);
    return NextResponse.json({ data: portfolio }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Workflows and Sequencing

#### Flow 1: Add Asset to Portfolio

```
User clicks "Add Asset"
    │
    ▼
┌─────────────────────────────────────┐
│  AddAssetModal opens                │
│  - Ticker autocomplete              │
│  - Quantity input (decimal)         │
│  - Purchase price input             │
│  - Currency selector                │
│  - Asset class selector (optional)  │
└──────────────┬──────────────────────┘
               │ Submit
               ▼
┌─────────────────────────────────────┐
│  Client-side validation (Zod)       │
│  - quantity > 0                     │
│  - price > 0                        │
│  - symbol not duplicate             │
└──────────────┬──────────────────────┘
               │ Valid
               ▼
┌─────────────────────────────────────┐
│  POST /api/portfolios/:id/assets    │
│  - Auth check                       │
│  - Server validation                │
│  - Insert to portfolio_assets       │
└──────────────┬──────────────────────┘
               │ Success
               ▼
┌─────────────────────────────────────┐
│  React Query invalidates cache      │
│  Portfolio table refreshes          │
│  Toast: "Asset added"               │
│  Modal closes                       │
└─────────────────────────────────────┘
```

#### Flow 2: Record Investment

```
User on Dashboard with recommendations
    │
    ▼
┌─────────────────────────────────────┐
│  Click "Confirm Investments"        │
│  ConfirmationModal opens            │
│  - List of recommended amounts      │
│  - Editable actual amounts          │
│  - Total calculation                │
└──────────────┬──────────────────────┘
               │ Confirm
               ▼
┌─────────────────────────────────────┐
│  POST /api/investments              │
│  Transaction:                       │
│  1. Create investment records       │
│  2. Update portfolio_assets qty     │
│  3. Emit INVESTMENT_RECORDED event  │
└──────────────┬──────────────────────┘
               │ Success
               ▼
┌─────────────────────────────────────┐
│  Invalidate portfolio cache         │
│  Invalidate recommendations cache   │
│  Show updated allocations           │
│  Toast: "November investments       │
│          recorded"                  │
└─────────────────────────────────────┘
```

#### Flow 3: Portfolio Overview Load

```
User navigates to /portfolio
    │
    ▼
┌─────────────────────────────────────┐
│  Server Component fetches:          │
│  - Portfolio data                   │
│  - Asset list with current prices   │
│  - Exchange rates                   │
│  - Allocation calculations          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  For each asset:                    │
│  1. Get current price (cache/DB)    │
│  2. Calculate valueNative           │
│  3. Convert to base currency        │
│  4. Calculate allocation %          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Render:                            │
│  - Metrics row (total value, etc)   │
│  - Allocation charts/gauges         │
│  - Asset table with dual currency   │
│  - DataFreshnessBadge               │
└─────────────────────────────────────┘
```

## Non-Functional Requirements

### Performance

| Requirement            | Target                 | Implementation                              |
| ---------------------- | ---------------------- | ------------------------------------------- |
| Portfolio page load    | < 2 seconds            | Server Components, pre-computed allocations |
| Asset table render     | < 500ms for 100 assets | Virtual scrolling if > 50 assets            |
| Add/update asset       | < 500ms response       | Optimistic UI updates                       |
| Allocation calculation | < 100ms                | decimal.js optimized, memoization           |
| Investment recording   | < 1 second             | Single transaction, batch insert            |

**Caching Strategy:**

| Data                 | Cache Location | TTL      | Invalidation Trigger    |
| -------------------- | -------------- | -------- | ----------------------- |
| Portfolio list       | React Query    | 5 min    | Create/delete portfolio |
| Asset list           | React Query    | 5 min    | Add/update/remove asset |
| Allocation breakdown | React Query    | 5 min    | Any asset change        |
| Exchange rates       | Vercel KV      | 24 hours | Daily refresh job       |
| Current prices       | Vercel KV      | 24 hours | Daily refresh job       |

**Database Optimization:**

```sql
-- Required indexes for Epic 3 queries
CREATE INDEX portfolio_assets_portfolio_id_idx ON portfolio_assets(portfolio_id);
CREATE INDEX investments_user_id_idx ON investments(user_id);
CREATE INDEX investments_invested_at_idx ON investments(invested_at);
CREATE UNIQUE INDEX portfolio_assets_portfolio_symbol_uniq ON portfolio_assets(portfolio_id, symbol);
```

### Security

| Requirement          | Implementation                               | PRD Reference          |
| -------------------- | -------------------------------------------- | ---------------------- |
| **Authentication**   | All API routes require valid JWT             | NFR Security           |
| **Authorization**    | All queries scoped by `user_id` from session | Multi-tenant isolation |
| **Input validation** | Zod schemas on all endpoints                 | API security           |
| **SQL injection**    | Drizzle parameterized queries only           | OWASP Top 10           |
| **Data isolation**   | Never return data for other users            | Tenant isolation       |

**Authorization Pattern:**

```typescript
// Every portfolio query MUST include userId filter
async getPortfolio(userId: string, portfolioId: string) {
  const portfolio = await db.query.portfolios.findFirst({
    where: and(
      eq(portfolios.id, portfolioId),
      eq(portfolios.userId, userId)  // CRITICAL: Always filter by userId
    )
  });

  if (!portfolio) {
    throw new NotFoundError('Portfolio not found');
  }

  return portfolio;
}
```

**Sensitive Data Handling:**

- Portfolio values are sensitive financial data
- Never log full portfolio contents
- API responses exclude internal IDs where possible
- Investment amounts not logged in plain text

### Reliability/Availability

| Requirement               | Target                                 | Implementation                       |
| ------------------------- | -------------------------------------- | ------------------------------------ |
| **Data durability**       | No data loss                           | PostgreSQL with daily backups        |
| **Transaction integrity** | ACID compliance                        | Drizzle transactions for investments |
| **Graceful degradation**  | Show cached data if prices unavailable | Fallback to last known prices        |
| **Error recovery**        | User can retry failed operations       | Idempotent API design where possible |

**Transaction Pattern for Investments:**

```typescript
// Recording investments MUST be atomic
async recordInvestments(userId: string, investments: InvestmentInput[]) {
  return await db.transaction(async (tx) => {
    const records: Investment[] = [];

    for (const inv of investments) {
      // 1. Create investment record
      const [record] = await tx.insert(investmentsTable).values({
        userId,
        ...inv,
        investedAt: new Date()
      }).returning();

      // 2. Update portfolio asset quantity
      await tx.update(portfolioAssets)
        .set({
          quantity: sql`${portfolioAssets.quantity} + ${inv.quantity}`,
          updatedAt: new Date()
        })
        .where(eq(portfolioAssets.id, inv.assetId));

      records.push(record);
    }

    // 3. Emit audit event
    await tx.insert(calculationEvents).values({
      correlationId: crypto.randomUUID(),
      userId,
      eventType: 'INVESTMENT_RECORDED',
      payload: { investments: records.map(r => r.id) }
    });

    return records;
  });
}
```

**Error Handling:**

| Error Type          | User Experience              | Recovery             |
| ------------------- | ---------------------------- | -------------------- |
| Network error       | Toast with retry button      | Automatic retry (3x) |
| Validation error    | Inline field errors          | User corrects input  |
| Duplicate asset     | "Asset already in portfolio" | User edits existing  |
| Portfolio not found | Redirect to portfolio list   | Create new portfolio |

### Observability

| Metric                            | Type      | Purpose                 |
| --------------------------------- | --------- | ----------------------- |
| `portfolio.load.duration`         | Histogram | Page load performance   |
| `asset.add.count`                 | Counter   | Feature usage tracking  |
| `investment.record.count`         | Counter   | Core action tracking    |
| `allocation.calculation.duration` | Histogram | Calculation performance |
| `api.portfolio.errors`            | Counter   | Error rate monitoring   |

**Structured Logging:**

```typescript
// Log portfolio operations with context
logger.info("Asset added", {
  userId: session.userId,
  portfolioId,
  symbol: asset.symbol,
  currency: asset.currency,
  // Never log: quantity, price, value (sensitive)
});

logger.info("Investment recorded", {
  userId: session.userId,
  portfolioId,
  assetCount: investments.length,
  // Never log: amounts, prices (sensitive)
});
```

**Error Tracking:**

- All unhandled errors logged with stack trace
- User-facing errors include correlation ID
- Error toast: "Something went wrong. Reference: ABC123"

## Dependencies and Integrations

### NPM Dependencies (from package.json)

#### Core Framework

| Package     | Version | Epic 3 Usage                              |
| ----------- | ------- | ----------------------------------------- |
| `next`      | 16.0.5  | App Router, API routes, Server Components |
| `react`     | 19.2.0  | UI components                             |
| `react-dom` | 19.2.0  | DOM rendering                             |

#### Database & ORM

| Package       | Version       | Epic 3 Usage                          |
| ------------- | ------------- | ------------------------------------- |
| `drizzle-orm` | ^0.44.7       | Portfolio/asset queries, transactions |
| `postgres`    | ^3.4.7        | PostgreSQL driver                     |
| `drizzle-kit` | ^0.31.7 (dev) | Schema migrations                     |

#### Financial Precision

| Package      | Version | Epic 3 Usage                             |
| ------------ | ------- | ---------------------------------------- |
| `decimal.js` | ^10.6.0 | **CRITICAL** - All monetary calculations |

#### Forms & Validation

| Package               | Version | Epic 3 Usage                            |
| --------------------- | ------- | --------------------------------------- |
| `react-hook-form`     | ^7.67.0 | Add asset form, investment confirmation |
| `@hookform/resolvers` | ^5.2.2  | Zod integration                         |
| `zod`                 | ^4.1.13 | API input validation                    |

#### UI Components (Radix/shadcn)

| Package                         | Version  | Epic 3 Usage                        |
| ------------------------------- | -------- | ----------------------------------- |
| `@radix-ui/react-dialog`        | ^1.1.15  | Add asset modal, confirmation modal |
| `@radix-ui/react-dropdown-menu` | ^2.1.16  | Asset actions menu                  |
| `@radix-ui/react-select`        | ^2.2.6   | Currency selector                   |
| `@radix-ui/react-tabs`          | ^1.1.13  | Portfolio overview/assets tabs      |
| `@radix-ui/react-tooltip`       | ^1.2.8   | Value tooltips                      |
| `@radix-ui/react-progress`      | ^1.1.8   | Allocation gauge                    |
| `lucide-react`                  | ^0.555.0 | Icons                               |
| `sonner`                        | ^2.0.7   | Toast notifications                 |

#### Caching

| Package      | Version | Epic 3 Usage                       |
| ------------ | ------- | ---------------------------------- |
| `@vercel/kv` | ^3.0.0  | Exchange rates cache, prices cache |

#### Observability

| Package                   | Version | Epic 3 Usage            |
| ------------------------- | ------- | ----------------------- |
| `@opentelemetry/api`      | ^1.9.0  | Tracing API             |
| `@opentelemetry/sdk-node` | ^0.57.2 | Node.js instrumentation |

#### Testing

| Package            | Version | Epic 3 Usage                  |
| ------------------ | ------- | ----------------------------- |
| `vitest`           | ^4.0.14 | Unit tests for calculations   |
| `@playwright/test` | ^1.57.0 | E2E tests for portfolio flows |

### New Dependencies Required

No new dependencies required for Epic 3. All necessary packages are already installed.

### Integration Points

#### Internal Integrations (Other Epics)

| Integration        | Source Epic        | Required For                              |
| ------------------ | ------------------ | ----------------------------------------- |
| Auth middleware    | Epic 1 (Story 1.3) | All API routes                            |
| User base currency | Epic 2 (Story 2.6) | Currency conversion display               |
| Asset classes      | Epic 4             | Asset classification (optional in Epic 3) |
| Exchange rates     | Epic 6             | Currency conversion                       |
| Current prices     | Epic 6             | Portfolio valuation                       |

#### External Integrations

| Integration    | Provider         | Epic 3 Dependency                         |
| -------------- | ---------------- | ----------------------------------------- |
| Exchange rates | Epic 6 providers | **Deferred** - Uses cached rates from DB  |
| Asset prices   | Epic 6 providers | **Deferred** - Uses cached prices from DB |

**Note:** Epic 3 does NOT directly call external APIs. It consumes data that Epic 6 fetches and caches. This decoupling ensures portfolio operations work even if external APIs are unavailable.

### Database Dependencies

```
portfolios
├── users (FK: user_id)
└── portfolio_assets (1:N)
    ├── asset_classes (FK: asset_class_id, optional)
    └── asset_subclasses (FK: subclass_id, optional)

investments
├── users (FK: user_id)
├── portfolios (FK: portfolio_id)
└── portfolio_assets (FK: asset_id)
```

### Feature Flags / Configuration

| Flag                              | Default | Purpose                      |
| --------------------------------- | ------- | ---------------------------- |
| `MAX_PORTFOLIOS_PER_USER`         | 5       | MVP limit on portfolio count |
| `MAX_ASSETS_PER_PORTFOLIO`        | 100     | Performance guard            |
| `ENABLE_ALLOCATION_VISUALIZATION` | true    | Feature toggle for charts    |

## Acceptance Criteria (Authoritative)

### AC-3.1: Portfolio Creation (FR9)

1. **Given** I am logged in with no portfolios, **When** I click "Create Portfolio" and enter a valid name (1-50 chars), **Then** a new portfolio is created and I see the empty portfolio view
2. **Given** I have 5 portfolios, **When** I try to create another, **Then** I see "Maximum portfolios reached (5)"
3. **Given** I create a portfolio, **Then** it appears in my portfolio list within 500ms

### AC-3.2: Add Asset (FR10)

1. **Given** I have a portfolio, **When** I click "Add Asset" and enter valid ticker/quantity/price, **Then** the asset is added with calculated total value
2. **Given** I enter quantity ≤ 0 or price ≤ 0, **Then** validation error appears inline
3. **Given** I enter a duplicate ticker, **Then** I see "Asset already in portfolio"
4. **Given** I add an asset, **Then** quantity accepts up to 8 decimal places (for crypto)
5. **Given** I add an asset, **Then** purchase price stored with 4 decimal precision

### AC-3.3: Update Asset (FR11)

1. **Given** I click on an asset row, **When** I edit quantity or price and blur, **Then** changes auto-save with success indicator
2. **Given** I update quantity, **Then** total value recalculates immediately using decimal.js
3. **Given** I update price, **Then** updated_at timestamp is recorded

### AC-3.4: Remove Asset (FR12)

1. **Given** I click delete on an asset, **Then** confirmation dialog shows: "Remove [TICKER]? This cannot be undone."
2. **Given** I confirm deletion, **Then** asset is removed and portfolio totals recalculate
3. **Given** I cancel deletion, **Then** asset remains unchanged

### AC-3.5: Ignore Asset (FR13)

1. **Given** I toggle "Ignore" on an asset, **Then** it shows visual indicator (strikethrough/badge)
2. **Given** an asset is ignored, **Then** it's excluded from allocation percentage calculations
3. **Given** an asset is ignored, **Then** it still counts toward total portfolio value
4. **Given** I toggle ignore off, **Then** asset returns to active state immediately

### AC-3.6: Portfolio Holdings View (FR14)

1. **Given** I navigate to Portfolio page, **Then** I see table with: Ticker, Quantity, Price, Value (native), Value (base), Allocation %
2. **Given** portfolio has assets, **Then** total portfolio value displays prominently at top
3. **Given** table loads, **Then** it is sortable by any column
4. **Given** I have >10 assets, **Then** search/filter by ticker is available

### AC-3.7: Dual Currency Display (FR43)

1. **Given** an asset has currency different from base, **Then** I see both native value (e.g., R$ 5,000) and base value (e.g., $1,000)
2. **Given** dual currency display, **Then** exchange rate indicator shows (e.g., "rate: 5.0")
3. **Given** exchange rate is >24h old, **Then** DataFreshnessBadge shows amber warning

### AC-3.8: Allocation Percentages (FR15)

1. **Given** I view Portfolio Overview, **Then** I see allocation percentages by asset class
2. **Given** allocation view, **Then** percentages display with 1 decimal (e.g., 42.5%)
3. **Given** allocation view, **Then** colors indicate: green (on target), amber (near), red (out of range)
4. **Given** I click a class, **Then** subclass breakdown expands

### AC-3.9: Record Investment (FR16)

1. **Given** I confirm an investment, **Then** investment record includes: date, ticker, quantity, price, total, currency
2. **Given** investment is recorded, **Then** portfolio asset quantity updates automatically
3. **Given** investment succeeds, **Then** toast shows "November investments recorded" (dynamic month)

### AC-3.10: Investment History (FR17)

1. **Given** I navigate to History, **Then** I see timeline with: Date, Total Invested, Assets Count
2. **Given** I click a history entry, **Then** it expands showing individual assets and amounts
3. **Given** history view, **Then** recommended vs. actual amounts are distinguishable
4. **Given** I click "Export", **Then** CSV downloads with complete history

## Traceability Mapping

| AC ID     | FR   | Spec Section                    | Component(s)                 | API Endpoint(s)                     | Test Type   |
| --------- | ---- | ------------------------------- | ---------------------------- | ----------------------------------- | ----------- |
| AC-3.1.1  | FR9  | Services/PortfolioService       | CreatePortfolioModal         | POST /api/portfolios                | Unit, E2E   |
| AC-3.1.2  | FR9  | Services/PortfolioService       | CreatePortfolioModal         | POST /api/portfolios                | Unit        |
| AC-3.1.3  | FR9  | NFR/Performance                 | -                            | POST /api/portfolios                | Performance |
| AC-3.2.1  | FR10 | Data Models, APIs               | AddAssetModal                | POST /api/portfolios/:id/assets     | Unit, E2E   |
| AC-3.2.2  | FR10 | Zod Schemas                     | AddAssetModal                | -                                   | Unit        |
| AC-3.2.3  | FR10 | Data Models (unique constraint) | AddAssetModal                | POST /api/portfolios/:id/assets     | Unit        |
| AC-3.2.4  | FR10 | Data Models (numeric 19,8)      | AddAssetModal                | -                                   | Unit        |
| AC-3.2.5  | FR10 | Data Models (numeric 19,4)      | -                            | -                                   | Unit        |
| AC-3.3.1  | FR11 | Workflows/Add Asset             | PortfolioTable (inline edit) | PATCH /api/assets/:id               | E2E         |
| AC-3.3.2  | FR11 | AllocationCalculator            | PortfolioTable               | -                                   | Unit        |
| AC-3.3.3  | FR11 | Data Models                     | -                            | PATCH /api/assets/:id               | Unit        |
| AC-3.4.1  | FR12 | UX Patterns                     | DeleteAssetDialog            | -                                   | E2E         |
| AC-3.4.2  | FR12 | Services/PortfolioService       | PortfolioTable               | DELETE /api/assets/:id              | Unit, E2E   |
| AC-3.4.3  | FR12 | UX Patterns                     | DeleteAssetDialog            | -                                   | E2E         |
| AC-3.5.1  | FR13 | UX Patterns                     | PortfolioTable               | PATCH /api/assets/:id/ignore        | E2E         |
| AC-3.5.2  | FR13 | AllocationCalculator            | -                            | -                                   | Unit        |
| AC-3.5.3  | FR13 | AllocationCalculator            | PortfolioSummary             | -                                   | Unit        |
| AC-3.5.4  | FR13 | Services/PortfolioService       | PortfolioTable               | PATCH /api/assets/:id/ignore        | E2E         |
| AC-3.6.1  | FR14 | Data Models, APIs               | PortfolioTable               | GET /api/portfolios/:id             | E2E         |
| AC-3.6.2  | FR14 | Workflows/Portfolio Load        | MetricsRow                   | GET /api/portfolios/:id             | E2E         |
| AC-3.6.3  | FR14 | UX Patterns                     | PortfolioTable (TanStack)    | -                                   | E2E         |
| AC-3.6.4  | FR14 | UX Patterns                     | PortfolioTable               | -                                   | E2E         |
| AC-3.7.1  | FR43 | CurrencyConverter               | CurrencyDisplay              | -                                   | Unit, E2E   |
| AC-3.7.2  | FR43 | CurrencyConverter               | CurrencyDisplay              | -                                   | Unit        |
| AC-3.7.3  | FR43 | NFR/Observability               | DataFreshnessBadge           | -                                   | E2E         |
| AC-3.8.1  | FR15 | AllocationCalculator            | AllocationChart              | GET /api/portfolios/:id/allocations | E2E         |
| AC-3.8.2  | FR15 | AllocationCalculator            | AllocationGauge              | -                                   | Unit        |
| AC-3.8.3  | FR15 | UX Patterns                     | AllocationGauge              | -                                   | E2E         |
| AC-3.8.4  | FR15 | Workflows/Portfolio Load        | AllocationBreakdown          | -                                   | E2E         |
| AC-3.9.1  | FR16 | Data Models/investments         | InvestmentForm               | POST /api/investments               | Unit        |
| AC-3.9.2  | FR16 | Services/InvestmentService      | -                            | POST /api/investments               | Unit        |
| AC-3.9.3  | FR16 | UX Patterns                     | Toast                        | POST /api/investments               | E2E         |
| AC-3.10.1 | FR17 | APIs                            | HistoryTimeline              | GET /api/investments                | E2E         |
| AC-3.10.2 | FR17 | Workflows                       | HistoryEntry                 | -                                   | E2E         |
| AC-3.10.3 | FR17 | Data Models                     | HistoryEntry                 | GET /api/investments                | E2E         |
| AC-3.10.4 | FR17 | APIs                            | ExportButton                 | GET /api/investments?format=csv     | E2E         |

## Risks, Assumptions, Open Questions

### Risks

| Risk ID | Description                                                                      | Impact | Probability | Mitigation                                                                                                      |
| ------- | -------------------------------------------------------------------------------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------- |
| R3.1    | **Decimal precision loss** - Float/double used accidentally in calculations      | High   | Medium      | Code review checklist, unit tests verifying decimal.js usage, ESLint rule to flag parseFloat on monetary values |
| R3.2    | **Exchange rate unavailability** - No cached rates when displaying portfolio     | Medium | Low         | Fallback to 1.0 rate with warning badge, Epic 6 ensures daily refresh                                           |
| R3.3    | **Portfolio limit bypass** - Users circumvent 5 portfolio limit                  | Low    | Low         | Server-side enforcement, not just UI validation                                                                 |
| R3.4    | **Concurrent asset updates** - Race condition when multiple tabs edit same asset | Medium | Medium      | Optimistic locking with updated_at check, or last-write-wins with notification                                  |
| R3.5    | **Investment transaction failure** - Partial commit leaves data inconsistent     | High   | Low         | Database transaction with rollback, idempotency keys                                                            |
| R3.6    | **Performance with large portfolios** - Slow load with 100+ assets               | Medium | Medium      | Virtual scrolling, pagination, server-side aggregation                                                          |

### Assumptions

| ID   | Assumption                                                                              | Validated By                                        |
| ---- | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| A3.1 | Users have already set their base currency before accessing portfolio (Epic 2 complete) | Epic 2 Story 2.6 is prerequisite                    |
| A3.2 | Asset classes are optional in Epic 3 - assets can exist without classification          | PRD allows unclassified assets                      |
| A3.3 | Exchange rates are pre-cached in DB/KV by Epic 6 overnight job                          | Architecture ADR, Epic 6 dependency                 |
| A3.4 | Current prices are available from Epic 6 data pipeline                                  | Epic 6 dependency - graceful degradation if missing |
| A3.5 | Users manage one portfolio primarily (MVP), multi-portfolio is edge case                | PRD limit of 5 portfolios                           |
| A3.6 | Quantity precision of 8 decimals sufficient for all crypto assets                       | Industry standard for Bitcoin divisibility          |

### Open Questions

| ID   | Question                                                                               | Owner     | Due               | Resolution                                                             |
| ---- | -------------------------------------------------------------------------------------- | --------- | ----------------- | ---------------------------------------------------------------------- |
| Q3.1 | Should we support fractional share display for stocks (e.g., 2.5 shares of AAPL)?      | PM        | Sprint 3 Planning | **Resolved:** Yes, quantity supports 8 decimals                        |
| Q3.2 | How do we handle assets in currencies not in our supported list?                       | Architect | Before Story 3.2  | **Resolved:** Show warning, require supported currency                 |
| Q3.3 | Should ignored assets appear in allocation charts with different styling or be hidden? | UX        | Before Story 3.7  | **Open:** Recommend hidden from charts, visible in table               |
| Q3.4 | Should investment history show unrealized gains/losses?                                | PM        | Epic 4/5          | **Deferred:** Out of scope for Epic 3, consider for Epic 5             |
| Q3.5 | What happens when user deletes an asset that has investment history?                   | Architect | Before Story 3.4  | **Resolved:** Investments preserved with symbol, asset_id becomes null |

### Decision Log

| ID   | Decision                                                        | Rationale                                                    | Date       |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| D3.1 | Use `numeric(19,8)` for quantity, `numeric(19,4)` for prices    | Crypto needs 8 decimals (satoshis), prices need 4 (standard) | 2025-12-03 |
| D3.2 | Store all monetary values as strings in TypeScript              | Avoid JS number precision issues, use decimal.js for math    | 2025-12-03 |
| D3.3 | Asset class assignment is optional in Epic 3                    | Allows portfolio creation before Epic 4 (asset class config) | 2025-12-03 |
| D3.4 | Portfolio deletion cascades to assets but preserves investments | User can delete portfolio structure while keeping history    | 2025-12-03 |

## Test Strategy Summary

### Unit Tests (Vitest)

| Test Area                | Files                                     | Coverage Target | Priority |
| ------------------------ | ----------------------------------------- | --------------- | -------- |
| **AllocationCalculator** | `lib/calculations/allocation.test.ts`     | 100%            | P0       |
| **CurrencyConverter**    | `lib/calculations/currency.test.ts`       | 100%            | P0       |
| **PortfolioService**     | `lib/services/portfolio-service.test.ts`  | 90%             | P0       |
| **InvestmentService**    | `lib/services/investment-service.test.ts` | 90%             | P0       |
| **Zod Schemas**          | `lib/validations/portfolio.test.ts`       | 100%            | P1       |
| **API Routes**           | `app/api/portfolios/*.test.ts`            | 80%             | P1       |

**Critical Unit Test Cases:**

```typescript
// lib/calculations/allocation.test.ts
describe("calculateAllocationPercentage", () => {
  it("calculates percentage with decimal precision", () => {
    expect(calculateAllocationPercentage("1000.0000", "3000.0000")).toBe("33.3333");
  });

  it("handles zero total value", () => {
    expect(calculateAllocationPercentage("1000", "0")).toBe("0");
  });

  it("never uses floating point", () => {
    // Verify decimal.js is used, not native JS numbers
    const result = calculateAllocationPercentage("0.1", "0.3");
    expect(result).toBe("33.3333"); // Not 33.33333333333333
  });
});

describe("calculateAssetValue", () => {
  it("multiplies quantity by price with precision", () => {
    expect(calculateAssetValue("100.12345678", "50.1234")).toBe("5018.5191");
  });
});
```

### Integration Tests (Vitest + DB)

| Test Area              | Description                               | Priority |
| ---------------------- | ----------------------------------------- | -------- |
| Portfolio CRUD         | Create, read, update, delete with real DB | P0       |
| Asset operations       | Add, update, remove with constraints      | P0       |
| Investment recording   | Transaction integrity, quantity updates   | P0       |
| Multi-tenant isolation | Verify user can't access other's data     | P0       |

### E2E Tests (Playwright)

| Test File                  | User Flows                                 | Priority |
| -------------------------- | ------------------------------------------ | -------- |
| `portfolio-crud.spec.ts`   | Create portfolio, add assets, view table   | P0       |
| `asset-management.spec.ts` | Add, edit, delete, ignore assets           | P0       |
| `portfolio-values.spec.ts` | Verify calculations, dual currency display | P1       |
| `allocation-view.spec.ts`  | Allocation percentages, charts, gauges     | P1       |
| `investment-flow.spec.ts`  | Record investment, verify history          | P1       |
| `history-export.spec.ts`   | View history, export CSV                   | P2       |

**Critical E2E Test Cases:**

```typescript
// tests/e2e/portfolio-crud.spec.ts
test("user can create portfolio and add first asset", async ({ page }) => {
  await page.goto("/portfolio");

  // Create portfolio
  await page.click("text=Create Portfolio");
  await page.fill('input[name="name"]', "My Investments");
  await page.click("text=Create");

  // Verify empty state
  await expect(page.locator("text=Add your first asset")).toBeVisible();

  // Add asset
  await page.click("text=Add Asset");
  await page.fill('input[name="symbol"]', "AAPL");
  await page.fill('input[name="quantity"]', "10");
  await page.fill('input[name="purchasePrice"]', "150.50");
  await page.selectOption('select[name="currency"]', "USD");
  await page.click("text=Add");

  // Verify asset in table
  await expect(page.locator("text=AAPL")).toBeVisible();
  await expect(page.locator("text=$1,505.00")).toBeVisible();
});

test("duplicate asset shows error", async ({ page }) => {
  // ... setup with existing asset
  await page.click("text=Add Asset");
  await page.fill('input[name="symbol"]', "AAPL"); // Already exists
  await page.click("text=Add");

  await expect(page.locator("text=Asset already in portfolio")).toBeVisible();
});
```

### Test Data Requirements

| Data Type      | Description                                      | Source       |
| -------------- | ------------------------------------------------ | ------------ |
| Test users     | 3 users with different base currencies           | Seed script  |
| Portfolios     | Empty, single asset, multi-asset, multi-currency | Seed script  |
| Exchange rates | USD/BRL, USD/EUR, USD/GBP                        | Mock or seed |
| Asset prices   | Static prices for deterministic tests            | Mock         |

### Coverage Requirements

| Metric                | Target                | Blocking                          |
| --------------------- | --------------------- | --------------------------------- |
| Unit test coverage    | ≥ 80%                 | Yes - PR blocked if below         |
| Calculation functions | 100%                  | Yes - financial accuracy critical |
| E2E critical paths    | 100% of P0 tests pass | Yes - release blocker             |
| Integration tests     | All CRUD operations   | Yes                               |
