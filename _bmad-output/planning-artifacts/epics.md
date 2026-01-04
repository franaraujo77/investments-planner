---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - docs/prd-v2.md
  - _bmad-output/planning-artifacts/architecture.md
  - docs/ux-design-specification.md
---

# investments-planner - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for investments-planner, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**User Account & Access (FR1-FR10)**

- FR1: Users can create an account with email and password
- FR2: Users can verify their email address to activate account
- FR3: Users can log in securely and maintain authenticated sessions
- FR4: Users can log out and terminate their session
- FR5: Users can reset their password via email verification
- FR6: Users can update their profile information (name, base currency)
- FR7: Users can set regional preferences (locale, number format)
- FR8: Users can export all their data (portfolio, configurations, history)
- FR9: Users can delete their account and all associated data
- FR10: System respects user's locale for number formatting throughout the application

**Portfolio Management (FR11-FR25)**

- FR11: Users can create and name portfolios
- FR12: Users can **edit portfolio** name and settings after creation
- FR13: Users can **delete portfolio** with confirmation dialog
- FR14: System recalculates recommendations after portfolio edit/delete
- FR15: Users can add assets to portfolio with quantity and purchase price
- FR16: Users can update asset quantities and purchase prices
- FR17: Users can remove assets from portfolio
- FR18: Users can mark specific assets as "ignored" (excluded from calculations)
- FR19: Users can view current portfolio holdings with values in base currency
- FR20: Users can view current allocation percentages by asset class/subclass
- FR21: Users can record actual investment amounts after purchases
- FR22: Users can view investment history (what, when, at what allocation)
- FR23: System warns when portfolio name is similar to existing portfolio
- FR24: System provides autocomplete for asset symbols/names from API + cache
- FR25: System provides autocomplete for asset types and markets from predefined lists

**Visual Feedback & Validation (FR26-FR35)**

- FR26: System displays **pie chart** showing portfolio allocation by asset class
- FR27: Pie chart updates in **real-time** as user modifies allocations
- FR28: System displays **live sum** of allocation percentages ("X% allocated")
- FR29: System displays **remaining percentage** ("Y% remaining to reach 100%")
- FR30: System **validates total allocation equals 100%** before allowing save
- FR31: System displays **warning when user attempts to leave** with incomplete allocation
- FR32: System displays clear **status indicator** showing strategy validity
- FR33: System uses **color coding** for allocation health (green/yellow/red)
- FR34: System provides clear **error messages** with guidance to fix issues
- FR35: First-time users see **onboarding tips** explaining key features

**Asset Class Configuration (FR36-FR43)**

- FR36: Users can define asset classes (e.g., Fixed Income, Variable Income, Crypto)
- FR37: Users can define subclasses within asset classes
- FR38: Users can set allocation percentage ranges for each asset class (e.g., 40-50%)
- FR39: Users can set allocation percentage ranges for each subclass
- FR40: Users can set maximum asset count limits per class/subclass
- FR41: Users can set minimum allocation values for specific classes/subclasses
- FR42: Users can set industry sector per portfolio (e.g., Insurance, Banking, Software, Aerospace & Defense)
- FR43: Users can filter accepted asset types per portfolio

**Scoring Criteria Configuration (FR44-FR52)**

- FR44: Users can define scoring criteria for each market/asset type
- FR45: Users can set point values for each criterion
- FR46: Users can define criteria using various operators (>, <, between, equals)
- FR47: Users can view a library of their configured criteria by market/asset type
- FR48: Users can copy an existing criteria set to create a new variation
- FR49: Users can compare two criteria sets to see average score differences
- FR50: Users can preview which assets score highest with current criteria before saving
- FR51: System calculates scores automatically—**no manual overrides allowed**
- FR52: System shows historical surplus consistency scoring (+5 for 5 years, -2 per missing)

**Asset Data & Scoring (FR53-FR63)**

- FR53: System fetches asset fundamental data from configured providers (Gemini API)
- FR54: System fetches daily asset prices from market data providers
- FR55: System fetches daily exchange rates from currency data providers
- FR56: System calculates scores for all assets in configured markets based on user criteria
- FR57: System stores historical scores for trend analysis
- FR58: Users can view the current score for any asset
- FR59: Users can view which criteria contributed to an asset's score (breakdown)
- FR60: Users can force an immediate data refresh for specific assets or all assets
- FR61: Users can view data freshness (when data was last updated) for any asset
- FR62: System implements **two-tier refresh**: scheduled API fetch → cache → user refresh
- FR63: System only fetches data for markets with configured criteria

**Multi-Currency Support (FR64-FR69)**

- FR64: Users can set their portfolio base currency
- FR65: System converts all asset values to base currency for portfolio calculations
- FR66: System uses previous trading day's exchange rates for conversions
- FR67: Users can view asset values in both original currency and base currency
- FR68: System correctly calculates allocation percentages across multi-currency holdings
- FR69: System displays numbers in user's regional format (decimal separator)

**Recommendations & Allocation (FR70-FR82)**

- FR70: Users can enter their monthly contribution amount
- FR71: Users can enter dividends received for the period
- FR72: System calculates total investable capital (contribution + dividends)
- FR73: System generates investment recommendations based on scores and allocation targets
- FR74: System displays recommendations as simple actionable items ("Invest $X in Asset A")
- FR75: System shows **pie chart visualization** of recommended allocation
- FR76: System shows zero buy signal for assets/classes that are over-allocated
- FR77: System alerts users when higher-scoring assets exist but portfolio is at capacity
- FR78: Users can view the calculation breakdown for any recommendation
- FR79: Users can confirm recommendations and enter actual invested amounts
- FR80: System updates portfolio allocation after investment confirmation
- FR81: Users can view updated allocation percentages immediately after confirmation
- FR82: System shows before/after comparison of allocation after confirmation

**Overnight Pre-Computation (FR83-FR86)**

- FR83: System runs automated overnight processing before market open
- FR84: System pre-calculates scores for all assets in user's configured markets
- FR85: System pre-generates allocation recommendations for each user
- FR86: Users see instant recommendations on login (no waiting for calculations)

**Data Transparency & Trust (FR87-FR92)**

- FR87: Users can view data source for each data point (which API provided it)
- FR88: Users can view timestamp of last update for any data point
- FR89: Users can view complete calculation breakdown for any score
- FR90: System displays prominent disclaimers that this is a calculation tool, not financial advice
- FR91: System logs all calculations for user's own audit trail
- FR92: System displays data freshness indicator on all screens with market data

**Alerts & Notifications (FR93-FR95)**

- FR93: Users receive alerts when better-scoring assets are discovered outside portfolio
- FR94: Users receive alerts when allocation drifts outside configured ranges
- FR95: Users can configure alert preferences (which alerts, how delivered)

**Total: 95 Functional Requirements**

### NonFunctional Requirements

**Performance**

- NFR-P1: Dashboard load time < 2 seconds
- NFR-P2: Pie chart render < 100ms
- NFR-P3: Overnight processing complete before 6 AM local
- NFR-P4: Score calculation < 100ms per asset
- NFR-P5: Portfolio recalculation < 1 second
- NFR-P6: API response times < 500ms

**Security**

- NFR-S1: Authentication via bcrypt password hashing, JWT tokens
- NFR-S2: Data encryption at rest using AES-256 for user data
- NFR-S3: Data encryption in transit using TLS 1.3 for all connections
- NFR-S4: Session management via secure httpOnly cookies, timeout
- NFR-S5: Tenant isolation via database-level user isolation
- NFR-S6: API security with rate limiting, input validation
- NFR-S7: RLS (Row Level Security) on all Supabase tables

**Scalability**

- NFR-SC1: Support 1,000+ concurrent users
- NFR-SC2: Overnight processing scales linearly with users
- NFR-SC3: Database supports 100K+ assets across all users
- NFR-SC4: API rate limits with queue/batch to stay within limits

**Reliability**

- NFR-R1: 99.5% uptime availability
- NFR-R2: Zero data loss (data durability)
- NFR-R3: Daily automated backups
- NFR-R4: Recovery time < 4 hours from backup
- NFR-R5: Graceful degradation - show cached data if APIs down

**Internationalization**

- NFR-I1: Number formatting via Intl.NumberFormat with user locale
- NFR-I2: Decimal separator support (Point for en-US, Comma for de-DE, pt-BR)
- NFR-I3: Currency display in user's base currency + original
- NFR-I4: Locale-aware date display
- NFR-I5: Infrastructure ready for future translations (next-intl)

**Accessibility**

- NFR-A1: Color contrast WCAG 2.1 AA compliant
- NFR-A2: Full keyboard navigation support
- NFR-A3: ARIA labels on all interactive elements for screen readers
- NFR-A4: Visible focus indicators on all focusable elements

### Additional Requirements

**From Architecture Document:**

- Brownfield project with existing Next.js 16 + React 19 codebase (9 completed epics)
- Two-tier refresh pattern: Inngest Cron → PostgreSQL → Vercel KV cache
- Synchronous recalculation after portfolio CRUD operations (<100ms per asset)
- Event sourcing for calculation audit trail (immutable event log)
- Multi-tenancy via userId scoping on every query
- Financial precision using Decimal.js with 20-digit precision
- Structured logging via OpenTelemetry (never console.log/error)
- Standard API responses from `@/lib/api/responses.ts` and error codes from `@/lib/api/error-codes.ts`

**New Files Required for PRD v2.0:**

