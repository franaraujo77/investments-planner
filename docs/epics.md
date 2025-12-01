# Investments Planner - Epic Breakdown

**Author:** Bmad
**Date:** 2025-11-29
**Project Level:** High Complexity
**Target Scale:** SaaS B2B Platform (Fintech)

---

## Overview

This document provides the complete epic and story breakdown for Investments Planner, decomposing the requirements from the [PRD](./prd.md) into implementable stories.

**Living Document Notice:** This version incorporates PRD + UX Design + Architecture context for comprehensive story specifications.

**Core Philosophy:** "Simplicity in front, complexity behind." Each epic delivers USER VALUE, not just technical capability.

---

## Functional Requirements Inventory

### User Account & Access (FR1-FR8)
- **FR1:** Users can create an account with email and password
- **FR2:** Users can verify their email address to activate account
- **FR3:** Users can log in securely and maintain authenticated sessions
- **FR4:** Users can log out and terminate their session
- **FR5:** Users can reset their password via email verification
- **FR6:** Users can update their profile information (name, base currency)
- **FR7:** Users can export all their data (portfolio, configurations, history)
- **FR8:** Users can delete their account and all associated data

### Portfolio Management (FR9-FR17)
- **FR9:** Users can create and name portfolios
- **FR10:** Users can add assets to their portfolio with quantity and purchase price
- **FR11:** Users can update asset quantities and purchase prices
- **FR12:** Users can remove assets from their portfolio
- **FR13:** Users can mark specific assets as "ignored" (excluded from allocation calculations)
- **FR14:** Users can view current portfolio holdings with values in base currency
- **FR15:** Users can view current allocation percentages by asset class and subclass
- **FR16:** Users can record actual investment amounts after making purchases
- **FR17:** Users can view investment history (what was invested, when, at what allocation)

### Asset Class Configuration (FR18-FR23)
- **FR18:** Users can define asset classes (e.g., Fixed Income, Variable Income, Crypto)
- **FR19:** Users can define subclasses within asset classes (e.g., REITs, Stocks, ETFs within Variable Income)
- **FR20:** Users can set allocation percentage ranges for each asset class (e.g., 40-50%)
- **FR21:** Users can set allocation percentage ranges for each subclass
- **FR22:** Users can set maximum asset count limits per class/subclass
- **FR23:** Users can set minimum allocation values for specific classes/subclasses

### Scoring Criteria Configuration (FR24-FR30)
- **FR24:** Users can define scoring criteria for each market/asset type
- **FR25:** Users can set point values for each criterion (e.g., "5-year surplus consistency" = +5 points)
- **FR26:** Users can define criteria using various operators (greater than, less than, between, equals)
- **FR27:** Users can view a library of their configured criteria organized by market/asset type
- **FR28:** Users can copy an existing criteria set to create a new variation
- **FR29:** Users can compare two criteria sets to see which scores assets higher on average
- **FR30:** Users can preview which assets score highest with current criteria before saving

### Asset Data & Scoring (FR31-FR39)
- **FR31:** System fetches asset fundamental data from configured data providers (Gemini API)
- **FR32:** System fetches daily asset prices from market data providers
- **FR33:** System fetches daily exchange rates from currency data providers
- **FR34:** System calculates scores for all assets in configured markets based on user criteria
- **FR35:** System stores historical scores for trend analysis
- **FR36:** Users can view the current score for any asset
- **FR37:** Users can view which criteria contributed to an asset's score (breakdown)
- **FR38:** Users can force an immediate data refresh for specific assets or all assets
- **FR39:** Users can view data freshness (when data was last updated) for any asset

### Multi-Currency Support (FR40-FR44)
- **FR40:** Users can set their portfolio base currency
- **FR41:** System converts all asset values to base currency for portfolio calculations
- **FR42:** System uses previous trading day's exchange rates for conversions
- **FR43:** Users can view asset values in both original currency and base currency
- **FR44:** System correctly calculates allocation percentages across multi-currency holdings

### Recommendations & Allocation (FR45-FR55)
- **FR45:** Users can enter their monthly contribution amount
- **FR46:** Users can enter dividends received for the period
- **FR47:** System calculates total investable capital (contribution + dividends)
- **FR48:** System generates investment recommendations based on scores and allocation targets
- **FR49:** System displays recommendations as simple actionable items ("Invest $X in Asset A")
- **FR50:** System shows zero buy signal for assets/classes that are over-allocated
- **FR51:** System alerts users when higher-scoring assets exist but portfolio is at capacity
- **FR52:** Users can view the calculation breakdown for any recommendation
- **FR53:** Users can confirm recommendations and enter actual invested amounts
- **FR54:** System updates portfolio allocation after investment confirmation
- **FR55:** Users can view updated allocation percentages immediately after confirmation

### Overnight Pre-Computation (FR56-FR59)
- **FR56:** System runs automated overnight processing before market open
- **FR57:** System pre-calculates scores for all assets in user's configured markets
- **FR58:** System pre-generates allocation recommendations for each user
- **FR59:** Users see instant recommendations on login (no waiting for calculations)

### Data Transparency & Trust (FR60-FR64)
- **FR60:** Users can view data source for each data point (which API provided it)
- **FR61:** Users can view timestamp of last update for any data point
- **FR62:** Users can view complete calculation breakdown for any score
- **FR63:** System displays prominent disclaimers that this is a calculation tool, not financial advice
- **FR64:** System logs all calculations for user's own audit trail

### Alerts & Notifications (FR65-FR67)
- **FR65:** Users receive alerts when better-scoring assets are discovered outside their portfolio
- **FR66:** Users receive alerts when allocation drifts outside configured ranges
- **FR67:** Users can configure alert preferences (which alerts, how delivered)

---

**Total: 67 Functional Requirements**

---

## FR Coverage Map

| Epic | FRs Covered | Description |
|------|-------------|-------------|
| Epic 1: Foundation | Infrastructure for ALL FRs | Project setup, database schema, event-sourced pipeline, auth base |
| Epic 2: User Onboarding & Profile | FR1-FR8, FR40 | Complete user lifecycle management |
| Epic 3: Portfolio Core | FR9-FR17, FR43 | Asset holdings, CRUD operations, portfolio view |
| Epic 4: Asset Class & Allocation | FR18-FR23 | Class/subclass hierarchy, allocation ranges |
| Epic 5: Scoring Engine | FR24-FR30, FR34-FR37 | Criteria configuration, score calculation |
| Epic 6: Data Pipeline | FR31-FR33, FR38-FR39, FR41-FR42, FR60-FR62 | External API integration, data freshness |
| Epic 7: Recommendations | FR44-FR55 | Monthly investment workflow, confirmations |
| Epic 8: Overnight Processing | FR56-FR59, FR64 | Background jobs, pre-computation, caching |
| Epic 9: Alerts & Polish | FR51, FR63, FR65-FR67 | Opportunity alerts, disclaimers, notifications |

---

## Epic 1: Foundation

**Goal:** Establish the technical foundation that enables all subsequent features. This is the necessary infrastructure epic for a greenfield project.

**User Value:** While not directly user-facing, this epic ensures the platform is secure, performant, and maintainable - enabling all future user value delivery.

**FRs Enabled:** Infrastructure supporting ALL 67 FRs

---

### Story 1.1: Project Setup & Core Infrastructure

As a **developer**,
I want **the project initialized with Next.js 15, shadcn/ui, and core dependencies**,
So that **I have a solid foundation to build features on**.

**Acceptance Criteria:**

**Given** I clone the repository
**When** I run `pnpm install && pnpm dev`
**Then** the development server starts successfully on localhost:3000

**And** shadcn/ui components are available and styled correctly
**And** Tailwind CSS v4 is configured with the Slate Professional theme
**And** TypeScript strict mode is enabled
**And** ESLint and Prettier are configured for code quality

**Prerequisites:** None (first story)

**Technical Notes:**
- Use `npx create-next-app@latest` with App Router, TypeScript, Tailwind, ESLint
- Initialize shadcn/ui with: button, card, dialog, dropdown-menu, form, input, select, table, tabs, toast, tooltip, sidebar, sheet, skeleton, badge, progress, alert
- Configure Tailwind with UX spec color tokens (see `docs/ux-design-specification.md` Section 3.1)
- Set up path aliases: `@/*` for `src/*`

---

### Story 1.2: Database Schema with Fintech Types

As a **developer**,
I want **PostgreSQL database with Drizzle ORM and fintech-appropriate types**,
So that **financial calculations are accurate and type-safe**.

**Acceptance Criteria:**

**Given** the database connection is configured
**When** I run `pnpm db:migrate`
**Then** all tables are created with correct types

**And** all currency/monetary fields use `numeric(19,4)` type (NEVER float/double)
**And** decimal.js is configured with precision: 20, rounding: ROUND_HALF_UP
**And** Drizzle schema includes: users, portfolios, assets, asset_classes, criteria, scores tables
**And** multi-tenant isolation is enforced via user_id foreign keys

**Prerequisites:** Story 1.1

**Technical Notes:**
- PostgreSQL `numeric` type for ALL monetary values (see Architecture ADR)
- Configure decimal.js: `Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })`
- Create `lib/calculations/decimal-utils.ts` for financial math helpers
- Schema location: `lib/db/schema.ts`

