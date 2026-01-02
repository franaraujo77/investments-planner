# Story 6.7: Production Database Migration Pipeline

Status: done

## Story

As a **developer merging code to main**,
I want **a GitHub Actions pipeline that automatically applies database migrations to production**,
So that **database schema changes are deployed reliably and consistently without manual intervention**.

## Background

Currently, the project has:

- **Integration Tests Pipeline** (`.github/workflows/integration-tests.yml`) - Runs on PRs, uses `DATABASE_URL` secret pointing to a test/staging database
- **CI Pipeline** (`.github/workflows/ci.yml`) - Runs unit tests, linting, and type checking
- **Code Review Pipeline** (`.github/workflows/claude-code-review.yml`) - AI-assisted code review

**Problem:** Database migrations to production are currently manual or not automated. When a PR with schema changes (files in `drizzle/`) is merged to main, the production database is not automatically updated.

**Solution:** Create a new GitHub Actions workflow that:

1. Triggers when a PR is merged to main (not just opened/updated)
2. Detects if there are migration files changed
3. Applies migrations to the production database using a separate secret
4. Has proper safeguards and logging

### Secret Management Strategy

The current `DATABASE_URL` secret is used for integration tests (staging/test database). For production migrations, we need a separate secret to avoid confusion and prevent accidental production changes during tests.

**Option A: Add new production secret (Recommended)**

- Keep `DATABASE_URL` for integration tests (no change to existing workflow)
- Add `DATABASE_URL_PRODUCTION` for production migrations
- Clear separation of concerns

**Option B: Rename existing secrets**

- Rename `DATABASE_URL` to `DATABASE_URL_INTEGRATION`
- Add `DATABASE_URL_PRODUCTION` for production migrations
- Requires updating integration-tests.yml

**Recommendation:** Option A - minimizes changes to existing working infrastructure.

## Acceptance Criteria

### AC-6.7.1: Production Migration Workflow Created

**Given** the repository has migration files in `drizzle/`
**When** I push to the repository
**Then** a new workflow file `.github/workflows/db-migrate-production.yml` exists
**And** the workflow is properly configured with production database secret

### AC-6.7.2: Trigger on PR Merge to Main

**Given** a PR with migration changes is approved and merged to main
**When** the merge commit is pushed to main
**Then** the production migration workflow triggers automatically
**And** the workflow only runs for merged PRs (not direct pushes without PR)

### AC-6.7.3: Migration Path Detection

**Given** a PR is merged to main
**When** the workflow starts
**Then** it checks if any files in `drizzle/` were changed
**And** if no migration files changed, the workflow exits early with success
**And** if migration files changed, the workflow proceeds with migration

### AC-6.7.4: Secure Production Database Access

**Given** the workflow needs production database credentials
**When** the workflow runs migrations
**Then** it uses `DATABASE_URL_PRODUCTION` secret (not the integration test DATABASE_URL)
**And** the secret is masked in all logs
**And** the workflow fails gracefully if the secret is missing

### AC-6.7.5: Migration Execution and Logging

**Given** migrations need to be applied
**When** the migration command runs
**Then** it executes `pnpm db:migrate` (Drizzle Kit migrate)
**And** migration output is logged for audit purposes
**And** success/failure is clearly reported
**And** a job summary shows which migrations were applied

### AC-6.7.6: Error Handling and Notifications

**Given** a migration fails
**When** the error is detected
**Then** the workflow fails with a clear error message
**And** the job summary includes the failure details
**And** the workflow does NOT retry automatically (manual intervention required)

### AC-6.7.7: Documentation Updated

**Given** the workflow is implemented
**When** I read the project documentation
**Then** `docs/development-setup.md` includes:

- How to add the `DATABASE_URL_PRODUCTION` secret
- How the production migration pipeline works
- What to do if a migration fails
- How to manually trigger migrations if needed

## Tasks / Subtasks

### Task 1: Create Production Migration Workflow (AC: 6.7.1, 6.7.2)

- [x] Create `.github/workflows/db-migrate-production.yml` with:
  - [x] `push` trigger to `main` branch only
  - [x] Condition to only run when PR was merged (not direct push)
  - [x] Path filter for `drizzle/**` files
  - [x] Timeout and concurrency settings
  - [x] Ubuntu latest runner with Node.js 22 + pnpm 9