- `src/components/charts/AllocationPieChart.tsx` - Pie chart visualization
- `src/components/forms/AllocationIndicator.tsx` - Live allocation feedback
- `src/components/forms/AssetAutocomplete.tsx` - Asset search autocomplete
- `src/lib/i18n/NumberFormatProvider.tsx` - i18n context provider
- `src/lib/i18n/useNumberFormat.ts` - Number formatting hook
- `src/lib/services/scoring/recalculationService.ts` - Synchronous recalculation

**From UX Design Specification:**

- Design System: shadcn/ui with Slate Professional theme
- Layout: Command Center + Focus Mode hybrid
- Custom Components Required: RecommendationCard, ScoreBreakdown, AllocationGauge, CurrencyDisplay, DataFreshnessBadge, CriteriaBlock, MetricCard
- Mobile Support: Read-only dashboard view, confirm investments (full configuration desktop-only)
- Touch targets: Minimum 44x44px for interactive elements
- Animation guidelines: Micro-interactions 150ms, panel transitions 200ms, page transitions 300ms
- Empty states with helpful messages and CTAs
- Loading states: Full skeleton of expected layout
- Feedback patterns: Toast notifications (success 3s auto-dismiss, error persistent)

**Regulatory Compliance:**

- Not Required: SEC/FINRA broker-dealer registration, RIA registration
- Required: GDPR compliance (data export/deletion), CCPA for California users
- Prominent disclaimers: "Tool calculates based on YOUR criteria. Not financial advice."
- User data isolation in multi-tenant architecture
- Terms of service and privacy policy

### FR Coverage Map

| FR   | Epic   | Description                               |
| ---- | ------ | ----------------------------------------- |
| FR1  | Epic 1 | Create account with email/password        |
| FR2  | Epic 1 | Email verification                        |
| FR3  | Epic 1 | Secure login with sessions                |
| FR4  | Epic 1 | Logout and session termination            |
| FR5  | Epic 1 | Password reset via email                  |
| FR6  | Epic 1 | Update profile (name, currency)           |
| FR7  | Epic 1 | Set regional preferences (locale)         |
| FR8  | Epic 1 | Export all user data (GDPR)               |
| FR9  | Epic 1 | Delete account and data (GDPR)            |
| FR10 | Epic 1 | Locale-aware number formatting            |
| FR11 | Epic 2 | Create and name portfolios                |
| FR12 | Epic 2 | Edit portfolio name/settings              |
| FR13 | Epic 2 | Delete portfolio with confirmation        |
| FR14 | Epic 2 | Recalculate after edit/delete             |
| FR15 | Epic 2 | Add assets with quantity/price            |
| FR16 | Epic 2 | Update asset quantities/prices            |
| FR17 | Epic 2 | Remove assets from portfolio              |
| FR18 | Epic 2 | Mark assets as ignored                    |
| FR19 | Epic 2 | View holdings in base currency            |
| FR20 | Epic 2 | View allocation percentages               |
| FR21 | Epic 2 | Record actual investment amounts          |
| FR22 | Epic 2 | View investment history                   |
| FR23 | Epic 2 | Duplicate name warning                    |
| FR24 | Epic 2 | Asset symbol autocomplete                 |
| FR25 | Epic 2 | Asset type/market autocomplete            |
| FR26 | Epic 3 | Pie chart allocation display              |
| FR27 | Epic 3 | Real-time pie chart updates               |
| FR28 | Epic 3 | Live allocation sum display               |
| FR29 | Epic 3 | Remaining percentage display              |
| FR30 | Epic 3 | 100% validation before save               |
| FR31 | Epic 3 | Exit warning for incomplete allocation    |
| FR32 | Epic 3 | Strategy validity indicator               |
| FR33 | Epic 3 | Color-coded allocation health             |
| FR34 | Epic 3 | Clear error messages with guidance        |
| FR35 | Epic 3 | Onboarding tips for new users             |
| FR36 | Epic 4 | Define asset classes                      |
| FR37 | Epic 4 | Define subclasses                         |
| FR38 | Epic 4 | Set allocation ranges per class           |
| FR39 | Epic 4 | Set allocation ranges per subclass        |
| FR40 | Epic 4 | Set max asset count limits                |
| FR41 | Epic 4 | Set minimum allocation values             |
| FR42 | Epic 2 | Set industry sector per portfolio         |
| FR43 | Epic 2 | Filter accepted asset types per portfolio |
| FR44 | Epic 4 | Define scoring criteria per market        |
| FR45 | Epic 4 | Set point values for criteria             |
| FR46 | Epic 4 | Define criteria operators                 |
| FR47 | Epic 4 | View criteria library                     |
| FR48 | Epic 4 | Copy criteria set                         |
| FR49 | Epic 4 | Compare criteria sets                     |
| FR50 | Epic 4 | Preview highest-scoring assets            |
| FR51 | Epic 4 | No manual score overrides                 |
| FR52 | Epic 4 | Historical surplus scoring                |
| FR53 | Epic 5 | Fetch fundamental data (Gemini API)       |
| FR54 | Epic 5 | Fetch daily asset prices                  |
| FR55 | Epic 5 | Fetch daily exchange rates                |
| FR56 | Epic 5 | Calculate scores for all assets           |
| FR57 | Epic 5 | Store historical scores                   |
| FR58 | Epic 5 | View current asset score                  |
| FR59 | Epic 5 | View score criteria breakdown             |
| FR60 | Epic 5 | Force immediate data refresh              |
| FR61 | Epic 5 | View data freshness                       |
| FR62 | Epic 5 | Two-tier refresh architecture             |
| FR63 | Epic 5 | Fetch only for configured markets         |
| FR64 | Epic 2 | Set portfolio base currency               |
| FR65 | Epic 2 | Convert values to base currency           |
| FR66 | Epic 2 | Use previous day exchange rates           |
| FR67 | Epic 2 | View dual currency display                |
| FR68 | Epic 2 | Multi-currency allocation calculation     |
| FR69 | Epic 2 | Regional number format display            |
| FR70 | Epic 6 | Enter monthly contribution                |
| FR71 | Epic 6 | Enter dividends received                  |
| FR72 | Epic 6 | Calculate total investable capital        |
| FR73 | Epic 6 | Generate recommendations                  |
| FR74 | Epic 6 | Display actionable recommendations        |
| FR75 | Epic 6 | Pie chart of recommended allocation       |
| FR76 | Epic 6 | Zero-buy for over-allocated               |
| FR77 | Epic 6 | Alert for higher-scoring assets           |
| FR78 | Epic 6 | View recommendation breakdown             |
| FR79 | Epic 6 | Confirm and enter actual amounts          |
| FR80 | Epic 6 | Update allocation after confirmation      |
| FR81 | Epic 6 | View updated percentages immediately      |
| FR82 | Epic 6 | Before/after allocation comparison        |
| FR83 | Epic 5 | Automated overnight processing            |
| FR84 | Epic 5 | Pre-calculate all scores                  |
| FR85 | Epic 5 | Pre-generate recommendations              |
| FR86 | Epic 5 | Instant recommendations on login          |
| FR87 | Epic 7 | View data source attribution              |
| FR88 | Epic 7 | View update timestamps                    |
| FR89 | Epic 7 | View calculation breakdown                |
| FR90 | Epic 7 | Display financial disclaimers             |
| FR91 | Epic 7 | Calculation audit trail                   |
| FR92 | Epic 7 | Data freshness indicator                  |
| FR93 | Epic 7 | Better-scoring asset alerts               |
| FR94 | Epic 7 | Allocation drift alerts                   |
| FR95 | Epic 7 | Configure alert preferences               |

## Epic List

| Epic | Title                                    | FRs                  | User Value                             |
| ---- | ---------------------------------------- | -------------------- | -------------------------------------- |
| 1    | User Authentication & Account Foundation | FR1-FR10             | Auth, profile, regional settings, GDPR |
| 2    | Portfolio Management Foundation          | FR11-FR25, FR64-FR69 | Portfolio CRUD, multi-currency         |
| 3    | Visual Allocation Feedback               | FR26-FR35            | Pie charts, live feedback, validation  |
| 4    | Investment Strategy Configuration        | FR36-FR52            | Asset classes, scoring criteria        |
| 5    | Market Data & Scoring Engine             | FR53-FR63, FR83-FR86 | Data pipeline, pre-computation         |
| 6    | Investment Recommendations               | FR70-FR82            | Monthly recommendations, confirmation  |
| 7    | Data Transparency & Alerts               | FR87-FR95            | Calculation breakdown, alerts          |

---

## Epic 1: User Authentication & Account Foundation

**Goal:** Users can create accounts, login securely, set regional preferences (locale, currency), and manage their profile with full GDPR compliance.

**FRs Covered:** FR1-FR10 (10 requirements)

**Key Deliverables:**

- Email/password registration with verification
- Secure login with JWT sessions
- Profile management (name, base currency)
- Regional preferences (locale, number format)
- Data export and account deletion (GDPR)
- i18n infrastructure (NumberFormatProvider)

**Standalone:** Complete auth system with regional settings foundation

### Story 1.1: User Registration with Email

As a **new user**,
I want **to create an account using my email address and password**,
So that **I can access the investment planning platform**.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I enter a valid email, password (8+ chars, 1 uppercase, 1 number), and confirm password
**Then** a new user account is created with email unverified status
**And** a verification email is sent to my email address

**Given** I click the verification link in my email
**When** the link is valid and not expired (24h limit)
**Then** my account is marked as verified
**And** I am redirected to the login page with success message

