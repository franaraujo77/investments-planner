# Contributing to Investments Planner

Thank you for contributing! This document provides guidelines for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Schema Changes & Database Migrations](#schema-changes--database-migrations)
- [Testing Requirements](#testing-requirements)
- [Code Review Process](#code-review-process)
- [Commit Guidelines](#commit-guidelines)

---

## Code of Conduct

Be respectful, constructive, and collaborative in all interactions.

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 15+ (or Supabase account)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/franaraujo77/investments-planner.git
cd investments-planner

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run initial migration
pnpm db:migrate

# Start development server
pnpm dev
```

---

## Development Workflow

### Creating a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Before Committing

All changes must pass these checks (automated via pre-push hook):

```bash
# Route conflict validation
pnpm check:routes

# Type checking
pnpm exec tsc --noEmit

# Linting
pnpm lint

# Tests
pnpm test

# Build verification
pnpm build
```

### Creating a Pull Request

1. Push your branch: `git push origin feature/your-feature-name`
2. Create PR on GitHub targeting `main` branch
3. Fill out PR template completely
4. Ensure all CI checks pass (including Schema Audit)
5. Address review feedback promptly

---

## Schema Changes & Database Migrations

### ⚠️ CRITICAL: Schema Audit Requirement

**All PRs with database schema changes MUST pass the automated Schema Audit before merge.**

The Schema Audit workflow automatically:

- Detects changes to `src/lib/db/schema.ts`, `drizzle/`, or service files
- Applies pending migrations to test database
- Verifies schema consistency (no drift between code and database)
- Posts results as PR comment
- **BLOCKS merge if issues are found** (Phase 3 enforcement)

### Making Schema Changes

Follow this **exact order** to avoid audit failures:

#### Step 1: Update Schema Definition

Edit `src/lib/db/schema.ts` with your changes:

```typescript
// Example: Adding a new column
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  // NEW: Add the column to schema first
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### Step 2: Generate Migration

```bash
pnpm db:generate
```

This creates a new migration file in `drizzle/` directory.

#### Step 3: Review Migration File

Open the generated migration (e.g., `drizzle/0027_new_migration.sql`) and verify:

- SQL is correct
- Includes `IF NOT EXISTS` or `IF EXISTS` for idempotency
- Handles existing data safely (defaults, backfills)

#### Step 4: Test Locally

```bash
# Apply to local database
pnpm db:migrate

# Run audit locally
DATABASE_URL="your-local-db-url" pnpm db:audit-schema

# Expected output: "All tables match schema definition"
```

#### Step 5: Commit and Push

```bash
git add src/lib/db/schema.ts drizzle/0027_*.sql
git commit -m "feat(db): add verified column to users table"
git push origin feature/your-feature
```

#### Step 6: Verify CI Passes

The Schema Audit workflow will:

1. Detect schema file changes ✅
2. Apply your migration to test DB ✅
3. Run audit to verify consistency ✅
4. Post results to PR ✅

**If audit fails:**

- Read the audit output in PR comment
- Common issue: Migration applied but `schema.ts` wasn't updated
- Fix the issue and push again

### Common Schema Audit Scenarios

#### ✅ Successful Audit

```
## 🔍 Schema Audit Results

✅ Schema Audit Passed

- Schema definitions match database structure
- All migrations applied successfully
- No schema drift detected
```

**Action:** None needed. PR can be merged once approved.

#### ❌ Missing Column in Database

```
## 🔍 Schema Audit Results

❌ Schema Audit Failed

Missing columns in production:
- Table: users
- Columns: verified

Action Required: Run 'pnpm db:generate' to create migration
```

**Fix:**

1. You updated `schema.ts` but forgot to generate migration
2. Run `pnpm db:generate` locally
3. Commit the generated migration file
4. Push again

#### ❌ Extra Column in Database

```
## 🔍 Schema Audit Results

⚠️ Schema Audit Warning

Extra columns in production not in schema:
- Table: users
- Columns: legacy_field

Action: Update schema.ts or remove column via migration
```

**Fix:**

1. Either add the column to `schema.ts` if it should exist
2. Or create migration to drop it: `ALTER TABLE users DROP COLUMN legacy_field;`

---

## Testing Requirements

### Mandatory Test Coverage

**From CLAUDE.md:**

> MANDATORY POLICY: Every code change (fix, feature, enhancement, or refactoring) MUST include appropriate test coverage.

#### Test Types Required

| Change Type       | Required Tests                       |
| ----------------- | ------------------------------------ |
| **New API Route** | Unit + Integration tests             |
| **New Function**  | Unit tests for all paths             |
| **Bug Fix**       | Reproduction test + fix verification |
| **Schema Change** | Integration tests for new fields     |
| **Service Logic** | Unit tests with mocks                |

#### Test Commands

```bash
# Unit tests only
pnpm test:unit

# Integration tests (requires DATABASE_URL)
pnpm test:integration

# All tests
pnpm test:all

# E2E tests (requires running app)
pnpm test:e2e

# Watch mode (during development)
pnpm test:watch
```

#### Test Coverage Checklist

Before submitting PR, verify:

- [ ] All new functions have unit tests
- [ ] Success cases covered
- [ ] Error cases covered
- [ ] Edge cases covered
- [ ] Integration tests for API endpoints
- [ ] No console.log/console.error in production code
- [ ] All tests pass locally

---

## Code Review Process

### PR Checklist

Use this checklist before requesting review:

#### Code Quality

- [ ] No console.log/console.error (use `logger` from `@/lib/telemetry/logger`)
- [ ] No explicit `any` types (use proper TypeScript types)
- [ ] Unused variables prefixed with `_`
- [ ] Uses standardized API responses (`@/lib/api/responses.ts`)
- [ ] Uses standardized error codes (`@/lib/api/error-codes.ts`)
- [ ] No direct number formatting (use `useNumberFormat()` hook)

#### Database & Performance

- [ ] No full table scans (use `where()` with `eq()`, `inArray()`, etc.)
- [ ] Foreign key constraints defined with appropriate `ON DELETE` behavior
- [ ] Indexes added for frequently queried columns
- [ ] **Schema Audit passed** (for schema changes)

#### Security (Supabase RLS)

- [ ] New tables have RLS enabled
- [ ] Auth token tables have `REVOKE ALL ON ... FROM anon, authenticated;`
- [ ] Security check passes: `pnpm security:check-rls`

#### Client-Side Code

- [ ] No console.error in client components (show errors via UI)
- [ ] Error boundaries for component failures
- [ ] Loading states handled

#### Testing

- [ ] Test coverage for new code
- [ ] All tests pass: `pnpm test:all`

#### Pre-Commit Verification

- [ ] Route conflicts checked: `pnpm check:routes`
- [ ] TypeScript passes: `pnpm exec tsc --noEmit`
- [ ] Linting passes: `pnpm lint`
- [ ] Build succeeds: `pnpm build`

### Review Timeline

- Initial review: Within 2 business days
- Follow-up reviews: Within 1 business day
- Approval + merge: After all checks pass and Schema Audit succeeds

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no functionality change)
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
# Feature
feat(auth): add password reset functionality

# Bug fix
fix(api): resolve null reference in portfolio calculation

# Schema change
feat(db): add email verification fields to users table

# Refactoring
refactor(services): extract recommendation logic to service layer

# Test
test(portfolio): add unit tests for allocation validation
```

### Commit Footer (Optional)

```
feat(db): add overnight job tracking

Adds overnight_job_runs table to track batch scoring jobs.
Includes RLS policies and audit logging.

Closes #123
Refs #124

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Schema Audit Troubleshooting

### "Schema Audit Skipped" (No schema changes)

**This is normal** - Most PRs don't touch schema files. The workflow runs but immediately passes.

### "Migration Failed" (Can't apply migrations)

**Common Causes:**

- Syntax error in migration SQL
- Migration depends on another PR's migration not yet merged
- Database connection issue

**Fix:**

1. Review migration syntax
2. Test migration locally: `pnpm db:migrate`
3. Check for merge conflicts with `main` branch migrations

### "Schema Audit Failed" (Drift detected)

**Common Causes:**

1. Updated `schema.ts` but didn't generate migration
2. Generated migration but didn't update `schema.ts`
3. Removed column from schema but didn't drop it in migration

**Fix:**

1. Read audit output carefully - it lists missing/extra columns
2. Ensure `schema.ts` and `drizzle/` are in sync
3. Run `DATABASE_URL="..." pnpm db:audit-schema` locally to reproduce
4. Fix the inconsistency and push again

### Getting Help

If you're stuck:

1. Check `docs/migration-deployment-guide.md` for detailed troubleshooting
2. Review the PR comment - it includes specific next steps
3. Ask in PR comments or team chat
4. Worst case: Reset your branch and start fresh

---

## Additional Resources

- [Migration Deployment Guide](docs/migration-deployment-guide.md) - Comprehensive DB migration guide
- [Branch Protection Setup](docs/github-branch-protection-setup.md) - Admin guide for Phase 3 enforcement
- [CLAUDE.md](CLAUDE.md) - Complete coding standards and patterns
- [Security Checklist](docs/security-checklist.md) - RLS and security requirements

---

## Questions?

- **Schema/Migration Issues:** See `docs/migration-deployment-guide.md`
- **Schema Audit Issues:** See `docs/github-branch-protection-setup.md`
- **General Questions:** Open an issue or ask in team chat

---

**Thank you for contributing! 🚀**
