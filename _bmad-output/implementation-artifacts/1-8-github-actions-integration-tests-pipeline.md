# Story 1.8: GitHub Actions Integration Tests Pipeline

Status: done

## Story

As a **developer working on feature branches**,
I want **a GitHub Actions pipeline that runs integration tests against a real database**,
so that **I can validate database-dependent code changes before merging to main**.

## Background

Story 1.7 established the integration test infrastructure with conditional skipping based on `DATABASE_URL`. Currently, integration tests only run locally when developers manually provide a database connection string. This story adds a GitHub Actions workflow that:

1. Can be manually triggered on any branch via `workflow_dispatch`
2. Runs automatically on PRs to main (optional, configurable)
3. Uses GitHub Secrets to securely store database credentials
4. Provides clear feedback on test results

### Current State

- **Unit tests**: Run in CI via `.github/workflows/ci.yml` (no database required)
- **Integration tests**: Only run locally with `DATABASE_URL="..." pnpm test:integration`
- **E2E tests**: Not in CI (require full app deployment)

### Required GitHub Secrets

Based on `.env` configuration, the following secrets/variables must be created:

#### Required Secrets (must have values)

| Secret Name                 | Value                                                  | Purpose                         |
| --------------------------- | ------------------------------------------------------ | ------------------------------- |
| `DATABASE_URL`              | Supabase connection string                             | PostgreSQL database access      |
| `JWT_SECRET`                | 32+ character secret                                   | Auth token signing              |
| `JWT_ACCESS_TOKEN_EXPIRY`   | `15m`                                                  | Access token lifetime           |
| `JWT_REFRESH_TOKEN_EXPIRY`  | `7d`                                                   | Refresh token lifetime          |
| `KV_REST_API_URL`           | Vercel KV URL                                          | Rate limiting cache             |
| `KV_REST_API_TOKEN`         | Vercel KV token                                        | Rate limiting auth              |
| `RUN_API_INTEGRATION_TESTS` | `true`                                                 | Enable API integration tests    |
| `NEXT_PUBLIC_APP_URL`       | `http://localhost:3000`                                | Base URL for verification links |
| `EMAIL_FROM_ADDRESS`        | `Investments Planner <noreply@investmentsplanner.app>` | Email sender address            |

#### Optional Secrets (can be empty, for specific features)

| Secret Name                   | Value   | Purpose                                       |
| ----------------------------- | ------- | --------------------------------------------- |
| `RESEND_API_KEY`              | (empty) | Email sending - logs to console if empty      |
| `INNGEST_EVENT_KEY`           | (empty) | Background jobs - not required for tests      |
| `INNGEST_SIGNING_KEY`         | (empty) | Webhook verification - not required for tests |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (empty) | Observability traces export                   |
| `OTEL_EXPORTER_OTLP_HEADERS`  | (empty) | Observability auth headers                    |
| `OPEN_EXCHANGE_RATES_API_KEY` | (empty) | Exchange rates API                            |
| `EXCHANGERATE_API_KEY`        | (empty) | Alternative exchange rates API                |

**Note:** `NODE_ENV` is set directly in the workflow to `test`, not via secrets.

## Acceptance Criteria

### AC-1.8.1: Integration Tests Workflow Created

**Given** the repository has integration tests in `tests/integration/`
**When** I push to the repository
**Then** a new workflow file `.github/workflows/integration-tests.yml` exists
**And** the workflow is properly configured with required secrets

### AC-1.8.2: Manual Trigger Support

**Given** I am on any branch in the repository
**When** I navigate to GitHub Actions and select "Integration Tests"
**Then** I can manually trigger the workflow via `workflow_dispatch`
**And** I can optionally specify the branch to test

### AC-1.8.3: PR Integration (Optional Trigger)

**Given** I create a pull request to main
**When** the PR is opened or updated
**Then** integration tests run automatically (can be disabled via label or config)
**And** the PR status shows integration test results

### AC-1.8.4: Secure Secret Management

**Given** the workflow requires database credentials
**When** the workflow runs
**Then** secrets are passed via `secrets` context (not hardcoded)
**And** secrets are masked in logs
**And** the workflow fails gracefully if secrets are missing

### AC-1.8.5: Clear Test Reporting

**Given** integration tests complete (pass or fail)
**When** I view the workflow results
**Then** I see a summary of passed/failed/skipped tests
**And** failed tests show detailed error messages
**And** the workflow exit code reflects test success/failure

