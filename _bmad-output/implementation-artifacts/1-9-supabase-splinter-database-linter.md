# Story 1.9: Supabase Splinter Database Linter Integration

Status: done

## Story

As a **developer maintaining database schema quality**,
I want **automated database linting using Supabase Splinter**,
so that **I can catch schema issues (missing indexes, RLS misconfigurations, security vulnerabilities) before they reach production**.

## Background

Supabase raised linting issues in our migration scripts. Supabase Splinter is their official PostgreSQL linter that runs SQL queries against a live database to identify common schema issues. Unlike static SQL linters, Splinter analyzes the actual database state.

### What is Splinter?

Splinter is a SQL-based database linter from Supabase that queries PostgreSQL schema to identify:

- **Performance issues**: Unindexed foreign keys, unused/duplicate indexes, table bloat
- **Security issues**: Exposed auth.users, missing RLS, insecure policies, security definer views
- **Schema issues**: Missing primary keys, extensions in public schema
- **API exposure issues**: Materialized views, foreign tables, queues without RLS
- **Upgrade blockers**: Unsupported reg\* types preventing pg_upgrade

### Available Lint Rules (21 total)

| Category    | Lint                            | Severity | Description                              |
| ----------- | ------------------------------- | -------- | ---------------------------------------- |
| Performance | `unindexed_foreign_keys`        | WARN     | FKs without covering indexes             |
| Performance | `unused_index`                  | INFO     | Indexes never used                       |
| Performance | `duplicate_index`               | WARN     | Identical indexes                        |
| Performance | `table_bloat`                   | WARN     | Tables with excessive bloat              |
| Security    | `auth_users_exposed`            | ERROR    | auth.users exposed to anon/authenticated |
| Security    | `rls_disabled_in_public`        | ERROR    | Tables in public schema without RLS      |
| Security    | `rls_enabled_no_policy`         | WARN     | RLS enabled but no policies              |
| Security    | `policy_exists_rls_disabled`    | WARN     | Policies exist but RLS disabled          |
| Security    | `security_definer_view`         | WARN     | Views using SECURITY DEFINER             |
| Security    | `function_search_path_mutable`  | WARN     | Functions without fixed search_path      |
| Security    | `rls_references_user_metadata`  | ERROR    | RLS policies using editable metadata     |
| Security    | `multiple_permissive_policies`  | WARN     | Multiple permissive RLS policies         |
| Schema      | `no_primary_key`                | WARN     | Tables without primary keys              |
| Schema      | `extension_in_public`           | WARN     | Extensions installed in public schema    |
| API         | `materialized_view_in_api`      | WARN     | Materialized views exposed via API       |
| API         | `foreign_table_in_api`          | WARN     | Foreign tables exposed via API           |
| API         | `insecure_queue_exposed_in_api` | ERROR    | pgmq queues without RLS                  |
| Upgrade     | `unsupported_reg_types`         | ERROR    | Types preventing pg_upgrade              |
| Auth        | `auth_rls_initplan`             | WARN     | Inefficient RLS policy patterns          |
| Auth        | `fkey_to_auth_unique`           | WARN     | FKs to auth schema unique constraints    |
| Maintenance | `extension_versions_outdated`   | WARN     | Extensions not on default versions       |

### Current State

- **RLS Check**: `pnpm security:check-rls` - Static check of migration files (Story 1.6)
- **Integration Tests CI**: `.github/workflows/integration-tests.yml` (Story 1.8)
- **No database linting**: Schema issues only discovered when Supabase flags them

### Integration Strategy

Since Splinter runs against a live database (not static files), we implement:

1. **CI Pipeline Step**: Run Splinter in GitHub Actions against test database
2. **Local Script**: `pnpm security:splinter` for on-demand local validation
3. **Pre-commit** (optional): Add SQLFluff for static SQL syntax checking

## Acceptance Criteria

### AC-1.9.1: Splinter Script Created

**Given** the project has database migrations in `drizzle/`
**When** I run `pnpm security:splinter`
**Then** the script connects to the database using `DATABASE_URL`
**And** fetches the latest `splinter.sql` from Supabase GitHub
**And** executes it against the database
**And** reports results grouped by severity (ERROR/WARN/INFO)
**And** exits with code 1 if any ERROR-level issues are found

### AC-1.9.2: CI Pipeline Integration

**Given** the integration tests workflow exists
**When** integration tests run in GitHub Actions
**Then** Splinter lints are executed as a separate step
**And** the step runs after database migrations are applied
**And** ERROR-level issues fail the pipeline
**And** WARN-level issues are reported but don't fail

### AC-1.9.3: Lint Configuration

**Given** the Splinter script runs
**When** processing lint results
**Then** only EXTERNAL-facing lints are considered (user-relevant, not Supabase-internal)
**And** known exclusions can be configured via a config file (optional)
**And** the script provides clear remediation guidance for failures

### AC-1.9.4: Documentation Updated

