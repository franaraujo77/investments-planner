# Brainstorming Session Results

**Session Date:** 2025-12-26
**Facilitator:** Brainstorming Facilitator
**Participant:** Bmad

## Session Start

**Approach Selected:** User-Selected Techniques

**Techniques Chosen:**

1. Empathy Mapping - Understand user pain deeply
2. Event Storming - Map the portfolio/strategy input flow
3. Value Proposition Canvas - Align solutions to user needs
4. Crazy 8's - Rapid solution ideation

**Sequence Rationale:** Understand → Map → Align → Ideate

## Executive Summary

**Topic:** Portfolio and Strategy Input Experience

**Session Goals:** Reduce friction, improve retention, attract new users

**Techniques Used:**

1. Empathy Mapping
2. Value Proposition Canvas
3. Crazy 8's
4. Event Storming

**Total Ideas Generated:** 24

### Key Themes Identified:

| Theme                            | Implication                             |
| -------------------------------- | --------------------------------------- |
| **Trust is the Foundation**      | Must fix CRUD before adding features    |
| **Visual Feedback is Expected**  | Competitors have set the bar            |
| **Excel is the Benchmark**       | Must clearly exceed spreadsheet value   |
| **Silent Failures Kill**         | Every action needs clear feedback       |
| **Reduce Manual Entry**          | Users hate typing what exists elsewhere |
| **Internationalization Matters** | Global product needs global UX          |

### Top 3 Priorities

1. 🥇 **Edit/Delete Portfolio** - Break the trust death spiral
2. 🥈 **Pie Chart + Allocation Sum** - Stop silent failures
3. 🥉 **Regional Settings (i18n)** - Unblock international users

## Technique Sessions

### Technique 1: Empathy Mapping

**Target User:** First-time investors, passive savers, platform switchers, holders (not traders)

**Context:** Users configuring portfolio and strategy during onboarding or updates

---

#### THINK & FEEL 🧠

| Insight                                                               |
| --------------------------------------------------------------------- |
| Aspire to **financial freedom and retirement**                        |
| Feel **confused** - platform doesn't guide asset class distribution   |
| Feel **frustrated** - forced to do mental math they shouldn't have to |
| Wonder: "Am I doing this right?"                                      |

#### SEE 👁️

| Insight                                                         |
| --------------------------------------------------------------- |
| Other platforms showing **pie charts** for allocation           |
| Competitors displaying **"X% left to reach 100%"** helpers      |
| Visual experiences elsewhere setting expectations not being met |

#### HEAR 👂

| Insight                                                                    |
| -------------------------------------------------------------------------- |
| "Investing is crucial for your future"                                     |
| "Define a strategy and stick to it" - from influencers, articles, podcasts |
| Emphasis on importance of disciplined portfolio allocation                 |

#### SAY & DO 🗣️

| Behavior                                                  | Implication                                |
| --------------------------------------------------------- | ------------------------------------------ |
| **Give up** when stuck on allocation math                 | Drop-off during onboarding                 |
| **Open calculator** as workaround                         | Platform failing basic UX job              |
| **Can't fix mistakes** - wrong data pollutes calculations | Trust erosion                              |
| Would tell friends: _"This platform has issues"_          | Negative word-of-mouth                     |
| Compare to Excel: "Why don't I just use a spreadsheet?"   | Perceived as more complex than basic tools |

#### PAINS 😣

| Pain                                                                        | Severity     | Impact                        |
| --------------------------------------------------------------------------- | ------------ | ----------------------------- |
| No visual allocation feedback (pie chart)                                   | High         | Confusion, frustration        |
| No "% remaining" calculation helper                                         | High         | Manual math, drop-off         |
| Cannot edit portfolio                                                       | **CRITICAL** | Wrong data, broken trust      |
| Cannot delete portfolio                                                     | **CRITICAL** | Polluted calculations         |
| Can't set business market per portfolio                                     | Medium       | Limited organization          |
| Can't filter accepted asset types                                           | Medium       | Messy portfolio structure     |
| Refresh doesn't update asset name/price                                     | High         | Stale/incorrect data          |
| **Trust erosion** - "If I can't fix mistakes, can I trust recommendations?" | **CRITICAL** | Churn, negative word-of-mouth |
| **Excel comparison** - spreadsheet feels simpler                            | High         | Value proposition questioned  |

#### GAINS 🎯

