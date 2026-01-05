# Story 7.10: Fix Recommendation Test Timeout

Status: done

## Story

As a **developer**,
I want **the recommendation generation test to complete within the timeout limit**,
so that **the test suite passes reliably and CI remains green**.

## Background

During Story 7.8 code review, a pre-existing test failure was identified in `tests/unit/inngest/recommendation-generation.test.ts`. The test "should handle batch failure gracefully" times out after 10 seconds.

This is a technical debt item that predates Story 7.8 but blocks CI from passing.

## Acceptance Criteria

### AC-7.10.1: Test Completes Within Timeout

**Given** the test suite is run with `pnpm test:unit`
**When** the "should handle batch failure gracefully" test executes
**Then** it completes successfully within the default 10 second timeout
**And** all other recommendation generation tests continue to pass

## Tasks / Subtasks

### Task 1: Investigate Test Timeout (AC: 7.10.1)

**Goal:** Identify root cause of the slow test execution.

- [x] 1.1: Review test at line 538 in `recommendation-generation.test.ts`
- [x] 1.2: Check mock setup for potential async issues
- [x] 1.3: Identify if retry loops or long waits are causing the delay
- [x] 1.4: Check for unresolved promises or missing mock resolutions

### Task 2: Fix Test (AC: 7.10.1)

**Goal:** Resolve the timeout issue.

- [x] 2.1: Apply fix based on root cause analysis
- [x] 2.2: Ensure test validates the correct behavior (batch failure handling)
- [x] 2.3: Verify no regression in other recommendation tests

### Task 3: Verification

- [x] 3.1: Run `pnpm test:unit` - all tests pass
- [x] 3.2: Run specific test file multiple times to confirm stability
- [x] 3.3: Run `pnpm exec tsc --noEmit` - no type errors
- [x] 3.4: Run `pnpm lint` - no linting errors

## Dev Notes

### Test Location

```
tests/unit/inngest/recommendation-generation.test.ts:538
```

### Error Output

```
× should handle batch failure gracefully - 10005ms
Error: Test timed out in 10000ms.
```

### Possible Causes

1. Mock not resolving a promise properly
2. Retry logic in the function under test causing multiple iterations
3. Missing `vi.useFakeTimers()` for time-dependent code
4. Race condition in async test setup

### Critical Implementation Rules

From `project-context.md`:

- **NEVER use console.log/error** - Use `logger` from `@/lib/telemetry/logger`
- **Run `pnpm lint` and `pnpm test`** before committing

### References

- [Source: `tests/unit/inngest/recommendation-generation.test.ts`] - Failing test
- [Source: `src/lib/inngest/functions/overnight-scoring.ts`] - Function under test

## Dev Agent Record

### Implementation Plan

Investigation revealed the test timeout was caused by missing mock dependencies. The overnight-scoring job evolved since the test was written, adding new service dependencies that weren't mocked:

1. `dismissedPairsService` - Added in Story 7.8 for cleanup of old dismissed opportunity pairs
2. `marketDataCacheService` - Added in Story 5.2 for two-tier market data caching
3. `classifyAssetsFromFundamentals` - Added in Story 5.8 for asset type classification
4. `processClassificationsFromFundamentals` - Added in Story 5.7 for GICS classification

When these services were called without mocks, they tried to access real database connections, causing the test to hang indefinitely until the 10-second timeout.

### Debug Log

- Analyzed test file structure and mock setup
- Identified that `dismissedPairsService` and `marketDataCacheService` were not mocked
- Root cause confirmed: The test was skipped (`it.skip`) because it timed out waiting for unmocked async operations

### Completion Notes

**Root Cause:** Missing mocks for services added after the test was written (Story 5.2, 5.7, 5.8, 7.8).

**Solution:** Added comprehensive mocks for all missing service dependencies:

- `dismissedPairsService.cleanupOldPairs()` → returns 0
- `marketDataCacheService.writeExchangeRates/writePrices/writeFundamentalsBatch()` → returns success
- `processClassificationsFromFundamentals()` → returns empty array
- `classifyAssetsFromFundamentals()` → returns success metrics

**Verification:**

- Test now passes consistently (verified 3 consecutive runs)
- All 5380 unit tests pass (previously 5379 passed + 1 skipped)
- No TypeScript errors
- No linting errors

## File List

### Modified Files

- `tests/unit/inngest/recommendation-generation.test.ts` - Added missing service mocks and unskipped the test
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status to "review"

### Created Files

_(none)_

### Deleted Files

_(none)_

## Change Log

| Date       | Change                                                                                                                      | Author      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2026-01-03 | Fixed test timeout by adding missing service mocks (dismissedPairsService, marketDataCacheService, classification services) | Dev Agent   |
| 2026-01-03 | Code review fixes: Added detectDriftAlerts mock, read methods for marketDataCacheService, updated File List                 | Code Review |