**Given** I try to register with an email that already exists
**When** I submit the registration form
**Then** I see an error message: "An account with this email already exists"

**Given** I try to login with an unverified account
**When** I enter valid credentials
**Then** I see a message prompting me to verify my email first
**And** I have an option to resend the verification email

### Story 1.2: User Login and Session Management

As a **registered user**,
I want **to log in securely and manage my session**,
So that **I can access my portfolios with confidence in security**.

**Acceptance Criteria:**

**Given** I am on the login page with a verified account
**When** I enter correct email and password
**Then** I am authenticated and redirected to the dashboard
**And** a JWT access token (15min) and refresh token (7d) are issued

**Given** I enter incorrect credentials
**When** I submit the login form
**Then** I see an error message: "Invalid email or password"
**And** failed login attempt is logged for security

**Given** I am logged in
**When** I click the logout button
**Then** my session is terminated
**And** my refresh token is invalidated
**And** I am redirected to the login page

**Given** my access token expires
**When** I make an authenticated request
**Then** the system automatically refreshes my token using the refresh token
**And** the request proceeds without interruption

### Story 1.3: Password Reset Flow

As a **user who forgot my password**,
I want **to reset my password via email**,
So that **I can regain access to my account**.

**Acceptance Criteria:**

**Given** I am on the password reset page
**When** I enter my registered email address
**Then** a password reset email is sent with a secure token link
**And** I see a confirmation message (same message for existing/non-existing emails for security)

**Given** I click a valid reset link (within 1 hour)
**When** I enter and confirm a new password meeting requirements
**Then** my password is updated
**And** all existing sessions are invalidated
**And** I am redirected to login with success message

**Given** I click an expired or invalid reset link
**When** the page loads
**Then** I see an error message: "This reset link is expired or invalid"
**And** I have an option to request a new reset link

### Story 1.4: Profile Management

As a **logged-in user**,
I want **to update my profile information**,
So that **my name and base currency reflect my preferences**.

**Acceptance Criteria:**

**Given** I am on the profile settings page
**When** I update my display name
**Then** my name is saved and reflected across the application

**Given** I am on the profile settings page
**When** I change my base currency (e.g., USD to BRL)
**Then** my preference is saved
**And** portfolio values are displayed in the new base currency on next view

**Given** I try to save invalid data (empty name, invalid currency)
**When** I submit the form
**Then** I see inline validation errors with guidance to fix

### Story 1.5: Regional Preferences and i18n Infrastructure

As a **user with regional preferences**,
I want **to set my locale and number format**,
So that **numbers and dates display in my familiar format**.

**Acceptance Criteria:**

**Given** I am on the settings page
**When** I select a locale (e.g., en-US, pt-BR, de-DE)
**Then** my preference is saved to my profile

**Given** my locale is set to pt-BR
**When** I view any number in the application
**Then** numbers display with comma as decimal separator (1.234,56)
**And** currency displays with R$ prefix

**Given** my locale is set to en-US
**When** I view any number in the application
**Then** numbers display with period as decimal separator (1,234.56)
**And** currency displays with $ prefix

**Given** the NumberFormatProvider wraps the application
**When** any component calls useNumberFormat()
**Then** it receives formatNumber, formatCurrency, and formatPercent functions
**And** these functions respect the user's locale setting

### Story 1.6: GDPR Compliance (Data Export & Deletion)

As a **user concerned about data privacy**,
I want **to export all my data or delete my account**,
So that **I maintain control over my personal information**.

**Acceptance Criteria:**

**Given** I am on the account settings page
**When** I click "Export My Data"
**Then** a job is queued to generate my data export
**And** I receive an email with a download link when ready (within 24h)

**Given** I download my data export
**When** I open the file
**Then** it contains all my data in JSON format: profile, portfolios, holdings, strategies, history

**Given** I am on the account settings page
**When** I click "Delete My Account"
**Then** I see a confirmation dialog explaining consequences
**And** I must type "DELETE" to confirm

**Given** I confirm account deletion
**When** the deletion processes
**Then** all my data is permanently removed from the system
**And** I receive a confirmation email
**And** I am logged out and cannot log in again

---

## Epic 2: Portfolio Management Foundation

**Goal:** Users can create, view, edit, and delete portfolios with full CRUD for holdings, multi-currency support, and asset autocomplete.

**FRs Covered:** FR11-FR25, FR42-FR43, FR64-FR69 (23 requirements)

**Key Deliverables:**

- Portfolio CRUD (create, edit, delete with confirmation)
- Holdings management (add, update, remove)
- Asset autocomplete from API + cache
- Multi-currency display and conversion
- Investment history tracking
- Synchronous recalculation after changes

**Standalone:** Complete portfolio management with multi-currency

### Story 2.1: Create Portfolio

As a **user**,
I want **to create a new portfolio with name, currency, industry sector, and asset types**,
So that **I can organize my investments by sector and strategy**.

**Acceptance Criteria:**

**Given** I am on the portfolios page
**When** I click "Create Portfolio"
**Then** I see a form to enter: portfolio name, base currency, industry sector, and accepted asset types

**Given** I enter a valid portfolio name
**When** I select an industry sector (e.g., Insurance, Banking, Software, Aerospace & Defense)
**Then** my portfolio is tagged with that sector for organization and filtering

**Given** I select accepted asset types (e.g., Stocks, ETFs, REITs, Bonds)
**When** I submit the form
**Then** a new portfolio is created with these settings
**And** only assets matching these types can be added to this portfolio

**Given** I enter a name similar to an existing portfolio (case-insensitive match)
**When** I am typing the name
**Then** I see a warning: "You have a portfolio with a similar name: [existing name]"
**And** I can still proceed if I choose to

**Given** I try to create a portfolio without required fields
**When** I submit the form
**Then** I see validation errors for: name, industry sector, and at least one asset type required

### Story 2.2: View Portfolio and Holdings

As a **user**,
I want **to view my portfolio holdings with current values**,
So that **I can see my current investment position**.

**Acceptance Criteria:**

**Given** I have a portfolio with holdings
**When** I navigate to the portfolio detail page
**Then** I see a list of all holdings with: asset name, quantity, current price, total value

**Given** I am viewing my portfolio
**When** the page loads
**Then** all values are displayed in my base currency
**And** I see current allocation percentages for each holding

**Given** I have no holdings in a portfolio
**When** I view the portfolio
**Then** I see an empty state with a CTA: "Add your first asset"

**Given** I am viewing my portfolio
**When** I click on any holding row
**Then** I see detailed information about that asset

### Story 2.3: Edit Portfolio

As a **user**,
I want **to edit my portfolio settings including industry sector and asset types**,
So that **I can adjust my portfolio configuration as my strategy evolves**.

**Acceptance Criteria:**

**Given** I am on the portfolio detail page
**When** I click "Edit Portfolio"
**Then** I see a form with current name, currency, industry sector, and asset types pre-filled

**Given** I update the portfolio name
**When** I save the changes
**Then** the name is updated
**And** I see a success toast: "Portfolio updated"

**Given** I change the industry sector
**When** I have existing holdings that don't match the new sector
**Then** I see a confirmation dialog: "Changing industry sector will permanently remove [N] assets from this portfolio: [list of assets]. Do you want to continue?"
**And** the dialog has "Cancel" and "Confirm" buttons

**Given** I remove an asset type that has existing holdings
**When** I try to save
**Then** I see a confirmation dialog: "Removing asset type [X] will permanently remove [N] assets from this portfolio: [list of assets]. Do you want to continue?"
**And** the dialog has "Cancel" and "Confirm" buttons

**Given** I click "Confirm" in the warning dialog
**When** the save completes
**Then** the incompatible assets are permanently removed from the portfolio
**And** allocation percentages are recalculated
**And** I see a success toast: "Portfolio updated. [N] assets removed."

**Given** I click "Cancel" in the warning dialog
**When** the dialog closes
**Then** no changes are made and I return to editing

**Given** I change the portfolio base currency (without changing sector/types)
**When** I save the changes
**Then** all holdings are recalculated in the new base currency
**And** allocation percentages are updated accordingly

**Given** I make changes and try to leave without saving
**When** I navigate away
**Then** I see a confirmation dialog: "You have unsaved changes"

### Story 2.4: Delete Portfolio

As a **user**,
I want **to delete a portfolio I no longer need**,
So that **I can keep my account organized**.

**Acceptance Criteria:**

**Given** I am on the portfolio detail page
**When** I click "Delete Portfolio"
**Then** I see a confirmation dialog explaining this cannot be undone

**Given** I am in the delete confirmation dialog
**When** I type the portfolio name to confirm and click "Delete"
**Then** the portfolio and all its holdings are permanently deleted
**And** I am redirected to the portfolios list
**And** I see a success toast: "Portfolio deleted"

**Given** I delete a portfolio
**When** the deletion completes
**Then** any cached recommendations are invalidated
**And** the system recalculates overall user statistics

**Given** I am in the delete confirmation dialog
**When** I click "Cancel"
**Then** the dialog closes and no changes are made

### Story 2.5: Add Holdings to Portfolio

As a **user**,
I want **to add assets to my portfolio with quantity and purchase price**,
So that **I can track my investments**.

**Acceptance Criteria:**

**Given** I am on the portfolio detail page
**When** I click "Add Asset"
**Then** I see a form with asset search, quantity, and purchase price fields

**Given** I start typing an asset symbol or name
**When** I have typed 2+ characters
**Then** I see autocomplete suggestions from cached common assets
**And** additional results are fetched from the market data API

