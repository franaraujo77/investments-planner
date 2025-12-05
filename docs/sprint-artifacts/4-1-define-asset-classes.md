# Story 4.1: Define Asset Classes

**Status:** done
**Epic:** Epic 4 - Asset Class & Allocation Configuration
**Previous Story:** 3.9 Investment History View (Epic 3 Complete)

---

## Story

**As a** user
**I want to** define asset classes for my portfolio (e.g., Fixed Income, Variable Income, Crypto)
**So that** I can organize my investments into logical categories and set up my allocation strategy structure

---

## Acceptance Criteria

### AC-4.1.1: View Asset Classes List

- **Given** I am authenticated
- **When** I navigate to Settings → Asset Classes (or dedicated Asset Classes page)
- **Then** I see a list of my existing asset classes
- **And** if I have no classes, I see an empty state with "No asset classes yet" message
- **And** I see a call-to-action button "Add Asset Class"

### AC-4.1.2: Create Asset Class

- **Given** I am on the Asset Classes page
- **When** I click "Add Asset Class"
- **Then** I see a form/modal with fields for:
  - Name (required, max 50 chars)
  - Icon (optional, emoji selector)
- **And** when I enter a valid name and save
- **Then** the new class appears in my list
- **And** I see a success toast "Asset class created"

### AC-4.1.3: Edit Asset Class Name

- **Given** I have an asset class in my list
- **When** I click to edit (inline or via menu)
- **And** I change the name
- **Then** the change is saved immediately (auto-save or explicit save)
- **And** I see visual confirmation of the save

### AC-4.1.4: Delete Asset Class (No Assets)

- **Given** I have an asset class with no associated assets
- **When** I click delete
- **Then** I see a confirmation dialog "Delete [Class Name]?"
- **And** when I confirm, the class is removed from my list
- **And** I see a success toast "Asset class deleted"

### AC-4.1.5: Delete Asset Class (With Assets Warning)

- **Given** I have an asset class with associated assets
- **When** I attempt to delete it
- **Then** I see a warning: "This class has X assets. Deleting will orphan these assets."
- **And** I must explicitly confirm to proceed
- **Or** I can cancel and reassign assets first

---

## Technical Notes

### Database Schema

New tables required (per tech-spec-epic-4.md):

```typescript
// lib/db/schema.ts - Add to existing schema
export const assetClasses = pgTable("asset_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 10 }),
  targetMin: numeric("target_min", { precision: 5, scale: 2 }),
  targetMax: numeric("target_max", { precision: 5, scale: 2 }),
  maxAssets: integer("max_assets"),
  minAllocationValue: numeric("min_allocation_value", { precision: 19, scale: 4 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Index for efficient lookups
export const assetClassesUserIdIdx = index("asset_classes_user_id_idx").on(assetClasses.userId);
```

### Service Layer

Create new service (per tech-spec-epic-4.md):

```typescript
// lib/services/asset-class-service.ts
export class AssetClassService {
  async createClass(userId: string, data: CreateAssetClassInput): Promise<AssetClass>;
  async updateClass(
    userId: string,
    classId: string,
    data: UpdateAssetClassInput
  ): Promise<AssetClass>;
  async deleteClass(userId: string, classId: string): Promise<void>;
  async getClassesForUser(userId: string): Promise<AssetClass[]>;
  async getAssetCountByClass(userId: string, classId: string): Promise<number>;
}
```

### API Endpoints

| Method | Endpoint                  | Description                             |
| ------ | ------------------------- | --------------------------------------- |
| GET    | `/api/asset-classes`      | List all classes for authenticated user |
| POST   | `/api/asset-classes`      | Create new asset class                  |
| PATCH  | `/api/asset-classes/[id]` | Update asset class                      |
| DELETE | `/api/asset-classes/[id]` | Delete asset class                      |

### Validation Schema

```typescript
// lib/validations/asset-class-schemas.ts
export const createAssetClassSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  icon: z.string().max(10).optional(),
});

export const updateAssetClassSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(10).optional().nullable(),
});
```

### UI Components

**New Components to Create:**

| Component      | Location                                            | Purpose                                   |
| -------------- | --------------------------------------------------- | ----------------------------------------- |
| AssetClassList | `src/components/asset-classes/asset-class-list.tsx` | Display list of classes with CRUD actions |
| AssetClassForm | `src/components/asset-classes/asset-class-form.tsx` | Create/edit form (dialog or inline)       |
| AssetClassCard | `src/components/asset-classes/asset-class-card.tsx` | Individual class display with actions     |

**Pattern:** Use Notion-style block pattern from UX spec for class management.

### Existing Infrastructure to Reuse

