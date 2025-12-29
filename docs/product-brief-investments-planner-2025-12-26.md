# Product Brief: investments-planner

**Date:** 2025-12-26
**Author:** Bmad
**Context:** Startup/Solopreneur Venture

---

## Executive Summary

**Investments Planner** is a portfolio planning and tracking tool designed for passive investors who want to visualize, manage, and optimize their long-term investment allocations without the complexity of active trading platforms.

The core insight driving this product: **Passive investors are comparing investment tools to Excel—and Excel is winning on simplicity.** Current platforms either overwhelm users with trading features they don't need, or lack the basic portfolio management capabilities (edit, delete, visualize) that build trust.

**Vision:** Create the most intuitive portfolio planning experience for passive investors—visually rich, globally accessible, and trustworthy enough that users confidently recommend it to friends.

**Target Market:** Gen Z and Millennial passive investors (37% of all investors) who prefer ETFs, index funds, and buy-and-hold strategies. Secondary focus on Gen X "Passive Preservers" frustrated with current tools.

**Market Opportunity:** $2.5-3.0B Serviceable Addressable Market in English + Portuguese-speaking markets, with no strong competitor combining visual pie allocation + international i18n + passive investor focus.

---

## Core Vision

### Problem Statement

Passive investors face a frustrating paradox: investment tools are either too complex (built for active traders) or too simple (lacking basic portfolio management). Current solutions fail them in three critical ways:

1. **No Error Recovery** - Users can't edit or delete portfolios, creating a "Trust Death Spiral" where mistakes lead to polluted data, wrong recommendations, and platform abandonment

2. **No Visual Feedback** - While competitors like M1 Finance show intuitive pie charts, many tools force users to do mental math to understand their allocations

3. **No International Support** - Decimal separator differences (point vs. comma) and regional number formats block international users entirely

The result: users compare these tools to Excel spreadsheets—and spreadsheets win on perceived simplicity.

### Problem Impact

**User Impact:**

- 74% of users expect clear portfolio visualization (2025 Tink research)
- 55% of users abandon apps they don't understand how to use (Forrester)
- Users with "Passive Preserver" profile (Gen X) are most frustrated with lack of customization

**Business Impact:**

- Trust erosion leads to churn and negative word-of-mouth
- International growth blocked by i18n issues
- Users revert to spreadsheets, reducing lifetime value

### Why Existing Solutions Fall Short

| Competitor     | Strength                          | Gap                               |
| -------------- | --------------------------------- | --------------------------------- |
| **M1 Finance** | Gold-standard "Pie" visualization | US-only, no international support |
| **Empower**    | Great portfolio tracking          | View-only, no active planning     |
| **Sharesight** | 100+ currencies, international    | Expensive, complex for beginners  |
| **Kubera**     | Multi-currency, expat-friendly    | $249/year pricing                 |

**Market Gap:** No strong player combines:

- Visual pie-based allocation (like M1 Finance)
- International i18n support (like Sharesight)
- Free/low-cost for passive investors (like Empower)
- Active portfolio planning (not just tracking)

### Proposed Solution

**Investments Planner** delivers the portfolio planning experience passive investors deserve:

1. **Visual-First Design**
   - M1-style pie chart showing allocation at a glance
   - Real-time "X% allocated, Y% remaining" display
   - 100% allocation validation before save

2. **Trust Through Control**
   - Full CRUD: create, read, update, delete portfolios
   - Confirmation dialogs prevent accidents
   - Recommendations recalculate after changes

3. **Global Accessibility**
   - Regional number format support (decimal: point vs comma)
   - i18n infrastructure for future translations
   - Multi-currency tracking (roadmap)

4. **Passive Investor Focus**
   - Designed for monthly check-ins, not daily trading
   - Strategy templates and allocation guidance
   - Bond maturity tracking for income seekers

### Key Differentiators

1. **Visual Pie Allocation + i18n** - First tool to combine M1's intuitive visuals with international support
2. **Trust Death Spiral Solved** - Full edit/delete with smart recalculation
3. **Passive-First Design** - No noise from trading features
4. **Excel Replacement** - Clearly exceeds spreadsheet value through automation and visualization

---

## Target Users

### Primary Users

**The Young Index Investor** (Gen Z / Millennial, 20-40)

**Profile:**

- Building passive income through ETFs and index funds
- Started investing at age 20 (Gen Z average)
- Mobile-first, app-native
- Top goal: Building passive income (40-43% of this cohort)
- 41% comfortable with AI managing portfolios

**Current Behavior:**

- Uses brokerage apps and robo-advisors
- Prefers "set and forget" strategies
- Values: Simplicity, low fees, transparency
- Frustrated by: Complex interfaces, lack of educational content

**Jobs to be Done:**

- Set up portfolio allocation across asset classes
- Define and stick to an investment strategy
- Track progress toward financial goals
- Feel confident they're "doing it right"

**Quote:** _"Time in the market beats timing the market"_ (89% believe this)

### Secondary Users

**The Passive Preserver** (Gen X, 40-55)