**Given** I select an asset from autocomplete
**When** the asset is selected
**Then** the asset type and market are auto-populated
**And** current price is displayed for reference

**Given** I enter quantity and purchase price
**When** I submit the form
**Then** the holding is added to my portfolio
**And** allocation percentages are recalculated
**And** I see the new holding in the list

**Given** I try to add an asset that's already in my portfolio
**When** I select it
**Then** I see a message: "This asset is already in your portfolio. Would you like to update the quantity?"

### Story 2.6: Update and Remove Holdings

As a **user**,
I want **to update quantities, remove assets, or mark them as ignored**,
So that **I can maintain accurate portfolio data**.

**Acceptance Criteria:**

**Given** I have a holding in my portfolio
**When** I click "Edit" on the holding row
**Then** I can update the quantity and purchase price

**Given** I update a holding's quantity
**When** I save the changes
**Then** the holding is updated
**And** allocation percentages are recalculated immediately

**Given** I want to remove an asset
**When** I click "Remove" on the holding row
**Then** I see a confirmation: "Remove [Asset] from portfolio?"
**And** upon confirmation, the holding is deleted

**Given** I want to exclude an asset from calculations without removing it
**When** I click "Ignore" on the holding row
**Then** the asset is marked as ignored
**And** it appears grayed out in the list
**And** it is excluded from allocation calculations

**Given** I have an ignored asset
**When** I click "Include" on the holding row
**Then** the asset is included in calculations again

### Story 2.7: Multi-Currency Portfolio Display

As a **user with international investments**,
I want **to see all values converted to my base currency**,
So that **I can understand my total portfolio value**.

**Acceptance Criteria:**

**Given** I have holdings in different currencies (e.g., USD, BRL, EUR)
**When** I view my portfolio
**Then** all values are converted and displayed in my base currency
**And** the original currency value is shown on hover/click

**Given** exchange rates are fetched daily
**When** I view my portfolio
**Then** conversions use the previous trading day's rates
**And** I see a data freshness indicator showing when rates were last updated

**Given** I have a multi-currency portfolio
**When** allocation percentages are calculated
**Then** they are calculated based on converted base currency values
**And** the total equals 100% of portfolio value

**Given** my locale is set (from Epic 1)
**When** I view currency values
**Then** numbers display in my regional format (e.g., 1.234,56 for pt-BR)
**And** currency symbols match my locale

### Story 2.8: Investment History

As a **user**,
I want **to record and view my investment history**,
So that **I can track my decisions over time**.

**Acceptance Criteria:**

**Given** I confirm an investment (buy assets)
**When** I enter the actual amounts invested
**Then** the investment is recorded with: date, asset, quantity, amount, allocation at time

**Given** I want to view my investment history
**When** I navigate to the portfolio history tab
**Then** I see a chronological list of all investments
**And** each entry shows: date, what was bought, amount invested, allocation at that time

**Given** I am viewing investment history
**When** I click on an entry
**Then** I see the full details of that investment including prices at that time

**Given** I want to analyze my investment patterns
**When** I view history
**Then** I can filter by date range, asset class, or asset

---

## Epic 3: Visual Allocation Feedback

**Goal:** Users see real-time pie charts showing allocation, live percentage feedback, and clear validation preventing incomplete strategies.

**FRs Covered:** FR26-FR35 (10 requirements)

**Key Deliverables:**

- AllocationPieChart component (real-time updates)
- AllocationIndicator ("X% allocated, Y% remaining")
- 100% allocation validation before save
- Exit warning for incomplete allocation
- Color-coded status indicators
- Onboarding tips for first-time users

**Standalone:** Visual feedback components usable across the app

### Story 3.1: Allocation Pie Chart Component

As a **user**,
I want **to see a pie chart visualizing my portfolio allocation**,
So that **I can instantly understand how my investments are distributed**.

**Acceptance Criteria:**

**Given** I am viewing a portfolio or strategy configuration
**When** the page loads
**Then** I see a pie chart showing allocation by asset class
**And** each slice is labeled with class name and percentage
**And** the chart renders in less than 100ms

**Given** I am editing allocations in a form
**When** I change any allocation percentage
**Then** the pie chart updates in real-time (no page refresh)
**And** the visual transition is smooth (< 200ms animation)

**Given** I hover over a pie slice
**When** the tooltip appears
**Then** I see: asset class name, percentage, and value in base currency

**Given** I am using a screen reader
**When** the pie chart is displayed
**Then** accessible text describes the allocation distribution
**And** ARIA labels are provided for each segment

**Given** the chart component receives data
**When** data includes optional color property
**Then** the chart uses provided colors
**And** falls back to a predefined accessible color palette

### Story 3.2: Live Allocation Indicator

As a **user**,
I want **to see a live indicator showing my total allocation and remaining percentage**,
So that **I know exactly how much allocation I have left to assign**.

**Acceptance Criteria:**

**Given** I am editing allocation percentages
**When** I view the allocation indicator
**Then** I see "X% allocated" showing the current sum

**Given** the total allocation is less than 100%
**When** I view the indicator
**Then** I see "Y% remaining to reach 100%" in neutral color

**Given** the total allocation equals exactly 100%
**When** I view the indicator
**Then** I see "100% allocated" in green (success) color
**And** a checkmark icon appears

**Given** the total allocation exceeds 100%
**When** I view the indicator
**Then** I see "X% allocated (Y% over)" in red (error) color
**And** a warning icon appears

**Given** I change any allocation value
**When** the field loses focus or value changes
**Then** the indicator updates immediately (< 50ms)

### Story 3.3: Allocation Validation

As a **user**,
I want **the system to validate my allocation totals 100% before saving**,
So that **I cannot accidentally save an incomplete or invalid strategy**.

**Acceptance Criteria:**

**Given** I am editing a strategy with allocation percentages
**When** the total allocation is not exactly 100%
**Then** the Save button is disabled
**And** I see a message explaining why: "Allocation must equal 100%"

**Given** the total allocation equals exactly 100%
**When** I view the form
**Then** the Save button is enabled
**And** I see a success indicator: "Ready to save"

**Given** I have unsaved changes with invalid allocation
**When** I try to navigate away from the page
**Then** I see a warning dialog: "Your allocation doesn't equal 100%. Changes will be lost. Leave anyway?"
**And** the dialog has "Stay" and "Leave" buttons

**Given** I am on a form with allocation fields
**When** I view the status area
**Then** I see a clear validity indicator (valid/invalid icon)
**And** the current allocation status is always visible

### Story 3.4: Visual Status Feedback

As a **user**,
I want **color-coded feedback on my allocation health**,
So that **I can quickly identify problems and understand how to fix them**.

**Acceptance Criteria:**

**Given** my allocation is within target ranges
**When** I view the allocation display
**Then** items are shown in green (healthy)

**Given** my allocation is slightly outside target range (within 5%)
**When** I view the allocation display
**Then** items are shown in yellow/amber (attention needed)

**Given** my allocation is significantly outside target range (>5%)
**When** I view the allocation display
**Then** items are shown in red (problem)

**Given** I have a validation error
**When** the error is displayed
**Then** I see a clear message explaining the issue
**And** guidance on how to fix it (e.g., "Reduce stocks by 10% to reach 100%")

**Given** a field has an error
**When** I view the form
**Then** the field border is red
**And** error text appears below the field

**Given** a field is valid and has been touched
**When** I view the form
**Then** the field border is green
**And** no error text is shown

### Story 3.5: Onboarding Tips

As a **first-time user**,
I want **to see helpful tips explaining key features**,
So that **I understand how to use the platform effectively**.

**Acceptance Criteria:**

**Given** I am a new user (first login or first time on a feature)
**When** I visit a key feature page (portfolio, strategy, recommendations)
**Then** I see contextual onboarding tips highlighting important elements

**Given** an onboarding tip is displayed
**When** I view it
**Then** I see a tooltip or card with: title, brief explanation, and "Got it" dismiss button