| Component           | Location                         | Purpose                |
| ------------------- | -------------------------------- | ---------------------- |
| App Shell           | `src/app/(dashboard)/layout.tsx` | Dashboard layout       |
| Auth verification   | `src/lib/auth/session.ts`        | `verifySession()`      |
| Toast notifications | `src/components/ui/sonner.tsx`   | Success/error feedback |
| Dialog/Modal        | `src/components/ui/dialog.tsx`   | Confirmation dialogs   |
| Form components     | `src/components/ui/form.tsx`     | Form handling          |

---

## Tasks

### [x] Task 1: Database Schema & Migration (AC: All)

**Files:** `src/lib/db/schema.ts`, `drizzle/migrations/`

- Add `assetClasses` table definition to schema.ts
- Add `assetSubclasses` table definition (for Story 4.2, but create now)
- Generate migration with `pnpm db:generate`
- Apply migration with `pnpm db:push`
- Add TypeScript types for AssetClass

### [x] Task 2: Create AssetClassService (AC: All)

**Files:** `src/lib/services/asset-class-service.ts`

- Implement `getClassesForUser(userId)` - list all classes
- Implement `createClass(userId, data)` - create new class
- Implement `updateClass(userId, classId, data)` - update class
- Implement `deleteClass(userId, classId)` - delete class
- Implement `getAssetCountByClass(userId, classId)` - check for associated assets
- All operations scoped by userId for multi-tenant isolation

### [x] Task 3: Create Zod Validation Schemas (AC: 4.1.2)

**Files:** `src/lib/validations/asset-class-schemas.ts`

- Create `createAssetClassSchema`
- Create `updateAssetClassSchema`
- Export TypeScript types from schemas

### [x] Task 4: Create API Routes (AC: All)

**Files:**

- `src/app/api/asset-classes/route.ts` (GET, POST)
- `src/app/api/asset-classes/[id]/route.ts` (PATCH, DELETE)

- GET: Return all classes for authenticated user
- POST: Validate input, create class, return created class
- PATCH: Validate input, update class, return updated class
- DELETE: Check for associated assets, delete with confirmation logic

### [x] Task 5: Create React Query Hooks (AC: All)

**Files:** `src/hooks/use-asset-classes.ts`

- `useAssetClasses()` - fetch all classes
- `useCreateAssetClass()` - mutation for creating
- `useUpdateAssetClass()` - mutation for updating
- `useDeleteAssetClass()` - mutation for deleting
- Proper cache invalidation on mutations

### [x] Task 6: Create Asset Classes Page (AC: 4.1.1)

**Files:**

- `src/app/(dashboard)/asset-classes/page.tsx` (Server Component)
- `src/app/(dashboard)/asset-classes/asset-classes-client.tsx` (Client Component)

- Server component fetches initial data
- Client component handles interactivity
- Empty state with friendly message and CTA
- List view with AssetClassCard components

### [x] Task 7: Create AssetClassCard Component (AC: 4.1.1, 4.1.3, 4.1.4, 4.1.5)

**Files:** `src/components/asset-classes/asset-class-card.tsx`

- Display class name and icon
- Edit button/inline edit capability
- Delete button with confirmation
- Show asset count badge if assets exist

### [x] Task 8: Create AssetClassForm Component (AC: 4.1.2)

**Files:** `src/components/asset-classes/asset-class-form.tsx`

- Form fields: Name (required), Icon (optional emoji picker)
- Validation using Zod schema
- Submit handler calls mutation
- Success/error toast feedback

### [x] Task 9: Add Navigation Link

**Files:** `src/components/dashboard/app-sidebar.tsx`

- Add "Asset Classes" link to sidebar navigation
- Use appropriate icon (e.g., FolderTree from lucide-react)
- Place in Settings section or main navigation

### [x] Task 10: Create Unit Tests (AC: All)

**Files:**

- `tests/unit/services/asset-class-service.test.ts`
- `tests/unit/api/asset-classes.test.ts`
- `tests/unit/validations/asset-class-schemas.test.ts`

Test cases:

- Service: CRUD operations, multi-tenant isolation
- API: Auth required, validation, error handling
- Schemas: Valid/invalid inputs, edge cases

### [x] Task 11: Create E2E Tests (AC: All)

**Files:** `tests/e2e/asset-classes.spec.ts`

Test cases:

- Navigate to Asset Classes page
- View empty state
- Create new asset class
- Edit asset class name
- Delete asset class (no assets)
- Delete asset class (with assets warning)
- Authentication redirect

### [x] Task 12: Run Verification

- `pnpm lint` - ensure 0 errors
- `pnpm build` - ensure successful build
- `pnpm test` - ensure all tests pass

---

## Dependencies

- Epic 1-3 Complete (Foundation, Auth, Portfolio Core)
- User authentication system (from Epic 2)
- App shell and sidebar navigation (from Epic 1)

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Multi-tenant isolation** - All queries MUST include userId filter
- **Drizzle ORM** - Use parameterized queries (no raw SQL)
- **Zod validation** - All API inputs must be validated
- **Toast feedback** - Use sonner for success/error notifications