**Given** Splinter integration is complete
**When** I read project documentation
**Then** `docs/development-setup.md` includes:

- How to run Splinter locally
- What lint rules are checked
- How to address common lint failures
- Reference to Supabase Splinter documentation

### AC-1.9.5: Package.json Script Added

**Given** the Splinter script exists
**When** I look at `package.json`
**Then** there is a `security:splinter` script
**And** it can be run with `pnpm security:splinter`

## Tasks / Subtasks

### Task 1: Create Splinter Script (AC: 1.9.1, 1.9.3, 1.9.5)

- [x] Create `scripts/check-splinter.ts` with:
  - [x] Fetch latest `splinter.sql` from GitHub raw URL
  - [x] Connect to database using `DATABASE_URL` environment variable
  - [x] Execute Splinter SQL and parse JSON results
  - [x] Filter to EXTERNAL-facing lints only
  - [x] Group results by severity (ERROR, WARN, INFO)
  - [x] Display formatted output with lint details and remediation
  - [x] Exit code 0 for success (no errors), 1 for failures
- [x] Add `security:splinter` script to `package.json`
- [x] Add types for Splinter lint results

### Task 2: CI Pipeline Integration (AC: 1.9.2)

- [x] Update `.github/workflows/integration-tests.yml`:
  - [x] Add "Run Splinter lints" step after tests
  - [x] Use same `DATABASE_URL` secret
  - [x] Configure step to fail on ERROR, continue on WARN
  - [x] Add step summary with lint results
- [ ] Test workflow with manual dispatch (deferred - requires CI run)

### Task 3: Optional - SQLFluff Static Linting (AC: 1.9.3)

**Note**: This is optional and deferred. SQLFluff provides static SQL file linting (syntax, style) which complements Splinter's database-state linting.

- [ ] Evaluate SQLFluff integration for pre-commit hooks (DEFERRED)
- [ ] If proceeding:
  - [ ] Create `.sqlfluff` configuration file
  - [ ] Add `lint:sql` script to package.json
  - [ ] Update `.husky/pre-commit` to run SQL linting

### Task 4: Documentation (AC: 1.9.4)

- [x] Update `docs/development-setup.md` with:
  - [x] New section: "Database Linting with Splinter"
  - [x] Explanation of what Splinter checks
  - [x] How to run locally: `pnpm security:splinter`
  - [x] Common lint failures and how to fix them
  - [x] Link to Supabase Splinter documentation
- [x] Update `docs/security-checklist.md` to reference Splinter

## Dev Notes

### Splinter Script Implementation

```typescript
#!/usr/bin/env npx tsx
/**
 * Splinter Database Linter Integration
 *
 * Runs Supabase Splinter lints against the database and fails on errors.
 *
 * Run: pnpm security:splinter
 * Requires: DATABASE_URL environment variable
 */

import postgres from "postgres";

const SPLINTER_SQL_URL = "https://raw.githubusercontent.com/supabase/splinter/main/splinter.sql";

interface LintResult {
  name: string;
  title: string;
  level: "ERROR" | "WARN" | "INFO";
  facing: "INTERNAL" | "EXTERNAL";
  categories: string[];
  description: string;
  detail: string;
  remediation?: string;
  metadata?: Record<string, unknown>;
  cache_key: string;
}

async function fetchSplinterSQL(): Promise<string> {
  const response = await fetch(SPLINTER_SQL_URL);
  if (!response.ok) throw new Error(`Failed to fetch splinter.sql: ${response.statusText}`);
  return response.text();
}

async function runSplinter(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable required");
    process.exit(1);
  }

  console.log("🔍 Supabase Splinter Database Linter\n");
  console.log("Fetching latest Splinter lints from GitHub...");

  const splinterSQL = await fetchSplinterSQL();
  console.log("✅ Splinter SQL loaded\n");

  console.log("Connecting to database...");
  const sql = postgres(databaseUrl);

  try {
    console.log("Running lints against database schema...\n");
    const results = await sql.unsafe<LintResult[]>(splinterSQL);

    // Filter to EXTERNAL-facing lints only (user-relevant)
    const externalLints = results.filter((r) => r.facing === "EXTERNAL");

    const errors = externalLints.filter((r) => r.level === "ERROR");
    const warnings = externalLints.filter((r) => r.level === "WARN");
    const infos = externalLints.filter((r) => r.level === "INFO");

    console.log("📊 Splinter Results:\n");
    console.log(`   Errors:   ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    console.log(`   Info:     ${infos.length}\n`);

    if (errors.length > 0) {
      console.error("❌ ERRORS (must fix):\n");
      for (const err of errors) {
        console.error(`   [${err.name}] ${err.title}`);
        console.error(`   ${err.description}`);
        if (err.detail) console.error(`   Detail: ${err.detail}`);
        if (err.remediation) console.error(`   Fix: ${err.remediation}`);
        console.error("");
      }
    }

    if (warnings.length > 0) {
      console.warn("⚠️  WARNINGS (should review):\n");
      for (const warn of warnings) {
        console.warn(`   [${warn.name}] ${warn.title}`);
        console.warn(`   ${warn.description}`);
        if (warn.detail) console.warn(`   Detail: ${warn.detail}`);
        console.warn("");
      }
    }

    if (infos.length > 0) {
      console.log("ℹ️  INFO:\n");
      for (const info of infos) {
        console.log(`   [${info.name}] ${info.title}`);
        if (info.detail) console.log(`   Detail: ${info.detail}`);
        console.log("");
      }
    }

    if (errors.length > 0) {
      console.error("❌ SPLINTER CHECK FAILED");
      console.error(`\n${errors.length} error(s) must be fixed before deployment.`);
      console.error("See: https://supabase.github.io/splinter for remediation guidance.\n");
      process.exit(1);
    }

    console.log("✅ SPLINTER CHECK PASSED\n");
    if (warnings.length > 0) {
      console.log(`Note: ${warnings.length} warning(s) should be reviewed.`);
    }
  } finally {
    await sql.end();
  }
}

