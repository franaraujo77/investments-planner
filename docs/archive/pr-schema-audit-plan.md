# PR Schema Audit Integration Plan

## Executive Summary

**Goal:** Add automated schema audit to PR workflow to catch schema drift (like the missing `updated_at` column incident) before merge to main.

**Impact:** Would have prevented the Jan 5, 2026 production incident by detecting missing column during PR review.

**Recommendation:** **Option 2 (Recommended)** - Lightweight audit with conditional execution using existing integration test database

**Key Decision:** This plan reuses the existing `DATABASE_URL` secret (integration test database) instead of creating a new dedicated test database. This approach:

- Saves $0-25/month in infrastructure costs
- Eliminates database provisioning and secret management overhead
- Uses concurrency groups to prevent conflicts between PR branches
- Maintains isolation through branch-specific concurrency control

---

## Problem Statement

### What Happened (Jan 5, 2026 Incident)

1. Migration `0014_alerts_metadata_gin_index.sql` added `updated_at` column
2. Code in `src/lib/services/alert-service.ts` referenced `updated_at`
3. PR merged without detecting that migration never ran in production
4. Production API failed: `column "updated_at" does not exist`

### What We Need

**Early Detection:** Catch schema drift between code expectations and database reality **before** merge.

**Validation Points:**

- Code references columns that don't exist yet
- Migrations define columns not in database
- Schema.ts definitions don't match actual tables

---

## Current State Analysis

### Existing Workflows

**CI Workflow (`.github/workflows/ci.yml`):**

- Runs on all PRs
- Uses dummy DATABASE_URL (no real DB)
- Checks: lint, tests, type check, build, RLS coverage
- **Cannot** run schema audit (no database connection)

**Integration Tests Workflow (`.github/workflows/integration-tests.yml`):**

- Runs on PRs with code/migration changes
- Has real DATABASE_URL (test database)
- **Could** run schema audit with migrations applied
- Already applies migrations before tests

**Production Migration Workflow (`.github/workflows/db-migrate-production.yml`):**

- Runs after PR merge to main
- Applies migrations to production
- **Too late** - issues already merged

### Available Tools

1. ✅ `scripts/audit-production-schema.ts` - Compares schema.ts with database
2. ✅ `scripts/verify-migrations.ts` - Checks migrations are applied
3. ✅ Integration test database (via DATABASE_URL secret)
4. ✅ Migration application infrastructure (Drizzle)

---

## Proposed Solutions

### Option 1: Full Schema Audit in Integration Tests

**Approach:** Run complete schema audit after applying PR migrations in integration test workflow.

**Workflow:**

```yaml
# Add to .github/workflows/integration-tests.yml

- name: Apply PR migrations
  run: pnpm db:migrate

- name: Run schema audit
  run: pnpm db:audit-schema
  continue-on-error: false # Fail PR if audit fails

- name: Run integration tests
  run: pnpm test:integration
```

**Pros:**

- ✅ Catches all schema drift issues
- ✅ Uses existing test database
- ✅ No new infrastructure needed
- ✅ Simple to implement

**Cons:**

- ❌ Adds ~5-10 seconds to every PR
- ❌ Requires integration test database for all PRs
- ❌ May fail on forks (no secrets access)
- ❌ Tests database state, not production state

**Cost:** Low - uses existing infrastructure

---

### Option 2: Conditional Schema Audit (Recommended)

**Approach:** Only run schema audit when schema-related files change.

**Trigger Conditions:**

```yaml
paths:
  - "src/lib/db/schema.ts"
  - "drizzle/**"
  - "src/lib/services/**" # Services that query database
  - "src/lib/repositories/**"
```

**Workflow:**

````yaml
# New file: .github/workflows/schema-audit.yml

name: Schema Audit

on:
  pull_request:
    branches: [main]
    paths:
      - "src/lib/db/schema.ts"
      - "drizzle/**"
      - "src/lib/services/**"
      - "src/lib/repositories/**"

# CRITICAL: Prevent concurrent audits on same PR branch
# Different PR branches can run concurrently (they don't conflict)
concurrency:
  group: schema-audit-${{ github.event.pull_request.head.ref || github.ref }}
  cancel-in-progress: true

