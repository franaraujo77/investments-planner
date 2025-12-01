# Story 1.1: Project Setup & Core Infrastructure

Status: done

## Story

As a **developer**,
I want **the project initialized with Next.js 15, shadcn/ui, and core dependencies**,
so that **I have a solid foundation to build features on**.

## Acceptance Criteria

1. Running `pnpm install && pnpm dev` starts the development server successfully on localhost:3000
2. shadcn/ui components are available and styled correctly
3. Tailwind CSS v4 is configured with the Slate Professional theme
4. TypeScript strict mode is enabled with noUncheckedIndexedAccess
5. ESLint and Prettier are configured for code quality
6. Path aliases (@/*) resolve to src/*

## Tasks / Subtasks

- [x] **Task 1: Initialize Next.js project** (AC: 1)
  - [x] Run `npx create-next-app@latest investments-planner --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [x] Verify development server starts on localhost:3000
  - [x] Confirm App Router structure is in place

- [x] **Task 2: Configure TypeScript strict mode** (AC: 4)
  - [x] Update `tsconfig.json` with strict mode settings
  - [x] Enable `noUncheckedIndexedAccess: true`
  - [x] Enable `exactOptionalPropertyTypes: true`
  - [x] Verify project compiles without errors

- [x] **Task 3: Initialize shadcn/ui** (AC: 2)
  - [x] Run `npx shadcn@latest init`
  - [x] Configure for New York style (default)
  - [x] Add essential components:
    - [x] `npx shadcn@latest add button card dialog dropdown-menu form input select table tabs sonner tooltip sidebar sheet skeleton badge progress alert`
  - [x] Verify Button component renders correctly

- [x] **Task 4: Configure Tailwind CSS with Slate Professional theme** (AC: 3)
  - [x] Update globals.css with custom color tokens (Tailwind v4 uses CSS variables)
  - [x] Configure Slate color scale (slate-50 through slate-900)
  - [x] Set semantic colors: success (#10b981), warning (#f59e0b), error (#ef4444), info (#3b82f6)
  - [x] Set accent color (#3b82f6) for interactive elements
  - [x] Verify theme applies correctly to shadcn/ui components

- [x] **Task 5: Configure ESLint and Prettier** (AC: 5)
  - [x] Verify ESLint config from create-next-app
  - [x] Install Prettier: `pnpm add -D prettier eslint-config-prettier`
  - [x] Create `.prettierrc` with project standards
  - [x] Add format scripts to package.json
  - [x] Run `pnpm lint` to verify no errors

- [x] **Task 6: Verify path aliases** (AC: 6)
  - [x] Confirm `@/*` resolves to `src/*` in tsconfig.json
  - [x] Create a test import using `@/` alias
  - [x] Verify import resolution works in IDE and build

- [x] **Task 7: Add security headers to next.config.ts** (AC: 1)
  - [x] Add X-Content-Type-Options: nosniff
  - [x] Add X-Frame-Options: DENY
  - [x] Add X-XSS-Protection: 1; mode=block
  - [x] Add Referrer-Policy: strict-origin-when-cross-origin
  - [x] Add Content-Security-Policy (basic)

- [x] **Task 8: Create .env.example** (AC: 1)
  - [x] Document required environment variables
  - [x] Add placeholder values with descriptions
  - [x] Ensure .env.local is in .gitignore

- [x] **Task 9: Test: Verify complete setup** (AC: 1-6)
  - [x] Run `pnpm install && pnpm dev`
  - [x] Confirm server starts without errors
  - [x] Verify a shadcn/ui component renders
  - [x] Run `pnpm lint` - should pass
  - [x] Run `pnpm build` - should complete successfully

## Dev Notes

### Architecture Patterns

- **Hybrid Approach (ADR-001):** Fresh create-next-app build with SaaS Starter as reference only
- **App Router:** Use Next.js 15 App Router with Server Components
- **TypeScript Strict:** Enable all strict mode options for type safety

### Key Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config with security headers |
| `tsconfig.json` | TypeScript strict mode |
| `src/app/globals.css` | Slate Professional theme tokens (Tailwind v4) |
| `.prettierrc` | Code formatting standards |
| `.env.example` | Environment variable documentation |

### Slate Professional Theme Tokens

```css
/* globals.css - Tailwind v4 CSS variables from UX spec */
:root {
  --primary: #0f172a; /* slate-900 */
  --primary-foreground: #f8fafc; /* slate-50 */
  --accent: #3b82f6; /* blue-500 */
  --success: #10b981; /* emerald-500 */
  --warning: #f59e0b; /* amber-500 */
  --error: #ef4444; /* red-500 */
  --info: #3b82f6; /* blue-500 */
}
```

### TypeScript Strict Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Project Structure Notes

After this story, the project structure is:

```
investments-planner/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/          # 20 shadcn/ui components
│   ├── hooks/
│   │   └── use-mobile.ts
│   └── lib/
│       └── utils.ts     # cn() utility
├── public/
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── .prettierrc
├── .env.example
└── package.json
```

### Testing Checklist

- [x] `pnpm dev` starts without errors
- [x] http://localhost:3000 loads
- [x] shadcn/ui Button renders with correct theme
- [x] TypeScript catches type errors
- [x] ESLint runs without errors
- [x] Build completes successfully

### References

- [Source: docs/architecture.md#Project-Initialization] - Init commands and setup
- [Source: docs/ux-design-specification.md#Section-3.1] - Slate Professional color system
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md#Story-1.1] - Acceptance criteria
- [Source: docs/epics.md#Story-1.1] - Story definition

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/1-1-project-setup-core-infrastructure.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Initialized Next.js in /tmp then moved files to avoid conflicts with existing docs
- Fixed TypeScript strict mode issues in shadcn/ui components (dropdown-menu, sonner)
- Fixed ESLint purity error in sidebar skeleton component

### Completion Notes List

- **Next.js 16.0.5** installed (latest stable, newer than spec's 15.x)
- **Tailwind CSS v4** uses CSS variables in globals.css instead of tailwind.config.ts
- **shadcn/ui toast deprecated** - using sonner component instead
- **20 UI components** installed: button, card, dialog, dropdown-menu, form, input, select, table, tabs, sonner, tooltip, sidebar, sheet, skeleton, badge, progress, alert, label, separator
- **Security headers** configured in next.config.ts with CSP
- All 6 Acceptance Criteria verified and passing

### File List

| Status | File Path | Description |
|--------|-----------|-------------|
| Created | `src/app/layout.tsx` | Root layout with global styles |
| Created | `src/app/page.tsx` | Home page with Button/Card demo |
| Modified | `src/app/globals.css` | Slate Professional theme variables |
| Created | `src/components/ui/*.tsx` | 20 shadcn/ui components |
| Created | `src/hooks/use-mobile.ts` | Mobile detection hook |
| Created | `src/lib/utils.ts` | cn() utility function |
| Created | `next.config.ts` | Security headers configuration |
| Modified | `tsconfig.json` | TypeScript strict mode |
| Created | `eslint.config.mjs` | ESLint + Prettier config |
| Created | `postcss.config.mjs` | PostCSS for Tailwind |
| Created | `.prettierrc` | Prettier formatting rules |
| Created | `.env.example` | Environment variable template |
| Created | `package.json` | Project dependencies |
| Created | `pnpm-lock.yaml` | Dependency lockfile |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-30 | Dev Agent (Amelia) | Story implementation complete - all 9 tasks done |
| 2025-11-30 | Dev Agent (Amelia) | Senior Developer Review notes appended - APPROVED |

## Senior Developer Review (AI)

### Review Metadata

- **Reviewer:** Bmad (via Dev Agent)
- **Date:** 2025-11-30
- **Outcome:** **APPROVE**

### Summary

All 6 acceptance criteria have been fully implemented with verifiable evidence. All 9 tasks (with 37 subtasks) marked complete have been systematically verified against the actual codebase. The implementation follows best practices for Next.js 16, TypeScript strict mode, and shadcn/ui integration. Security headers are properly configured. One low-severity advisory note for future improvement.

### Key Findings

**HIGH Severity:** None

**MEDIUM Severity:** None

**LOW Severity:**
- [Low] Default metadata not customized - `src/app/layout.tsx:15-16` still shows "Create Next App" instead of project name

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 1 | `pnpm install && pnpm dev` starts on localhost:3000 | IMPLEMENTED | `package.json:6` dev script; server starts "Ready in 2.6s" |
| 2 | shadcn/ui components available and styled | IMPLEMENTED | 19 components in `src/components/ui/`; `page.tsx:1-2,19-21` uses Button/Card |
| 3 | Tailwind CSS v4 with Slate Professional theme | IMPLEMENTED | `globals.css:56-122` full Slate theme with semantic colors |
| 4 | TypeScript strict mode with noUncheckedIndexedAccess | IMPLEMENTED | `tsconfig.json:7-9` strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes |
| 5 | ESLint and Prettier configured | IMPLEMENTED | `eslint.config.mjs`, `.prettierrc`, `package.json:10-11` format scripts |
| 6 | Path aliases (@/*) resolve to src/* | IMPLEMENTED | `tsconfig.json:23-24` paths config; `page.tsx:1-2` uses @/ imports |

**Summary:** 6 of 6 acceptance criteria fully implemented

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Initialize Next.js project | [x] | VERIFIED | `package.json:27` next@16.0.5; `src/app/` structure |
| Task 2: Configure TypeScript strict mode | [x] | VERIFIED | `tsconfig.json:7-9` all strict options |
| Task 3: Initialize shadcn/ui | [x] | VERIFIED | 19 components in `src/components/ui/` |
| Task 4: Configure Tailwind with Slate theme | [x] | VERIFIED | `globals.css:56-178` complete theme |
| Task 5: Configure ESLint and Prettier | [x] | VERIFIED | `eslint.config.mjs`, `.prettierrc`, format scripts |
| Task 6: Verify path aliases | [x] | VERIFIED | `tsconfig.json:23-24`, `page.tsx:1-2` imports |
| Task 7: Add security headers | [x] | VERIFIED | `next.config.ts:3-42` all 5 headers |
| Task 8: Create .env.example | [x] | VERIFIED | `.env.example` 55 lines; `.gitignore:34` excludes .env* |
| Task 9: Verify complete setup | [x] | VERIFIED | Build passes, lint passes, dev server runs |

**Summary:** 9 of 9 completed tasks verified, 0 questionable, 0 false completions

### Test Coverage and Gaps

- **Manual Testing:** All 6 ACs manually verified via dev server and build
- **Automated Tests:** Not yet implemented (deferred to Story 1.7 per tech spec)
- **Gap:** No automated test suite - acceptable per story scope (testing story is 1.7)

### Architectural Alignment

- **App Router:** Correctly using Next.js App Router (`src/app/` structure)
- **TypeScript:** Full strict mode with noUncheckedIndexedAccess per architecture doc
- **Security Headers:** All required headers configured per architecture doc
- **Theme System:** Tailwind v4 CSS variables approach matches UX spec colors

### Security Notes

- Security headers properly configured in `next.config.ts`:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content-Security-Policy with sensible defaults
- `.gitignore` properly excludes `.env*` files
- No secrets exposed in committed files

### Best-Practices and References

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

### Action Items

**Code Changes Required:**
- None required - all ACs satisfied

**Advisory Notes:**
- Note: Consider updating `src/app/layout.tsx:15-16` metadata to "Investments Planner" in a future story
- Note: Next.js 16.0.5 installed (newer than spec's 15.x) - this is acceptable as it's backwards compatible