[Source: docs/architecture.md#Security-Architecture]
[Source: docs/architecture.md#API-Route-Pattern]

### UX Guidelines

Per UX design specification:

- **Notion-style blocks** - Class management should feel like Notion blocks
- **Inline editing** - Click to edit, blur to save pattern
- **Confirmation dialogs** - Required for delete actions
- **Empty states** - Friendly message with clear CTA

[Source: docs/ux-design-specification.md#Component-Library]
[Source: docs/ux-design-specification.md#UX-Pattern-Decisions]

### Testing Standards

Per CLAUDE.md:

- Every code change requires test coverage
- Unit tests for services and API routes
- E2E tests for critical user flows
- Calculation functions require 100% coverage

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

New files to create:

- `src/app/(dashboard)/asset-classes/page.tsx`
- `src/app/(dashboard)/asset-classes/asset-classes-client.tsx`
- `src/app/api/asset-classes/route.ts`
- `src/app/api/asset-classes/[id]/route.ts`
- `src/lib/services/asset-class-service.ts`
- `src/lib/validations/asset-class-schemas.ts`
- `src/components/asset-classes/asset-class-card.tsx`
- `src/components/asset-classes/asset-class-form.tsx`
- `src/components/asset-classes/asset-class-list.tsx`
- `src/hooks/use-asset-classes.ts`

### Learnings from Previous Story

**From Story 3-9-investment-history-view (Status: done)**

- **Server/Client Component Pattern**: Follow the pattern established with `page.tsx` (Server) + `*-client.tsx` (Client) separation
- **React Query Hooks**: Create dedicated hooks file (`use-asset-classes.ts`) following `use-investments.ts` pattern
- **CSV Export Module**: If export is needed later, follow client-safe module pattern from `csv-export.ts`
- **Testing Patterns**: Follow unit test patterns from `export-service.test.ts` and E2E from `history.spec.ts`
- **Verification Results**: Build and lint pass, 666 tests passing - maintain this baseline

[Source: docs/sprint-artifacts/3-9-investment-history-view.md#Dev-Agent-Record]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story-4.1]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Data-Models-and-Contracts]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#APIs-and-Interfaces]
- [Source: docs/architecture.md#Service-Layer-Pattern]
- [Source: docs/architecture.md#API-Route-Pattern]
- [Source: docs/ux-design-specification.md#Component-Library]

---

## Dev Agent Record

### Context Reference

- [docs/sprint-artifacts/4-1-define-asset-classes.context.xml](4-1-define-asset-classes.context.xml)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Implemented complete asset class CRUD functionality
- Created Strategy page at `/strategy` (instead of `/asset-classes` as originally planned for better UX)
- Uses Notion-style inline editing pattern for asset class cards
- Added Strategy navigation link with Target icon in sidebar
- Enforces 10 asset class limit per user per tech spec
- Multi-tenant isolation on all operations via userId filtering
- Delete shows warning dialog when asset class has associated assets
- All acceptance criteria implemented and verified
- Build passes, lint passes (0 errors), 815 tests pass (25 skipped)
- E2E tests created at tests/e2e/strategy.spec.ts

### File List

**Created:**

- `src/app/(dashboard)/strategy/page.tsx` - Strategy page (Server Component)
- `src/app/api/asset-classes/route.ts` - GET, POST API endpoints
- `src/app/api/asset-classes/[id]/route.ts` - GET, PATCH, DELETE API endpoints
- `src/lib/services/asset-class-service.ts` - Service layer with CRUD operations
- `src/lib/validations/asset-class-schemas.ts` - Zod validation schemas
- `src/hooks/use-asset-classes.ts` - React hooks for data fetching
- `src/components/strategy/asset-class-list.tsx` - List component
- `src/components/strategy/asset-class-card.tsx` - Card component with inline edit
- `src/components/strategy/asset-class-form.tsx` - Create form component
- `tests/unit/services/asset-class-service.test.ts` - Unit tests (25 tests)
- `tests/unit/validations/asset-class.test.ts` - Validation tests (26 tests)
- `tests/e2e/strategy.spec.ts` - E2E tests

**Modified:**

- `src/lib/db/schema.ts` - Added assetClasses, assetSubclasses tables
- `src/components/dashboard/app-sidebar.tsx` - Added Strategy nav link
- `drizzle/0003_performance_indexes.sql` - Fixed migration dependency
- `drizzle/0004_bored_reaper.sql` - Added asset classes migration

---

## Change Log

| Date       | Change                                 | Author                           |
| ---------- | -------------------------------------- | -------------------------------- |
| 2025-12-04 | Story drafted from tech-spec-epic-4.md | SM Agent (create-story workflow) |
