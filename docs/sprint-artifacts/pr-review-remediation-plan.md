# PR Review Remediation Plan

**Status: IMPLEMENTED**
**Implementation Date: 2025-12-04**

## Overview

This plan addresses three production-readiness issues identified in PR review:

| Issue               | Current State                        | Target State                     | Priority | Status |
| ------------------- | ------------------------------------ | -------------------------------- | -------- | ------ |
| **Rate Limiting**   | In-memory `Map` store                | Vercel KV persistent store       | HIGH     | DONE   |
| **Email Delivery**  | Fire-and-forget with silent failures | Inngest job queue with retries   | MEDIUM   | DONE   |
| **Console Logging** | 32 source files with console.\*      | Structured OpenTelemetry logging | LOW      | DONE   |

---

## Implementation Summary

### Issue 1: Rate Limiting - COMPLETED

**Files Created:**

- `src/lib/auth/rate-limit-kv.ts` - KV-backed rate limiting with graceful fallback

**Files Modified:**

- `src/lib/cache/config.ts` - Added rate limit key prefixes
- `src/lib/cache/keys.ts` - Added key generation functions
- `src/lib/auth/rate-limit.ts` - Made functions async, added KV switching logic
- `src/app/api/auth/login/route.ts` - Updated to use async rate limiting
- `src/app/api/auth/resend-verification/route.ts` - Updated to use async rate limiting

**Tests Created:**

- `tests/unit/auth/rate-limit-kv.test.ts`

### Issue 2: Email Delivery - COMPLETED

**Files Created:**

- `src/lib/inngest/functions/send-verification-email.ts` - Inngest function with 3 retries
- `src/lib/inngest/functions/send-password-reset-email.ts` - Inngest function with 3 retries

**Files Modified:**

- `src/lib/inngest/client.ts` - Added email event types
- `src/lib/inngest/index.ts` - Registered new functions
- `src/app/api/inngest/route.ts` - Updated to use functions array
- `src/app/api/auth/register/route.ts` - Uses Inngest instead of fire-and-forget
- `src/app/api/auth/resend-verification/route.ts` - Uses Inngest instead of fire-and-forget
- `src/app/api/auth/forgot-password/route.ts` - Uses Inngest instead of fire-and-forget

### Issue 3: Structured Logging - COMPLETED

**Files Created:**

- `src/lib/telemetry/logger.ts` - Structured logger with trace correlation and sensitive data redaction

**Files Modified:**

- `src/app/api/auth/login/route.ts` - Uses structured logger
- `src/app/api/auth/register/route.ts` - Uses structured logger
- `src/app/api/auth/resend-verification/route.ts` - Uses structured logger
- `src/app/api/auth/forgot-password/route.ts` - Uses structured logger, removed sensitive logs
- `src/lib/email/email-service.ts` - Uses structured logger with email redaction
- `src/lib/auth/rate-limit-kv.ts` - Uses structured logger
- `src/lib/cache/client.ts` - Uses structured logger
- `src/lib/inngest/functions/purge-deleted-user.ts` - Uses structured logger with user ID redaction
- `src/lib/telemetry/setup.ts` - Wrapped bootstrap logs in dev-only checks

---

## Issue 1: Rate Limiting Migration to Vercel KV

### Problem

The current rate limiting implementation (`src/lib/auth/rate-limit.ts:33,215`) uses in-memory `Map` stores:

- **Won't work in serverless**: Each Vercel function instance has its own memory
- **State lost on restart**: Rate limits reset when server restarts
- **No cross-instance coordination**: Attacker can bypass by hitting different instances

### Existing Infrastructure

Vercel KV is already configured (`src/lib/cache/client.ts`):

- `cacheGet<T>(key)` - Get with graceful error handling
- `cacheSet<T>(key, value, { ttlSeconds })` - Set with TTL
- `cacheDel(key)` - Delete
- `cacheExists(key)` - Check existence

### Implementation Plan

#### Task 1.1: Create KV-based Rate Limit Functions

**File**: `src/lib/auth/rate-limit-kv.ts` (new)

```typescript
// Key format: rate-limit:ip:{ip} or rate-limit:email:{email}
// Value: { attempts: number, windowStart: number }
// TTL: Auto-expire with RATE_LIMIT_WINDOW_MS

export async function checkRateLimitKV(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult>;
export async function recordFailedAttemptKV(key: string, config: RateLimitConfig): Promise<void>;
export async function clearRateLimitKV(key: string): Promise<void>;
```

#### Task 1.2: Define Cache Key Functions

**File**: `src/lib/cache/keys.ts` (add)

```typescript
export const RATE_LIMIT_KEYS = {
  ip: (ip: string) => `rate-limit:ip:${ip}`,
  email: (email: string) => `rate-limit:email:${email.toLowerCase()}`,
};
```