| Gain                   | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| **Confidence**         | Know they're doing it right - no second-guessing             |
| **Visual progress**    | See allocation fill up, understand at a glance               |
| **No Excel doubt**     | Platform clearly better than manual spreadsheet              |
| **Trust**              | Can fix mistakes → trust recommendations                     |
| **Pride to recommend** | "Investments Planner is helping me" - positive word-of-mouth |

---

**Key Empathy Insight:** Users are comparing the platform to Excel and Excel is winning on simplicity. The inability to edit/delete creates a trust death spiral - if I can't fix my mistakes, I can't trust the system's calculations, so why use it at all?

---

### Technique 2: Value Proposition Canvas

#### CUSTOMER PROFILE (Right Side)

##### Customer Jobs

| Job Type   | Job Description                                                                           |
| ---------- | ----------------------------------------------------------------------------------------- |
| Functional | Set up portfolio allocation across asset classes                                          |
| Functional | Define investment strategy (% per asset class)                                            |
| Functional | Track and update portfolio over time                                                      |
| Functional | **Recalculate investments automatically** - no manual review of each asset's fundamentals |
| Functional | **Auto-discover replacement assets** when current ones lose fundamentals                  |
| Emotional  | Feel confident they're investing correctly                                                |
| Social     | Be able to recommend a good tool to others                                                |

##### Customer Pains

| #   | Pain                                               | Severity     |
| --- | -------------------------------------------------- | ------------ |
| 1   | Can't reach 100% allocation without manual math    | High         |
| 2   | No visual feedback on distribution                 | High         |
| 3   | Cannot edit/delete portfolios                      | **Critical** |
| 4   | Can't set market/asset type filters per portfolio  | Medium       |
| 5   | Stale data after refresh                           | High         |
| 6   | Feels harder than Excel                            | High         |
| 7   | No autocomplete help from previously stored data   | Medium       |
| 8   | Missing i18n validations (decimal: point vs comma) | High         |

##### Customer Gains

| Gain                                        |
| ------------------------------------------- |
| Confidence during setup                     |
| Visual progress/feedback                    |
| Trust in platform calculations              |
| Pride to recommend                          |
| Simpler than spreadsheets                   |
| Automated portfolio rebalancing suggestions |
| Regional preferences respected              |

---

#### VALUE MAP (Left Side)

##### Products & Services

| Feature Area      | Description                                     |
| ----------------- | ----------------------------------------------- |
| Strategy Builder  | Visual allocation setup with real-time feedback |
| Portfolio Manager | Full CRUD operations on portfolios              |
| Data Integration  | API-powered asset data (Gemini integration)     |
| Smart Suggestions | AI-driven asset replacement recommendations     |
| Regional Settings | i18n support for number formats                 |

##### Pain Relievers

| Pain                                  | Pain Reliever Solution                                                                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#1** Can't reach 100% allocation    | Show **live sum of allocation %** on strategy page with "X% remaining" indicator                                                                                                                               |
| **#2** No visual feedback             | Add **pie chart** on strategy page showing asset class distribution                                                                                                                                            |
| **#3** Cannot edit/delete portfolios  | Implement **full edit/delete functionality** for portfolios                                                                                                                                                    |
| **#4** Can't set market/asset filters | Add **business market** and **asset type** fields to portfolio create/edit forms                                                                                                                               |
| **#5** Stale data after refresh       | **Two-tier refresh architecture:** (1) Scheduled job fetches from APIs (Gemini) → caches in DB, (2) User refresh pulls from cache → triggers portfolio recalculation                                           |
| **#6** Feels harder than Excel        | Above improvements collectively make platform **more helpful than Excel**                                                                                                                                      |
| **#7** No autocomplete                | Implement **autocomplete** for: asset symbol/name (from API + cache), asset types (predefined only), business market (predefined only). Accept user input for API-fetched fields even if not previously stored |
| **#8** Missing i18n validations       | Add **regional settings** in account creation + settings menu. Implement **locale-aware form validation** (point vs comma decimal separator)                                                                   |

##### Gain Creators

| Gain                   | Gain Creator Solution                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| **Confidence**         | Real-time validation + visual feedback = "I know I'm doing it right"              |
| **Visual progress**    | Pie chart + % remaining = instant understanding                                   |
| **Trust**              | Edit/delete + accurate data = "I can fix mistakes, I trust calculations"          |
| **Recommend**          | Smooth UX = "This platform helps me, try it!"                                     |
| **Simpler than Excel** | Autocomplete + auto-calculations + visualizations = clear value over spreadsheets |
| **Automated help**     | Scheduled data refresh + AI suggestions = "Platform works for me"                 |
| **Regional respect**   | i18n settings = "Platform understands my locale"                                  |

