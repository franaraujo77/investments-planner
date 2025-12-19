# Epic 9: Alerts & Polish - Technical Specification

**Generated:** 2025-12-17
**Epic Status:** Contexted
**Stories:** 6
**FRs Covered:** FR51, FR63, FR65-FR67

---

## Epic Overview

### Goal

Complete the user experience with intelligent alerts, legal compliance, and helpful onboarding. This epic transforms the application from a functional tool into a polished product that proactively helps users maintain optimal portfolio health.

### Business Value

- **Proactive Portfolio Management:** Users receive alerts when better investment opportunities exist or when allocations drift from targets
- **Trust & Compliance:** Financial disclaimers and legal documents establish trust and meet regulatory requirements
- **Reduced Churn:** Empty states with helpful messaging guide new users to value faster, reducing abandonment
- **User Autonomy:** Alert preferences respect user attention and communication preferences

### User Impact

> "The app doesn't just tell me what to buy - it watches my portfolio and alerts me when something needs attention."

---

## Stories Summary

| Story ID | Story Name                              | FRs  | Priority | Dependencies                                 |
| -------- | --------------------------------------- | ---- | -------- | -------------------------------------------- |
| 9.1      | Opportunity Alert (Better Asset Exists) | FR65 | High     | Epic 5 (Scoring), Epic 7 (Recommendations)   |
| 9.2      | Allocation Drift Alert                  | FR66 | High     | Epic 4 (Allocations), Epic 6 (Data Pipeline) |
| 9.3      | Alert Preferences                       | FR67 | Medium   | Stories 9.1, 9.2                             |
| 9.4      | Financial Disclaimers                   | FR63 | Critical | None                                         |
| 9.5      | Terms of Service & Privacy Policy       | -    | Critical | None                                         |
| 9.6      | Empty States & Helpful Messaging        | -    | Medium   | All UI components                            |

---

## Technical Architecture

### New Database Tables

#### alerts Table

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'opportunity', 'allocation_drift', 'system'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  metadata JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- null = never expires
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP
);

CREATE INDEX alerts_user_id_idx ON alerts(user_id);
CREATE INDEX alerts_type_idx ON alerts(type);
CREATE INDEX alerts_created_at_idx ON alerts(created_at DESC);
CREATE INDEX alerts_user_unread_idx ON alerts(user_id, is_read) WHERE is_read = false;
```

#### alert_preferences Table

```sql
CREATE TABLE alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  opportunity_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  drift_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  drift_threshold NUMERIC(5,2) NOT NULL DEFAULT 5.00, -- % threshold for drift alerts
  alert_frequency VARCHAR(20) NOT NULL DEFAULT 'daily', -- 'realtime', 'daily', 'weekly'
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX alert_preferences_user_id_idx ON alert_preferences(user_id);
```

### Drizzle Schema Addition

```typescript
// src/lib/db/schema.ts - New tables for Epic 9

/**
 * Alerts table - user notifications for portfolio events
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * Story 9.2: Allocation Drift Alert
 *
 * Key design decisions:
 * - JSONB metadata for flexible alert-specific data
 * - Soft delete via is_dismissed flag
 * - expires_at for time-sensitive alerts
 * - Multi-tenant isolation via user_id
 */
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // 'opportunity', 'allocation_drift', 'system'
    title: varchar("title", { length: 200 }).notNull(),
    message: varchar("message", { length: 2000 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull().default("info"),
    metadata: jsonb("metadata").notNull().$type<AlertMetadata>(),
    isRead: boolean("is_read").notNull().default(false),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    expiresAt: timestamp("expires_at"),
    readAt: timestamp("read_at"),
    dismissedAt: timestamp("dismissed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("alerts_user_id_idx").on(table.userId),
    index("alerts_type_idx").on(table.type),
    index("alerts_created_at_idx").on(table.createdAt),
  ]
);

/**
 * Alert metadata interfaces for type safety
 */
export interface OpportunityAlertMetadata {
  currentAssetId: string;
  currentAssetSymbol: string;
  currentScore: string;
  betterAssetId: string;
  betterAssetSymbol: string;
  betterScore: string;
  scoreDifference: string;
  assetClassId: string;
  assetClassName: string;
}

export interface DriftAlertMetadata {
  assetClassId: string;
  assetClassName: string;
  currentAllocation: string;
  targetMin: string;
  targetMax: string;
  driftAmount: string;
  direction: "over" | "under";
}

export type AlertMetadata = OpportunityAlertMetadata | DriftAlertMetadata | Record<string, unknown>;

/**
 * Alert preferences table - user notification settings
 *
 * Story 9.3: Alert Preferences
 */
export const alertPreferences = pgTable(
  "alert_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    opportunityAlertsEnabled: boolean("opportunity_alerts_enabled").notNull().default(true),
    driftAlertsEnabled: boolean("drift_alerts_enabled").notNull().default(true),
    driftThreshold: numeric("drift_threshold", { precision: 5, scale: 2 })
      .notNull()
      .default("5.00"),
    alertFrequency: varchar("alert_frequency", { length: 20 }).notNull().default("daily"),
    emailNotifications: boolean("email_notifications").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("alert_preferences_user_id_idx").on(table.userId)]
);
```

### Service Layer

#### Alert Service

```typescript
// src/lib/services/alert-service.ts

