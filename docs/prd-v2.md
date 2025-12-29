# Investments Planner - Product Requirements Document

**Author:** Bmad
**Date:** 2025-12-26
**Version:** 2.0

---

## Executive Summary

**Investments Planner** is a portfolio planning and tracking platform for passive investors who want to visualize, manage, and optimize their long-term investment allocations without the complexity of active trading platforms.

**The Core Insight:** Passive investors compare investment tools to Excel spreadsheets—and Excel is winning on simplicity. Current platforms fail in three critical ways:

1. **No Error Recovery** - Users can't edit or delete portfolios, creating a "Trust Death Spiral"
2. **No Visual Feedback** - While competitors show intuitive pie charts, many tools force mental math
3. **No International Support** - Decimal separator differences block global users entirely

**The Solution:** A visually-rich, globally accessible portfolio planner that builds trust through transparency and control. Users define their investment strategy through allocation targets and scoring criteria—the system executes with mathematical precision and presents simple answers: "Invest $X in Asset A, $Y in Asset B."

**Core Philosophy:** Configuration over hardcoding. Simplicity in front, complexity behind. Trust your system or refine it—no overrides, no emotional decisions.

### What Makes This Special

| Differentiator                | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| **Visual Pie Allocation**     | M1 Finance-style pie charts with real-time "X% remaining" feedback   |
| **Trust Through Control**     | Full CRUD operations—edit and delete portfolios to fix mistakes      |
| **Multi-Currency Native**     | International portfolios with regional number format support         |
| **Pre-Computed Intelligence** | Overnight processing means instant recommendations at login          |
| **Opportunity Discovery**     | Scores ALL assets in configured markets, not just portfolio holdings |
| **No Score Overrides**        | Scores are calculated, never manual—enforces systematic thinking     |

### Market Opportunity

| Metric             | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| **TAM**            | $14-15B (Global investment apps)                            |
| **SAM**            | $2.5-3.0B (Passive investors, English + Portuguese markets) |
| **SOM**            | $25-60M (1-2% market capture)                               |
| **Target Segment** | Gen Z/Millennials (37% of all investors)                    |

**Market Gap:** No strong competitor combines visual pie allocation + international i18n + passive investor focus + active planning (not just tracking).

---

## Project Classification

| Attribute               | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| **Technical Type**      | SaaS B2C Platform                                    |
| **Domain**              | Fintech (Investment Portfolio Management)            |
| **Complexity**          | High                                                 |
| **Regulatory Position** | Decision Support Calculator (not Investment Adviser) |

### Regulatory Considerations

**Not Required:**

- SEC/FINRA broker-dealer registration (no trade execution)
- RIA registration (users define their own criteria)

**Applicable:**

- Data protection standards (GDPR for EU users, CCPA for California)
- User data isolation in multi-tenant architecture
- Clear disclaimers that this is a calculation tool, not financial advice

**Key Compliance Mitigations:**

- Prominent disclaimers: "Tool calculates based on YOUR criteria. Not financial advice."
- User data isolation in multi-tenant architecture
- Data export and deletion capabilities (GDPR compliance)
- Terms of service and privacy policy

### Reference Documents

| Document              | Purpose                   | Path                                                   |
| --------------------- | ------------------------- | ------------------------------------------------------ |
| Product Brief         | Strategic vision          | `docs/product-brief-investments-planner-2025-12-26.md` |
| Brainstorming Session | Pain points & solutions   | `docs/brainstorming-session-results-2025-12-26.md`     |
| Competitive Research  | Market positioning        | `docs/research-competitive-2025-12-26.md`              |
| Market Research       | TAM/SAM/SOM               | `docs/research-market-2025-12-26.md`                   |
| User Research         | Personas & behaviors      | `docs/research-user-2025-12-26.md`                     |
| Domain Research       | Terminology & regulations | `docs/research-domain-2025-12-26.md`                   |
| Technical Research    | Stack validation          | `docs/research-technical-2025-12-26.md`                |

---

## Target Users

### Primary Persona: The Young Index Investor

