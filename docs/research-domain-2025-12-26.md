# Domain Research Report: Investment Planning Domain

**Date:** 2025-12-26
**Prepared by:** Bmad
**Research Depth:** Domain Research Focus

---

## Executive Summary

This domain research establishes the foundational terminology, concepts, regulatory landscape, and data sources relevant to building a portfolio planning tool for passive investors. Understanding these domain specifics is critical for designing intuitive UX, compliant systems, and accurate data representations.

### Key Domain Insights

1. **Passive Investing Dominance** - 63% of US investors plan to buy ETFs in next 12 months
2. **Portfolio Tracker ≠ Investment Advisor** - Critical legal distinction that avoids SEC/FINRA registration
3. **Cost Basis vs. Average Price** - Different concepts users often confuse; we need to clarify in UI
4. **GDPR Applies Globally** - Any app with EU users must comply, regardless of company location
5. **Free Data APIs Available** - Alpha Vantage, Finnhub, Twelve Data offer free tiers for market data

---

## 1. Investment Product Taxonomy

### Asset Class Hierarchy

A well-structured portfolio planner should support these asset classes:

| Level 1 (Asset Class) | Level 2 (Category)   | Level 3 (Subcategory)                    |
| --------------------- | -------------------- | ---------------------------------------- |
| **Equities**          | Domestic Stocks      | Large-cap, Mid-cap, Small-cap            |
|                       | International Stocks | Developed Markets, Emerging Markets      |
|                       | Stock ETFs           | Total Market, Sector, Thematic (AI, ESG) |
| **Fixed Income**      | Government Bonds     | Treasury, Municipal, TIPS                |
|                       | Corporate Bonds      | Investment-grade, High-yield             |
|                       | Bond ETFs            | Total Bond Market, Short/Long Duration   |
| **Real Estate**       | REITs                | Equity REITs, Mortgage REITs             |
| **Cash**              | Money Market         | Savings, CDs, T-Bills                    |
| **Alternatives**      | Commodities          | Gold, Oil, Agriculture                   |
|                       | Crypto               | Bitcoin, Ethereum, Stablecoins           |

