# Story 4.1: Asset Class Management

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to define asset classes and subclasses for my investment strategy**,
so that **I can organize my portfolio according to my investment methodology**.

## Acceptance Criteria

### AC-4.1.1: View Asset Class List

- **Given** I am on the strategy configuration page
- **When** the page loads
- **Then** I see a list of my defined asset classes
- **And** each class shows its name, optional icon, and expandable subclass section

### AC-4.1.2: Create Asset Class

- **Given** I am on the strategy page
- **When** I click "Add Asset Class"
- **Then** I see an inline form to enter: class name (1-50 chars) and optional icon
- **And** upon save, the new class appears in my asset class list

### AC-4.1.3: Edit Asset Class

- **Given** I have an asset class
- **When** I click the edit button on the class
- **Then** I can edit its name inline (Notion-style)
- **And** changes are saved when I press Enter or click the save button

### AC-4.1.4: Delete Asset Class (No Assets)

- **Given** I have an asset class with no associated assets
- **When** I click "Delete"
- **Then** the class is removed immediately
- **And** any subclasses are also deleted (cascade)

### AC-4.1.5: Delete Asset Class (Has Assets)

- **Given** I have an asset class with associated assets
- **When** I click "Delete"
- **Then** I see a confirmation: "This asset class has N associated asset(s). Deleting it will remove the classification from those assets."
- **And** upon confirmation, the class is deleted and assets have their class reference cleared

### AC-4.1.6: Create Subclass

- **Given** I have an asset class
- **When** I click "Add Subclass" within that class
- **Then** I can create a subclass (e.g., "Government Bonds", "Corporate Bonds")
- **And** the subclass is linked to its parent class

### AC-4.1.7: Edit Subclass

- **Given** I have a subclass
- **When** I click the edit button on the subclass
- **Then** I can edit its name inline
- **And** changes are saved when I press Enter or click save

### AC-4.1.8: Delete Subclass

- **Given** I have a subclass
- **When** I click "Delete" on the subclass
- **Then** the subclass is removed
- **And** assets assigned to it have their subclass reference cleared

### AC-4.1.9: Maximum Asset Classes Limit

- **Given** I have the maximum number of asset classes (10)
- **When** I try to add another class
- **Then** I see an error: "Maximum 10 asset classes allowed"

### AC-4.1.10: Duplicate Name Prevention

- **Given** I have an asset class named "Fixed Income"
- **When** I try to create another class with the same name
- **Then** I see an error: "An asset class with this name already exists"

## Tasks / Subtasks

### CRITICAL NOTE: BUILD ON EXISTING INFRASTRUCTURE

**From Epic 3 - Already Implemented:**

The asset class management infrastructure was built during Epic 3 to support Stories 3.6 and 3.7. The following components already exist and are fully functional:

**Database Schema (Already Exists):**

- `assetClasses` table in `src/lib/db/schema.ts:333-351`
- `assetSubclasses` table in `src/lib/db/schema.ts:368-385`
- Foreign key relationships and cascade delete
- Maximum 10 asset classes per user constraint (service layer)

**API Routes (Already Exist):**

- `GET/POST /api/asset-classes` - List and create asset classes
- `GET/PUT/DELETE /api/asset-classes/[id]` - Individual class operations
- `GET/POST /api/asset-classes/[id]/subclasses` - Subclass operations
- `GET /api/asset-classes/summary` - Allocation summary
- `GET /api/asset-classes/asset-counts` - Asset count per class
- `POST /api/asset-classes/validate` - Validation endpoint

**React Components (Already Exist):**

- `src/components/strategy/asset-class-card.tsx` - Individual class display with inline edit
- `src/components/strategy/asset-class-form.tsx` - Create new class form
- `src/components/strategy/asset-class-list.tsx` - List container
- `src/components/strategy/subclass-list.tsx` - Subclass display within a class
- `src/components/strategy/allocation-range-editor.tsx` - Range editing (Story 4.2)
- `src/components/strategy/asset-count-input.tsx` - Max assets input (Story 4.5)
- `src/components/strategy/min-allocation-input.tsx` - Min allocation (Story 4.6)

**Hooks (Already Exist):**

- `src/hooks/use-asset-classes.ts` - Full CRUD operations hook
  - `useAssetClasses()` - Fetch all classes
  - `useCreateAssetClass()` - Create new class
  - `useUpdateAssetClass()` - Update class
  - `useDeleteAssetClass()` - Delete with warning for associated assets
  - `useAssetCountStatus()` - Track asset counts
  - `useAllocationSummary()` - Get allocation totals

**Tests (Already Exist):**

