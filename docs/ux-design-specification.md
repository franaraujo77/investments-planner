# Investments Planner UX Design Specification

_Created on 2025-11-28 by Bmad_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**Project:** Investments Planner - A portfolio management automation platform that transforms hours of manual review into a 5-minute decision. Built on the Cerrado diagram methodology.

**Target Users:** Advanced investors who:
- Know their investment strategy and want it automated
- Are long-term holders, not day traders
- Have international, multi-currency portfolios
- Value systematic decision-making over emotional reactions

**Core Philosophy:** "Simplicity in front, complexity behind"
- User asks: "What should I buy?"
- System answers: "Invest $X in Asset A, $Y in Asset B"
- All complexity is configurable but hidden unless requested

**Platform:** Web application (SaaS B2B), mobile considerations for future

**The Vibe:** "A trusted advisor's desk, not a trading floor. Calm confidence, not frantic activity."

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Selected:** shadcn/ui

**Rationale:**
- Matches inspiration apps (Stripe, Notion, Mercury) with clean, modern aesthetic
- Built on Radix UI primitives - WCAG accessibility compliant out of the box
- Tailwind CSS foundation enables rapid customization
- Copy-paste model means we own the code - no dependency lock-in
- Perfect for the "calm confidence" fintech vibe

**What shadcn/ui Provides:**
- Button, Card, Dialog, Dropdown, Form, Input, Select, Table, Tabs, Toast, Tooltip
- Data display: Charts (via Recharts), Data tables with sorting/filtering
- Navigation: Command palette, Navigation menu, Sidebar
- Feedback: Alert, Progress, Skeleton loaders, Spinners

**Custom Components Needed:**
- Asset Score Card (score visualization with criteria breakdown)
- Allocation Gauge (percentage range visualization)
- Recommendation Card (investment action with confirmation)
- Currency Display (multi-currency with conversion indicator)
- Data Freshness Badge (timestamp + source indicator)

**Version:** Latest (components are copy-paste, always current)

**Styling Approach:** Tailwind CSS with custom color tokens for fintech brand

---

## 2. Core User Experience

### 2.1 Defining Experience

**The Signature Moment:** "It tells me exactly what to buy each month based on my own rules."

This is the Monthly Recommendation View - the core interaction users return for every month.

**User Journey Summary:**
```
Login → See recommendations instantly → Confirm amounts → Done in 5 minutes
```

### 2.2 UX Patterns

**All patterns are established** - no novel interaction paradigms needed. This enables faster development with proven solutions.

| Pattern | Standard Solution | Investments Planner Implementation |
|---------|-------------------|-----------------------------------|
| **Dashboard** | Metrics + drill-down | Portfolio overview → recommendations → score details |
| **Configuration** | Forms + CRUD | Criteria as configurable blocks (Notion-inspired) |
| **Data tables** | Sort/filter/search | Asset lists with scores, filtering by class/market |
| **Confirmation flow** | Review → confirm | Recommendations → enter actual amounts → portfolio updated |
| **Progressive disclosure** | Expand on demand | Simple answer first, calculation breakdown on click |

### 2.3 Core Experience Principles

| Principle | Target | Rationale |
|-----------|--------|-----------|
| **Speed** | Dashboard <2s, actions <500ms | Pre-computed overnight, instant recommendations |
| **Guidance** | Minimal | Users are advanced investors, not beginners |
| **Flexibility** | High config, low daily use | Configure strategy once, execute monthly |
| **Feedback** | Calm and confident | Subtle success states, clear but non-alarming errors |
| **Trust** | Transparent calculations | Every number can be explained on demand |

---

## 3. Visual Foundation

### 3.1 Color System

**Selected Theme:** Slate Professional (Theme 1)

**Rationale:** Stripe-inspired palette that conveys trust, precision, and professionalism appropriate for investment management. Aligns with the "calm confidence" design philosophy.

#### Primary Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#0f172a` | Primary text, headers |
| `--primary-foreground` | `#f8fafc` | Text on primary |
| `--accent` | `#3b82f6` | Interactive elements, links |
| `--accent-hover` | `#2563eb` | Hover states |

#### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#10b981` | Positive changes, confirmations |
| `--success-light` | `#d1fae5` | Success backgrounds |
| `--warning` | `#f59e0b` | Alerts, attention needed |
| `--warning-light` | `#fef3c7` | Warning backgrounds |
| `--error` | `#ef4444` | Errors, negative changes |
| `--error-light` | `#fee2e2` | Error backgrounds |
| `--info` | `#3b82f6` | Informational elements |
| `--info-light` | `#dbeafe` | Info backgrounds |

#### Neutral Scale (Slate)

| Token | Value | Usage |
|-------|-------|-------|
| `--slate-50` | `#f8fafc` | Page background |
| `--slate-100` | `#f1f5f9` | Card backgrounds |
| `--slate-200` | `#e2e8f0` | Borders, dividers |
| `--slate-300` | `#cbd5e1` | Disabled states |
| `--slate-400` | `#94a3b8` | Placeholder text |
| `--slate-500` | `#64748b` | Secondary text |
| `--slate-600` | `#475569` | Body text |
| `--slate-700` | `#334155` | Emphasis text |
| `--slate-800` | `#1e293b` | Headers |
| `--slate-900` | `#0f172a` | Primary text |

#### Application

- **Backgrounds:** Slate-50 for page, Slate-100 for cards, White for inputs
- **Text:** Slate-900 for headers, Slate-600 for body, Slate-400 for hints
- **Accents:** Blue-500 for interactive, Green for positive, Red for negative
- **Charts:** Blue gradient for portfolio, semantic colors for performance

**Interactive Visualizations:**

- Color Theme Explorer: [ux-color-themes.html](./ux-color-themes.html)

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Selected:** Hybrid - Command Center + Focus Mode

**Layout Strategy:**

| Layer | Direction | Purpose |
|-------|-----------|---------|
| **App Shell** | Command Center | Persistent sidebar navigation, portfolio metrics, full context |
| **Core View** | Focus Mode | Monthly recommendations, answers "What should I buy?" directly |
| **Deep Dive** | Data Table | Available for detailed analysis, sorting, filtering |

**Rationale:**
- Command Center provides familiar dashboard pattern with full navigation
- Focus Mode delivers the "signature moment" with maximum clarity
- Data Table satisfies power users who want granular control
- Hybrid approach embodies "simplicity in front, complexity behind"

**Information Architecture:**

```
App Shell (Command Center)
├── Dashboard (Focus Mode - default landing)
│   └── Recommendation panel with confirm action
├── Portfolio
│   ├── Overview (charts, allocations)
│   └── Assets (Data Table view)
├── Criteria
│   └── Configuration blocks (Notion-style)
├── History
│   └── Past recommendations and actual investments
└── Settings
    └── Account, data sources, preferences
```

**Key Interaction Patterns:**
- **Landing:** User logs in → sees recommendations immediately (Focus Mode within Command Center shell)
- **Drill-down:** Click any recommendation → see score breakdown in slide-over panel
- **Configure:** Navigate to Criteria → Notion-style block editing
- **Analyze:** Navigate to Portfolio → Data Table with full sorting/filtering

**Interactive Mockups:**

- Design Direction Showcase: [ux-design-directions.html](./ux-design-directions.html)

---

## 5. User Journey Flows

### 5.1 Critical User Paths

#### Journey 1: Monthly Investment (Core Flow)

**Frequency:** Monthly | **Duration:** ~5 minutes | **Priority:** Critical

```
┌─────────────────────────────────────────────────────────────────┐
│  LOGIN                                                          │
│  User authenticates                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD (Focus Mode)                                         │
│  • See total recommended: "$2,000 across 3 assets"              │
│  • View ranked list: Asset, Score, Amount                       │
│  • Quick portfolio health indicator                             │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  REVIEW (Optional)                                              │
│  • Click any recommendation → Score breakdown panel             │
│  • See why: allocation gap, score components, criteria weights  │
│  • Compare to target allocation                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONFIRM                                                        │
│  • Enter actual amounts invested (may differ from recommended)  │
│  • System updates portfolio positions                           │
│  • Success toast: "November investments recorded"               │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  DONE                                                           │
│  • Dashboard updates with new allocations                       │
│  • Next recommendation available next month                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key UX Decisions:**
- Recommendations pre-computed overnight → instant display
- Actual amounts editable → user may invest more/less than recommended
- One-click confirm for power users, detailed view for curious users

---

#### Journey 2: First-Time Setup

**Frequency:** Once | **Duration:** 15-30 minutes | **Priority:** High

```
STEP 1: Account Creation
├── Email/password registration
├── Email verification
└── Welcome screen with setup wizard prompt