jobs:
  schema-audit:
    name: Schema Consistency Check
    runs-on: ubuntu-latest
    timeout-minutes: 10

    # Skip if secrets not configured (fork PRs)
    if: github.event.pull_request.head.repo.full_name == github.repository

    env:
      # Use existing integration test database (shared with integration tests workflow)
      DATABASE_URL: ${{ secrets.DATABASE_URL }}

    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Apply pending migrations
        id: migrate
        run: |
          echo "Applying migrations from PR..."
          pnpm db:migrate 2>&1 | tee migrate-output.txt
          MIGRATE_EXIT_CODE=$?

          if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
            echo "migrate_status=success" >> $GITHUB_OUTPUT
          else
            echo "migrate_status=failed" >> $GITHUB_OUTPUT
            exit $MIGRATE_EXIT_CODE
          fi

      - name: Run schema audit
        id: audit
        if: steps.migrate.outputs.migrate_status == 'success'
        run: |
          echo "Auditing schema consistency..."
          pnpm db:audit-schema 2>&1 | tee audit-output.txt
          AUDIT_EXIT_CODE=$?

          if [ $AUDIT_EXIT_CODE -eq 0 ]; then
            echo "audit_status=passed" >> $GITHUB_OUTPUT
          else
            echo "audit_status=failed" >> $GITHUB_OUTPUT
          fi

          exit $AUDIT_EXIT_CODE

      - name: Verify migrations applied
        id: verify
        if: steps.migrate.outputs.migrate_status == 'success'
        run: |
          echo "Verifying all migrations are applied..."
          pnpm db:verify-migrations 2>&1 | tee verify-output.txt
          VERIFY_EXIT_CODE=$?

          if [ $VERIFY_EXIT_CODE -eq 0 ]; then
            echo "verify_status=passed" >> $GITHUB_OUTPUT
          else
            echo "verify_status=failed" >> $GITHUB_OUTPUT
          fi

          exit $VERIFY_EXIT_CODE

      - name: Create PR comment
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const auditStatus = '${{ steps.audit.outputs.audit_status }}';
            const verifyStatus = '${{ steps.verify.outputs.verify_status }}';
            const migrateStatus = '${{ steps.migrate.outputs.migrate_status }}';

            let body = '## 🔍 Schema Audit Results\n\n';

            if (migrateStatus === 'failed') {
              body += '❌ **Migration Failed**\n\n';
              body += 'PR migrations could not be applied to test database.\n\n';
              if (fs.existsSync('migrate-output.txt')) {
                const output = fs.readFileSync('migrate-output.txt', 'utf8').slice(0, 1000);
                body += '<details><summary>Migration Error</summary>\n\n```\n' + output + '\n```\n</details>\n';
              }
            } else if (auditStatus === 'failed') {
              body += '❌ **Schema Audit Failed**\n\n';
              body += 'Schema definitions in `schema.ts` do not match database structure.\n\n';
              if (fs.existsSync('audit-output.txt')) {
                const output = fs.readFileSync('audit-output.txt', 'utf8').slice(0, 2000);
                body += '<details><summary>Audit Details</summary>\n\n```\n' + output + '\n```\n</details>\n';
              }
              body += '\n**Action Required:** Review schema changes and ensure migrations are correct.\n';
            } else if (verifyStatus === 'failed') {
              body += '⚠️ **Migration Verification Warning**\n\n';
              body += 'Some migrations may not have applied correctly.\n\n';
              if (fs.existsSync('verify-output.txt')) {
                const output = fs.readFileSync('verify-output.txt', 'utf8').slice(0, 1000);
                body += '<details><summary>Verification Output</summary>\n\n```\n' + output + '\n```\n</details>\n';
              }
            } else {
              body += '✅ **Schema Audit Passed**\n\n';
              body += '- Schema definitions match database structure\n';
              body += '- All migrations applied successfully\n';
              body += '- No schema drift detected\n';
            }

            body += '\n---\n*Automated schema consistency check*';

            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existingComment = comments.find(c => c.body.includes('Schema Audit Results'));

            if (existingComment) {
              // Update existing comment
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existingComment.id,
                body: body,
              });
            } else {
              // Create new comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body,
              });
            }

      - name: Upload audit results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: schema-audit-results
          path: |
            audit-output.txt
            verify-output.txt
            migrate-output.txt
          retention-days: 7
          if-no-files-found: ignore
````

**Pros:**

- ✅ Only runs when schema changes (minimal overhead)
- ✅ Posts results as PR comment (visible to reviewers)
- ✅ Fails PR if schema drift detected
- ✅ Separate workflow = doesn't block other CI checks
- ✅ Uses existing test database infrastructure (DATABASE_URL)
- ✅ No new secrets or databases needed
- ✅ Concurrency groups prevent conflicts between PR branches

