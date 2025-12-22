# Source Tree - Annotated Directory Structure

> Complete file inventory with purpose annotations

## Root Directory

```
investments-planner/
├── .bmad/                    # BMAD workflow framework (development methodology)
├── .claude/                  # Claude Code configuration
├── docs/                     # Documentation (this folder)
├── drizzle/                  # Database migrations (15 migration files)
├── src/                      # Application source code
├── tests/                    # Test suites
├── CLAUDE.md                 # AI assistant instructions & coding standards
├── TESTING.md                # Testing guide
├── drizzle.config.ts         # Drizzle ORM configuration
├── next.config.ts            # Next.js configuration (security headers)
├── package.json              # Dependencies and scripts
├── playwright.config.ts      # E2E test configuration
├── tsconfig.json             # TypeScript configuration
└── vitest.config.ts          # Unit test configuration
```

---

## Source Directory (`/src`)

### Application Router (`/src/app`)

```
src/app/
├── (auth)/                   # AUTH ROUTE GROUP (unauthenticated)
│   ├── layout.tsx           # Centered card layout for auth pages
│   ├── forgot-password/
│   │   ├── page.tsx         # Forgot password page
│   │   └── forgot-password-form.tsx  # Email input form
│   ├── login/
│   │   ├── page.tsx         # Login page (Story 2.3)
│   │   └── login-form.tsx   # Email/password form + remember me
│   ├── register/
│   │   └── page.tsx         # Registration page (Story 2.1)
│   ├── reset-password/
│   │   ├── page.tsx         # Reset password page (Story 2.5)
│   │   └── reset-password-form.tsx  # New password form
│   ├── verify/
│   │   ├── page.tsx         # Email verification page (Story 2.2)
│   │   └── verify-content.tsx  # Verification status display
│   └── verify-pending/
│       ├── page.tsx         # Verification pending page
│       └── verify-pending-content.tsx  # Resend option
│
├── (dashboard)/              # DASHBOARD ROUTE GROUP (authenticated)
│   ├── layout.tsx           # Sidebar layout with auth check
│   ├── page.tsx             # Dashboard home - recommendations input
│   ├── criteria/
│   │   ├── page.tsx         # Criteria management page (Epic 5)
│   │   └── criteria-page-client.tsx  # Client component wrapper
│   ├── history/
│   │   ├── page.tsx         # Investment history page (Story 3.9)
│   │   └── history-page-client.tsx
│   ├── portfolio/
│   │   ├── page.tsx         # Portfolio management page (Epic 3)
│   │   └── portfolio-page-client.tsx
│   ├── settings/
│   │   └── page.tsx         # User settings page (Story 2.6)
│   └── strategy/
│       └── page.tsx         # Asset class strategy page (Epic 4)
│
├── (legal)/                  # LEGAL PAGES ROUTE GROUP
│   ├── disclaimer/
│   │   └── page.tsx         # Financial disclaimer (Story 9.4)
│   ├── privacy/
│   │   └── page.tsx         # Privacy policy (Story 9.5)
│   └── terms/
│       └── page.tsx         # Terms of service (Story 9.5)
│
├── api/                      # API ROUTES (59 endpoints)
│   ├── alerts/              # Alert endpoints (5)
│   │   ├── route.ts         # GET list alerts
│   │   ├── dismiss-all/route.ts
│   │   ├── unread/count/route.ts
│   │   └── [id]/
│   │       ├── dismiss/route.ts
│   │       └── read/route.ts
│   │
│   ├── asset-classes/       # Asset class endpoints (7)
│   │   ├── route.ts         # GET/POST asset classes
│   │   ├── asset-counts/route.ts
│   │   ├── summary/route.ts
│   │   ├── validate/route.ts
│   │   └── [id]/
│   │       ├── route.ts     # GET/PATCH/DELETE
│   │       ├── subclasses/route.ts
│   │       └── validate-subclasses/route.ts
│   │
│   ├── asset-subclasses/    # Subclass endpoints
│   │   └── [id]/route.ts    # PATCH/DELETE subclass
│   │
│   ├── assets/              # Asset endpoints (3)
│   │   └── [id]/
│   │       ├── route.ts     # PATCH/DELETE asset
│   │       └── ignore/route.ts  # PATCH toggle ignore
│   │
│   ├── audit/               # Audit endpoints
│   │   └── calculations/route.ts  # GET calculation audit trail
│   │
│   ├── auth/                # Authentication endpoints (9)
│   │   ├── login/route.ts   # POST login
│   │   ├── logout/route.ts  # POST logout
│   │   ├── register/route.ts  # POST register
│   │   ├── refresh/route.ts  # POST refresh token
│   │   ├── me/route.ts      # GET current user
│   │   ├── verify/route.ts  # POST verify email
│   │   ├── resend-verification/route.ts
│   │   ├── forgot-password/route.ts
│   │   └── reset-password/route.ts
│   │
│   ├── criteria/            # Criteria endpoints (6)
│   │   ├── route.ts         # GET/POST criteria sets
│   │   ├── compare/route.ts
│   │   ├── preview/route.ts
│   │   └── [id]/
│   │       ├── route.ts     # GET/PATCH/DELETE
│   │       ├── copy/route.ts
│   │       └── reorder/route.ts
│   │
│   ├── dashboard/           # Dashboard endpoint
│   │   └── route.ts         # GET aggregated data
│   │
│   ├── data/                # Data endpoints (5)
│   │   ├── prices/route.ts  # GET OHLCV prices
│   │   ├── exchange-rates/route.ts
│   │   ├── fundamentals/route.ts
│   │   ├── freshness/route.ts
│   │   ├── refresh/route.ts # POST force refresh
│   │   └── convert/route.ts # POST currency conversion
│   │
│   ├── health/              # Health check endpoints (2)
│   │   ├── db/route.ts      # GET database health
│   │   └── providers/route.ts  # GET provider status
│   │
│   ├── inngest/             # Inngest webhook
│   │   └── route.ts         # POST/GET Inngest handler
│   │
│   ├── investments/         # Investment endpoints (2)
│   │   ├── route.ts         # GET/POST investments
│   │   └── confirm/route.ts # POST confirm investments
│   │
│   ├── portfolios/          # Portfolio endpoints (5)
│   │   ├── route.ts         # GET/POST portfolios
│   │   └── [id]/
│   │       ├── assets/route.ts  # GET/POST assets
│   │       ├── allocations/route.ts
│   │       └── values/route.ts
│   │
│   ├── recommendations/     # Recommendation endpoints (3)
│   │   ├── route.ts         # GET recommendations
│   │   ├── generate/route.ts  # POST generate
│   │   └── [id]/
│   │       └── breakdown/route.ts
│   │
│   ├── scores/              # Score endpoints (5)
│   │   ├── calculate/route.ts  # POST calculate scores
│   │   └── [assetId]/
│   │       ├── route.ts     # GET asset score
│   │       ├── breakdown/route.ts
│   │       ├── history/route.ts
│   │       ├── inputs/route.ts
│   │       └── replay/route.ts
│   │
│   └── user/                # User endpoints (6)
│       ├── profile/route.ts # GET/PATCH profile
│       ├── settings/route.ts
│       ├── account/route.ts # DELETE account
│       ├── export/route.ts  # GET data export ZIP
│       ├── alert-preferences/route.ts
│       └── disclaimer/route.ts
│
└── layout.tsx               # Root layout (fonts, providers)
```

