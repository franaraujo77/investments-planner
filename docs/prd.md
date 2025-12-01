# Investments Planner - Product Requirements Document

**Author:** Bmad
**Date:** 2025-11-28
**Version:** 1.0

---

## Executive Summary

Investments Planner is a multi-user portfolio management automation platform that eliminates the manual effort of reviewing investment performance before making new contributions. Built on the Cerrado diagram methodology, it transforms a time-consuming spreadsheet-based process into an automated, configuration-driven system that answers one simple question: "What should I buy this month?"

The platform automates asset evaluation across all available assets (REITs, ETFs, stocks, etc.) rather than limiting analysis to existing portfolio holdings. It calculates optimal allocation amounts based on user-defined asset type percentages, applies configurable scoring criteria systematically across different markets and investment types, and delivers instant recommendations pre-computed overnight.

**Core Philosophy:** Configuration over hardcoding. Users define their investment strategy through scoring criteria and allocation ranges - the system executes that strategy with mathematical precision, removing emotional decision-making from the equation.

### What Makes This Special

**"Simplicity in front, complexity behind."**

This is NOT a screening tool where users analyze assets manually. This IS an allocation tool that gives simple answers: "Invest $X in Asset A, $Y in Asset B."

**Key Differentiators:**

1. **No Score Overrides** - Scores are ALWAYS calculated based on user-defined criteria. If a score seems wrong, fix the criteria - don't override the system. This enforces systematic thinking and prevents emotional decisions.

2. **Multi-Currency Native** - International portfolios from day one. Previous day's exchange rates ensure consistent calculations across markets.

3. **Pre-Computed Intelligence** - Automated overnight processing means instant recommendations when the user logs in. No waiting for API calls or calculations.

4. **Opportunity Discovery** - Scores ALL assets in configured markets, not just portfolio holdings. Alerts when better-scored assets exist but portfolio is at capacity.

5. **Trust Through Transparency** - The system should be trusted or refined, never second-guessed. Users own their strategy configuration; the tool executes it faithfully.

---

## Project Classification

**Technical Type:** SaaS B2B Platform
**Domain:** Fintech (Investment Portfolio Management)
**Complexity:** High

This is a multi-user SaaS platform with dashboard-based interfaces for portfolio management, scoring configuration, and allocation recommendations. The fintech domain introduces complexity around data accuracy, multi-currency calculations, and user data security - though regulatory burden is lower than platforms handling actual transactions.

**Target Users:** Advanced investors who understand their investment strategy and want automation, not hand-holding. Long-term holders (not frequent traders) with international, multi-currency portfolios.

### Domain Context

**Regulatory Position:** Decision Support Calculator (not Investment Adviser)

- **Not Required:** SEC/FINRA broker-dealer registration (no trade execution), RIA registration (users define their own criteria)
- **Applicable:** Data protection standards, user data isolation, clear disclaimers that this is a calculation tool based on user-configured criteria - not financial advice
- **2025 Considerations:** Regulation S-P data protection requirements, standard security practices for user portfolio data

**Key Compliance Mitigations:**
- Clear disclaimers: "Tool calculates based on YOUR criteria. Not financial advice."
- User data isolation in multi-tenant architecture
- Standard security practices for financial data
- Terms of service and privacy policy for commercial multi-user deployment

**Reference Documents:**
- Brainstorming Session: `docs/brainstorming-session-results-2025-11-23.md`

---

## Success Criteria

### User Value Success (Primary)

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Manual effort eliminated** | User completes monthly investment cycle without opening a spreadsheet | Core problem being solved |
| **Decision speed** | Time from "login" to "investment decision" under 5 minutes | Was taking hours of manual review |
| **Trust & adoption** | Users follow system recommendations consistently | Proves the "no override" philosophy works |
| **Calculation accuracy** | Multi-currency portfolios calculated accurately to the cent | Financial data demands precision |