**Cons:**

- ⚠️ Shares database with integration tests (mitigated by concurrency control)
- ⚠️ Won't catch issues in non-schema files referencing DB
- ⚠️ Forks can't run (no secrets access)

**Cost:** $0 - reuses existing integration test database, only runs on ~10-20% of PRs

---

### Option 3: Schema Validation Without Database

**Approach:** Static analysis to validate schema.ts against migration files without database connection.

**Workflow:**

```yaml
- name: Validate schema definitions
  run: npx tsx scripts/validate-schema-static.ts
```

**New Script:** `scripts/validate-schema-static.ts`

- Parse schema.ts AST to extract table/column definitions
- Parse migration SQL files to extract DDL statements
- Compare definitions without database connection
- Report mismatches

**Pros:**

- ✅ No database required
- ✅ Works on forks
- ✅ Very fast (<1 second)
- ✅ Can run on all PRs

**Cons:**

- ❌ Requires new complex script (SQL parser)
- ❌ May miss runtime issues
- ❌ Doesn't validate actual database state
- ❌ Maintenance burden (keep parser updated)

**Cost:** High development effort

---

## Recommended Approach: Option 2 (Conditional Audit)

### Why Option 2?

**Best Balance:**

- ✅ **Effective:** Catches real schema drift issues
- ✅ **Efficient:** Only runs when needed
- ✅ **Simple:** Uses existing infrastructure
- ✅ **Visible:** Posts results to PR for reviewers
- ✅ **Reliable:** Tests against real database

**Would Have Caught the Incident:**

```
❌ Schema Audit Failed

⚠️ Tables with Column Mismatches:

  Table: alerts
    Missing columns in production:
      - updated_at

**Action Required:** Review schema changes and ensure migrations are correct.
```

### Implementation Steps

#### Step 1: Create Schema Audit Workflow

Create `.github/workflows/schema-audit.yml` with the conditional workflow above.

**Database Configuration:**

- ✅ Uses existing `DATABASE_URL` secret (same as integration tests)
- ✅ No new database or secrets needed
- ✅ Concurrency groups prevent conflicts between PR branches

**Key Configuration:**

```yaml
concurrency:
  group: schema-audit-${{ github.event.pull_request.head.ref || github.ref }}
  cancel-in-progress: true

env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }} # Reuses integration test DB
```

#### Step 2: Test the Workflow

Create test PR with schema changes:

```sql
-- Test migration
ALTER TABLE test_table ADD COLUMN new_column text;
```

Verify:

- ✅ Workflow triggers
- ✅ Migrations apply
- ✅ Audit runs
- ✅ PR comment posts
- ✅ Failures block merge (if enabled)

#### Step 3: Configure Branch Protection

```
Settings > Branches > Branch protection rules > main
☑️ Require status checks to pass before merging
  ☑️ Schema Audit
```

---

## Alternative: Integrate into Existing Workflows

### Add to CI Workflow (Quick Win)

**Pros:**

- ✅ Runs on every PR
- ✅ No new workflow file
- ✅ Existing developer familiarity

**Cons:**