export class AlertService {
  /**
   * Create opportunity alert when a better-scored asset exists in the same class
   *
   * AC-9.1.1: Alert triggered when better asset exists
   * AC-9.1.2: Score comparison threshold (10+ points better)
   */
  async createOpportunityAlert(
    userId: string,
    currentAsset: { id: string; symbol: string; score: string },
    betterAsset: { id: string; symbol: string; score: string },
    assetClass: { id: string; name: string }
  ): Promise<Alert>;

  /**
   * Create allocation drift alert when class allocation exceeds threshold
   *
   * AC-9.2.1: Alert triggered when drift exceeds threshold
   * AC-9.2.2: Drift threshold configurable (default 5%)
   */
  async createDriftAlert(
    userId: string,
    assetClass: { id: string; name: string },
    currentAllocation: string,
    targetMin: string,
    targetMax: string
  ): Promise<Alert>;

  /**
   * Get unread alerts for user
   */
  async getUnreadAlerts(userId: string): Promise<Alert[]>;

  /**
   * Get all alerts with pagination
   */
  async getAlerts(
    userId: string,
    options: { page: number; limit: number; type?: string }
  ): Promise<{ alerts: Alert[]; total: number }>;

  /**
   * Mark alert as read
   */
  async markAsRead(userId: string, alertId: string): Promise<void>;

  /**
   * Dismiss alert
   */
  async dismissAlert(userId: string, alertId: string): Promise<void>;

  /**
   * Bulk dismiss alerts
   */
  async dismissAllAlerts(userId: string, type?: string): Promise<number>;
}
```

#### Alert Detection Service

```typescript
// src/lib/services/alert-detection-service.ts

export class AlertDetectionService {
  /**
   * Detect opportunity alerts - called after scoring job
   *
   * Story 9.1: FR65 Implementation
   *
   * Logic:
   * 1. For each asset class with 2+ assets
   * 2. Compare current holdings' scores to other assets
   * 3. If another asset scores 10+ points better, create alert
   */
  async detectOpportunityAlerts(userId: string, portfolioId: string): Promise<void>;

  /**
   * Detect allocation drift alerts - called after price updates
   *
   * Story 9.2: FR66 Implementation
   *
   * Logic:
   * 1. For each asset class with target allocation
   * 2. Calculate current allocation %
   * 3. If outside target range by threshold, create alert
   */
  async detectDriftAlerts(userId: string, portfolioId: string): Promise<void>;
}
```

### API Endpoints

#### Alerts API

| Method | Endpoint                   | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | `/api/alerts`              | List user's alerts (paginated) |
| GET    | `/api/alerts/unread/count` | Get unread alert count         |
| PATCH  | `/api/alerts/[id]/read`    | Mark alert as read             |
| PATCH  | `/api/alerts/[id]/dismiss` | Dismiss alert                  |
| DELETE | `/api/alerts/dismiss-all`  | Dismiss all alerts             |

#### Alert Preferences API

| Method | Endpoint               | Description              |
| ------ | ---------------------- | ------------------------ |
| GET    | `/api/settings/alerts` | Get alert preferences    |
| PATCH  | `/api/settings/alerts` | Update alert preferences |

#### Legal Pages (Static)

| Method | Endpoint      | Description               |
| ------ | ------------- | ------------------------- |
| GET    | `/terms`      | Terms of Service page     |
| GET    | `/privacy`    | Privacy Policy page       |
| GET    | `/disclaimer` | Financial Disclaimer page |

### UI Components

#### Alert Components

```typescript
// src/components/alerts/alert-badge.tsx
// Notification badge showing unread count in header