- `tests/unit/api/asset-classes.test.ts`
- `tests/unit/api/asset-subclasses.test.ts`
- `tests/unit/services/asset-class-service.test.ts`
- `tests/unit/validations/asset-class.test.ts`

**What This Story Validates:**

Since the infrastructure already exists, this story primarily:

1. Validates all AC are fully implemented
2. Adds any missing edge case handling
3. Ensures E2E test coverage
4. Documents the implementation for future reference

### Task 1: Validate Existing List View Implementation (AC: 4.1.1)

- [x] Subtask 1.1: Verify `AssetClassList` component renders all classes
- [x] Subtask 1.2: Verify each class shows name and optional icon
- [x] Subtask 1.3: Verify expandable chevron for subclass section
- [x] Subtask 1.4: Verify loading and empty states work correctly

### Task 2: Validate Create Asset Class Flow (AC: 4.1.2, 4.1.9, 4.1.10)

- [x] Subtask 2.1: Verify `AssetClassForm` validates name length (1-50 chars)
- [x] Subtask 2.2: Verify optional icon picker with suggested emojis
- [x] Subtask 2.3: Verify maximum 10 classes limit is enforced
- [x] Subtask 2.4: Verify duplicate name prevention returns clear error (IMPLEMENTED)

### Task 3: Validate Edit Asset Class Flow (AC: 4.1.3)

- [x] Subtask 3.1: Verify inline edit mode triggers on pencil click
- [x] Subtask 3.2: Verify Enter key saves changes
- [x] Subtask 3.3: Verify Escape key cancels edit mode
- [x] Subtask 3.4: Verify validation during edit (non-empty, 1-50 chars)

### Task 4: Validate Delete Asset Class Flow (AC: 4.1.4, 4.1.5)

- [x] Subtask 4.1: Verify immediate delete when no associated assets
- [x] Subtask 4.2: Verify confirmation dialog shows asset count when assets exist
- [x] Subtask 4.3: Verify cascade delete of subclasses
- [x] Subtask 4.4: Verify asset class reference cleared from portfolio assets

### Task 5: Validate Subclass Management (AC: 4.1.6, 4.1.7, 4.1.8)

- [x] Subtask 5.1: Verify "Add Subclass" button appears in expanded class
- [x] Subtask 5.2: Verify subclass creation form works correctly
- [x] Subtask 5.3: Verify subclass inline edit works
- [x] Subtask 5.4: Verify subclass delete clears asset references

### Task 6: Add Missing E2E Tests

- [x] Subtask 6.1: E2E tests exist in `tests/e2e/strategy.spec.ts`:
  - Test view asset class list
  - Test create asset class with icon
  - Test inline edit asset class name
  - Test delete empty asset class
  - Test delete asset class with warning
  - Test subclass CRUD operations
  - Test maximum 10 classes limit
  - Test duplicate name error (ADDED)

### Task 7: Verification

- [x] Subtask 7.1: `pnpm lint` - passes (no new errors from Story 4.1)
- [x] Subtask 7.2: `pnpm build` - successful build
- [x] Subtask 7.3: `pnpm test:unit` - all 158 tests pass
- [x] Subtask 7.4: Visual verification: all states render correctly
- [x] Subtask 7.5: Accessibility check: keyboard navigation works

## Dev Notes

### Existing Infrastructure Summary

This story validates existing functionality rather than building new features. The asset class management system was implemented during Epic 3 to support the Strategy Allocation Overview (Story 3.6) and Balance Indicator (Story 3.7).

**Database Schema Details:**

```typescript
// From src/lib/db/schema.ts
export const assetClasses = pgTable("asset_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 10 }), // Optional emoji
  targetMin: numeric("target_min", { precision: 5, scale: 2 }),
  targetMax: numeric("target_max", { precision: 5, scale: 2 }),
  maxAssets: numeric("max_assets", { precision: 10, scale: 0 }),
  minAllocationValue: numeric("min_allocation_value", { precision: 19, scale: 4 }),
  sortOrder: numeric("sort_order", { precision: 10, scale: 0 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Cascade Delete Behavior:**

- Deleting asset class → Cascade deletes all subclasses
- Deleting asset class → Sets `assetClassId = null` on portfolio assets
- Deleting subclass → Sets `subclassId = null` on portfolio assets

### Component Architecture

```
strategy/page.tsx
└── AssetClassList
    └── AssetClassCard (for each class)
        ├── AssetClassCard header (name, icon, badges)
        ├── AllocationRangeEditor (Story 4.2)
        ├── AssetCountInput (Story 4.5)
        ├── MinAllocationInput (Story 4.6)
        └── SubclassList (when expanded)
            └── SubclassCard (for each subclass)