STEP 2: Portfolio Setup
├── Add first asset class (e.g., "US Stocks")
├── Add assets to class (e.g., "VOO", "VTI")
├── Enter current holdings (quantity or value)
└── System calculates current allocation

STEP 3: Criteria Configuration
├── Choose scoring criteria from templates OR
├── Create custom criteria with weights
├── Set target allocation ranges per asset class
└── Preview: "Based on this, here's what you'd invest..."

STEP 4: Data Sources (Optional)
├── Connect brokerage API (future feature)
├── OR continue with manual entry
└── Set preferred currency for display

STEP 5: First Recommendation
├── System generates initial recommendation
├── User sees their strategy in action
└── Ready for monthly cycle
```

**Key UX Decisions:**
- Progressive disclosure: start simple, add complexity as needed
- Templates for common strategies (e.g., "60/40 stocks/bonds")
- Skip option for advanced users who want manual setup

---

#### Journey 3: Criteria Configuration

**Frequency:** Quarterly or as needed | **Duration:** 5-15 minutes | **Priority:** Medium

```
NAVIGATE: Sidebar → Criteria

VIEW: Current Criteria List
├── Each criterion shown as a "block" (Notion-style)
├── Name, Weight, Description visible
└── Drag to reorder priority

EDIT: Click any criterion block
├── Inline editing for name, description
├── Slider or number input for weight
├── Toggle active/inactive
└── Delete with confirmation

ADD: "Add Criterion" button
├── Choose from templates OR create custom
├── Define scoring logic (qualitative or formula)
├── Set weight relative to others
└── Save and see impact preview

PREVIEW: "Preview Impact" button
├── Shows how current recommendations would change
├── Before/after comparison
└── Helps validate configuration
```

**Key UX Decisions:**
- Block-based editing inspired by Notion
- Changes don't affect past data, only future recommendations
- Preview before committing changes

---

#### Journey 4: Portfolio Analysis

**Frequency:** Monthly or on-demand | **Duration:** Variable | **Priority:** Medium

```
NAVIGATE: Sidebar → Portfolio

VIEW: Overview Tab
├── Pie/donut chart: Current allocation by class
├── Bar chart: Current vs. target allocation
├── Key metrics: Total value, health score, diversification
└── Trend: Portfolio growth over time

DRILL DOWN: Assets Tab (Data Table)
├── Full list of all assets
├── Columns: Name, Class, Value, %, Target, Score, Status
├── Sort by any column
├── Filter by class, market, score range
└── Click row → Asset detail panel

ASSET DETAIL: Slide-over panel
├── Full score breakdown by criterion
├── Allocation history chart
├── Recent transactions
├── Edit holdings manually
└── Data freshness indicator
```

**Key UX Decisions:**
- Overview for quick health check
- Table for detailed analysis
- All data exportable (CSV)

---

#### Journey 5: Historical Review

**Frequency:** Quarterly or annual | **Duration:** 5-10 minutes | **Priority:** Low

```
NAVIGATE: Sidebar → History

VIEW: Timeline
├── Month-by-month list of investment cycles
├── Each entry: Date, Total invested, Assets count
└── Click to expand details

DETAIL VIEW: Past Recommendation
├── What was recommended vs. what was actually invested
├── Scores at that point in time
├── Market prices at that time
└── Performance since (if tracked)

