# Development Setup Guide

> Local development environment configuration
> Last Updated: 2025-12-29

## Prerequisites

- **Node.js** 20+ (recommended: use nvm)
- **pnpm** 8+ (package manager)
- **PostgreSQL** 14+ (or use Neon/Vercel Postgres)
- **Git** (version control)

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd investments-planner

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

Access the app at: http://localhost:3000

---

## Environment Variables

Create `.env.local` with these variables:

### Required Variables

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/investments_planner"

# Authentication
JWT_SECRET="your-256-bit-secret-key"  # Generate: openssl rand -hex 32

# Vercel KV (for caching and rate limiting)
KV_URL="redis://..."
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
```

### Optional Variables

```bash
# External Data Providers
GEMINI_API_KEY="..."              # For price and fundamentals data
EXCHANGERATE_API_KEY="..."        # For exchange rates

# Email (Inngest)
INNGEST_SIGNING_KEY="..."         # For background jobs
INNGEST_EVENT_KEY="..."

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT="..."
OTEL_SERVICE_NAME="investments-planner"
```

---

## Database Setup

### Option 1: Local PostgreSQL

```bash
# Create database
createdb investments_planner

# Set DATABASE_URL in .env.local
DATABASE_URL="postgresql://localhost:5432/investments_planner"

# Run migrations
pnpm db:push
```

### Option 2: Neon (Serverless PostgreSQL)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string to `DATABASE_URL`
4. Run migrations: `pnpm db:push`

### Option 3: Vercel Postgres

1. Create Vercel project
2. Add Postgres integration
3. Copy environment variables
4. Run migrations: `pnpm db:push`

---

## Database Commands

```bash
# Push schema to database (development)
pnpm db:push

# Generate migration files
pnpm db:generate

# Apply migrations (production)
pnpm db:migrate

# Open Drizzle Studio (GUI)
pnpm db:studio
```

---

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm exec tsc --noEmit

# Linting
pnpm lint

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

---

## Project Structure Notes

### Route Groups

The app uses Next.js route groups:

| Group         | Path                        | Purpose               |
| ------------- | --------------------------- | --------------------- |
| `(auth)`      | `/login`, `/register`, etc. | Unauthenticated pages |
| `(dashboard)` | `/`, `/portfolio`, etc.     | Authenticated pages   |
| `(legal)`     | `/terms`, `/privacy`, etc.  | Legal pages           |

### Key Directories

| Directory           | Purpose             |
| ------------------- | ------------------- |
| `src/app/api/`      | API route handlers  |
| `src/components/`   | React components    |
| `src/hooks/`        | Custom React hooks  |
| `src/lib/`          | Core business logic |
| `src/lib/db/`       | Database schema     |
| `src/lib/services/` | Service layer       |
| `tests/`            | Test suites         |

---

## Common Tasks

### Adding a New API Endpoint

1. Create route file in `src/app/api/[domain]/route.ts`
2. Add Zod validation schema in `src/lib/validations/`
3. Implement service logic in `src/lib/services/`
4. Use `withAuth` wrapper for protected endpoints:

```typescript
import { withAuth } from "@/lib/auth/middleware";

export const GET = withAuth<ResponseType>(async (request, session) => {
  // session.userId is available
  return Response.json({ data: ... });
});
```

### Adding a New Component

1. Create component in appropriate `src/components/[domain]/` folder
2. Add `"use client"` directive if interactive
3. Use Radix UI primitives from `src/components/ui/`
4. Style with Tailwind CSS

### Adding a Database Table

1. Add table definition in `src/lib/db/schema.ts`
2. Add relations if needed
3. Export types
4. Generate migration: `pnpm db:generate`
5. Apply migration: `pnpm db:push`

---

## Testing

### Test Structure

```
tests/
├── unit/           # Unit tests (vitest)
├── integration/    # Integration tests (vitest, requires DATABASE_URL)
└── e2e/            # E2E tests (playwright)
```

### Running Tests

```bash
# All unit tests
pnpm test

# Specific test file
pnpm test tests/unit/auth/

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

### Running Integration Tests Locally

Integration tests require a real PostgreSQL database connection. They test database-dependent code including schema validation, migrations, and data access patterns.

