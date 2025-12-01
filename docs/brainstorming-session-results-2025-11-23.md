# Brainstorming Session Results

**Session Date:** 2025-11-23
**Facilitator:** Strategic Business Analyst Mary
**Participant:** Bmad

## Session Start

**Approach:** User will select brainstorming technique after context setting
**Focus:** Investment portfolio management automation using Cerrado diagram methodology

## Executive Summary

**Topic:** Automating investment portfolio review and allocation process for a long-term holder using Cerrado diagram methodology

**Session Goals:**
- Solve the manual effort problem of reviewing investment performance before making new contributions
- Automate asset evaluation across all available assets (REITs, ETFs, stocks, etc.) instead of only reviewing existing portfolio holdings
- Automatically calculate optimal allocation amounts based on predefined asset type percentages (fixed income, variable income, crypto, etc.)
- Apply Cerrado diagram criteria systematically to asset selection across different markets and investment types

**Techniques Used:**
1. SCAMPER Method (Structured category) - 7 systematic lenses

**Total Ideas Generated:** 35+ distinct concepts

### Key Themes Identified:

1. **Automation-First Design** - Remove manual review burden entirely
2. **Configuration Over Hardcoding** - Users define strategy, system executes
3. **Multi-Currency/Multi-Market Sophistication** - International portfolios from day one
4. **Trust Through Transparency** - No score overrides, refine criteria instead
5. **Learning System** - Track decisions, backtest strategies, improve over time
6. **Smart Timing** - Pre-compute overnight for instant recommendations
7. **Separation of Concerns** - Risk tolerance affects allocation, not scoring
8. **Data Lifecycle Management** - Capture once, cache intelligently, reuse efficiently

## Technique Sessions

### Session 1: SCAMPER Method

#### S - SUBSTITUTE (What to replace?)

**Ideas Generated:**

1. **Substitute manual data gathering with automated Gemini API fetching**
   - Use Google Gemini to fetch asset performance data automatically
   - Quarterly company publications → 6-month refresh cycle (configurable)
   - Fetch all financial metrics and fundamentals for stocks/ETFs
   - Fetch ownership details for REITs

2. **Substitute in-memory/temporary data with persistent database storage**
   - Store asset performance data per user
   - Store configurable scoring rules by:
     - Asset type (REIT, ETF, Stock, etc.)
     - Market sector (manufacturing, banking, etc.)
     - Exchange
   - Store calculated monthly scores for historical tracking
   - Historical data enables trend analysis over time

3. **Substitute spreadsheets with database**
   - Move from manual spreadsheet management to structured database
   - Better data integrity and querying capabilities
   - Easier to maintain and scale

