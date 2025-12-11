# PR Review Issues - Error Handling V2

## Issues Summary

| #   | Issue                            | Severity | Scope             |
| --- | -------------------------------- | -------- | ----------------- |
| 1   | Inconsistent Error Code Usage    | Warning  | 58 occurrences    |
| 2   | Missing userId in Log Contexts   | Medium   | ~50 routes        |
| 3   | Error Type Inconsistency         | Warning  | 29 files          |
| 4   | Redundant Error Handling Pattern | Medium   | 58 occurrences    |
| 5   | Missing Error Handling Cleanup   | Low      | 2 files           |
| 6   | Test Coverage Gap                | Medium   | Integration tests |

---

## Issue 1 & 4: Inconsistent Error Code Usage + Redundant Pattern

### Current Pattern (58 occurrences)

```typescript
} catch (error) {
  const dbError = handleDbError(error, "context");

  if (dbError.isConnectionError || dbError.isTimeout) {
    return databaseError(dbError, "resource");
  }

  return NextResponse.json<AuthError>(
    { error: "Failed to do X", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
```

### Problem

- Only connection/timeout errors get proper `databaseError()` treatment
- Constraint violations (409), permission errors, etc. all become generic 500
- Pattern repeated 58 times across codebase

### Solution

Replace with simplified pattern using `databaseError()` for ALL database errors:

```typescript
} catch (error) {
  const dbError = handleDbError(error, "context", { userId: session.userId });
  return databaseError(dbError, "resource");
}
```

### Exception

`auth/register/route.ts` has legitimate business logic for unique violation:

```typescript
if (dbError.code === DbErrorCode.UNIQUE_VIOLATION) {
  return errorResponse("Email already registered", CONFLICT_ERRORS.EMAIL_EXISTS, 409);
}
return databaseError(dbError, "user");
```

### Files to Update (57 catch blocks, excluding register)

1. `src/app/api/investments/route.ts` (2 catch blocks)
2. `src/app/api/asset-subclasses/[id]/route.ts` (3 catch blocks)
3. `src/app/api/user/account/route.ts` (1)
4. `src/app/api/assets/[id]/route.ts` (2)
5. `src/app/api/user/export/route.ts` (1)
6. `src/app/api/assets/[id]/ignore/route.ts` (1)
7. `src/app/api/user/profile/route.ts` (2)
8. `src/app/api/scores/[assetId]/inputs/route.ts` (1)
9. `src/app/api/data/convert/route.ts` (1)
10. `src/app/api/scores/[assetId]/replay/route.ts` (1)
11. `src/app/api/data/freshness/route.ts` (1)
12. `src/app/api/auth/login/route.ts` (1)
13. `src/app/api/scores/[assetId]/history/route.ts` (1)
14. `src/app/api/data/exchange-rates/route.ts` (1)
15. `src/app/api/scores/[assetId]/route.ts` (1)
16. `src/app/api/auth/reset-password/route.ts` (1)
17. `src/app/api/scores/[assetId]/breakdown/route.ts` (1)
18. `src/app/api/data/refresh/route.ts` (1)
19. `src/app/api/auth/me/route.ts` (1)
20. `src/app/api/scores/calculate/route.ts` (1)
21. `src/app/api/data/prices/route.ts` (1)
22. `src/app/api/data/fundamentals/route.ts` (1)
23. `src/app/api/portfolios/[id]/assets/route.ts` (2)
24. `src/app/api/criteria/[id]/copy/route.ts` (1)
25. `src/app/api/portfolios/[id]/allocations/route.ts` (1)
26. `src/app/api/auth/logout/route.ts` (1)
27. `src/app/api/portfolios/[id]/values/route.ts` (1)
28. `src/app/api/criteria/[id]/route.ts` (3)
29. `src/app/api/portfolios/route.ts` (2)
30. `src/app/api/criteria/route.ts` (2)
31. `src/app/api/auth/resend-verification/route.ts` (1)
32. `src/app/api/criteria/[id]/reorder/route.ts` (1)
33. `src/app/api/asset-classes/summary/route.ts` (1)
34. `src/app/api/criteria/preview/route.ts` (1)
35. `src/app/api/auth/refresh/route.ts` (1)
36. `src/app/api/criteria/compare/route.ts` (1)
37. `src/app/api/auth/verify/route.ts` (1)
38. `src/app/api/asset-classes/[id]/route.ts` (3)
39. `src/app/api/asset-classes/[id]/validate-subclasses/route.ts` (1)
40. `src/app/api/asset-classes/[id]/subclasses/route.ts` (2)
41. `src/app/api/asset-classes/asset-counts/route.ts` (1)
42. `src/app/api/asset-classes/route.ts` (2)
43. `src/app/api/asset-classes/validate/route.ts` (1)

