# Epic Technical Specification: User Onboarding & Profile

Date: 2025-12-01
Author: Bmad
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 implements the complete user lifecycle for Investments Planner - from initial registration through account deletion. This epic builds upon the JWT authentication infrastructure established in Epic 1 (Story 1.3) to deliver secure, user-friendly account management that meets fintech security standards.

The user onboarding flow is critical for establishing trust with users who will entrust the platform with their investment strategy configurations. Key differentiators include: email verification for account security, refresh token rotation for session management, and GDPR-compliant data export and deletion capabilities.

All 8 stories in this epic enable users to securely access the platform while maintaining full control over their data - a fundamental requirement for a fintech application handling sensitive portfolio information.

## Objectives and Scope

### In Scope

- User registration with email/password and real-time validation
- Email verification with secure, time-limited tokens
- Login flow with JWT access tokens (15min) and refresh tokens (7d/30d)
- Session management with secure httpOnly cookies
- Password reset via email with secure token flow
- Profile settings including base currency selection
- Data export (ZIP with JSON portfolio, criteria, history)
- Account deletion with soft delete and 30-day purge
- Rate limiting on authentication endpoints
- Financial disclaimer acknowledgment during registration

### Out of Scope

- OAuth/Social login (Google, GitHub) - deferred to Growth phase
- Multi-factor authentication (MFA) - deferred to Growth phase
- Team/family accounts - deferred per PRD
- Email notifications for login alerts - deferred to Epic 9
- Password complexity beyond MVP requirements
- Session management across multiple devices (single refresh token per user for MVP)

## System Architecture Alignment

This epic implements the authentication layer from the architecture document:

| Architecture Component          | Story    | Implementation                            |
| ------------------------------- | -------- | ----------------------------------------- |
| JWT + Refresh Tokens (ADR-001)  | 2.1-2.4  | Custom auth built on Epic 1 foundation    |
| Security Headers (Architecture) | 2.3      | httpOnly, secure, sameSite=strict cookies |
| Rate Limiting                   | 2.3, 2.5 | 5 failed attempts → 15min lockout         |
| Data Protection (PRD)           | 2.7, 2.8 | Export/delete capabilities for compliance |
| Multi-Tenant Isolation          | All      | userId scoping on all operations          |

**Dependencies on Epic 1:**

- Story 1.3: Authentication System with JWT + Refresh Tokens (foundation)
- Story 1.2: Database Schema (users, refresh_tokens tables)
- Story 1.8: App Shell & Layout (settings page location)
- Story 1.6: Vercel KV Cache (session storage)

---

## Detailed Design

### Services and Modules

| Module               | Responsibility                                 | Location                         | Dependencies          |
| -------------------- | ---------------------------------------------- | -------------------------------- | --------------------- |
| **AuthService**      | Registration, login, logout, token management  | `lib/auth/auth-service.ts`       | PostgreSQL, Vercel KV |
| **PasswordService**  | Hashing, comparison, reset flow                | `lib/auth/password.ts`           | bcrypt                |
| **TokenService**     | JWT generation, verification, refresh rotation | `lib/auth/token-service.ts`      | jose, PostgreSQL      |
| **EmailService**     | Verification and reset email sending           | `lib/email/email-service.ts`     | Resend/SendGrid       |
| **UserService**      | Profile CRUD, preferences                      | `lib/services/user-service.ts`   | PostgreSQL            |
| **ExportService**    | Data export generation                         | `lib/services/export-service.ts` | PostgreSQL, archiver  |
| **RateLimitService** | Login attempt tracking                         | `lib/auth/rate-limit.ts`         | Vercel KV             |

### Data Models and Contracts

#### User Schema (Extension of Epic 1)

```typescript
// lib/db/schema.ts (additions for Epic 2)

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("USD"),
  emailVerified: boolean("email_verified").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  disclaimerAcknowledgedAt: timestamp("disclaimer_acknowledged_at"),
  defaultContribution: numeric("default_contribution", { precision: 19, scale: 4 }),
  alertPreferences: jsonb("alert_preferences").default("{}"),
  deletedAt: timestamp("deleted_at"), // Soft delete
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email verification tokens
export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Indexes
export const usersEmailIdx = index("users_email_idx").on(users.email);
export const verificationTokensTokenIdx = index("verification_tokens_token_idx").on(
  verificationTokens.token
);
```

