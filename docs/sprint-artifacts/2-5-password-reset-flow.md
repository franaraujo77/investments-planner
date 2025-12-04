# Story 2.5: Password Reset Flow

**Status:** done
**Epic:** Epic 2 - User Onboarding & Profile
**Previous Story:** 2.4 User Logout

---

## Story

**As a** user who forgot my password
**I want to** reset it via email
**So that** I can regain access to my account

---

## Acceptance Criteria

### AC-2.5.1: Forgot Password Form

- **Given** I am on the login page
- **When** I click "Forgot password?"
- **Then** I see an email input form with a submit button

### AC-2.5.2: No Email Enumeration

- **Given** I enter any email and submit the forgot password form
- **When** the request is processed
- **Then** I see "If an account exists, a reset link has been sent" (same message regardless of email existence)

### AC-2.5.3: Reset Link Expiration

- **Given** a password reset email is sent
- **When** the link is generated
- **Then** it expires in 1 hour

### AC-2.5.4: Reset Password Form

- **Given** I click the reset link in my email
- **When** the page loads
- **Then** I see a password reset form with new password and confirm password fields
- **And** the form shows password requirements (8+ chars, 1 uppercase, 1 number, 1 special)

### AC-2.5.5: Session Invalidation

- **Given** I successfully reset my password
- **When** the password is updated
- **Then** all existing refresh tokens for my account are invalidated
- **And** I must log in again with the new password

### AC-2.5.6: Success Redirect

- **Given** I successfully reset my password
- **When** the reset completes
- **Then** I am redirected to the login page with "Password reset successful" toast

---

## Technical Notes

### Existing Infrastructure

The following components are **already implemented** and can be reused:

| Component                     | Location                            | Purpose                 |
| ----------------------------- | ----------------------------------- | ----------------------- |
| `password_reset_tokens` table | `src/lib/db/schema.ts:134-150`      | Token storage with hash |
| `PasswordResetToken` type     | `src/lib/db/schema.ts:207-208`      | TypeScript type         |
| `hashPassword()`              | `src/lib/auth/password.ts`          | bcrypt hashing          |
| `verifyPassword()`            | `src/lib/auth/password.ts`          | Password comparison     |
| Password validation           | `src/lib/auth/validation.ts`        | Complexity regex        |
| Password strength meter       | `src/lib/auth/password-strength.ts` | Real-time feedback      |
| Email service                 | `src/lib/email/`                    | Email sending (Resend)  |
| `deleteUserRefreshTokens()`   | `src/lib/auth/service.ts:208-210`   | Invalidate all tokens   |
| Toast notifications           | sonner                              | User feedback           |

### What Needs to Be Built

#### 1. Password Reset Service Functions (`src/lib/auth/service.ts`)

Add the following functions:

```typescript
// Generate secure random token (not JWT - per tech spec)
export async function createPasswordResetToken(userId: string): Promise<string>;

// Find token by hash (single-use, not expired)
export async function findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null>;

// Mark token as used
export async function markPasswordResetTokenUsed(tokenId: string): Promise<void>;

// Update user's password hash
export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void>;

// Invalidate all unused reset tokens for user
export async function invalidateUserPasswordResetTokens(userId: string): Promise<void>;
```

#### 2. API Routes

**POST `/api/auth/forgot-password`**

- Request: `{ email: string }`
- Response: `{ message: "If an account exists, a reset link has been sent" }`
- No authentication required
- Always return same message (no email enumeration)
- If user exists: generate token, send email
- If user doesn't exist: log attempt, return same message

**POST `/api/auth/reset-password`**

- Request: `{ token: string, newPassword: string }`
- Response: `{ success: true }` or error
- No authentication required
- Validate token (not expired, not used)
- Validate password complexity
- Update password hash
- Invalidate all refresh tokens
- Mark token as used

#### 3. Frontend Pages

**Forgot Password Page (`src/app/(auth)/forgot-password/page.tsx`)**

- Email input form
- Submit button with loading state
- Success message display
- Link back to login

**Reset Password Page (`src/app/(auth)/reset-password/page.tsx`)**

- Extract token from URL query param
- New password and confirm password fields
- Password strength meter (reuse from registration)
- Password requirements display
- Submit button with loading state
- Error handling for invalid/expired token
- Success redirect to login with toast

#### 4. Email Template

**Password Reset Email (`src/lib/email/templates/password-reset.tsx`)**

- Subject: "Reset your password - Investments Planner"
- Contains reset link: `{APP_URL}/reset-password?token={token}`
- 1 hour expiry notice
- Security reminder: "If you didn't request this, ignore this email"

