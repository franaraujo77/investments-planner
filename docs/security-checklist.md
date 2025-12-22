# Security Checklist for Database Changes

This checklist must be followed for any PR that modifies the database schema or migrations.

## Pre-Commit Checklist

### 1. Row Level Security (RLS)

- [ ] **New tables have RLS enabled** - Every new table MUST have `ENABLE ROW LEVEL SECURITY`
- [ ] **RLS migration exists** - Create migration: `ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY;`
- [ ] **Run security check** - Execute `pnpm security:check-rls` before committing

### 2. Table Classification

- [ ] **Classify new table** - Determine the category (User-owned, Auth tokens, Shared data, or System) using the reference table below

Classify your new table and apply appropriate security:

| Category        | Description           | RLS Policy                                       | Example Tables                            |
| --------------- | --------------------- | ------------------------------------------------ | ----------------------------------------- |
| **User-owned**  | Contains `user_id` FK | RLS enabled, no policy (service role only)       | `portfolios`, `alerts`                    |
| **Auth tokens** | Sensitive auth data   | RLS enabled + REVOKE from anon/authenticated     | `refresh_tokens`, `password_reset_tokens` |
| **Shared data** | Market/reference data | RLS enabled + read-only policy for authenticated | `asset_prices`, `exchange_rates`          |
| **System**      | Admin/job logs        | RLS enabled, no policy (service role only)       | `overnight_job_runs`                      |

### 3. For User-Owned Tables

```sql
-- Minimum requirement: Enable RLS
ALTER TABLE "new_table" ENABLE ROW LEVEL SECURITY;
```

### 4. For Auth Token Tables

```sql
-- Enable RLS
ALTER TABLE "sensitive_tokens" ENABLE ROW LEVEL SECURITY;

-- Defense in depth: Explicitly revoke PostgREST access
REVOKE ALL ON "sensitive_tokens" FROM anon, authenticated;
```

### 5. For Shared Data Tables

```sql
-- Enable RLS
ALTER TABLE "shared_data" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "authenticated_read_shared_data"
  ON "shared_data"
  FOR SELECT
  TO authenticated
  USING (true);
```

## CI Verification

The following checks run automatically on PRs:

1. **`pnpm security:check-rls`** - Verifies all schema tables have RLS in migrations
2. **Supabase security advisors** - Run manually: check Supabase dashboard → Advisors

## Manual Verification

After deploying migrations, verify in Supabase:

```sql
-- Check RLS status for all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

## Common Mistakes

1. **Forgetting RLS on new tables** - Always add RLS migration when creating tables
2. **Using db:push without migration** - Never use `db:push` in production; always create migrations
3. **Exposing sensitive data** - Auth tokens should never be accessible via PostgREST
4. **Missing policies for shared data** - If data should be client-readable, add explicit policies

## Emergency Response

If a security advisory is found in production:

1. **Immediate**: Create and apply migration to enable RLS
2. **Investigate**: Check logs for unauthorized access attempts
3. **Rotate**: If tokens were exposed, rotate affected credentials
4. **Document**: Add to this checklist to prevent recurrence

---

## Table Classification Reference

All tables in the schema must be classified. This reference documents the classification for every table.

### User-Owned Tables

Tables containing user-specific data with `user_id` foreign key. Access controlled via service role only.

| Table                  | Description                               | RLS Migration                  |
| ---------------------- | ----------------------------------------- | ------------------------------ |
| `users`                | Core user identity and preferences        | `0015_enable_rls_security.sql` |
| `portfolios`           | User investment portfolios                | `0015_enable_rls_security.sql` |
| `portfolio_assets`     | Individual asset holdings (via portfolio) | `0015_enable_rls_security.sql` |
| `asset_classes`        | User-defined asset categories             | `0015_enable_rls_security.sql` |
| `asset_subclasses`     | Subdivisions within asset classes         | `0015_enable_rls_security.sql` |
| `criteria_versions`    | Immutable scoring criteria sets           | `0015_enable_rls_security.sql` |
| `asset_scores`         | Calculated scores for assets              | `0015_enable_rls_security.sql` |
| `score_history`        | Historical score records (append-only)    | `0015_enable_rls_security.sql` |
| `investments`          | Investment transaction records            | `0015_enable_rls_security.sql` |
| `recommendations`      | Recommendation generation sessions        | `0015_enable_rls_security.sql` |
| `recommendation_items` | Individual asset recommendations          | `0015_enable_rls_security.sql` |
| `calculation_events`   | Event sourcing audit trail                | `0015_enable_rls_security.sql` |
| `alerts`               | User notifications for portfolio events   | `0015_enable_rls_security.sql` |
| `alert_preferences`    | User notification settings                | `0015_enable_rls_security.sql` |

### Auth Token Tables

Sensitive authentication data. RLS enabled with REVOKE from anon/authenticated roles.

| Table                   | Description               | RLS Migration                  | Additional Security             |
| ----------------------- | ------------------------- | ------------------------------ | ------------------------------- |
| `refresh_tokens`        | JWT refresh token storage | `0015_enable_rls_security.sql` | REVOKE from anon, authenticated |
| `verification_tokens`   | Email verification tokens | `0015_enable_rls_security.sql` | REVOKE from anon, authenticated |
| `password_reset_tokens` | Password reset tokens     | `0015_enable_rls_security.sql` | REVOKE from anon, authenticated |

### Shared Data Tables

Market/reference data shared across all users. RLS enabled with read-only policy for authenticated users.

| Table                | Description                           | RLS Migration                  | Policy                      |
| -------------------- | ------------------------------------- | ------------------------------ | --------------------------- |
| `asset_fundamentals` | External fundamental data (P/E, etc.) | `0015_enable_rls_security.sql` | Read-only for authenticated |
| `asset_prices`       | External daily price data (OHLCV)     | `0015_enable_rls_security.sql` | Read-only for authenticated |
| `exchange_rates`     | Currency exchange rate data           | `0015_enable_rls_security.sql` | Read-only for authenticated |

### System Tables

Admin/job tracking tables. RLS enabled with service role only access.

| Table                | Description                       | RLS Migration                  |
| -------------------- | --------------------------------- | ------------------------------ |
| `overnight_job_runs` | Job execution history and metrics | `0015_enable_rls_security.sql` |

---

**Total Tables: 21** | All tables have RLS enabled as of migration `0015_enable_rls_security.sql`