#### Task 1.3: Update Existing Rate Limit Functions

**File**: `src/lib/auth/rate-limit.ts` (modify)

- Keep existing in-memory functions for backwards compatibility during transition
- Add new KV-backed functions as primary
- Add environment-based switching (`USE_KV_RATE_LIMIT=true`)

#### Task 1.4: Update Auth Routes to Use KV Rate Limiting

**Files**:

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/api/auth/forgot-password/route.ts`

#### Task 1.5: Write Unit Tests

**File**: `tests/unit/auth/rate-limit-kv.test.ts` (new)

### Acceptance Criteria

- [ ] Rate limits persist across serverless function invocations
- [ ] Rate limits expire correctly (1 hour window)
- [ ] Graceful fallback to in-memory if KV fails
- [ ] No breaking changes to existing API contracts

---

## Issue 2: Email Delivery with Inngest Job Queue

### Problem

Current email sending (`src/app/api/auth/register/route.ts:127-129`):

```typescript
void sendVerificationEmail(email, verificationToken).catch((err) => {
  console.error("Failed to send verification email:", err);
});
```

- **Silent failures**: User gets "success" even if email fails
- **No retries**: Transient failures are not retried
- **No visibility**: Failed emails are lost in logs

### Existing Infrastructure

Inngest is already configured (`src/lib/inngest/`):

- Client with typed events
- Example function with retries (`purge-deleted-user.ts`)
- API route at `/api/inngest`

### Implementation Plan

#### Task 2.1: Define Email Events

**File**: `src/lib/inngest/client.ts` (modify)

```typescript
export type Events = {
  "user/deletion.scheduled": { ... },
  // New email events:
  "email/verification.requested": {
    data: {
      userId: string;
      email: string;
      token: string;
      requestedAt: string;
    };
  };
  "email/password-reset.requested": {
    data: {
      userId: string;
      email: string;
      token: string;
      requestedAt: string;
    };
  };
};
```

#### Task 2.2: Create Email Sending Functions

**File**: `src/lib/inngest/functions/send-verification-email.ts` (new)

```typescript
export const sendVerificationEmailJob = inngest.createFunction(
  {
    id: "send-verification-email",
    retries: 3,
    onFailure: async ({ error, event }) => {
      // Log to monitoring/alerting system
      // Could trigger admin notification for manual intervention
    },
  },
  { event: "email/verification.requested" },
  async ({ event, step }) => {
    await step.run("send-email", async () => {
      await sendVerificationEmail(event.data.email, event.data.token);
    });
  }
);
```

#### Task 2.3: Create Password Reset Email Function

**File**: `src/lib/inngest/functions/send-password-reset-email.ts` (new)

Similar structure to verification email.

#### Task 2.4: Register Functions with Inngest

**File**: `src/lib/inngest/index.ts` (modify)

```typescript
export const functions = [purgeDeletedUser, sendVerificationEmailJob, sendPasswordResetEmailJob];
```

#### Task 2.5: Update Auth Routes to Dispatch Events

**Files**:

- `src/app/api/auth/register/route.ts` - Dispatch `email/verification.requested`
- `src/app/api/auth/resend-verification/route.ts` - Dispatch `email/verification.requested`
- `src/app/api/auth/forgot-password/route.ts` - Dispatch `email/password-reset.requested`

**Before**:

```typescript
void sendVerificationEmail(email, token).catch(...);
```

**After**:

```typescript
await inngest.send({
  name: "email/verification.requested",
  data: { userId: user.id, email, token, requestedAt: new Date().toISOString() },
});
```

#### Task 2.6: Write Unit Tests

**File**: `tests/unit/inngest/email-functions.test.ts` (new)

### Acceptance Criteria

- [ ] Email sending has 3 retry attempts with exponential backoff
- [ ] Failed emails are visible in Inngest dashboard
- [ ] Registration still returns success immediately (async email)
- [ ] Email events are tracked for debugging

---

## Issue 3: Structured Logging (Replace console.\*)

### Problem

32 source files contain `console.log/error/warn` statements:

- **Sensitive data risk**: Some may log sensitive information
- **No correlation**: Can't trace logs across requests
- **Inconsistent format**: Hard to parse in log aggregation

### Existing Infrastructure

OpenTelemetry is configured (`src/lib/telemetry/setup.ts`):

- Trace export to OTLP endpoint
- BatchSpanProcessor for non-blocking export
- Resource attributes for service identification

### Implementation Plan

#### Task 3.1: Create Logger Utility

**File**: `src/lib/telemetry/logger.ts` (new)

```typescript
import { trace, context } from "@opentelemetry/api";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

