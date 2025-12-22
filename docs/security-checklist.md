# Security Checklist for Database Changes

This checklist must be followed for any PR that modifies the database schema or migrations.

## Pre-Commit Checklist

### 1. Row Level Security (RLS)

- [ ] **New tables have RLS enabled** - Every new table MUST have `ENABLE ROW LEVEL SECURITY`
- [ ] **RLS migration exists** - Create migration: `ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY;`
- [ ] **Run security check** - Execute `pnpm security:check-rls` before committing

### 2. Table Classification

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