---

### Story 1.3: Authentication System with JWT + Refresh Tokens

As a **developer**,
I want **secure authentication with JWT and refresh token rotation**,
So that **user sessions are secure and support fintech requirements**.

**Acceptance Criteria:**

**Given** the auth system is implemented
**When** a user logs in with valid credentials
**Then** they receive a JWT access token (15min expiry) and refresh token (7d expiry)

**And** refresh tokens are rotated on each use (old token invalidated)
**And** passwords are hashed with bcrypt (cost factor 12)
**And** session cookies are httpOnly, secure, sameSite: strict
**And** failed login attempts are rate-limited (5 per hour per IP)

**Prerequisites:** Story 1.2

**Technical Notes:**
- Reference Next.js SaaS Starter patterns (cloned to ../saas-starter-reference)
- JWT payload: { userId, email, iat, exp }
- Store refresh tokens in database with device fingerprint
- Middleware in `lib/auth/middleware.ts`
- Use Argon2 if available, bcrypt as fallback

---

### Story 1.4: Event-Sourced Calculation Pipeline

As a **developer**,
I want **event sourcing for all calculations with replay capability**,
So that **any calculation can be audited and reproduced exactly**.

**Acceptance Criteria:**

**Given** a scoring calculation is performed
**When** the calculation completes
**Then** 4 events are stored: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED

**And** events include correlation_id linking the entire calculation
**And** INPUTS_CAPTURED stores criteria version, prices snapshot, exchange rates
**And** any calculation can be replayed using `eventStore.replay(correlationId)`
**And** replay produces identical results (deterministic)

**Prerequisites:** Story 1.2

**Technical Notes:**
- Event types defined in `lib/events/types.ts`
- Event store in PostgreSQL (calculation_events table)
- Replay function in `lib/events/replay.ts`
- Use decimal.js for deterministic math

---

### Story 1.5: OpenTelemetry Instrumentation

As a **developer**,
I want **OpenTelemetry tracing at job level**,
So that **I can monitor overnight processing performance**.

**Acceptance Criteria:**

**Given** a background job runs
**When** it completes (success or failure)
**Then** a span is created with: job name, user_id, duration, asset_count