// src/components/alerts/alert-dropdown.tsx
// Dropdown showing recent alerts with quick actions

// src/components/alerts/alert-list.tsx
// Full alert list page with filtering and pagination

// src/components/alerts/alert-card.tsx
// Individual alert display with dismiss/action buttons

// src/components/alerts/opportunity-alert-detail.tsx
// Detailed view for opportunity alerts with asset comparison

// src/components/alerts/drift-alert-detail.tsx
// Detailed view for drift alerts with allocation gauge
```

#### Empty State Components

```typescript
// src/components/empty-states/empty-portfolio.tsx
// Shown when user has no portfolios

// src/components/empty-states/empty-assets.tsx
// Shown when portfolio has no assets

// src/components/empty-states/empty-recommendations.tsx
// Shown when no recommendations available

// src/components/empty-states/empty-alerts.tsx
// Shown when no alerts exist

// src/components/empty-states/empty-history.tsx
// Shown when no investment history
```

---

## Story Details

### Story 9.1: Opportunity Alert (Better Asset Exists)

**FR Coverage:** FR65

**Acceptance Criteria:**

| ID       | Criterion                                                                                                                                                | Test Method      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| AC-9.1.1 | When a user's portfolio contains an asset in a class, AND another asset in the same class scores 10+ points higher, THEN an opportunity alert is created | Integration test |
| AC-9.1.2 | Alert includes current asset symbol/score and better asset symbol/score                                                                                  | Unit test        |
| AC-9.1.3 | Alert links to score breakdown for both assets                                                                                                           | E2E test         |
| AC-9.1.4 | Only one opportunity alert per asset pair (deduplication)                                                                                                | Integration test |
| AC-9.1.5 | Alert clears when user adds the better-scored asset                                                                                                      | Integration test |
| AC-9.1.6 | Alert respects user preference (opportunityAlertsEnabled)                                                                                                | Unit test        |

**Technical Notes:**

- Detection runs after overnight scoring job completes
- Uses existing asset scores from `asset_scores` table
- Deduplication key: `{userId}-{currentAssetId}-{betterAssetId}`

---

### Story 9.2: Allocation Drift Alert

**FR Coverage:** FR66

**Acceptance Criteria:**

| ID       | Criterion                                                                                                  | Test Method      |
| -------- | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| AC-9.2.1 | When an asset class allocation exceeds target range by configured threshold, THEN a drift alert is created | Integration test |
| AC-9.2.2 | Alert shows current allocation, target range, and drift amount                                             | Unit test        |
| AC-9.2.3 | Alert categorizes drift as "over-allocated" or "under-allocated"                                           | Unit test        |
| AC-9.2.4 | Drift threshold configurable per user (default 5%)                                                         | Integration test |
| AC-9.2.5 | Alert respects user preference (driftAlertsEnabled)                                                        | Unit test        |
| AC-9.2.6 | Alert auto-clears when allocation returns to target range                                                  | Integration test |

**Technical Notes:**

- Detection runs after price updates and after investments confirmed
- Uses existing allocation calculation from `allocation-service.ts`
- Drift = |currentAllocation - targetMidpoint| - (targetMax - targetMin)/2

---

### Story 9.3: Alert Preferences

**FR Coverage:** FR67

**Acceptance Criteria:**

| ID       | Criterion                                            | Test Method      |
| -------- | ---------------------------------------------------- | ---------------- |
| AC-9.3.1 | User can enable/disable opportunity alerts           | E2E test         |
| AC-9.3.2 | User can enable/disable drift alerts                 | E2E test         |
| AC-9.3.3 | User can configure drift threshold (1-20%)           | E2E test         |
| AC-9.3.4 | User can set alert frequency (realtime/daily/weekly) | E2E test         |
| AC-9.3.5 | User can enable/disable email notifications          | E2E test         |
| AC-9.3.6 | Default preferences created on user registration     | Integration test |
| AC-9.3.7 | Preferences UI accessible from settings page         | E2E test         |

**Technical Notes:**

- Preferences stored in `alert_preferences` table
- Created on user registration via trigger or service
- Email notifications deferred (infrastructure not yet built)

---

### Story 9.4: Financial Disclaimers

**FR Coverage:** FR63

**Acceptance Criteria:**

| ID       | Criterion                                                              | Test Method      |
| -------- | ---------------------------------------------------------------------- | ---------------- |
| AC-9.4.1 | Financial disclaimer modal shown on first dashboard visit              | E2E test         |
| AC-9.4.2 | Disclaimer text explains that recommendations are not financial advice | Manual review    |
| AC-9.4.3 | User must acknowledge disclaimer before accessing dashboard            | E2E test         |
| AC-9.4.4 | Acknowledgment timestamp stored in user record                         | Integration test |
| AC-9.4.5 | Disclaimer accessible anytime from footer link                         | E2E test         |
| AC-9.4.6 | Disclaimer page includes algorithm transparency section                | Manual review    |

**Disclaimer Content (Template):**

```markdown
## Important Investment Disclaimer