---

### Components (`/src/components`)

```
src/components/
├── ui/                       # BASE UI COMPONENTS (22) - shadcn/ui
│   ├── alert-dialog.tsx     # Confirmation dialogs
│   ├── alert.tsx            # Alert messages
│   ├── badge.tsx            # Status badges
│   ├── button.tsx           # Polymorphic button (6 variants)
│   ├── card.tsx             # Card container
│   ├── checkbox.tsx         # Checkbox input
│   ├── dialog.tsx           # Modal dialogs
│   ├── dropdown-menu.tsx    # Dropdown menus
│   ├── form.tsx             # React Hook Form wrapper
│   ├── input.tsx            # Text input
│   ├── label.tsx            # Form labels
│   ├── progress.tsx         # Progress bar
│   ├── select.tsx           # Select dropdown
│   ├── separator.tsx        # Visual separator
│   ├── sheet.tsx            # Slide-out panel
│   ├── sidebar.tsx          # Navigation sidebar
│   ├── skeleton.tsx         # Loading skeleton
│   ├── sonner.tsx           # Toast notifications
│   ├── switch.tsx           # Toggle switch
│   ├── table.tsx            # Data table
│   ├── tabs.tsx             # Tab navigation
│   └── tooltip.tsx          # Tooltips
│
├── alerts/                   # ALERT COMPONENTS
│   ├── alert-dropdown.tsx   # Notification dropdown
│   └── index.ts             # Exports
│
├── auth/                     # AUTH COMPONENTS (4)
│   ├── logout-button.tsx    # Logout with variants
│   ├── password-strength-meter.tsx  # Password validation
│   ├── registration-form.tsx  # Signup form (Story 2.1)
│   └── verification-gate.tsx  # Protected component wrapper
│
├── criteria/                 # CRITERIA COMPONENTS (13)
│   ├── compare-criteria-dialog.tsx  # Side-by-side comparison
│   ├── copy-criteria-dialog.tsx     # Clone criteria set
│   ├── criteria-differences-view.tsx
│   ├── criteria-form.tsx    # Create/edit criteria
│   ├── criteria-list.tsx    # Criteria set list
│   ├── criteria-search.tsx  # Search/filter
│   ├── metric-selector.tsx  # Financial metric dropdown
│   ├── operator-selector.tsx  # Comparison operator
│   ├── points-badge.tsx     # Point value display
│   ├── preview-assets-table.tsx
│   ├── preview-impact-modal.tsx
│   └── score-comparison-view.tsx
│
├── dashboard/                # DASHBOARD COMPONENTS (2)
│   ├── app-sidebar.tsx      # Main navigation sidebar
│   └── recommendation-input-section.tsx
│
├── data/                     # DATA DISPLAY COMPONENTS (4)
│   ├── data-freshness-badge.tsx  # Last updated indicator
│   ├── index.ts
│   ├── refresh-button.tsx   # Manual refresh trigger
│   └── source-attribution-label.tsx  # Data source credit
│
├── disclaimer/               # DISCLAIMER COMPONENTS (2)
│   ├── disclaimer-check.tsx # Check acknowledgment
│   └── disclaimer-modal.tsx # Legal disclaimer modal
│
├── empty-states/             # EMPTY STATE COMPONENTS (8)
│   ├── empty-alerts.tsx
│   ├── empty-assets.tsx
│   ├── empty-history.tsx
│   ├── empty-portfolio.tsx
│   ├── empty-recommendations.tsx
│   ├── empty-state.tsx      # Reusable empty state
│   ├── index.ts
│   └── loading-state.tsx    # Loading placeholder
│
├── fintech/                  # FINANCIAL DISPLAY COMPONENTS (7)
│   ├── allocation-gauge.tsx # Current vs target gauge
│   ├── criteria-block.tsx   # Single criterion display
│   ├── currency-display.tsx # Formatted currency
│   ├── data-freshness-badge.tsx
│   ├── score-badge.tsx      # Color-coded score (green/amber/red)
│   ├── score-breakdown.tsx  # Criterion-level breakdown
│   └── unscored-indicator.tsx  # Missing score indicator
│
├── portfolio/                # PORTFOLIO COMPONENTS (16)
│   ├── add-asset-modal.tsx  # Add asset form (Story 3.2)
│   ├── allocation-bar-chart.tsx  # Horizontal bar chart
│   ├── allocation-pie-chart.tsx  # Donut chart
│   ├── allocation-section.tsx
│   ├── create-portfolio-modal.tsx  # Create portfolio
│   ├── date-range-filter.tsx
│   ├── delete-asset-dialog.tsx  # Confirm deletion
│   ├── editable-cell.tsx    # Inline edit for table
│   ├── investment-confirmation-modal.tsx
│   ├── investment-form.tsx
│   ├── investment-timeline.tsx
│   ├── portfolio-asset-summary.tsx
│   ├── portfolio-empty-state.tsx
│   ├── portfolio-table.tsx  # Main asset list (Stories 3.2-3.7)
│   └── subclass-breakdown.tsx
│
├── recommendations/          # RECOMMENDATION COMPONENTS (14)
│   ├── allocation-comparison-view.tsx
│   ├── allocation-gauge.tsx
│   ├── balanced-portfolio-state.tsx  # All balanced message
│   ├── calculation-steps.tsx
│   ├── confirmation-modal.tsx  # Confirm investments
│   ├── contribution-input.tsx  # Monthly contribution
│   ├── dividends-input.tsx  # Dividends received
│   ├── focus-mode-header.tsx
│   ├── index.ts
│   ├── investment-amount-row.tsx
│   ├── over-allocated-explanation.tsx
│   ├── recommendation-breakdown-panel.tsx
│   ├── recommendation-card.tsx  # Single recommendation
│   ├── recommendation-list.tsx  # Card list
│   └── recommendation-summary.tsx
│
├── settings/                 # SETTINGS COMPONENTS (4)
│   ├── alert-preferences-section.tsx
│   ├── delete-account-dialog.tsx  # Account deletion
│   ├── export-data-section.tsx  # Data export
│   └── profile-settings-form.tsx  # Profile edit
│
└── strategy/                 # STRATEGY COMPONENTS (14)
    ├── allocation-range-editor.tsx  # Min/max editor
    ├── allocation-warning-banner.tsx
    ├── asset-class-card.tsx  # Class display card
    ├── asset-class-form.tsx  # Create class form
    ├── asset-class-list.tsx  # Class list
    ├── asset-count-badge.tsx
    ├── asset-count-input.tsx
    ├── min-allocation-badge.tsx
    ├── min-allocation-input.tsx
    ├── strategy-header.tsx
    ├── subclass-allocation-warning.tsx
    ├── subclass-card.tsx
    ├── subclass-form.tsx
    └── subclass-list.tsx
```