### Task 2: Migration Path Detection (AC: 6.7.3)

- [x] Add step to detect changed files in the merge commit
- [x] Check if any files in `drizzle/` were modified
- [x] Exit early with success if no migration files changed
- [x] Log which migration files were detected

### Task 3: Production Secret Configuration (AC: 6.7.4)

- [x] Configure `DATABASE_URL_PRODUCTION` environment variable from secret
- [x] Add secret validation step that fails early if missing
- [x] Ensure the secret name is distinct from integration test DATABASE_URL
- [x] Document required secret in workflow comments

### Task 4: Migration Execution (AC: 6.7.5)

- [x] Install dependencies with `pnpm install --frozen-lockfile`
- [x] Run `pnpm db:migrate` with production DATABASE_URL
- [x] Capture migration output for logging
- [x] Create job summary with:
  - [x] Trigger info (commit SHA, PR number if available)
  - [x] Migration files detected
  - [x] Migration status (success/failure)
  - [x] Timestamp

### Task 5: Error Handling (AC: 6.7.6)

- [x] Ensure migration failures fail the workflow
- [x] Do NOT implement automatic retry (migrations should not auto-retry)
- [x] Include detailed error in job summary
- [x] Consider adding step to check for pending migrations

### Task 6: Documentation (AC: 6.7.7)

- [x] Update `docs/development-setup.md` with new section:
  - [x] "Production Database Migrations"
  - [x] How to set up `DATABASE_URL_PRODUCTION` secret
  - [x] Pipeline behavior explanation
  - [x] Troubleshooting failed migrations
  - [x] Manual migration procedure if needed

### Task 7: Create GitHub Secret (Manual Admin Task)

**Note:** This task requires manual action by repository administrator via GitHub UI.

- [ ] Navigate to: Repository Settings > Secrets and variables > Actions > New repository secret
- [ ] Create secret: `DATABASE_URL_PRODUCTION`
  - Value: Production Supabase connection string (pooled connection recommended)
  - Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

## Dev Notes

### Workflow Template