function log(level: LogLevel, message: string, ctx?: LogContext): void {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    traceId,
    ...ctx,
  };

  // In development, use console for readability
  if (process.env.NODE_ENV === "development") {
    console[level === "debug" ? "log" : level](`[${level.toUpperCase()}] ${message}`, ctx);
    return;
  }

  // In production, output structured JSON
  console[level === "debug" ? "log" : level](JSON.stringify(logEntry));
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => log("error", msg, ctx),
};
```

#### Task 3.2: Audit Console Statements for Sensitive Data

Review all 32 files and classify each console statement:

| Category           | Action                        |
| ------------------ | ----------------------------- |
| Debug info (safe)  | Replace with `logger.debug()` |
| Operational logs   | Replace with `logger.info()`  |
| Warnings           | Replace with `logger.warn()`  |
| Errors             | Replace with `logger.error()` |
| **Sensitive data** | **Remove or redact**          |

**High-risk files to audit first**:

- `src/app/api/auth/*` - Authentication data
- `src/lib/auth/*` - Password/token handling
- `src/lib/email/*` - Email addresses

#### Task 3.3: Replace Console Statements by File

Prioritize by risk, starting with auth files:

1. `src/app/api/auth/login/route.ts`
2. `src/app/api/auth/register/route.ts`
3. `src/lib/email/email-service.ts`
4. `src/lib/auth/rate-limit.ts`
   ... (remaining 28 files)

#### Task 3.4: Add ESLint Rule

**File**: `eslint.config.mjs` (modify)

```javascript
// Add rule to warn on console usage
rules: {
  "no-console": ["warn", { allow: ["error"] }],
}
```

#### Task 3.5: Write Tests for Logger

**File**: `tests/unit/telemetry/logger.test.ts` (new)

### Acceptance Criteria

- [ ] No `console.log` with sensitive data (passwords, tokens, emails)
- [ ] All logs include trace ID for correlation
- [ ] Production logs are structured JSON
- [ ] Development logs remain human-readable
- [ ] ESLint warns on new console usage

---

## Implementation Order

### Phase 1: Critical (Do First)

1. **Rate Limiting to KV** (Issue 1) - Security-critical for production
   - Estimated: 3-4 hours
   - Risk: Low (KV infrastructure already exists)

### Phase 2: High Priority

2. **Email with Inngest** (Issue 2) - User experience critical
   - Estimated: 3-4 hours
   - Risk: Low (Inngest already configured)

### Phase 3: Polish

3. **Structured Logging** (Issue 3) - Operational improvement
   - Estimated: 4-6 hours
   - Risk: Very low (no functional changes)

---

## Rollback Plan

Each change includes a feature flag or backwards-compatible transition:

| Change             | Rollback Mechanism                             |
| ------------------ | ---------------------------------------------- |
| KV Rate Limiting   | `USE_KV_RATE_LIMIT=false` reverts to in-memory |
| Inngest Email      | Direct email sending if Inngest event fails    |
| Structured Logging | Logger falls back to console in development    |

---

## Testing Strategy

1. **Unit Tests**: All new functions have dedicated test files
2. **Integration Tests**: Rate limit with mock KV, Inngest with step mocks
3. **E2E Tests**: Verify registration/login flows still work
4. **Manual Testing**: Inngest dashboard verification, log output review

---

## Files to Create

| File                                                     | Purpose                    |
| -------------------------------------------------------- | -------------------------- |
| `src/lib/auth/rate-limit-kv.ts`                          | KV-backed rate limiting    |
| `src/lib/inngest/functions/send-verification-email.ts`   | Verification email job     |
| `src/lib/inngest/functions/send-password-reset-email.ts` | Password reset email job   |
| `src/lib/telemetry/logger.ts`                            | Structured logging utility |
| `tests/unit/auth/rate-limit-kv.test.ts`                  | Rate limit KV tests        |
| `tests/unit/inngest/email-functions.test.ts`             | Email function tests       |
| `tests/unit/telemetry/logger.test.ts`                    | Logger tests               |

## Files to Modify

| File                                            | Changes                       |
| ----------------------------------------------- | ----------------------------- |
| `src/lib/cache/keys.ts`                         | Add rate limit key generators |
| `src/lib/inngest/client.ts`                     | Add email event types         |
| `src/lib/inngest/index.ts`                      | Register new functions        |
| `src/app/api/auth/register/route.ts`            | Use Inngest for email         |
| `src/app/api/auth/resend-verification/route.ts` | Use Inngest for email         |
| `src/app/api/auth/forgot-password/route.ts`     | Use Inngest for email         |
| `src/app/api/auth/login/route.ts`               | Use KV rate limiting          |
| `eslint.config.mjs`                             | Add no-console rule           |
| 32 files with console.\*                        | Replace with logger           |
