# Investments Planner - Brownfield Project Documentation

> **AI-Optimized Reference Documentation**
> Last Updated: 2025-12-20
> Documentation Version: 1.0.0

## Project Overview

**Investments Planner** is a full-stack Next.js web application for managing investment portfolios with intelligent scoring-based recommendations. It helps investors track assets, define allocation strategies, score investments using customizable criteria, and receive actionable recommendations for capital allocation.

### Key Business Capabilities

| Capability               | Description                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- |
| **Portfolio Management** | Create portfolios, add/update assets, track holdings across currencies          |
| **Asset Classification** | Define asset classes/subclasses with allocation targets (min/max ranges)        |
| **Scoring System**       | Create criteria sets with financial metrics, operators, and point values        |
| **Recommendations**      | Generate capital allocation recommendations based on scores and allocation gaps |
| **Multi-Currency**       | Support for 8 currencies (USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF)               |
| **Background Jobs**      | Overnight scoring, recommendation pre-generation, cache warming                 |
| **Alerts**               | Opportunity alerts (better assets) and allocation drift notifications           |

---

## Quick Navigation

### Architecture & Design

- [Architecture Overview](./architecture-overview.md) - System design, patterns, data flow
- [Database Schema](./database-schema.md) - 17 tables with relationships
- [API Reference](./api-reference.md) - 59 REST endpoints
- [Data Flow](./data-flow.md) - Request lifecycle and caching

### Implementation Reference

- [Source Tree](./source-tree.md) - Annotated directory structure
- [Component Catalog](./component-catalog.md) - 116 React components
- [Service Layer](./service-layer.md) - 26 business logic services
- [Hooks Reference](./hooks-reference.md) - 21 custom React hooks

### Development

- [Development Setup](./development-setup.md) - Local environment configuration
- [Testing Guide](../TESTING.md) - Unit, integration, E2E testing
- [Coding Standards](../CLAUDE.md) - Project conventions and guidelines

### Product Documentation (Existing)

- [PRD](./prd.md) - Product Requirements Document
- [Architecture](./architecture.md) - Original architecture decision record
- [Epics](./epics.md) - Epic definitions
- [UX Design](./ux-design-specification.md) - UI/UX specifications

---

## Technology Stack

### Core Framework

| Layer          | Technology | Version | Purpose                    |
| -------------- | ---------- | ------- | -------------------------- |
| **Runtime**    | Node.js    | 20+     | Server runtime             |
| **Framework**  | Next.js    | 16      | Full-stack React framework |
| **Language**   | TypeScript | 5.x     | Type-safe development      |
| **UI Library** | React      | 19      | Component library          |

### Database & ORM

| Component      | Technology           | Purpose                   |
| -------------- | -------------------- | ------------------------- |
| **Database**   | PostgreSQL           | Primary data store        |
| **ORM**        | Drizzle ORM          | Type-safe database access |
| **Migrations** | drizzle-kit          | Schema migrations         |
| **Hosting**    | Neon/Vercel Postgres | Serverless PostgreSQL     |

### Authentication & Security

| Component         | Technology   | Purpose                                        |
| ----------------- | ------------ | ---------------------------------------------- |
| **Tokens**        | JWT (jose)   | Access tokens (15min), Refresh tokens (7d/30d) |
| **Hashing**       | bcrypt       | Password hashing (cost 12)                     |
| **Middleware**    | Next.js Edge | Route protection                               |
| **Rate Limiting** | Vercel KV    | API rate limiting                              |

### Caching & State

| Component        | Technology        | Purpose                             |
| ---------------- | ----------------- | ----------------------------------- |
| **Cache**        | Vercel KV (Redis) | Dashboard, recommendations cache    |
| **Client State** | React Hooks       | Local component state               |
| **Form State**   | React Hook Form   | Form management with Zod validation |

### External Data Providers

| Provider         | Data Type            | Fallback               |
| ---------------- | -------------------- | ---------------------- |
| Gemini API       | Prices, Fundamentals | Yahoo Finance (prices) |
| ExchangeRate-API | Exchange rates       | OpenExchangeRates      |