**Demographics:** Gen Z / Millennial (20-40), building wealth, mobile-first

| Attribute             | Detail                                           |
| --------------------- | ------------------------------------------------ |
| **Experience**        | Beginner to moderate                             |
| **Primary Goal**      | Building passive income (40-43% cite this)       |
| **Investment Style**  | ETFs, index funds, buy-and-hold                  |
| **Tech Comfort**      | High—41% comfortable with AI managing portfolios |
| **Started Investing** | Age 20 (Gen Z average)                           |

**Key Behaviors:**

- Uses brokerage apps and robo-advisors, rarely full-service brokers
- Prefers "set and forget" strategies
- Values: Simplicity, low fees, transparency, ESG options
- Frustrated by: Complex interfaces, lack of education, fee opacity

**Quote:** _"Time in the market beats timing the market"_ (89% believe this)

**Jobs to Be Done:**

- Set up portfolio allocation across asset classes
- Define and stick to an investment strategy
- Track progress toward financial goals
- Feel confident they're "doing it right"

### Secondary Persona: The Passive Preserver

**Demographics:** Gen X (40-55), moderate experience, family-focused

| Attribute            | Detail                                                            |
| -------------------- | ----------------------------------------------------------------- |
| **Experience**       | Moderate—has investments but not sophisticated                    |
| **Primary Goal**     | Preserving wealth, family security                                |
| **Investment Style** | Consistent small gains, low risk                                  |
| **Tech Comfort**     | Medium—most stressed about investments, least happy with advisors |

**Key Behaviors:**

- Accumulates wealth through consistent, small contributions
- Dislikes complexity and frequent changes
- Long, steady employment history
- Becomes more passive as wealth increases

**Jobs to Be Done:**

- Simple, clear portfolio view
- Minimal required actions
- Reassurance that strategy is working
- Easy progress tracking toward retirement

### Tertiary Persona: The Income Seeker

**Demographics:** 50+ or early retirees, seeking passive income

| Attribute            | Detail                                    |
| -------------------- | ----------------------------------------- |
| **Experience**       | Moderate to experienced                   |
| **Primary Goal**     | Generating regular income                 |
| **Investment Style** | Dividend stocks, REITs, bonds             |
| **Tech Comfort**     | Lower—values stability and predictability |

**Unique Needs:**

- Dividend tracking and projections
- Income vs. growth visualization
- **Bond maturity date tracking** (plan reinvestment)
- Reinvestment planning tools

---

## User Experience Principles

### Design Philosophy

**"Simplicity in front, complexity behind."**

The UI should answer one question instantly: **"What should I buy this month?"**

This is NOT a screening tool where users analyze assets manually. This IS an allocation tool that gives simple, actionable answers.

### Visual Personality

| Attribute      | Direction                                                                |
| -------------- | ------------------------------------------------------------------------ |
| **Tone**       | Professional, trustworthy, calm                                          |
| **Density**    | Clean, not cluttered—financial data without overwhelm                    |
| **Color**      | Neutral base with strategic color for signals (green/red for allocation) |
| **Typography** | Clear, readable numbers—financial data must be scannable                 |
| **Charts**     | Pie charts for allocation, sparklines for trends                         |

**The Vibe:** A trusted advisor's desk, not a trading floor. Calm confidence, not frantic activity.

### Core UX Principles

1. **Answer First, Details on Demand**
   - Lead with recommendations: "Invest $X in Asset A, $Y in Asset B"
   - Scores, calculations, and reasoning available but not forced
   - Progressive disclosure—complexity is accessible, not mandatory

2. **Trust Through Transparency**
   - Every score shows contributing criteria on click/hover
   - Every recommendation shows the calculation breakdown
   - Data freshness always visible ("Prices as of Dec 26, 2025")

3. **Visual Feedback is Expected**
   - Pie chart showing allocation at a glance (M1 Finance standard)
   - Real-time "X% allocated, Y% remaining" display
   - 100% validation before save—no silent failures
   - Color-coded status indicators (green = valid, red = needs attention)

