# Technical Debt Story: Reorganize Large Test Files

## Story Overview

**Type:** Technical Debt / Test Organization
**Priority:** Low
**Estimated Effort:** 3-5 Function Points
**Epic:** Infrastructure / Code Quality

## Background

During Epic 2 PR review (Issue #8), it was identified that some test files have grown too large and test multiple concerns. Specifically, `tests/integration/portfolio-creation-schema.test.ts` is 483 lines and tests:

1. Schema validation (unit test level)
2. API endpoint behavior (integration test level)
3. Modal-specific logic (component test level)

This violates the separation of concerns principle and makes tests harder to maintain and understand.

## Current State

```
tests/integration/portfolio-creation-schema.test.ts (483 lines)
├── Schema validation tests (should be unit tests)
├── API endpoint tests (correct location)
└── Modal logic tests (should be component tests)
```

## Acceptance Criteria

- [ ] AC-1: Schema validation tests moved to `tests/unit/validations/portfolio-schema.test.ts`
- [ ] AC-2: API endpoint tests remain in `tests/integration/api/portfolios.test.ts`
- [ ] AC-3: Component-specific tests moved to `tests/unit/components/create-portfolio-modal.test.ts`
- [ ] AC-4: Each test file is focused on a single concern
- [ ] AC-5: All tests continue to pass after reorganization
- [ ] AC-6: No test coverage is lost

## Proposed File Structure

```
tests/
├── unit/
│   ├── validations/
│   │   └── portfolio-schema.test.ts    # Schema validation only
│   └── components/
│       └── create-portfolio-modal.test.ts  # Component logic
└── integration/
    └── api/
        └── portfolios.test.ts           # API endpoint behavior
```

## Files to Create/Update

- [ ] `tests/unit/validations/portfolio-schema.test.ts` - Create new file
- [ ] `tests/unit/components/create-portfolio-modal.test.ts` - Create or update
- [ ] `tests/integration/api/portfolios.test.ts` - Create or update
- [ ] `tests/integration/portfolio-creation-schema.test.ts` - Remove after migration

## Test Categorization Guide

### Unit Tests (`tests/unit/`)

Tests that:

- Test individual functions/methods in isolation
- Mock all external dependencies
- Run fast (< 100ms each)
- Don't require database or network

Examples from current file to move:

- `createPortfolioQuickSchema.safeParse()` tests
- Validation error message tests
- Schema constraint tests

### Integration Tests (`tests/integration/`)

Tests that:

- Test API endpoint behavior end-to-end
- May use test database
- Verify request/response cycle
- Test error response formats

Examples to keep:

- `POST /api/portfolios` success/failure tests
- Authentication middleware tests
- Database constraint tests

### Component Tests (`tests/unit/components/`)

Tests that:

- Test React component behavior
- Mock API calls
- Verify UI state changes
- Test form validation feedback

Examples to move:

- Form state tests
- Button enabled/disabled logic
- Error display tests

## Implementation Notes

1. **Maintain test organization patterns** - Follow existing patterns in `tests/unit/` and `tests/integration/`
2. **Update imports** - Ensure all imports are correct after moving files
3. **Check coverage** - Run `pnpm test:coverage` before and after to verify no loss
4. **Update CI** - Verify CI configuration still runs all test types

## Definition of Done

- [ ] Large test file split into focused files
- [ ] Each file tests a single concern
- [ ] All tests pass
- [ ] Test coverage maintained or improved
- [ ] CI pipeline passes
- [ ] PR review approved

## Related

- Epic 2 PR Review - Issue #8
- CLAUDE.md Development Standards
- Existing test organization in `tests/unit/` and `tests/integration/`