---

## Issue 2: Missing userId in Log Contexts

### Current State

Only 6 routes pass userId to `handleDbError`:

- `criteria/[id]/copy/route.ts`
- `criteria/[id]/route.ts` (3 calls)
- `criteria/route.ts` (2 calls)
- `criteria/[id]/reorder/route.ts`
- `criteria/preview/route.ts`
- `criteria/compare/route.ts`

### Solution

All routes with `session.userId` available should pass it:

```typescript
const dbError = handleDbError(error, "context", { userId: session.userId });
```

### Routes to Update (those with withAuth that don't pass userId)

All routes using `withAuth` have access to `session.userId` and should include it.

---

## Issue 3: Error Type Inconsistency

### Current State

29 files use `AuthError` type for database error responses.

### Solution

Replace `AuthError` with `ErrorResponseBody` from `@/lib/api/responses`:

```typescript
// Before
return NextResponse.json<AuthError>(...);

// After
return NextResponse.json<ErrorResponseBody>(...);
```

Note: When using `databaseError()` directly, no type annotation needed since the function already returns the correct type.

---

## Issue 5: Missing Error Handling Cleanup

### Files with Redundant logger.error

1. `src/app/api/auth/reset-password/route.ts:148`
2. `src/app/api/auth/resend-verification/route.ts:186`

### Solution

Remove redundant `logger.error` calls since `handleDbError` already logs.

---

## Issue 6: Test Coverage Gap

### Current State

Integration tests mock the service layer, so they test route logic but not actual database error handling code paths.

### Options

1. **Add unit tests for databaseError function** - Already done (18 tests)
2. **Add service-level tests** - Test services with mocked DB that throws errors
3. **Add database-level integration tests** - Tests that mock postgres.js to throw errors

### Recommendation

Add tests that mock at the database connection level rather than service level:

```typescript
// Mock postgres.js to throw connection error
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => {
        throw createDbError(DbErrorCode.CONNECTION_FAILURE, "Connection refused");
      },
    }),
  },
}));
```

---

## Implementation Plan

### Phase 1: Create Helper (Optional)

Consider creating a simplified error handling helper:

```typescript
export function handleApiDbError(
  error: unknown,
  context: string,
  resourceName: string,
  additionalContext?: Record<string, unknown>
): NextResponse<ErrorResponseBody> {
  const dbError = handleDbError(error, context, additionalContext);
  return databaseError(dbError, resourceName);
}
```

### Phase 2: Fix Routes (57 catch blocks)

For each route:

1. Replace the `if (dbError.isConnectionError || dbError.isTimeout)` pattern
2. Add `userId` to context when available
3. Remove `AuthError` type annotations
4. Remove redundant logger.error calls

### Phase 3: Update Tests

1. Update integration tests to verify new behavior
2. Add database-level mock tests if needed

### Phase 4: Verify

1. Run all tests
2. Run type check
3. Run lint

---

## Example Transformation

### Before

```typescript
} catch (error) {
  const dbError = handleDbError(error, "list portfolios");

  if (dbError.isConnectionError || dbError.isTimeout) {
    return databaseError(dbError, "portfolios");
  }

  return NextResponse.json<AuthError>(
    {
      error: "Failed to fetch portfolios",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
```

### After

```typescript
} catch (error) {
  const dbError = handleDbError(error, "list portfolios", { userId: session.userId });
  return databaseError(dbError, "portfolios");
}
```

This reduces:

- Lines of code: 13 → 3
- Error handling inconsistency: Eliminated
- Missing context: Fixed