4. **Error Recovery Builds Trust**
   - Full edit capability for portfolios and strategies
   - Delete with confirmation dialog
   - Undo for recent actions where possible
   - Clear error messages with guidance to fix

5. **International by Default**
   - Regional number formats (decimal: point vs comma)
   - Multi-currency display and conversion
   - Locale-aware form validation

6. **No Second-Guessing**
   - No "override score" buttons—the system doesn't tempt emotional decisions
   - If something seems wrong, guide users to refine criteria instead
   - Confidence in the system you configured

### Key User Flows

#### Portfolio Setup Flow (Must Not Fail Silently)

```
Create Portfolio → Add Holdings → Set Allocations → Visual Feedback
                                        ↓
                          Pie Chart Updates Real-Time
                          "75% allocated, 25% remaining"
                                        ↓
                          Validation: Must = 100%
                                        ↓
                    ✅ Save Enabled    ❌ Warning if ≠ 100%
```

**Critical:** No silent failures. Every action has clear feedback.

#### Monthly Review Flow (Primary)

```
Login → Dashboard shows:
  "Ready to invest. You have $X available (contribution + dividends)"
  ↓
  Recommendations displayed with pie chart:
  "Asset A: $Y | Asset B: $Z | Asset C: $W"
  ↓
  User confirms or adjusts actual amounts
  ↓
  Portfolio updated, new allocation percentages shown
```

#### Error Recovery Flow (Trust Death Spiral Prevention)

```
Mistake Realized → Edit Portfolio → Fix Data → Recalculate
        ↓                                          ↓
   Or Delete Portfolio ───────────► Confirm Dialog → Deleted
                                                     ↓
                                        Recommendations Recalculated
```

---

## Success Criteria

### User Value Success (Primary)

| Metric                        | Target                       | Rationale                             |
| ----------------------------- | ---------------------------- | ------------------------------------- |
| **Portfolio Completion Rate** | 85%+                         | Users finish setup without abandoning |
| **Edit/Delete Usage**         | <10% within 24h              | Low early edits = good UX             |
| **Manual effort eliminated**  | No spreadsheets needed       | Core problem solved                   |
| **Decision speed**            | Login → decision in <5 min   | Was taking hours                      |
| **Trust & adoption**          | Users follow recommendations | "No override" philosophy works        |

### System Success

| Metric                     | Target                       | Rationale                        |
| -------------------------- | ---------------------------- | -------------------------------- |
| **Pre-computation timing** | Before 6 AM local            | Instant recommendations          |
| **Methodology fidelity**   | 100% match to Cerrado method | System must be trustworthy       |
| **Calculation accuracy**   | Accurate to the cent         | Financial data demands precision |
| **Data integrity**         | Zero corruption/loss         | Configurations are valuable      |

### Adoption Success

| Metric                  | Target                   | Rationale                      |
| ----------------------- | ------------------------ | ------------------------------ |
| **7-Day Retention**     | 60%+                     | Users return within first week |
| **30-Day Retention**    | 40%+                     | Sustained engagement           |
| **NPS Score**           | 40+                      | Users recommend to friends     |
| **International Usage** | 20%+                     | i18n is working                |
| **Configuration depth** | Users customize criteria | Proves customization value     |

---

## Product Scope

### MVP - Minimum Viable Product

**Core Question:** What must work for this to be useful?

The complete automated workflow from data fetch to investment recommendation, with full portfolio control and visual feedback.

#### Portfolio Management (CRITICAL)

| Requirement                      | Priority | Rationale                     |
| -------------------------------- | -------- | ----------------------------- |
| Create portfolio                 | P1       | Core functionality            |
| **Edit portfolio**               | P1       | Trust Death Spiral prevention |
| **Delete portfolio**             | P1       | Trust Death Spiral prevention |
| Add/update/remove holdings       | P1       | Core functionality            |
| Mark assets as "ignored"         | P2       | Exclude from calculations     |
| View current holdings/values     | P1       | Core functionality            |
| Record actual investment amounts | P1       | Track decisions               |