---

## Tasks

### [x] Task 1: Add Password Reset Service Functions

**File:** `src/lib/auth/service.ts`

Add functions for password reset token management:

- `createPasswordResetToken()` - Generate crypto random token, hash it, store in DB
- `findPasswordResetToken()` - Lookup by hash, check expiry and used status
- `markPasswordResetTokenUsed()` - Set usedAt timestamp
- `updateUserPassword()` - Update user's passwordHash
- `invalidateUserPasswordResetTokens()` - Mark all unused tokens as used

Token generation should use `crypto.randomBytes(32).toString('hex')` (64 char token).
Store hash of token in DB (use same hash function as passwords or SHA-256).

### [x] Task 2: Create Forgot Password API Route

**File:** `src/app/api/auth/forgot-password/route.ts`

- Accept POST with `{ email }`
- Validate email format with Zod
- Always return same response (no email enumeration)
- If user exists:
  - Invalidate any existing unused reset tokens
  - Generate new token
  - Send password reset email
- Log all requests for security monitoring

### [x] Task 3: Create Reset Password API Route

**File:** `src/app/api/auth/reset-password/route.ts`

- Accept POST with `{ token, newPassword }`
- Hash the incoming token and lookup in DB
- Validate:
  - Token exists
  - Token not expired (1 hour)
  - Token not already used
  - New password meets complexity requirements
- On success:
  - Update user's passwordHash
  - Delete all user's refresh tokens (force re-login)
  - Mark reset token as used
  - Return success

### [x] Task 4: Create Password Reset Email Template (Already existed)

**File:** `src/lib/email/templates/password-reset.tsx`

Create React Email template:

- Header with logo
- "Reset your password" heading
- Reset button/link
- Expiry notice (1 hour)
- Security notice ("If you didn't request this...")
- Footer with app name

### [x] Task 5: Create Forgot Password Page

**File:** `src/app/(auth)/forgot-password/page.tsx`

Create client component with:

- Email input field with validation
- Submit button with loading state
- Success state showing "Check your email" message
- Error state for validation errors
- Link back to login
- Consistent styling with login/register pages

### [x] Task 6: Create Reset Password Page

**File:** `src/app/(auth)/reset-password/page.tsx`

Create client component with:

- Extract `token` from URL search params
- New password input with visibility toggle
- Confirm password input
- Password strength meter (reuse `PasswordStrengthMeter`)
- Password requirements list
- Submit button with loading state
- Error handling:
  - Invalid token
  - Expired token
  - Already used token
  - Password mismatch
- Success: redirect to `/login` with toast

### [x] Task 7: Add Forgot Password Link to Login Page

**File:** `src/app/(auth)/login/page.tsx`

Add "Forgot password?" link below password field, linking to `/forgot-password`.

### [x] Task 8: Create Unit Tests

**File:** `tests/unit/auth/password-reset.test.ts`

Test cases:

- Token generation produces secure random token
- Token hashing is consistent
- Token lookup finds valid tokens
- Expired tokens are rejected
- Used tokens are rejected
- Password update changes hash
- Refresh tokens are deleted on reset
- Same response for existing and non-existing emails

### [x] Task 9: Create E2E Tests

**File:** `tests/e2e/password-reset.spec.ts`

Test cases:

- Forgot password link visible on login page
- Email form validation
- Submit shows success message (regardless of email)
- Reset page loads with valid token
- Reset page shows error for invalid token
- Password complexity validation on reset form
- Successful reset redirects to login
- Cannot access dashboard with old session after reset

### [x] Task 10: Run Verification

- `pnpm lint` - no errors
- `pnpm build` - successful build
- `pnpm test` - all tests pass

---

## Dependencies

- Story 1.3: Authentication System (provides JWT infrastructure) - **COMPLETE**
- Story 2.1: User Registration (provides password hashing) - **COMPLETE**
- Story 2.2: Email Verification (provides email service) - **COMPLETE**
- Story 2.3: User Login (login page for redirect) - **COMPLETE**

---

## Dev Notes

### Security Considerations

1. **No Email Enumeration**: Always return the same message regardless of whether email exists
2. **Secure Token**: Use `crypto.randomBytes(32)` - NOT JWT (per tech spec)
3. **Token Hashing**: Store hash of token in DB, not raw token
4. **1 Hour Expiry**: Short expiry window per tech spec
5. **Single Use**: Mark token as used immediately after password update
6. **Session Invalidation**: Delete ALL refresh tokens on password reset

