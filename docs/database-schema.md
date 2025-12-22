# Database Schema Reference

> PostgreSQL database schema with 17 tables using Drizzle ORM

## Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER MANAGEMENT                                    │
│  ┌──────────────┐  ┌───────────────────┐  ┌───────────────────────────────┐ │
│  │    users     │◄─┤  refresh_tokens   │  │    verification_tokens        │ │
│  │              │◄─┤  password_reset_  │  │    alert_preferences          │ │
│  └──────┬───────┘  │  tokens           │  └───────────────────────────────┘ │
│         │          └───────────────────┘                                     │
└─────────┼────────────────────────────────────────────────────────────────────┘
          │ userId
┌─────────┼────────────────────────────────────────────────────────────────────┐
│         │                    PORTFOLIO DOMAIN                                │
│         ▼                                                                    │
│  ┌──────────────┐       ┌───────────────────┐       ┌──────────────────────┐ │
│  │  portfolios  │──────►│  portfolio_assets │──────►│    investments       │ │
│  │  (max 5/user)│       │                   │       │                      │ │
│  └──────────────┘       └─────────┬─────────┘       └──────────────────────┘ │
│                                   │                                          │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    │ assetClassId, subclassId
┌───────────────────────────────────┼──────────────────────────────────────────┐
│                                   │    CLASSIFICATION                        │
│                                   ▼                                          │
│         ┌─────────────────┐       ┌───────────────────────────────┐         │
│         │  asset_classes  │──────►│     asset_subclasses          │         │
│         │  (max 10/user)  │       │                               │         │
│         └─────────────────┘       └───────────────────────────────┘         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           SCORING DOMAIN                                     │
│  ┌────────────────────┐       ┌───────────────────┐       ┌────────────────┐ │
│  │  criteria_versions │──────►│    asset_scores   │──────►│  score_history │ │
│  │   (immutable)      │       │    (breakdown)    │       │   (append-only)│ │
│  └────────────────────┘       └───────────────────┘       └────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL DATA (SHARED)                               │
│  ┌───────────────────┐  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ asset_fundamentals│  │   asset_prices   │  │     exchange_rates         │ │
│  │  (symbol-based)   │  │  (symbol-based)  │  │    (currency pairs)        │ │
│  └───────────────────┘  └──────────────────┘  └────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                       RECOMMENDATIONS & EVENTS                               │
│  ┌────────────────────┐       ┌───────────────────────────────────────────┐ │
│  │  recommendations   │──────►│        recommendation_items               │ │
│  │   (24h TTL)        │       │                                           │ │
│  └────────────────────┘       └───────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────┐       ┌───────────────────────────────────────────┐ │
│  │      alerts        │       │        overnight_job_runs                 │ │
│  │                    │       │        calculation_events                 │ │
│  └────────────────────┘       └───────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Table Definitions

### 1. users

User accounts and preferences.

| Column                       | Type          | Nullable | Default             | Description           |
| ---------------------------- | ------------- | -------- | ------------------- | --------------------- |
| `id`                         | UUID          | NO       | `gen_random_uuid()` | Primary key           |
| `email`                      | VARCHAR(255)  | NO       | -                   | Unique email          |
| `password_hash`              | VARCHAR(255)  | NO       | -                   | bcrypt hash           |
| `name`                       | VARCHAR(100)  | YES      | -                   | Display name          |
| `base_currency`              | VARCHAR(3)    | NO       | `'USD'`             | User's currency       |
| `default_contribution`       | NUMERIC(19,4) | YES      | -                   | Monthly contribution  |
| `email_verified`             | BOOLEAN       | YES      | `false`             | Verification status   |
| `email_verified_at`          | TIMESTAMP     | YES      | -                   | Verification time     |
| `disclaimer_acknowledged_at` | TIMESTAMP     | YES      | -                   | Disclaimer acceptance |
| `deleted_at`                 | TIMESTAMP     | YES      | -                   | Soft delete marker    |
| `created_at`                 | TIMESTAMP     | YES      | `now()`             | Creation time         |
| `updated_at`                 | TIMESTAMP     | YES      | `now()`             | Update time           |

**Unique Constraints:** `email`

---

### 2. refresh_tokens

JWT refresh token storage for secure authentication.