EXPORT: Download history
├── CSV export of all historical data
├── PDF summary report (future)
└── API access (future)
```

**Key UX Decisions:**
- Historical data immutable (never recalculated retroactively)
- Clear distinction: "recommended" vs. "actual"
- Supports annual tax review use case

---

### 5.2 Edge Cases & Error States

| Scenario | User Experience |
|----------|-----------------|
| **No recommendations** | "Your portfolio is balanced! No action needed this month." |
| **Data stale** | Warning badge: "Prices last updated 3 days ago" + refresh button |
| **Budget exceeds recommendations** | Show remaining: "You have $500 more to allocate" |
| **New asset added** | Prompt: "Set target allocation for new asset" |
| **API connection lost** | Graceful fallback: show cached data with timestamp |
| **First month (no history)** | Helpful empty state with setup CTA |

---

## 6. Component Library

### 6.1 Component Strategy

#### shadcn/ui Components (Use As-Is)

| Component | Usage in Investments Planner |
|-----------|------------------------------|
| **Button** | Primary actions, confirmations, navigation |
| **Card** | Metric cards, recommendation cards, asset cards |
| **Dialog** | Confirmation modals, delete warnings |
| **Dropdown Menu** | Asset class filters, sort options |
| **Form** | Login, settings, criteria editing |
| **Input** | Text fields, amount entry |
| **Select** | Currency selector, time period picker |
| **Table** | Asset list, history list (Data Table variant) |
| **Tabs** | Portfolio overview/assets toggle |
| **Toast** | Success/error notifications |
| **Tooltip** | Score explanations, data freshness info |
| **Sidebar** | Main navigation (Command Center) |
| **Command** | Quick search/navigation (Cmd+K) |
| **Sheet** | Slide-over panels for asset details |
| **Skeleton** | Loading states |
| **Badge** | Status indicators, score badges |
| **Progress** | Allocation progress bars |
| **Alert** | System messages, warnings |

#### Custom Components (Build)

**1. RecommendationCard**
```
┌─────────────────────────────────────────┐
│  [Icon] Asset Name                 $800 │
│         Asset Class          Score: 87  │
│         ══════════════════ (progress)   │
└─────────────────────────────────────────┘
```
- Displays single asset recommendation
- Shows score, amount, allocation progress
- Click to expand details
- Accepts editable amount input

**2. ScoreBreakdown**
```
┌─────────────────────────────────────────┐
│  Overall Score                      87  │
│  ─────────────────────────────────────  │
│  Allocation Gap      ████████░░  80%    │
│  Momentum           █████████░░  90%    │
│  Valuation          ███████░░░░  70%    │
└─────────────────────────────────────────┘
```
- Visual breakdown of score by criterion
- Shows weight contribution
- Used in slide-over detail panel

**3. AllocationGauge**
```
┌─────────────────────────────────────────┐
│  US Stocks                              │
│  ░░░░░░░░░░░░░█████████░░░░░░░░░░░░░░  │
│  0%    [18%]  ←target: 20%→       100%  │
└─────────────────────────────────────────┘
```
- Shows current vs. target allocation
- Visual range indicator
- Color-coded: green (on target), amber (near), red (far)

**4. CurrencyDisplay**
```
┌─────────────────────────────────────────┐
│  $12,450.00 USD                         │
│  ≈ R$ 62,250.00 (rate: 5.0)             │
└─────────────────────────────────────────┘
```
- Primary amount in selected currency
- Secondary conversion with rate
- Data freshness indicator

**5. DataFreshnessBadge**
```
┌─────────────────────────────────────────┐
│  ● Updated 2h ago                       │
└─────────────────────────────────────────┘
```
- Green: <24h old
- Amber: 1-3 days old
- Red: >3 days old
- Click to trigger refresh

**6. CriteriaBlock** (Notion-style)
```
┌─────────────────────────────────────────┐
│  ≡  Allocation Gap           Weight: 3  │
│      Prioritize assets below target     │
│      [Edit] [Delete]                    │
└─────────────────────────────────────────┘
```
- Draggable block for criteria management
- Inline editing
- Weight visualization

**7. MetricCard**
```
┌─────────────────────────────────────────┐
│  Portfolio Value                        │
│  $124,850                               │
│  +2.4% this month                       │
└─────────────────────────────────────────┘
```
- Compact metric display
- Label, value, change indicator
- Semantic color for positive/negative

#### Component Composition Examples

**Dashboard Header (Metrics Row)**
```tsx
<div className="grid grid-cols-4 gap-4">
  <MetricCard label="Portfolio Value" value="$124,850" change="+2.4%" />
  <MetricCard label="Monthly Budget" value="$2,000" />
  <MetricCard label="Assets" value="18" />
  <MetricCard label="Health Score" value="92%" change="-1%" negative />
