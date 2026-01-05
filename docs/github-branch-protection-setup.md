# GitHub Branch Protection Setup

## Phase 3: Enforcing Schema Audit as Required Status Check

This document explains how to configure GitHub branch protection rules to make the Schema Audit workflow a **required status check** that blocks merges when schema drift is detected.

---

## Prerequisites

- **Repository admin access** required
- Schema Audit workflow already deployed (`.github/workflows/schema-audit.yml`)
- At least one successful workflow run (creates the status check)

---

## Configuration Steps

### Step 1: Navigate to Branch Protection Settings

1. Go to your repository on GitHub
2. Click **Settings** (requires admin access)
3. Click **Branches** in the left sidebar
4. Find **Branch protection rules** section
5. Click **Add rule** (or **Edit** if `main` branch rule exists)

### Step 2: Configure Rule for `main` Branch

**Branch name pattern:**

```
main
```

### Step 3: Enable Required Status Checks

Check the following boxes:

- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging** (recommended)

### Step 4: Add Schema Audit as Required Check

In the **Status checks** search box, type:

```
Schema Consistency Check
```

**Important:** The check will only appear in the list after it has run at least once. If you don't see it:

1. Create a test PR with a schema change
2. Wait for the workflow to run
3. Return to branch protection settings
4. The check should now appear in the searchable list

Select **Schema Consistency Check** to add it as a required check.

### Step 5: Additional Recommended Settings

For production-grade protection, also enable:

- ✅ **Require a pull request before merging**
  - Require approvals: **1** (minimum)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings** (prevents admins from bypassing)

---

## Verification

### Test the Protection

1. **Create a test PR** that intentionally breaks schema audit:

   ```sql
   -- drizzle/9999_test_missing_column.sql
   ALTER TABLE test_table ADD COLUMN new_col TEXT;
   ```

2. **Update schema.ts** but omit the new column (creates drift)

3. **Push the PR** and verify:
   - ✅ Schema Audit workflow runs
   - ❌ Audit fails (detects missing column)
   - 🚫 **Merge button is blocked** with message: "Required status check has not passed"

4. **Fix the drift** (add column to schema.ts)

5. **Push again** and verify:
   - ✅ Schema Audit passes
   - ✅ Merge button becomes available

---

## Workflow Behavior After Enforcement

### For PRs Without Schema Changes

```
✅ Schema Audit Status: Passed (skipped - no schema files changed)
✅ Merge button: Available
```

The audit runs but immediately passes with a "skipped" status, allowing merge.

### For PRs With Schema Changes

**Success Case:**

```
✅ Schema files detected
✅ Migrations applied successfully
✅ Schema audit passed (no drift)
✅ Verification passed
→ Merge button: Available
```

**Failure Case:**

```
✅ Schema files detected
✅ Migrations applied successfully
❌ Schema audit failed (drift detected)
→ Merge button: BLOCKED 🚫
```

Developer must fix the issue and push again before merge is allowed.

---

## Metrics Dashboard (GitHub Actions)

After enabling, you can track metrics in two places:

### 1. Workflow Run Summary

Each run displays a metrics table:

```markdown
## 📊 Schema Audit Metrics

| Metric                  | Value   |
| ----------------------- | ------- |
| Audit Run               | ✅ Yes  |
| Schema Changes Detected | true    |
| Migration Status        | success |
| Audit Status            | passed  |
| Verify Status           | passed  |
| Execution Time          | 42s     |
| Workflow Conclusion     | success |

**PR:** #30
**Branch:** feature/new-table
**Commit:** abc123def
```

### 2. Workflow Insights

Navigate to **Actions → Schema Audit → View workflow file** to see:

- Total runs
- Success rate
- Average execution time
- Failure trends

---

## Monitoring and Maintenance

### Key Metrics to Track

| Metric                  | Target        | Action If Off-Target                 |
| ----------------------- | ------------- | ------------------------------------ |
| **Success Rate**        | > 95%         | Investigate false positives          |
| **Execution Time**      | < 60s         | Optimize audit queries               |
| **False Positive Rate** | < 5%          | Refine file detection patterns       |
| **Audit Skips**         | 80-90% of PRs | Normal (most PRs don't touch schema) |

### Monthly Review Checklist

- [ ] Review failed audits for patterns
- [ ] Check execution time trends (should be stable)
- [ ] Gather developer feedback on error clarity
- [ ] Update troubleshooting docs with new scenarios
- [ ] Verify no workflow permissions issues

---

## Troubleshooting

### Issue: "Schema Consistency Check" not appearing in status checks list

**Cause:** The workflow hasn't run yet or doesn't create a check name.

**Solution:**

1. Open `.github/workflows/schema-audit.yml`
2. Verify `name:` at line 1 is `Schema Audit`
3. Verify job name at line 26 is `Schema Consistency Check`
4. Create a test PR to trigger the workflow
5. Wait for it to complete
6. Refresh branch protection settings

### Issue: Workflow passes but merge still blocked

**Cause:** Branch is out of date with `main`.

**Solution:**

1. Enable "Require branches to be up to date" in branch protection
2. Click "Update branch" button on PR
3. Wait for re-run
4. Merge button will unlock if audit passes

### Issue: False positives (audit fails but schema is correct)

**Cause:** Edge case in detection logic or stale test database.

**Solution:**

1. Check audit output artifact for details
2. Verify `schema.ts` matches intended database state
3. If false positive, document in issue and adjust audit logic
4. Track false positive rate (target < 5%)

---

## Rollback Procedure

If the enforcement causes issues:

### Temporary Disable (Emergency)

1. Go to **Settings → Branches → Edit rule for `main`**
2. Uncheck **Schema Consistency Check** in required checks
3. Save changes
4. **Document the incident** (why it was disabled)
5. Create issue to fix root cause
6. Re-enable after fix is deployed

### Permanent Disable

Only if fundamentally broken:

1. Remove required check (as above)
2. Add `continue-on-error: true` to workflow (makes non-blocking)
3. Schedule retrospective to understand why it failed
4. Consider alternative approaches (static validation, pre-commit hooks)

---

## Success Criteria

Phase 3 is **successfully implemented** when:

- ✅ Schema Audit is required status check on `main` branch
- ✅ Merge is blocked when audit fails
- ✅ Metrics are tracked and visible in workflow summaries
- ✅ Developer documentation explains how to interpret results
- ✅ Team has been trained on the audit process
- ✅ First month of data shows < 5% false positive rate
- ✅ Average execution time < 60 seconds

---

## Next Steps

After configuration:

1. **Announce to team**: Send message explaining new requirement
2. **Monitor first week**: Watch for issues and gather feedback
3. **Document common failures**: Update troubleshooting guide
4. **Track metrics**: Review weekly for first month
5. **Iterate**: Refine based on real-world usage

---

## References

- [PR #30: Migration Verification and Schema Audit Tools](../../../pull/30)
- [Migration Deployment Guide](./migration-deployment-guide.md)
- [Schema Audit Workflow](../.github/workflows/schema-audit.yml)
- [GitHub Docs: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

---

**Last Updated:** 2026-01-05
**Status:** Phase 3 - Ready for Implementation