### AC-1.8.6: Documentation Updated

**Given** the workflow is implemented
**When** I read the project documentation
**Then** `docs/development-setup.md` includes instructions for:

- How to run integration tests locally
- How to trigger integration tests in CI
- How to set up required GitHub secrets (for repo admins)

## Tasks / Subtasks

### Task 1: Create GitHub Actions Workflow (AC: 1.8.1, 1.8.2, 1.8.3)

- [x] Create `.github/workflows/integration-tests.yml` with:
  - [x] `workflow_dispatch` trigger with branch input
  - [x] `pull_request` trigger to main (with path filters)
  - [x] Proper concurrency settings to cancel outdated runs
  - [x] Job configuration:
    - [x] Ubuntu latest runner
    - [x] Node.js 22 + pnpm 9 setup
    - [x] Dependencies installation with cache
    - [x] Integration tests execution

### Task 2: Configure Secret Usage (AC: 1.8.4)

- [x] Map GitHub Secrets to environment variables:
  ```yaml
  env:
    # Required
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    JWT_ACCESS_TOKEN_EXPIRY: ${{ secrets.JWT_ACCESS_TOKEN_EXPIRY }}
    JWT_REFRESH_TOKEN_EXPIRY: ${{ secrets.JWT_REFRESH_TOKEN_EXPIRY }}
    KV_REST_API_URL: ${{ secrets.KV_REST_API_URL }}
    KV_REST_API_TOKEN: ${{ secrets.KV_REST_API_TOKEN }}
    RUN_API_INTEGRATION_TESTS: ${{ secrets.RUN_API_INTEGRATION_TESTS }}
    NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
    EMAIL_FROM_ADDRESS: ${{ secrets.EMAIL_FROM_ADDRESS }}
    # Optional (can be empty)
    RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
    INNGEST_EVENT_KEY: ${{ secrets.INNGEST_EVENT_KEY }}
    INNGEST_SIGNING_KEY: ${{ secrets.INNGEST_SIGNING_KEY }}
    OTEL_EXPORTER_OTLP_ENDPOINT: ${{ secrets.OTEL_EXPORTER_OTLP_ENDPOINT }}
    OTEL_EXPORTER_OTLP_HEADERS: ${{ secrets.OTEL_EXPORTER_OTLP_HEADERS }}
    OPEN_EXCHANGE_RATES_API_KEY: ${{ secrets.OPEN_EXCHANGE_RATES_API_KEY }}
    EXCHANGERATE_API_KEY: ${{ secrets.EXCHANGERATE_API_KEY }}
    NODE_ENV: test
  ```
- [x] Add secret validation step that fails early if missing
- [x] Ensure secrets are not logged (use `::add-mask::` if needed)

### Task 3: Test Reporting (AC: 1.8.5)

- [x] Configure Vitest JSON reporter for CI
- [x] Add GitHub Actions annotations for test failures
- [x] Create job summary with test statistics
- [x] Upload test results as artifact (optional)

### Task 4: Document GitHub Secrets Setup (AC: 1.8.6)

- [x] Update `docs/development-setup.md` with:
  - [x] Section: "Running Integration Tests Locally"
  - [x] Section: "Running Integration Tests in CI"
  - [x] Section: "Setting Up GitHub Secrets (Admin)"
- [x] Document the required secrets and their sources
- [x] Add troubleshooting section for common issues

### Task 5: Create GitHub Secrets

**Note:** This task requires manual action by repository administrator via GitHub UI.

- [ ] Create the following **required** secrets in GitHub repository settings:
  - [ ] `DATABASE_URL` - Value: (see .env or Supabase dashboard)
  - [ ] `JWT_SECRET` - Value: `your-jwt-secret-min-32-chars-here` (or generate new)
  - [ ] `JWT_ACCESS_TOKEN_EXPIRY` - Value: `15m`
  - [ ] `JWT_REFRESH_TOKEN_EXPIRY` - Value: `7d`
  - [ ] `KV_REST_API_URL` - Value: (see Upstash/Vercel KV dashboard)
  - [ ] `KV_REST_API_TOKEN` - Value: (see Upstash/Vercel KV dashboard)
  - [ ] `RUN_API_INTEGRATION_TESTS` - Value: `true`
  - [ ] `NEXT_PUBLIC_APP_URL` - Value: `http://localhost:3000`
  - [ ] `EMAIL_FROM_ADDRESS` - Value: `Investments Planner <noreply@investmentsplanner.app>`