</div>
```

**Recommendation List**
```tsx
<Card>
  <CardHeader>
    <CardTitle>November Recommendations</CardTitle>
  </CardHeader>
  <CardContent>
    {recommendations.map(rec => (
      <RecommendationCard
        asset={rec.asset}
        score={rec.score}
        amount={rec.amount}
        onConfirm={handleConfirm}
      />
    ))}
  </CardContent>
  <CardFooter>
    <Button>Confirm All Investments</Button>
  </CardFooter>
</Card>
```

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

#### Navigation Patterns

| Pattern | Implementation | Rationale |
|---------|----------------|-----------|
| **Primary Nav** | Persistent sidebar (collapsed on mobile) | Always accessible, clear hierarchy |
| **Secondary Nav** | Tabs within pages | Switch between related views |
| **Quick Nav** | Command palette (Cmd+K) | Power user efficiency |
| **Breadcrumbs** | Not used | Flat hierarchy doesn't need them |
| **Back Button** | Browser back only | Simple navigation model |

#### Interaction Patterns

| Action | Pattern | Feedback |
|--------|---------|----------|
| **Primary Action** | Solid blue button | Loading spinner → Success toast |
| **Secondary Action** | Outlined button | Same feedback pattern |
| **Destructive Action** | Red button + confirmation dialog | "Are you sure?" with consequence |
| **Edit Inline** | Click to edit, blur to save | Subtle border highlight |
| **Drag & Drop** | Visual drag handle, drop zone highlight | Ghost element while dragging |
| **Expand/Collapse** | Chevron icon, smooth animation | 200ms ease-out |

#### Form Patterns

| Element | Behavior |
|---------|----------|
| **Validation** | On blur, not on change (reduces noise) |
| **Error Display** | Inline below field, red text |
| **Required Fields** | Asterisk (*) suffix on label |
| **Help Text** | Muted text below input |
| **Submit** | Disabled until valid, loading state on submit |
| **Cancel** | Returns to previous state, no confirmation needed |

#### Feedback Patterns

| Type | Component | Duration | Position |
|------|-----------|----------|----------|
| **Success** | Toast (green) | 3 seconds auto-dismiss | Bottom-right |
| **Error** | Toast (red) | Persistent until dismissed | Bottom-right |
| **Warning** | Alert banner (amber) | Persistent | Top of content area |
| **Info** | Toast (blue) | 5 seconds | Bottom-right |
| **Loading** | Skeleton or spinner | Until complete | In place |
| **Empty State** | Illustration + CTA | Persistent | Center of content area |

#### Data Display Patterns

| Scenario | Pattern |
|----------|---------|
| **Currency** | Format: $1,234.56 (locale-aware) |
| **Percentages** | Format: 12.5% (1 decimal max) |
| **Dates** | Format: Nov 28, 2025 (relative for recent: "2 hours ago") |
| **Large Numbers** | Abbreviate: $1.2M, $850K |
| **Negative Numbers** | Red text, minus sign: -$500 |
| **Positive Changes** | Green text, plus sign: +2.4% |
| **Score Display** | 0-100 scale, color-coded badge |

#### Loading States

| Scenario | Pattern |
|----------|---------|
| **Initial Page Load** | Full skeleton of expected layout |
| **Data Refresh** | Keep stale data visible, show subtle loading indicator |
| **Button Action** | Replace text with spinner, disable button |
| **Table Load** | Skeleton rows (3-5 rows) |
| **Chart Load** | Placeholder with pulsing animation |

#### Empty States

| Scenario | Message | Action |
|----------|---------|--------|
| **No Recommendations** | "Your portfolio is perfectly balanced this month!" | Link to portfolio view |
| **No Assets** | "Add your first asset to get started" | "Add Asset" button |
| **No History** | "Complete your first investment cycle to see history" | Link to dashboard |
| **No Criteria** | "Set up scoring criteria to get recommendations" | "Add Criteria" button |
| **Search No Results** | "No assets match your search" | Clear filters link |

#### Confirmation Patterns

| Action | Confirmation Required | Pattern |
|--------|----------------------|---------|
| **Confirm Investment** | Yes (amounts involved) | Review summary → Confirm button |
| **Delete Asset** | Yes | Dialog: "Delete [Asset]? This cannot be undone." |
| **Delete Criterion** | Yes | Dialog with impact preview |
| **Change Currency** | No | Immediate switch with toast |
| **Logout** | No | Immediate |
| **Edit Holdings** | No (auto-save) | Inline edit with success indicator |

### 7.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + /` | Open keyboard shortcuts help |
| `Escape` | Close modal/panel, cancel edit |
| `Enter` | Confirm/submit focused action |
| `Tab` | Navigate form fields |
| `Arrow Keys` | Navigate within tables/lists |