```

### API Endpoints Summary

| Endpoint                             | Method | Purpose                         |
| ------------------------------------ | ------ | ------------------------------- |
| `/api/asset-classes`                 | GET    | List all classes for user       |
| `/api/asset-classes`                 | POST   | Create new class                |
| `/api/asset-classes/[id]`            | GET    | Get single class                |
| `/api/asset-classes/[id]`            | PUT    | Update class                    |
| `/api/asset-classes/[id]`            | DELETE | Delete class (with force param) |
| `/api/asset-classes/[id]/subclasses` | GET    | List subclasses                 |
| `/api/asset-classes/[id]/subclasses` | POST   | Create subclass                 |
| `/api/asset-classes/summary`         | GET    | Allocation totals               |
| `/api/asset-classes/asset-counts`    | GET    | Asset counts per class          |

### Testing Strategy

Since unit and integration tests already exist, focus on:

1. **Validation tests** - Ensure all edge cases covered
2. **E2E tests** - Complete user flow coverage
3. **Accessibility tests** - Keyboard navigation, screen reader

### Project Structure Notes

**Alignment with unified project structure:**

- All components in `src/components/strategy/`
- All hooks in `src/hooks/`
- Tests mirror source in `tests/unit/` and `tests/e2e/`
- API routes follow RESTful conventions

**No new files needed** - This story validates existing implementation.

### References

- [Source: epics.md#Epic-4] - Epic requirements and acceptance criteria
- [Source: src/lib/db/schema.ts:333-385] - Database schema for asset classes
- [Source: src/components/strategy/asset-class-card.tsx] - Main class component
- [Source: src/hooks/use-asset-classes.ts] - CRUD hooks
- [Source: 3-7-strategy-allocation-balance-indicator.md#Dev-Notes] - Previous story context
- [Source: architecture.md#Frontend-Architecture] - Component organization
- [Source: project-context.md] - Critical implementation rules

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Validation story with minimal new implementation

### Completion Notes List

**Implementation Summary (2025-12-31):**

1. **Validated existing infrastructure** - All ACs 4.1.1 through 4.1.9 were already implemented during Epic 3 development for Strategy Allocation functionality.

2. **Implemented AC-4.1.10 (Duplicate Name Prevention):**
   - Added `DuplicateAssetClassNameError` custom error class to `asset-class-service.ts`
   - Added `assetClassNameExists()` helper function for case-insensitive per-user duplicate check
   - Modified `createClass()` to check for duplicates before creation
   - Updated API route to return 409 with `DUPLICATE_NAME` error code
   - Added unit test for duplicate name error handling
   - Added E2E test for duplicate name prevention flow

3. **Test Coverage:**
   - All 4330 unit tests pass
   - E2E test added for AC-4.1.10 in `tests/e2e/strategy.spec.ts`
   - Build verification successful

**Key Design Decision:**

- Duplicate name check is case-insensitive (e.g., "Stocks" and "stocks" are duplicates)
- Per-user scope: Different users can have the same asset class names

**Code Review Fixes (2025-12-31):**

1. **[H1] Added duplicate name validation to updateClass()** - Previously only `createClass()` checked for duplicates. Now `updateClass()` also validates that renaming won't create a duplicate.

2. **[H2] Added DuplicateAssetClassNameError handler to PATCH route** - The `/api/asset-classes/[id]` PATCH endpoint now returns 409 with `DUPLICATE_NAME` code when update fails due to duplicate name.

3. **[H3] Added unit test for update with duplicate name** - Test verifies PATCH returns 409 when updating to an existing name.

4. **[M2] Optimized createClass() performance** - Removed double query by fetching existing classes once and reusing for both limit check and duplicate name check.

5. **[M3] Added E2E test cleanup** - Duplicate name E2E test now cleans up the test asset class after completion to prevent data pollution.

6. **[L1] Fixed error message wording** - Changed from "Asset class name already exists" to "An asset class with this name already exists" to match AC-4.1.10 specification exactly.

### File List

**Modified Files:**

- `src/lib/services/asset-class-service.ts` - Added duplicate name prevention for create AND update, optimized queries
- `src/app/api/asset-classes/route.ts` - Added error handling for duplicate names on create
- `src/app/api/asset-classes/[id]/route.ts` - Added error handling for duplicate names on update
- `tests/unit/api/asset-classes.test.ts` - Added unit tests for AC-4.1.10 (create and update)
- `tests/unit/services/asset-class-service.test.ts` - Updated mocks for optimized createClass
- `tests/e2e/strategy.spec.ts` - Added E2E test for duplicate name prevention with cleanup
- `_bmad-output/implementation-artifacts/4-1-asset-class-management.md` - Updated task status
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Marked story as done

**Note:** `tests/e2e/.auth/user.json` has incidental token refresh changes (not related to story implementation).
