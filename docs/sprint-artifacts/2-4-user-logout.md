# Story 2.4: User Logout

**Status:** done
**Epic:** Epic 2 - User Onboarding & Profile
**Previous Story:** 2.3 User Login

---

## Story

**As a** logged-in user
**I want to** log out of my account
**So that** my session is securely terminated and no one else can access my account on this device

---

## Acceptance Criteria

### AC-2.4.1: Logout Action and Redirect

- **Given** I am logged in and on any dashboard page
- **When** I click the "Logout" button in the sidebar or user menu
- **Then** my session is terminated and I am redirected to the login page

### AC-2.4.2: JWT Cookie Cleared

- **Given** I click "Logout"
- **When** the logout completes
- **Then** the access token cookie is cleared (set to empty with maxAge: 0)
- **And** the refresh token cookie is cleared (set to empty with maxAge: 0)

### AC-2.4.3: Refresh Token Invalidated

- **Given** I click "Logout"
- **When** the logout API processes my request
- **Then** my refresh token is deleted from the database
- **And** it cannot be used to obtain new access tokens

### AC-2.4.4: No Confirmation Required

- **Given** I click "Logout"
- **When** the button is pressed
- **Then** logout happens immediately without a confirmation dialog
- **And** no additional user interaction is required

---

## Technical Notes

### Existing Infrastructure (from Story 1.3)

The logout API is **already fully implemented** at `src/app/api/auth/logout/route.ts`:

- Deletes refresh token from database (`deleteRefreshToken`)
- Clears auth cookies via `clearAuthCookies()`
- Returns `{ success: true }` on successful logout
- Protected by `withAuth` middleware (requires valid access token)

Cookie utilities exist at `src/lib/auth/cookies.ts`:

- `clearAuthCookies()` - sets both tokens to empty with maxAge: 0

### What Needs to Be Built

1. **LogoutButton Component** - Client component that:
   - Calls `POST /api/auth/logout`
   - Shows loading state during API call
   - Redirects to `/login` on success
   - Handles errors gracefully
   - No confirmation dialog (AC-2.4.4)

2. **UI Integration**:
   - Add LogoutButton to `SidebarFooter` in `app-sidebar.tsx`
   - Optionally add to header user menu dropdown

### Implementation Guidelines

- Use `useRouter().push('/login')` for redirect after logout
- Show toast notification "You have been logged out" on success
- Handle network errors gracefully (still redirect to login)
- Disable button during API call to prevent double-clicks
- LogOut icon from lucide-react for visual consistency

---

## Tasks

### Task 1: Create LogoutButton Component

**File:** `src/components/auth/logout-button.tsx`

Create a client component that:

- Renders a button/menu item with LogOut icon
- Calls POST /api/auth/logout on click
- Shows loading spinner during request
- Redirects to /login on success
- Shows toast "You have been logged out"
- Handles errors (still redirect, show error toast)
- No confirmation dialog

```typescript
interface LogoutButtonProps {
  variant?: "sidebar" | "menu"; // Different styles for placement
  showLabel?: boolean; // Show text label or icon-only
}
```

### Task 2: Integrate LogoutButton into AppSidebar

**File:** `src/components/dashboard/app-sidebar.tsx`

- Add LogoutButton to SidebarFooter next to user info
- When sidebar is collapsed, show icon-only
- When expanded, show icon + "Logout" text
- Style consistently with other sidebar items

### Task 3: Add User Menu Dropdown to Header (Optional Enhancement)

**File:** `src/app/(dashboard)/layout.tsx`

- Replace user avatar placeholder with DropdownMenu
- Include: User name/email, Settings link, Logout option
- LogoutButton inside dropdown with variant="menu"

### Task 4: Create Unit Tests

**File:** `tests/unit/auth/logout.test.ts`

Test cases:

- LogoutButton renders correctly
- Click triggers API call
- Loading state shown during request
- Redirect occurs on success
- Error handling works correctly

### Task 5: Create E2E Tests

**File:** `tests/e2e/logout.spec.ts`

Test cases:

- Logout button visible in sidebar when logged in
- Clicking logout redirects to login page
- Session cookies are cleared after logout
- Cannot access dashboard after logout

### Task 6: Run Verification

- `pnpm lint` - no errors
- `pnpm build` - successful build
- `pnpm test` - all tests pass

---

## Dependencies

- Story 1.3: Authentication System (provides logout API) - **COMPLETE**
- Story 2.3: User Login (login page for redirect) - **COMPLETE**

---

## Dev Notes

### API Response Format

```typescript
// Success (200)
{ success: true }

// Error (401 - not authenticated)
{ error: "Authentication required", code: "UNAUTHORIZED" }

// Error (500 - server error)
{ error: "An error occurred during logout", code: "INTERNAL_ERROR" }
```