**Sources:** [Investor.gov](https://www.investor.gov/introduction-investing/investing-basics/glossary/passive-fund-passively-managed-fund), [Bankrate](https://www.bankrate.com/investing/top-etf-categories-to-watch/), [Morningstar](https://www.morningstar.com/funds/top-high-dividend-etfs-passive-income-2025)

### ETF Categories (2025 Trends)

| Category            | Description                | Example Tickers |
| ------------------- | -------------------------- | --------------- |
| **Total Market**    | Broad US/global exposure   | VTI, VXUS       |
| **Dividend/Income** | High-yield, monthly payers | SCHD, JEPI      |
| **Bond ETFs**       | Fixed income exposure      | BND, AGG        |
| **Thematic (AI)**   | Sector-specific trends     | BOTZ, AIQ       |
| **ESG**             | Sustainable investing      | ESGU, SUSL      |

**2025 Trend:** About 63% of US investors plan to buy ETFs in the next 12 months, up from 37% in Q4 2022 (State Street Global Advisors).

---

## 2. Passive Investing Terminology

### Core Concepts Users Must Understand

| Term                  | Definition                                        | UX Implication                                    |
| --------------------- | ------------------------------------------------- | ------------------------------------------------- |
| **Passive Investing** | Buy-and-hold strategy to match market performance | Design for infrequent actions, long-term tracking |
| **Index Fund**        | Fund tracking a benchmark index (S&P 500, etc.)   | Show benchmark comparison                         |
| **ETF**               | Exchange-traded fund (trades like stock)          | Support real-time quotes                          |
| **Expense Ratio**     | Annual fee as % of investment                     | Display clearly in fund details                   |
| **Dividend**          | Company payment to shareholders                   | Track dividend income                             |
| **Dividend Yield**    | Annual dividend / stock price as %                | Show in holdings view                             |

**Sources:** [FINRA](https://www.finra.org/investors/insights/active-passive-investing), [CFA Institute](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2024/passive-equity-investing)

### Gain/Loss Terminology

| Term                     | Definition                                            | Formula                     |
| ------------------------ | ----------------------------------------------------- | --------------------------- |
| **Cost Basis**           | Original purchase price + reinvested dividends + fees | Sum of all purchase amounts |
| **Average Cost**         | Mean price paid across all purchases                  | Total Cost / Total Shares   |
| **Unrealized Gain/Loss** | "Paper" profit/loss (not yet sold)                    | Current Value - Cost Basis  |
| **Realized Gain/Loss**   | Actual profit/loss when sold                          | Sale Price - Cost Basis     |

**Key Distinction:** Cost basis is for tax purposes; average price is just for buys.

**UX Recommendation:** Show both "Your Cost" (average price) and "Total Gain/Loss" (unrealized) clearly. Users often confuse these.

**Sources:** [Motley Fool - Unrealized Gains](https://www.fool.com/investing/how-to-calculate/unrealized-gain-and-loss-of-investment-assets/), [Fidelity](https://www.fidelity.com/webxpress/help/topics/learn_realized_gain_loss.shtml), [Public.com](https://help.public.com/en/articles/8417564-how-is-average-price-calculated)

### Rebalancing Terminology

| Term                  | Definition                           | Industry Standard        |
| --------------------- | ------------------------------------ | ------------------------ |
| **Target Allocation** | Desired % for each asset class       | Must sum to 100%         |
| **Actual Allocation** | Current % based on market values     | Changes with market      |
| **Drift**             | Difference between target and actual | Track over time          |
| **Rebalancing**       | Buying/selling to restore targets    | Annually or at 5% drift  |
| **Tolerance Band**    | Acceptable drift range               | 5% fixed or 20% relative |

**Best Practice:** Vanguard recommends annual rebalancing or when drift exceeds 5%.

**Sources:** [Passiv](https://passiv.com/blog/guide-to-portfolio-rebalancing/), [T. Rowe Price](https://www.troweprice.com/personal-investing/resources/insights/whats-the-best-approach-for-portfolio-rebalancing.html), [Kubera](https://www.kubera.com/blog/active-portfolio-rebalancing-pros-cons)

---

## 3. Asset Allocation Rules

### Age-Based Allocation Rules

| Rule            | Formula             | Example (Age 30)      |
| --------------- | ------------------- | --------------------- |
| **Rule of 100** | 100 - Age = Stock % | 70% stocks, 30% bonds |
| **Rule of 110** | 110 - Age = Stock % | 80% stocks, 20% bonds |
| **Rule of 120** | 120 - Age = Stock % | 90% stocks, 10% bonds |

**Modern Recommendation:** Rule of 110 or 120 reflects longer life expectancy.

### Diversification Guidelines

| Diversification Type     | Recommendation                 |
| ------------------------ | ------------------------------ |
| **International Stocks** | 10-25% of stock allocation     |
| **REITs**                | 5-10% of total portfolio       |
| **Bonds**                | Age-based (see rules above)    |
| **Single Stock Limit**   | No more than 5% in one stock   |
| **Sector Limit**         | No more than 25% in one sector |

### Rebalancing Triggers

| Method              | Trigger                         | Pros/Cons                          |
| ------------------- | ------------------------------- | ---------------------------------- |
| **Calendar-Based**  | Every 6-12 months               | Simple but may miss drift          |
| **Threshold-Based** | When drift > 5%                 | Responsive but requires monitoring |
| **Hybrid**          | Check monthly, act at threshold | Best of both worlds                |

**Sources:** [SEC/Investor.gov](https://www.investor.gov/additional-resources/general-resources/publications-research/info-sheets/beginners-guide-asset), [FINRA](https://www.finra.org/investors/investing/investing-basics/asset-allocation-diversification), [Vanguard](https://investor.vanguard.com/investor-resources-education/portfolio-management/diversifying-your-portfolio)

---

## 4. Regulatory Landscape

### Critical Distinction: Tracker vs. Advisor

| Type                   | Definition                                 | Regulatory Status       |
| ---------------------- | ------------------------------------------ | ----------------------- |
| **Portfolio Tracker**  | Displays/aggregates data only              | Generally NOT regulated |
| **Robo-Advisor**       | Provides investment advice, manages assets | SEC/FINRA regulated     |
| **Investment Advisor** | Human-provided investment advice           | SEC/State registered    |

**Key Insight:** Portfolio trackers avoid SEC/FINRA registration because they **only show data** and do NOT:

- Provide personalized investment advice
- Make buy/sell recommendations
- Manage or execute trades
- Charge based on AUM

**Important:** If Investments Planner adds "smart recommendations" or "suggested allocations," it may trigger advisor registration requirements.

### GDPR Requirements (EU Users)

| Requirement                  | Description                               | Implementation                 |
| ---------------------------- | ----------------------------------------- | ------------------------------ |
| **Lawful Basis**             | Need consent or contract basis            | Consent flow on signup         |
| **Data Subject Rights**      | Right to access, delete, port data        | Export/delete account features |
| **Privacy Policy**           | Clear disclosure of data use              | Comprehensive privacy page     |
| **Data Breach Notification** | 72-hour notification requirement          | Incident response plan         |
| **Cross-Border Transfers**   | Standard Contractual Clauses if US-hosted | SCC or EU hosting              |

**Penalties:** Up to €20 million or 4% of annual global turnover.

**Key Insight:** GDPR applies to ANY app with EU users, regardless of company location.

**2025 Update:** EU Financial Data Access (FIDA) framework expected 2025-2027, will require data sharing between financial services.

**Sources:** [GDPR Local](https://gdprlocal.com/gdpr-for-financial-institutions/), [InnReg](https://www.innreg.com/blog/gdpr-for-financial-services), [Cookie Script - FIDA](https://cookie-script.com/privacy-laws/financial-data-access-framework-fida)

### US Privacy Considerations

| Regulation     | Scope                  | Key Requirements                      |
| -------------- | ---------------------- | ------------------------------------- |
| **CCPA/CPRA**  | California residents   | Opt-out of data sale, deletion rights |
| **GLBA**       | Financial institutions | Privacy notices, data safeguards      |
| **State Laws** | Varies by state        | Check Colorado, Virginia, etc.        |

---

## 5. Market Data Sources

### Free/Freemium API Providers

| Provider                                                         | Free Tier     | Key Features                           | Best For            |
| ---------------------------------------------------------------- | ------------- | -------------------------------------- | ------------------- |
| **[Alpha Vantage](https://www.alphavantage.co/)**                | 25 calls/day  | Real-time + historical, 50+ indicators | General use         |
| **[Finnhub](https://finnhub.io/)**                               | 60 calls/min  | Real-time, fundamentals, alt data      | Comprehensive data  |
| **[Twelve Data](https://twelvedata.com/)**                       | 800 calls/day | Low latency (170ms), WebSocket         | Real-time streaming |
| **[Marketstack](https://marketstack.com/)**                      | 100 calls/mo  | 30,000+ tickers, 15yr history          | Historical data     |
| **[Polygon.io](https://polygon.io/)**                            | Free tier     | Real-time WebSocket, REST API          | Real-time feeds     |
| **[EODHD](https://eodhd.com/financial-apis/)**                   | Limited free  | EOD + tick data                        | End-of-day data     |
| **[FMP](https://site.financialmodelingprep.com/developer/docs)** | Limited free  | Financial statements, quotes           | Fundamentals        |

### Data Considerations

| Factor             | Consideration                                        |
| ------------------ | ---------------------------------------------------- |
| **Rate Limits**    | Free tiers have daily/minute limits                  |
| **Delayed Quotes** | Free often = 15-min delay (OK for passive investors) |
| **Coverage**       | Check international exchange coverage                |
| **Caching**        | Cache aggressively to reduce API calls               |
| **Fallback**       | Have backup provider for reliability                 |

**Recommendation for Investments Planner:**

1. **Primary:** Alpha Vantage or Finnhub (good free tiers)
2. **Backup:** Twelve Data or Polygon.io
3. **Caching:** 15-minute cache is fine for passive investors

---

## 6. Financial Literacy Considerations

### User Knowledge Gaps

Research shows American investors often lack understanding of:

| Concept                   | % Who Understand | UX Implication                   |
| ------------------------- | ---------------- | -------------------------------- |
| **Inflation**             | ~50%             | Explain real vs. nominal returns |
| **Bond Prices vs. Rates** | ~35%             | Provide educational tooltips     |
| **Risk/Return Tradeoff**  | ~60%             | Visual risk indicators           |
| **Diversification Value** | ~55%             | Show diversification score       |
| **Compound Interest**     | ~45%             | Growth projections               |

**Sources:** [SEC/Investor.gov - Financial Literacy Study](https://www.sec.gov/files/917-financial-literacy-study-part1.pdf), [SoFi](https://www.sofi.com/learn/content/key-terms-to-improve-your-financial-literacy/)

### Educational Content Strategy

| User Level       | Content Type                 | Examples                        |
| ---------------- | ---------------------------- | ------------------------------- |
| **Beginner**     | Tooltips, inline definitions | "What is an ETF?" popup         |
| **Intermediate** | Optional deep-dives          | "How rebalancing works" article |
| **Advanced**     | Skip or minimize             | Show advanced metrics directly  |

**Key Insight from User Research:** Apps that treat all users the same have high drop-off. Personalized education based on experience level is critical.

---

## 7. Domain-Specific UX Patterns

### Number/Currency Display Standards

| Region        | Decimal      | Thousands    | Currency    |
| ------------- | ------------ | ------------ | ----------- |
| **US**        | `.` (period) | `,` (comma)  | $1,234.56   |
| **EU (most)** | `,` (comma)  | `.` (period) | 1.234,56 €  |
| **UK**        | `.` (period) | `,` (comma)  | £1,234.56   |
| **Brazil**    | `,` (comma)  | `.` (period) | R$ 1.234,56 |

**Critical for i18n:** Must support regional number formatting (validated in brainstorming).

### Standard Investment UI Patterns

| Pattern              | Description                    | Example                        |
| -------------------- | ------------------------------ | ------------------------------ |
| **Pie Chart**        | Allocation visualization       | M1 Finance's signature "Pie"   |
| **Allocation %**     | Running total that must = 100% | "75% allocated, 25% remaining" |
| **Gain/Loss Color**  | Green = gain, Red = loss       | Universal convention           |
| **Sparkline**        | Mini price chart               | Shows trend at a glance        |
| **Delta Indicators** | ▲ +2.5% or ▼ -1.2%             | Show change direction          |

---

## 8. Strategic Implications for Investments Planner

### Domain Requirements Validated

| Requirement                      | Domain Validation          | Priority |
| -------------------------------- | -------------------------- | -------- |
| **Asset Class Taxonomy**         | Standard hierarchy exists  | P1       |
| **Allocation = 100% Validation** | Industry standard (M1)     | P1       |
| **Unrealized Gain/Loss Display** | Core user expectation      | P1       |
| **Regional Number Format**       | i18n requirement validated | P2       |
| **Educational Tooltips**         | Literacy gaps documented   | P2       |
| **Rebalancing Alerts**           | 5% threshold is standard   | P3       |

### Regulatory Safe Harbor

To remain a "portfolio tracker" (not investment advisor):

1. **DO:** Display data, track holdings, show allocation
2. **DO:** Let users set their own targets
3. **DON'T:** Recommend specific investments
4. **DON'T:** Auto-rebalance or execute trades
5. **DON'T:** Provide personalized investment advice

### Data Strategy

| Phase      | Data Source          | Features                 |
| ---------- | -------------------- | ------------------------ |
| **MVP**    | Alpha Vantage (free) | EOD prices, basic quotes |
| **Growth** | Finnhub or Polygon   | Real-time, fundamentals  |
| **Scale**  | Premium provider     | Full market coverage     |

---

## References and Sources

### Investment Education

- [Investor.gov - Passive Funds](https://www.investor.gov/introduction-investing/investing-basics/glossary/passive-fund-passively-managed-fund)
- [FINRA - Active vs Passive Investing](https://www.finra.org/investors/insights/active-passive-investing)
- [SEC - Asset Allocation Guide](https://www.sec.gov/about/reports-publications/investorpubsassetallocationhtm)
- [Vanguard - Diversification](https://investor.vanguard.com/investor-resources-education/portfolio-management/diversifying-your-portfolio)

### Rebalancing & Strategy

- [Passiv - Portfolio Rebalancing Guide](https://passiv.com/blog/guide-to-portfolio-rebalancing/)
- [T. Rowe Price - Rebalancing](https://www.troweprice.com/personal-investing/resources/insights/whats-the-best-approach-for-portfolio-rebalancing.html)
- [Kubera - Active Rebalancing](https://www.kubera.com/blog/active-portfolio-rebalancing-pros-cons)

### Regulatory & Compliance

- [GDPR Local - Financial Institutions](https://gdprlocal.com/gdpr-for-financial-institutions/)
- [InnReg - GDPR for Financial Services](https://www.innreg.com/blog/gdpr-for-financial-services)
- [Legal Nodes - GDPR Compliance Cost](https://www.legalnodes.com/article/gdpr-compliance-cost-fintech-platforms-2025)

### Market Data APIs

- [Alpha Vantage](https://www.alphavantage.co/)
- [Finnhub](https://finnhub.io/)
- [Twelve Data](https://twelvedata.com/)
- [Polygon.io](https://polygon.io/)

### Financial Literacy

- [SEC - Financial Literacy Study](https://www.sec.gov/files/917-financial-literacy-study-part1.pdf)
- [Finance Monthly - Investing Terms 2025](https://www.finance-monthly.com/investing-terms-for-beginners-your-essential-glossary-june-2025/)
- [EBC - Stock Market Terminology](https://www.ebc.com/forex/stock-market-terminology-101-top-50-terms-for-new-investors)

---

_This domain research report was generated using the BMad Method Research Workflow with live 2025 web data._