---

#### FIT ANALYSIS

| Fit Status               | Assessment                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **Problem-Solution Fit** | Strong - clear mapping from each pain to a specific solution                                  |
| **Highest Priority**     | Edit/delete portfolios (trust), Visual feedback (confidence), i18n validation (accessibility) |
| **Quick Wins**           | Allocation sum display, Pie chart, Autocomplete                                               |
| **Architecture Changes** | Two-tier refresh system, Regional settings infrastructure                                     |

**Key VPC Insight:** The two-tier refresh architecture (scheduled API fetch → cache → user refresh) is an architectural decision that solves multiple problems: stale data, performance, and enables future AI-powered suggestions

---

### Technique 3: Crazy 8's

**Focus Question:** "How might we make portfolio and strategy setup so intuitive that users feel confident in under 2 minutes?"

#### The 8 Ideas

| #   | Idea                                                                                                                                  | Category           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | **Wizard-style guided setup** with progress bar                                                                                       | Onboarding UX      |
| 2   | **Import portfolio from brokerage API** automatically                                                                                 | Integration        |
| 3   | **Import portfolio from brokerage statements** (PDF/CSV)                                                                              | Integration        |
| 4   | **Multi-channel reminders** (SMS, email, WhatsApp, Telegram) when it's time to invest                                                 | Engagement         |
| 5   | **Profile area** for users to upload/update photo                                                                                     | Personalization    |
| 6   | **Collapsible hamburger menu** - shrink to icons only for more data viewing space                                                     | UX Layout          |
| 7   | **Social login integration** (Google) - auto-import profile photo, email, name                                                        | Onboarding         |
| 8   | **Two analytics reports:** (1) Portfolio growth history (up to 5 years), (2) Important dates for bond maturities to plan reinvestment | Analytics/Planning |

---

#### Idea Clustering

**🚀 Onboarding & Setup**

- Wizard-style guided setup with progress bar
- Import from brokerage API
- Import from brokerage statements
- Social login with profile auto-import

**📊 Analytics & Planning**

- Portfolio growth history report (5 years)
- Bond maturity dates report for reinvestment planning

**💬 Engagement & Retention**

- Multi-channel investment reminders (SMS, email, WhatsApp, Telegram)

**🎨 UX Improvements**

- Collapsible hamburger menu for more data space
- Profile area with photo upload

---

**Key Crazy 8's Insight:** Strong cluster around **reducing manual data entry** (wizard, API import, statement import, social login). The bond maturity report is a unique differentiator - helps users plan ahead rather than just react

---

### Technique 4: Event Storming

#### Flow 1: Strategy Setup

```
Timeline ────────────────────────────────────────────────────────────────►

🔵 Open Strategy    🔵 Select Asset    🔵 Enter %    🔵 Add More    🔵 Navigate Away
       │                  │                │              │               │
       ▼                  ▼                ▼              ▼               ▼
🟠 Page Opened    🟠 Class Selected   🟠 % Entered   🟠 Classes    🟠 User Left
   (empty form)                                         Added           Page
       │                                   │                             │
       ▼                                   ▼                             ▼
   🔴 No guidance                    🔴 No running                 🔴 No validation
   on how to start                   total shown                   on exit!
                                     🔴 No pie chart
```

**Hot Spots Identified:**

| Hot Spot                  | Impact                                       | Missing Policy                                           |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| No guidance on empty form | Confusion at start                           | "Show onboarding tips for first-time users"              |
| No running total of %     | Mental math required                         | "Display live sum of allocations"                        |
| No pie chart preview      | No visual feedback                           | "Show pie chart updating in real-time"                   |
| No validation on exit     | User leaves with incomplete/invalid strategy | "When allocation ≠ 100%, show warning before navigation" |
| Silent fail               | User doesn't know if strategy is valid       | "Validate and show clear status indicator"               |

---

#### Flow 2: Portfolio Setup

```
Timeline ────────────────────────────────────────────────────────────────►

🔵 Create Portfolio    🟠 Mistake Realized    🔵 Try Edit    🔵 Try Delete
       │                      │                    │               │
       ▼                      ▼                    ▼               ▼
🟠 Portfolio Created    😱 "Oh no..."        🔴 NO OPTION    🔴 NO OPTION
                              │                    │               │
                              ▼                    ▼               ▼
                    ┌─────────┴─────────┐    💀 DEAD END    💀 DEAD END
                    ▼                   ▼
            🟠 User Abandons    🟠 Creates Duplicate
                    │                   │
                    ▼                   ▼
            🔴 CHURN            🔴 POLLUTED DATA
            Lost forever        • Wrong calcs
                                • Bad recommendations
                                • Trust erosion
                                • Eventually churns
```