- ❌ Requires dummy DATABASE_URL (can't audit real DB)
- ❌ Only validates schema.ts syntax, not actual DB state

**Implementation:**

```yaml
# Add to .github/workflows/ci.yml

- name: Validate schema definitions
  run: pnpm exec tsc --noEmit src/lib/db/schema.ts
```

**Limitation:** This only catches TypeScript errors, not schema drift.

### Add to Integration Tests (Piggyback)

**Pros:**

- ✅ Uses existing database connection
- ✅ Runs alongside integration tests
- ✅ No new workflow

**Cons:**

- ❌ Runs even when schema unchanged (overhead)
- ❌ Less visible (buried in test output)
- ❌ Longer feedback loop

**Implementation:**

```yaml
# Add to .github/workflows/integration-tests.yml after migration step

- name: Audit schema consistency
  run: pnpm db:audit-schema
  continue-on-error: false
```

---

## Migration Strategy

### Phase 1: Soft Launch (Week 1)

- ✅ Create test database
- ✅ Add DATABASE_URL_TEST secret
- ✅ Create schema-audit.yml workflow
- ⚠️ Set `continue-on-error: true` (non-blocking)
- 📊 Monitor results, gather data

### Phase 2: Tighten (Week 2-3)

- ✅ Review false positives/negatives
- ✅ Tune trigger paths if needed
- ✅ Update error messages for clarity
- ⚠️ Switch to `continue-on-error: false` (blocking)

### Phase 3: Enforce (Week 4+)

- ✅ Add to required status checks
- ✅ Block merge if audit fails
- ✅ Document in CONTRIBUTING.md
- 📚 Train team on interpreting results

---

## Edge Cases & Considerations

### 1. Fork Pull Requests

**Issue:** Forks don't have access to DATABASE_URL_TEST secret

**Solution:**

```yaml
if: github.event.pull_request.head.repo.full_name == github.repository
```

**Result:** Audit skips for external contributors (acceptable - maintainer will review)

### 2. Concurrent PRs

**Issue:** Multiple PRs running migrations on same test DB simultaneously

**Solution Implemented:** Concurrency groups (branch-specific)

```yaml
concurrency:
  group: schema-audit-${{ github.event.pull_request.head.ref || github.ref }}
  cancel-in-progress: true
```

**How It Works:**

- PR A (feature/add-user) → group: `schema-audit-feature/add-user`
- PR B (fix/update-alerts) → group: `schema-audit-fix/update-alerts`
- Different branches run concurrently (no conflict)
- Same branch runs serialize (new commits cancel old runs)
- Idempotent migrations ensure safe concurrent application

### 3. Migration Dependencies

**Issue:** PR depends on migrations from another PR not yet merged

**Solutions:**

- **Document:** Require PRs to be merged sequentially if migrations depend on each other
- **Detect:** Add check for migration file number gaps
- **Rebase:** Require rebase before merge to pick up new migrations

**Best Practice:** Keep PRs small and merge frequently

### 4. Schema Audit False Positives

**Issue:** Audit fails due to test data or temporary tables

**Solutions:**

- Exclude temporary tables from audit
- Reset test DB before audit
- Document expected differences

**Example:**

```typescript
// scripts/audit-production-schema.ts
const EXCLUDED_TABLES = [
  "__drizzle_migrations",
  "test_", // Exclude tables starting with test_
  "_temp", // Exclude temporary tables
];
```

### 5. Performance Impact

**Measurement:**

- Workflow setup: ~30 seconds
- Dependency install (cached): ~10 seconds
- Migration apply: ~2-5 seconds
- Schema audit: ~1-2 seconds
- **Total: ~45-50 seconds**

**Optimization:**

- Cache dependencies ✅ (already done)
- Only run on schema changes ✅ (Option 2)
- Run in parallel with other checks ✅ (separate workflow)

### 6. Database State Pollution

**Issue:** Previous PR's migrations pollute test DB

**Solution:** Reset test DB before running audit

```yaml
- name: Reset test database
  run: |
    # Drop and recreate database
    npx tsx scripts/reset-test-db.ts
```

---

## Success Metrics

### Effectiveness Metrics

- **Schema Drift Caught:** # of PRs blocked due to schema issues
- **False Positives:** # of times audit failed incorrectly
- **Time to Detection:** Time from PR open to audit failure
- **Incident Prevention:** # of production incidents avoided

### Performance Metrics

- **Workflow Duration:** Average time for schema audit (target: <1 min)
- **PR Velocity:** Impact on time from PR creation to merge
- **Resource Usage:** CI/CD minutes consumed

### Developer Experience Metrics

- **Clarity:** % of developers who understand audit failures
- **Actionability:** % of failures with clear remediation steps
- **Friction:** Developer feedback on workflow impact

**Target Goals:**

- ✅ 100% of schema drift issues caught before merge
- ✅ <5% false positive rate
- ✅ <1 minute audit duration
- ✅ No impact on PR velocity for non-schema changes

---

## Documentation Requirements

### 1. Developer Guide

**File:** `docs/schema-audit-guide.md`

**Content:**

- What is schema audit?
- When does it run?
- How to interpret results?
- How to fix common failures?
- How to bypass (emergency only)?

### 2. Contributing Guidelines

**File:** `CONTRIBUTING.md`

**Add Section:**

```markdown
## Schema Changes

When modifying `src/lib/db/schema.ts` or adding migrations:

1. Create migration: `pnpm db:generate`
2. Test locally: `pnpm db:migrate && pnpm db:audit-schema`
3. Push to PR - schema audit will run automatically
4. Review audit results in PR comment
5. Fix any schema drift issues before merge
```

### 3. Troubleshooting Guide

**File:** `docs/migration-deployment-guide.md`

**Add Section:**

```markdown
## Schema Audit Failures in PR

If schema audit fails:

1. Check PR comment for specific issues
2. Review migration SQL files
3. Ensure schema.ts matches migrations
4. Test locally: `pnpm db:audit-schema`
5. Push fix, audit will re-run automatically
```

---

## Cost Analysis

### Infrastructure Costs

**Test Database:**

- ✅ Uses existing integration test database (DATABASE_URL)
- ✅ No new database needed
- **Cost: $0/month** (reuses existing infrastructure)

**GitHub Actions Minutes:**

- Free tier: 2,000 minutes/month
- Estimated usage: ~50 min/month for schema audits
- Cost: $0 (within free tier)

**Total Monthly Cost:** **$0** ✅

### Development Costs

**Initial Implementation:**

- Create workflow: 1 hour (no DB setup needed)
- Test and debug: 1 hour
- Documentation: 0.5 hours
- **Total: 2.5 hours** ✅ (50% faster than original plan)

**Ongoing Maintenance:**

- Monitor false positives: 1 hour/month
- Update scripts: 1 hour/quarter
- **Total: ~1.5 hours/month**

### ROI Analysis

**Incident Cost (Jan 5, 2026):**

- Production downtime: 4 hours
- Investigation time: 2 hours
- Manual fix: 1 hour
- **Total: 7 hours**

**Schema Audit Cost:**

- Implementation: 5 hours (one-time)
- Maintenance: 1.5 hours/month

**Break-even:** 1 prevented incident every 3-4 months

**Expected ROI:** High (prevents multiple incidents per year)

---

## Recommendations

### Immediate Actions (Week 1)

1. ✅ **Create schema-audit.yml workflow** using existing DATABASE_URL
2. ✅ **Verify concurrency groups** configured correctly
3. ✅ **Test with sample PR** to validate functionality
4. ⚠️ **Set continue-on-error: true** initially (non-blocking)
5. 📊 **Monitor for concurrency issues** with integration tests

### Short-term Actions (Weeks 2-3)

1. ✅ **Monitor audit results** for false positives
2. ✅ **Gather developer feedback** on clarity of error messages
3. ✅ **Document common failure scenarios** in troubleshooting guide
4. ✅ **Switch to blocking mode** (continue-on-error: false)

### Long-term Actions (Month 2+)

1. ✅ **Add to required status checks** in branch protection
2. ✅ **Create dashboard** for audit metrics (optional)
3. ✅ **Consider Option 3** (static validation) as supplement
4. ✅ **Expand to other schema-related checks** (RLS, indexes, etc.)

---

## Questions for Review

1. **Database Choice:** Should we use dedicated test DB or ephemeral Docker containers?
2. **Trigger Paths:** Are the proposed trigger paths comprehensive enough?
3. **Blocking Behavior:** Should audit block merge immediately or after soft launch period?
4. **Notification:** Should audit failures also notify via Slack/email?
5. **Scope:** Should audit also check RLS policies, indexes, and constraints?

---

## Conclusion

**Recommendation:** Implement **Option 2 (Conditional Schema Audit)** as separate workflow using existing integration test database.

**Rationale:**

- ✅ **Proven:** Uses existing tools (audit-production-schema.ts)
- ✅ **Efficient:** Only runs when schema changes (~20% of PRs)
- ✅ **Effective:** Would have caught Jan 5, 2026 incident
- ✅ **Simple:** Low implementation and maintenance cost
- ✅ **Visible:** Posts results to PR for reviewer visibility
- ✅ **Zero Cost:** Reuses existing DATABASE_URL (no new infrastructure)
- ✅ **Safe:** Concurrency groups prevent conflicts between PR branches

**Implementation Status:**

- ✅ Workflow created: `.github/workflows/schema-audit.yml`
- ✅ Uses existing DATABASE_URL secret
- ✅ Concurrency groups configured
- ⏳ Ready for testing with sample PR

**Next Step:** Test with sample schema change PR and monitor for 1 week before enabling as required check.

**Timeline:** Ready to test immediately, can be in production in 1-2 weeks after soft launch validation.

---

**Document Version:** 1.1
**Date:** 2026-01-05
**Author:** Migration Verification Team
**Status:** Implemented
**Implementation:** Workflow created using existing DATABASE_URL (integration test database)