| Column               | Type         | Nullable | Default             | Description           |
| -------------------- | ------------ | -------- | ------------------- | --------------------- |
| `id`                 | UUID         | NO       | `gen_random_uuid()` | Primary key           |
| `user_id`            | UUID         | NO       | -                   | FK → users (CASCADE)  |
| `token_hash`         | VARCHAR(255) | NO       | -                   | SHA-256 hash of token |
| `device_fingerprint` | VARCHAR(255) | YES      | -                   | Device identifier     |
| `expires_at`         | TIMESTAMP    | NO       | -                   | Token expiry          |
| `created_at`         | TIMESTAMP    | YES      | `now()`             | Creation time         |

**Indexes:** `refresh_tokens_user_id_idx`

---

### 3. verification_tokens

Email verification tokens (Story 2.2).

| Column       | Type         | Nullable | Default             | Description               |
| ------------ | ------------ | -------- | ------------------- | ------------------------- |
| `id`         | UUID         | NO       | `gen_random_uuid()` | Primary key               |
| `user_id`    | UUID         | NO       | -                   | FK → users (CASCADE)      |
| `token`      | VARCHAR(255) | NO       | -                   | Unique verification token |
| `expires_at` | TIMESTAMP    | NO       | -                   | 24h expiry                |
| `used_at`    | TIMESTAMP    | YES      | -                   | When verified             |
| `created_at` | TIMESTAMP    | YES      | `now()`             | Creation time             |

**Unique Constraints:** `token`
**Indexes:** `verification_tokens_user_id_idx`, `verification_tokens_token_idx`

---

### 4. password_reset_tokens

Password reset flow (Story 2.5).

| Column       | Type         | Nullable | Default             | Description          |
| ------------ | ------------ | -------- | ------------------- | -------------------- |
| `id`         | UUID         | NO       | `gen_random_uuid()` | Primary key          |
| `user_id`    | UUID         | NO       | -                   | FK → users (CASCADE) |
| `token_hash` | VARCHAR(255) | NO       | -                   | SHA-256 hash         |
| `expires_at` | TIMESTAMP    | NO       | -                   | 1h expiry            |
| `used_at`    | TIMESTAMP    | YES      | -                   | When used            |
| `created_at` | TIMESTAMP    | YES      | `now()`             | Creation time        |

**Indexes:** `password_reset_tokens_user_id_idx`, `password_reset_tokens_hash_idx`

---

### 5. portfolios

User investment portfolios (max 5 per user).

| Column       | Type        | Nullable | Default             | Description          |
| ------------ | ----------- | -------- | ------------------- | -------------------- |
| `id`         | UUID        | NO       | `gen_random_uuid()` | Primary key          |
| `user_id`    | UUID        | NO       | -                   | FK → users (CASCADE) |
| `name`       | VARCHAR(50) | NO       | -                   | Portfolio name       |
| `created_at` | TIMESTAMP   | YES      | `now()`             | Creation time        |
| `updated_at` | TIMESTAMP   | YES      | `now()`             | Update time          |

**Indexes:** `portfolios_user_id_idx`

---

### 6. portfolio_assets

Individual asset holdings within portfolios.

| Column           | Type          | Nullable | Default             | Description                      |
| ---------------- | ------------- | -------- | ------------------- | -------------------------------- |
| `id`             | UUID          | NO       | `gen_random_uuid()` | Primary key                      |
| `portfolio_id`   | UUID          | NO       | -                   | FK → portfolios (CASCADE)        |
| `symbol`         | VARCHAR(20)   | NO       | -                   | Ticker symbol                    |
| `name`           | VARCHAR(100)  | YES      | -                   | Asset name                       |
| `quantity`       | NUMERIC(19,8) | NO       | -                   | Quantity held                    |
| `purchase_price` | NUMERIC(19,4) | NO       | -                   | Cost basis per unit              |
| `currency`       | VARCHAR(3)    | NO       | -                   | Asset currency                   |
| `asset_class_id` | UUID          | YES      | -                   | FK → asset_classes (SET NULL)    |
| `subclass_id`    | UUID          | YES      | -                   | FK → asset_subclasses (SET NULL) |
| `is_ignored`     | BOOLEAN       | YES      | `false`             | Exclude from calculations        |
| `created_at`     | TIMESTAMP     | YES      | `now()`             | Creation time                    |
| `updated_at`     | TIMESTAMP     | YES      | `now()`             | Update time                      |