#### Visual Feedback (CRITICAL)

| Requirement                       | Priority | Rationale                              |
| --------------------------------- | -------- | -------------------------------------- |
| **Pie chart visualization**       | P1       | Competitive table stakes (M1 standard) |
| **Live allocation % display**     | P1       | "X% allocated, Y% remaining"           |
| **100% validation**               | P1       | Prevent silent failures                |
| **Validation warning on exit**    | P1       | Don't allow incomplete strategies      |
| Status indicators (valid/invalid) | P2       | Clear feedback                         |
| Color-coded allocation health     | P2       | At-a-glance understanding              |

#### Internationalization (HIGH)

| Requirement                  | Priority | Rationale                             |
| ---------------------------- | -------- | ------------------------------------- |
| **Regional number format**   | P2       | Decimal point vs comma                |
| **Locale-aware validation**  | P2       | Forms accept regional input           |
| Multi-currency display       | P1       | Already in original PRD               |
| Exchange rate conversion     | P1       | Already in original PRD               |
| Format hints in input fields | P3       | Help users understand expected format |

#### Scoring & Evaluation Engine

| Requirement                          | Priority | Rationale                  |
| ------------------------------------ | -------- | -------------------------- |
| User-configurable criteria           | P1       | Core methodology           |
| Score ALL assets (not just holdings) | P1       | Opportunity discovery      |
| Historical surplus scoring           | P1       | Cerrado methodology        |
| Market-specific criteria             | P1       | Different logic per sector |
| **No manual score overrides**        | P1       | Systematic thinking        |
| Monthly fundamental scoring          | P1       | Core refresh cycle         |
| Daily price updates                  | P1       | Current valuations         |
| Force refresh option                 | P2       | Advanced users             |

#### Data Pipeline

| Requirement                          | Priority | Rationale                            |
| ------------------------------------ | -------- | ------------------------------------ |
| Automated data fetching (Gemini API) | P1       | Core functionality                   |
| Multi-currency storage               | P1       | International portfolios             |
| Exchange rate fetching (daily)       | P1       | Accurate conversions                 |
| Data caching                         | P1       | Performance, cost control            |
| **Two-tier refresh architecture**    | P2       | Scheduled API → cache → user refresh |

#### Asset Class Configuration

| Requirement                     | Priority | Rationale                 |
| ------------------------------- | -------- | ------------------------- |
| Define asset classes/subclasses | P1       | Core organization         |
| Range-based allocation %        | P1       | e.g., "40-50%"            |
| Asset count limits              | P1       | Diversification control   |
| Minimum allocation values       | P2       | Floor for small positions |

#### Recommendations & Allocation

| Requirement                      | Priority | Rationale                     |
| -------------------------------- | -------- | ----------------------------- |
| Enter monthly contribution       | P1       | Input for calculations        |
| Enter dividends received         | P1       | Include in investable capital |
| Calculate total investable       | P1       | Contribution + dividends      |
| Generate recommendations         | P1       | Core output                   |
| Simple display ("$X in Asset A") | P1       | UX principle                  |
| Zero buy for over-allocated      | P1       | Rebalancing logic             |
| Alert for better-scoring assets  | P2       | Opportunity discovery         |
| Calculation breakdown view       | P2       | Transparency                  |
| Confirm and record actuals       | P1       | Track decisions               |

#### User Experience Enhancements

| Requirement                  | Priority | Rationale                |
| ---------------------------- | -------- | ------------------------ |
| **Autocomplete for symbols** | P2       | Reduce manual entry      |
| **Onboarding tips**          | P2       | First-time user guidance |
| **Duplicate name warning**   | P3       | Prevent confusion        |
| Dark/light mode              | P3       | Standard expectation     |

#### User Account & Access

| Requirement                     | Priority | Rationale       |
| ------------------------------- | -------- | --------------- |
| Email/password registration     | P1       | Core access     |
| Email verification              | P1       | Security        |
| Secure sessions (JWT)           | P1       | Security        |
| Password reset                  | P1       | Recovery        |
| Profile update (name, currency) | P2       | Personalization |
| **Regional settings**           | P2       | i18n support    |
| Data export                     | P2       | GDPR compliance |
| Account deletion                | P2       | GDPR compliance |

