# Migration 0027: Add missing `updated_at` column to alerts table

## Problem

The `/api/alerts` route was failing with the error:

```
column "updated_at" does not exist
```

## Root Cause

Migration `0013_lean_blob.sql` (December 18, 2024) created the `alerts` table but **omitted** the `updated_at` column, even though:

- The schema definition (`src/lib/db/schema.ts` line 1291) includes: `updatedAt: timestamp("updated_at").defaultNow()`
- The alert service (`src/lib/services/alert-service.ts`) references `updatedAt` in 9 different UPDATE operations

This schema drift caused all alert queries to fail.

## Solution

Created **idempotent** migration `0027_add_alerts_updated_at.sql` that:

1. ✅ Checks if the column exists before attempting to add it
2. ✅ Adds the column with default value `now()` if missing
3. ✅ Logs informative messages (NOTICE) about the operation
4. ✅ Can be safely run multiple times without errors

### Migration Code

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alerts'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "alerts" ADD COLUMN "updated_at" timestamp DEFAULT now();
    RAISE NOTICE 'Added updated_at column to alerts table';
  ELSE
    RAISE NOTICE 'Column updated_at already exists in alerts table, skipping';
  END IF;
END $$;
```

## Applied

- **Date:** January 5, 2026
- **Environment:** Production (Supabase)
- **Status:** ✅ Successfully applied
- **Idempotency:** ✅ Verified - can run multiple times safely

## Verification

The migration was tested for idempotency by running it twice:

1. First run: Added the column
2. Second run: Detected existing column and skipped (no errors)

## Files Modified

- ✅ Created: `drizzle/0027_add_alerts_updated_at.sql`
- ✅ Updated: `drizzle/meta/_journal.json` (added migration entry)

## Related Files

- Schema definition: `src/lib/db/schema.ts` (line 1291)
- Service usage: `src/lib/services/alert-service.ts` (9 references to updatedAt)
- API route: `src/app/api/alerts/route.ts`

## Impact

- ✅ Fixes all `/api/alerts` endpoint failures
- ✅ Enables proper timestamp tracking for alert updates
- ✅ Restores full alert functionality (read, dismiss, snooze operations)

## Testing Recommendation

After deployment, test these endpoints:

```bash
# List alerts
GET /api/alerts

# Mark alert as read
PATCH /api/alerts/{id}/read

# Dismiss alert
PATCH /api/alerts/{id}/dismiss

# Snooze alert
PATCH /api/alerts/{id}/snooze
```

All should now work without database errors.