### Background Jobs

| Component     | Technology         | Purpose                          |
| ------------- | ------------------ | -------------------------------- |
| **Job Queue** | Inngest            | Async job processing             |
| **Email**     | Inngest + Provider | Verification, password reset     |
| **Scheduled** | Inngest Cron       | Overnight scoring, cache warming |

### Observability

| Component   | Technology        | Purpose                |
| ----------- | ----------------- | ---------------------- |
| **Tracing** | OpenTelemetry     | Distributed tracing    |
| **Logging** | Structured Logger | JSON logs with context |
| **Metrics** | Custom events     | Performance tracking   |

### Testing

| Type            | Framework  | Location             |
| --------------- | ---------- | -------------------- |
| **Unit**        | Vitest     | `tests/unit/`        |
| **Integration** | Vitest     | `tests/integration/` |
| **E2E**         | Playwright | `tests/e2e/`         |

### UI Framework

| Component      | Technology   | Purpose                        |
| -------------- | ------------ | ------------------------------ |
| **Components** | Radix UI     | Headless accessible primitives |
| **Styling**    | Tailwind CSS | Utility-first CSS              |
| **Variants**   | CVA (cva)    | Component variants             |
| **Icons**      | Lucide React | Icon library                   |
| **Charts**     | Recharts     | Data visualization             |
| **Toasts**     | Sonner       | Notifications                  |

---

## Project Structure

```
investments-planner/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, register, verify)
│   │   ├── (dashboard)/       # Protected pages (portfolio, criteria, strategy)
│   │   ├── (legal)/           # Legal pages (terms, privacy, disclaimer)
│   │   └── api/               # 59 API route handlers
│   ├── components/            # 116 React components
│   │   ├── ui/               # 22 base UI components (shadcn/ui)
│   │   ├── portfolio/        # Portfolio management
│   │   ├── strategy/         # Asset class configuration
│   │   ├── criteria/         # Scoring criteria
│   │   ├── recommendations/  # Investment recommendations
│   │   └── ...               # Other feature components
│   ├── hooks/                 # 21 custom React hooks
│   ├── lib/                   # Core libraries
│   │   ├── api/              # API utilities and responses
│   │   ├── auth/             # Authentication logic
│   │   ├── cache/            # Caching layer
│   │   ├── calculations/     # Scoring engine (Decimal.js)
│   │   ├── db/               # Database schema and connection
│   │   ├── events/           # Event sourcing
│   │   ├── inngest/          # Background job functions
│   │   ├── providers/        # External data providers
│   │   ├── services/         # 26 business services
│   │   ├── telemetry/        # OpenTelemetry setup
│   │   └── validations/      # Zod schemas
│   └── contexts/              # React contexts
├── tests/                     # Test suites
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # E2E tests
├── drizzle/                   # Database migrations
├── docs/                      # Documentation
│   ├── sprint-artifacts/     # Story implementations
│   └── diagrams/             # Architecture diagrams
└── .bmad/                     # BMAD workflow files
```

---

## Database Schema Summary

**17 Tables** organized by domain:

### User Management

- `users` - User accounts and preferences
- `refresh_tokens` - JWT refresh token storage
- `verification_tokens` - Email verification tokens
- `password_reset_tokens` - Password reset tokens
- `alert_preferences` - Notification settings

### Portfolio Domain

- `portfolios` - User portfolios (max 5 per user)
- `portfolio_assets` - Asset holdings with quantities
- `investments` - Investment transaction history

### Classification & Scoring

- `asset_classes` - Asset categories (max 10 per user)
- `asset_subclasses` - Subcategories within classes
- `criteria_versions` - Immutable scoring criteria sets
- `asset_scores` - Calculated scores with breakdowns
- `score_history` - Historical score tracking

### External Data

- `asset_fundamentals` - P/E, dividend yield, etc.
- `asset_prices` - OHLCV price data
- `exchange_rates` - Currency conversion rates

### Recommendations & Events

- `recommendations` - Generated recommendation sessions
- `recommendation_items` - Individual asset recommendations
- `alerts` - User notifications
- `calculation_events` - Event sourcing audit trail
- `overnight_job_runs` - Background job tracking