---

### Custom Hooks (`/src/hooks`)

```
src/hooks/
├── use-asset-classes.ts     # Asset class CRUD + subclasses
├── use-asset-score.ts       # Single/batch score fetching
├── use-breakdown.ts         # Recommendation breakdown
├── use-calculation-breakdown.ts
├── use-compare-criteria.ts  # Criteria comparison
├── use-confirm-investments.ts  # Investment confirmation
├── use-contribution.ts      # Contribution amount
├── use-copy-criteria.ts     # Clone criteria
├── use-criteria-filter.ts   # Criteria filtering
├── use-criteria.ts          # Criteria CRUD
├── use-dashboard.ts         # Dashboard data
├── use-data-refresh.ts      # Force refresh with rate limit
├── use-delete-asset.ts      # Asset deletion
├── use-freshness.ts         # Data freshness tracking
├── use-investments.ts       # Investment history
├── use-mobile.ts            # Responsive detection
├── use-preview-criteria.ts  # Criteria preview
├── use-recommendations.ts   # Recommendations fetching
├── use-score-breakdown.ts   # Score breakdown
├── use-toggle-ignore.ts     # Toggle asset ignore
└── use-update-asset.ts      # Update asset
```

---

### Library Code (`/src/lib`)

```
src/lib/
├── api/                      # API UTILITIES
│   ├── error-codes.ts       # Standardized error codes
│   ├── index.ts             # Exports
│   └── responses.ts         # Response helpers
│
├── auth/                     # AUTHENTICATION (12 files)
│   ├── constants.ts         # Cookie names, token config
│   ├── cookies.ts           # Cookie helpers
│   ├── index.ts
│   ├── jwt.ts               # Token generation/verification
│   ├── middleware.ts        # withAuth wrapper
│   ├── password-strength.ts # Password validation rules
│   ├── password.ts          # Hash/verify with bcrypt
│   ├── rate-limit-kv.ts     # Vercel KV rate limiting
│   ├── rate-limit.ts        # Rate limit logic
│   ├── service.ts           # Auth service
│   ├── types.ts             # Auth types
│   └── validation.ts        # Auth validation schemas
│
├── cache/                    # CACHING LAYER (9 files)
│   ├── client.ts            # Vercel KV client
│   ├── config.ts            # Cache configuration
│   ├── index.ts
│   ├── invalidation.ts      # Cache invalidation
│   ├── keys.ts              # Cache key patterns
│   ├── recommendation-cache.ts
│   ├── recommendations.ts   # Recommendation caching
│   ├── service.ts           # Cache service
│   └── types.ts
│
├── calculations/             # CALCULATION ENGINE (7 files)
│   ├── allocation-utils.ts  # Allocation calculations
│   ├── currency-converter.ts
│   ├── decimal-config.ts    # Decimal.js configuration
│   ├── decimal-utils.ts     # Decimal helpers
│   ├── quick-calc.ts        # Quick calculations
│   ├── recommendations.ts   # RECOMMENDATION ALGORITHM (Story 7.4)
│   └── scoring-engine.ts    # SCORING ENGINE (Story 5.8)
│
├── constants/                # CONSTANTS (3 files)
│   ├── criteria-templates.ts  # Default criteria
│   ├── markets.ts           # Market definitions
│   └── operators.ts         # Comparison operators
│
├── db/                       # DATABASE (3 files)
│   ├── errors.ts            # DB error handling
│   ├── index.ts             # Drizzle client
│   └── schema.ts            # DATABASE SCHEMA (17 tables)
│
├── email/                    # EMAIL (1 file)
│   └── email-service.ts     # Email sending
│
├── events/                   # EVENT SOURCING (5 files)
│   ├── calculation-pipeline.ts  # Calculation flow
│   ├── event-store.ts       # Event persistence
│   ├── index.ts
│   ├── replay.ts            # Event replay
│   └── types.ts             # Event types
│
├── inngest/                  # BACKGROUND JOBS (5 files)
│   ├── client.ts            # Inngest client
│   ├── index.ts
│   └── functions/
│       ├── overnight-scoring.ts  # Nightly scoring job
│       ├── purge-deleted-user.ts
│       ├── send-password-reset-email.ts
│       └── send-verification-email.ts
│
├── mocks/                    # MOCK DATA (1 file)
│   └── fundamentals.ts      # Mock fundamentals
│
├── providers/                # EXTERNAL PROVIDERS (13 files)
│   ├── circuit-breaker.ts   # Circuit breaker pattern
│   ├── exchange-rate-service.ts
│   ├── exchange-rates-cache.ts
│   ├── fundamentals-cache.ts
│   ├── fundamentals-service.ts
│   ├── implementations/
│   │   ├── exchangerate-api-provider.ts
│   │   ├── gemini-price-provider.ts
│   │   ├── gemini-provider.ts
│   │   ├── mock-provider.ts
│   │   ├── open-exchange-rates-provider.ts
│   │   └── yahoo-price-provider.ts
│   ├── index.ts
│   ├── price-service.ts
│   ├── prices-cache.ts
│   ├── retry.ts             # Retry with backoff
│   └── types.ts
│
├── rate-limit/               # RATE LIMITING (2 files)
│   ├── index.ts
│   └── refresh-limiter.ts
│
├── repositories/             # DATA REPOSITORIES (3 files)
│   ├── exchange-rates-repository.ts
│   ├── fundamentals-repository.ts
│   └── prices-repository.ts
│
├── services/                 # BUSINESS SERVICES (26 files)
│   ├── account-service.ts   # Account management
│   ├── alert-detection-service.ts
│   ├── alert-preferences-service.ts
│   ├── alert-service.ts
│   ├── allocation-service.ts
│   ├── asset-class-service.ts  # Asset class CRUD
│   ├── audit-service.ts
│   ├── batch-recommendation-service.ts
│   ├── batch-scoring-service.ts
│   ├── cache-warmer-service.ts
│   ├── criteria-comparison-service.ts
│   ├── criteria-service.ts  # Criteria CRUD
│   ├── csv-export.ts
│   ├── dashboard-service.ts
│   ├── data-refresh-service.ts
│   ├── disclaimer-service.ts
│   ├── exchange-rate-service.ts
│   ├── export-service.ts    # Data export
│   ├── investment-service.ts
│   ├── overnight-job-service.ts
│   ├── portfolio-service.ts # Portfolio CRUD
│   ├── price-service.ts
│   ├── recommendation-service.ts  # Recommendations
│   ├── score-service.ts     # Score management
│   ├── user-query-service.ts
│   └── user-service.ts      # User management
│
├── telemetry/                # OBSERVABILITY (8 files)
│   ├── attributes.ts        # Span attributes
│   ├── config.ts            # OTel configuration
│   ├── errors.ts            # Error tracking
│   ├── examples/
│   │   └── instrumented-job.ts
│   ├── index.ts
│   ├── logger.ts            # Structured logging
│   ├── setup.ts             # OTel setup
│   └── tracer.ts            # Tracing
│
├── types/                    # SHARED TYPES (4 files)
│   ├── calculation-breakdown.ts
│   ├── freshness.ts
│   ├── recommendations.ts
│   └── source-attribution.ts
│
├── utils/                    # UTILITIES (6 files)
│   ├── currency-format.ts   # Currency formatting
│   ├── date-parser.ts       # Date parsing
│   ├── env.ts               # Environment helpers
│   ├── export-calculation.ts
│   ├── fetch-with-retry.ts  # Retry wrapper
│   └── user.ts              # User utilities
│
├── utils.ts                  # General utilities
│
└── validations/              # ZOD SCHEMAS (12 files)
    ├── asset-class-schemas.ts
    ├── criteria-schemas.ts
    ├── currency-schemas.ts
    ├── exchange-rates-schemas.ts
    ├── freshness-schemas.ts
    ├── fundamentals-schemas.ts
    ├── investment-schemas.ts
    ├── portfolio.ts
    ├── prices-schemas.ts
    ├── recommendation-schemas.ts
    ├── refresh-schemas.ts
    └── score-schemas.ts
```

