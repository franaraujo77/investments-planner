# Database Migration Rollback Scripts

This directory contains rollback scripts for database migrations.

## Purpose

Drizzle ORM does not have built-in down migration support. These scripts provide a documented way to rollback migrations when needed.

## Usage

### Manual Rollback

1. **Backup your data first** (if the table contains important data)
2. Run the rollback script:
   ```bash
   psql -d <database> -f drizzle/rollback/XXXX_rollback.sql
   ```
3. Update Drizzle metadata (required for consistency):
   - Remove the migration entry from `drizzle/meta/_journal.json`
   - Delete the corresponding snapshot file: `drizzle/meta/XXXX_snapshot.json`
   - Optionally delete the migration file: `drizzle/XXXX_*.sql`

### Rollback in Different Environments

**Development:**

```bash
DATABASE_URL="postgresql://..." psql -f drizzle/rollback/0012_rollback.sql
```

**Production (Vercel/Railway):**

- Connect to the production database using your provider's CLI or dashboard
- Run the rollback SQL manually with appropriate access controls
- Always test in staging first

## Available Rollback Scripts

| Migration | File                | Description                      |
| --------- | ------------------- | -------------------------------- |
| 0012      | `0012_rollback.sql` | Removes overnight_job_runs table |

## Best Practices

1. **Test rollbacks in development** before running in production
2. **Backup data** before any destructive rollback
3. **Update Drizzle metadata** after running rollback SQL
4. **Document custom rollbacks** when migrations involve data transformations
