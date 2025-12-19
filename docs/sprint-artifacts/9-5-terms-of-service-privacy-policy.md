# Story 9.5: Terms of Service & Privacy Policy

**Status:** done
**Epic:** Epic 9 - Alerts & Polish
**Previous Story:** 9-4-financial-disclaimers (Status: done)

---

## Story

**As a** platform
**I want** to provide Terms of Service and Privacy Policy pages
**So that** users understand their rights and our responsibilities, and legal compliance requirements are met

---

## Acceptance Criteria

### AC-9.5.1: Terms of Service Page Accessible at /terms

- **Given** I navigate to `/terms`
- **When** the page loads
- **Then** I see the Terms of Service content
- **And** the page is publicly accessible (no authentication required)
- **And** the page renders within the app layout (consistent navigation)

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.5]
[Source: docs/epics.md#Story-9.5]

### AC-9.5.2: Privacy Policy Page Accessible at /privacy

- **Given** I navigate to `/privacy`
- **When** the page loads
- **Then** I see the Privacy Policy content
- **And** the page is publicly accessible (no authentication required)
- **And** the page renders within the app layout (consistent navigation)

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.5]
[Source: docs/epics.md#Story-9.5]

### AC-9.5.3: Links to Both Pages in Registration Flow

- **Given** I am on the registration page
- **When** I view the registration form
- **Then** I see links to both Terms of Service and Privacy Policy
- **And** clicking the links opens the respective pages (new tab or navigation)
- **And** the links are clearly visible near the registration submit button

[Source: docs/epics.md#Story-9.5]

### AC-9.5.4: Links to Both Pages in Footer

- **Given** I am on any page of the application
- **When** I look at the sidebar footer area
- **Then** I see links to "Terms of Service" and "Privacy Policy"
- **And** clicking the links navigates me to the respective pages

[Source: docs/epics.md#Story-9.5]

### AC-9.5.5: ToS Includes Required Content Sections

- **Given** I navigate to `/terms`
- **When** I view the content
- **Then** the Terms of Service includes sections for:
  - Acceptance of terms
  - Description of service
  - User responsibilities and acceptable use
  - Data usage and limitations
  - Liability limitation and disclaimers
  - Account termination conditions
  - Modifications to terms
  - Governing law / jurisdiction
  - Contact information

[Source: docs/epics.md#Story-9.5]
[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Technical-Notes]

### AC-9.5.6: Privacy Policy Includes Required Content Sections

- **Given** I navigate to `/privacy`
- **When** I view the content
- **Then** the Privacy Policy includes sections for:
  - Information we collect
  - How we use your information
  - Data storage and retention
  - Data sharing and third parties
  - User rights (access, correction, deletion)
  - Cookies and tracking technologies
  - Security measures
  - Changes to policy
  - Contact information

[Source: docs/epics.md#Story-9.5]
[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Technical-Notes]

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 9 Tech Spec:

- **Route Group:** Use existing `(legal)` route group at `src/app/(legal)/`
- **Static Pages:** No database changes required - purely static content
- **Multi-Tenant:** Not applicable (public pages, no user-specific data)
- **API Standards:** Not applicable (no API endpoints needed)

[Source: docs/architecture.md#Project-Structure]
[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.5]

### Tech Spec Reference

Per Epic 9 Tech Spec:

- **Static pages with markdown content**
- **No database changes required**
- **Content provided by user/legal team (placeholders in MVP)**

```typescript
// Static pages at:
// src/app/(legal)/terms/page.tsx
// src/app/(legal)/privacy/page.tsx
```

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.5]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **Legal Route Group** - `src/app/(legal)/` already created by Story 9.4
   - Contains disclaimer page as reference for structure
   - Use same layout patterns

2. **AppSidebar Footer** - `src/components/dashboard/app-sidebar.tsx`
   - Already has Disclaimer link added in Story 9.4
   - Extend with Terms and Privacy links

3. **Disclaimer Page Pattern** - `src/app/(legal)/disclaimer/page.tsx`
   - Reference for styling and layout
   - Use similar card-based sections

4. **Logger** - `src/lib/telemetry/logger.ts`
   - Use for any structured logging if needed

[Source: CLAUDE.md#PR-Review-Checklist]
[Source: docs/sprint-artifacts/9-4-financial-disclaimers.md#File-List]

### Learnings from Previous Story

**From Story 9-4-financial-disclaimers (Status: done)**

- **Legal Route Group Created**: `src/app/(legal)/` route group exists - add `/terms` and `/privacy` pages here
- **Disclaimer Page Pattern**: Use `src/app/(legal)/disclaimer/page.tsx` as reference for structure and styling
- **Footer Links Pattern**: Links added to `src/components/dashboard/app-sidebar.tsx` footer section - extend with ToS/Privacy
- **Styling Pattern**: Uses Tailwind with amber warning boxes for important notices
- **No Database Changes**: This story also requires no database changes (static content)
- **Test Coverage**: Story 9.4 added 25 unit tests - this story needs minimal tests (static pages)

**Files Created in Previous Story to Reference:**

- `src/app/(legal)/disclaimer/page.tsx` - Use as template for page structure
- Pattern: Card-based sections with prose styling

**Pattern to Follow:**

- Static page with multiple sections
- Back to Dashboard button
- Consistent layout with app shell
- Clear section headers

[Source: docs/sprint-artifacts/9-4-financial-disclaimers.md#Dev-Agent-Record]

### Services and Modules

| Module                         | Responsibility                | Location                                                     |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------ |
| **Terms Page** (new)           | Static ToS content            | `src/app/(legal)/terms/page.tsx`                             |
| **Privacy Page** (new)         | Static Privacy Policy content | `src/app/(legal)/privacy/page.tsx`                           |
| **AppSidebar** (extend)        | Add ToS and Privacy links     | `src/components/dashboard/app-sidebar.tsx`                   |
| **Registration Form** (extend) | Add legal links               | `src/app/(auth)/register/page.tsx` or registration component |

[Source: docs/architecture.md#Project-Structure]

---

## Tasks

### Task 1: Create Terms of Service Page (AC: 9.5.1, 9.5.5)

**Files:** `src/app/(legal)/terms/page.tsx`

- [x] Create `/terms` route using Next.js App Router
- [x] Use `src/app/(legal)/disclaimer/page.tsx` as reference for structure
- [x] Include metadata (title, description) for SEO
- [x] Add all required sections per AC-9.5.5:
  - [x] Acceptance of terms section
  - [x] Description of service section
  - [x] User responsibilities section
  - [x] Data usage and limitations section
  - [x] Liability limitation section
  - [x] Account termination section
  - [x] Modifications to terms section
  - [x] Governing law section
  - [x] Contact information section
- [x] Add "Back to Dashboard" button (follow disclaimer page pattern)
- [x] Ensure consistent styling with existing legal pages

### Task 2: Create Privacy Policy Page (AC: 9.5.2, 9.5.6)

**Files:** `src/app/(legal)/privacy/page.tsx`

- [x] Create `/privacy` route using Next.js App Router
- [x] Use `src/app/(legal)/disclaimer/page.tsx` as reference for structure
- [x] Include metadata (title, description) for SEO
- [x] Add all required sections per AC-9.5.6:
  - [x] Information we collect section
  - [x] How we use your information section
  - [x] Data storage and retention section
  - [x] Data sharing and third parties section
  - [x] User rights section
  - [x] Cookies and tracking section
  - [x] Security measures section
  - [x] Changes to policy section
  - [x] Contact information section
- [x] Add "Back to Dashboard" button (follow disclaimer page pattern)
- [x] Ensure consistent styling with existing legal pages

### Task 3: Add Links to Sidebar Footer (AC: 9.5.4)

**Files:** `src/components/dashboard/app-sidebar.tsx`

- [x] Add "Terms of Service" link with appropriate icon
- [x] Add "Privacy Policy" link with appropriate icon
- [x] Place alongside existing "Disclaimer" link
- [x] Ensure links are hidden when sidebar is collapsed (follow existing pattern)
- [x] Links point to `/terms` and `/privacy` respectively

### Task 4: Add Links to Registration Flow (AC: 9.5.3)

**Files:** `src/components/auth/registration-form.tsx`

- [x] Locate the registration form component
- [x] Add text with links: "By creating an account, you agree to our [Terms of Service] and [Privacy Policy]"
- [x] Place near the submit/register button
- [x] Links open in new tab or navigate appropriately
- [x] Style consistently with form

### Task 5: Write Tests for Legal Pages (AC: 9.5.1, 9.5.2)

**Files:** `tests/unit/pages/legal-pages.test.ts`, `tests/unit/components/legal-links.test.ts`

- [x] Test Terms page metadata at /terms
- [x] Test Privacy page metadata at /privacy
- [x] Test metadata consistency across legal pages
- [x] Test all required sections are documented
- [x] Test link configurations for sidebar and registration

### Task 6: Run Verification

- [x] TypeScript compilation successful (`pnpm exec tsc --noEmit`)
- [x] ESLint passes with no errors (`pnpm lint`)
- [x] All tests pass (`pnpm exec vitest run`) - 3264 tests passed
- [x] Build verification passed (`pnpm build`)
- [ ] Manual verification: Navigate to /terms and /privacy
- [ ] Manual verification: Check sidebar footer links
- [ ] Manual verification: Check registration page links

---

## Dependencies

- **Story 9.4:** Financial Disclaimers (provides `(legal)` route group and patterns)
- **Epic 2:** User authentication (registration flow exists)
- **Epic 1:** App shell and layout components

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Static Pages:** No API calls or database queries needed
- **Route Groups:** Use existing `(legal)` route group for organization
- **SEO:** Include proper metadata for search engine indexing
- **Accessibility:** Ensure content is readable and navigable

[Source: docs/architecture.md#Project-Structure]

### Content Notes

**Important:** The ToS and Privacy Policy content in this MVP are **placeholder templates**. Before production deployment, content should be:

1. Reviewed by legal counsel
2. Customized for the specific jurisdiction
3. Updated to reflect actual data practices

The implementation focus is on the page structure and navigation, not legal accuracy.

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for page rendering and content presence
- E2E tests optional for static pages
- Manual verification of navigation links

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

Following unified project structure:

- **Terms Page:** `src/app/(legal)/terms/page.tsx` (new)
- **Privacy Page:** `src/app/(legal)/privacy/page.tsx` (new)
- **Sidebar Extension:** `src/components/dashboard/app-sidebar.tsx` (modify)
- **Registration Extension:** Registration form component (modify)

[Source: docs/architecture.md#Project-Structure]

### UI/UX Considerations

Following existing disclaimer page patterns:

- Card-based sections with clear headers
- Prose-styled content for readability
- Amber/yellow highlights for important notices
- Back to Dashboard button for navigation
- Consistent with app shell styling

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.5]
- [Source: docs/epics.md#Story-9.5]
- [Source: docs/architecture.md#Project-Structure]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]
- [Source: docs/sprint-artifacts/9-4-financial-disclaimers.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/9-5-terms-of-service-privacy-policy.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

Implementation followed existing disclaimer page pattern from Story 9.4. Used card-based sections with prose styling for content readability. Added icons from lucide-react for visual consistency.

### Completion Notes List

- Created comprehensive Terms of Service page with 9 required sections covering legal requirements
- Created comprehensive Privacy Policy page with 9 required sections covering data privacy requirements
- Extended sidebar footer with Terms and Privacy links alongside existing Disclaimer link
- Added legal agreement text with links in registration form before submit button
- Added 31 unit tests (19 for legal pages metadata, 12 for link configurations)
- All 3264 project tests pass, TypeScript and ESLint clean, build successful
- Pages are static (pre-rendered) for optimal performance
- Content is placeholder for MVP - needs legal review before production

### File List

**New Files:**

- `src/app/(legal)/terms/page.tsx` - Terms of Service static page
- `src/app/(legal)/privacy/page.tsx` - Privacy Policy static page
- `tests/unit/pages/legal-pages.test.ts` - Tests for legal page metadata
- `tests/unit/components/legal-links.test.ts` - Tests for legal link configurations

**Modified Files:**

- `src/components/dashboard/app-sidebar.tsx` - Added Terms and Privacy links to footer
- `src/components/auth/registration-form.tsx` - Added legal agreement links before submit button

---

## Change Log

| Date       | Change                                                                                  | Author                           |
| ---------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| 2025-12-19 | Story drafted from tech-spec-epic-9.md and epics.md                                     | SM Agent (create-story workflow) |
| 2025-12-19 | Implementation complete: Terms, Privacy pages, sidebar links, registration links, tests | Dev Agent (dev-story workflow)   |