**Unique Constraints:** `portfolio_assets_portfolio_symbol_uniq` (portfolio_id, symbol)
**Indexes:** `portfolio_assets_portfolio_id_idx`

---

### 7. asset_classes

User-defined asset classification categories (max 10 per user).

| Column                 | Type          | Nullable | Default             | Description          |
| ---------------------- | ------------- | -------- | ------------------- | -------------------- |
| `id`                   | UUID          | NO       | `gen_random_uuid()` | Primary key          |
| `user_id`              | UUID          | NO       | -                   | FK → users (CASCADE) |
| `name`                 | VARCHAR(50)   | NO       | -                   | Class name           |
| `icon`                 | VARCHAR(10)   | YES      | -                   | Emoji icon           |
| `target_min`           | NUMERIC(5,2)  | YES      | -                   | Min allocation %     |
| `target_max`           | NUMERIC(5,2)  | YES      | -                   | Max allocation %     |
| `max_assets`           | NUMERIC(10,0) | YES      | -                   | Asset count limit    |
| `min_allocation_value` | NUMERIC(19,4) | YES      | -                   | Min investment       |
| `sort_order`           | NUMERIC(10,0) | NO       | `0`                 | Display order        |
| `created_at`           | TIMESTAMP     | YES      | `now()`             | Creation time        |
| `updated_at`           | TIMESTAMP     | YES      | `now()`             | Update time          |

**Indexes:** `asset_classes_user_id_idx`

---

### 8. asset_subclasses

Subdivisions within asset classes.

| Column                 | Type          | Nullable | Default             | Description                  |
| ---------------------- | ------------- | -------- | ------------------- | ---------------------------- |
| `id`                   | UUID          | NO       | `gen_random_uuid()` | Primary key                  |
| `class_id`             | UUID          | NO       | -                   | FK → asset_classes (CASCADE) |
| `name`                 | VARCHAR(50)   | NO       | -                   | Subclass name                |
| `target_min`           | NUMERIC(5,2)  | YES      | -                   | Min allocation %             |
| `target_max`           | NUMERIC(5,2)  | YES      | -                   | Max allocation %             |
| `max_assets`           | NUMERIC(10,0) | YES      | -                   | Asset count limit            |
| `min_allocation_value` | NUMERIC(19,4) | YES      | -                   | Min investment               |
| `sort_order`           | NUMERIC(10,0) | NO       | `0`                 | Display order                |
| `created_at`           | TIMESTAMP     | YES      | `now()`             | Creation time                |
| `updated_at`           | TIMESTAMP     | YES      | `now()`             | Update time                  |

**Indexes:** `asset_subclasses_class_id_idx`

---

### 9. criteria_versions

Immutable scoring criteria sets (versioned).

| Column          | Type         | Nullable | Default             | Description            |
| --------------- | ------------ | -------- | ------------------- | ---------------------- |
| `id`            | UUID         | NO       | `gen_random_uuid()` | Primary key            |
| `user_id`       | UUID         | NO       | -                   | FK → users (CASCADE)   |
| `asset_type`    | VARCHAR(50)  | NO       | -                   | 'stock', 'reit', 'etf' |
| `target_market` | VARCHAR(50)  | NO       | -                   | Market identifier      |
| `name`          | VARCHAR(100) | NO       | -                   | Criteria set name      |
| `criteria`      | JSONB        | NO       | -                   | Array of CriterionRule |
| `version`       | INTEGER      | NO       | -                   | Version number         |
| `is_active`     | BOOLEAN      | YES      | `true`              | Active status          |
| `created_at`    | TIMESTAMP    | YES      | `now()`             | Creation time          |
| `updated_at`    | TIMESTAMP    | YES      | `now()`             | Update time            |

**Indexes:** `criteria_versions_user_id_idx`, `criteria_versions_user_asset_type_idx`, `criteria_versions_user_market_idx`

**CriterionRule Schema (JSONB):**

```typescript
{
  id: string;
  name: string;
  metric: 'dividend_yield' | 'pe_ratio' | 'pb_ratio' | ...;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'equals' | 'exists';
  value: string;
  value2?: string;  // For 'between' operator
  points: number;   // -100 to +100
  requiredFundamentals: string[];
  sortOrder: number;
}
```

---

### 10. asset_scores

Calculated scores for assets.