#### Overnight Pre-Computation

| Requirement                    | Priority | Rationale               |
| ------------------------------ | -------- | ----------------------- |
| Automated overnight processing | P1       | Core value proposition  |
| Pre-calculate all scores       | P1       | Instant recommendations |
| Pre-generate recommendations   | P1       | No waiting at login     |

### MVP Deferrals

| Feature                        | Reason                      | Target Phase |
| ------------------------------ | --------------------------- | ------------ |
| Wizard-style onboarding        | Nice-to-have, not blocking  | Growth       |
| Social login (Google)          | Nice-to-have                | Growth       |
| Brokerage API import           | Complex integration         | Growth       |
| Statement import (PDF/CSV)     | Document parsing complexity | Vision       |
| Multi-channel reminders        | Notification infrastructure | Vision       |
| AI asset recommendations       | ML complexity               | Vision       |
| Bond maturity reports          | Specialized feature         | Growth       |
| Portfolio growth history (5yr) | Data aggregation            | Growth       |

---

### Growth Features (Post-MVP)

**What makes it competitive?** Enhanced UX, learning, and strategy optimization.

#### Enhanced Onboarding

| Feature                            | Description                                |
| ---------------------------------- | ------------------------------------------ |
| **Wizard-style setup**             | Progressive steps with progress bar        |
| **Social login**                   | Google OAuth with profile auto-import      |
| **Experience-based customization** | Adapt UI to beginner/intermediate/advanced |

#### Strategy Intelligence

| Feature                    | Description                            |
| -------------------------- | -------------------------------------- |
| Backtesting capability     | Test criteria against historical data  |
| Index template inheritance | Copy and modify existing criteria sets |
| Index comparison           | A/B test investment strategies         |
| Investment journaling      | Record decisions with context          |

#### Analytics & Reporting

| Feature                        | Description                          |
| ------------------------------ | ------------------------------------ |
| Portfolio growth history (5yr) | Long-term performance visualization  |
| Bond maturity dates report     | Plan reinvestment for income seekers |
| Dividend tracking              | Income projection and history        |

#### UX Improvements

| Feature                    | Description             |
| -------------------------- | ----------------------- |
| Collapsible hamburger menu | More data viewing space |
| Profile area with photo    | Personalization         |

---

### Vision (Future)

**What's the dream version?** Automation, intelligence, and broader integration.

#### Intelligent Features

| Feature                             | Description                         |
| ----------------------------------- | ----------------------------------- |
| AI asset replacement suggestions    | ML-powered recommendations          |
| Auto-discover replacement assets    | When current ones lose fundamentals |
| Overlap/concentration risk analysis | Detect hidden exposures             |
| Correlation analysis                | Understand portfolio dynamics       |

#### Integration & Scale

| Feature                    | Description                    |
| -------------------------- | ------------------------------ |
| Brokerage API import       | Auto-import actual holdings    |
| Statement import (PDF/CSV) | Parse brokerage documents      |
| Multi-channel reminders    | SMS, email, WhatsApp, Telegram |
| Family/household accounts  | Shared portfolio management    |

#### User Expansion

| Feature                    | Description                          |
| -------------------------- | ------------------------------------ |
| Beginner investor profiles | Wizard-based simplified workflow     |
| Community features         | Share strategies, compare (optional) |
| Mobile app                 | Investment decisions on the go       |

---

## Functional Requirements

### User Account & Access (FR1-FR10)

- **FR1:** Users can create an account with email and password
- **FR2:** Users can verify their email address to activate account
- **FR3:** Users can log in securely and maintain authenticated sessions
- **FR4:** Users can log out and terminate their session
- **FR5:** Users can reset their password via email verification
- **FR6:** Users can update their profile information (name, base currency)
- **FR7:** Users can set regional preferences (locale, number format)
- **FR8:** Users can export all their data (portfolio, configurations, history)
- **FR9:** Users can delete their account and all associated data
- **FR10:** System respects user's locale for number formatting throughout the application