runSplinter().catch((err) => {
  console.error("❌ Splinter execution failed:", err.message);
  process.exit(1);
});
```

### CI Workflow Update

Add to `.github/workflows/integration-tests.yml`:

```yaml
- name: Run Splinter database lints
  run: pnpm security:splinter
  continue-on-error: false # Fail on ERROR-level issues
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Package.json Addition

```json
{
  "scripts": {
    "security:splinter": "npx tsx scripts/check-splinter.ts"
  }
}
```

### Common Lint Failures and Fixes

| Lint                     | Common Cause             | Fix                                          |
| ------------------------ | ------------------------ | -------------------------------------------- |
| `unindexed_foreign_keys` | FK without index         | Add index on FK column                       |
| `rls_disabled_in_public` | New table without RLS    | `ALTER TABLE "x" ENABLE ROW LEVEL SECURITY;` |
| `no_primary_key`         | Table missing PK         | Add `PRIMARY KEY` constraint                 |
| `auth_users_exposed`     | View exposing auth.users | Restrict view columns or add RLS             |
| `rls_enabled_no_policy`  | RLS on but no policy     | Add appropriate RLS policy                   |

### References

- [Supabase Splinter Documentation](https://supabase.github.io/splinter)
- [Splinter GitHub Repository](https://github.com/supabase/splinter)
- [Splinter SQL Query](https://raw.githubusercontent.com/supabase/splinter/main/splinter.sql)

## Dev Agent Record

### Implementation Notes

- Created `scripts/check-splinter.ts` with exported pure functions for testability
- Used `process.stdout.write` and `process.stderr.write` instead of `console.*` to follow project logging standards
- Exported types `LintResult`, `GroupedLints`, and `SplinterResult` for use in tests
- Added 20 unit tests covering all exported functions: `groupLintsBySeverity`, `filterExternalLints`, `formatLintResult`, `analyzeResults`, `fetchSplinterSQL`
- CI pipeline includes Splinter step after integration tests with job summary reporting
- Documentation updated in both `development-setup.md` and `security-checklist.md`
- Added 30-second timeout to `fetchSplinterSQL` to prevent CI hangs
- Increased database `connect_timeout` to 30s for Supabase pooler cold starts
- Added `scripts/**` to CI workflow paths trigger for automatic testing

### Completion Notes

- All acceptance criteria satisfied (AC-1.9.1 through AC-1.9.5)
- Task 3 (SQLFluff) is marked as optional/deferred per story specification
- Manual CI workflow dispatch testing deferred - requires PR merge to test
- All unit tests pass (20 tests for Splinter)
- TypeScript compilation passes without errors
- Build verification successful

## File List

| Action   | File                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Added    | `scripts/check-splinter.ts`                                               |
| Added    | `tests/unit/scripts/check-splinter.test.ts`                               |
| Modified | `package.json` (added `security:splinter` script)                         |
| Modified | `.github/workflows/integration-tests.yml` (added Splinter step + summary) |
| Modified | `docs/development-setup.md` (added Splinter section)                      |
| Modified | `docs/security-checklist.md` (added Splinter integration)                 |

## Change Log

| Date       | Change                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-29 | Story created based on Splinter analysis                                                                                                                                      |
| 2025-12-29 | Implemented Splinter script with TypeScript types and exported functions                                                                                                      |
| 2025-12-29 | Added unit tests for all core functions (17 tests)                                                                                                                            |
| 2025-12-29 | Integrated Splinter into CI pipeline with job summary                                                                                                                         |
| 2025-12-29 | Updated documentation in development-setup.md and security-checklist.md                                                                                                       |
| 2025-12-29 | Story completed and marked for review                                                                                                                                         |
| 2025-12-29 | Code review fixes: added 3 tests for fetchSplinterSQL, added 30s network timeout, increased DB connect_timeout to 30s, added scripts/\*\* to CI paths, fixed grep portability |