**The Trust Death Spiral:**

```
Mistake → Can't fix → Bad data → Wrong recommendations → "I can't trust this" → Abandon → Negative review
```

**Hot Spots Identified:**

| Hot Spot             | Impact                   | Missing Policy                                        |
| -------------------- | ------------------------ | ----------------------------------------------------- |
| No edit capability   | User stuck with mistakes | "User CAN edit portfolio after creation"              |
| No delete capability | Bad data pollutes system | "User CAN delete portfolio (with confirmation)"       |
| No error recovery    | Forces workarounds       | "When portfolio deleted, recalculate recommendations" |
| Duplicates allowed   | Data integrity issues    | "Warn when similar portfolio name exists"             |

---

#### Combined Event Map - Ideal Flow (TO-BE)

```
STRATEGY FLOW (TO-BE):
🔵 Open → 🟠 Wizard Starts → 🔵 Select Class → 🟠 Pie Updates → 🔵 Enter % →
🟠 Running Total Shows → 🔵 Add More → 🟠 "15% remaining" → 🔵 Complete →
🟣 Validate 100% → 🟠 Strategy Saved ✅

PORTFOLIO FLOW (TO-BE):
🔵 Create → 🟠 Created → 🔵 Edit → 🟠 Updated → 🔵 Delete →
🟣 Confirm Dialog → 🟠 Deleted → 🟣 Recalculate Recommendations ✅
```

---

**Key Event Storming Insight:** Two critical "doom loops" identified: (1) Strategy setup allows silent incomplete states, (2) Portfolio has no error recovery path. Both lead to the same outcome: trust erosion → churn

## Idea Categorization

### Immediate Opportunities (Quick Wins)

_Ideas ready to implement now - Low effort, high impact, foundational fixes_

| #   | Idea                                                  | Rationale                         |
| --- | ----------------------------------------------------- | --------------------------------- |
| 1   | Live sum of allocation % with "X% remaining"          | Simple math + UI update           |
| 2   | Pie chart on strategy page                            | Standard chart component          |
| 3   | Edit/delete portfolio functionality                   | **Critical** - CRUD completion    |
| 4   | Business market & asset type fields per portfolio     | Form fields addition              |
| 6   | Autocomplete for asset symbols/names/types/markets    | UI enhancement with existing data |
| 15  | Collapsible hamburger menu                            | CSS/UI toggle                     |
| 19  | Onboarding tips for first-time users                  | Tooltips/popovers                 |
| 20  | Validation warning before leaving incomplete strategy | Form validation hook              |
| 21  | Status indicator showing strategy validity            | UI badge/indicator                |
| 22  | Confirmation dialog for portfolio deletion            | Modal component                   |
| 24  | Duplicate portfolio name warning                      | Simple validation check           |

**Theme:** Fix the foundation, build trust

### Future Innovations

_Ideas requiring development/research - Medium effort, requires design/architecture work_

| #   | Idea                                                     | Rationale                   |
| --- | -------------------------------------------------------- | --------------------------- |
| 5   | Two-tier refresh architecture (scheduled API → cache)    | Backend redesign needed     |
| 7   | Regional settings (i18n) with locale-aware validation    | Localization infrastructure |
| 10  | Wizard-style guided setup with progress bar              | New UX flow design          |
| 14  | Profile area with photo upload                           | Storage + UI work           |
| 16  | Social login (Google) with profile auto-import           | OAuth integration           |
| 17  | Portfolio growth history report (5 years)                | Data aggregation + charting |
| 18  | Bond maturity dates report                               | Data modeling + new feature |
| 23  | Auto-recalculate recommendations after portfolio changes | Backend trigger logic       |

**Theme:** Enhance experience, add intelligence

### Moonshots

_Ambitious, transformative concepts - High effort, differentiating features_

| #   | Idea                                                        | Rationale                    |
| --- | ----------------------------------------------------------- | ---------------------------- |
| 8   | Auto-recalculate investments (no manual fundamental review) | AI/automation engine         |
| 9   | Auto-discover replacement assets via AI                     | ML-powered recommendations   |
| 11  | Import portfolio from brokerage API                         | Third-party API integrations |
| 12  | Import portfolio from brokerage statements (PDF/CSV)        | Document parsing/OCR         |
| 13  | Multi-channel reminders (SMS, email, WhatsApp, Telegram)    | Multi-channel infrastructure |