#### TypeScript Types

```typescript
// lib/auth/types.ts

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  disclaimerAcknowledged: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  baseCurrency: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface UpdateProfileInput {
  name?: string;
  baseCurrency?: string;
}

export interface PasswordResetInput {
  token: string;
  newPassword: string;
}

export interface ExportData {
  portfolio: PortfolioExport[];
  criteria: CriteriaExport[];
  history: InvestmentHistoryExport[];
  exportedAt: string;
  schemaVersion: string;
}
```

### APIs and Interfaces

#### Authentication Endpoints

| Method | Path                            | Request                                              | Response                                       | Auth    |
| ------ | ------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ------- |
| POST   | `/api/auth/register`            | `{ email, password, name?, disclaimerAcknowledged }` | `{ user, message: "Verification email sent" }` | No      |
| POST   | `/api/auth/verify-email`        | `{ token }`                                          | `{ success: true }`                            | No      |
| POST   | `/api/auth/resend-verification` | `{ email }`                                          | `{ message: "If account exists..." }`          | No      |
| POST   | `/api/auth/login`               | `{ email, password, rememberMe? }`                   | `{ user }` + cookies                           | No      |
| POST   | `/api/auth/logout`              | -                                                    | `{ success: true }`                            | JWT     |
| POST   | `/api/auth/refresh`             | - (refresh token in cookie)                          | New cookies                                    | Refresh |
| POST   | `/api/auth/forgot-password`     | `{ email }`                                          | `{ message: "If account exists..." }`          | No      |
| POST   | `/api/auth/reset-password`      | `{ token, newPassword }`                             | `{ success: true }`                            | No      |
| GET    | `/api/auth/me`                  | -                                                    | `{ user }`                                     | JWT     |

#### User Management Endpoints

| Method | Path                | Request                      | Response            | Auth |
| ------ | ------------------- | ---------------------------- | ------------------- | ---- |
| PATCH  | `/api/user/profile` | `{ name?, baseCurrency? }`   | `{ user }`          | JWT  |
| GET    | `/api/user/export`  | -                            | ZIP file stream     | JWT  |
| DELETE | `/api/user/account` | `{ confirmation: "DELETE" }` | `{ success: true }` | JWT  |

### Workflows and Sequencing

#### Registration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. REGISTRATION REQUEST                                             │
│     POST /api/auth/register { email, password, name, disclaimer }   │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. VALIDATION                                                       │
│     - Email format (RFC 5322)                                       │
│     - Password complexity (8+ chars, 1 upper, 1 number, 1 special)  │
│     - Email not already registered                                  │
│     - Disclaimer must be acknowledged                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. CREATE USER                                                      │
│     - Hash password (bcrypt, cost 12)                               │
│     - Insert user with emailVerified: false                         │
│     - Record disclaimerAcknowledgedAt                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SEND VERIFICATION EMAIL                                          │
│     - Generate JWT token (userId, exp: 24h)                         │
│     - Store token in verification_tokens table                      │
│     - Send email with verification link                             │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. RESPONSE                                                         │
│     Return { user: { id, email }, message: "Verification sent" }    │
└─────────────────────────────────────────────────────────────────────┘
```

#### Email Verification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. USER CLICKS VERIFICATION LINK                                    │
│     GET /verify?token=xxx → Frontend extracts token                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. VERIFY TOKEN                                                     │
│     POST /api/auth/verify-email { token }                           │
│     - Lookup token in verification_tokens                           │
│     - Check not expired (24h limit)                                 │
│     - Check not already used (usedAt is null)                       │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. ACTIVATE USER                                                    │
│     - Set emailVerified: true, emailVerifiedAt: now()               │
│     - Mark token as used (usedAt: now())                            │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. REDIRECT TO LOGIN                                                │
│     Redirect with success message: "Email verified!"                │
└─────────────────────────────────────────────────────────────────────┘
```