### Portfolio Management (FR11-FR25)

- **FR11:** Users can create and name portfolios
- **FR12:** Users can **edit portfolio** name and settings after creation
- **FR13:** Users can **delete portfolio** with confirmation dialog
- **FR14:** System recalculates recommendations after portfolio edit/delete
- **FR15:** Users can add assets to portfolio with quantity and purchase price
- **FR16:** Users can update asset quantities and purchase prices
- **FR17:** Users can remove assets from portfolio
- **FR18:** Users can mark specific assets as "ignored" (excluded from calculations)
- **FR19:** Users can view current portfolio holdings with values in base currency
- **FR20:** Users can view current allocation percentages by asset class/subclass
- **FR21:** Users can record actual investment amounts after purchases
- **FR22:** Users can view investment history (what, when, at what allocation)
- **FR23:** System warns when portfolio name is similar to existing portfolio
- **FR24:** System provides autocomplete for asset symbols/names from API + cache
- **FR25:** System provides autocomplete for asset types and markets from predefined lists

### Visual Feedback & Validation (FR26-FR35)

- **FR26:** System displays **pie chart** showing portfolio allocation by asset class
- **FR27:** Pie chart updates in **real-time** as user modifies allocations
- **FR28:** System displays **live sum** of allocation percentages ("X% allocated")
- **FR29:** System displays **remaining percentage** ("Y% remaining to reach 100%")
- **FR30:** System **validates total allocation equals 100%** before allowing save
- **FR31:** System displays **warning when user attempts to leave** with incomplete allocation
- **FR32:** System displays clear **status indicator** showing strategy validity
- **FR33:** System uses **color coding** for allocation health (green/yellow/red)
- **FR34:** System provides clear **error messages** with guidance to fix issues
- **FR35:** First-time users see **onboarding tips** explaining key features

### Asset Class Configuration (FR36-FR43)

- **FR36:** Users can define asset classes (e.g., Fixed Income, Variable Income, Crypto)
- **FR37:** Users can define subclasses within asset classes
- **FR38:** Users can set allocation percentage ranges for each asset class (e.g., 40-50%)
- **FR39:** Users can set allocation percentage ranges for each subclass
- **FR40:** Users can set maximum asset count limits per class/subclass
- **FR41:** Users can set minimum allocation values for specific classes/subclasses
- **FR42:** Users can set industry sector per portfolio (e.g., Insurance, Banking, Software, Aerospace & Defense)
- **FR43:** Users can filter accepted asset types per portfolio

### Scoring Criteria Configuration (FR44-FR52)

- **FR44:** Users can define scoring criteria for each market/asset type
- **FR45:** Users can set point values for each criterion
- **FR46:** Users can define criteria using various operators (>, <, between, equals)
- **FR47:** Users can view a library of their configured criteria by market/asset type
- **FR48:** Users can copy an existing criteria set to create a new variation
- **FR49:** Users can compare two criteria sets to see average score differences
- **FR50:** Users can preview which assets score highest with current criteria before saving
- **FR51:** System calculates scores automatically—**no manual overrides allowed**
- **FR52:** System shows historical surplus consistency scoring (+5 for 5 years, -2 per missing)

### Asset Data & Scoring (FR53-FR63)

- **FR53:** System fetches asset fundamental data from configured providers (Gemini API)
- **FR54:** System fetches daily asset prices from market data providers
- **FR55:** System fetches daily exchange rates from currency data providers
- **FR56:** System calculates scores for all assets in configured markets based on user criteria
- **FR57:** System stores historical scores for trend analysis
- **FR58:** Users can view the current score for any asset
- **FR59:** Users can view which criteria contributed to an asset's score (breakdown)
- **FR60:** Users can force an immediate data refresh for specific assets or all assets
- **FR61:** Users can view data freshness (when data was last updated) for any asset
- **FR62:** System implements **two-tier refresh**: scheduled API fetch → cache → user refresh
- **FR63:** System only fetches data for markets with configured criteria