### 7.3 Animation Guidelines

| Element | Duration | Easing | Usage |
|---------|----------|--------|-------|
| **Micro-interactions** | 150ms | ease-out | Button hover, focus states |
| **Panel Transitions** | 200ms | ease-out | Slide-overs, dropdowns |
| **Page Transitions** | 300ms | ease-in-out | Route changes |
| **Loading Skeletons** | 1.5s loop | ease-in-out | Pulse animation |
| **Charts** | 400ms | ease-out | Data reveal on load |

**Principle:** Animations should feel snappy, not sluggish. If in doubt, make it faster.

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

#### Breakpoints (Tailwind defaults)

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape), small laptops |
| `xl` | 1280px | Laptops, desktops |
| `2xl` | 1536px | Large monitors |

#### Layout Adaptation

| Component | Desktop (lg+) | Tablet (md) | Mobile (sm) |
|-----------|---------------|-------------|-------------|
| **Sidebar** | Expanded (240px) | Collapsed (icons only) | Hidden (hamburger menu) |
| **Metrics Row** | 4 columns | 2 columns | 1 column (stacked) |
| **Recommendation Cards** | List view | List view | Card stack |
| **Data Tables** | Full columns | Priority columns | Card view per row |
| **Charts** | Full size | Full size | Simplified/smaller |
| **Slide-over Panels** | 400px width | 50% width | Full screen |

#### Mobile-First Considerations

**Primary Use Case:** Desktop (users are managing investments at their desk)

**Mobile Support:** Read-only dashboard view, confirm investments
- Full configuration (criteria editing) is desktop-only
- Mobile optimized for the monthly "check and confirm" workflow

**Touch Targets:**
- Minimum 44x44px for interactive elements
- 8px minimum spacing between touch targets

#### Desktop Optimization

**Keyboard Navigation:**
- Full keyboard support for all interactions
- Tab order follows visual flow
- Focus indicators visible on all interactive elements

**Large Screen (2xl+):**
- Content max-width: 1400px
- Centered with comfortable margins
- Optional: expanded sidebar with labels

### 8.2 Accessibility (WCAG 2.1 AA)

#### Built-in via shadcn/ui (Radix Primitives)

- **Focus Management:** Automatic focus trapping in modals/dialogs
- **Keyboard Navigation:** Arrow keys in menus, Escape to close
- **Screen Reader:** ARIA labels on all interactive components
- **Announcements:** Live regions for dynamic content updates

#### Color Contrast Requirements

| Element | Contrast Ratio | Notes |
|---------|----------------|-------|
| **Body Text** | 4.5:1 minimum | Slate-600 on white: 5.7:1 |
| **Headings** | 4.5:1 minimum | Slate-900 on white: 13.4:1 |
| **Interactive** | 3:1 minimum | Blue-500 on white: 4.5:1 |
| **Large Text (18px+)** | 3:1 minimum | All colors pass |

#### Semantic HTML