#### Login Flow (with Rate Limiting)

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. LOGIN REQUEST                                                    │
│     POST /api/auth/login { email, password, rememberMe }            │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. CHECK RATE LIMIT                                                 │
│     - Get failed attempts from Vercel KV: `rate:${ip}:${email}`     │
│     - If >= 5 attempts in last 15 minutes → Return 429              │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. VERIFY CREDENTIALS                                               │
│     - Fetch user by email (exclude soft-deleted)                    │
│     - Compare password hash (bcrypt)                                │
│     - Check emailVerified: true                                     │
│     - On failure: increment rate limit counter                      │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. GENERATE TOKENS                                                  │
│     - Access token: JWT, 15 min expiry                              │
│     - Refresh token: JWT, 7d (or 30d if rememberMe)                 │
│     - Store refresh token hash in database                          │
│     - Clear rate limit counter on success                           │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. SET COOKIES                                                      │
│     - access_token: httpOnly, secure, sameSite=strict, maxAge=15m   │
│     - refresh_token: httpOnly, secure, sameSite=strict, maxAge=7d   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Password Reset Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. FORGOT PASSWORD REQUEST                                          │
│     POST /api/auth/forgot-password { email }                        │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. GENERATE RESET TOKEN                                             │
│     - Generate cryptographically secure random token                │
│     - Store hash in password_reset_tokens (expires in 1 hour)       │
│     - Send email with reset link (if user exists)                   │
│     - Always return same message (no email enumeration)             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  3. RESET PASSWORD                                                   │
│     POST /api/auth/reset-password { token, newPassword }            │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. VALIDATE & UPDATE                                                │
│     - Hash token, lookup in password_reset_tokens                   │
│     - Verify not expired and not used                               │
│     - Update user passwordHash                                      │
│     - Invalidate ALL refresh tokens for user                        │
│     - Mark reset token as used                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Account Deletion Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. DELETE REQUEST                                                   │
│     DELETE /api/user/account { confirmation: "DELETE" }             │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. VALIDATION                                                       │
│     - Verify confirmation string === "DELETE"                       │
│     - Verify authenticated user                                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. SOFT DELETE                                                      │
│     - Set user.deletedAt = now()                                    │
│     - Invalidate all refresh tokens                                 │
│     - Clear all user caches                                         │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SCHEDULE PURGE                                                   │
│     - Inngest job: purge_deleted_user in 30 days                    │
│     - Hard delete: user, portfolios, criteria, scores, events       │
└─────────────────────────────┬───────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. LOGOUT                                                           │
│     - Clear all auth cookies                                        │
│     - Redirect to homepage with confirmation                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Non-Functional Requirements

### Performance

| Target         | Metric       | Story | Implementation                      |
| -------------- | ------------ | ----- | ----------------------------------- |
| Registration   | < 2 seconds  | 2.1   | Async email sending                 |
| Login          | < 500ms      | 2.3   | Indexed queries, connection pooling |
| Token refresh  | < 200ms      | 2.3   | JWT verification is CPU-bound       |
| Profile update | < 500ms      | 2.6   | Simple UPDATE query                 |
| Data export    | < 30 seconds | 2.7   | Streaming ZIP generation            |

### Security

| Requirement                  | Implementation                           | Story    |
| ---------------------------- | ---------------------------------------- | -------- |
| Password hashing             | bcrypt, cost factor 12                   | 2.1, 2.5 |
| Password complexity          | 8+ chars, 1 upper, 1 number, 1 special   | 2.1      |
| Token signing                | HS256 with strong secret                 | 2.1-2.4  |
| Cookie security              | httpOnly, secure, sameSite=strict        | 2.3      |
| Rate limiting                | 5 failed attempts → 15min lockout        | 2.3      |
| Email enumeration prevention | Same response for all cases              | 2.5      |
| Session invalidation         | All tokens invalidated on password reset | 2.5      |
| Verification tokens          | Single-use, 24h expiry                   | 2.2      |
| Reset tokens                 | Single-use, 1h expiry, stored as hash    | 2.5      |

**Password Validation Regex:**