**Theme:** Automation + seamless integrations

### Insights and Learnings

_Key realizations from the session_

#### Key Themes Identified

| Theme                            | Evidence                                                                        | Implication                             |
| -------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| **Trust is the Foundation**      | Edit/delete missing → polluted data → wrong recommendations → "why use this?"   | Must fix CRUD before adding features    |
| **Visual Feedback is Expected**  | Pie charts, progress bars, running totals - users expect these as standard      | Competitors have set the bar            |
| **Excel is the Benchmark**       | Users compare to spreadsheets - and spreadsheets are winning on simplicity      | Must clearly exceed Excel's value       |
| **Silent Failures Kill**         | No validation, no warnings, no status indicators → users don't know they failed | Every action needs clear feedback       |
| **Reduce Manual Entry**          | 4 of 8 Crazy 8's ideas focused on importing/auto-filling data                   | Users hate typing what exists elsewhere |
| **Internationalization Matters** | Decimal separators (point vs comma) blocking international users                | Global product needs global UX          |

#### Session Insights

1. **New features emerged** - Structured brainstorming surfaced ideas not previously considered (bond maturity reports, brokerage imports, multi-channel reminders)

2. **Trust Death Spiral identified** - The connection between "can't edit" → "bad data" → "wrong recommendations" → "abandon platform" was made explicit

3. **Excel as unexpected competitor** - Users aren't comparing to other investment platforms; they're comparing to spreadsheets

4. **Two doom loops discovered** - Strategy (silent incomplete) and Portfolio (no recovery) both lead to the same churn outcome

## Action Planning

### Top 3 Priority Ideas

#### 🥇 #1 Priority: Edit/Delete Portfolio Functionality

- **Rationale:** Core of the Trust Death Spiral. Without it: Mistake → Can't fix → Bad data → Wrong recommendations → Churn. Appeared as CRITICAL across all techniques.
- **Next steps:**
  1. Add edit button to portfolio list/detail views
  2. Create edit form (reuse create form logic)
  3. Add delete button with confirmation modal
  4. Trigger recommendation recalculation after changes
- **Resources needed:** Frontend + Backend development
- **Effort:** Quick Win

#### 🥈 #2 Priority: Strategy Visual Feedback (Pie Chart + Allocation Sum)

- **Rationale:** Addresses Silent Failure doom loop. Users expect this (competitors have it). Beats the Excel comparison.
- **Next steps:**
  1. Add running total showing "X% allocated, Y% remaining"
  2. Add pie chart component showing asset class distribution
  3. Update both in real-time as user enters data
  4. Add validation warning if user tries to leave with ≠ 100%
- **Resources needed:** Frontend development, chart library
- **Effort:** Quick Win

#### 🥉 #3 Priority: Regional Settings (i18n)

- **Rationale:** Blocking international users entirely. Decimal separator issue (point vs comma) causes form rejections. Required for international growth.
- **Next steps:**
  1. Add regional settings to account creation flow
  2. Add settings menu option to change locale
  3. Implement locale-aware number parsing in all forms
  4. Add format hints/examples in input fields
- **Resources needed:** Frontend + Backend, i18n infrastructure
- **Effort:** Medium

## Reflection and Follow-up

### What Worked Well

- **All 4 techniques were valuable** - each served a distinct purpose
- **Empathy Mapping** - went deep into user emotions and pain
- **Value Proposition Canvas** - mapped pains to specific solutions
- **Crazy 8's** - expanded thinking, surfaced new feature ideas
- **Event Storming** - visualized the "doom loops" causing churn

### Areas for Further Exploration

- Market research on competitor portfolio management features
- Deeper dive into brokerage API integration possibilities
- User research on regional/international user needs

### Recommended Follow-up Activities

1. **Market Research** - Analyze competitor offerings for visual feedback, portfolio management, and onboarding flows
2. **Update Product Brief** - Incorporate new features and priorities discovered in this session
3. **Technical Feasibility** - Assess effort for two-tier refresh architecture and brokerage integrations

### Questions That Emerged

- How do competitors handle the 100% allocation validation?
- What brokerage APIs are available for portfolio import?
- What's the international user breakdown by region/locale?
- How complex is OCR/parsing for brokerage statements?

### Next Session Planning

- **Suggested topics:** Market research findings review, Technical architecture for refresh system
- **Recommended workflow:** Research workflow → Product Brief update
- **Preparation needed:** Competitor analysis data, user analytics on international usage

---

_Session facilitated using the BMAD CIS brainstorming framework_
