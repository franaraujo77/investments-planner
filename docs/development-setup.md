# Development Setup Guide

> Local development environment configuration

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
├── integration/    # Integration tests (vitest)
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