```bash
# Set DATABASE_URL and run integration tests
DATABASE_URL="postgresql://user:password@localhost:5432/investments_planner" pnpm test:integration

# Or source from .env file
source .env && pnpm test:integration

# With verbose output
DATABASE_URL="..." pnpm test:integration --reporter=verbose
```

**Integration Test Requirements:**

- PostgreSQL database with schema applied (`pnpm db:push`)
- Valid `DATABASE_URL` environment variable
- Additional env vars for API tests: `JWT_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`

**Note:** Without `DATABASE_URL`, integration tests will be skipped with a warning.

### Running Integration Tests in CI

Integration tests run automatically in GitHub Actions on:

- Pull requests to `main` (when relevant files change)
- Manual trigger via `workflow_dispatch`

**To trigger manually:**

1. Go to repository → Actions → "Integration Tests"
2. Click "Run workflow"
3. Optionally specify a branch to test
4. Click "Run workflow" button

**PR Integration:**

- Tests run automatically when PR changes files in `src/`, `tests/integration/`, `drizzle/`, or dependency files
- Fork PRs skip integration tests (no access to secrets)
- Results appear in PR status checks

**Viewing Results:**

- Job summary shows passed/failed/skipped counts
- Failed tests show detailed error messages
- Test artifacts are uploaded for debugging (retained 7 days)

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("MyModule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should do something", () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## Code Quality

### Pre-commit Checks

Before committing, verify:

```bash
# Type checking
pnpm exec tsc --noEmit

# Linting
pnpm lint

# Tests
pnpm test

# Build
pnpm build
```

### Standards Enforcement

See `CLAUDE.md` for:

- Logging: Use `logger` from `@/lib/telemetry/logger`
- Errors: Use standardized responses from `@/lib/api/responses`
- Database: Use Drizzle ORM with proper `where` clauses
- Types: No explicit `any` without explanation

---

## Database Linting with Splinter

[Supabase Splinter](https://supabase.github.io/splinter) is a SQL-based database linter that identifies schema issues by querying your actual database state.

### What Splinter Checks

| Category    | Lint Rule                  | Severity | Description                                    |
| ----------- | -------------------------- | -------- | ---------------------------------------------- |
| Performance | `unindexed_foreign_keys`   | WARN     | Foreign keys without covering indexes          |
| Performance | `unused_index`             | INFO     | Indexes that are never used                    |
| Performance | `duplicate_index`          | WARN     | Identical indexes wasting space                |
| Security    | `auth_users_exposed`       | ERROR    | auth.users exposed to anon/authenticated roles |
| Security    | `rls_disabled_in_public`   | ERROR    | Tables in public schema without RLS            |
| Security    | `rls_enabled_no_policy`    | WARN     | RLS enabled but no policies defined            |
| Security    | `security_definer_view`    | WARN     | Views using SECURITY DEFINER                   |
| Schema      | `no_primary_key`           | WARN     | Tables without primary keys                    |
| Schema      | `extension_in_public`      | WARN     | Extensions in public schema                    |
| API         | `materialized_view_in_api` | WARN     | Materialized views exposed via API             |

### Running Splinter Locally

```bash
# Run Splinter lints against your database
pnpm security:splinter

# Or with explicit DATABASE_URL
DATABASE_URL="postgresql://user:pass@localhost:5432/db" pnpm security:splinter
```

### Splinter in CI

Splinter runs automatically in the GitHub Actions integration tests workflow:

- Runs after database migrations are applied
- **ERROR-level** issues will fail the pipeline
- **WARN-level** issues are reported but don't fail

### Common Lint Failures and Fixes

| Lint                     | Common Cause              | Fix                                                   |
| ------------------------ | ------------------------- | ----------------------------------------------------- |
| `unindexed_foreign_keys` | FK column without index   | Add index: `CREATE INDEX ON "table" ("fk_column");`   |
| `rls_disabled_in_public` | New table without RLS     | Add: `ALTER TABLE "table" ENABLE ROW LEVEL SECURITY;` |
| `no_primary_key`         | Table missing primary key | Add `PRIMARY KEY` constraint to schema                |
| `auth_users_exposed`     | View exposing auth.users  | Restrict view columns or add RLS policies             |
| `rls_enabled_no_policy`  | RLS on but no policy      | Add appropriate RLS policy for the table              |

### Relationship with RLS Check

| Tool                      | Type   | Purpose                                      |
| ------------------------- | ------ | -------------------------------------------- |
| `pnpm security:check-rls` | Static | Verifies migration files have RLS statements |
| `pnpm security:splinter`  | Live   | Queries actual database for schema issues    |

**Recommendation:** Use both checks:

- `check-rls` during development to catch missing RLS in new tables
- `splinter` in CI to catch broader schema issues

### Reference

- [Supabase Splinter Documentation](https://supabase.github.io/splinter)
- [Splinter GitHub Repository](https://github.com/supabase/splinter)
- [Full list of lint rules](https://supabase.github.io/splinter/#lint-rules)

---

## Troubleshooting

### "DATABASE_URL not set"

Ensure `.env.local` exists and contains `DATABASE_URL`.

### "Module not found: @/"

Path alias issue. Check `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### "Port 3000 already in use"

Kill existing process:

```bash
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill
```

### E2E tests timeout

Start dev server first:

```bash
pnpm dev &
pnpm test:e2e
```

### Database connection issues

Check PostgreSQL is running:

```bash
pg_isready
```

---

## Setting Up GitHub Secrets (Repository Admins)

To enable integration tests in GitHub Actions, repository administrators must configure the following secrets.

### Required Secrets

Navigate to: **Repository Settings → Secrets and variables → Actions → New repository secret**

| Secret Name                 | Description                                  | Example Value                         |
| --------------------------- | -------------------------------------------- | ------------------------------------- |
| `DATABASE_URL`              | PostgreSQL connection string (Supabase/Neon) | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET`                | 32+ character secret for auth tokens         | `your-secret-min-32-chars-here`       |
| `JWT_ACCESS_TOKEN_EXPIRY`   | Access token lifetime                        | `15m`                                 |
| `JWT_REFRESH_TOKEN_EXPIRY`  | Refresh token lifetime                       | `7d`                                  |
| `KV_REST_API_URL`           | Vercel KV / Upstash URL                      | `https://xxx.upstash.io`              |
| `KV_REST_API_TOKEN`         | Vercel KV / Upstash token                    | `AxxxxxxxxxxxxxxxxxxP`                |
| `RUN_API_INTEGRATION_TESTS` | Enable API integration tests                 | `true`                                |
| `NEXT_PUBLIC_APP_URL`       | Base URL for verification links              | `http://localhost:3000`               |
| `EMAIL_FROM_ADDRESS`        | Email sender address                         | `App Name <noreply@example.com>`      |

### Optional Secrets

These can be left empty (tests will skip related functionality):

| Secret Name                   | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `RESEND_API_KEY`              | Email sending (logs to console if empty) |
| `INNGEST_EVENT_KEY`           | Background jobs                          |
| `INNGEST_SIGNING_KEY`         | Webhook verification                     |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Observability traces                     |
| `OTEL_EXPORTER_OTLP_HEADERS`  | Observability auth                       |
| `OPEN_EXCHANGE_RATES_API_KEY` | Exchange rates API                       |
| `EXCHANGERATE_API_KEY`        | Alternative exchange rates               |

### Security Considerations

1. **Use a separate test database** - Avoid using production database for CI tests
2. **Rotate secrets periodically** - Update secrets every 90 days
3. **Audit access** - Review who has access to repository secrets
4. **Fork PRs** - Integration tests are automatically skipped for fork PRs (no secret access)

### Troubleshooting

**"Missing required secrets" error:**

- Verify all required secrets are configured
- Check for typos in secret names (case-sensitive)
- Ensure secrets have values (not empty strings for required ones)

**"Connection refused" errors:**

- Verify DATABASE_URL is correct and accessible from GitHub Actions runners
- Check if database allows connections from GitHub's IP ranges
- For Supabase/Neon: ensure "Allow connections from anywhere" is enabled

**Tests pass locally but fail in CI:**

- Compare local `.env` with configured GitHub secrets
- Check for environment-specific code paths
- Review test output artifacts for detailed error messages

---

## IDE Setup

### VS Code Extensions

Recommended extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma (for schema syntax)
- GitLens

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

_For testing details, see [TESTING.md](../TESTING.md). For coding standards, see [CLAUDE.md](../CLAUDE.md)._