---

### Other Source Files

```
src/
├── contexts/
│   └── user-context.tsx     # User context provider
├── instrumentation.ts       # Next.js instrumentation hook
├── middleware.ts            # Edge middleware (route protection)
└── types/
    ├── bcrypt.d.ts          # bcrypt types
    └── portfolio.ts         # Portfolio types
```

---

## Test Directory (`/tests`)

```
tests/
├── setup.ts                  # Shared test utilities
├── unit/                     # UNIT TESTS
│   ├── auth/                # Authentication tests
│   ├── cache/               # Cache service tests
│   ├── calculations/        # Financial calculation tests
│   ├── db/                  # Database schema tests
│   ├── events/              # Event sourcing tests
│   ├── services/            # Service tests
│   ├── telemetry/           # Telemetry tests
│   └── utils/               # Utility tests
├── integration/              # INTEGRATION TESTS
│   └── auth-flow.test.ts
└── e2e/                      # E2E TESTS (Playwright)
    └── smoke.spec.ts        # Basic smoke tests
```

---

## Database Migrations (`/drizzle`)

```
drizzle/
├── 0000_milky_the_renegades.sql   # Initial schema
├── 0001_yielding_emma_frost.sql   # ...
├── 0002_sparkling_aqueduct.sql
├── 0003_performance_indexes.sql
├── 0004_bored_reaper.sql
├── 0005_stiff_wong.sql
├── 0006_clever_young_avengers.sql
├── 0007_fix_score_history_fk.sql
├── 0008_robust_screwball.sql
├── 0009_moaning_night_thrasher.sql
├── 0010_stale_wallop.sql
├── 0011_secret_brood.sql
├── 0012_concerned_monster_badoon.sql
├── 0013_lean_blob.sql
├── 0014_alerts_metadata_gin_index.sql
├── meta/                     # Migration metadata
│   ├── _journal.json        # Migration history
│   └── *.json               # Schema snapshots
└── rollback/
    └── 0012_rollback.sql    # Rollback script
```

---

## File Count Summary

| Category               | Count |
| ---------------------- | ----- |
| React Components       | 116   |
| Custom Hooks           | 21    |
| API Route Handlers     | 59    |
| Service Modules        | 26    |
| Zod Validation Schemas | 12    |
| Database Tables        | 17    |
| Database Migrations    | 15    |
| Test Files             | ~50+  |

---

_For component details, see [Component Catalog](./component-catalog.md). For API details, see [API Reference](./api-reference.md)._