| Column                | Type         | Nullable | Default             | Description              |
| --------------------- | ------------ | -------- | ------------------- | ------------------------ |
| `id`                  | UUID         | NO       | `gen_random_uuid()` | Primary key              |
| `user_id`             | UUID         | NO       | -                   | FK → users (CASCADE)     |
| `asset_id`            | UUID         | NO       | -                   | Reference to asset       |
| `symbol`              | VARCHAR(20)  | NO       | -                   | Ticker symbol            |
| `criteria_version_id` | UUID         | NO       | -                   | FK → criteria_versions   |
| `score`               | NUMERIC(7,4) | NO       | -                   | Calculated score         |
| `breakdown`           | JSONB        | NO       | -                   | Array of CriterionResult |
| `calculated_at`       | TIMESTAMP    | YES      | `now()`             | Calculation time         |
| `created_at`          | TIMESTAMP    | YES      | `now()`             | Creation time            |

**Indexes:** `asset_scores_user_id_idx`, `asset_scores_asset_id_idx`, `asset_scores_user_asset_idx`, `asset_scores_calculated_at_idx`

---

### 11. score_history

Historical score records (append-only).

| Column                | Type         | Nullable | Default             | Description            |
| --------------------- | ------------ | -------- | ------------------- | ---------------------- |
| `id`                  | UUID         | NO       | `gen_random_uuid()` | Primary key            |
| `user_id`             | UUID         | NO       | -                   | FK → users (CASCADE)   |
| `asset_id`            | UUID         | NO       | -                   | Reference to asset     |
| `symbol`              | VARCHAR(20)  | NO       | -                   | Ticker symbol          |
| `score`               | NUMERIC(7,4) | NO       | -                   | Historical score       |
| `criteria_version_id` | UUID         | NO       | -                   | FK → criteria_versions |
| `calculated_at`       | TIMESTAMP    | NO       | -                   | Calculation time       |
| `created_at`          | TIMESTAMP    | YES      | `now()`             | Creation time          |

**Indexes:** `score_history_user_asset_date_idx` (composite), `score_history_user_id_idx`

---

### 12. asset_fundamentals

External fundamental data (shared, not user-scoped).

| Column           | Type          | Nullable | Default             | Description      |
| ---------------- | ------------- | -------- | ------------------- | ---------------- |
| `id`             | UUID          | NO       | `gen_random_uuid()` | Primary key      |
| `symbol`         | VARCHAR(20)   | NO       | -                   | Ticker symbol    |
| `pe_ratio`       | NUMERIC(10,2) | YES      | -                   | Price/Earnings   |
| `pb_ratio`       | NUMERIC(10,2) | YES      | -                   | Price/Book       |
| `dividend_yield` | NUMERIC(8,4)  | YES      | -                   | Dividend yield % |
| `market_cap`     | NUMERIC(19,0) | YES      | -                   | Market cap       |
| `revenue`        | NUMERIC(19,2) | YES      | -                   | Revenue          |
| `earnings`       | NUMERIC(19,2) | YES      | -                   | Earnings         |
| `sector`         | VARCHAR(100)  | YES      | -                   | Sector name      |
| `industry`       | VARCHAR(100)  | YES      | -                   | Industry name    |
| `source`         | VARCHAR(50)   | NO       | -                   | Data provider    |
| `fetched_at`     | TIMESTAMP     | NO       | `now()`             | Fetch time       |
| `data_date`      | DATE          | NO       | -                   | Data date        |
| `created_at`     | TIMESTAMP     | YES      | `now()`             | Creation time    |
| `updated_at`     | TIMESTAMP     | YES      | `now()`             | Update time      |

**Unique Constraints:** `asset_fundamentals_symbol_date_uniq` (symbol, data_date)
**Indexes:** `asset_fundamentals_symbol_idx`

---

### 13. asset_prices

External daily price data (shared, not user-scoped).