4. **Keep monthly review frequency** (Don't substitute!)
   - Aligned with salary receipt cycle
   - Natural rhythm for capital deployment
   - No need to change this

**Key Insight:** Data lifecycle matters - capture, store, reuse. Historical scoring data opens possibilities for trend analysis.

---

#### C - COMBINE (What to merge together?)

**Ideas Generated:**

1. **Combine data fetching + scoring calculation into single automated flow**
   - One process: fetch data → calculate Cerrado score → store results
   - Reduces steps and ensures scoring happens immediately after data refresh

2. **Combine portfolio analysis + allocation calculation**
   - Analyze current portfolio state and calculate new allocations together
   - Single view: "Here's where you are, here's where you should invest"

3. **Combine historical performance data with Cerrado scoring**
   - **New scoring rule: Historical surplus consistency**
     - Asset with surpluses for last 5 years → +5 points
     - Each year WITHOUT surplus → -2 points
   - This adds a "consistency premium" to the Cerrado methodology
   - Rewards stable, reliable assets over volatile ones

4. **Combine review session with portfolio rebalancing**
   - Monthly review includes rebalancing check
   - As a holder: only divest, don't frequently trade
   - Ensures portfolio stays aligned with target allocations

**Important Constraints Identified:**
- **DON'T combine cross-market data** - Evaluation criteria differ by market
  - Example: High P/VP good in manufacturing, meaningless in IT
  - Each market/sector needs its own evaluation context
- **Budget/financial planning** - Could combine later, but not initially (keep scope focused)

**Key Insight:** Combining processes creates efficiency, but respect domain boundaries - different markets need different evaluation logic.

---

#### A - ADAPT (What to borrow from other systems?)

**Ideas Generated:**

1. **Adapt "Simplicity in front, complexity behind" principle**
   - **NOT a screening tool** where user analyzes assets manually
   - **IS an allocation tool** that gives simple answers: "Invest $X in Asset A, $Y in Asset B"
   - Configure once → Get simple recommendations monthly
   - Hide all the complexity of scoring, evaluation, and calculation
   - User focus: "What should I buy this month?" not "How do I analyze this asset?"

2. **Adapt fitness tracker patterns for portfolio health tracking**
   - Track historical performance of your investment strategies over time
   - Visualize: "How has your portfolio performed following these criteria?"
   - Show progress toward allocation goals
   - Historical index construction analysis: "How would this index have performed if built 2 years ago?"

3. **Adapt news aggregator ranking/filtering for asset discovery**
   - Rank all available assets by Cerrado score
   - Filter by asset type, market, exchange
   - Surface top opportunities automatically

4. **Adapt index template/inheritance pattern**
   - Create new indices by copying and modifying existing ones
   - Example: Copy "Original Cerrado REIT Index" → Modify criteria → Save as "My Custom REIT Index"
   - **Index comparison feature**: Compare original vs. modified indices
     - Which scores better on average?
     - Which identifies better opportunities?
     - A/B test your investment strategies!

5. **Adapt Cerrado methodology across asset types**
   - Use Cerrado principles as a template
   - Adapt metrics for each asset type:
     - REITs: P/VP, location, diversification, dividend consistency
     - Stocks: P/E, debt-to-equity, revenue growth, margins
     - ETFs: expense ratio, tracking error, diversification
   - Core concept stays the same, metrics change

**Key Insight:** Great tools hide complexity and give simple answers. Build for "What should I do?" not "How do I analyze?"

---

#### M - MODIFY (What to change or enhance?)

**Ideas Generated:**

1. **Modify scoring to be fully user-configurable per market**
   - User defines criteria library with point values
   - Example criteria:
     - "Asset had surplus in all years for last 5 years" → +5 points
     - "P/VP between 0.6 and 0.8" → +3 points
     - "ROE greater than 18%" → +2 points
   - **Score is ALWAYS calculated, never manually assigned**
   - Different markets can use different criteria
   - Each criterion grants points when met (configurable by user)

   **Important separation of concerns:**
   - Risk tolerance does NOT affect scoring
   - Risk tolerance affects allocation percentages across asset classes
   - More volatile classes → lower percentage based on user's risk aversion

2. **Modify allocation calculation to use percentage RANGES with constraints**
   - **Range-based allocation** (not fixed percentages):
     - "Fixed income: 40-50%"
     - "Variable income: 20-30%"
     - "Crypto: 3-5%"
   - Apply same logic to subclasses:
     - "Stocks: X-Y%"
     - "Treasury bonds: X-Y%"
     - "ETFs: X-Y%"
   - Some classes/subclasses can have minimum values

   **Multi-currency portfolio support:**
   - Track base currency for entire portfolio
   - Use exchange rates for currency conversion
   - **Use previous day's exchange rate** for calculations
   - Essential for calculating percentages coherently
   - Consider exchange rates + asset costs together

   **Asset count constraints:**
   - User defines maximum number of assets per class/subclass
   - Option to "ignore/exclude" specific assets from portfolio
   - Ignored assets don't count toward maximum asset limit
   - Ignored assets not included in allocation calculations

3. **Modify review process to allow opportunistic mid-month investing**
   - Mid-month opportunities can trigger new contributions
   - **Don't recalculate scores** for opportunistic buys
   - Use existing scores from last monthly calculation
   - Separate "scheduled review" from "opportunistic investment"

4. **Modify output to be interactive allocation confirmation**
   - **Initial display:**
     - Current asset allocation (percentages)
     - Suggested investment value for each asset
   - **User interaction:**
     - Enter actual investment amount per asset
     - (May differ from suggested due to market fluctuations)
   - **After confirmation:**
     - Show updated portfolio allocation
     - Reflect new percentages after investments confirmed

**Key Insight:** Flexibility through configuration, not hardcoding. Ranges beat fixed values. Multi-currency support is non-negotiable for international portfolios.

---

#### P - PUT TO OTHER USES (What else could this do?)

**Ideas Generated:**

1. **Use for dividend-aware contribution planning**
   - Dividends should be considered when user enters contribution amount
   - Include received dividends as part of investable capital
   - Track dividend reinvestment as part of portfolio growth

2. **Use for intelligent rebalancing signals**
   - Assets above target allocation range → **Zero buy signal**
   - Highlight over-allocated assets to user
   - Visual indication: "REIT class is at 32% (target: 20-30%) - no buy signal"
   - Encourages natural rebalancing through new contributions

3. **Use for investment journaling and historical analysis**
   - Record all contribution decisions with context
   - Why did you invest in Asset X this month?
   - What were the scores and allocation percentages?
   - Enable later consultation and pattern analysis

4. **Use for comprehensive market screening (beyond portfolio)**
   - **Score ALL assets in evaluated markets**, not just portfolio holdings
   - Identify best opportunities even outside current portfolio
   - **Alert when better opportunities exist but portfolio is full:**
     - "Asset XYZ scores 9.5 but you've reached max 10 REITs"
     - Forces active decision: Keep current holdings or swap?
   - Enables discovery of new investment opportunities

5. **Use for backtesting and strategy validation**
   - **Critical for strategy reflection:** "How would my criteria have performed?"
   - Test historical data against current scoring rules
   - Answer: "If I used these criteria 2 years ago, what would my returns be?"
   - Helps user refine and adjust their strategy over time
   - Validates that criteria modifications are improvements

6. **Use for learning from investment mistakes**
   - Track decisions that didn't work out
   - Analyze: What did the scores say? Did you override the system?
   - Which criteria failed to predict performance?
   - Continuous improvement through reflection

**Key Insight:** The tool shouldn't just tell you what to buy - it should help you learn, improve, and make better decisions over time.

---

#### E - ELIMINATE (What to remove or simplify?)

**Ideas Generated:**

1. **Eliminate manual asset review process**
   - PRIMARY GOAL: Remove need to manually review asset performance
   - Automate collection of:
     - Asset quotes/prices
     - Fundamental data
   - System does the review, user just decides to invest or not

2. **Eliminate score override capability**
   - **NO feature to manually override calculated scores**
   - Scores MUST be calculated based on criteria
   - If score seems wrong → Change the criteria, don't override
   - Enforces systematic thinking and prevents emotional decisions
   - Trust the system you configured

3. **Eliminate unnecessary data collection**
   - **Only fetch data for markets/types with scoring criteria configured**
   - If no criteria exist for a market → Don't collect data for those assets
   - Saves API calls, storage, and processing time
   - Data collection follows configuration

4. **Eliminate (defer) fixed income asset evaluation**
   - Fixed income selection is macro-driven, not Cerrado-driven
   - Lower recurrence of changes (less frequent rebalancing needed)
   - **For MVP: Include fixed income in portfolio allocation %, but don't evaluate specific assets**
   - User manually manages fixed income selection initially
   - Can add evaluation logic in future iteration
   - Important: Fixed income % still counts in total portfolio allocation math

5. **Eliminate assumption of exact allocation amounts**
   - Tool suggests amounts, but market varies between suggestion and execution
   - **Must record ACTUAL investment amounts** (not just suggested)
   - Accurate actual amounts essential for correct portfolio distribution
   - Gap between suggested and actual is normal and expected

6. **Eliminate (defer) simplified workflow for beginners**
   - Advanced configuration is ESSENTIAL for MVP
   - Users need ability to configure scoring criteria
   - Simplified/wizard-based workflow could come later
   - Target audience: Advanced users who understand their strategy
   - Don't dumb down the core product

**All mentioned data is necessary** - No unnecessary metrics identified

**Key Insight:** Eliminate features that encourage manual overrides or emotional decisions. The system should be trusted, not second-guessed. If you don't trust it, fix the criteria.

---

#### R - REVERSE / REARRANGE (What to flip or reorder?)

**Ideas Generated:**

1. **Rearrange cash flow calculation - start with total contribution amount**
   - **Total investable capital = Dividends received + Monthly contribution**
   - **Don't include asset sales** in normal flow
     - Asset sales have costs (fees + income tax)
     - Not recommended as regular practice for long-term holder
     - System shouldn't encourage selling

   - **DEFER: Portfolio overlap/concentration risk analysis**
     - Analyze if different ETFs/REITs expose you to same underlying assets
     - Example: ETF-A and ETF-B both hold 15% Apple stock
     - Example: REIT-X and REIT-Y both own same shopping mall
     - This increases concentration risk without user realizing it
     - **Very useful feature, but implement later**
     - More critical for some asset types than others

2. **DON'T reverse scoring scope - keep scoring ALL market assets**
   - Scoring only portfolio assets limits opportunity discovery
   - Must score all assets in configured markets
   - Reversing order doesn't bring benefits here
   - Keep current approach: Score everything, discover opportunities

3. **DEFER: Reverse decision-making for beginner profiles**
   - System suggests allocation based on investor profile description
   - Good for beginners or users who don't want to configure criteria
   - Not needed for advanced investors (primary target)
   - **For future release:**
     - Collect investor profile
     - If beginner → simplified workflow
     - If advanced → full configuration control

4. **Rearrange scoring and pricing update frequencies**
   - **Company fundamentals:** Monthly calculation makes sense
     - Quarterly publications, but dates vary by company
     - Monthly ensures fresh enough data
   - **Asset prices:** Daily updates recommended
     - Prices change constantly
     - Daily refresh keeps suggestions accurate
   - **Advanced feature:** Allow experienced users to force immediate update
     - "Refresh now" button for urgent situations

5. **Reverse data fetch timing - pre-fetch before user access**
   - **Automated early morning process** (before markets open)
   - Pre-calculate scores and suggested allocations
   - When user logs in → everything already ready
   - No waiting for API calls or calculations
   - Instant decision-making experience
   - Data fresh and ready for the trading day

**Key Insight:** Timing matters. Pre-compute everything overnight so users get instant recommendations when they need them.

---

### SCAMPER Summary

**Total ideas generated in SCAMPER:** 30+ distinct concepts across 7 lenses

**Major themes identified:**
1. **Automation-first design** - Remove manual review burden
2. **Configuration over hardcoding** - User defines criteria, system executes
3. **Multi-currency/multi-market sophistication** - Handle complexity gracefully
4. **Learning system** - Track, reflect, improve over time
5. **Trust through transparency** - No overrides, fix criteria instead
6. **Smart timing** - Pre-compute overnight, instant recommendations

---

## Idea Categorization

### MVP Features (Implement Now)

**Core System Architecture:**
- Automated data fetching via Gemini API (6-month refresh for fundamentals, daily for prices)
- Database storage replacing spreadsheets
- User-configurable scoring criteria per market/asset type
- Multi-currency portfolio support with previous day's exchange rates
- Historical score tracking for trend analysis

**Scoring & Evaluation:**
- Calculate scores based on user-defined criteria (no manual override)
- Score ALL assets in configured markets (not just portfolio holdings)
- Historical surplus consistency scoring (+5 for 5 years, -2 per missing year)
- Market-specific criteria (different evaluation logic per sector)
- Monthly fundamental scoring, daily price updates
- Force refresh option for advanced users

**Portfolio Management:**
- Range-based allocation percentages (e.g., "Fixed income: 40-50%")
- Asset count limits per class/subclass
- Ability to ignore/exclude specific assets from portfolio
- Rebalancing via new contributions (zero buy signal for over-allocated assets)
- Record actual investment amounts (market fluctuations cause variance)
- Dividend-aware contribution planning (dividends + monthly contribution)

**User Experience:**
- Pre-compute overnight (automated early morning process before markets open)
- Simple output: "Invest $X in Asset A, $Y in Asset B"
- Interactive confirmation workflow with actual investment entry
- Show updated allocation after confirmation
- Alert when better-scored assets exist but portfolio is at maximum capacity

**Advanced Features:**
- Investment journaling and historical decision tracking
- Backtesting capability (test criteria against historical data)
- Index template/inheritance (copy and modify criteria sets)
- Index comparison (compare original vs. modified strategies)
- Learning from mistakes analysis

**Deferred MVP Features:**
- Fixed income asset evaluation (include in allocation %, defer selection criteria)
- Opportunistic mid-month investing (use existing scores, don't recalculate)

### Post-MVP Features (V2 and Beyond)

**Deferred to future releases:**
1. **Overlap/concentration risk analysis**
   - Detect when different vehicles expose portfolio to same underlying assets
   - Critical for risk management but not blocking core functionality

2. **Beginner investor profile/simplified workflow**
   - Automated allocation suggestions based on investor profile
   - Wizard-based configuration
   - Target audience: beginners who don't want full configuration control

3. **Budget/financial planning integration**
   - Combine investment planning with broader financial planning
   - Monthly budget coordination
   - Tax optimization features

### Insights and Learnings

**Key realizations from the brainstorming session:**

1. **Separation of Concerns is Critical**
   - Risk tolerance affects allocation percentages, NOT scoring criteria
   - Scoring must be objective and calculated, never manual
   - Different markets require different evaluation logic (P/VP in manufacturing ≠ P/VP in IT)

2. **Data Lifecycle Strategy**
   - Capture once, store, reuse
   - Historical data enables learning and improvement
   - Only fetch data for markets with configured criteria (efficiency)
   - Pre-compute overnight for instant user experience

3. **Configuration Over Hardcoding**
   - User defines scoring criteria with point values
   - Range-based allocation provides flexibility without rigidity
   - System executes user's strategy, doesn't impose its own

4. **Trust Through Transparency**
   - No score overrides - if score is wrong, fix the criteria
   - Forces systematic thinking over emotional decisions
   - System should be trusted or refined, not second-guessed

5. **Simplicity in Front, Complexity Behind**
   - User wants answer: "What should I buy?"
   - Not: "Here's data, go analyze it"
   - Hide all complexity of scoring, calculation, multi-currency math

6. **MVP Must Be Complete System**
   - Half a solution doesn't solve the problem
   - Can't replace manual process without full automation
   - Deferred features are enhancements, not core workflow

7. **Multi-Currency is Non-Negotiable**
   - International portfolios are the norm, not exception
   - Previous day's exchange rates for consistent calculations
   - Currency conversion essential for accurate allocation percentages

8. **Timing and Frequency Matter**
   - Monthly scoring aligned with salary/contribution cycle
   - Daily price updates capture market movements
   - Quarterly fundamental data refresh matches company reporting
   - Pre-market computation ensures instant recommendations

## Action Planning

### Top 3 Priority Areas for MVP Implementation

#### Priority #1: Foundation - Multi-User System Architecture

**What:**
- Database schema design for multi-user environment
- User authentication and authorization
- User configuration system (criteria, allocation ranges, markets)
- Core data models: User, Portfolio, Asset, Score, Criteria, Market, AssetClass
- User isolation (each user's data separate and secure)

**Rationale:**
- Foundation for everything else - all features depend on this
- Multi-user support must be architectural from day one (can't retrofit easily)
- User-specific configuration is core to the product value proposition
- Security and data isolation are non-negotiable

**Next Steps:**
1. Design database schema with multi-tenancy in mind
2. Define user data model and relationships
3. Design configuration tables (criteria, allocation rules, market definitions)
4. Set up authentication/authorization framework
5. Create user registration and profile management
6. Design API structure for user-scoped operations

**Resources Needed:**
- Backend framework selection (consider: Node.js/Express, Python/FastAPI, or similar)
- Database selection (PostgreSQL recommended for complex queries)
- Authentication library (JWT tokens, OAuth, etc.)
- Database migration tools (Flyway, Alembic, etc.)

#### Priority #2: Data Pipeline - Asset Data & Multi-Currency Scoring

**What:**
- Gemini API integration for fetching asset fundamentals and prices
- Multi-currency data storage and conversion logic
- Exchange rate fetching and storage (previous day's rates)
- Data caching and refresh strategy (6-month fundamentals, daily prices)
- Scoring calculation engine based on user-configured criteria
- Only fetch data for markets with configured criteria

**Rationale:**
- This is the "intelligence" of the system - replaces manual asset review
- Multi-currency calculation affects data storage and all downstream calculations
- Scoring engine is the core differentiator (Cerrado diagram automation)
- Data quality and freshness directly impact recommendation quality

**Next Steps:**
1. Research Gemini API capabilities for financial data
2. Design multi-currency data model (base currency per user, exchange rates table)
3. Build data fetching service with configurable refresh schedules
4. Implement scoring engine that evaluates user-defined criteria
5. Create caching layer for API efficiency
6. Build scheduled job for overnight pre-computation
7. Implement "force refresh" feature for advanced users

**Resources Needed:**
- Gemini API access and authentication
- Exchange rate API (alternative data source)
- Job scheduler for automated overnight processing (cron, Celery, etc.)
- Caching strategy (Redis optional, or database-based)

#### Priority #3: Allocation Intelligence - Portfolio Analysis & Recommendations

**What:**
- Portfolio analysis (current vs. target allocation with ranges)
- Multi-currency portfolio valuation
- Allocation recommendation algorithm
- Asset count limit enforcement per class/subclass
- Zero buy signal for over-allocated assets
- Alert system (better assets exist but portfolio full)
- Interactive confirmation workflow

**Rationale:**
- This delivers the core user value: "What should I buy?"
- Transforms data and scores into actionable recommendations
- Must handle complex logic: ranges, constraints, multi-currency, rebalancing
- Final piece that completes the automated workflow

**Next Steps:**
1. Design portfolio analysis algorithm
2. Implement range-based allocation calculator
3. Build recommendation engine (score + allocation + constraints)
4. Develop alert system for portfolio limits and opportunities
5. Create interactive confirmation UI/API
6. Implement actual vs. suggested amount tracking
7. Build updated allocation display after confirmation

**Resources Needed:**
- Frontend framework (React, Vue, or similar) for interactive confirmation
- Algorithm design for optimal allocation within ranges
- Real-time calculation capability (or near-real-time)

## Reflection and Follow-up

### What Worked Well

**SCAMPER Method was highly effective for this project:**
- Systematic exploration through 7 lenses ensured comprehensive coverage
- Each lens revealed different aspects: technical, architectural, UX, strategic
- Structured approach prevented getting stuck or missing important angles
- User had clear context for investment methodology (Cerrado diagram) which grounded the discussion

**User's clarity and decisiveness:**
- Strong opinions on what matters (multi-currency, no overrides, configuration over hardcoding)
- Clear MVP scope decisions (what's in, what's deferred)
- Technical sophistication enabled deep architectural discussions
- Realistic about complexity while maintaining ambitious scope

### Areas for Further Exploration

**Technical Architecture Deep-Dives:**
1. **Database schema design** - Specific tables, relationships, indexing strategy
2. **Scoring engine algorithm** - How to evaluate complex criteria efficiently
3. **Allocation optimization algorithm** - How to distribute capital optimally within ranges and constraints
4. **Gemini API capabilities** - What financial data is actually available? Limitations?
5. **Exchange rate data sourcing** - Which API? Reliability? Historical data?

**User Experience Design:**
1. **Configuration interface** - How do users define criteria intuitively?
2. **Monthly review workflow** - Step-by-step user journey
3. **Notification/alert system** - When and how to alert users?
4. **Mobile vs. web experience** - Where do users want to interact with this?
5. **Data visualization** - Charts for portfolio allocation, performance, trends?

**Business/Product Questions:**
1. **Monetization strategy** - Subscription? Freemium? One-time purchase?
2. **Target market size** - How many sophisticated investors need this?
3. **Competition analysis** - What exists? What gaps does this fill?
4. **Marketing approach** - How to reach target users?

### Recommended Follow-up Techniques

**For technical architecture:**
- **Mind Mapping** - Visualize database schema and system components
- **Morphological Analysis** - Explore all combinations of tech stack choices
- **First Principles Thinking** - Strip down to fundamental requirements for each component

**For UX design:**
- **User Journey Mapping** - Map the monthly review process step-by-step
- **Role Playing** - Walk through the system as different user personas
- **What If Scenarios** - Explore edge cases and error conditions

**For business strategy:**
- **Five Whys** - Understand root motivations of target users
- **Analogical Thinking** - Learn from similar successful products
- **Assumption Reversal** - Challenge beliefs about target market

### Questions That Emerged

**Technical Questions:**
1. What financial data can Gemini API actually provide? Need to research capabilities.
2. How to handle assets that trade on multiple exchanges (same asset, different currencies)?
3. What's the best way to store time-series data (prices, scores, allocations over time)?
4. How to handle corporate actions (splits, mergers, dividend adjustments)?
5. What happens when a scoring criterion references unavailable data for an asset?

**Business Questions:**
1. Is this a product for sale, or a personal tool that could become a product?
2. How many users are needed to justify multi-user architecture complexity?
3. What's the cost structure? (Gemini API calls, hosting, etc.)
4. Should this be open-source or proprietary?

**Product Questions:**
1. How to onboard new users? (Sample criteria? Templates? Tutorials?)
2. Should there be community features? (Share strategies, compare performance?)
3. How to handle data privacy for financial information?
4. Mobile app needed, or web-only sufficient?

### Next Session Planning

**Immediate Next Steps:**
1. **Research Gemini API capabilities** - Validate that financial data fetching is feasible
2. **Sketch database schema** - Create ERD for core tables
3. **Prototype scoring engine** - Prove out the criteria evaluation logic
4. **Design allocation algorithm** - Solve the optimization problem on paper first

**Recommended Follow-up Session Topics:**
1. **Database Schema Design Workshop** - Use Mind Mapping or Entity-Relationship diagramming
2. **User Journey Mapping** - Walk through monthly review process in detail
3. **Technical Stack Selection** - Evaluate frameworks, languages, tools
4. **MVP Feature Prioritization** - Break down Priority #1, #2, #3 into smaller stories

**Preparation for Next Session:**
- Research Gemini API documentation for financial data endpoints
- List all asset types and markets you want to support initially
- Document your current manual process in detail (screenshots, steps, pain points)
- Sketch rough ideas for UI/UX (even hand-drawn wireframes help)

---

_Session facilitated using the BMAD CIS brainstorming framework_