**And** span attributes capture timing breakdown (fetch_rates_ms, fetch_prices_ms, compute_scores_ms)
**And** errors set span status to ERROR with message
**And** traces export to OTLP HTTP endpoint (configurable)
**And** export is non-blocking (doesn't slow down jobs)

**Prerequisites:** Story 1.1

**Technical Notes:**
- Setup in `lib/telemetry/index.ts`
- Use job-level spans, not per-operation (per Architecture ADR)
- Configure via OTEL_EXPORTER_OTLP_ENDPOINT env var
- Fire-and-forget export pattern

---

### Story 1.6: Vercel KV Cache Setup

As a **developer**,
I want **Vercel KV configured for recommendations caching**,
So that **dashboard loads in under 2 seconds**.

**Acceptance Criteria:**

**Given** recommendations are pre-computed
**When** they are stored in Vercel KV
**Then** dashboard retrieval completes in <100ms

**And** cache keys are namespaced per user: `recs:${userId}`
**And** TTL is set to 24 hours
**And** cache miss falls back to PostgreSQL
**And** cache invalidates on criteria or portfolio changes

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use `@vercel/kv` package
- Cache utilities in `lib/cache/index.ts`
- Environment: KV_REST_API_URL, KV_REST_API_TOKEN

---

### Story 1.7: Vitest + Playwright Testing Setup

As a **developer**,
I want **unit and E2E testing infrastructure**,
So that **code quality is maintained through automated tests**.

**Acceptance Criteria:**

**Given** tests are configured
**When** I run `pnpm test`
**Then** Vitest runs all unit tests in `tests/unit/`

**And** `pnpm test:e2e` runs Playwright tests in `tests/e2e/`
**And** test coverage reports are generated
**And** CI can run tests in headless mode

**Prerequisites:** Story 1.1

**Technical Notes:**
- Vitest config: `vitest.config.ts`
- Playwright config: `playwright.config.ts`
- Focus tests on calculation accuracy (decimal.js operations)

---

### Story 1.8: App Shell & Layout Components

As a **user**,
I want **the application shell with sidebar navigation**,
So that **I can navigate between different sections of the app**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I view any page
**Then** I see the Command Center layout with:
  - Persistent sidebar (240px on desktop, collapsed on tablet, hamburger on mobile)
  - Main content area
  - Header with user menu

**And** sidebar contains: Dashboard, Portfolio, Criteria, History, Settings
**And** active route is highlighted
**And** sidebar is accessible via keyboard (Tab navigation)
**And** layout responds to breakpoints: sm (640px), md (768px), lg (1024px)

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use shadcn/ui Sidebar component
- Layout in `app/(dashboard)/layout.tsx`
- Follow UX spec Section 4 (Design Direction)
- Mobile: hamburger menu with slide-out panel

---

## Epic 2: User Onboarding & Profile

**Goal:** Enable users to create accounts, log in, manage their profile, and control their data.

**User Value:** Users can securely access the platform and manage their account settings, including their base currency preference.

**FRs Covered:** FR1-FR8, FR40

---

### Story 2.1: User Registration Flow

As a **new user**,
I want **to create an account with my email and password**,
So that **I can start using Investments Planner**.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I enter a valid email and password (8+ chars, 1 uppercase, 1 number, 1 special)
**Then** my account is created and I see "Verification email sent"

**And** password strength meter shows real-time feedback (weak/medium/strong)
**And** email field validates RFC 5322 format on blur
**And** form shows inline validation errors below fields (red, 14px per UX spec)
**And** submit button is disabled until form is valid
**And** registration completes in <2 seconds
**And** I see the financial disclaimer: "This tool calculates based on criteria YOU configure. Not financial advice."

**Prerequisites:** Story 1.3, Story 1.8

**Technical Notes:**
- Form: `components/forms/registration-form.tsx`
- Use React Hook Form + Zod validation
- Password requirements: minLength: 8, regex for complexity
- reCAPTCHA v3 integration (defer to Growth if needed)
- Route: `app/(auth)/register/page.tsx`

**FRs:** FR1

---

### Story 2.2: Email Verification

As a **registered user**,
I want **to verify my email address**,
So that **my account is activated and secure**.

**Acceptance Criteria:**

**Given** I have registered
**When** I click the verification link in my email
**Then** my account is activated and I'm redirected to login with "Email verified!" toast

**And** verification link expires after 24 hours
**And** I can request a new verification email from the login page
**And** link is single-use (cannot be reused)
**And** unverified accounts cannot access dashboard

**Prerequisites:** Story 2.1

**Technical Notes:**
- Use JWT for verification token (contains userId, exp)
- Route: `app/api/auth/verify/route.ts`
- Redirect unverified users to "Please verify email" page

**FRs:** FR2

---

### Story 2.3: User Login

As a **registered user**,
I want **to log in securely**,
So that **I can access my portfolio and recommendations**.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I enter valid credentials and submit
**Then** I am redirected to the dashboard with my recommendations

**And** login form shows email and password fields with "Remember me" checkbox
**And** failed login shows "Invalid credentials" error (no email/password hints for security)
**And** 5 failed attempts trigger 15-minute lockout with countdown
**And** successful login stores JWT in httpOnly cookie
**And** "Remember me" extends refresh token to 30 days

**Prerequisites:** Story 2.2

**Technical Notes:**
- Route: `app/(auth)/login/page.tsx`
- Use UX spec login modal pattern (Section 5.2)
- Rate limiting via Redis or in-memory store

**FRs:** FR3

---

### Story 2.4: User Logout

As a **logged-in user**,
I want **to log out and terminate my session**,
So that **my account is secure on shared devices**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I click "Logout" in the user menu
**Then** my session is terminated and I'm redirected to login page

**And** JWT cookie is cleared
**And** refresh token is invalidated in database
**And** no confirmation dialog required (immediate action per UX spec)

**Prerequisites:** Story 2.3

**Technical Notes:**
- API route: `app/api/auth/logout/route.ts`
- Clear all auth cookies
- Invalidate refresh token family

**FRs:** FR4

---

### Story 2.5: Password Reset Flow

As a **user who forgot my password**,
I want **to reset it via email**,
So that **I can regain access to my account**.

**Acceptance Criteria:**

**Given** I click "Forgot password?" on the login page
**When** I enter my email and submit
**Then** I see "If an account exists, a reset link has been sent" (no email enumeration)

**And** reset link expires in 1 hour
**And** clicking the link shows password reset form
**And** new password must meet same requirements as registration
**And** successful reset invalidates all existing sessions
**And** I'm redirected to login with "Password reset successful" toast

**Prerequisites:** Story 2.3

**Technical Notes:**
- Route: `app/(auth)/reset-password/page.tsx`
- Use secure random token (not JWT) for reset link
- Store reset tokens in database with expiry

**FRs:** FR5

---

### Story 2.6: Profile Settings & Base Currency

As a **user**,
I want **to update my profile and set my base currency**,
So that **all portfolio values display in my preferred currency**.

**Acceptance Criteria:**

**Given** I am on the Settings page
**When** I update my name or base currency and save
**Then** changes are saved and reflected immediately across the app

**And** base currency dropdown shows: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF
**And** changing currency triggers portfolio value recalculation
**And** form auto-saves on change with subtle success indicator (checkmark)
**And** name field has 100 character limit

**Prerequisites:** Story 1.8

**Technical Notes:**
- Route: `app/(dashboard)/settings/page.tsx`
- Currency change triggers cache invalidation
- Store currency as ISO 4217 code

**FRs:** FR6, FR40

---

### Story 2.7: Data Export

As a **user**,
I want **to export all my data**,
So that **I have a backup and can analyze my data externally**.

**Acceptance Criteria:**

**Given** I am on the Settings page
**When** I click "Export My Data"
**Then** a ZIP file downloads containing:
  - portfolio.json (all holdings)
  - criteria.json (all scoring criteria)
  - history.json (all investment records)
  - README.txt (data format documentation)

**And** export completes within 30 seconds
**And** data is human-readable (formatted JSON)
**And** progress indicator shows during generation

**Prerequisites:** Story 2.6

**Technical Notes:**
- API route: `app/api/user/export/route.ts`
- Use streaming response for large datasets
- Include data schema version for future compatibility

**FRs:** FR7

---

### Story 2.8: Account Deletion

As a **user**,
I want **to delete my account and all data**,
So that **I can exercise my right to be forgotten**.

**Acceptance Criteria:**

**Given** I am on the Settings page
**When** I click "Delete Account"
**Then** I see a confirmation dialog explaining consequences

**And** dialog requires typing "DELETE" to confirm
**And** confirmation deletes: user record, portfolios, criteria, scores, history, events
**And** deletion is irreversible (soft delete with 30-day purge)
**And** after deletion, I'm logged out and redirected to homepage with confirmation

**Prerequisites:** Story 2.6

**Technical Notes:**
- Use destructive action pattern (red button + confirmation dialog)
- Soft delete: set deleted_at timestamp
- Background job purges after 30 days
- Cascade delete all user data

**FRs:** FR8

---

## Epic 3: Portfolio Core

**Goal:** Enable users to manage their investment portfolio - adding, viewing, and tracking assets.

**User Value:** Users can see their current portfolio holdings, values, and allocation percentages.

**FRs Covered:** FR9-FR17, FR43

---

### Story 3.1: Create Portfolio

As a **user**,
I want **to create a named portfolio**,
So that **I can organize my investments**.

**Acceptance Criteria:**

**Given** I am on the Portfolio page with no portfolio
**When** I click "Create Portfolio" and enter a name
**Then** a new portfolio is created and I see the empty portfolio view

**And** portfolio name has 50 character limit
**And** name cannot be empty
**And** users can have up to 5 portfolios (MVP limit)
**And** empty state shows: "Add your first asset to get started" with CTA button

**Prerequisites:** Story 2.3

**Technical Notes:**
- Route: `app/(dashboard)/portfolio/page.tsx`
- Store in portfolios table with user_id, name, created_at
- Use empty state pattern from UX spec Section 7.1

**FRs:** FR9

---

### Story 3.2: Add Asset to Portfolio

As a **user**,
I want **to add assets to my portfolio with quantity and purchase price**,
So that **I can track my holdings**.

**Acceptance Criteria:**

**Given** I have a portfolio
**When** I click "Add Asset" and enter ticker, quantity, and purchase price
**Then** the asset is added to my portfolio with calculated total value

**And** ticker field has autocomplete from known assets
**And** quantity accepts decimal values (up to 8 decimal places for crypto)
**And** purchase price is in asset's native currency
**And** total value = quantity × purchase price (calculated, not entered)
**And** duplicate tickers show error: "Asset already in portfolio"
**And** form validates: quantity > 0, price > 0

**Prerequisites:** Story 3.1

**Technical Notes:**
- Use dialog/modal for add asset form
- Store in portfolio_assets table: portfolio_id, ticker, quantity (numeric), purchase_price (numeric), currency
- Calculate total using decimal.js

**FRs:** FR10

---

### Story 3.3: Update Asset Holdings

As a **user**,
I want **to update asset quantities and purchase prices**,
So that **my portfolio reflects my current holdings**.

**Acceptance Criteria:**

**Given** I have assets in my portfolio
**When** I click an asset row and edit quantity or price
**Then** changes are saved and totals recalculate immediately

**And** edit is inline (click to edit pattern per UX spec)
**And** changes auto-save on blur with success indicator
**And** validation same as add: quantity > 0, price > 0
**And** updated_at timestamp is recorded

**Prerequisites:** Story 3.2

**Technical Notes:**
- Inline editing with React Hook Form
- Optimistic updates with rollback on error
- Recalculate portfolio totals after each change

**FRs:** FR11

---

### Story 3.4: Remove Asset from Portfolio

As a **user**,
I want **to remove assets from my portfolio**,
So that **I can track only current holdings**.

**Acceptance Criteria:**

**Given** I have assets in my portfolio
**When** I click the delete icon on an asset row and confirm
**Then** the asset is removed and portfolio totals recalculate

**And** confirmation dialog shows: "Remove [TICKER]? This cannot be undone."
**And** dialog shows current value being removed
**And** removal is immediate after confirmation

**Prerequisites:** Story 3.2

**Technical Notes:**
- Hard delete from portfolio_assets table
- Update portfolio totals
- Log removal in audit trail

**FRs:** FR12

---

### Story 3.5: Mark Asset as Ignored

As a **user**,
I want **to mark specific assets as "ignored"**,
So that **they're excluded from allocation recommendations but still tracked**.

**Acceptance Criteria:**

**Given** I have assets in my portfolio
**When** I toggle the "Ignore" switch on an asset
**Then** the asset shows a visual indicator (strikethrough or badge) and is excluded from allocation math

**And** ignored assets still count toward portfolio total value
**And** ignored assets don't receive buy recommendations
**And** toggle is instant (no confirmation needed)
**And** ignored status can be toggled back to active

**Prerequisites:** Story 3.2

**Technical Notes:**
- Add `is_ignored` boolean to portfolio_assets
- Filter ignored assets in allocation calculations
- Visual: grayed out row with "Ignored" badge

**FRs:** FR13

---

### Story 3.6: Portfolio Overview with Values

As a **user**,
I want **to view my portfolio holdings with values in my base currency**,
So that **I understand my current investment position**.

**Acceptance Criteria:**

**Given** I am on the Portfolio page
**When** the page loads
**Then** I see a table of all assets with columns: Ticker, Quantity, Price, Value (native), Value (base), Allocation %

**And** values in native currency show currency symbol (e.g., $, R$, €)
**And** values in base currency show conversion with rate indicator
**And** total portfolio value is displayed prominently at top
**And** table is sortable by any column
**And** table supports search/filter by ticker

**Prerequisites:** Story 3.2, Story 2.6 (base currency)

**Technical Notes:**
- Use CurrencyDisplay component for dual currency values
- Data Table with TanStack Table for sorting/filtering
- Route: `app/(dashboard)/portfolio/page.tsx` (Overview tab)

**FRs:** FR14, FR43

---

### Story 3.7: Allocation Percentage View

As a **user**,
I want **to see current allocation percentages by asset class and subclass**,
So that **I can understand my portfolio balance**.

**Acceptance Criteria:**

**Given** I am on the Portfolio Overview
**When** I view the allocation section
**Then** I see:
  - Pie/donut chart showing allocation by asset class
  - Bar chart showing current vs. target allocation per class
  - AllocationGauge component for each class showing current position in target range

**And** percentages display with 1 decimal precision (e.g., 42.5%)
**And** colors indicate status: green (on target), amber (near range), red (out of range)
**And** clicking a class expands to show subclass breakdown

**Prerequisites:** Story 3.6

**Technical Notes:**
- Use Recharts for charts (shadcn/ui integrated)
- AllocationGauge: custom component per UX spec
- Calculate percentages using decimal.js

**FRs:** FR15, FR44

---

### Story 3.8: Record Investment Amount

As a **user**,
I want **to record actual investment amounts after making purchases**,
So that **my portfolio reflects real transactions**.

**Acceptance Criteria:**

**Given** I have confirmed a recommendation (or making manual investment)
**When** I enter the actual amount invested and ticker
**Then** the investment is recorded and asset quantity is updated

**And** investment record includes: date, ticker, quantity, price, total amount, currency
**And** portfolio holdings update automatically
**And** investment confirmation shows updated allocation percentages
**And** success toast: "November investment recorded" (month/year dynamic)

**Prerequisites:** Story 3.3

**Technical Notes:**
- investments table: user_id, portfolio_id, ticker, quantity, price, amount, currency, invested_at
- Update portfolio_assets quantity
- Link to Story 7.6 (Recommendation confirmation flow)

**FRs:** FR16

---

### Story 3.9: Investment History View

As a **user**,
I want **to view my investment history**,
So that **I can see what I invested over time**.

**Acceptance Criteria:**

**Given** I am on the History page
**When** the page loads
**Then** I see a timeline of investment records with: Date, Total Invested, Assets Count

**And** each entry expands to show: individual assets, amounts, prices at time
**And** history shows recommended vs. actual amounts for each investment
**And** CSV export button downloads complete history
**And** filter by date range is available

**Prerequisites:** Story 3.8

**Technical Notes:**
- Route: `app/(dashboard)/history/page.tsx`
- Group investments by month
- Store recommendation snapshot with each investment for comparison

**FRs:** FR17

---

## Epic 4: Asset Class & Allocation Configuration

**Goal:** Enable users to define their investment strategy structure through asset classes and allocation targets.

**User Value:** Users can configure their desired portfolio structure and allocation ranges.

**FRs Covered:** FR18-FR23

---

### Story 4.1: Define Asset Classes

As a **user**,
I want **to define asset classes for my portfolio**,
So that **I can organize my investments by category**.

**Acceptance Criteria:**

**Given** I am on the Criteria/Settings page
**When** I click "Add Asset Class" and enter a name
**Then** a new asset class is created and appears in my class list

**And** default classes offered: Fixed Income, Variable Income, Crypto, Real Estate
**And** class names have 50 character limit
**And** users can create up to 10 custom classes
**And** classes can be reordered via drag-and-drop
**And** classes display with icon selector (optional)

**Prerequisites:** Story 1.8

**Technical Notes:**
- asset_classes table: user_id, name, icon, sort_order
- Use CriteriaBlock component for Notion-style editing
- Provide common icons: 📈 📊 💰 🏠 ₿

**FRs:** FR18

---

### Story 4.2: Define Subclasses

As a **user**,
I want **to define subclasses within asset classes**,
So that **I can further categorize my investments**.

**Acceptance Criteria:**

**Given** I have asset classes defined
**When** I expand a class and click "Add Subclass"
**Then** a new subclass is created under that class

**And** subclasses inherit parent class properties
**And** examples: REITs, Stocks, ETFs under Variable Income
**And** subclasses can be reordered within their class
**And** assets are assigned to subclass (which determines class)

**Prerequisites:** Story 4.1

**Technical Notes:**
- asset_subclasses table: class_id, name, sort_order
- Hierarchical display in UI
- When assigning assets, show: Class > Subclass dropdown

**FRs:** FR19

---

### Story 4.3: Set Allocation Ranges for Classes

As a **user**,
I want **to set allocation percentage ranges for each asset class**,
So that **the system knows my target portfolio balance**.

**Acceptance Criteria:**

**Given** I have asset classes defined
**When** I set min and max allocation percentages for a class
**Then** the range is saved and used in allocation calculations

**And** range inputs show as dual sliders (min-max range selector)
**And** validation: min >= 0, max <= 100, min <= max
**And** warning if total of all class minimums exceeds 100%
**And** visual shows how much allocation is "flexible" vs. "committed"
**And** example: Fixed Income: 40-50% means target is in this range

**Prerequisites:** Story 4.1

**Technical Notes:**
- Add target_min, target_max (numeric) to asset_classes
- AllocationGauge component shows current vs. range
- Calculate total committed = sum of all minimums

**FRs:** FR20

---

### Story 4.4: Set Allocation Ranges for Subclasses

As a **user**,
I want **to set allocation ranges for subclasses**,
So that **I can fine-tune my investment distribution**.

**Acceptance Criteria:**

**Given** I have subclasses defined
**When** I set allocation ranges for a subclass
**Then** ranges are validated against parent class allocation

**And** subclass ranges must fit within parent class range
**And** sum of subclass minimums cannot exceed parent class maximum
**And** warning if configuration is impossible to satisfy
**And** optional: subclasses can have no range (flex within class)

**Prerequisites:** Story 4.3

**Technical Notes:**
- Add target_min, target_max to asset_subclasses
- Validation: child allocations must fit parent
- Allow null for "flexible" subclasses

**FRs:** FR21

---

### Story 4.5: Set Asset Count Limits

As a **user**,
I want **to set maximum asset count limits per class/subclass**,
So that **I maintain a focused portfolio**.

**Acceptance Criteria:**

**Given** I have classes/subclasses defined
**When** I set max_assets for a class or subclass
**Then** the limit is enforced in recommendations

**And** limit of 0 means "no limit"
**And** when at capacity, new assets trigger "opportunity alert" instead of buy recommendation
**And** display shows: "5/10 assets" in class header
**And** limits can be set at class level, subclass level, or both

**Prerequisites:** Story 4.2

**Technical Notes:**
- Add max_assets (integer) to asset_classes and asset_subclasses
- Count includes active assets only (not ignored)
- Used in recommendation generation logic

**FRs:** FR22

---

### Story 4.6: Set Minimum Allocation Values

As a **user**,
I want **to set minimum investment amounts per class/subclass**,
So that **small allocations are avoided**.

**Acceptance Criteria:**

**Given** I have classes/subclasses defined
**When** I set a minimum allocation value (e.g., $100)
**Then** recommendations below this amount are skipped

**And** minimum is in user's base currency
**And** if recommended amount < minimum, it's added to next higher-priority asset
**And** display shows: "Min: $100" badge on class
**And** default is $0 (no minimum)

**Prerequisites:** Story 4.3

**Technical Notes:**
- Add min_allocation_value (numeric) to asset_classes and asset_subclasses
- Affects recommendation generation, not allocation calculation
- Currency stored as base currency

**FRs:** FR23

---

## Epic 5: Scoring Engine

**Goal:** Enable users to configure scoring criteria and calculate asset scores.

**User Value:** Users can see which assets score highest based on their personal criteria, enabling informed investment decisions.

**FRs Covered:** FR24-FR30, FR34-FR37

---

### Story 5.1: Define Scoring Criteria

As a **user**,
I want **to define scoring criteria for each market/asset type**,
So that **assets are evaluated based on my investment philosophy**.

**Acceptance Criteria:**

**Given** I am on the Criteria page
**When** I click "Add Criterion" and define name, metric, operator, value, points
**Then** the criterion is saved and appears in my criteria list

**And** criterion form includes:
  - Name (e.g., "Dividend Yield > 4%")
  - **Target Market/Sector** (e.g., Banks, Manufacturing, REITs, Technology, Utilities)
  - Metric dropdown (yield, P/E, P/B, market cap, etc.)
  - Operator (>, <, >=, <=, between, equals)
  - Value(s) for comparison
  - Points awarded (+5, -2, etc.)
  - **Required Fundamentals** (which data points the asset must have to be evaluated)
**And** criteria organized by market/asset type tabs
**And** CriteriaBlock component shows drag handle, inline editing, delete

**Prerequisites:** Story 4.2

**Technical Notes:**
- criteria table: user_id, asset_type, **target_market**, name, metric, operator, value, value2 (for between), points, **required_fundamentals** (JSON array), sort_order
- Use Notion-style CriteriaBlock component
- Versioning: new version on any change (criteria_versions table)
- **IMPORTANT:** Criteria define WHICH assets to evaluate (via target_market), not just HOW to evaluate them

**FRs:** FR24

---

### Story 5.2: Set Point Values

As a **user**,
I want **to set point values for each criterion**,
So that **I can weight factors based on importance**.

**Acceptance Criteria:**

**Given** I am editing a criterion
**When** I set the points value
**Then** the value is saved and used in score calculations

**And** points can be positive (reward) or negative (penalty)
**And** range: -100 to +100 points
**And** historical surplus scoring: +5 for 5 years, -2 per missing year (Cerrado methodology)
**And** total score = sum of all points from matching criteria

**Prerequisites:** Story 5.1

**Technical Notes:**
- Points stored as integer
- Display point impact preview when hovering criterion
- Cerrado surplus scoring as built-in criterion type

**FRs:** FR25

---

### Story 5.3: Define Criteria Operators

As a **user**,
I want **to use various operators when defining criteria**,
So that **I can create nuanced evaluation rules**.

**Acceptance Criteria:**

**Given** I am creating a criterion
**When** I select an operator
**Then** the form adapts to collect appropriate values

**And** operators available:
  - `>` greater than (single value)
  - `<` less than (single value)
  - `>=` greater than or equal
  - `<=` less than or equal
  - `between` (two values: min and max)
  - `equals` (exact match)
  - `exists` (has value, not null)
**And** "between" shows two value inputs
**And** validation prevents impossible criteria (e.g., between 10 and 5)

**Prerequisites:** Story 5.1

**Technical Notes:**
- Operator enum in schema
- Dynamic form based on operator selection
- Store value2 only for "between" operator

**FRs:** FR26

---

### Story 5.4: Criteria Library View

As a **user**,
I want **to view a library of my configured criteria**,
So that **I can manage and understand my scoring rules**.

**Acceptance Criteria:**

**Given** I am on the Criteria page
**When** the page loads
**Then** I see all my criteria organized by market/asset type tabs

**And** each tab shows: criteria count, last modified
**And** criteria within tabs are sortable by drag-and-drop
**And** search/filter criteria by name
**And** bulk actions: delete selected, duplicate selected

**Prerequisites:** Story 5.1

**Technical Notes:**
- Route: `app/(dashboard)/criteria/page.tsx`
- Use Tabs component for market/asset type organization
- Drag-and-drop with @dnd-kit or similar

**FRs:** FR27

---

### Story 5.5: Copy Criteria Set

As a **user**,
I want **to copy an existing criteria set**,
So that **I can create variations without starting from scratch**.

**Acceptance Criteria:**

**Given** I have criteria defined for a market
**When** I click "Copy to..." and select a target market
**Then** all criteria are duplicated to the target

**And** copied criteria get "(Copy)" suffix in name
**And** can copy within same market (for A/B testing)
**And** can copy to different market
**And** confirmation shows: "Copied 8 criteria to US ETFs"

**Prerequisites:** Story 5.4

**Technical Notes:**
- Duplicate all criteria records with new IDs
- Update asset_type to target
- Add " (Copy)" to names

**FRs:** FR28

---

### Story 5.6: Compare Criteria Sets

As a **user**,
I want **to compare two criteria sets**,
So that **I can see which scores assets higher on average**.

**Acceptance Criteria:**

**Given** I have multiple criteria sets
**When** I select two sets and click "Compare"
**Then** I see side-by-side comparison showing:
  - Criteria differences
  - Average score per set (across sample assets)
  - Which assets rank differently

**And** comparison runs against current asset data
**And** visual highlights: green (improved rank), red (worse rank)
**And** can compare same market or different markets

**Prerequisites:** Story 5.5

**Technical Notes:**
- Quick-calc mode: calculate scores without full overnight run
- Use sample of top 20 assets for quick comparison
- Modal/sheet for comparison view

**FRs:** FR29

---

### Story 5.7: Criteria Preview (Impact Simulation)

As a **user**,
I want **to preview which assets score highest with current criteria**,
So that **I can validate my criteria before saving**.

**Acceptance Criteria:**

**Given** I am editing criteria
**When** I click "Preview Impact"
**Then** I see a modal showing top 10 scoring assets with the current criteria

**And** preview updates live as I modify criteria
**And** shows score breakdown per asset
**And** compares to previous scores: "↑5 improved, ↓2 worse, → 3 same"
**And** preview uses cached asset data (no API calls)

**Prerequisites:** Story 5.1

**Technical Notes:**
- Quick-calc in `lib/calculations/quick-calc.ts`
- Use cached prices/fundamentals
- Client-side calculation for responsiveness

**FRs:** FR30

---

### Story 5.8: Score Calculation Engine

As a **system**,
I want **to calculate scores for assets using a criteria-driven algorithm**,
So that **recommendations can be generated**.

**Acceptance Criteria:**

**Given** user criteria and asset data are available
**When** score calculation runs
**Then** the algorithm executes in this order:

1. **For each criterion** in user's criteria set:
   a. Get the criterion's **target market/sector** (e.g., Banks, Manufacturing)
   b. **Find all assets** that belong to that market/sector
   c. **For each matching asset**:
      - Check if asset has the **required fundamentals** configured in criterion
      - If fundamentals missing: skip this criterion for this asset
      - If fundamentals present: evaluate criterion condition
      - If condition met: add criterion points to asset's score
2. **Aggregate scores**: sum all points per asset across all criteria
3. **Store results** with audit trail

**And** score = sum of points from all matching criteria where fundamentals exist
**And** calculation uses decimal.js for precision
**And** calculation is deterministic (same inputs = same output)
**And** calculation emits events: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED
**And** scores stored with criteria_version_id for audit trail
**And** breakdown JSON includes which criteria were skipped due to missing fundamentals

**Prerequisites:** Story 1.4 (event sourcing), Story 5.1

**Technical Notes:**
- ScoringEngine in `lib/calculations/scoring-engine.ts`
- **Algorithm is CRITERIA-DRIVEN, not asset-driven**
- Iterate: criteria → markets → assets → fundamentals check → evaluate
- Store in asset_scores table: asset_id, user_id, criteria_version_id, score, breakdown (JSON)
- breakdown includes: { criterionId, matched: boolean, pointsAwarded: number, skippedReason?: string }

**FRs:** FR34

---

### Story 5.9: Store Historical Scores

As a **system**,
I want **to store historical scores**,
So that **trends can be analyzed**.

**Acceptance Criteria:**

**Given** scores are calculated
**When** overnight processing completes
**Then** scores are stored with timestamp

**And** historical scores preserved (not overwritten)
**And** retention: 2 years of daily scores, then archived
**And** can query: score for asset X on date Y
**And** supports trend analysis: "Score increased 20% over 6 months"

**Prerequisites:** Story 5.8

**Technical Notes:**
- score_history table: asset_id, user_id, score, calculated_at
- Index on (asset_id, user_id, calculated_at) for efficient queries
- Archive to cold storage after 2 years

**FRs:** FR35

---

### Story 5.10: View Asset Score

As a **user**,
I want **to view the current score for any asset**,
So that **I can see how it ranks**.

**Acceptance Criteria:**

**Given** I am viewing an asset (in portfolio or search)
**When** I see the asset card
**Then** I see the score displayed as a badge (0-100 scale with color coding)

**And** score badge colors: green (80+), amber (50-79), red (<50)
**And** score tooltip shows: "Score: 87 - Click for breakdown"
**And** no score shows: "Not scored" if criteria missing

**Prerequisites:** Story 5.8

**Technical Notes:**
- ScoreBadge component: display score with color
- Normalize scores to 0-100 for display
- Link to score breakdown

**FRs:** FR36

---

### Story 5.11: Score Breakdown View

As a **user**,
I want **to view which criteria contributed to an asset's score**,
So that **I can understand why it scored high or low**.

**Acceptance Criteria:**

**Given** I click on an asset's score badge
**When** the breakdown panel opens
**Then** I see:
  - Overall score prominently displayed
  - Each criterion with: name, condition, points awarded, pass/fail indicator
  - Visual bar chart of point contributions

**And** ScoreBreakdown component shows contribution by criterion
**And** can see which criteria the asset failed
**And** includes link to edit criteria from this view
**And** shows event audit link: "View calculation history"

**Prerequisites:** Story 5.10

**Technical Notes:**
- Use Sheet component for slide-over panel
- ScoreBreakdown custom component per UX spec
- breakdown JSON stored with score contains per-criterion results

**FRs:** FR37

---

## Epic 6: Data Pipeline

**Goal:** Integrate external data providers and ensure data freshness visibility.

**User Value:** Users have access to accurate, fresh market data with full transparency about data sources and timestamps.

**FRs Covered:** FR31-FR33, FR38-FR39, FR41-FR42, FR60-FR62

---

### Story 6.1: Provider Abstraction Layer

As a **developer**,
I want **an abstraction layer for external data providers**,
So that **providers can be swapped without code changes**.

**Acceptance Criteria:**

**Given** the provider abstraction is implemented
**When** a data fetch is requested
**Then** the appropriate provider is called via interface

**And** PriceProvider interface: fetchPrices(symbols), healthCheck()
**And** ExchangeRateProvider interface: fetchRates(base, targets), healthCheck()
**And** providers have: retry logic (3 attempts, exponential backoff)
**And** circuit breaker: disable failing provider temporarily
**And** fallback chain: primary → fallback → cached data

**Prerequisites:** Story 1.1

**Technical Notes:**
- Interfaces in `lib/providers/types.ts`
- Implementations in `lib/providers/implementations/`
- Factory functions in `lib/providers/index.ts`
- See Architecture ADR-005

**FRs:** Infrastructure for FR31-FR33

---

### Story 6.2: Fetch Asset Fundamentals

As a **system**,
I want **to fetch asset fundamental data from Gemini API**,
So that **criteria can evaluate assets accurately**.

**Acceptance Criteria:**

**Given** the overnight job runs
**When** fundamentals are fetched
**Then** data includes: P/E ratio, P/B ratio, dividend yield, market cap, revenue, earnings

**And** data cached with 7-day TTL (fundamentals change slowly)
**And** fetch only for assets in user's configured markets
**And** missing data flagged (don't fail entire fetch)
**And** data source recorded: "Gemini API" with timestamp

**Prerequisites:** Story 6.1

**Technical Notes:**
- GeminiProvider in `lib/providers/implementations/gemini-provider.ts`
- Store in asset_fundamentals table
- Log API calls for cost tracking

**FRs:** FR31

---

### Story 6.3: Fetch Daily Prices

As a **system**,
I want **to fetch daily asset prices**,
So that **portfolio values and scores are current**.

**Acceptance Criteria:**

**Given** the overnight job runs
**When** prices are fetched
**Then** data includes: open, high, low, close, volume for each asset

**And** prices cached with 24-hour TTL
**And** fallback to Yahoo Finance if Gemini fails
**And** missing prices use last known price with "stale" flag
**And** price timestamp stored for freshness display

**Prerequisites:** Story 6.1

**Technical Notes:**
- Batch requests: 50 symbols per API call
- Store in asset_prices table
- Yahoo Finance as fallback provider

**FRs:** FR32

---

### Story 6.4: Fetch Exchange Rates

As a **system**,
I want **to fetch daily exchange rates**,
So that **multi-currency portfolios calculate correctly**.

**Acceptance Criteria:**

**Given** the overnight job runs
**When** exchange rates are fetched
**Then** rates are stored for all currencies in user portfolios

**And** rates are previous trading day close (consistent calculations)
**And** rates cached with 24-hour TTL
**And** fallback to Open Exchange Rates if primary fails
**And** rate source and timestamp stored

**Prerequisites:** Story 6.1

**Technical Notes:**
- ExchangeRateProvider implementations
- Store in exchange_rates table: base, target, rate, source, timestamp
- Support: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF

**FRs:** FR33, FR42

---

### Story 6.5: Currency Conversion Logic

As a **system**,
I want **to convert values to base currency accurately**,
So that **portfolio totals are correct**.

**Acceptance Criteria:**

**Given** asset values in different currencies
**When** portfolio total is calculated
**Then** all values convert to base currency using stored rates

**And** conversion uses decimal.js (no floating point)
**And** conversion formula: value_base = value_native × rate
**And** rate is always: 1 base_currency = X native_currency
**And** rounding: 4 decimal places, ROUND_HALF_UP

**Prerequisites:** Story 6.4, Story 1.2 (decimal.js)

**Technical Notes:**
- Currency utils in `lib/calculations/currency.ts`
- Always use stored rates (not live) for consistency
- Log conversion for audit trail

**FRs:** FR41

---

### Story 6.6: Force Data Refresh

As a **user**,
I want **to force an immediate data refresh**,
So that **I can get latest data when needed**.

**Acceptance Criteria:**

**Given** I am viewing assets
**When** I click "Refresh Data"
**Then** prices and rates are re-fetched immediately

**And** refresh button on: asset detail, portfolio overview, dashboard
**And** loading spinner during refresh
**And** success toast: "Data refreshed as of [timestamp]"
**And** rate limit: max 5 refreshes per hour per user

**Prerequisites:** Story 6.3

**Technical Notes:**
- API route: `app/api/data/refresh/route.ts`
- Check rate limit before processing
- Invalidate relevant caches after refresh

**FRs:** FR38

---

### Story 6.7: Data Freshness Display

As a **user**,
I want **to see when data was last updated**,
So that **I know if I'm looking at stale data**.

**Acceptance Criteria:**

**Given** I am viewing any data point
**When** the DataFreshnessBadge displays
**Then** I see: timestamp and freshness indicator

**And** colors: green (<24h), amber (1-3 days), red (>3 days)
**And** hover shows: exact timestamp + source (e.g., "Gemini API, Nov 29 3:00 AM")
**And** click triggers refresh (if within rate limit)
**And** badge appears on: asset prices, exchange rates, scores

**Prerequisites:** Story 6.3

**Technical Notes:**
- DataFreshnessBadge custom component per UX spec
- Calculate relative time: "2 hours ago", "3 days ago"
- Store updated_at with all data points

**FRs:** FR39, FR61

---

### Story 6.8: Data Source Attribution

As a **user**,
I want **to see which API provided each data point**,
So that **I can trust the data source**.

**Acceptance Criteria:**

**Given** I am viewing data details
**When** I check the data source
**Then** I see the provider name and API endpoint category

**And** source shows: "Price from Gemini API", "Rate from ExchangeRate-API"
**And** available in: asset detail panel, score breakdown
**And** helps users understand data provenance

**Prerequisites:** Story 6.7

**Technical Notes:**
- Store `source` field with all data records
- Display in DataFreshnessBadge tooltip
- Audit trail includes source

**FRs:** FR60

---

### Story 6.9: Calculation Breakdown Access

As a **user**,
I want **to view complete calculation breakdown for any score**,
So that **I can verify the math is correct**.

**Acceptance Criteria:**

**Given** I am viewing a score
**When** I click "View Calculation"
**Then** I see:
  - All input values used (prices, rates, fundamentals)
  - Each criterion evaluation result
  - Final score calculation
  - Timestamp and criteria version used

**And** breakdown is deterministic (same result on replay)
**And** links to event audit trail for full history
**And** can export breakdown as JSON

**Prerequisites:** Story 5.11, Story 1.4 (event sourcing)

**Technical Notes:**
- Use event store to replay calculation
- Display in expandable section of ScoreBreakdown
- replay.ts provides calculation reconstruction

**FRs:** FR62

---

## Epic 7: Recommendations

**Goal:** Deliver the core product value - simple, actionable investment recommendations.

**User Value:** Users can answer "What should I buy this month?" in under 5 minutes.

**FRs Covered:** FR44-FR55

---

### Story 7.1: Enter Monthly Contribution

As a **user**,
I want **to enter my monthly contribution amount**,
So that **the system knows how much I plan to invest**.

**Acceptance Criteria:**

**Given** I am on the Dashboard
**When** I enter my contribution amount in the input field
**Then** the amount is saved and used in recommendations

**And** amount input is in base currency
**And** validation: amount > 0
**And** can save as default (pre-filled next month)
**And** shows: "Monthly contribution: $2,000"

**Prerequisites:** Story 1.8 (dashboard layout)

**Technical Notes:**
- Store in user_settings: default_contribution
- Also stored with each recommendation generation
- CurrencyInput component with formatting

**FRs:** FR45

---

### Story 7.2: Enter Dividends Received

As a **user**,
I want **to enter dividends received for the period**,
So that **they're included in investable capital**.

**Acceptance Criteria:**

**Given** I am on the Dashboard
**When** I enter dividends amount
**Then** amount is added to investable capital

**And** dividends optional (default: $0)
**And** shows breakdown: "Contribution: $2,000 + Dividends: $150 = $2,150 to invest"
**And** can be skipped if no dividends

**Prerequisites:** Story 7.1

**Technical Notes:**
- Optional field next to contribution
- Calculate: total_investable = contribution + dividends

**FRs:** FR46

---

### Story 7.3: Calculate Total Investable Capital

As a **system**,
I want **to calculate total investable capital**,
So that **recommendations are generated for the correct amount**.

**Acceptance Criteria:**

**Given** contribution and dividends are entered
**When** calculation runs
**Then** total_investable = contribution + dividends

**And** calculation uses decimal.js
**And** displayed prominently: "You have $2,150 to invest"
**And** updates immediately when inputs change

**Prerequisites:** Story 7.2

**Technical Notes:**
- Client-side calculation for instant feedback
- Store in recommendations table

**FRs:** FR47

---

### Story 7.4: Generate Investment Recommendations

As a **system**,
I want **to generate recommendations based on scores and allocation targets**,
So that **users know what to buy**.

**Acceptance Criteria:**

**Given** scores and allocation targets are available
**When** recommendation generation runs
**Then** recommendations are created prioritizing:
  1. Assets below target allocation (by gap)
  2. Higher-scoring assets within each class
  3. Respecting class/subclass allocation ranges

**And** recommendation amount per asset respects minimum allocation values
**And** total recommendations = total investable capital
**And** over-allocated classes get $0 recommendation
**And** calculation is deterministic and logged

**Prerequisites:** Story 5.8, Story 4.3

**Technical Notes:**
- Recommendation engine in `lib/calculations/recommendations.ts`
- Algorithm: sort by allocation gap × score, allocate top-down
- Store in recommendations table with breakdown

**FRs:** FR48

---

### Story 7.5: Display Recommendations (Focus Mode)

As a **user**,
I want **to see recommendations as simple actionable items**,
So that **I know exactly what to buy**.

**Acceptance Criteria:**

**Given** I am on the Dashboard
**When** recommendations are loaded
**Then** I see the Focus Mode layout with:
  - Header: "Ready to invest. You have $2,150 available"
  - RecommendationCard list: "Asset A: $800 | Asset B: $650 | Asset C: $700"
  - Total: "3 assets totaling $2,150"

**And** cards show: ticker, score badge, recommended amount, allocation gauge
**And** cards are sorted by recommended amount (highest first)
**And** "No recommendations" if portfolio is balanced

**Prerequisites:** Story 7.4

**Technical Notes:**
- RecommendationCard custom component per UX spec
- Focus Mode layout in `app/(dashboard)/page.tsx`
- Pre-computed recommendations from Vercel KV cache

**FRs:** FR49

---

### Story 7.6: Zero Buy Signal for Over-Allocated

As a **system**,
I want **to show zero buy signal for over-allocated assets**,
So that **rebalancing happens naturally through contributions**.

**Acceptance Criteria:**

**Given** an asset/class is above target allocation
**When** recommendations display
**Then** that asset shows: "$0 recommended (over-allocated)"

**And** visual: grayed out card with explanation
**And** clicking shows: "Current: 55%, Target: 40-50%. Consider rebalancing through contributions."
**And** no forced selling recommendations (contribution-only rebalancing philosophy)

**Prerequisites:** Story 7.5

**Technical Notes:**
- Calculate over-allocation in recommendation engine
- Display explanation in RecommendationCard tooltip

**FRs:** FR50

---

### Story 7.7: View Recommendation Breakdown

As a **user**,
I want **to view the calculation breakdown for any recommendation**,
So that **I understand why this amount was recommended**.

**Acceptance Criteria:**

**Given** I click on a RecommendationCard
**When** the detail panel opens
**Then** I see:
  - Current allocation vs. target range
  - Score and score breakdown
  - Gap calculation: "Target: 20%, Current: 18%, Gap: 2%"
  - Amount calculation: "Gap contribution: $800"

**And** breakdown shows exactly how amount was derived
**And** includes link to score breakdown

**Prerequisites:** Story 7.5, Story 5.11

**Technical Notes:**
- Use Sheet component for slide-over panel
- Combine recommendation breakdown + score breakdown
- Store calculation details with recommendation

**FRs:** FR52

---

### Story 7.8: Confirm Recommendations

As a **user**,
I want **to confirm recommendations and enter actual invested amounts**,
So that **my portfolio updates with real transactions**.

**Acceptance Criteria:**

**Given** I am viewing recommendations
**When** I click "Confirm Investments"
**Then** I see a confirmation modal with:
  - List of recommended amounts (editable)
  - Total at bottom
  - "Confirm" and "Cancel" buttons

**And** I can adjust individual amounts (actual may differ from recommended)
**And** validation: total >= 0, individual amounts >= 0
**And** confirm saves investment records
**And** success toast: "November investments recorded"

**Prerequisites:** Story 7.5, Story 3.8

**Technical Notes:**
- ConfirmationModal component with editable amounts
- Store both recommended and actual amounts
- Update portfolio_assets after confirmation

**FRs:** FR53

---

### Story 7.9: Update Portfolio After Confirmation

As a **system**,
I want **to update portfolio allocation after investment confirmation**,
So that **new allocation is immediately visible**.

**Acceptance Criteria:**

**Given** investments are confirmed
**When** confirmation is processed
**Then** portfolio asset quantities are updated

**And** allocation percentages recalculate
**And** dashboard refreshes with new allocations
**And** recommendation cards update to show "Invested" status

**Prerequisites:** Story 7.8

**Technical Notes:**
- Transaction: create investment records + update portfolio_assets
- Invalidate KV cache for this user
- Emit events for audit trail

**FRs:** FR54

---

### Story 7.10: View Updated Allocation

As a **user**,
I want **to see updated allocation percentages immediately**,
So that **I can verify my portfolio balance**.

**Acceptance Criteria:**

**Given** investments are confirmed
**When** confirmation completes
**Then** I see updated allocation view with:
  - "Before" vs "After" comparison
  - AllocationGauges updated to new positions
  - Confirmation of which allocations improved

**And** visual celebration for balanced portfolio (subtle animation)
**And** can navigate to Portfolio view for details

**Prerequisites:** Story 7.9

**Technical Notes:**
- Calculate before/after from investment records
- Display in confirmation success screen
- Optional: confetti animation for first balanced portfolio

**FRs:** FR55

---

## Epic 8: Overnight Processing

**Goal:** Pre-compute everything overnight so users see instant recommendations on login.

**User Value:** Dashboard loads in under 2 seconds with ready-to-use recommendations.

**FRs Covered:** FR56-FR59, FR64

---

### Story 8.1: Inngest Job Infrastructure

As a **developer**,
I want **Inngest configured for background job orchestration**,
So that **overnight processing can run reliably**.

**Acceptance Criteria:**

**Given** Inngest is configured
**When** a job is triggered
**Then** it runs with automatic retries and observability

**And** Inngest client configured in `lib/inngest/client.ts`
**And** webhook handler at `app/api/inngest/route.ts`
**And** step functions enable checkpointing (resume on failure)
**And** Inngest dashboard shows job status

**Prerequisites:** Story 1.1

**Technical Notes:**
- Environment: INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
- See Architecture ADR-003
- Test locally with Inngest dev server

**FRs:** Infrastructure for FR56-FR59

---

### Story 8.2: Overnight Scoring Job

As a **system**,
I want **automated overnight processing that calculates scores**,
So that **recommendations are ready when users log in**.

**Acceptance Criteria:**

**Given** overnight processing is scheduled
**When** the job runs (2h before earliest market open)
**Then** for each active user:
  1. Fetch exchange rates
  2. Fetch prices for user's assets
  3. Calculate scores for all assets in configured markets
  4. Store scores with audit trail

**And** job completes before market open
**And** failures retry up to 3 times per step
**And** partial completion is acceptable (some users may fail)
**And** OpenTelemetry span captures job-level timing

**Prerequisites:** Story 8.1, Story 5.8, Story 6.3

**Technical Notes:**
- Function in `lib/inngest/functions/overnight-scoring.ts`
- Per-market scheduling (not per-user timezone)
- Step functions for checkpointing

**FRs:** FR56, FR57

---

### Story 8.3: Recommendation Pre-Generation

As a **system**,
I want **pre-generated recommendations per user**,
So that **dashboard load is instant**.

**Acceptance Criteria:**

**Given** scores are calculated
**When** overnight job continues
**Then** recommendations are generated for each user using:
  - Latest scores
  - User's allocation targets
  - User's default contribution amount

**And** recommendations stored in Vercel KV cache
**And** cache key: `recs:${userId}`
**And** TTL: 24 hours

**Prerequisites:** Story 8.2, Story 7.4

**Technical Notes:**
- Extend overnight-scoring function
- Use default_contribution from user_settings
- Invalidate on criteria/portfolio changes

**FRs:** FR58

---

### Story 8.4: Cache Warming

As a **system**,
I want **Vercel KV cache warmed after overnight processing**,
So that **first dashboard load is fast**.

**Acceptance Criteria:**

**Given** overnight processing completes
**When** cache warming runs
**Then** recommendations are loaded into Vercel KV for all processed users

**And** cache includes: recommendations, portfolio summary, allocation percentages
**And** dashboard can load entirely from cache (no DB queries)
**And** cache warming completes within 5 minutes

**Prerequisites:** Story 8.3, Story 1.6

**Technical Notes:**
- Separate step in overnight function
- Batch KV writes for efficiency
- Monitor cache hit rate

**FRs:** FR59

---

### Story 8.5: Instant Dashboard Load

As a **user**,
I want **to see instant recommendations on login**,
So that **I can make decisions without waiting**.

**Acceptance Criteria:**

**Given** I log in after overnight processing
**When** the dashboard loads
**Then** recommendations display in <2 seconds

**And** no "Loading..." spinner for initial view (pre-computed)
**And** DataFreshnessBadge shows when recommendations were generated
**And** "Refresh" available if user wants latest data

**Prerequisites:** Story 8.4, Story 7.5

**Technical Notes:**
- Dashboard reads from Vercel KV first
- Fallback to PostgreSQL if cache miss
- Track cache hit rate in OTel

**FRs:** FR59

---

### Story 8.6: Calculation Audit Trail

As a **system**,
I want **all calculations logged for audit**,
So that **users can review their calculation history**.

**Acceptance Criteria:**

**Given** a calculation runs
**When** it completes
**Then** events are stored: CALC_STARTED, INPUTS_CAPTURED, SCORES_COMPUTED, CALC_COMPLETED

**And** events include correlation_id linking the calculation
**And** INPUTS_CAPTURED includes criteria version and all input data
**And** users can query: "Show me all calculations for asset X"
**And** audit data retained for 2 years

**Prerequisites:** Story 1.4

**Technical Notes:**
- Already implemented in Story 1.4
- Add UI access in History or Settings
- Query by: user_id, asset_id, date range

**FRs:** FR64

---

## Epic 9: Alerts & Polish

**Goal:** Complete the experience with opportunity alerts, compliance disclaimers, and notification preferences.

**User Value:** Users discover better opportunities, trust the platform through transparency, and control how they're notified.

**FRs Covered:** FR51, FR63, FR65-FR67

---

### Story 9.1: Opportunity Alert (Better Asset Exists)

As a **user**,
I want **to be alerted when higher-scoring assets exist outside my portfolio**,
So that **I can consider better opportunities**.

**Acceptance Criteria:**

**Given** scores are calculated
**When** an asset outside my portfolio scores higher than my lowest-scoring holding in that class
**Then** I see an opportunity alert on the dashboard

**And** alert shows: "[TICKER] scores 92 vs your lowest (78). Consider swapping?"
**And** clicking shows comparison: new asset vs current holdings
**And** alert respects asset count limits (only shows if at capacity)
**And** dismissible until next score update

**Prerequisites:** Story 5.8, Story 4.5

**Technical Notes:**
- Calculate during overnight processing
- Store alerts in user_alerts table
- Display as badge/notification on dashboard

**FRs:** FR51, FR65

---

### Story 9.2: Allocation Drift Alert

As a **user**,
I want **to be alerted when my allocation drifts outside configured ranges**,
So that **I can take corrective action**.

**Acceptance Criteria:**

**Given** portfolio allocation is calculated
**When** any class is outside its target range
**Then** I see an allocation drift alert

**And** alert shows: "Fixed Income at 55%, target is 40-50%"
**And** suggestions: "Consider not adding to this class" or "Increase contributions here"
**And** dismissible with "Acknowledge" button
**And** re-triggers if drift worsens

**Prerequisites:** Story 3.7

**Technical Notes:**
- Check during recommendation generation
- Don't alert for minor drift (<2% beyond range)
- Store acknowledged alerts to avoid spam

**FRs:** FR66

---

### Story 9.3: Alert Preferences

As a **user**,
I want **to configure alert preferences**,
So that **I only receive alerts I care about**.

**Acceptance Criteria:**

**Given** I am in Settings
**When** I configure alert preferences
**Then** I can toggle:
  - Opportunity alerts (better asset discovered)
  - Allocation drift alerts
  - In-app notifications
  - Email notifications (future)

**And** defaults: all alerts on, in-app only
**And** changes take effect immediately

**Prerequisites:** Story 2.6

**Technical Notes:**
- Add alert_preferences (JSON) to user_settings
- Check preferences before creating alerts
- Email notifications deferred to Growth

**FRs:** FR67

---

### Story 9.4: Financial Disclaimers

As a **platform**,
I want **to display prominent disclaimers**,
So that **users understand this is a calculation tool, not financial advice**.

**Acceptance Criteria:**

**Given** a user views recommendations
**When** the recommendation view loads
**Then** a disclaimer footer is visible:
  > "This tool calculates based on criteria YOU configure. Not financial advice. You are solely responsible for your investment decisions."

**And** disclaimer appears on:
  - Registration (must acknowledge to continue)
  - First recommendation view (dismissible banner)
  - Footer of all recommendation screens
  - Terms of Service
**And** acknowledgment stored: user acknowledged disclaimer on [date]

**Prerequisites:** Story 2.1, Story 7.5

**Technical Notes:**
- Registration: checkbox "I understand this is not financial advice"
- Store: disclaimer_acknowledged_at in users table
- Footer component with disclaimer text

**FRs:** FR63

---

### Story 9.5: Terms of Service & Privacy Policy

As a **platform**,
I want **Terms of Service and Privacy Policy pages**,
So that **users understand their rights and our responsibilities**.

**Acceptance Criteria:**

**Given** the platform is live
**When** users access legal pages
**Then** they can view:
  - Terms of Service (usage terms, disclaimers, liability)
  - Privacy Policy (data collection, storage, rights)

**And** links in footer and registration flow
**And** must accept ToS during registration
**And** version tracking for updates

**Prerequisites:** Story 1.8

**Technical Notes:**
- Static pages: `app/(legal)/terms/page.tsx`, `app/(legal)/privacy/page.tsx`
- Store ToS version accepted by each user
- Notify users on ToS updates

**FRs:** FR63 (compliance support)

---

### Story 9.6: Empty States & Helpful Messaging

As a **user**,
I want **helpful empty states throughout the app**,
So that **I know what to do next when sections are empty**.

**Acceptance Criteria:**

**Given** a section has no data
**When** I view that section
**Then** I see a helpful empty state with:
  - Friendly message explaining the section
  - Clear CTA to add first item
  - Optional illustration

**And** empty states for:
  - No portfolios: "Create your first portfolio to track investments"
  - No assets: "Add your first asset to get started"
  - No criteria: "Set up scoring criteria to get recommendations"
  - No recommendations: "Your portfolio is perfectly balanced this month!"
  - No history: "Complete your first investment cycle to see history"

**Prerequisites:** All previous epics

**Technical Notes:**
- EmptyState component with: icon, message, cta props
- Follow UX spec Section 7.1 (Empty States)
- Consistent styling across all empty states

**FRs:** UX polish (supports all FRs)

---

## FR Coverage Matrix

| FR | Description | Epic | Story |
|----|-------------|------|-------|
| FR1 | Create account with email/password | Epic 2 | 2.1 |
| FR2 | Verify email address | Epic 2 | 2.2 |
| FR3 | Log in securely | Epic 2 | 2.3 |
| FR4 | Log out | Epic 2 | 2.4 |
| FR5 | Reset password | Epic 2 | 2.5 |
| FR6 | Update profile | Epic 2 | 2.6 |
| FR7 | Export data | Epic 2 | 2.7 |
| FR8 | Delete account | Epic 2 | 2.8 |
| FR9 | Create portfolios | Epic 3 | 3.1 |
| FR10 | Add assets | Epic 3 | 3.2 |
| FR11 | Update assets | Epic 3 | 3.3 |
| FR12 | Remove assets | Epic 3 | 3.4 |
| FR13 | Mark assets as ignored | Epic 3 | 3.5 |
| FR14 | View portfolio holdings | Epic 3 | 3.6 |
| FR15 | View allocation percentages | Epic 3 | 3.7 |
| FR16 | Record investment amounts | Epic 3 | 3.8 |
| FR17 | View investment history | Epic 3 | 3.9 |
| FR18 | Define asset classes | Epic 4 | 4.1 |
| FR19 | Define subclasses | Epic 4 | 4.2 |
| FR20 | Set class allocation ranges | Epic 4 | 4.3 |
| FR21 | Set subclass allocation ranges | Epic 4 | 4.4 |
| FR22 | Set asset count limits | Epic 4 | 4.5 |
| FR23 | Set minimum allocation values | Epic 4 | 4.6 |
| FR24 | Define scoring criteria | Epic 5 | 5.1 |
| FR25 | Set point values | Epic 5 | 5.2 |
| FR26 | Define criteria operators | Epic 5 | 5.3 |
| FR27 | View criteria library | Epic 5 | 5.4 |
| FR28 | Copy criteria set | Epic 5 | 5.5 |
| FR29 | Compare criteria sets | Epic 5 | 5.6 |
| FR30 | Preview criteria impact | Epic 5 | 5.7 |
| FR31 | Fetch asset fundamentals | Epic 6 | 6.2 |
| FR32 | Fetch daily prices | Epic 6 | 6.3 |
| FR33 | Fetch exchange rates | Epic 6 | 6.4 |
| FR34 | Calculate asset scores | Epic 5 | 5.8 |
| FR35 | Store historical scores | Epic 5 | 5.9 |
| FR36 | View asset score | Epic 5 | 5.10 |
| FR37 | View score breakdown | Epic 5 | 5.11 |
| FR38 | Force data refresh | Epic 6 | 6.6 |
| FR39 | View data freshness | Epic 6 | 6.7 |
| FR40 | Set base currency | Epic 2 | 2.6 |
| FR41 | Convert to base currency | Epic 6 | 6.5 |
| FR42 | Use previous day exchange rates | Epic 6 | 6.4 |
| FR43 | View dual currency values | Epic 3 | 3.6 |
| FR44 | Calculate allocation percentages | Epic 3 | 3.7 |
| FR45 | Enter monthly contribution | Epic 7 | 7.1 |
| FR46 | Enter dividends | Epic 7 | 7.2 |
| FR47 | Calculate total investable | Epic 7 | 7.3 |
| FR48 | Generate recommendations | Epic 7 | 7.4 |
| FR49 | Display simple recommendations | Epic 7 | 7.5 |
| FR50 | Show zero buy for over-allocated | Epic 7 | 7.6 |
| FR51 | Alert for better-scoring assets | Epic 9 | 9.1 |
| FR52 | View recommendation breakdown | Epic 7 | 7.7 |
| FR53 | Confirm recommendations | Epic 7 | 7.8 |
| FR54 | Update portfolio after confirmation | Epic 7 | 7.9 |
| FR55 | View updated allocation | Epic 7 | 7.10 |
| FR56 | Run overnight processing | Epic 8 | 8.2 |
| FR57 | Pre-calculate scores | Epic 8 | 8.2 |
| FR58 | Pre-generate recommendations | Epic 8 | 8.3 |
| FR59 | Instant recommendations on login | Epic 8 | 8.5 |
| FR60 | View data source | Epic 6 | 6.8 |
| FR61 | View update timestamp | Epic 6 | 6.7 |
| FR62 | View calculation breakdown | Epic 6 | 6.9 |
| FR63 | Display disclaimers | Epic 9 | 9.4 |
| FR64 | Log all calculations | Epic 8 | 8.6 |
| FR65 | Alert for better assets discovered | Epic 9 | 9.1 |
| FR66 | Alert for allocation drift | Epic 9 | 9.2 |
| FR67 | Configure alert preferences | Epic 9 | 9.3 |

---

## Summary

| Epic | Stories | FRs Covered | User Value |
|------|---------|-------------|------------|
| **1. Foundation** | 8 | Infrastructure | Technical foundation enabling all features |
| **2. User Onboarding** | 8 | FR1-FR8, FR40 | Secure account management |
| **3. Portfolio Core** | 9 | FR9-FR17, FR43-FR44 | Track investment holdings |
| **4. Asset Class Config** | 6 | FR18-FR23 | Define investment strategy structure |
| **5. Scoring Engine** | 11 | FR24-FR30, FR34-FR37 | Evaluate assets by personal criteria |
| **6. Data Pipeline** | 9 | FR31-FR33, FR38-FR42, FR60-FR62 | Fresh, transparent market data |
| **7. Recommendations** | 10 | FR45-FR55 | **"What should I buy?"** - Core value |
| **8. Overnight Processing** | 6 | FR56-FR59, FR64 | Instant dashboard, audit trail |
| **9. Alerts & Polish** | 6 | FR51, FR63, FR65-FR67 | Opportunity discovery, compliance |

**Total: 73 Stories covering 67 Functional Requirements**

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

_This document incorporates full context from PRD + UX Design Specification + Architecture Document._