| Column       | Type          | Nullable | Default             | Description    |
| ------------ | ------------- | -------- | ------------------- | -------------- |
| `id`         | UUID          | NO       | `gen_random_uuid()` | Primary key    |
| `symbol`     | VARCHAR(20)   | NO       | -                   | Ticker symbol  |
| `open`       | NUMERIC(19,4) | YES      | -                   | Opening price  |
| `high`       | NUMERIC(19,4) | YES      | -                   | High price     |
| `low`        | NUMERIC(19,4) | YES      | -                   | Low price      |
| `close`      | NUMERIC(19,4) | NO       | -                   | Closing price  |
| `volume`     | NUMERIC(19,0) | YES      | -                   | Trading volume |
| `currency`   | VARCHAR(3)    | NO       | -                   | Price currency |
| `source`     | VARCHAR(50)   | NO       | -                   | Data provider  |
| `fetched_at` | TIMESTAMP     | NO       | `now()`             | Fetch time     |
| `price_date` | DATE          | NO       | -                   | Price date     |
| `is_stale`   | BOOLEAN       | YES      | `false`             | Stale flag     |
| `created_at` | TIMESTAMP     | YES      | `now()`             | Creation time  |
| `updated_at` | TIMESTAMP     | YES      | `now()`             | Update time    |

**Unique Constraints:** `asset_prices_symbol_date_uniq` (symbol, price_date)
**Indexes:** `asset_prices_symbol_idx`, `asset_prices_fetched_at_idx`

---

### 14. exchange_rates

Currency exchange rates (shared, not user-scoped).

| Column            | Type          | Nullable | Default             | Description     |
| ----------------- | ------------- | -------- | ------------------- | --------------- |
| `id`              | UUID          | NO       | `gen_random_uuid()` | Primary key     |
| `base_currency`   | VARCHAR(3)    | NO       | -                   | Base currency   |
| `target_currency` | VARCHAR(3)    | NO       | -                   | Target currency |
| `rate`            | NUMERIC(19,8) | NO       | -                   | Exchange rate   |
| `source`          | VARCHAR(50)   | NO       | -                   | Data provider   |
| `fetched_at`      | TIMESTAMP     | NO       | `now()`             | Fetch time      |
| `rate_date`       | DATE          | NO       | -                   | Rate date (T-1) |
| `created_at`      | TIMESTAMP     | YES      | `now()`             | Creation time   |
| `updated_at`      | TIMESTAMP     | YES      | `now()`             | Update time     |

**Unique Constraints:** `exchange_rates_currencies_date_uniq` (base_currency, target_currency, rate_date)
**Indexes:** `exchange_rates_currencies_idx`

---

### 15. investments

Investment transaction records.

| Column               | Type          | Nullable | Default             | Description           |
| -------------------- | ------------- | -------- | ------------------- | --------------------- |
| `id`                 | UUID          | NO       | `gen_random_uuid()` | Primary key           |
| `user_id`            | UUID          | NO       | -                   | FK → users            |
| `portfolio_id`       | UUID          | NO       | -                   | FK → portfolios       |
| `asset_id`           | UUID          | NO       | -                   | FK → portfolio_assets |
| `symbol`             | VARCHAR(20)   | NO       | -                   | Ticker symbol         |
| `quantity`           | NUMERIC(19,8) | NO       | -                   | Quantity bought       |
| `price_per_unit`     | NUMERIC(19,4) | NO       | -                   | Purchase price        |
| `total_amount`       | NUMERIC(19,4) | NO       | -                   | Total cost            |
| `currency`           | VARCHAR(3)    | NO       | -                   | Currency              |
| `recommended_amount` | NUMERIC(19,4) | YES      | -                   | Suggested amount      |
| `invested_at`        | TIMESTAMP     | NO       | -                   | Investment date       |
| `created_at`         | TIMESTAMP     | YES      | `now()`             | Creation time         |

**Indexes:** `investments_user_id_idx`, `investments_invested_at_idx`

---

### 16. recommendations

Generated recommendation sessions.

| Column             | Type          | Nullable | Default             | Description               |
| ------------------ | ------------- | -------- | ------------------- | ------------------------- |
| `id`               | UUID          | NO       | `gen_random_uuid()` | Primary key               |
| `user_id`          | UUID          | NO       | -                   | FK → users (CASCADE)      |
| `portfolio_id`     | UUID          | NO       | -                   | FK → portfolios (CASCADE) |
| `contribution`     | NUMERIC(19,4) | NO       | -                   | Monthly contribution      |
| `dividends`        | NUMERIC(19,4) | NO       | -                   | Dividends received        |
| `total_investable` | NUMERIC(19,4) | NO       | -                   | Total capital             |
| `base_currency`    | VARCHAR(3)    | NO       | -                   | Currency                  |
| `correlation_id`   | UUID          | NO       | -                   | Links to events           |
| `status`           | VARCHAR(20)   | NO       | `'active'`          | Status                    |
| `generated_at`     | TIMESTAMP     | NO       | `now()`             | Generation time           |
| `expires_at`       | TIMESTAMP     | NO       | -                   | 24h expiry                |
| `created_at`       | TIMESTAMP     | YES      | `now()`             | Creation time             |
| `updated_at`       | TIMESTAMP     | YES      | `now()`             | Update time               |