```typescript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

### Reliability/Availability

| Requirement        | Target           | Implementation                       |
| ------------------ | ---------------- | ------------------------------------ |
| Email delivery     | 99% success      | Retry queue with exponential backoff |
| Token verification | Always available | Database fallback if KV unavailable  |
| Account operations | Transactional    | PostgreSQL transactions              |

### Observability

| Signal                  | Implementation                      | Story |
| ----------------------- | ----------------------------------- | ----- |
| Registration events     | Log: email (hashed), timestamp      | 2.1   |
| Login events            | Log: success/failure, IP, timestamp | 2.3   |
| Password reset requests | Log: timestamp, IP (no email)       | 2.5   |
| Account deletion        | Log: userId, timestamp              | 2.8   |

---

## Dependencies and Integrations

### NPM Dependencies

| Package       | Version | Purpose                      | Story    |
| ------------- | ------- | ---------------------------- | -------- |
| bcrypt        | ^5.x    | Password hashing             | 2.1, 2.5 |
| jose          | ^5.x    | JWT signing/verification     | 2.1-2.4  |
| zod           | ^3.x    | Input validation             | All      |
| @vercel/kv    | ^2.x    | Rate limiting, session cache | 2.3      |
| resend        | ^4.x    | Email sending                | 2.2, 2.5 |
| archiver      | ^7.x    | ZIP file generation          | 2.7      |
| @types/bcrypt | ^5.x    | TypeScript types             | -        |

### Dev Dependencies

| Package         | Version | Purpose              | Story |
| --------------- | ------- | -------------------- | ----- |
| @faker-js/faker | ^9.x    | Test data generation | All   |

### External Services

| Service   | Purpose        | Environment Variables              |
| --------- | -------------- | ---------------------------------- |
| Resend    | Email delivery | RESEND_API_KEY                     |
| Vercel KV | Rate limiting  | KV_REST_API_URL, KV_REST_API_TOKEN |

---

## Acceptance Criteria (Authoritative)

### Story 2.1: User Registration Flow

1. User can register with valid email (RFC 5322 format) and password
2. Password must meet complexity: 8+ chars, 1 uppercase, 1 number, 1 special character
3. Password strength meter shows real-time feedback (weak/medium/strong)
4. Form shows inline validation errors below fields (red, 14px)
5. Submit button is disabled until form is valid
6. Registration completes in <2 seconds
7. User sees financial disclaimer that must be acknowledged
8. Success shows "Verification email sent" message

### Story 2.2: Email Verification

1. Clicking verification link in email activates account
2. Verification link expires after 24 hours
3. User can request new verification email from login page
4. Link is single-use (cannot be reused after activation)
5. Unverified accounts cannot access dashboard (redirect to "verify email" page)
6. Successful verification redirects to login with "Email verified!" toast

### Story 2.3: User Login

1. Valid credentials redirect to dashboard with recommendations
2. Login form has email, password fields and "Remember me" checkbox
3. Failed login shows "Invalid credentials" error (no email/password hints)
4. 5 failed attempts in 1 hour trigger 15-minute lockout with countdown
5. Successful login stores JWT in httpOnly cookie (15min expiry)
6. "Remember me" extends refresh token to 30 days (default 7 days)

### Story 2.4: User Logout

1. Clicking "Logout" terminates session and redirects to login
2. JWT cookie is cleared
3. Refresh token is invalidated in database
4. No confirmation dialog required (immediate action)

### Story 2.5: Password Reset Flow

1. "Forgot password?" shows email input form
2. Submit shows "If an account exists, a reset link has been sent" (no enumeration)
3. Reset link expires in 1 hour
4. Clicking link shows password reset form with complexity requirements
5. Successful reset invalidates all existing sessions
6. Redirect to login with "Password reset successful" toast

### Story 2.6: Profile Settings & Base Currency

1. Settings page shows name and base currency fields
2. Base currency dropdown: USD, EUR, GBP, BRL, CAD, AUD, JPY, CHF
3. Changing currency triggers portfolio value recalculation
4. Form auto-saves on change with subtle success indicator (checkmark)
5. Name field has 100 character limit

### Story 2.7: Data Export

1. "Export My Data" button downloads ZIP file
2. ZIP contains: portfolio.json, criteria.json, history.json, README.txt
3. Export completes within 30 seconds
4. Data is human-readable (formatted JSON)
5. Progress indicator shows during generation

### Story 2.8: Account Deletion

1. "Delete Account" shows confirmation dialog explaining consequences
2. Dialog requires typing "DELETE" to confirm
3. Confirmation deletes: user, portfolios, criteria, scores, history, events
4. Deletion is soft delete with 30-day purge window
5. After deletion, user is logged out and redirected to homepage

---

## Traceability Mapping

| AC    | Spec Section            | Component(s)                              | Test Idea                  |
| ----- | ----------------------- | ----------------------------------------- | -------------------------- |
| 2.1.1 | Registration Flow       | registration-form.tsx, /api/auth/register | Submit with valid email    |
| 2.1.2 | Password Validation     | registration-form.tsx                     | Password complexity regex  |
| 2.1.3 | Password Validation     | password-strength-meter.tsx               | Visual feedback update     |
| 2.1.4 | Registration Flow       | registration-form.tsx                     | Error display below inputs |
| 2.1.5 | Registration Flow       | registration-form.tsx                     | Button disabled state      |
| 2.1.6 | Performance             | /api/auth/register                        | Response time < 2s         |
| 2.1.7 | Registration Flow       | registration-form.tsx                     | Disclaimer checkbox        |
| 2.1.8 | Registration Flow       | /api/auth/register                        | Success message            |
| 2.2.1 | Email Verification Flow | /api/auth/verify-email                    | Token validation           |
| 2.2.2 | Email Verification Flow | verification_tokens table                 | 24h expiry check           |
| 2.2.3 | Email Verification Flow | /api/auth/resend-verification             | Resend endpoint            |
| 2.2.4 | Email Verification Flow | verification_tokens table                 | usedAt not null check      |
| 2.2.5 | Auth Middleware         | middleware.ts                             | Redirect unverified users  |
| 2.2.6 | Email Verification Flow | /verify page                              | Success redirect + toast   |
| 2.3.1 | Login Flow              | /api/auth/login                           | Valid credentials          |
| 2.3.2 | Login Flow              | login-form.tsx                            | Form fields                |
| 2.3.3 | Login Flow              | /api/auth/login                           | Error message              |
| 2.3.4 | Login Flow              | RateLimitService                          | Lockout mechanism          |
| 2.3.5 | Login Flow              | /api/auth/login                           | Cookie attributes          |
| 2.3.6 | Login Flow              | /api/auth/login                           | 30d vs 7d token expiry     |
| 2.4.1 | Logout                  | /api/auth/logout                          | Redirect behavior          |
| 2.4.2 | Logout                  | /api/auth/logout                          | Cookie clearing            |
| 2.4.3 | Logout                  | /api/auth/logout                          | Token invalidation         |
| 2.4.4 | Logout                  | sidebar.tsx                               | No confirmation            |
| 2.5.1 | Password Reset Flow     | forgot-password-form.tsx                  | Email input                |
| 2.5.2 | Password Reset Flow     | /api/auth/forgot-password                 | Same response always       |
| 2.5.3 | Password Reset Flow     | password_reset_tokens                     | 1h expiry                  |
| 2.5.4 | Password Reset Flow     | reset-password-form.tsx                   | Password form              |
| 2.5.5 | Password Reset Flow     | /api/auth/reset-password                  | Invalidate sessions        |
| 2.5.6 | Password Reset Flow     | /login redirect                           | Success toast              |
| 2.6.1 | Settings                | settings/page.tsx                         | Form fields                |
| 2.6.2 | Settings                | settings/page.tsx                         | Currency dropdown          |
| 2.6.3 | Settings                | /api/user/profile                         | Cache invalidation         |
| 2.6.4 | Settings                | settings/page.tsx                         | Auto-save with indicator   |
| 2.6.5 | Settings                | /api/user/profile                         | Name length validation     |
| 2.7.1 | Data Export             | settings/page.tsx                         | Export button              |
| 2.7.2 | Data Export             | /api/user/export                          | ZIP contents               |
| 2.7.3 | Data Export             | ExportService                             | Timeout < 30s              |
| 2.7.4 | Data Export             | ExportService                             | JSON formatting            |
| 2.7.5 | Data Export             | settings/page.tsx                         | Progress indicator         |
| 2.8.1 | Account Deletion Flow   | delete-account-dialog.tsx                 | Confirmation dialog        |
| 2.8.2 | Account Deletion Flow   | delete-account-dialog.tsx                 | Type "DELETE"              |
| 2.8.3 | Account Deletion Flow   | /api/user/account                         | Cascade delete             |
| 2.8.4 | Account Deletion Flow   | /api/user/account                         | Soft delete + purge        |
| 2.8.5 | Account Deletion Flow   | /api/user/account                         | Logout + redirect          |

---

## Risks, Assumptions, Open Questions

### Risks

| ID  | Risk                                   | Probability | Impact   | Mitigation                                                      |
| --- | -------------------------------------- | ----------- | -------- | --------------------------------------------------------------- |
| R1  | Email delivery failures                | Medium      | High     | Use Resend with retry queue; provide manual verification option |
| R2  | Rate limiting bypassed via IP rotation | Low         | Medium   | Add email-based rate limiting in addition to IP                 |
| R3  | Password reset token guessing          | Very Low    | Critical | Use cryptographically secure random tokens (256 bits)           |
| R4  | Session hijacking via cookie theft     | Low         | Critical | httpOnly + secure + sameSite=strict cookies                     |

### Assumptions

| ID  | Assumption                                         | Impact if Wrong                               |
| --- | -------------------------------------------------- | --------------------------------------------- |
| A1  | bcrypt cost factor 12 provides sufficient security | May need to increase cost or switch to Argon2 |
| A2  | 15min access token is acceptable UX                | May need silent refresh on tab focus          |
| A3  | Single refresh token per user is sufficient        | May need device-specific tokens for security  |
| A4  | Resend is reliable email provider                  | May need fallback provider (SendGrid)         |
| A5  | 8 currencies cover initial user base               | May need to add more currencies               |

### Open Questions

| ID  | Question                                                     | Decision Needed By       | Owner    |
| --- | ------------------------------------------------------------ | ------------------------ | -------- |
| Q1  | Should we use Argon2 instead of bcrypt?                      | Story 2.1 implementation | Dev      |
| Q2  | Should soft-deleted users be able to recover within 30 days? | Story 2.8 implementation | PM       |
| Q3  | Should we require re-authentication before account deletion? | Story 2.8 implementation | Security |

---

## Test Strategy Summary

### Unit Testing (Vitest)

**Focus Areas:**

- Password hashing and verification
- JWT token generation and validation
- Input validation schemas (Zod)
- Rate limiting logic
- Export data formatting

**Coverage Target:** 80% for `lib/auth/*` and `lib/services/user-service.ts`

### Integration Testing (Vitest + Test DB)

**Focus Areas:**

- Registration → verification → login flow
- Password reset flow end-to-end
- Token refresh rotation
- Account deletion cascade

### E2E Testing (Playwright)

**Focus Areas:**

- Registration form validation and submission
- Login with valid/invalid credentials
- Rate limiting lockout display
- Profile settings save and currency change
- Account deletion confirmation flow

**Test Environment:**

- Test database (separate from development)
- Mock email service (Resend sandbox)
- CI runs in headless mode

### Test File Structure

```
tests/
├── unit/
│   ├── auth/
│   │   ├── password.test.ts
│   │   ├── token-service.test.ts
│   │   ├── rate-limit.test.ts
│   │   └── validation.test.ts
│   └── services/
│       ├── user-service.test.ts
│       └── export-service.test.ts
├── integration/
│   ├── auth-flow.test.ts
│   ├── password-reset.test.ts
│   └── account-deletion.test.ts
└── e2e/
    ├── registration.spec.ts
    ├── login.spec.ts
    ├── settings.spec.ts
    └── account-deletion.spec.ts
```