### Multi-Currency Support (FR64-FR69)

- **FR64:** Users can set their portfolio base currency
- **FR65:** System converts all asset values to base currency for portfolio calculations
- **FR66:** System uses previous trading day's exchange rates for conversions
- **FR67:** Users can view asset values in both original currency and base currency
- **FR68:** System correctly calculates allocation percentages across multi-currency holdings
- **FR69:** System displays numbers in user's regional format (decimal separator)

### Recommendations & Allocation (FR70-FR82)

- **FR70:** Users can enter their monthly contribution amount
- **FR71:** Users can enter dividends received for the period
- **FR72:** System calculates total investable capital (contribution + dividends)
- **FR73:** System generates investment recommendations based on scores and allocation targets
- **FR74:** System displays recommendations as simple actionable items ("Invest $X in Asset A")
- **FR75:** System shows **pie chart visualization** of recommended allocation
- **FR76:** System shows zero buy signal for assets/classes that are over-allocated
- **FR77:** System alerts users when higher-scoring assets exist but portfolio is at capacity
- **FR78:** Users can view the calculation breakdown for any recommendation
- **FR79:** Users can confirm recommendations and enter actual invested amounts
- **FR80:** System updates portfolio allocation after investment confirmation
- **FR81:** Users can view updated allocation percentages immediately after confirmation
- **FR82:** System shows before/after comparison of allocation after confirmation

### Overnight Pre-Computation (FR83-FR86)

- **FR83:** System runs automated overnight processing before market open
- **FR84:** System pre-calculates scores for all assets in user's configured markets
- **FR85:** System pre-generates allocation recommendations for each user
- **FR86:** Users see instant recommendations on login (no waiting for calculations)

### Data Transparency & Trust (FR87-FR92)

- **FR87:** Users can view data source for each data point (which API provided it)
- **FR88:** Users can view timestamp of last update for any data point
- **FR89:** Users can view complete calculation breakdown for any score
- **FR90:** System displays prominent disclaimers that this is a calculation tool, not financial advice
- **FR91:** System logs all calculations for user's own audit trail
- **FR92:** System displays data freshness indicator on all screens with market data

### Alerts & Notifications (FR93-FR95)

- **FR93:** Users receive alerts when better-scoring assets are discovered outside portfolio
- **FR94:** Users receive alerts when allocation drifts outside configured ranges
- **FR95:** Users can configure alert preferences (which alerts, how delivered)

---

**Total: 95 Functional Requirements** (up from 67 in v1.0)

**New in v2.0:** FR7, FR10, FR12-14, FR23-35, FR42-43, FR62, FR69, FR75, FR82 (visual feedback, CRUD, i18n, validation)

---

## Non-Functional Requirements

### Performance

| Requirement                 | Target            | Rationale                       |
| --------------------------- | ----------------- | ------------------------------- |
| **Dashboard load time**     | < 2 seconds       | Recommendations must be instant |
| **Pie chart render**        | < 100ms           | Real-time visual feedback       |
| **Overnight processing**    | Before 6 AM local | Ready before trading day        |
| **Score calculation**       | < 100ms per asset | Responsive criteria preview     |
| **Portfolio recalculation** | < 1 second        | Instant feedback after changes  |
| **API response times**      | < 500ms           | Smooth interactions             |

### Security

| Requirement                    | Implementation                      |
| ------------------------------ | ----------------------------------- |
| **Authentication**             | bcrypt password hashing, JWT tokens |
| **Data encryption at rest**    | AES-256 for user data               |
| **Data encryption in transit** | TLS 1.3 for all connections         |
| **Session management**         | Secure httpOnly cookies, timeout    |
| **Tenant isolation**           | Database-level user isolation       |
| **API security**               | Rate limiting, input validation     |
| **RLS (Row Level Security)**   | Supabase RLS on all tables          |

### Scalability