**Indexes:** `recommendations_user_id_idx`, `recommendations_portfolio_id_idx`, `recommendations_correlation_id_idx`, `recommendations_status_idx`

---

### 17. recommendation_items

Individual asset recommendations.

| Column               | Type          | Nullable | Default             | Description                    |
| -------------------- | ------------- | -------- | ------------------- | ------------------------------ |
| `id`                 | UUID          | NO       | `gen_random_uuid()` | Primary key                    |
| `recommendation_id`  | UUID          | NO       | -                   | FK → recommendations (CASCADE) |
| `asset_id`           | UUID          | NO       | -                   | FK → portfolio_assets          |
| `symbol`             | VARCHAR(20)   | NO       | -                   | Ticker symbol                  |
| `score`              | NUMERIC(7,4)  | NO       | -                   | Asset score                    |
| `current_allocation` | NUMERIC(7,4)  | NO       | -                   | Current %                      |
| `target_allocation`  | NUMERIC(7,4)  | NO       | -                   | Target %                       |
| `allocation_gap`     | NUMERIC(7,4)  | NO       | -                   | Gap (target - current)         |
| `recommended_amount` | NUMERIC(19,4) | NO       | -                   | $ to invest                    |
| `is_over_allocated`  | BOOLEAN       | NO       | `false`             | Over-allocated flag            |
| `breakdown`          | JSONB         | NO       | -                   | Calculation details            |
| `sort_order`         | INTEGER       | NO       | -                   | Display order                  |
| `created_at`         | TIMESTAMP     | YES      | `now()`             | Creation time                  |

**Indexes:** `recommendation_items_recommendation_id_idx`, `recommendation_items_asset_id_idx`

---

### 18. alerts

User notifications (opportunity alerts, drift alerts).

| Column         | Type          | Nullable | Default             | Description                                 |
| -------------- | ------------- | -------- | ------------------- | ------------------------------------------- |
| `id`           | UUID          | NO       | `gen_random_uuid()` | Primary key                                 |
| `user_id`      | UUID          | NO       | -                   | FK → users (CASCADE)                        |
| `type`         | VARCHAR(50)   | NO       | -                   | 'opportunity', 'allocation_drift', 'system' |
| `title`        | VARCHAR(200)  | NO       | -                   | Alert title                                 |
| `message`      | VARCHAR(2000) | NO       | -                   | Alert message                               |
| `severity`     | VARCHAR(20)   | NO       | `'info'`            | 'info', 'warning', 'critical'               |
| `metadata`     | JSONB         | NO       | -                   | Alert-specific data                         |
| `is_read`      | BOOLEAN       | NO       | `false`             | Read status                                 |
| `is_dismissed` | BOOLEAN       | NO       | `false`             | Dismissed status                            |
| `expires_at`   | TIMESTAMP     | YES      | -                   | Expiry time                                 |
| `read_at`      | TIMESTAMP     | YES      | -                   | When read                                   |
| `dismissed_at` | TIMESTAMP     | YES      | -                   | When dismissed                              |
| `created_at`   | TIMESTAMP     | YES      | `now()`             | Creation time                               |
| `updated_at`   | TIMESTAMP     | YES      | `now()`             | Update time                                 |

**Indexes:** `alerts_user_id_idx`, `alerts_type_idx`, `alerts_created_at_idx`, GIN index on metadata (migration 0014)

---

### 19. alert_preferences

User notification settings.