### System Success

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Pre-computation timing** | Overnight processing completes before market open | Instant recommendations when user needs them |
| **Methodology fidelity** | Scoring calculations match manual Cerrado methodology 100% | System must be trustworthy |
| **Data integrity** | Zero data corruption or loss of user configurations | Users invest time configuring criteria |
| **Currency accuracy** | Exchange rate conversions accurate to previous trading day | Essential for multi-currency math |

### Adoption Success

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Return frequency** | Users return monthly (aligned with salary/contribution cycle) | Natural usage rhythm |
| **Configuration depth** | Users configure their own criteria (not just defaults) | Proves value of customization |
| **Portfolio expansion** | Users expand to track multiple markets/asset types over time | Platform stickiness |

---

## Product Scope

### MVP - Minimum Viable Product

**What must work for this to be useful?** The complete automated workflow from data fetch to investment recommendation.

#### Core System Architecture
- Multi-user system with authentication and user isolation
- Database storage replacing spreadsheets
- User-specific configuration (criteria, allocation rules, markets)
- API structure for user-scoped operations

#### Scoring & Evaluation Engine
- User-configurable scoring criteria per market/asset type
- Score ALL assets in configured markets (not just portfolio holdings)
- Historical surplus consistency scoring (+5 for 5 years, -2 per missing year)
- Market-specific criteria (different evaluation logic per sector)
- Monthly fundamental scoring, daily price updates
- Force refresh option for advanced users
- **No manual score overrides** - calculated only