This application is a portfolio management tool that provides investment
suggestions based on YOUR configured criteria and market data.

**This is NOT financial advice.**

- Recommendations are mathematical calculations, not professional guidance
- Past performance does not guarantee future results
- Always consult a qualified financial advisor before making investment decisions
- You are solely responsible for your investment choices

By acknowledging this disclaimer, you confirm that you understand these terms.
```

**Technical Notes:**

- `users.disclaimerAcknowledgedAt` field already exists in schema
- Middleware intercepts dashboard routes, redirects to disclaimer if not acknowledged
- Static `/disclaimer` page for reference

---

### Story 9.5: Terms of Service & Privacy Policy

**Acceptance Criteria:**

| ID       | Criterion                                                       | Test Method   |
| -------- | --------------------------------------------------------------- | ------------- |
| AC-9.5.1 | Terms of Service page accessible at /terms                      | E2E test      |
| AC-9.5.2 | Privacy Policy page accessible at /privacy                      | E2E test      |
| AC-9.5.3 | Links to both pages in registration flow                        | E2E test      |
| AC-9.5.4 | Links to both pages in footer                                   | E2E test      |
| AC-9.5.5 | ToS includes data usage, liability limitation, termination      | Manual review |
| AC-9.5.6 | Privacy Policy includes data collection, retention, user rights | Manual review |

**Technical Notes:**

- Static pages with markdown content
- No database changes required
- Content provided by user/legal team (placeholders in MVP)

---

### Story 9.6: Empty States & Helpful Messaging

**Acceptance Criteria:**

| ID       | Criterion                                                     | Test Method   |
| -------- | ------------------------------------------------------------- | ------------- |
| AC-9.6.1 | Empty portfolio state shows "Create your first portfolio" CTA | E2E test      |
| AC-9.6.2 | Empty assets state shows "Add your first asset" CTA           | E2E test      |
| AC-9.6.3 | Empty recommendations state shows encouraging message         | E2E test      |
| AC-9.6.4 | Empty alerts state shows "All clear" message                  | E2E test      |
| AC-9.6.5 | Empty history state shows helpful onboarding message          | E2E test      |
| AC-9.6.6 | All empty states include relevant illustration                | Manual review |
| AC-9.6.7 | Empty states provide context-appropriate next action          | E2E test      |

**Empty State Messages:**

| State              | Title                            | Message                                                                                  | CTA                |
| ------------------ | -------------------------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| No Portfolios      | "Welcome to Investments Planner" | "Create your first portfolio to start tracking your investments."                        | "Create Portfolio" |
| No Assets          | "Your portfolio is empty"        | "Add assets to get personalized investment recommendations."                             | "Add Asset"        |
| No Recommendations | "You're all set!"                | "Your portfolio is balanced. Check back next month for new recommendations."             | "View Portfolio"   |
| No Alerts          | "All clear!"                     | "No alerts right now. We'll notify you if anything needs your attention."                | -                  |
| No History         | "No investment history yet"      | "Your investment history will appear here after you confirm your first recommendations." | "View Dashboard"   |

**Technical Notes:**

- Consistent empty state component with customizable content
- Optional illustration slot
- Primary and secondary CTA buttons

---

## Integration with Overnight Processing

### Alert Detection Integration

The alert detection service integrates with existing overnight processing:

```typescript
// src/lib/inngest/functions/overnight-scoring.ts - Modified