| Column                       | Type         | Nullable | Default             | Description                   |
| ---------------------------- | ------------ | -------- | ------------------- | ----------------------------- |
| `id`                         | UUID         | NO       | `gen_random_uuid()` | Primary key                   |
| `user_id`                    | UUID         | NO       | -                   | FK → users (CASCADE), UNIQUE  |
| `opportunity_alerts_enabled` | BOOLEAN      | NO       | `true`              | Opportunity alerts            |
| `drift_alerts_enabled`       | BOOLEAN      | NO       | `true`              | Drift alerts                  |
| `drift_threshold`            | NUMERIC(5,2) | NO       | `5.00`              | Drift threshold %             |
| `alert_frequency`            | VARCHAR(20)  | NO       | `'daily'`           | 'realtime', 'daily', 'weekly' |
| `email_notifications`        | BOOLEAN      | NO       | `false`             | Email alerts                  |
| `created_at`                 | TIMESTAMP    | YES      | `now()`             | Creation time                 |
| `updated_at`                 | TIMESTAMP    | YES      | `now()`             | Update time                   |

**Indexes:** `alert_preferences_user_id_idx`

---

### 20. calculation_events

Event sourcing audit trail (ADR-002).

| Column           | Type        | Nullable | Default             | Description          |
| ---------------- | ----------- | -------- | ------------------- | -------------------- |
| `id`             | UUID        | NO       | `gen_random_uuid()` | Primary key          |
| `correlation_id` | UUID        | NO       | -                   | Links related events |
| `user_id`        | UUID        | NO       | -                   | FK → users           |
| `event_type`     | VARCHAR(50) | NO       | -                   | Event type           |
| `payload`        | JSONB       | NO       | -                   | Event data           |
| `created_at`     | TIMESTAMP   | YES      | `now()`             | Creation time        |

**Indexes:** `calculation_events_correlation_id_idx`, `calculation_events_user_id_idx`

**Event Types:**

- `CALC_STARTED` - Calculation initiated
- `INPUTS_CAPTURED` - Input data snapshot
- `SCORES_COMPUTED` - Results with breakdown
- `CALC_COMPLETED` - Duration and status

---

### 21. overnight_job_runs

Background job tracking.

| Column            | Type        | Nullable | Default             | Description                                 |
| ----------------- | ----------- | -------- | ------------------- | ------------------------------------------- |
| `id`              | UUID        | NO       | `gen_random_uuid()` | Primary key                                 |
| `job_type`        | VARCHAR(50) | NO       | -                   | 'scoring', 'recommendations', 'cache-warm'  |
| `status`          | VARCHAR(20) | NO       | -                   | 'started', 'completed', 'failed', 'partial' |
| `started_at`      | TIMESTAMP   | NO       | -                   | Start time                                  |
| `completed_at`    | TIMESTAMP   | YES      | -                   | End time                                    |
| `users_processed` | INTEGER     | YES      | `0`                 | Success count                               |
| `users_failed`    | INTEGER     | YES      | `0`                 | Failure count                               |
| `correlation_id`  | UUID        | NO       | -                   | Links to events                             |
| `error_details`   | JSONB       | YES      | -                   | Error information                           |
| `metrics`         | JSONB       | YES      | -                   | Performance data                            |
| `created_at`      | TIMESTAMP   | YES      | `now()`             | Creation time                               |

**Indexes:** `overnight_job_runs_correlation_id_idx`, `overnight_job_runs_status_idx`, `overnight_job_runs_started_at_idx`

---

## Numeric Precision Standards

| Use Case          | Type                  | Precision    | Example        |
| ----------------- | --------------------- | ------------ | -------------- |
| Monetary values   | NUMERIC(19,4)         | 4 decimals   | $1,234.5678    |
| Crypto quantities | NUMERIC(19,8)         | 8 decimals   | 0.00000001 BTC |
| Percentages       | NUMERIC(5,2) or (7,4) | 2-4 decimals | 45.50%         |
| Scores            | NUMERIC(7,4)          | 4 decimals   | 85.7500        |
| Exchange rates    | NUMERIC(19,8)         | 8 decimals   | 5.01234567     |

---

## Foreign Key Behaviors

| Relationship                           | On Delete | Rationale             |
| -------------------------------------- | --------- | --------------------- |
| users → portfolios                     | CASCADE   | Delete user data      |
| users → asset_classes                  | CASCADE   | Delete user data      |
| users → criteria_versions              | CASCADE   | Delete user data      |
| portfolios → portfolio_assets          | CASCADE   | Delete portfolio data |
| asset_classes → asset_subclasses       | CASCADE   | Delete hierarchy      |
| portfolio_assets → asset_class_id      | SET NULL  | Preserve assets       |
| recommendations → recommendation_items | CASCADE   | Delete together       |

---

_Schema file: `src/lib/db/schema.ts`_