| Requirement              | Target                            |
| ------------------------ | --------------------------------- |
| **Concurrent users**     | 1,000+ simultaneous               |
| **Overnight processing** | Scale linearly with users         |
| **Database**             | 100K+ assets across all users     |
| **API rate limits**      | Queue/batch to stay within limits |

### Reliability

| Requirement              | Target                        |
| ------------------------ | ----------------------------- |
| **Uptime**               | 99.5% availability            |
| **Data durability**      | Zero data loss                |
| **Backup frequency**     | Daily automated backups       |
| **Recovery time**        | < 4 hours from backup         |
| **Graceful degradation** | Show cached data if APIs down |

### Internationalization

| Requirement              | Implementation                        |
| ------------------------ | ------------------------------------- |
| **Number formatting**    | Intl.NumberFormat with user locale    |
| **Decimal separator**    | Point (en-US) or comma (de-DE, pt-BR) |
| **Currency display**     | User's base currency + original       |
| **Date formatting**      | Locale-aware date display             |
| **Future: Translations** | next-intl infrastructure ready        |

### Accessibility

| Requirement             | Target                              |
| ----------------------- | ----------------------------------- |
| **Color contrast**      | WCAG 2.1 AA compliant               |
| **Keyboard navigation** | Full keyboard support               |
| **Screen reader**       | ARIA labels on interactive elements |
| **Focus indicators**    | Visible focus states                |

---

## Technical Stack (Validated)

| Layer               | Technology               | Status                  |
| ------------------- | ------------------------ | ----------------------- |
| **Framework**       | Next.js 16, React 19     | ✅ Current              |
| **Database**        | PostgreSQL + Drizzle ORM | ✅ Type-safe            |
| **Styling**         | Tailwind CSS 4           | ✅ Modern               |
| **Charts**          | Recharts 3.5.1           | ✅ Ready for pie charts |
| **Forms**           | react-hook-form + Zod    | ✅ Validation ready     |
| **UI Components**   | Radix UI                 | ✅ Accessible           |
| **Background Jobs** | Inngest                  | ✅ Serverless           |
| **Caching**         | Vercel KV                | ✅ Edge                 |
| **i18n**            | next-intl (to add)       | 🔲 Needed               |
| **Testing**         | Vitest + Playwright      | ✅ Coverage             |
| **Observability**   | OpenTelemetry            | ✅ Production           |

---

## PRD Summary

| Metric                      | v1.0        | v2.0                     |
| --------------------------- | ----------- | ------------------------ |
| **Functional Requirements** | 67          | 95 (+28)                 |
| **NFR Categories**          | 6           | 7 (+Accessibility, i18n) |
| **User Personas**           | 1 (generic) | 3 (researched)           |
| **Market Context**          | None        | TAM/SAM/SOM              |
| **Visual Feedback FRs**     | 0           | 10                       |
| **CRUD FRs (explicit)**     | Implied     | 4 explicit               |
| **i18n FRs**                | 1           | 6                        |

### Key Changes in v2.0

1. **Trust Death Spiral Addressed** - Explicit edit/delete requirements with recalculation
2. **Visual Feedback Added** - Pie charts, live allocation %, validation warnings
3. **i18n Requirements** - Regional number formats, locale-aware validation
4. **User Personas** - Three researched personas with specific needs
5. **Market Context** - TAM/SAM/SOM, competitive positioning
6. **Research References** - Links to all supporting research documents

### What This Product Delivers

**Investments Planner transforms the manual, time-consuming process of investment portfolio review into an automated, visual, globally-accessible system.**

Users define their investment philosophy through scoring criteria and allocation ranges. The system executes with mathematical precision—fetching data overnight, calculating scores, and presenting simple recommendations with visual confidence: pie charts, clear percentages, and instant answers.

**The core promise:** Trust your system or refine it. No overrides, no emotional decisions. Visual feedback, full control, international by default.

---

_This PRD v2.0 incorporates insights from 5 research reports, brainstorming sessions, and competitive analysis conducted December 2025._

_Created through collaborative discovery between Bmad and the BMad Method workflow._
