# Technical Debt Story: Replace console.error with Structured Logger

## Story Overview

**Type:** Technical Debt / Code Quality
**Priority:** High
**Estimated Effort:** 3-5 Function Points
**Epic:** Infrastructure / Code Quality

## Background

During Epic 5 PR review, it was identified that multiple pre-existing files across the codebase use `console.error` instead of the structured `logger.error` from `@/lib/telemetry/logger`. This violates the Development Standards in CLAUDE.md which mandates structured logging.

## Acceptance Criteria

- [ ] AC-1: All `console.error` calls in API routes are replaced with `logger.error`
- [ ] AC-2: All `console.error` calls in services are replaced with `logger.error`
- [ ] AC-3: All `console.error` calls in utilities are replaced with `logger.error`
- [ ] AC-4: No new `console.error` calls introduced (verified by ESLint rule)
- [ ] AC-5: Logging includes structured context (userId, operation, etc.)

## Files to Update

### API Routes

- [ ] `src/app/api/user/account/route.ts:88`
- [ ] `src/app/api/user/profile/route.ts:85,171`
- [ ] `src/app/api/user/export/route.ts:54`

### Services

- [ ] `src/lib/services/account-service.ts:100,118,158,192`
- [ ] `src/lib/services/exchange-rate-service.ts:100`

### Additional Files (grep for `console.error`)

Run `grep -rn "console.error" src/` to identify all remaining instances.

## Implementation Notes

### Pattern to Follow

**Before:**

```typescript
} catch (error) {
  console.error("Failed to update profile:", error);
  return { error: "Update failed" };
}
```

**After:**

```typescript
import { logger } from "@/lib/telemetry/logger";

} catch (error) {
  logger.error("Failed to update profile", {
    userId: session.userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return { error: "Update failed" };
}
```

### ESLint Rule to Add

Add to `eslint.config.mjs`:

```javascript
{
  files: ["src/**/*.ts", "src/**/*.tsx"],
  rules: {
    "no-console": ["error", { allow: ["warn"] }],
  },
}
```

This will prevent future `console.error` (and `console.log`) usage in source files.

## Definition of Done

- [ ] All console.error calls replaced with logger.error
- [ ] ESLint rule added to prevent future violations
- [ ] All tests pass
- [ ] PR review approved
- [ ] No regressions in error handling behavior

## Related

- Epic 5 PR Review findings
- CLAUDE.md Development Standards
- `@/lib/telemetry/logger` documentation