**Profile:**

- Moderate experience, some investments but not sophisticated
- Primary focus: Family and financial security
- Prefers preserving wealth over aggressive growth
- Most stressed about investments, least happy with current advisors

**Current Behavior:**

- Accumulates wealth through consistent, small gains
- Dislikes complexity and frequent changes
- Long, steady employment history

**Jobs to be Done:**

- Simple, clear portfolio view
- Minimal required actions
- Reassurance that strategy is working
- Easy progress tracking toward retirement

### User Journey

```
Awareness → Download → Onboarding → Portfolio Setup → Daily Use → Retention
               ↓           ↓              ↓             ↓           ↓
              Easy      🔴 PAIN        🔴 PAIN         OK       🔴 CHURN
             (free)    (complex)    (no guidance)           (trust lost)
```

**Key Drop-off Points (Current):**

1. **Onboarding** - Apps treat all users the same regardless of experience
2. **Portfolio Setup** - No visual feedback, no validation
3. **Retention** - Can't edit/delete mistakes → trust erosion → churn

**Solution Focus:** Fix steps 2 and 3 immediately, improve step 1 with wizard onboarding

---

## Success Metrics

### Core Metrics

| Metric                        | Target          | Rationale                                  |
| ----------------------------- | --------------- | ------------------------------------------ |
| **Portfolio Completion Rate** | 85%+            | Users finish setting up without abandoning |
| **Edit/Delete Usage**         | <10% within 24h | Low early edits = good UX; some expected   |
| **7-Day Retention**           | 60%+            | Users return within first week             |
| **30-Day Retention**          | 40%+            | Active engagement continues                |
| **NPS Score**                 | 40+             | Users willing to recommend                 |

### Business Objectives

1. **User Acquisition:** Grow to 10,000 active users in first year
2. **Retention:** Achieve 40%+ 30-day retention
3. **Satisfaction:** Maintain NPS > 40
4. **Growth:** Word-of-mouth referrals as primary acquisition channel

### Key Performance Indicators

| KPI                       | Measurement                             |
| ------------------------- | --------------------------------------- |
| **Activation Rate**       | % of signups who create first portfolio |
| **Allocation Completion** | % of strategies that reach 100%         |
| **International Usage**   | % of users with non-US locale settings  |
| **Feature Adoption**      | % using pie chart, edit/delete          |

---

## MVP Scope

### Core Features

**Critical (Must Have for Launch):**

| Feature                     | Description                                           | Priority |
| --------------------------- | ----------------------------------------------------- | -------- |
| **Edit Portfolio**          | Full editing of portfolio name, holdings, allocations | P1       |
| **Delete Portfolio**        | Remove portfolio with confirmation dialog             | P1       |
| **Pie Chart Visualization** | Real-time allocation pie chart on strategy page       | P1       |
| **Allocation Sum Display**  | Live "X% allocated, Y% remaining" indicator           | P1       |
| **100% Validation**         | Enforce total allocation = 100% before save           | P1       |
| **Regional Number Format**  | Support decimal point vs comma by locale              | P2       |
| **Validation Warnings**     | Alert when leaving with incomplete strategy           | P2       |

**Important (Should Have):**

| Feature                | Description                              | Priority |
| ---------------------- | ---------------------------------------- | -------- |
| **Autocomplete**       | Asset symbol/name suggestions            | P2       |
| **Onboarding Tips**    | First-time user guidance tooltips        | P2       |
| **Duplicate Warnings** | Alert when similar portfolio name exists | P2       |

### Out of Scope for MVP

| Feature                    | Reason                                           | Timing  |
| -------------------------- | ------------------------------------------------ | ------- |
| Brokerage API Import       | Complex integration, not critical for core value | Phase 2 |
| Statement Import (PDF/CSV) | Document parsing complexity                      | Phase 2 |
| Multi-channel Reminders    | Requires notification infrastructure             | Phase 2 |
| AI Asset Recommendations   | Advanced ML feature                              | Phase 3 |
| Social Login               | Nice-to-have, not blocking                       | Phase 2 |

### MVP Success Criteria

1. **Trust Restored:** Users can edit/delete portfolios without friction
2. **Visual Clarity:** Pie chart and allocation % visible on strategy page
3. **International Ready:** Number format respects user locale
4. **Validation Complete:** No silent failures; clear feedback on all actions

### Future Vision

**Phase 2: Enhanced Experience**

- Wizard-style guided onboarding with progress bar
- Social login (Google) with profile auto-import
- Collapsible hamburger menu for more data space
- Portfolio growth history report (5 years)

**Phase 3: Intelligence**

- Bond maturity dates report for reinvestment planning
- Two-tier refresh architecture (scheduled API → cache)
- AI-powered asset replacement suggestions
- Brokerage API integrations

**Phase 4: Scale**

- Multi-channel reminders (SMS, email, WhatsApp, Telegram)
- Statement import (PDF/CSV parsing)
- Full multi-currency support
- Family/household accounts

---

## Market Context

### Market Size