### Cookie Clearing Details

From `clearAuthCookies()`:

- `access_token`: set to "" with maxAge: 0
- `refresh_token`: set to "" with maxAge: 0
- Same httpOnly, secure, sameSite options as original cookies

### Learnings from Story 2.3

- Use `onBlur` validation mode for forms (not applicable here)
- Toast notifications with sonner for success feedback
- Handle 429 rate limiting gracefully (not applicable for logout)
- localStorage can persist state across page refreshes if needed

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-4-user-logout.context.xml`

### Implementation Summary (2025-12-02)

**Files Created:**

- `src/components/auth/logout-button.tsx` - LogoutButton component with three variants (sidebar, menu, button)

**Files Modified:**

- `src/components/dashboard/app-sidebar.tsx` - Added LogoutButton to SidebarFooter

**Tests Created:**

- `tests/unit/auth/logout.test.ts` - 16 unit tests for logout API contract and behavior
- `tests/e2e/logout.spec.ts` - E2E tests for logout flow, no-confirmation, error handling

**Verification Results:**

- ✅ `pnpm build` - Successful build
- ✅ `pnpm test` - 318 tests passed, 25 skipped

**Notes:**

- Task 3 (Optional User Menu Dropdown) was skipped as optional
- Logout API was already fully implemented in Story 1.3
- This story focused on frontend integration only

---

## Senior Developer Review (AI)

**Review Date:** 2025-12-02
**Reviewer:** Senior Developer Code Review (AI)
**Status:** ✅ **APPROVED**

### Acceptance Criteria Verification

| AC       | Description                | Status  | Evidence                                                |
| -------- | -------------------------- | ------- | ------------------------------------------------------- |
| AC-2.4.1 | Logout Action and Redirect | ✅ PASS | `logout-button.tsx:71` - `router.push("/login")`        |
| AC-2.4.2 | JWT Cookie Cleared         | ✅ PASS | `cookies.ts:80-89` - `clearAuthCookies` sets maxAge: 0  |
| AC-2.4.3 | Refresh Token Invalidated  | ✅ PASS | `logout/route.ts:47` - `deleteRefreshToken(dbToken.id)` |
| AC-2.4.4 | No Confirmation Required   | ✅ PASS | `logout-button.tsx:50` - Direct action, no dialog       |

### Code Quality Assessment

**Strengths:**

1. **Well-Structured Component (logout-button.tsx)**
   - Three variants (sidebar, menu, button) provide flexibility
   - Loading state prevents double-clicks (line 52)
   - Proper error handling with graceful degradation (lines 72-77)
   - Toast notifications for user feedback

2. **Security Implementation**
   - Uses existing secure cookie utilities (httpOnly, secure, sameSite: strict)
   - Refresh token deleted from database before clearing cookies
   - Protected by `withAuth` middleware

3. **Test Coverage**
   - Unit tests cover API contract and behavior
   - E2E tests cover full flow including error scenarios
   - Double-click prevention tested

4. **UX Considerations**
   - Loading spinner during API call
   - Disabled state prevents accidental double-clicks
   - Success toast "You have been logged out"
   - Error handling still redirects to login (user expectation)

5. **Accessibility**
   - `aria-hidden="true"` on icons
   - `aria-label` for icon-only buttons
   - `disabled` attribute properly set during loading
   - Tooltip for sidebar button

**Minor Observations (Non-Blocking):**

1. **AppSidebar Integration** - The logout button is duplicated with conditional visibility classes instead of a single button with dynamic styling. This works but could be slightly cleaner with a single button.

2. **Static User Info** - The sidebar shows hardcoded "User" and "user@example.com" - this will be addressed in a future story (profile display).

### Best Practices Compliance

| Category         | Status | Notes                                        |
| ---------------- | ------ | -------------------------------------------- |
| TypeScript Usage | ✅     | Proper typing throughout                     |
| React Patterns   | ✅     | Hooks used correctly, client component       |
| Error Handling   | ✅     | Graceful degradation, user-friendly messages |
| Security         | ✅     | Uses established secure auth infrastructure  |
| Accessibility    | ✅     | ARIA attributes, disabled states             |
| Testing          | ✅     | Unit + E2E coverage                          |
| Documentation    | ✅     | JSDoc comments, clear story references       |

### Verdict

**APPROVED** - Implementation is clean, secure, and follows all best practices. All acceptance criteria are met with proper test coverage. The code is well-documented and maintains consistency with the existing auth infrastructure.

No blocking issues found. Minor observations noted above are cosmetic and can be addressed in future improvements.

---

## Definition of Done

- [x] All acceptance criteria verified
- [x] Unit tests pass
- [x] E2E tests pass
- [x] Lint passes
- [x] Build succeeds
- [x] Code review approved