**Given** I dismiss an onboarding tip
**When** I click "Got it"
**Then** the tip is hidden
**And** my preference is saved (tip won't show again)

**Given** I want to see tips again
**When** I go to Settings > Help
**Then** I have an option to "Reset onboarding tips"

**Given** I am on the allocation editing screen for the first time
**When** tips are shown
**Then** I see tips for: pie chart interaction, allocation indicator, 100% validation rule

### Story 3.6: Strategy Allocation Overview Chart

As a **user**,
I want **to see a pie chart on the strategy page showing how my asset classes contribute to my total portfolio**,
So that **I can visualize my current allocation distribution while managing my investment strategy**.

**Acceptance Criteria:**

**Given** I am on the strategy page
**When** the page loads
**Then** I see a pie chart showing actual allocation percentages by asset class
**And** each slice represents an asset class with its current percentage of total portfolio value
**And** the chart renders in less than 100ms

**Given** I have assets assigned to asset classes
**When** I view the strategy page pie chart
**Then** each asset class shows its percentage contribution based on actual portfolio values
**And** unclassified assets are shown as a separate "Unclassified" segment

**Given** I hover over a pie slice
**When** the tooltip appears
**Then** I see: asset class name, current percentage, value in base currency, and number of assets

**Given** my portfolio has no assets
**When** I view the strategy page
**Then** I see an empty state message: "Add assets to your portfolio to see allocation breakdown"

**Given** I have asset classes with target ranges configured
**When** I view the pie chart
**Then** I can compare current allocation (pie chart) against my target ranges
**And** color coding indicates if each class is under/on-target/over allocation

**Given** I am using a screen reader
**When** the pie chart is displayed
**Then** accessible text describes the allocation distribution
**And** ARIA labels are provided for each segment

### Story 3.7: Strategy Allocation Balance Indicator

As a **user**,
I want **to see a visual indicator showing how much allocation is remaining or over to reach 100% across my asset classes**,
So that **I can quickly understand if my strategy configuration is complete and balanced**.

**Acceptance Criteria:**

**Given** I am on the strategy page
**When** I view the allocation summary
**Then** I see the total allocation percentage across all asset classes
**And** I see how much is remaining to reach 100% (if under)
**And** I see how much is over 100% (if exceeded)

**Given** the sum of minimum allocations is less than 100%
**When** I view the indicator
**Then** I see "X% allocated, Y% remaining" in neutral/info color
**And** a progress bar shows the current allocation level

**Given** the sum of minimum allocations equals exactly 100%
**When** I view the indicator
**Then** I see "100% allocated" in green (success) color
**And** a checkmark icon appears indicating valid configuration

**Given** the sum of minimum allocations exceeds 100%
**When** I view the indicator
**Then** I see "X% allocated (Y% over)" in red (error) color
**And** a warning icon appears
**And** I see guidance: "Reduce allocations to reach 100%"

**Given** I have no asset classes configured
**When** I view the strategy page
**Then** I see "0% allocated" with prompt to add asset classes

**Given** I modify an asset class allocation range
**When** the value changes
**Then** the indicator updates immediately (< 50ms)
**And** the visual feedback reflects the new total

**Given** I am using a screen reader
**When** the indicator is displayed
**Then** accessible text announces the allocation status
**And** ARIA live region updates when values change

---

## Epic 4: Investment Strategy Configuration

**Goal:** Users can define their complete investment strategy including asset classes, subclasses, allocation ranges, and scoring criteria.

**FRs Covered:** FR36-FR41, FR44-FR52 (15 requirements - FR42-FR43 moved to Epic 2)

**Key Deliverables:**

- Asset class/subclass CRUD (Notion-style blocks)
- Allocation percentage ranges per class
- Maximum asset counts and minimum values
- Scoring criteria configuration
- Criteria operators (>, <, between, equals)
- Criteria preview and comparison
- No manual score overrides (system-enforced)

**Standalone:** Complete strategy configuration system

### Story 4.1: Asset Class Management

As a **user**,
I want **to define asset classes and subclasses for my investment strategy**,
So that **I can organize my portfolio according to my investment methodology**.

**Acceptance Criteria:**

**Given** I am on the strategy configuration page
**When** I click "Add Asset Class"
**Then** I see a form to enter: class name, description, and optional color

**Given** I create an asset class (e.g., "Fixed Income")
**When** I save the class
**Then** it appears in my asset class list
**And** I can add subclasses to it

**Given** I have an asset class
**When** I click "Add Subclass"
**Then** I can create a subclass (e.g., "Government Bonds", "Corporate Bonds")
**And** the subclass is linked to its parent class

**Given** I want to edit an asset class or subclass
**When** I click on the item
**Then** I can edit its name, description, and color inline (Notion-style blocks)

**Given** I want to delete an asset class with subclasses
**When** I click "Delete"
**Then** I see a confirmation: "This will also delete [N] subclasses. Continue?"
**And** upon confirmation, the class and all subclasses are removed

**Given** I try to delete a class that has holdings assigned
**When** I click "Delete"
**Then** I see an error: "Cannot delete. [N] assets are assigned to this class."

### Story 4.2: Allocation Range Configuration

As a **user**,
I want **to set allocation ranges, limits, and minimum values for each class/subclass**,
So that **the system can generate recommendations aligned with my target allocation**.

**Acceptance Criteria:**

**Given** I am editing an asset class
**When** I set allocation range
**Then** I can enter minimum and maximum percentage (e.g., 40-50%)
**And** the range is validated (min <= max, values 0-100)

**Given** I am editing a subclass
**When** I set allocation range
**Then** the range must be within its parent class range
**And** I see a warning if subclass ranges don't sum correctly

**Given** I am editing an asset class or subclass
**When** I set maximum asset count
**Then** I can limit how many assets can be held in that category
**And** recommendations respect this limit

**Given** I am editing an asset class or subclass
**When** I set minimum allocation value
**Then** I specify the smallest investment amount for that category
**And** recommendations won't suggest amounts below this threshold

**Given** I have configured allocation ranges
**When** I view the strategy overview
**Then** I see all classes/subclasses with their ranges in a visual hierarchy
**And** I can see if total ranges are valid (sum to 100%)

### Story 4.3: Scoring Criteria Creation

As a **user**,
I want **to define scoring criteria with point values and operators**,
So that **the system can score assets according to my investment methodology**.

**Acceptance Criteria:**

**Given** I am on the scoring criteria page
**When** I click "Add Criterion"
**Then** I see a form to define: name, description, data field, operator, value(s), and points

**Given** I am creating a criterion
**When** I select an operator
**Then** I can choose from: greater than (>), less than (<), between, equals, not equals
**And** the value fields adjust accordingly (single value or range)

**Given** I define a criterion (e.g., "P/E Ratio < 15 = 10 points")
**When** I save the criterion
**Then** it is added to my criteria set for that market/asset type

**Given** I am creating criteria
**When** I assign point values
**Then** I can set positive points (reward) or negative points (penalty)
**And** points can range from -100 to +100

**Given** I want to organize criteria
**When** I drag and drop criteria blocks
**Then** I can reorder them by priority
**And** the order is preserved

### Story 4.4: Criteria Library and Management

As a **user**,
I want **to view and manage my library of scoring criteria**,
So that **I can reuse and organize my investment rules**.

**Acceptance Criteria:**

**Given** I am on the criteria library page
**When** I view my criteria
**Then** I see criteria organized by market/asset type
**And** each criterion shows: name, operator, value, points

**Given** I want to reuse a criteria set
**When** I click "Copy" on an existing set
**Then** a duplicate is created with "(Copy)" suffix
**And** I can edit the copy without affecting the original

**Given** I try to manually override a score
**When** I look for override options
**Then** there is no way to manually set scores
**And** the system enforces that all scores are calculated automatically

**Given** I want to delete a criterion
**When** I click "Delete" on a criterion
**Then** I see a confirmation dialog
**And** upon confirmation, the criterion is removed

**Given** I edit a criterion
**When** I save changes
**Then** the criterion is updated
**And** affected scores will be recalculated on next refresh

### Story 4.5: Criteria Preview and Comparison

As a **user**,
I want **to preview and compare how different criteria sets affect asset scores**,
So that **I can fine-tune my investment strategy before committing**.

**Acceptance Criteria:**

**Given** I have made changes to my criteria
**When** I click "Preview"
**Then** I see a list of assets ranked by their scores under the new criteria
**And** I can see which assets would score highest

**Given** I want to compare two criteria sets
**When** I select "Compare" and choose two sets
**Then** I see a side-by-side comparison showing:

- Average score differences
- Which assets rank higher/lower in each
- Point differences by criterion

**Given** I am previewing criteria changes
**When** I view the preview
**Then** scores are calculated in real-time (not saved)
**And** I can adjust criteria and see updated preview immediately

**Given** I am satisfied with the preview
**When** I click "Save Criteria"
**Then** the criteria are saved
**And** actual scores will be recalculated on next scheduled refresh

### Story 4.6: Historical Surplus Scoring

As a **user**,
I want **the scoring system to reward consistent dividend surplus history**,
So that **reliable dividend-paying assets score higher**.

**Acceptance Criteria:**

**Given** an asset has 5+ consecutive years of dividend surplus
**When** the score is calculated
**Then** the asset receives +5 bonus points for consistency

**Given** an asset is missing dividend data for any of the last 5 years
**When** the score is calculated
**Then** the asset receives -2 points per missing year

**Given** I view an asset's score breakdown
**When** I look at the surplus scoring
**Then** I see: years of data available, years with surplus, bonus/penalty applied

**Given** dividend history data is incomplete
**When** the score is displayed
**Then** I see a note: "Based on [N] years of available data"

---

## Epic 5: Market Data & Scoring Engine

**Goal:** System automatically fetches market data, calculates scores for all assets based on user criteria, and pre-computes recommendations overnight for instant access.

**FRs Covered:** FR53-FR63, FR83-FR86 (15 requirements)

**Key Deliverables:**

- Two-tier refresh (Inngest → PostgreSQL → Vercel KV)
- Market data fetching (Gemini API primary)
- Exchange rate fetching
- Score calculation engine
- Overnight pre-computation (before 6 AM)
- Force refresh capability
- Historical score storage
- Industry/Sector classification cache (GICS standard)
- Asset type classification cache (multi-jurisdiction: SEC, CVM)

**Cross-Cutting Requirement (All Stories):**

- All database tables storing cached data MUST use the `cached_` prefix
- All cache records MUST include a `cache_updated_at` timestamp column
- This enables easy identification of cacheable vs. transactional data

**Standalone:** Complete data pipeline with automated processing

### Story 5.1: Market Data Fetching

As a **system**,
I want **to fetch comprehensive data including IR publications, prices, and exchange rates**,
So that **users have complete market data for their investment decisions**.

**Acceptance Criteria:**

**Given** the system has configured data providers
**When** the scheduled fetch runs
**Then** fundamental data is fetched from Gemini API for all tracked assets
**And** data includes: P/E ratio, dividend yield, market cap, sector, etc.

**Given** assets have investor relations publications
**When** the data fetch runs
**Then** the system retrieves all available IR data including:

- Annual reports and financial statements
- Quarterly earnings reports
- Dividend announcements and history
- Revenue and profit margins
- Debt levels and cash flow
- Management guidance and forecasts
- Surplus/deficit history per year

**Given** the system needs current prices
**When** the price fetch runs
**Then** daily closing prices are retrieved for all assets in user portfolios
**And** prices are stored with timestamp and source attribution

**Given** the system needs exchange rates
**When** the exchange rate fetch runs
**Then** rates are retrieved for all currency pairs needed
**And** the previous trading day's rates are used for consistency

**Given** an API call fails
**When** the error is detected
**Then** the system retries with exponential backoff (max 3 retries)
**And** failures are logged with structured logging
**And** cached data remains available

**Given** API rate limits are approached
**When** requests are queued
**Then** the system batches requests to stay within limits
**And** prioritizes assets in active user portfolios

**Given** IR data is fetched
**When** data is stored
**Then** the source is attributed (e.g., "Company IR", "SEC Filing", "B3 Filing")
**And** publication date is recorded for freshness tracking

### Story 5.2: Two-Tier Refresh Architecture

As a **system**,
I want **to implement a two-tier cache with scheduled and on-demand refresh**,
So that **users get fast responses while data stays reasonably fresh**.

**Acceptance Criteria:**

**Given** the refresh architecture is configured
**When** data flows through the system
**Then** it follows: Inngest Cron → PostgreSQL (source of truth) → Vercel KV (cache)

**Given** the scheduled refresh runs
**When** new data is fetched
**Then** PostgreSQL is updated first
**And** Vercel KV cache is invalidated/updated
**And** cache TTLs are set appropriately (prices: 1h, fundamentals: 24h)

**Given** a user requests data
**When** cache is valid
**Then** data is served from Vercel KV (< 50ms response)

**Given** cache is stale or missing
**When** a user requests data
**Then** data is fetched from PostgreSQL
**And** cache is repopulated

**Given** data is only needed for configured markets
**When** the fetch runs
**Then** only markets with user-defined criteria are fetched
**And** unused markets are not fetched (saves API quota)

### Story 5.3: Score Calculation Engine

As a **system**,
I want **to calculate scores for all assets based on user-defined criteria**,
So that **assets can be ranked for investment recommendations**.

**Acceptance Criteria:**

**Given** a user has defined scoring criteria
**When** scores are calculated
**Then** each criterion is evaluated against asset data
**And** points are summed to produce a total score
**And** calculation completes in < 100ms per asset

**Given** an asset is being scored
**When** the calculation runs
**Then** each criterion result is stored (for breakdown display)
**And** the total score is stored with timestamp

**Given** scores are calculated
**When** they are stored
**Then** historical scores are preserved in a time-series format
**And** previous scores are not overwritten (append-only)

**Given** financial calculations are performed
**When** precision is required
**Then** Decimal.js with 20-digit precision is used
**And** rounding follows standard financial conventions

**Given** a criterion references missing data
**When** the score is calculated
**Then** that criterion is skipped (0 points)
**And** a note is added: "Missing data for [criterion]"

### Story 5.4: View Asset Scores

As a **user**,
I want **to view the current score and breakdown for any asset**,
So that **I understand why an asset ranks the way it does**.

**Acceptance Criteria:**

**Given** I am viewing an asset
**When** I look at the score section
**Then** I see the total score (0-100 scale or custom range)
**And** the score is color-coded (green/yellow/red based on thresholds)

**Given** I want to understand a score
**When** I click "View Breakdown"
**Then** I see each criterion with:

- Criterion name
- Actual value from data
- Operator and threshold
- Points awarded/deducted

**Given** I am viewing the breakdown
**When** a criterion was skipped due to missing data
**Then** I see it marked as "No data available"
**And** it shows 0 points contribution

**Given** I am viewing scores
**When** data was recently updated
**Then** I see when the score was last calculated
**And** I can see the data freshness for underlying metrics

### Story 5.5: Manual Data Refresh

As a **user**,
I want **to force an immediate data refresh when needed**,
So that **I can see the latest data before making investment decisions**.

**Acceptance Criteria:**

**Given** I am viewing my portfolio or an asset
**When** I click "Refresh Data"
**Then** fresh data is fetched from APIs for that asset/portfolio
**And** I see a loading indicator during the refresh
**And** scores are recalculated with new data

**Given** I want to refresh all data
**When** I click "Refresh All"
**Then** all assets in my portfolios are refreshed
**And** I see progress: "Refreshing 15 of 42 assets..."

**Given** I view any screen with market data
**When** I look at the data freshness indicator
**Then** I see when data was last updated (e.g., "Updated 2 hours ago")
**And** the indicator is color-coded (green < 24h, amber 1-3 days, red > 3 days)

**Given** a manual refresh fails
**When** the error occurs
**Then** I see an error message: "Could not refresh [asset]. Using cached data."
**And** cached data remains displayed

**Given** I triggered a refresh recently (< 5 minutes)
**When** I try to refresh again
**Then** I see a message: "Data was just refreshed. Try again in [X] minutes."
**And** rate limiting prevents excessive API calls

### Story 5.6: Overnight Pre-Computation

As a **system**,
I want **to pre-compute scores and recommendations overnight**,
So that **users see instant results when they log in**.

**Acceptance Criteria:**

**Given** the overnight job is scheduled
**When** the configured time arrives (default: 4 AM local)
**Then** the job starts automatically via Inngest cron

**Given** the overnight job runs
**When** processing begins
**Then** it fetches latest market data for all configured markets
**And** calculates scores for all assets in user portfolios
**And** generates recommendations for each user
**And** caches results in Vercel KV

**Given** overnight processing is running
**When** progress is tracked
**Then** structured logs record: start time, users processed, assets scored, errors
**And** the job completes before 6 AM local time

**Given** a user logs in after overnight processing
**When** they view their dashboard
**Then** recommendations are displayed instantly (< 2s page load)
**And** no calculation delay is experienced

**Given** overnight processing fails for a user
**When** they log in
**Then** on-demand calculation is triggered
**And** they see a brief loading state
**And** the failure is logged for investigation

**Given** the system tracks processing metrics
**When** overnight job completes
**Then** metrics are recorded: duration, users processed, success rate
**And** alerts are triggered if processing exceeds time limits

### Story 5.7: Industry/Sector Classification Cache

As a **system**,
I want **to cache and maintain standardized industry/sector classifications using GICS (Global Industry Classification Standard) with a three-tier hierarchical key system**,
So that **users can filter assets broadly (all Tech) or granularly (only SaaS companies) and the app aligns with institutional IR reporting standards**.

**Acceptance Criteria:**

**Given** the system needs to classify assets
**When** the classification schema is implemented
**Then** the system uses GICS three-tier hierarchy:

- SectorID (2-digit): e.g., 45 for Information Technology
- IndustryGroupID (4-digit): e.g., 4510 for Software & Services
- IndustryID (6-digit): e.g., 451030 for Software

**Given** assets are fetched via the Gemini provider
**When** fundamentals data is retrieved
**Then** sector and industry strings from Gemini are mapped to GICS codes
**And** unmapped classifications are logged for review

**Given** industry classification data is stored
**When** the cache is populated
**Then** data is stored in PostgreSQL as source of truth
**And** Vercel KV cache provides fast lookups (< 50ms)

**Given** a user wants to filter assets
**When** they specify a classification level
**Then** they can filter by Sector, Industry Group, or Industry
**And** queries are optimized with appropriate indexes

**Given** the overnight job runs
**When** fundamentals are fetched
**Then** asset classifications are updated from Gemini data
**And** classification changes are logged for audit

### Story 5.8: Asset Type Classification Cache

As a **system**,
I want **to cache and maintain standardized asset type classifications (REITs, Stocks, ETFs, etc.) with a localization overlay that accounts for regulatory differences between jurisdictions (SEC/US, CVM/Brazil)**,
So that **the app can correctly classify assets across markets, link equivalent instruments via ISIN, and scale to new countries/regions without database schema changes**.

**Acceptance Criteria:**

**Given** the system needs to classify asset types
**When** the schema is implemented
**Then** canonical (universal) asset types are defined (COMMON_STOCK, ETF, REIT, etc.)
**And** the schema is jurisdiction-agnostic

**Given** different jurisdictions use different nomenclature
**When** the localization overlay is implemented
**Then** a separate table maps canonical types to local names per jurisdiction
**And** jurisdictions include US-SEC, BR-CVM with extensibility for others

**Given** assets may exist in multiple markets
**When** asset data is fetched or parsed from IR reports
**Then** ISIN (International Securities Identification Number) is stored as the universal identifier
**And** assets with same ISIN are linked as equivalent instruments

**Given** a new jurisdiction needs to be added
**When** the configuration is updated
**Then** only data inserts are required (no schema changes)
**And** new localization mappings are added to overlay table

---

## Epic 6: Investment Recommendations

**Goal:** Users receive actionable monthly investment recommendations, can enter contributions and dividends, confirm purchases, and see before/after allocation comparisons.

**FRs Covered:** FR70-FR82 (13 requirements)

**Key Deliverables:**

- Monthly contribution input
- Dividend entry
- Recommendation generation algorithm
- Simple display ("Invest $X in Asset A")
- Pie chart visualization of recommendations
- Zero-buy signal for over-allocated assets
- Investment confirmation flow
- Before/after allocation comparison

**Standalone:** Complete recommendation workflow

### Story 6.1: Monthly Contribution Input

As a **user**,
I want **to enter my monthly contribution and dividends received**,
So that **the system knows how much capital I have to invest**.

**Acceptance Criteria:**

**Given** I am on the recommendations page
**When** I start a new investment cycle
**Then** I see input fields for: monthly contribution and dividends received

**Given** I enter my monthly contribution (e.g., $2,000)
**When** the value is entered
**Then** the amount is validated (must be positive number)
**And** the value is displayed in my locale format

**Given** I enter dividends received (e.g., $150)
**When** the value is entered
**Then** this is added to my investable capital
**And** I can optionally specify which assets generated dividends

**Given** I have entered contribution and dividends
**When** I view the summary
**Then** I see total investable capital: contribution + dividends
**And** the calculation is shown: "$2,000 + $150 = $2,150 available"

**Given** I want to skip dividends entry
**When** I leave the field empty or enter 0
**Then** only the contribution is used
**And** this is valid (dividends are optional)

### Story 6.2: Recommendation Generation

As a **system**,
I want **to generate investment recommendations based on scores and allocation targets**,
So that **users receive actionable investment guidance**.

**Acceptance Criteria:**

**Given** a user has investable capital and configured strategy
**When** recommendations are generated
**Then** assets are ranked by: allocation gap (underweight) × score
**And** capital is allocated to highest-priority assets first

**Given** an asset class or asset is over-allocated (above target range)
**When** recommendations are generated
**Then** that asset shows zero-buy signal
**And** it is displayed with note: "Currently over-allocated"

**Given** the portfolio is at capacity for an asset class
**When** higher-scoring assets exist outside the portfolio
**Then** the user sees an alert: "Higher-scoring assets available in [class]"
**And** can view which assets would score higher

**Given** recommendations respect allocation constraints
**When** capital is distributed
**Then** minimum allocation thresholds are respected
**And** maximum asset counts are not exceeded
**And** class/subclass ranges are honored

**Given** recommendations are generated
**When** the calculation completes
**Then** each recommendation includes: asset, amount, expected new allocation %
**And** the total recommended equals the investable capital

### Story 6.3: Recommendation Display

As a **user**,
I want **to see my recommendations as simple actionable items**,
So that **I know exactly what to buy without complexity**.

**Acceptance Criteria:**

**Given** recommendations are generated
**When** I view the recommendations page
**Then** I see a list of actionable items: "Invest $X in [Asset]"
**And** items are ordered by priority (highest impact first)

**Given** I am viewing recommendations
**When** I look at the visualization
**Then** I see a pie chart showing recommended allocation distribution
**And** colors match my asset class colors

**Given** I have multiple recommendations
**When** I view the summary
**Then** I see total: "Invest $2,150 across 4 assets"
**And** I can see the before/expected after allocation

**Given** I hover over a recommendation card
**When** the tooltip appears
**Then** I see: current allocation %, target range, expected after %

**Given** I am on mobile
**When** I view recommendations
**Then** the display is optimized for smaller screens
**And** I can still see and confirm each recommendation

### Story 6.4: Recommendation Details

As a **user**,
I want **to understand why each asset is recommended**,
So that **I can trust the recommendations are based on my criteria**.

**Acceptance Criteria:**

**Given** I am viewing a recommendation
**When** I click "Why this recommendation?"
**Then** I see a breakdown including:

- Current allocation vs. target range
- Asset score and ranking
- How much this purchase will move allocation
- Key scoring criteria that contributed

**Given** I view the calculation breakdown
**When** I look at the allocation math
**Then** I see: current %, target range, gap %, recommended amount, new %

**Given** I view the score contribution
**When** I look at the scoring section
**Then** I see the top 3 criteria that contributed most to the score
**And** I can expand to see full breakdown

**Given** I want to see all calculations
**When** I click "Full calculation details"
**Then** I see the complete formula and all inputs used
**And** this supports the audit trail requirement

### Story 6.5: Investment Confirmation

As a **user**,
I want **to confirm my investments and record actual amounts**,
So that **my portfolio is updated with real transactions**.

**Acceptance Criteria:**

**Given** I have reviewed recommendations
**When** I proceed to confirmation
**Then** I see a confirmation screen with all recommendations listed
**And** each has an editable amount field (pre-filled with recommended)

**Given** I want to invest different amounts than recommended
**When** I edit the amount fields
**Then** I can enter actual amounts I invested
**And** the total updates in real-time

**Given** I am ready to confirm
**When** I click "Confirm Investments"
**Then** the amounts are recorded as actual investments
**And** portfolio holdings are updated with new quantities
**And** allocation percentages are recalculated

**Given** confirmation succeeds
**When** the process completes
**Then** I see a success message: "December investments recorded"
**And** I am shown the before/after comparison

**Given** I invested more than recommended total
**When** I confirm
**Then** the system accepts the higher amount
**And** records the actual investment

**Given** I skip an investment (set to $0)
**When** I confirm
**Then** that asset is skipped
**And** only non-zero amounts are recorded

### Story 6.6: Before/After Comparison

As a **user**,
I want **to see how my portfolio changed after investing**,
So that **I can verify my progress toward target allocation**.

**Acceptance Criteria:**

**Given** I have just confirmed investments
**When** the confirmation screen shows
**Then** I see a side-by-side before/after comparison

**Given** I view the before/after comparison
**When** I look at the allocations
**Then** I see for each asset class: before %, after %, change
**And** changes are color-coded (green = closer to target, red = further)

**Given** I view the comparison
**When** I look at the portfolio summary
**Then** I see: total value before, amount invested, total value after
**And** overall portfolio health score change

**Given** I want to see updated percentages
**When** I navigate to portfolio view
**Then** allocations immediately reflect the confirmed investments
**And** no page refresh is required

**Given** the comparison is displayed
**When** I view the pie charts
**Then** I see before and after pie charts side by side
**And** I can visually see the allocation shift

---

## Epic 7: Data Transparency & Alerts

**Goal:** Users can verify every calculation, see data freshness, understand score breakdowns, and receive proactive alerts for drift and opportunities.

**FRs Covered:** FR87-FR95 (9 requirements)

**Key Deliverables:**

- Calculation breakdown view (ScoreBreakdown component)
- Data source attribution
- Data freshness indicators (DataFreshnessBadge)
- Calculation audit trail
- Financial advice disclaimers
- Drift alerts (allocation outside range)
- Opportunity alerts (better-scoring assets)
- Alert preference configuration

**Standalone:** Complete transparency and notification system

### Story 7.1: Data Source Attribution

As a **user**,
I want **to see where each piece of data comes from and when it was updated**,
So that **I can trust the data quality and freshness**.

**Acceptance Criteria:**

**Given** I am viewing any data point (price, P/E ratio, dividend yield, etc.)
**When** I click or hover on the data
**Then** I see the data source (e.g., "Gemini API", "Company IR", "B3 Filing")

**Given** I view data source information
**When** the tooltip or popover appears
**Then** I see the timestamp of when this data was last updated
**And** the format is human-readable (e.g., "Updated 3 hours ago")

**Given** data comes from investor relations publications
**When** I view the source
**Then** I see the specific document (e.g., "Q3 2024 Earnings Report")
**And** the publication date of that document

**Given** data has multiple sources
**When** I view the attribution
**Then** the primary source is shown
**And** I can see "Data from [N] sources" with option to expand

**Given** I want to verify data independently
**When** I view source attribution
**Then** I see enough information to locate the original source

### Story 7.2: Calculation Transparency

As a **user**,
I want **to see complete calculation breakdowns and audit trails**,
So that **I can verify how any number was derived**.

**Acceptance Criteria:**

**Given** I am viewing any calculated value (score, allocation, recommendation)
**When** I click "Show calculation"
**Then** I see the complete formula used
**And** all input values with their sources

**Given** I view a score calculation
**When** the breakdown is displayed
**Then** I see each criterion: name, data value, operator, threshold, points
**And** the sum that produces the final score

**Given** I view an allocation calculation
**When** the breakdown is displayed
**Then** I see: asset value, total portfolio value, resulting percentage
**And** the currency conversion rates used (if multi-currency)

**Given** calculations are performed
**When** they are stored
**Then** an immutable audit log entry is created
**And** includes: timestamp, user, calculation type, inputs, outputs

**Given** I want to review past calculations
**When** I access the audit trail
**Then** I can see historical calculations for any date
**And** understand why a past recommendation was made

### Story 7.3: Data Freshness Indicators

As a **user**,
I want **to see data freshness indicators throughout the application**,
So that **I know if I'm looking at current or stale data**.

**Acceptance Criteria:**

**Given** I am viewing any screen with market data
**When** the page loads
**Then** I see a data freshness indicator (DataFreshnessBadge component)

**Given** data was updated within 24 hours
**When** I view the indicator
**Then** it shows green with "Updated [X] hours ago"

**Given** data is 1-3 days old
**When** I view the indicator
**Then** it shows amber with "Updated [N] days ago"
**And** a subtle warning that data may be outdated

**Given** data is more than 3 days old
**When** I view the indicator
**Then** it shows red with "Data outdated - last updated [date]"
**And** a prominent refresh button

**Given** I click the freshness indicator
**When** the action triggers
**Then** a data refresh is initiated for that view
**And** I see a loading state until complete

**Given** the data fetch fails
**When** cached data is displayed
**Then** the indicator shows "Using cached data from [date]"
**And** indicates the refresh failed

### Story 7.4: Financial Disclaimers

As a **platform operator**,
I want **to display prominent disclaimers that this is a calculation tool**,
So that **users understand this is not financial advice**.

**Acceptance Criteria:**

**Given** I am viewing the recommendations page
**When** the page loads
**Then** I see a disclaimer: "This tool calculates based on YOUR criteria. This is not financial advice."

**Given** I am a new user
**When** I first access recommendations
**Then** I see a full-screen disclaimer that I must acknowledge
**And** I click "I understand" to proceed

**Given** disclaimers are displayed
**When** I view them
**Then** they are prominent but not intrusive
**And** they do not block the main content after acknowledgment

**Given** I am viewing any calculation or recommendation
**When** I look at the footer of that section
**Then** I see a subtle reminder: "Calculation tool only - not financial advice"

**Given** the application has legal requirements
**When** disclaimers are rendered
**Then** they meet regulatory requirements for calculation tools
**And** clearly state the tool does not provide investment recommendations

### Story 7.5: Allocation Drift Alerts

As a **user**,
I want **to receive alerts when my allocation drifts outside my configured ranges**,
So that **I can take action to rebalance if needed**.

**Acceptance Criteria:**

**Given** my portfolio allocation drifts outside configured ranges
**When** the system detects this (during overnight processing or on login)
**Then** I receive an alert notification

**Given** I have a drift alert
**When** I view the alert
**Then** I see which asset class/subclass is out of range
**And** the current allocation vs. target range
**And** how much it has drifted

**Given** I receive a drift alert
**When** I click on the alert
**Then** I am taken to the portfolio view with the drifted class highlighted

**Given** drift alerts are generated
**When** the severity is calculated
**Then** minor drift (< 5% outside range) shows as informational
**And** significant drift (> 5% outside range) shows as warning

**Given** my portfolio is within all target ranges
**When** I view my dashboard
**Then** I see a positive indicator: "All allocations within target"

### Story 7.6: Opportunity Alerts and Preferences

As a **user**,
I want **to receive alerts about better-scoring assets and configure my alert preferences**,
So that **I can discover opportunities and control notification frequency**.

**Acceptance Criteria:**

**Given** a higher-scoring asset is discovered outside my portfolio
**When** the asset scores higher than my lowest-scoring asset in the same class
**Then** I receive an opportunity alert

**Given** I receive an opportunity alert
**When** I view the alert
**Then** I see: the new asset, its score, comparison to my current assets
**And** I can click to view the asset details

**Given** I want to configure my alerts
**When** I go to Settings > Alerts
**Then** I see toggle options for each alert type:

- Allocation drift alerts (on/off)
- Opportunity alerts (on/off)
- Data freshness warnings (on/off)

**Given** I configure alert delivery
**When** I set my preferences
**Then** I can choose: in-app only, email, or both
**And** I can set frequency: immediate, daily digest, weekly digest

**Given** I have many opportunity alerts
**When** I view my alerts list
**Then** I see them grouped by asset class
**And** I can dismiss or snooze alerts

**Given** I dismiss an opportunity alert
**When** the same opportunity arises again
**Then** I am not alerted again for that specific asset
**Unless** the score difference increases significantly

### Story 7.7: API Precision i18n Refactoring

As a **user with non-US locale**,
I want **calculation breakdowns and API responses to respect my locale settings**,
So that **numbers are displayed with my preferred decimal and thousand separators**.

**Acceptance Criteria:**

**Given** the `/api/recommendations/:id/breakdown` endpoint returns calculation steps
**When** I call the API
**Then** values should include raw numeric data alongside display strings
**And** the response should include a `type` field ("percent", "currency", "number")

**Given** the CalculationSteps component receives raw numeric values
**When** rendering values for pt-BR locale
**Then** percentages display with comma separator (e.g., "15,50%")
**And** currency displays with locale-appropriate formatting

**Given** existing consumers of these API endpoints
**When** the refactoring is deployed
**Then** pre-formatted `value` strings remain available for backward compatibility
**And** new `rawValue` and `type` fields are additive (non-breaking)

**Given** the `/api/scores/:assetId/inputs` endpoint returns score data
**When** I call the API
**Then** `percentage` and `maxPossible` fields include raw numeric values
**And** client-side formatting respects user locale

### Story 7.12: Alerts List Server-Side Grouping Optimization

As a **developer**,
I want **to implement server-side grouping for alerts instead of client-side grouping**,
So that **query performance remains optimal as alert volume grows beyond 100 alerts**.

**Acceptance Criteria:**

**Given** the alerts list currently fetches all alerts and groups them client-side
**When** alert volume grows significantly (>100 alerts)
**Then** this creates a potential N+1 query pattern inefficiency

**Given** alerts are currently grouped by asset class in the client
**When** implementing the optimization
**Then** SQL GROUP BY should be used to group alerts server-side
**And** reduce the data transfer and client-side processing

**Given** the current implementation handles ≤100 alerts acceptably
**When** planning the optimization
**Then** this is a future optimization, not an immediate requirement
**And** should be triggered when alert volume metrics indicate need

**Given** server-side grouping is implemented
**When** the API returns grouped alerts
**Then** the response structure should include:

- Asset class name
- Alert count per class
- Alerts array for that class
- Sorting by alert priority within each group

**Given** existing client code expects ungrouped alerts
**When** the optimization is deployed
**Then** ensure backward compatibility or coordinate frontend changes

### Story 7.13: Alert Query Performance Indexes

As a **developer**,
I want **to add strategic database indexes for alert queries**,
So that **alert filtering and retrieval remains performant at scale**.

**Acceptance Criteria:**

**Given** alerts are frequently queried by user_id and type
**When** the database performs these queries
**Then** a composite index should optimize this access pattern

**Given** dismissed alerts should be excluded from most queries
**When** creating the index
**Then** use a partial index with `WHERE is_dismissed = false`
**And** this reduces index size and improves query performance

**Given** the recommended index structure
**When** implementing
**Then** create: `CREATE INDEX alerts_user_type_idx ON alerts(user_id, type) WHERE is_dismissed = false;`

**Given** existing indexes are already in place
**When** adding new indexes
**Then** verify no duplicate or redundant indexes exist
**And** ensure indexes on:

- `snoozed_until` (for filtering active alerts)
- `user_id` in `dismissed_opportunity_pairs`
- Composite unique index on `(user_id, current_asset_id, better_asset_id)`

**Given** indexes are added
**When** measuring performance
**Then** query execution plans should show index usage
**And** alert list queries should complete in <50ms for typical datasets

**Given** this is a future optimization
**When** deciding implementation timing
**Then** implement when alert query metrics show degradation
**Or** when alert volume exceeds 500 alerts per user

### Story 7.14: Alerts Performance Monitoring and Cleanup Job Tests

As a **developer**,
I want **performance monitoring for grouped alerts SQL aggregation and integration tests for dismissed pairs cleanup**,
So that **we can track query performance in production and ensure cleanup jobs work correctly**.

**Acceptance Criteria:**

**Given** the server-side alert grouping query executes
**When** the query fetches grouped alerts for a user
**Then** query execution time is logged with structured telemetry
**And** includes: userId, queryType, executionTimeMs, alertCount

**Given** dismissed opportunity pairs exist in the database
**When** the cleanup job runs
**Then** pairs older than 90 days are deleted
**And** pairs within 90 days are retained

**Given** the cleanup job encounters a database error
**When** the job fails mid-execution
**Then** a transaction rollback occurs
**And** no partial deletes are committed

### Story 7.15: Fix Next.js Routing Conflict - Critical Production Blocker

As a **developer**,
I want **to fix the Next.js routing conflict between `[alertId]` and `[id]` dynamic route parameters**,
So that **the application can initialize properly and users can access all API routes including login**.

**Acceptance Criteria:**

**Given** the alerts API has routes with conflicting dynamic parameter names
**When** the server initializes and builds the route tree
**Then** all dynamic route parameters at the same path level use consistent naming (`[alertId]`)
**And** Next.js successfully builds the route tree without errors

**Given** the read and dismiss alert route handlers reference `params.id`
**When** the routes are updated
**Then** handlers correctly read `params.alertId`
**And** UUID validation succeeds

**Given** all route parameter references are updated
**When** running production build or deploying to Vercel
**Then** the build completes successfully without routing errors
**And** no "different slug names" error appears in logs

**Given** the routing conflict is fixed
**When** a user submits the login form
**Then** the `/api/auth/login` route responds successfully
**And** authentication completes without hanging

---

## Summary

| Epic      | Title                                    | Stories        | FRs        |
| --------- | ---------------------------------------- | -------------- | ---------- |
| 1         | User Authentication & Account Foundation | 6              | 10         |
| 2         | Portfolio Management Foundation          | 8              | 23         |
| 3         | Visual Allocation Feedback               | 5              | 10         |
| 4         | Investment Strategy Configuration        | 6              | 15         |
| 5         | Market Data & Scoring Engine             | 6              | 15         |
| 6         | Investment Recommendations               | 6              | 13         |
| 7         | Data Transparency & Alerts               | 13 (+2 ad-hoc) | 9          |
| **Total** |                                          | **50 stories** | **95 FRs** |

**Note:** Epic 7 stories 7.8-7.11 were added during implementation for enhancements and tech debt. Stories 7.12-7.13 are performance optimizations. Stories 7.14-7.15 are technical enhancements and critical fixes.