```html
<!-- Navigation -->
<nav aria-label="Main navigation">
  <ul role="list">...</ul>
</nav>

<!-- Main Content -->
<main aria-label="Dashboard">
  <h1>November Recommendations</h1>
  ...
</main>

<!-- Tables -->
<table aria-label="Asset list">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

#### Screen Reader Considerations

| Element | Implementation |
|---------|----------------|
| **Score Badge** | `aria-label="Score: 87 out of 100"` |
| **Progress Bars** | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| **Status Changes** | `aria-live="polite"` for toast notifications |
| **Icons** | Decorative icons have `aria-hidden="true"`, functional icons have labels |
| **Charts** | Text alternative or data table fallback |

#### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Focus Indicators

- Visible focus ring (2px blue outline)
- Never remove focus indicators
- Skip-to-content link at top of page

### 8.3 Internationalization (Future)

**Current Scope:** English only

**Future Considerations:**
- RTL layout support (CSS logical properties)
- Number formatting (locale-aware via Intl API)
- Date formatting (locale-aware)
- Currency symbols (already handled via multi-currency feature)
- Text expansion room (30% buffer for translations)

---

## 9. Implementation Guidance

### 9.1 Completion Summary

#### What's Decided

| Area | Decision | Confidence |
|------|----------|------------|
| **Design System** | shadcn/ui (Radix + Tailwind) | High |
| **Color Theme** | Slate Professional (Stripe-inspired) | High |
| **Layout** | Command Center + Focus Mode hybrid | High |
| **Typography** | System fonts (Inter recommended) | Medium |
| **Navigation** | Persistent sidebar + command palette | High |
| **Core Flow** | Login → Recommendations → Confirm | High |

#### Implementation Priority

**Phase 1: Core Experience (MVP)**
1. Authentication (login/register)
2. Dashboard with Focus Mode recommendations
3. Confirm investment flow
4. Basic portfolio view
5. Manual asset/holdings entry

**Phase 2: Configuration**
1. Criteria management (Notion-style blocks)
2. Asset class management
3. Target allocation settings
4. Settings page

**Phase 3: Analysis & History**
1. Data Table view for assets
2. Historical recommendations view
3. Charts and visualizations
4. CSV export

**Phase 4: Polish**
1. Command palette (Cmd+K)
2. Keyboard shortcuts
3. Mobile optimization
4. Performance tuning

#### Component Build Order

1. **Layout Shell** - Sidebar, header, content area
2. **MetricCard** - Reused across dashboard
3. **RecommendationCard** - Core interaction
4. **Button variants** - Primary, secondary, destructive
5. **Form components** - Inputs, selects, validation
6. **DataFreshnessBadge** - Trust indicator
7. **AllocationGauge** - Visual feedback
8. **ScoreBreakdown** - Detail panel
9. **CriteriaBlock** - Configuration UI
10. **Data Table** - Asset list, history

#### Technical Recommendations

| Technology | Recommendation | Rationale |
|------------|----------------|-----------|
| **Framework** | Next.js 14+ (App Router) | Server components, excellent DX |
| **Styling** | Tailwind CSS | shadcn/ui compatibility |
| **State** | React Query + Zustand | Server state + client state separation |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **Charts** | Recharts | shadcn/ui integrated |
| **Tables** | TanStack Table | Powerful, headless |
| **Icons** | Lucide React | shadcn/ui default |
| **Animation** | Tailwind + Framer Motion | Simple + complex animations |

#### Files Delivered

| File | Purpose |
|------|---------|
| `docs/ux-design-specification.md` | This document - complete UX spec |
| `docs/ux-color-themes.html` | Interactive color theme explorer |
| `docs/ux-design-directions.html` | Layout direction mockups |

#### Next Steps

1. **Architecture Review:** Share this spec with the development team
2. **Tech Spec:** Create detailed technical specification based on PRD + UX spec
3. **Component Library:** Set up shadcn/ui and build custom components
4. **Prototype:** Build clickable prototype of core flow (optional)
5. **Development:** Begin Phase 1 implementation

---

### 9.2 Design Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2025-11-28 | shadcn/ui | Best fit for clean fintech aesthetic, accessibility built-in | Material UI, Chakra UI, custom |
| 2025-11-28 | Slate Professional theme | Stripe-inspired, professional, trustworthy | Ocean Trust, Sage Growth, Warm Minimal |
| 2025-11-28 | Command Center + Focus Mode | Balance of context and simplicity | Pure dashboard, pure minimal, cards grid |
| 2025-11-28 | Desktop-first, mobile-friendly | Primary use case is desktop | Mobile-first, desktop-only |

---

## Appendix

### Related Documents

- Product Requirements: `docs/prd.md`
- Brainstorming: `docs/brainstorming-session-results-2025-11-23.md`

### Version History

| Date       | Version | Changes                         | Author |
| ---------- | ------- | ------------------------------- | ------ |
| 2025-11-28 | 1.0     | Initial UX Design Specification | Bmad   |

---

_This UX Design Specification was created through collaborative design facilitation, not template generation. All decisions were made with user input and are documented with rationale._