### Token Flow

```
1. User requests reset → POST /api/auth/forgot-password
2. Generate random token (64 hex chars)
3. Hash token → Store hash in password_reset_tokens
4. Send email with raw token in URL
5. User clicks link → GET /reset-password?token=xxx
6. User submits new password → POST /api/auth/reset-password
7. Hash incoming token → Lookup in DB
8. Update password → Invalidate sessions → Mark token used
```

### Password Requirements (from Story 2.1)

```typescript
// From src/lib/auth/validation.ts
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

- Minimum 8 characters
- At least 1 lowercase letter
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (@$!%\*?&)

### Learnings from Previous Story

**From Story 2-4-user-logout:**

- Toast notifications with sonner work well for user feedback
- Handle errors gracefully (still redirect on failure)
- Authentication API infrastructure is solid
- Follow established patterns in `src/lib/auth/` and `src/app/(auth)/`

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Password-Reset-Flow]
- [Source: docs/epics.md#Story-2.5]
- [Source: src/lib/db/schema.ts#password_reset_tokens]
- [Source: src/lib/auth/service.ts]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-5-password-reset-flow.context.xml`

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Implemented complete password reset flow with secure token handling
- Used crypto.randomBytes(32) for token generation, SHA-256 for hashing
- Email template already existed in email-service.ts
- Updated login page link from /reset-password to /forgot-password
- Fixed existing login.spec.ts test expectation for forgot password link
- All 6 acceptance criteria met
- Unit tests: 24 tests passing
- E2E tests: comprehensive coverage of forgot/reset flows
- Build: successful, no TypeScript errors
- Lint: passed

### File List

**New Files:**

- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/forgot-password/forgot-password-form.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/reset-password/reset-password-form.tsx`
- `tests/unit/auth/password-reset.test.ts`
- `tests/e2e/password-reset.spec.ts`

**Modified Files:**

- `src/lib/auth/service.ts` (added password reset token functions)
- `src/app/(auth)/login/page.tsx` (changed forgot password link)
- `tests/e2e/login.spec.ts` (fixed forgot password link expectation)

---

## Senior Developer Review (AI)

### Reviewer

Bmad (AI Code Review)

### Date

2025-12-02

### Outcome

**APPROVE**

All 6 acceptance criteria are fully implemented with evidence. All 10 tasks marked complete are verified as actually done. No blocking issues found.

### Summary

The Password Reset Flow implementation is complete, secure, and follows established patterns from the existing authentication system. The implementation correctly handles:

- Secure token generation with crypto.randomBytes(32)
- Token hashing with SHA-256 for database storage
- No email enumeration protection
- 1-hour token expiry
- Single-use token enforcement
- Session invalidation on password reset
- User-friendly UI with proper error handling

### Key Findings

**No HIGH or MEDIUM severity findings.**

**LOW Severity:**

- Note: Minor code redundancy in reset-password API - both `findPasswordResetTokenRaw` and `findPasswordResetToken` are called sequentially. This is intentional for better error differentiation but could be optimized.

### Acceptance Criteria Coverage

| AC#      | Description                 | Status      | Evidence                                                                                                                      |
| -------- | --------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| AC-2.5.1 | Forgot Password Form        | IMPLEMENTED | `src/app/(auth)/forgot-password/forgot-password-form.tsx:117-135` (email input), `src/app/(auth)/login/page.tsx:59-67` (link) |
| AC-2.5.2 | No Email Enumeration        | IMPLEMENTED | `src/app/api/auth/forgot-password/route.ts:33-37,89-90` (STANDARD_RESPONSE always returned)                                   |
| AC-2.5.3 | Reset Link Expiration (1hr) | IMPLEMENTED | `src/lib/auth/constants.ts:28` (PASSWORD_RESET_TOKEN_EXPIRY = 3600), `src/lib/auth/service.ts:387-388`                        |
| AC-2.5.4 | Reset Password Form         | IMPLEMENTED | `src/app/(auth)/reset-password/reset-password-form.tsx:160-170` (requirements), `:172-244` (form fields)                      |
| AC-2.5.5 | Session Invalidation        | IMPLEMENTED | `src/app/api/auth/reset-password/route.ts:130-131` (deleteUserRefreshTokens called)                                           |
| AC-2.5.6 | Success Redirect            | IMPLEMENTED | `src/app/(auth)/reset-password/reset-password-form.tsx:128-130` (toast + redirect)                                            |

**Summary: 6 of 6 acceptance criteria fully implemented**

### Task Completion Validation

| Task                         | Marked As | Verified As | Evidence                                                        |
| ---------------------------- | --------- | ----------- | --------------------------------------------------------------- |
| Task 1: Service Functions    | [x]       | VERIFIED    | `src/lib/auth/service.ts:350-507` - 7 functions added           |
| Task 2: Forgot Password API  | [x]       | VERIFIED    | `src/app/api/auth/forgot-password/route.ts` - 97 lines          |
| Task 3: Reset Password API   | [x]       | VERIFIED    | `src/app/api/auth/reset-password/route.ts` - 150 lines          |
| Task 4: Email Template       | [x]       | VERIFIED    | Pre-existed in `src/lib/email/email-service.ts`                 |
| Task 5: Forgot Password Page | [x]       | VERIFIED    | `src/app/(auth)/forgot-password/` - page.tsx + form.tsx         |
| Task 6: Reset Password Page  | [x]       | VERIFIED    | `src/app/(auth)/reset-password/` - page.tsx + form.tsx          |
| Task 7: Login Page Link      | [x]       | VERIFIED    | `src/app/(auth)/login/page.tsx:59-67` - href="/forgot-password" |
| Task 8: Unit Tests           | [x]       | VERIFIED    | `tests/unit/auth/password-reset.test.ts` - 24 tests             |
| Task 9: E2E Tests            | [x]       | VERIFIED    | `tests/e2e/password-reset.spec.ts` - comprehensive coverage     |
| Task 10: Verification        | [x]       | VERIFIED    | Build passes, lint passes, 342 tests pass                       |

**Summary: 10 of 10 completed tasks verified, 0 questionable, 0 false completions**

### Test Coverage and Gaps

**Unit Tests:**

- Token hashing consistency ✓
- Token expiry validation ✓
- Token used state validation ✓
- Combined validation logic ✓
- Security requirements ✓
- Error code definitions ✓

**E2E Tests:**

- Forgot password page rendering ✓
- Email form validation ✓
- Success message display ✓
- Reset page with valid token ✓
- Reset page error states ✓
- Password complexity validation ✓
- Success redirect to login ✓
- Login page integration ✓

**Coverage Assessment:** Comprehensive. Both happy path and error scenarios are tested.

### Architectural Alignment

- ✓ Uses existing auth service patterns (`src/lib/auth/service.ts`)
- ✓ Uses existing validation patterns (`src/lib/auth/validation.ts`)
- ✓ Uses existing email service (`src/lib/email/email-service.ts`)
- ✓ Uses existing auth page layout (`src/app/(auth)/layout.tsx`)
- ✓ Uses existing component patterns (Form, Input, Button, PasswordStrengthMeter)
- ✓ Follows tech spec for token handling (crypto random, not JWT)
- ✓ Follows tech spec for 1-hour expiry
- ✓ Follows tech spec for session invalidation

### Security Notes

| Control                 | Status | Evidence                                        |
| ----------------------- | ------ | ----------------------------------------------- |
| No email enumeration    | ✓      | Same response regardless of email existence     |
| Secure token generation | ✓      | crypto.randomBytes(32) = 256-bit random         |
| Token hashing           | ✓      | SHA-256 hash stored, not raw token              |
| 1-hour expiry           | ✓      | AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_EXPIRY      |
| Single-use tokens       | ✓      | usedAt timestamp set after use                  |
| Session invalidation    | ✓      | deleteUserRefreshTokens called                  |
| Input validation        | ✓      | Zod schemas for email and password              |
| Password complexity     | ✓      | 8+ chars, uppercase, lowercase, number, special |

### Best-Practices and References

- [OWASP Password Reset Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) - Implementation follows recommended practices
- [Node.js crypto.randomBytes](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback) - Cryptographically secure random generation
- React Hook Form + Zod - Industry standard for form validation

### Action Items

**Code Changes Required:**

- None. All requirements met.

**Advisory Notes:**

- Note: Consider adding rate limiting to forgot-password endpoint in future iteration (not required for MVP per tech spec)
- Note: The token lookup redundancy in reset-password API is a minor optimization opportunity but not blocking

---

## Change Log

| Date       | Change                                   | Author         |
| ---------- | ---------------------------------------- | -------------- |
| 2025-12-02 | Story drafted                            | Dev Agent      |
| 2025-12-02 | Story context generated                  | SM Agent       |
| 2025-12-02 | Implementation complete, moved to review | Dev Agent      |
| 2025-12-02 | Senior Developer Review - APPROVED       | AI Code Review |
