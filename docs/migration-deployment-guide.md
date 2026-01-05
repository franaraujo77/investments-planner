# Database Migration Deployment Guide

## Overview

This guide documents the database migration deployment process, lessons learned from production incidents, and best practices for preventing migration issues.

## Table of Contents

- [Migration Workflow](#migration-workflow)
- [Automated Deployment](#automated-deployment)
- [Manual Deployment](#manual-deployment)
- [Verification Tools](#verification-tools)
- [Incident: Missing updated_at Column (Jan 5, 2026)](#incident-missing-updated_at-column-jan-5-2026)
- [Prevention Measures](#prevention-measures)
- [Troubleshooting](#troubleshooting)

---

## Migration Workflow

### 1. Creating Migrations

**Local Development:**

```bash
# Make changes to src/lib/db/schema.ts
# Generate migration file
pnpm db:generate

# Review the generated SQL in drizzle/XXXX_migration_name.sql
# Ensure migrations are idempotent (use IF NOT EXISTS, IF EXISTS, etc.)
```

**Migration Best Practices:**

- ✅ Use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations
- ✅ Test migrations locally before committing
- ✅ Include descriptive migration names
- ✅ Document breaking changes in PR description
- ❌ Never manually edit applied migrations
- ❌ Never create migrations that drop data without backup strategy

**Example Idempotent Migration:**

```sql
-- Good: Idempotent, safe to run multiple times
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
CREATE INDEX IF NOT EXISTS "alerts_metadata_gin_idx" ON "alerts" USING gin ("metadata" jsonb_path_ops);

-- Bad: Will fail on second run
ALTER TABLE "alerts" ADD COLUMN "updated_at" timestamp DEFAULT now();
CREATE INDEX "alerts_metadata_gin_idx" ON "alerts" USING gin ("metadata" jsonb_path_ops);
```

### 2. Committing Migrations

```bash
# Commit migration files
git add drizzle/
git commit -m "feat: add updated_at column to alerts table"
git push origin feature/your-branch

# Create pull request
# Migration will be reviewed as part of PR process
```

---

## Automated Deployment

### How It Works

The production migration workflow (`.github/workflows/db-migrate-production.yml`) automatically runs when:

1. **PR is merged to main** (via GitHub web-flow or merge commit)
   - Workflow triggers on push to main
   - Detects if drizzle/ files changed
   - Applies migrations automatically

2. **Manual trigger** (workflow_dispatch)
   - Go to Actions → Production Database Migration
   - Click "Run workflow"
   - Type "MIGRATE" to confirm
   - Manually triggers migration

### Workflow Features

**Safety Mechanisms:**

- ✅ Only ONE migration can run at a time (concurrency control)
- ✅ Detects PR merges using GitHub web-flow committer
- ✅ Verifies migrations were applied successfully
- ✅ Creates detailed job summary with migration output
- ✅ Uploads migration logs as artifacts (30-day retention)
- ✅ 10-minute timeout to prevent hung processes

**Post-Migration Verification:**

After migrations run, the workflow automatically:

1. Runs `scripts/verify-migrations.ts` to check:
   - All migration files are applied
   - Critical columns exist (e.g., `updated_at`)
   - No missing migrations

2. Reports verification status in job summary:
   - ✅ "Migrations applied and verified" (success)
   - ⚠️ "Migrations applied but verification incomplete" (warning)

### Monitoring Migration Runs

**View Workflow Runs:**

```bash
# List recent migration workflow runs
gh run list --workflow="db-migrate-production.yml" --limit 10

# View specific run details
gh run view <run-id>

# Download migration logs
gh run download <run-id> --name migration-output
```

**GitHub UI:**

1. Go to Actions tab in GitHub
2. Select "Production Database Migration" workflow
3. View recent runs and their status

---

## Manual Deployment

### When to Use Manual Deployment

- Emergency fixes or hotfixes
- Applying backlog of pending migrations
- Recovering from failed automated deployment
- Testing migration process

### Steps

1. **Trigger via GitHub Actions UI:**

   ```
   Actions → Production Database Migration → Run workflow
   Branch: main
   Confirmation: MIGRATE
   ```

2. **Or via GitHub CLI:**

   ```bash
   gh workflow run db-migrate-production.yml \
     --ref main \
     -f confirm=MIGRATE
   ```

3. **Monitor the run:**

   ```bash
   gh run watch
   ```

### Local Testing (Against Staging)

```bash
# Use staging database URL
export DATABASE_URL="postgresql://staging-credentials..."

# Apply migrations locally
pnpm db:migrate

# Verify migrations
pnpm db:verify-migrations
```

**⚠️ WARNING:** Never run `pnpm db:push` against production. Use migrations only.

---

## Verification Tools

### 1. Verify Migrations Script

**Purpose:** Check that all migration files have been applied to the database.

**Usage:**

```bash
# Production (set DATABASE_URL)
DATABASE_URL="postgresql://..." pnpm db:verify-migrations

# Or use package script
pnpm db:verify-migrations
```

**Output:**

```
🔍 Checking production migration status...

✅ Applied migrations in production: 26

Recent migrations:
  - 0026_migration_name (2026-01-05T09:36:12.000Z)
  - 0025_migration_name (2026-01-05T09:36:11.000Z)
  - 0014_alerts_metadata_gin_index (2026-01-05T09:36:05.000Z)

📁 Local migration files: 26

✅ Migration 0014 (alerts updated_at) IS APPLIED
✅ All local migrations are applied in production

🔍 Checking alerts table schema...
✅ Column 'updated_at' EXISTS in alerts table
   Type: timestamp without time zone
   Default: now()

✅ Verification complete
```

### 2. Schema Audit Script

**Purpose:** Compare schema.ts definitions with actual production database structure.

**Usage:**

```bash
# Production (set DATABASE_URL)
DATABASE_URL="postgresql://..." pnpm db:audit-schema

# Or use package script
pnpm db:audit-schema
```

**Output:**

```
🔍 Starting production schema audit...

📊 Audit Summary
══════════════════════════════════════════════════
Total tables in schema: 15
✅ Tables OK: 15
❌ Missing tables: 0
⚠️  Tables with column mismatches: 0

✅ All tables match schema definition!

Tables verified:
  ✓ users
  ✓ portfolios
  ✓ assets
  ✓ alerts
  ✓ criteria_sets
  ...

✅ Schema audit complete - no issues found
```

**If Issues Found:**

```
⚠️  Tables with Column Mismatches:
──────────────────────────────────────────────────

  Table: alerts
    Missing columns in production:
      - updated_at
      - metadata
```

### 3. Using Scripts in CI/CD

These scripts are automatically integrated into the migration workflow:

```yaml
- name: Verify migrations applied
  run: npx tsx scripts/verify-migrations.ts

# Future: Add schema audit to PR checks
- name: Audit schema consistency
  run: npx tsx scripts/audit-production-schema.ts
```

---

## Incident: Missing updated_at Column (Jan 5, 2026)

### Incident Summary

**Date:** January 5, 2026
**Time:** 06:07:53 UTC
**Severity:** P1 - Production API Failure
**Impact:** `/api/alerts` endpoint returning 500 errors

**Error Message:**

```
Database error: list alerts
dbErrorMessage: "Database query failed"
dbErrorCause: "column \"updated_at\" does not exist"
```

### Root Cause

Migration `0014_alerts_metadata_gin_index.sql` was never executed in production due to a **timing gap and GitHub Actions path filter bug**:

**Timeline:**

1. **Dec 19, 2025**: Migration 0014 merged to main
   - ❌ No migration workflow existed yet

2. **Jan 2, 2026**: Migration workflow introduced (Story 6.7)
   - ❌ Had buggy path filter: `paths: - 'drizzle/**'`
   - Migration 0014 was already 14 days old, never executed

3. **Jan 5, 2026, 06:02:49 UTC**: PR #28 merged with new migrations
   - ❌ **Path filter failed to trigger** (GitHub Actions merge commit bug)
   - Code referenced `updated_at` but column didn't exist

4. **Jan 5, 2026, 06:07:53 UTC**: Production error discovered

5. **Jan 5, 2026, 09:35:43 UTC**: Manual workflow trigger
   - ✅ Applied pending migrations including 0014, 0025, and 0026

6. **Jan 5, 2026, 10:18:32 UTC**: Path filter bug fixed (PR #29, commit `c820c9e`)
   - ✅ Removed unreliable path filter
   - ✅ Added step-level detection instead

### Why Path Filters Failed

GitHub Actions `paths:` filters don't reliably detect file changes in merge commits:

```yaml
# BUGGY - Unreliable with merge commits
on:
  push:
    branches: [main]
    paths:
      - "drizzle/**" # ❌ Doesn't trigger on merge commits
```

Even though:

- ✅ `git show --stat` confirmed drizzle/ files changed
- ✅ CI workflow (no path filter) triggered correctly
- ❌ Migration workflow (with path filter) failed to trigger

### Resolution

**Immediate Fix:**

1. Manually triggered migration workflow: [Run #20711129867](https://github.com/franaraujo77/investments-planner/actions/runs/20711129867)
2. Applied migrations 0014, 0025, 0026 successfully
3. Verified `/api/alerts` endpoint working

**Long-term Fix (PR #29):**

```yaml
# FIXED - Always triggers, step-level check detects changes
on:
  push:
    branches: [main]
    # Path filter removed - doesn't work reliably with merge commits
    # Step-level check (line 79) detects if migrations actually changed
```

New workflow:

1. ✅ Triggers on ALL pushes to main (PR merges only)
2. ✅ Step-level `git diff` detects drizzle/ changes
3. ✅ Gracefully skips if no migrations changed
4. ✅ Minimal overhead: ~1 second per push

---

## Prevention Measures

### 1. ✅ Automated Verification

- Migration workflow now includes post-migration verification
- Runs `scripts/verify-migrations.ts` after each migration
- Checks for missing columns, tables, and migrations
- Reports verification status in job summary

### 2. ✅ Path Filter Removed

- No longer relies on GitHub Actions `paths:` filter
- Uses step-level `git diff` to detect changes
- More reliable for merge commits
- Minimal performance impact

### 3. ✅ Schema Audit Tool

- Created `scripts/audit-production-schema.ts`
- Compares schema.ts with production database
- Can be run manually or in CI/CD
- Identifies mismatches before they cause issues

### 4. ✅ Idempotent Migrations

- All migrations use `IF NOT EXISTS` / `IF EXISTS`
- Safe to run multiple times
- Migration 0014 example:

  ```sql
  ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
  ```

### 5. Manual Trigger Available

- Workflow can be manually triggered with confirmation
- Useful for:
  - Applying backlog of migrations
  - Emergency fixes
  - Testing migration process

### 6. Recommended: Pre-Deployment Schema Audit

**Add to PR workflow:**

```yaml
- name: Audit schema consistency
  run: |
    # Compare schema.ts with production
    DATABASE_URL="${{ secrets.DATABASE_URL_PRODUCTION }}" \
    pnpm db:audit-schema || echo "⚠️ Schema audit found issues"
```

This would have caught the missing `updated_at` column before the PR was merged.

---

## Troubleshooting

### Migration Failed: Connection Timeout

**Symptom:** Migration workflow times out after 10 minutes.

**Possible Causes:**

- Long-running migration (large table scan, index creation)
- Database connection pool exhausted
- Network issues between GitHub Actions and Supabase

**Solution:**

1. Check Supabase dashboard for active queries
2. Review migration SQL for expensive operations:
   - Full table scans without WHERE clause
   - Creating indexes on large tables (use CONCURRENTLY)
   - Complex data migrations

3. Optimize migration:

   ```sql
   -- Bad: Locks table during index creation
   CREATE INDEX idx_name ON large_table(column);

   -- Good: Creates index without locking
   CREATE INDEX CONCURRENTLY idx_name ON large_table(column);
   ```

4. If needed, increase workflow timeout:

   ```yaml
   jobs:
     migrate:
       timeout-minutes: 20 # Increase from default 10
   ```

### Migration Failed: Constraint Violation

**Symptom:** Migration fails with foreign key or unique constraint error.

**Example Error:**

```
ERROR: insert or update on table "child_table" violates foreign key constraint "fk_parent"
DETAIL: Key (parent_id)=(123) is not present in table "parent_table"
```

**Solution:**

1. Check if referenced records exist:

   ```sql
   -- Find orphaned records
   SELECT * FROM child_table c
   WHERE NOT EXISTS (
     SELECT 1 FROM parent_table p WHERE p.id = c.parent_id
   );
   ```

2. Fix orphaned records in migration:

   ```sql
   -- Option 1: Delete orphaned records
   DELETE FROM child_table
   WHERE NOT EXISTS (
     SELECT 1 FROM parent_table WHERE id = child_table.parent_id
   );

   -- Option 2: Create placeholder parent records
   INSERT INTO parent_table (id, ...)
   SELECT DISTINCT parent_id, ...
   FROM child_table
   WHERE NOT EXISTS (
     SELECT 1 FROM parent_table WHERE id = child_table.parent_id
   );

   -- Then add constraint
   ALTER TABLE child_table
   ADD CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES parent_table(id);
   ```

### Migration Applied but Code Still Failing

**Symptom:** Migration workflow succeeded, but API still returns "column does not exist".

**Possible Causes:**

1. **Stale connection pool** - Old connections cached before migration
2. **Wrong database** - Migration applied to staging instead of production
3. **Column name mismatch** - Schema uses `camelCase` but SQL uses `snake_case`

**Solution:**

1. **Verify database URL:**

   ```bash
   # Check which database the workflow used
   gh run view <run-id> --log | grep "DATABASE_URL"

   # Should show production pooler URL
   # postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

2. **Check column mapping:**

   ```typescript
   // schema.ts
   export const alerts = pgTable("alerts", {
     updatedAt: timestamp("updated_at").defaultNow(),
     //         ^^^^^^^^^ TypeScript name
     //                   ^^^^^^^^^^^^ SQL column name
   });
   ```

3. **Restart Next.js app** (if running locally):

   ```bash
   # Kill any running dev servers
   pnpm dev
   ```

4. **Force deployment** (if on Vercel):

   ```bash
   # Trigger new deployment
   git commit --allow-empty -m "chore: force redeploy"
   git push origin main
   ```

### Schema Audit Reports Missing Columns

**Symptom:** `pnpm db:audit-schema` shows missing columns that should exist.

**Solution:**

1. **Check DATABASE_URL:**

   ```bash
   # Make sure you're checking production
   echo $DATABASE_URL
   ```

2. **Verify migration was applied:**

   ```bash
   DATABASE_URL="..." pnpm db:verify-migrations
   ```

3. **Manually check database:**

   ```sql
   -- Check if column exists
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'your_table'
   AND column_name = 'your_column';
   ```

4. **If column truly missing, apply migration:**

   ```bash
   # Manually trigger workflow
   gh workflow run db-migrate-production.yml \
     --ref main \
     -f confirm=MIGRATE
   ```

---

## Best Practices Summary

### ✅ DO

- Use idempotent migrations (`IF NOT EXISTS`, `IF EXISTS`)
- Test migrations locally before committing
- Run `pnpm db:verify-migrations` after deployment
- Run `pnpm db:audit-schema` periodically
- Document breaking changes in PR description
- Use `CREATE INDEX CONCURRENTLY` for large tables
- Monitor GitHub Actions for migration failures

### ❌ DON'T

- Don't edit applied migrations
- Don't use `pnpm db:push` in production
- Don't create non-idempotent migrations
- Don't skip migration verification
- Don't rely on GitHub Actions path filters for critical workflows
- Don't create migrations that drop data without backups

---

## Related Documentation

- [Development Setup Guide](./development-setup.md)
- [Security Checklist](./security-checklist.md)
- [Database Schema](../src/lib/db/schema.ts)
- [Migration Workflow](./.github/workflows/db-migrate-production.yml)

---

## Questions or Issues?

If you encounter migration issues:

1. Check [GitHub Actions runs](https://github.com/franaraujo77/investments-planner/actions/workflows/db-migrate-production.yml)
2. Run verification scripts locally
3. Review this troubleshooting guide
4. Contact the platform team

**Emergency Migration Issues:**

1. Create incident ticket with priority P1
2. Include error logs from GitHub Actions
3. Include output from `pnpm db:verify-migrations`
4. Tag @platform-team in Slack