| Metric                        | Value            | Growth    |
| ----------------------------- | ---------------- | --------- |
| **Personal Finance Software** | $1.5-1.9B (2025) | 6-9% CAGR |
| **Robo Advisory Market**      | $10.9B (2025)    | ~30% CAGR |
| **Investment Apps Market**    | $14.6B (2023)    | 9.9% CAGR |

### Target Market (TAM/SAM/SOM)

| Level   | Value     | Calculation                                          |
| ------- | --------- | ---------------------------------------------------- |
| **TAM** | $14-15B   | Global investment apps market                        |
| **SAM** | $2.5-3.0B | Passive investors, B2C, English + Portuguese markets |
| **SOM** | $25-60M   | 1-2% realistic market capture                        |

### Competitive Positioning

```
                    High Visual Feedback
                          │
                          │   ★ M1 Finance
                          │   (Pie investing)
                          │
                Empower ★ │
                          │
 Simple ──────────────────┼────────────────── Advanced
                          │
                          │ ★ INVESTMENTS PLANNER
                          │   (Target Position)
          Portseido ★     │        ★ Kubera
                          │        (Multi-currency)
                          │
                Ziggma ★  │   ★ Sharesight
                          │   (International)
                          │
                    Low Visual Feedback
```

**Strategic Position:** High visual feedback + Simple UX + International support

---

## Technical Preferences

### Current Stack (Validated)

| Layer               | Technology               | Status                 |
| ------------------- | ------------------------ | ---------------------- |
| **Framework**       | Next.js 16, React 19     | ✅ Cutting edge        |
| **Database**        | PostgreSQL + Drizzle ORM | ✅ Type-safe           |
| **Styling**         | Tailwind CSS 4           | ✅ Modern              |
| **Charts**          | Recharts 3.5.1           | ✅ Already installed   |
| **Forms**           | react-hook-form + Zod    | ✅ Validation ready    |
| **Background Jobs** | Inngest                  | ✅ Serverless-friendly |
| **Caching**         | Vercel KV                | ✅ Edge caching        |

### Implementation Notes

- **Pie Chart:** Recharts already installed—no new dependencies needed
- **i18n:** Recommend adding `next-intl` for App Router + smaller bundle
- **Number Format:** Use built-in `Intl.NumberFormat` for regional decimals
- **Market Data:** Start with Alpha Vantage (free tier), scale to Finnhub

---

## Risks and Assumptions

### Key Assumptions

1. **Passive investors want active planning, not just tracking** - Validated by brainstorming and user research
2. **Visual feedback (pie charts) is expected, not optional** - Validated by competitive analysis (all competitors have it)
3. **International users are blocked by i18n issues** - Assumed based on decimal separator problem identified
4. **Edit/delete is table stakes** - Validated: ALL competitors have full CRUD

### Key Risks

| Risk                                   | Impact               | Mitigation                                        |
| -------------------------------------- | -------------------- | ------------------------------------------------- |
| **User adoption slower than expected** | Revenue delay        | Focus on word-of-mouth from delighted early users |
| **Competitors add i18n before us**     | Differentiation lost | Prioritize i18n in P2, not P3                     |
| **Technical debt from rapid MVP**      | Maintenance burden   | Follow existing test patterns, maintain coverage  |
| **Market data API costs scale poorly** | Margin compression   | Two-tier caching architecture reduces API calls   |

### Open Questions

1. What's the actual international user breakdown by region/locale?
2. Which brokerage APIs are most feasible for Phase 2 import?
3. How complex is PDF statement parsing for Phase 3?

---

## Supporting Materials

### Research Conducted (2025-12-26)

| Research Type   | Key Finding                                                      | File                                 |
| --------------- | ---------------------------------------------------------------- | ------------------------------------ |
| **Competitive** | M1 Finance "Pie" is gold standard; all have CRUD                 | `research-competitive-2025-12-26.md` |
| **Market**      | $2.5-3B SAM; Gen Z/Millennials are 37% of investors              | `research-market-2025-12-26.md`      |
| **User**        | 3 personas validated; 71% prefer passive investing               | `research-user-2025-12-26.md`        |
| **Domain**      | Portfolio tracker avoids SEC registration; GDPR applies globally | `research-domain-2025-12-26.md`      |
| **Technical**   | Recharts installed; react-hook-form ready; add next-intl         | `research-technical-2025-12-26.md`   |

### Brainstorming Session (2025-12-26)

- **24 ideas generated** using Empathy Mapping, Value Proposition Canvas, Crazy 8's, Event Storming
- **Trust Death Spiral identified:** Mistake → Can't fix → Bad data → Wrong recommendations → Churn
- **Top 3 priorities:** Edit/Delete, Pie Chart + Allocation %, i18n
- File: `brainstorming-session-results-2025-12-26.md`

---

_This Product Brief captures the vision and requirements for investments-planner._

_It was created through collaborative discovery and reflects the unique needs of this startup/solopreneur project._

_Next: The PRD workflow will transform this brief into detailed product requirements._