---

## Key Architectural Patterns

### 1. Event Sourcing (ADR-002)

All calculations emit immutable events for audit trail:

- `CALC_STARTED` - Calculation initiated
- `INPUTS_CAPTURED` - Input data snapshot
- `SCORES_COMPUTED` - Results with breakdown
- `CALC_COMPLETED` - Timing and status

### 2. Multi-Tenant Isolation

Every database query is scoped by `userId`:

```typescript
where(and(eq(table.userId, userId), eq(table.id, id)));
```

### 3. Decimal.js for Financial Precision

All monetary calculations use `Decimal.js`:

```typescript
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
```

### 4. Cache-First Strategy

Dashboard and recommendations use Vercel KV cache:

1. Check cache (KV) first
2. If miss, query PostgreSQL
3. Update cache with TTL (24h)

### 5. Provider Abstraction

External data fetched via abstraction layer with:

- Circuit breaker pattern
- Retry with exponential backoff
- Provider fallback chain

---

## API Overview

**59 REST Endpoints** across 15 domains:

| Domain          | Endpoints | Key Features                                  |
| --------------- | --------- | --------------------------------------------- |
| Auth            | 9         | JWT tokens, rate limiting, email verification |
| Portfolios      | 5         | CRUD, asset management, allocations           |
| Assets          | 3         | Update, delete, toggle ignore                 |
| Scores          | 5         | Calculate, history, breakdown, replay         |
| Criteria        | 6         | CRUD, compare, preview impact                 |
| Recommendations | 3         | Generate, retrieve, breakdown                 |
| Asset Classes   | 6         | Classes, subclasses, validation               |
| User            | 5         | Profile, settings, export, delete             |
| Investments     | 2         | Record, history                               |
| Data            | 5         | Prices, rates, fundamentals, refresh          |
| Alerts          | 5         | List, read, dismiss                           |
| Health          | 2         | DB check, provider status                     |
| Dashboard       | 1         | Aggregated data                               |
| Audit           | 1         | Calculation trail                             |
| Inngest         | 1         | Webhook handler                               |

---

## Development Quick Start

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with DATABASE_URL, etc.

# Run database migrations
pnpm db:push

# Start development server
pnpm dev

# Run tests
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests
pnpm test:coverage  # Coverage report
```

---

## Sprint/Epic Status

| Epic | Name                      | Status   | Stories |
| ---- | ------------------------- | -------- | ------- |
| 1    | Foundation Infrastructure | Complete | 8       |
| 2    | User Management           | Complete | 8       |
| 3    | Portfolio Management      | Complete | 9       |
| 4    | Asset Classification      | Complete | 6       |
| 5    | Scoring System            | Complete | 11      |
| 6    | Data Integration          | Complete | 9       |
| 7    | Recommendations           | Complete | 10      |
| 8    | Background Jobs           | Complete | 6       |
| 9    | Alerts & Polish           | Complete | 6       |

---

## Key Files Reference

| Purpose               | Path                                      |
| --------------------- | ----------------------------------------- |
| Database Schema       | `src/lib/db/schema.ts`                    |
| Scoring Engine        | `src/lib/calculations/scoring-engine.ts`  |
| Recommendation Engine | `src/lib/calculations/recommendations.ts` |
| Auth Middleware       | `src/lib/auth/middleware.ts`              |
| API Utilities         | `src/lib/api/responses.ts`                |
| Cache Service         | `src/lib/cache/service.ts`                |
| Event Store           | `src/lib/events/event-store.ts`           |
| OpenTelemetry         | `src/lib/telemetry/setup.ts`              |

---

## Document Conventions

- **Code references**: `file.ts:line_number` format
- **Story references**: `Story X.Y: Name` format
- **AC references**: `AC-X.Y.Z` for acceptance criteria
- **Decimal values**: Always as strings in API responses (e.g., `"123.4567"`)
- **Dates**: ISO8601 format in API responses

---

_This documentation is auto-generated and optimized for AI-assisted development. For product requirements, see the [PRD](./prd.md)._