```yaml
name: Production Database Migration

on:
  push:
    branches: [main]
    paths:
      - "drizzle/**"

# Prevent concurrent migrations
concurrency:
  group: production-migration
  cancel-in-progress: false # Never cancel running migrations!

jobs:
  migrate:
    name: Apply Database Migrations
    runs-on: ubuntu-latest
    timeout-minutes: 10

    # Only run if this push is from a merged PR (has associated PR)
    # This prevents running on direct pushes to main
    if: github.event.head_commit.message != '' && contains(github.event.head_commit.message, 'Merge pull request')

    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL_PRODUCTION }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 2 # Need previous commit to compare

      - name: Validate production database secret
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo "::error::DATABASE_URL_PRODUCTION secret is not configured"
            echo ""
            echo "Please add the DATABASE_URL_PRODUCTION secret in repository settings:"
            echo "Settings > Secrets and variables > Actions > New repository secret"
            exit 1
          fi
          echo "✅ Production database secret is configured"

      - name: Check for migration files
        id: check-migrations
        run: |
          # Get list of changed files in this push
          CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)
          echo "Changed files:"
          echo "$CHANGED_FILES"

          # Check if any drizzle migration files changed
          MIGRATION_FILES=$(echo "$CHANGED_FILES" | grep '^drizzle/' || true)

          if [ -z "$MIGRATION_FILES" ]; then
            echo "::notice::No migration files changed. Skipping migration."
            echo "has_migrations=false" >> $GITHUB_OUTPUT
          else
            echo "Migration files detected:"
            echo "$MIGRATION_FILES"
            echo "has_migrations=true" >> $GITHUB_OUTPUT
            echo "migration_files<<EOF" >> $GITHUB_OUTPUT
            echo "$MIGRATION_FILES" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
          fi

      - name: Setup pnpm
        if: steps.check-migrations.outputs.has_migrations == 'true'
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        if: steps.check-migrations.outputs.has_migrations == 'true'
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - name: Install dependencies
        if: steps.check-migrations.outputs.has_migrations == 'true'
        run: pnpm install --frozen-lockfile

      - name: Run database migrations
        if: steps.check-migrations.outputs.has_migrations == 'true'
        id: migrate
        run: |
          echo "🚀 Applying database migrations to production..."
          pnpm db:migrate 2>&1 | tee migration-output.txt
          MIGRATE_EXIT_CODE=${PIPESTATUS[0]}

          if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
            echo "migrate_status=success" >> $GITHUB_OUTPUT
            echo "✅ Migrations applied successfully"
          else
            echo "migrate_status=failed" >> $GITHUB_OUTPUT
            echo "❌ Migration failed with exit code $MIGRATE_EXIT_CODE"
            exit $MIGRATE_EXIT_CODE
          fi

      - name: Create job summary
        if: always()
        run: |
          echo "## 🗄️ Production Database Migration" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Commit:** \`${{ github.sha }}\`" >> $GITHUB_STEP_SUMMARY
          echo "**Branch:** main" >> $GITHUB_STEP_SUMMARY
          echo "**Triggered by:** ${{ github.actor }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          if [ "${{ steps.check-migrations.outputs.has_migrations }}" == "false" ]; then
            echo "### ⏭️ Skipped" >> $GITHUB_STEP_SUMMARY
            echo "No migration files were changed in this commit." >> $GITHUB_STEP_SUMMARY
          elif [ "${{ steps.migrate.outputs.migrate_status }}" == "success" ]; then
            echo "### ✅ Success" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "**Migration files applied:**" >> $GITHUB_STEP_SUMMARY
            echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
            echo "${{ steps.check-migrations.outputs.migration_files }}" >> $GITHUB_STEP_SUMMARY
            echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
            if [ -f migration-output.txt ]; then
              echo "" >> $GITHUB_STEP_SUMMARY
              echo "<details><summary>Migration Output</summary>" >> $GITHUB_STEP_SUMMARY
              echo "" >> $GITHUB_STEP_SUMMARY
              echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
              cat migration-output.txt >> $GITHUB_STEP_SUMMARY
              echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
              echo "</details>" >> $GITHUB_STEP_SUMMARY
            fi
          else
            echo "### ❌ Failed" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "**Migration files:**" >> $GITHUB_STEP_SUMMARY
            echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
            echo "${{ steps.check-migrations.outputs.migration_files }}" >> $GITHUB_STEP_SUMMARY
            echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
            if [ -f migration-output.txt ]; then
              echo "" >> $GITHUB_STEP_SUMMARY
              echo "**Error output:**" >> $GITHUB_STEP_SUMMARY
              echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
              cat migration-output.txt >> $GITHUB_STEP_SUMMARY
              echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
            fi
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "⚠️ **Manual intervention required.** Check the error above and apply migrations manually if needed." >> $GITHUB_STEP_SUMMARY
          fi

      - name: Upload migration output
        if: always() && steps.check-migrations.outputs.has_migrations == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: migration-output
          path: migration-output.txt
          retention-days: 30
          if-no-files-found: ignore
```

### Alternative: Manual Trigger Support

To also support manual migrations (useful for rollback or re-running), add `workflow_dispatch`:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "drizzle/**"
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "MIGRATE" to confirm manual migration'
        required: true
```

Then add validation:

```yaml
- name: Validate manual trigger
  if: github.event_name == 'workflow_dispatch'
  run: |
    if [ "${{ github.event.inputs.confirm }}" != "MIGRATE" ]; then
      echo "::error::Manual migration requires typing 'MIGRATE' to confirm"
      exit 1
    fi
    echo "✅ Manual migration confirmed"