- [ ] Create the following **optional** secrets (can be empty strings):
  - [ ] `RESEND_API_KEY` - Value: (empty)
  - [ ] `INNGEST_EVENT_KEY` - Value: (empty)
  - [ ] `INNGEST_SIGNING_KEY` - Value: (empty)
  - [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` - Value: (empty)
  - [ ] `OTEL_EXPORTER_OTLP_HEADERS` - Value: (empty)
  - [ ] `OPEN_EXCHANGE_RATES_API_KEY` - Value: (empty)
  - [ ] `EXCHANGERATE_API_KEY` - Value: (empty)

## Dev Notes

### Workflow Template

```yaml
name: Integration Tests

on:
  workflow_dispatch:
    inputs:
      branch:
        description: "Branch to test"
        required: false
        default: ""
  pull_request:
    branches: [main]
    paths:
      - "src/**"
      - "tests/integration/**"
      - "drizzle/**"
      - "package.json"
      - "pnpm-lock.yaml"

concurrency:
  group: integration-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20

    # Skip if secrets not configured (fork PRs)
    if: github.event_name == 'workflow_dispatch' || github.event.pull_request.head.repo.full_name == github.repository

    env:
      # Required secrets
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
      JWT_ACCESS_TOKEN_EXPIRY: ${{ secrets.JWT_ACCESS_TOKEN_EXPIRY }}
      JWT_REFRESH_TOKEN_EXPIRY: ${{ secrets.JWT_REFRESH_TOKEN_EXPIRY }}
      KV_REST_API_URL: ${{ secrets.KV_REST_API_URL }}
      KV_REST_API_TOKEN: ${{ secrets.KV_REST_API_TOKEN }}
      RUN_API_INTEGRATION_TESTS: ${{ secrets.RUN_API_INTEGRATION_TESTS }}
      NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
      EMAIL_FROM_ADDRESS: ${{ secrets.EMAIL_FROM_ADDRESS }}
      # Optional secrets (can be empty)
      RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
      INNGEST_EVENT_KEY: ${{ secrets.INNGEST_EVENT_KEY }}
      INNGEST_SIGNING_KEY: ${{ secrets.INNGEST_SIGNING_KEY }}
      OTEL_EXPORTER_OTLP_ENDPOINT: ${{ secrets.OTEL_EXPORTER_OTLP_ENDPOINT }}
      OTEL_EXPORTER_OTLP_HEADERS: ${{ secrets.OTEL_EXPORTER_OTLP_HEADERS }}
      OPEN_EXCHANGE_RATES_API_KEY: ${{ secrets.OPEN_EXCHANGE_RATES_API_KEY }}
      EXCHANGERATE_API_KEY: ${{ secrets.EXCHANGERATE_API_KEY }}
      NODE_ENV: test

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Validate secrets
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo "::error::DATABASE_URL secret is not set"
            exit 1
          fi
          echo "All required secrets are configured"

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

      - name: Run integration tests
        run: pnpm test:integration

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: |
            coverage/
          retention-days: 7
```

### Security Considerations

1. **Fork PRs**: The workflow includes `if` condition to skip when secrets aren't available (fork PRs)
2. **Secret Masking**: GitHub automatically masks secrets in logs
3. **Database Isolation**: Consider using a separate test database to avoid data corruption
4. **Rate Limiting**: KV secrets enable rate limiting tests but won't affect production

### Path Filters

The workflow only runs on changes to:

- `src/**` - Source code changes
- `tests/integration/**` - Integration test changes
- `drizzle/**` - Database schema changes
- `package.json`, `pnpm-lock.yaml` - Dependency changes

This prevents unnecessary runs on documentation-only changes.

### Local Testing of Workflow

To test the workflow locally before pushing:

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run the workflow locally (requires Docker)
# Load secrets from .env file first: source .env
act workflow_dispatch -W .github/workflows/integration-tests.yml \
  -s DATABASE_URL="$DATABASE_URL" \
  -s JWT_SECRET="$JWT_SECRET" \
  -s JWT_ACCESS_TOKEN_EXPIRY="$JWT_ACCESS_TOKEN_EXPIRY" \
  -s JWT_REFRESH_TOKEN_EXPIRY="$JWT_REFRESH_TOKEN_EXPIRY" \
  -s KV_REST_API_URL="$KV_REST_API_URL" \
  -s KV_REST_API_TOKEN="$KV_REST_API_TOKEN" \
  -s RUN_API_INTEGRATION_TESTS="true" \
  -s NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  -s EMAIL_FROM_ADDRESS="$EMAIL_FROM_ADDRESS" \
  -s RESEND_API_KEY="$RESEND_API_KEY" \
  -s INNGEST_EVENT_KEY="$INNGEST_EVENT_KEY" \
  -s INNGEST_SIGNING_KEY="$INNGEST_SIGNING_KEY" \
  -s OTEL_EXPORTER_OTLP_ENDPOINT="$OTEL_EXPORTER_OTLP_ENDPOINT" \
  -s OTEL_EXPORTER_OTLP_HEADERS="$OTEL_EXPORTER_OTLP_HEADERS" \
  -s OPEN_EXCHANGE_RATES_API_KEY="$OPEN_EXCHANGE_RATES_API_KEY" \
  -s EXCHANGERATE_API_KEY="$EXCHANGERATE_API_KEY"
```

### References

- [GitHub Actions: workflow_dispatch](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch)
- [GitHub Actions: Using secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Vitest CI Integration](https://vitest.dev/guide/ci.html)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- TypeScript check: PASS (no errors)
- Unit tests: PASS (3499 tests passed)
- Lint: Pre-existing warnings in unrelated files (\_bmad folder, test fixtures)

### Completion Notes List

1. Created `.github/workflows/integration-tests.yml` with full CI pipeline
2. Implemented `workflow_dispatch` for manual triggering with branch selection
3. Implemented `pull_request` trigger with path filters for relevant file changes
4. Added comprehensive secret validation step with clear error messages
5. Configured Vitest JSON reporter for CI with job summary generation
6. Added test artifact upload for debugging failed runs
7. Updated `docs/development-setup.md` with three new sections:
   - "Running Integration Tests Locally"
   - "Running Integration Tests in CI"
   - "Setting Up GitHub Secrets (Repository Admins)"
8. Added troubleshooting section for common CI issues
9. Task 5 (Create GitHub Secrets) is marked incomplete - requires manual admin action via GitHub UI

### File List

**New Files:**

- `.github/workflows/integration-tests.yml` - Integration tests workflow

**Modified Files:**

- `docs/development-setup.md` - Add integration test documentation sections
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status

## Change Log

| Date       | Change                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| 2025-12-29 | Initial implementation of GitHub Actions integration tests pipeline          |
| 2025-12-29 | Created workflow with workflow_dispatch and pull_request triggers            |
| 2025-12-29 | Added secret validation, JSON test reporting, and job summary                |
| 2025-12-29 | Updated docs with local/CI testing instructions and secrets setup guide      |
| 2025-12-29 | Code review: Fixed 5 issues (2 HIGH, 3 MEDIUM) - all ACs now fully satisfied |

## Senior Developer Review (AI)

**Review Date:** 2025-12-29
**Reviewer:** Claude Opus 4.5
**Review Outcome:** Approved (after fixes)

### Issues Found and Resolved

| Severity | Issue                                                         | Resolution                                                                              |
| -------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| HIGH     | H1: Missing validation for 3 required secrets                 | Added validation for RUN_API_INTEGRATION_TESTS, NEXT_PUBLIC_APP_URL, EMAIL_FROM_ADDRESS |
| HIGH     | H2: GitHub Actions annotations not implemented                | Added `--reporter=github-actions` for inline PR annotations                             |
| MEDIUM   | M1: Potential performance issue with unlimited failure output | Added `head -60` limit (20 failures × 3 lines)                                          |
| MEDIUM   | M2: Missing path filters for vitest config files              | Added `vitest.config.ts` and `vitest.config.integration.ts`                             |
| LOW      | L1: Incorrect last updated date in docs                       | Updated to 2025-12-29                                                                   |

### Acceptance Criteria Validation

- [x] AC-1.8.1: Workflow file exists with proper secrets config
- [x] AC-1.8.2: Manual trigger with branch input implemented
- [x] AC-1.8.3: PR integration with path filters (now includes vitest configs)
- [x] AC-1.8.4: All 9 required secrets validated, masked by GitHub
- [x] AC-1.8.5: Test reporting with JSON, job summary, AND inline annotations
- [x] AC-1.8.6: Documentation updated with all required sections

### Files Changed in Review

- `.github/workflows/integration-tests.yml` - Added missing secret validations, github-actions reporter, path filters, output limits
- `docs/development-setup.md` - Updated last updated date