#### Data Pipeline
- Automated data fetching via Gemini API (6-month fundamentals, daily prices)
- Multi-currency data storage and conversion logic
- Exchange rate fetching (previous day's rates)
- Data caching and intelligent refresh strategy
- Only fetch data for markets with configured criteria

#### Portfolio Management
- Range-based allocation percentages (e.g., "Fixed income: 40-50%")
- Asset count limits per class/subclass
- Ability to ignore/exclude specific assets
- Zero buy signal for over-allocated assets (rebalancing via contributions)
- Record actual investment amounts (not just suggested)
- Dividend-aware contribution planning

#### User Experience
- Pre-compute overnight (automated before markets open)
- Simple output: "Invest $X in Asset A, $Y in Asset B"
- Interactive confirmation workflow with actual investment entry
- Show updated allocation after confirmation
- Alert when better-scored assets exist but portfolio at capacity

#### MVP Deferrals (Included in allocation math, deferred for evaluation)
- Fixed income asset evaluation (include in allocation %, defer selection criteria)
- Opportunistic mid-month investing (use existing scores, don't recalculate)

---

### Growth Features (Post-MVP)

**What makes it competitive?** Learning, reflection, and strategy optimization.

#### Strategy Intelligence
- **Backtesting capability** - Test criteria against historical data: "How would this strategy have performed 2 years ago?"
- **Index template/inheritance** - Copy and modify existing criteria sets
- **Index comparison** - Compare original vs. modified strategies (A/B test investments)
- **Investment journaling** - Record all decisions with context for later analysis
- **Learning from mistakes** - Track decisions that didn't work, analyze why

#### Enhanced Evaluation
- Fixed income asset evaluation with selection criteria
- Opportunistic mid-month investing with fresh calculations
- Additional asset types beyond initial markets

---

### Vision (Future)

**What's the dream version?** Risk intelligence and broader financial integration.

#### Advanced Risk Analysis
- **Overlap/concentration risk analysis** - Detect when different ETFs/REITs expose portfolio to same underlying assets
- **Correlation analysis** - Understand how portfolio components move together
- **Scenario modeling** - "What happens to my portfolio if X market crashes?"

#### User Expansion
- **Beginner investor profiles** - Simplified workflow with wizard-based configuration
- **Community features** - Share strategies, compare performance (optional)
- **Mobile app** - Investment decisions on the go

#### Financial Integration
- **Budget/financial planning integration** - Combine investment planning with broader financial planning
- **Tax optimization features** - Consider tax implications in allocation decisions
- **Brokerage read-only integration** - Auto-import actual portfolio holdings (no trade execution)

---

## Domain-Specific Requirements (Fintech)

As a fintech tool handling investment portfolio data, these domain concerns shape all downstream requirements.

### What Applies vs. What Doesn't

| Concern | Applicability | Rationale |
|---------|---------------|-----------|
| **Data Protection** | ✅ HIGH | User portfolio data, configurations, and investment history are sensitive |
| **Security Standards** | ✅ HIGH | Multi-user system requires robust authentication and data isolation |
| **Financial Data Accuracy** | ✅ CRITICAL | Investment decisions depend on correct calculations - errors have real consequences |
| **Regional Compliance** | ⚠️ LOW | Not handling transactions, but disclaimers needed per region |
| **Audit Requirements** | ⚠️ LOW | Not a regulated adviser, but should log calculations for user reference |
| **Fraud Prevention** | ❌ N/A | Not handling money or transactions |
| **KYC/AML** | ❌ N/A | Not a financial institution |

### Data Protection Requirements

**User Data Categories:**
- Portfolio holdings (assets, quantities, purchase prices)
- Scoring criteria configurations (user's investment strategy IP)
- Allocation rules and ranges
- Historical scores and recommendations
- Investment decisions and actual amounts invested

**Protection Measures:**
- All user data encrypted at rest
- User data isolation in multi-tenant architecture (no cross-user data leakage)
- Secure authentication with session management
- No sharing of user configurations without explicit consent
- User can export/delete their data on request

### Financial Data Accuracy Requirements

**Critical Accuracy Points:**
- Exchange rate conversions must use consistent rates (previous trading day close)
- Scoring calculations must be deterministic and reproducible
- Allocation percentages must sum correctly across all asset classes
- Currency conversion rounding must be consistent and documented

**Accuracy Validation:**
- Show calculation breakdown to users (transparency builds trust)
- Allow users to verify any score by showing which criteria contributed
- Log all calculations for audit trail (user's own reference)

### Legal Disclaimers Required

**Prominent Disclaimers (Required in UI and ToS):**

> "This tool calculates investment allocations based on criteria YOU configure. It is a decision support calculator, not financial advice. The developers are not registered investment advisers. Past performance does not guarantee future results. You are solely responsible for your investment decisions."

**Placement:**
- Registration/onboarding flow
- Before first recommendation view
- Footer of all recommendation screens
- Terms of Service

### Data Sourcing Transparency

**For each data point, users should know:**
- Source (Gemini API, exchange rate provider, etc.)
- Freshness (when was this data last updated?)
- Limitations (any assets without data? any data gaps?)

**Why this matters:** Users trusting automated recommendations need confidence in the underlying data quality.

---

*This section shapes all functional and non-functional requirements below.*

---

## SaaS B2B Platform Requirements

### Multi-Tenancy Architecture

**Model:** Single-user accounts with complete data isolation

| Aspect | Approach |
|--------|----------|
| **Account Model** | One user = one account = one portfolio set |
| **Data Isolation** | Strict tenant isolation - no shared data between users |
| **Configuration Scope** | All criteria, allocations, and settings are per-user |
| **Scalability** | Architecture supports many users without cross-contamination |

**MVP Simplification:** No team/family accounts. Each user manages their own portfolio independently. Team features deferred to Growth phase if needed.

### Authentication & Authorization

**Authentication:**
- Email/password registration with email verification
- Secure password requirements (length, complexity)
- Session management with secure tokens
- Password reset via email

**Authorization (Simple for MVP):**
- Single role: Account Owner
- Full access to own data only
- No sharing capabilities in MVP

**Future Consideration:** OAuth (Google, GitHub) for easier onboarding

### Subscription Model

**MVP Approach:** Monetization deferred

- Build features first, decide pricing later
- No paywalls or tier restrictions in MVP
- Track usage patterns to inform future pricing decisions

**Architecture Consideration:** Design data model to support future tiers without major refactoring (e.g., `subscription_tier` field on user, even if all users are "free" initially)

### Integration Architecture

**Primary Integrations (MVP):**

| Integration | Purpose | Frequency |
|-------------|---------|-----------|
| **Gemini API** | Asset fundamentals, financial data | 6-month refresh (configurable) |
| **Exchange Rate API** | Currency conversion rates | Daily (previous close) |
| **Market Data API** | Asset prices | Daily |

**Integration Principles:**
- Abstract data providers behind interfaces (swap providers without code changes)
- Cache aggressively to minimize API costs
- Graceful degradation if provider is unavailable
- Log all external API calls for debugging and cost tracking

**Deferred Integrations:**
- Brokerage read-only import (Vision phase)
- Additional financial data providers (as needed)

---

## User Experience Principles

### Design Philosophy

**"Simplicity in front, complexity behind."**

The UI should answer one question instantly: **"What should I buy this month?"**

This is NOT a screening tool where users analyze assets manually. This IS an allocation tool that gives simple, actionable answers.

### Visual Personality

| Attribute | Direction |
|-----------|-----------|
| **Tone** | Professional, trustworthy, calm |
| **Density** | Clean, not cluttered - financial data without overwhelm |
| **Color** | Neutral base with strategic use of color for signals (green/red for allocation status) |
| **Typography** | Clear, readable numbers - financial data must be scannable |

**The Vibe:** A trusted advisor's desk, not a trading floor. Calm confidence, not frantic activity.

### Core UX Principles

1. **Answer First, Details on Demand**
   - Lead with recommendations: "Invest $X in Asset A, $Y in Asset B"
   - Scores, calculations, and reasoning available but not forced
   - Progressive disclosure - complexity is accessible, not mandatory

2. **Trust Through Transparency**
   - Every score shows contributing criteria on click/hover
   - Every recommendation shows the calculation breakdown
   - Data freshness always visible ("Prices as of Nov 27, 2025")

3. **Configuration is Investment Strategy**
   - Criteria setup feels like defining your philosophy, not filling forms
   - Allocation ranges feel like expressing risk tolerance, not setting parameters
   - Help users understand *why* each setting matters

4. **No Second-Guessing**
   - No "override score" buttons - the system doesn't tempt emotional decisions
   - If something seems wrong, guide users to refine criteria instead
   - Confidence in the system you configured

### Key Interactions

#### Monthly Review Flow (Primary)
```
Login → Dashboard shows:
  "Ready to invest. You have $X available (contribution + dividends)"
  ↓
  Recommendations displayed:
  "Asset A: $Y | Asset B: $Z | Asset C: $W"
  ↓
  User confirms or adjusts actual amounts
  ↓
  Portfolio updated, new allocation percentages shown
```

#### Criteria Configuration Flow
```
Select market/asset type →
  See existing criteria (or start fresh) →
  Add/modify criteria with point values →
  Preview: "Assets currently scoring highest with these criteria"
  Save
```

#### Opportunity Alert Interaction
```
Badge/notification: "3 assets score higher than your lowest holding"
  ↓
  Click to see comparison
  ↓
  Decision: Keep current holdings OR swap (user choice, not system override)
```

### Mobile Considerations (Future)

MVP is web-first. Mobile patterns to consider for future:
- Monthly review should work on phone (simple decision flow)
- Criteria configuration likely stays desktop (complex setup)
- Push notifications for "recommendations ready" each month

---

## Functional Requirements

### User Account & Access

- **FR1:** Users can create an account with email and password
- **FR2:** Users can verify their email address to activate account
- **FR3:** Users can log in securely and maintain authenticated sessions
- **FR4:** Users can log out and terminate their session
- **FR5:** Users can reset their password via email verification
- **FR6:** Users can update their profile information (name, base currency)
- **FR7:** Users can export all their data (portfolio, configurations, history)
- **FR8:** Users can delete their account and all associated data

### Portfolio Management

- **FR9:** Users can create and name portfolios
- **FR10:** Users can add assets to their portfolio with quantity and purchase price
- **FR11:** Users can update asset quantities and purchase prices
- **FR12:** Users can remove assets from their portfolio
- **FR13:** Users can mark specific assets as "ignored" (excluded from allocation calculations)
- **FR14:** Users can view current portfolio holdings with values in base currency
- **FR15:** Users can view current allocation percentages by asset class and subclass
- **FR16:** Users can record actual investment amounts after making purchases
- **FR17:** Users can view investment history (what was invested, when, at what allocation)

### Asset Class Configuration

- **FR18:** Users can define asset classes (e.g., Fixed Income, Variable Income, Crypto)
- **FR19:** Users can define subclasses within asset classes (e.g., REITs, Stocks, ETFs within Variable Income)
- **FR20:** Users can set allocation percentage ranges for each asset class (e.g., 40-50%)
- **FR21:** Users can set allocation percentage ranges for each subclass
- **FR22:** Users can set maximum asset count limits per class/subclass
- **FR23:** Users can set minimum allocation values for specific classes/subclasses

### Scoring Criteria Configuration

- **FR24:** Users can define scoring criteria for each market/asset type
- **FR25:** Users can set point values for each criterion (e.g., "5-year surplus consistency" = +5 points)
- **FR26:** Users can define criteria using various operators (greater than, less than, between, equals)
- **FR27:** Users can view a library of their configured criteria organized by market/asset type
- **FR28:** Users can copy an existing criteria set to create a new variation
- **FR29:** Users can compare two criteria sets to see which scores assets higher on average
- **FR30:** Users can preview which assets score highest with current criteria before saving

### Asset Data & Scoring

- **FR31:** System fetches asset fundamental data from configured data providers (Gemini API)
- **FR32:** System fetches daily asset prices from market data providers
- **FR33:** System fetches daily exchange rates from currency data providers
- **FR34:** System calculates scores for all assets in configured markets based on user criteria
- **FR35:** System stores historical scores for trend analysis
- **FR36:** Users can view the current score for any asset
- **FR37:** Users can view which criteria contributed to an asset's score (breakdown)
- **FR38:** Users can force an immediate data refresh for specific assets or all assets
- **FR39:** Users can view data freshness (when data was last updated) for any asset

### Multi-Currency Support

- **FR40:** Users can set their portfolio base currency
- **FR41:** System converts all asset values to base currency for portfolio calculations
- **FR42:** System uses previous trading day's exchange rates for conversions
- **FR43:** Users can view asset values in both original currency and base currency
- **FR44:** System correctly calculates allocation percentages across multi-currency holdings

### Recommendations & Allocation

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

### Overnight Pre-Computation

- **FR56:** System runs automated overnight processing before market open
- **FR57:** System pre-calculates scores for all assets in user's configured markets
- **FR58:** System pre-generates allocation recommendations for each user
- **FR59:** Users see instant recommendations on login (no waiting for calculations)

### Data Transparency & Trust

- **FR60:** Users can view data source for each data point (which API provided it)
- **FR61:** Users can view timestamp of last update for any data point
- **FR62:** Users can view complete calculation breakdown for any score
- **FR63:** System displays prominent disclaimers that this is a calculation tool, not financial advice
- **FR64:** System logs all calculations for user's own audit trail

### Alerts & Notifications

- **FR65:** Users receive alerts when better-scoring assets are discovered outside their portfolio
- **FR66:** Users receive alerts when allocation drifts outside configured ranges
- **FR67:** Users can configure alert preferences (which alerts, how delivered)

---

**Total: 67 Functional Requirements**

---

## Non-Functional Requirements

### Performance

**Why it matters:** Users expect instant recommendations on login. The "pre-computed overnight" promise is central to the value proposition.

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Dashboard load time** | < 2 seconds | Recommendations must be instant |
| **Overnight processing** | Complete before 6 AM local market time | Ready before trading day |
| **Score calculation** | < 100ms per asset | Responsive criteria preview |
| **Portfolio recalculation** | < 1 second after investment confirmation | Instant feedback |
| **API response times** | < 500ms for user-initiated actions | Smooth interactions |

**Caching Strategy:**
- Pre-computed recommendations cached per user
- Asset scores cached after overnight run
- Exchange rates cached daily
- Invalidate caches on configuration changes

### Security

**Why it matters:** Users trust the system with their investment strategy (intellectual property) and portfolio data (sensitive financial information).

| Requirement | Implementation | Rationale |
|-------------|----------------|-----------|
| **Authentication** | Secure password hashing (bcrypt/argon2), JWT tokens | Industry standard |
| **Data encryption at rest** | AES-256 encryption for user data | Protect stored portfolios |
| **Data encryption in transit** | TLS 1.3 for all connections | Protect data in motion |
| **Session management** | Secure, httpOnly cookies; session timeout | Prevent session hijacking |
| **Tenant isolation** | Database-level user isolation, no cross-user queries | Prevent data leakage |
| **API security** | Rate limiting, input validation, SQL injection prevention | Standard protections |
| **Secrets management** | Environment variables, no hardcoded credentials | Secure configuration |

**Data Privacy:**
- Users can export all their data
- Users can delete their account completely
- No sharing of user data without explicit consent
- Logging excludes sensitive data (passwords, full portfolio details)

### Scalability

**Why it matters:** Multi-user system designed to grow. Overnight processing must scale with user count.

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Concurrent users** | Support 1,000+ simultaneous users | Growth headroom |
| **Overnight processing** | Scale linearly with user count | Parallel processing |
| **Database** | Handle 100K+ assets across all users | Market coverage |
| **API rate limits** | Stay within provider limits; queue/batch requests | Cost control |

**Architecture Principles:**
- Stateless application servers (horizontal scaling)
- Database connection pooling
- Background job queue for overnight processing
- Caching layer to reduce database load

### Reliability

**Why it matters:** Investment decisions have real consequences. Data loss or corruption is unacceptable.

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Uptime** | 99.5% availability | Users need access for monthly reviews |
| **Data durability** | No data loss | Portfolios and configurations are critical |
| **Backup frequency** | Daily automated backups | Recovery capability |
| **Recovery time** | < 4 hours from backup | Acceptable for monthly usage pattern |
| **Graceful degradation** | App works if external APIs are down | Show cached data, disable refresh |

### Integration

**Why it matters:** Core functionality depends on external data providers.

| Requirement | Implementation | Rationale |
|-------------|----------------|-----------|
| **Provider abstraction** | Interface-based design | Swap providers without code changes |
| **Retry logic** | Exponential backoff on failures | Handle transient errors |
| **Circuit breaker** | Disable failing providers temporarily | Prevent cascade failures |
| **Fallback behavior** | Use cached data when API unavailable | Graceful degradation |
| **Cost monitoring** | Track API calls per provider | Budget management |
| **Rate limit handling** | Queue and batch requests | Stay within limits |

### Auditability

**Why it matters:** Users need to trust and verify calculations. Debugging requires history.

| Requirement | Implementation | Rationale |
|-------------|----------------|-----------|
| **Calculation logging** | Log all score calculations with inputs | User verification |
| **Decision history** | Track all investment confirmations | Historical analysis |
| **Data source tracking** | Record which API provided each data point | Transparency |
| **Configuration history** | Version criteria changes | Understand score changes |

---

## PRD Summary

| Metric | Value |
|--------|-------|
| **Functional Requirements** | 67 |
| **NFR Categories** | 6 (Performance, Security, Scalability, Reliability, Integration, Auditability) |
| **MVP Scope** | Complete automated workflow from data fetch to investment recommendation |
| **Domain Complexity** | High (Fintech) - addressed with data protection, accuracy, and disclaimers |
| **Project Type** | SaaS B2B Platform with single-user accounts |

### What This Product Delivers

**Investments Planner transforms the manual, time-consuming process of investment portfolio review into an automated, configuration-driven system.**

Users define their investment philosophy through scoring criteria and allocation ranges. The system executes that philosophy with mathematical precision - fetching data overnight, calculating scores, and presenting simple recommendations: "Invest $X in Asset A, $Y in Asset B."

**The core promise:** Trust your system or refine it. No overrides, no emotional decisions, no second-guessing. Configuration over hardcoding. Simplicity in front, complexity behind.

---

_This PRD captures the essence of Investments Planner - automating investment discipline so users can focus on what matters: building wealth consistently over time._

_Created through collaborative discovery between Bmad and PM Agent John._