```

### Security Considerations

1. **Separate Secrets:** Production database uses `DATABASE_URL_PRODUCTION`, completely separate from integration test `DATABASE_URL`
2. **No Auto-Retry:** Failed migrations do NOT automatically retry - this prevents cascading failures
3. **Concurrency Lock:** Only one migration can run at a time (`cancel-in-progress: false`)
4. **PR Merge Only:** The `if` condition prevents direct pushes to main from triggering migrations
5. **Audit Trail:** Job summary and artifacts provide complete audit trail

### Drizzle Migration Command

The project uses Drizzle ORM. The migration command is:

```bash
pnpm db:migrate  # Runs: drizzle-kit migrate
```

This applies all pending migrations from the `drizzle/` folder to the database.

### Rollback Procedure

Drizzle Kit does not have built-in rollback. If a migration fails or needs to be reverted:

1. **Manual SQL:** Write and execute reverse SQL manually
2. **New Migration:** Create a new migration that undoes the changes
3. **Restore Backup:** Restore from Supabase point-in-time recovery

Document this in troubleshooting section.

## Dev Agent Record

### Implementation Plan

Infrastructure story implementing automated production database migrations via GitHub Actions.

**Key Implementation Decisions:**

1. **Separate Production Secret:** Used `DATABASE_URL_PRODUCTION` distinct from integration test `DATABASE_URL` to prevent accidental production access during tests
2. **PR Merge Only Trigger:** Added condition to only trigger on merged PRs (checking commit message for "Merge pull request")
3. **Manual Trigger Support:** Added `workflow_dispatch` with required confirmation ("MIGRATE") for manual migrations
4. **No Auto-Retry:** Explicitly designed to fail without retry to prevent cascading failures
5. **Concurrency Lock:** Used `cancel-in-progress: false` to never cancel running migrations
6. **Comprehensive Job Summary:** Includes commit SHA, actor, timestamp, migration files, and detailed output

### Completion Notes

- Created production migration workflow at `.github/workflows/db-migrate-production.yml`
- Workflow triggers on push to main when `drizzle/**` files change
- Added secret validation step that fails early with helpful error message
- Migration detection compares HEAD~1 to HEAD for changed files
- Job summary provides complete audit trail with success/failure status
- Migration output artifact retained for 30 days
- Updated `docs/development-setup.md` with:
  - New "Production Database Migrations" section with full documentation
  - Added `DATABASE_URL_PRODUCTION` to required secrets table
  - Troubleshooting guide for common migration failures
  - Rollback procedures (reverse migration, manual SQL, point-in-time recovery)
- Task 7 (Create GitHub Secret) is intentionally left unchecked - requires manual admin action

### Debug Log

No issues encountered during implementation.

## Senior Developer Review (AI)

**Reviewer:** Bmad (Code Review Workflow)
**Date:** 2026-01-02
**Outcome:** Approved with fixes applied

### Issues Found and Fixed

| Severity | Issue                                                                                         | Fix Applied                                                                                            |
| -------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| HIGH     | PR merge detection relied on fragile commit message parsing (squash/rebase merges would fail) | Added multi-pattern detection: `web-flow` committer + merge commit patterns + PR number pattern `(#N)` |
| HIGH     | AC numbering used 7.7.x instead of 6.7.x (Story 6.7)                                          | Corrected all AC references from AC-7.7.x to AC-6.7.x                                                  |
| MEDIUM   | Exit code capture pattern was incorrect (`PIPESTATUS[0]` in else branch is always 0)          | Added `set -o pipefail` and proper exit code capture after pipe                                        |
| MEDIUM   | Job summary could exceed GitHub's ~1MB size limit with large migration output                 | Added 50KB truncation with "see artifacts for full log" message                                        |
| LOW      | Documentation date showed 2025-12-29 instead of 2026-01-02                                    | Updated to current date                                                                                |

### Verification

- [x] All HIGH issues fixed
- [x] All MEDIUM issues fixed
- [x] All LOW issues fixed
- [x] Workflow YAML syntax valid
- [x] All ACs implemented correctly
- [x] Documentation updated

## File List

**New Files:**

- `.github/workflows/db-migrate-production.yml` - Production database migration workflow

**Modified Files:**

- `docs/development-setup.md` - Added Production Database Migrations section and updated secrets table

## Change Log

| Date       | Change                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| 2026-01-02 | Initial story creation for production DB migration                           |
| 2026-01-02 | Implemented production migration workflow and documentation                  |
| 2026-01-02 | Code review: Fixed PR detection, exit codes, AC numbering, output truncation |