// After scoring completes for a user
async function processUser(userId: string, portfolioId: string) {
  // ... existing scoring logic ...

  // New: Detect alerts after scoring
  await alertDetectionService.detectOpportunityAlerts(userId, portfolioId);
  await alertDetectionService.detectDriftAlerts(userId, portfolioId);
}
```

### Alert Expiration

Opportunity alerts expire when:

1. User adds the better-scored asset
2. Score differential drops below threshold
3. 30 days pass without action

Drift alerts expire when:

1. Allocation returns to target range
2. User modifies target range
3. 7 days pass without action

---

## Testing Strategy

### Unit Tests

- Alert service methods
- Alert detection logic
- Preference validation
- Empty state rendering

### Integration Tests

- Alert creation and deduplication
- Alert preference enforcement
- Database constraints
- API endpoint authorization

### E2E Tests

- Alert notification flow
- Preference configuration
- Disclaimer acknowledgment flow
- Empty state navigation

---

## Dependencies

### External Dependencies

None required for this epic.

### Internal Dependencies

| Dependency              | Required By      | Purpose                   |
| ----------------------- | ---------------- | ------------------------- |
| `scoring-engine.ts`     | Story 9.1        | Score comparison          |
| `allocation-service.ts` | Story 9.2        | Allocation calculation    |
| `overnight-scoring.ts`  | Stories 9.1, 9.2 | Alert detection trigger   |
| `user-service.ts`       | Story 9.4        | Disclaimer acknowledgment |

---

## Performance Considerations

### Alert Queries

- Index on `(user_id, is_read)` for unread count badge
- Index on `created_at DESC` for recent alerts
- Pagination for alert list (default 20 per page)

### Alert Detection

- Runs asynchronously after overnight job
- Batched database operations
- Deduplication check before insert

---

## Security Considerations

### Multi-Tenant Isolation

All alert queries MUST include `userId` filter:

```typescript
// Always scope by userId
const alerts = await db.select().from(alerts).where(eq(alerts.userId, userId));
```

### Disclaimer Enforcement

Dashboard middleware enforces disclaimer acknowledgment:

```typescript
// src/middleware.ts
if (isDashboardRoute && !user.disclaimerAcknowledgedAt) {
  return redirect("/disclaimer");
}
```

---

## Migration Plan

### Database Migration

```sql
-- Migration: Add alerts and alert_preferences tables
-- Safe to run in production (no data modification)

BEGIN;

CREATE TABLE IF NOT EXISTS alerts (...);
CREATE TABLE IF NOT EXISTS alert_preferences (...);

-- Create default preferences for existing users
INSERT INTO alert_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM alert_preferences);

COMMIT;
```

### Rollback Plan

```sql
-- Rollback: Remove alerts tables
-- WARNING: This will delete all alert data

BEGIN;

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS alert_preferences;

COMMIT;
```

---

## Open Questions

| Question                                             | Status   | Decision                             |
| ---------------------------------------------------- | -------- | ------------------------------------ |
| Should alerts trigger email notifications in MVP?    | Resolved | No - defer to future epic            |
| What's the maximum alert retention period?           | Resolved | 90 days, then auto-delete            |
| Should opportunity alerts consider portfolio weight? | Resolved | No - simple score comparison for MVP |
| Should drift alerts show recommended action?         | Resolved | Yes - link to recommendations        |

---

## Appendix: FR Traceability

| FR   | Story    | Description                                                     |
| ---- | -------- | --------------------------------------------------------------- |
| FR51 | 9.1, 9.2 | View breakdown of recommendation reasoning (extended to alerts) |
| FR63 | 9.4      | System data sources and algorithms must be visible              |
| FR65 | 9.1      | Opportunity alerts when better assets exist                     |
| FR66 | 9.2      | Allocation drift alerts when outside target range               |
| FR67 | 9.3      | Alert preferences configuration                                 |

---

_Generated by BMad Method - Epic Tech Context Workflow_
_Document Version: 1.0_
