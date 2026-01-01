# Story 4.3: Scoring Criteria Creation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to define scoring criteria with point values and operators**,
so that **the system can score assets according to my investment methodology**.

## Acceptance Criteria

### AC-4.3.1: View Scoring Criteria Page

- **Given** I am on the strategy page
- **When** I navigate to the "Scoring Criteria" section/tab
- **Then** I see a list of my defined criteria sets organized by market/asset type

### AC-4.3.2: Add New Criterion

- **Given** I am on the scoring criteria page
- **When** I click "Add Criterion"
- **Then** I see a form to define: name (1-100 chars), description (optional), data field (metric), operator, value(s), and points (-100 to +100)

### AC-4.3.3: Select Operator

- **Given** I am creating a criterion
- **When** I select an operator
- **Then** I can choose from: greater than (>), less than (<), greater than or equal (>=), less than or equal (<=), between, equals, not equals
- **And** the value fields adjust accordingly (single value or range for "between")

### AC-4.3.4: Define Criterion with Points

- **Given** I define a criterion (e.g., "P/E Ratio < 15 = 10 points")
- **When** I save the criterion
- **Then** it is added to my criteria set for that market/asset type
- **And** points can be positive (reward) or negative (penalty)

### AC-4.3.5: Points Range Validation

- **Given** I am creating criteria
- **When** I assign point values
- **Then** points must be within range -100 to +100
- **And** validation prevents saving out-of-range values

### AC-4.3.6: Criteria Priority Ordering

- **Given** I want to organize criteria
- **When** I drag and drop criteria blocks
- **Then** I can reorder them by priority
- **And** the order is preserved

### AC-4.3.7: Create Criteria Set for Market/Asset Type

- **Given** I am creating criteria
- **When** I create a new criteria set
- **Then** I must specify the target market (e.g., "BR_BANKS", "US_TECH") and asset type (e.g., "stock", "reit", "etf")
- **And** criteria are grouped by this classification

### AC-4.3.8: Edit Existing Criterion

- **Given** I have a saved criterion
- **When** I click edit on the criterion
- **Then** I can modify its name, description, metric, operator, values, and points
- **And** changes are saved when I submit

### AC-4.3.9: Delete Criterion

- **Given** I have a criterion
- **When** I click "Delete" on the criterion
- **Then** I see a confirmation dialog
- **And** upon confirmation, the criterion is removed from the set

### AC-4.3.10: Criteria Versioning (Immutable)

- **Given** I save changes to a criteria set
- **When** the save completes
- **Then** a new version is created (immutable versioning)
- **And** the previous version is preserved for audit trail
- **And** the new version becomes active

## Tasks / Subtasks

### CRITICAL NOTE: BUILD ON EXISTING DATABASE INFRASTRUCTURE

**From Epic 5 Planning - Already Implemented:**

The database schema for scoring criteria was built during Epic 5 planning. The following components already exist:

**Database Schema (Already Exists in schema.ts:460-481):**

- `criteriaVersions` table with: id, userId, assetType, targetMarket, name, criteria (JSONB), version, isActive, createdAt, updatedAt
- `CriterionRule` interface with: id, name, metric, operator, value, value2, points, requiredFundamentals, sortOrder
- `CRITERION_METRICS` constant with 15 supported metrics
- `CRITERION_OPERATORS` constant with 7 operators (gt, lt, gte, lte, between, equals, exists)
- Indexes for user_id, asset_type, and target_market

**Scoring Engine (Already Exists in lib/calculations/scoring-engine.ts):**

- `evaluateCriterion()` function for evaluating rules
- `calculateScores()` function for batch scoring
- `calculateScoresWithEvents()` for audit trail
- Decimal.js integration for precision

**What This Story Implements:**

1. UI components for viewing/creating/editing scoring criteria
2. API routes for CRUD operations on criteria_versions
3. Criteria set management by market/asset type
4. Drag-and-drop reordering
5. Criteria versioning with active/inactive states

---

### Task 1: Create Criteria Service (Backend Logic)

**Context:** Service layer for criteria CRUD operations with versioning support.

- [x] Subtask 1.1: Create `src/lib/services/criteria-service.ts`:
  - `getCriteriaSetsByUser(userId)` - Get all criteria sets grouped by market/asset type
  - `getCriteriaSetById(userId, id)` - Get single criteria set
  - `getActiveCriteriaSet(userId, assetType, targetMarket)` - Get active set for market
  - `createCriteriaSet({ userId, assetType, targetMarket, name, criteria })` - Create new set (version 1)
  - `updateCriteriaSet(userId, id, updates)` - Creates new version (immutable)
  - `deleteCriteriaSet(userId, id)` - Soft delete (set isActive=false)
- [x] Subtask 1.2: Add `CriteriaSetNotFoundError` custom error class
- [x] Subtask 1.3: Add `DuplicateCriteriaSetError` for same assetType+targetMarket+name combo
- [x] Subtask 1.4: Implement version incrementing logic (find max version, increment)
- [x] Subtask 1.5: Add unit tests for service functions

### Task 2: Create Criteria API Routes (AC: 4.3.1, 4.3.2, 4.3.8, 4.3.9)

**Context:** RESTful API endpoints for criteria management.

- [x] Subtask 2.1: Create `src/app/api/criteria/route.ts`:
  - GET: List all criteria sets for authenticated user (grouped by market/asset type)
  - POST: Create new criteria set with initial criteria
- [x] Subtask 2.2: Create `src/app/api/criteria/[id]/route.ts`:
  - GET: Get single criteria set with all criteria
  - PATCH: Update criteria set (creates new version)
  - DELETE: Soft delete criteria set
- [x] Subtask 2.3: Create `src/app/api/criteria/[id]/reorder/route.ts`:
  - PATCH: Reorder criteria within a set
- [x] Subtask 2.4: Add validation using Zod schemas
- [x] Subtask 2.5: Add unit tests for API routes

### Task 3: Create Criteria Zod Validation Schemas (AC: 4.3.5)

**Context:** Schema-first validation for criteria data.

- [x] Subtask 3.1: Create `src/lib/validations/criteria-schemas.ts`:
  - `criterionRuleSchema` - Single criterion validation
  - `createCriteriaSetSchema` - For POST requests
  - `updateCriteriaSetSchema` - For PATCH requests
  - `reorderCriteriaSchema` - For reorder endpoint
- [x] Subtask 3.2: Validate points range -100 to +100
- [x] Subtask 3.3: Validate operator-value consistency (between requires value2)
- [x] Subtask 3.4: Validate metric is in AVAILABLE_METRICS list
- [x] Subtask 3.5: Add unit tests for validation schemas

### Task 4: Create Criteria Hooks

**Context:** React hooks for criteria data fetching and mutations.

- [x] Subtask 4.1: Create `src/hooks/use-criteria.ts`:
  - `useCriteria()` - Fetch all criteria sets
  - `useCriteriaSet(id)` - Fetch single criteria set
  - `useCreateCriteriaSet()` - Mutation hook for creating
  - `useUpdateCriteriaSet()` - Mutation hook for updating (creates version)
  - `useDeleteCriteriaSet()` - Mutation hook for deletion
  - `useReorderCriteria()` - Mutation hook for drag-drop reordering
- [x] Subtask 4.2: Add optimistic updates for better UX
- [x] Subtask 4.3: Add error handling with toast notifications
- [x] Subtask 4.4: Add cache invalidation after mutations (using router.refresh())

### Task 5: Create Scoring Criteria UI Components (AC: 4.3.1, 4.3.2, 4.3.3)

**Context:** React components for criteria management UI.

- [x] Subtask 5.1: Create `src/components/criteria/criteria-list.tsx`:
  - List of criteria sets grouped by market/asset type (tabs)
  - Expandable sections for each criteria set
  - Add new criteria set button
- [x] Subtask 5.2: Create `src/components/criteria/criteria-set-card.tsx`:
  - Display criteria set header (name, market, asset type)
  - Show number of criteria with badge
  - Edit/delete actions via dropdown menu
  - Expand to show individual criteria
- [x] Subtask 5.3: Create `src/components/fintech/criteria-block.tsx`:
  - Form for creating/editing single criterion
  - Metric dropdown (from AVAILABLE_METRICS)
  - Operator dropdown (from AVAILABLE_OPERATORS)
  - Dynamic value fields (single vs range for "between")
  - Points input with -100 to +100 validation
- [x] Subtask 5.4: Create `src/components/criteria/criterion-card.tsx`:
  - Display single criterion in a card
  - Show: name, metric, operator, value(s), points
  - Inline edit mode
  - Delete button
- [x] Subtask 5.5: Create `src/components/criteria/create-criteria-dialog.tsx`:
  - Modal/dialog for creating new criteria set
  - Asset type dropdown
  - Target market input/dropdown
  - Name input
- [x] Subtask 5.6: Create `src/components/criteria/index.ts` barrel export

### Task 6: Implement Drag-and-Drop Reordering (AC: 4.3.6)

**Context:** Allow users to reorder criteria by priority.

- [x] Subtask 6.1: Add `@dnd-kit` library for drag-drop (already installed: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities)
- [x] Subtask 6.2: Implement sortable in `src/components/criteria/criteria-list.tsx`:
  - Wrap criteria list in DndContext
  - SortableContext with verticalListSortingStrategy
  - SortableCriterionBlock wrapper for each criterion
- [x] Subtask 6.3: Add visual drag handle on criterion cards (via useSortable)
- [x] Subtask 6.4: Call reorder API on drop via handleDragEnd
- [x] Subtask 6.5: Add optimistic reordering for smooth UX

### Task 7: Create Scoring Criteria Page (AC: 4.3.1, 4.3.7)

**Context:** Page for viewing and managing scoring criteria.

- [x] Subtask 7.1: Create `src/app/(dashboard)/criteria/page.tsx`:
  - Server component with metadata
  - Client wrapper `criteria-page-client.tsx` for interactive features
- [x] Subtask 7.2: Add loading and empty states
- [x] Subtask 7.3: Add navigation link from dashboard layout
- [x] Subtask 7.4: Implement grouped view by market/asset type (tabs)
- [x] Subtask 7.5: Add "Create New Criteria Set" button

### Task 8: Implement Criteria Versioning Display (AC: 4.3.10)

**Context:** Show version history and active status.

- [x] Subtask 8.1: Add version badge to criteria set card
- [x] Subtask 8.2: Show "Active" indicator on active version
- [x] Subtask 8.3: Add note when editing: "Saving will create a new version"
- [x] Subtask 8.4: Show previous version count on card

### Task 9: Add E2E Tests

**Context:** End-to-end tests for criteria management flows.

- [x] Subtask 9.1: Create `tests/e2e/criteria.spec.ts`:
  - Test: View empty criteria page
  - Test: Create new criteria set with market/asset type
  - Test: Add criterion with points
  - Test: Edit criterion operator and value
  - Test: Delete criterion with confirmation
  - Test: Drag-drop reorder criteria
  - Test: Version increment on save
- [x] Subtask 9.2: Add test data cleanup
- [x] Subtask 9.3: Verify criteria affects scoring (integration)

### Task 10: Verification

- [x] Subtask 10.1: `pnpm lint` - No new errors
- [x] Subtask 10.2: `pnpm build` - Successful build
- [x] Subtask 10.3: `pnpm test:unit` - All tests pass
- [x] Subtask 10.4: `pnpm test:e2e` - E2E tests pass
- [x] Subtask 10.5: Visual verification: all states render correctly
- [x] Subtask 10.6: Accessibility check: keyboard navigation, ARIA labels

## Dev Notes

### Existing Infrastructure Summary

The scoring engine and database schema already exist from Epic 5 planning. This story focuses on building the **user-facing UI** for creating and managing scoring criteria.

### Database Schema Reference

From `src/lib/db/schema.ts:460-481`:

```typescript
// criteriaVersions table
export const criteriaVersions = pgTable("criteria_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assetType: varchar("asset_type", { length: 50 }).notNull(), // 'stock', 'reit', 'etf'
  targetMarket: varchar("target_market", { length: 50 }).notNull(), // 'BR_BANKS', 'US_TECH'
  name: varchar("name", { length: 100 }).notNull(),
  criteria: jsonb("criteria").notNull().$type<CriterionRule[]>(),
  version: integer("version").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### CriterionRule Interface

From `src/lib/db/schema.ts:435-445`:

```typescript
export interface CriterionRule {
  id: string;
  name: string;
  metric: CriterionMetric; // 'dividend_yield', 'pe_ratio', etc.
  operator: CriterionOperator; // 'gt', 'lt', 'between', etc.
  value: string; // Decimal string for comparison
  value2?: string | null; // For 'between' operator
  points: number; // -100 to +100
  requiredFundamentals: string[]; // Data points needed
  sortOrder: number;
}
```

### Available Metrics (CRITERION_METRICS)

From `src/lib/db/schema.ts:400-416`:

```typescript
export const CRITERION_METRICS = [
  "dividend_yield",
  "pe_ratio",
  "pb_ratio",
  "market_cap",
  "revenue",
  "earnings",
  "surplus_years",
  "roe",
  "roa",
  "debt_to_equity",
  "current_ratio",
  "gross_margin",
  "net_margin",
  "payout_ratio",
  "ev_ebitda",
] as const;
```

### Available Operators (CRITERION_OPERATORS)

From `src/lib/db/schema.ts:423-431`:

```typescript
export const CRITERION_OPERATORS = [
  "gt", // greater than (>)
  "lt", // less than (<)
  "gte", // greater than or equal (>=)
  "lte", // less than or equal (<=)
  "between", // value >= min AND value <= max
  "equals", // exact match
  "exists", // value is not null
] as const;
```

### Component Architecture

```
strategy/scoring-criteria/page.tsx
└── CriteriaList
    └── CriteriaSetCard (for each set grouped by market/asset type)
        ├── CriteriaSetCard header (name, market, asset type, version badge)
        └── SortableCriterionList (when expanded)
            └── CriterionCard (for each criterion)
                ├── Criterion display (name, metric, operator, value, points)
                ├── Edit button → CriterionForm modal
                └── Delete button → Confirmation dialog
        └── "Add Criterion" button → CriterionForm modal
    └── "Create Criteria Set" button → CriteriaSetForm modal
```

### API Endpoints to Create

| Endpoint                             | Method | Purpose                                   |
| ------------------------------------ | ------ | ----------------------------------------- |
| `/api/scoring-criteria`              | GET    | List all criteria sets for user           |
| `/api/scoring-criteria`              | POST   | Create new criteria set                   |
| `/api/scoring-criteria/[id]`         | GET    | Get single criteria set                   |
| `/api/scoring-criteria/[id]`         | PUT    | Update criteria set (creates new version) |
| `/api/scoring-criteria/[id]`         | DELETE | Soft delete criteria set                  |
| `/api/scoring-criteria/[id]/reorder` | PUT    | Reorder criteria within set               |

### Versioning Strategy

The versioning approach follows immutable event sourcing principles:

1. **Create**: Creates version 1 of the criteria set
2. **Update**: Creates version N+1, sets `isActive=true` on new version, `isActive=false` on old
3. **Delete**: Soft delete - sets `isActive=false` on current version
4. **Audit Trail**: All versions preserved for score recalculation history

```typescript
// When updating a criteria set:
async function updateCriteriaSet(userId: string, id: string, updates: Partial<CriteriaSet>) {
  const existing = await getCriteriaSetById(userId, id);
  if (!existing) throw new CriteriaSetNotFoundError();

  // Deactivate current version
  await db.update(criteriaVersions).set({ isActive: false }).where(eq(criteriaVersions.id, id));

  // Create new version
  const maxVersion = await db.query.criteriaVersions.findFirst({
    where: and(
      eq(criteriaVersions.userId, userId),
      eq(criteriaVersions.assetType, existing.assetType),
      eq(criteriaVersions.targetMarket, existing.targetMarket)
    ),
    orderBy: desc(criteriaVersions.version),
  });

  const newVersion = (maxVersion?.version ?? 0) + 1;

  return db.insert(criteriaVersions).values({
    ...existing,
    ...updates,
    id: crypto.randomUUID(),
    version: newVersion,
    isActive: true,
    updatedAt: new Date(),
  });
}
```

### UI/UX Patterns

**Form Field Behaviors:**

- **Metric dropdown**: Shows human-readable labels (e.g., "P/E Ratio" instead of "pe_ratio")
- **Operator dropdown**: Shows symbols (e.g., ">" instead of "gt")
- **Value fields**: Dynamic based on operator:
  - `between`: Shows two input fields (min/max)
  - `exists`: Hides value field
  - All others: Single value input
- **Points field**: Number input with min=-100, max=100

**Drag-Drop Pattern:**

Following existing Epic 3 patterns, use `@dnd-kit` library (check package.json):

```typescript
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

**Toast Notifications:**

- Success: "Criterion saved" (3s auto-dismiss)
- Error: "Failed to save criterion" (persistent)
- Info: "New version created" (3s auto-dismiss)

### Project Structure Notes

**Alignment with unified project structure:**

- All scoring components in `src/components/scoring/`
- Hooks in `src/hooks/use-scoring-criteria.ts`
- Validations in `src/lib/validations/scoring-criteria.ts`
- Service in `src/lib/services/criteria-service.ts`
- Tests mirror source in `tests/unit/` and `tests/e2e/`

**New Files to Create:**

```
src/
├── app/
│   ├── (dashboard)/strategy/scoring-criteria/page.tsx
│   └── api/scoring-criteria/
│       ├── route.ts
│       └── [id]/
│           ├── route.ts
│           └── reorder/route.ts
├── components/scoring/
│   ├── criteria-list.tsx
│   ├── criteria-set-card.tsx
│   ├── criteria-set-form.tsx
│   ├── criterion-card.tsx
│   ├── criterion-form.tsx
│   ├── sortable-criterion-list.tsx
│   └── index.ts
├── hooks/
│   └── use-scoring-criteria.ts
└── lib/
    ├── services/criteria-service.ts
    └── validations/scoring-criteria.ts

tests/
├── unit/
│   ├── api/scoring-criteria.test.ts
│   ├── services/criteria-service.test.ts
│   └── validations/scoring-criteria.test.ts
└── e2e/
    └── scoring-criteria.spec.ts
```

### Testing Strategy

**Unit Tests:**

- Service CRUD operations
- Versioning logic
- Validation schemas (points range, operator-value consistency)
- Metric/operator validation

**E2E Tests:**

- Full criteria creation flow
- Edit and version creation
- Drag-drop reordering
- Delete with confirmation

### References

- [Source: epics.md#Story-4.3] - Epic requirements and acceptance criteria
- [Source: src/lib/db/schema.ts:460-481] - criteriaVersions table schema
- [Source: src/lib/db/schema.ts:435-445] - CriterionRule interface
- [Source: src/lib/db/schema.ts:400-431] - CRITERION_METRICS and CRITERION_OPERATORS
- [Source: src/lib/calculations/scoring-engine.ts] - Existing scoring engine
- [Source: 4-1-asset-class-management.md#Dev-Notes] - Inline editing patterns
- [Source: 4-2-allocation-range-configuration.md#Dev-Notes] - Validation warning patterns
- [Source: architecture.md#Implementation-Patterns] - Code organization
- [Source: project-context.md] - Critical implementation rules

### Previous Story Intelligence

**From Story 4.1 (Asset Class Management):**

- Inline editing pattern with pencil icon → edit mode
- Enter to save, Escape to cancel
- Delete confirmation dialog pattern
- Toast notifications for CRUD operations
- E2E test pattern in `tests/e2e/strategy.spec.ts`

**From Story 4.2 (Allocation Range Configuration):**

- Validation warning patterns
- `SubclassAllocationWarningBanner` pattern for warnings
- Auto-save on blur for numeric inputs
- Visual feedback with border colors

**Key Patterns to Follow:**

- Use `cn()` for conditional class names
- Use `Loader2` for loading states
- Use `Check` icon for save confirmation
- Use `AlertCircle` for validation errors
- Use standardized API responses from `@/lib/api/responses.ts`
- Use error codes from `@/lib/api/error-codes.ts`
- Use `logger` from `@/lib/telemetry/logger` (never console.log)

### Git Intelligence

**Recent Epic 4 commits:**

```
6c1726d feat(epic-4): implement duplicate name prevention for asset classes (AC-4.1.10)
```

**Files recently touched:**

- `src/lib/services/asset-class-service.ts`
- `src/app/api/asset-classes/route.ts`
- `src/app/api/asset-classes/[id]/route.ts`
- `tests/e2e/strategy.spec.ts`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- **Code Review Fix (2024-12):** Fixed 3 ESLint errors in criteria preview components. Replaced `.toFixed()` with `useNumberFormat()` hook per project i18n standards.
- **Note:** Actual implementation paths differ from story plan:
  - Components at `src/components/criteria/` (not `src/components/scoring/`)
  - API routes at `/api/criteria/` (not `/api/scoring-criteria/`)
  - E2E tests at `tests/e2e/criteria.spec.ts` (not `scoring-criteria.spec.ts`)

### File List

**API Routes:**

- `src/app/api/criteria/route.ts` - GET/POST for criteria sets
- `src/app/api/criteria/[id]/route.ts` - GET/PATCH/DELETE for single criteria set
- `src/app/api/criteria/[id]/copy/route.ts` - POST to copy/clone criteria set

**Components:**

- `src/components/criteria/criteria-list.tsx` - Main list component
- `src/components/criteria/criteria-set-card.tsx` - Card for each criteria set
- `src/components/criteria/criteria-set-form.tsx` - Form for create/edit set
- `src/components/criteria/criterion-card.tsx` - Individual criterion display
- `src/components/criteria/criterion-form.tsx` - Form for add/edit criterion
- `src/components/criteria/sortable-criterion-list.tsx` - Drag-drop reordering
- `src/components/criteria/copy-criteria-dialog.tsx` - Copy/clone dialog
- `src/components/criteria/preview-assets-table.tsx` - Preview scoring results
- `src/components/criteria/preview-impact-modal.tsx` - Impact preview modal
- `src/components/criteria/score-comparison-view.tsx` - Compare criteria sets
- `src/components/criteria/index.ts` - Barrel export

**Services:**

- `src/lib/services/criteria-service.ts` - CRUD operations with versioning
- `src/lib/services/criteria-comparison-service.ts` - Compare criteria sets

**Validations:**

- `src/lib/validations/criteria-schemas.ts` - Zod schemas for criteria

**Hooks:**

- `src/hooks/use-criteria.ts` - React Query hooks for criteria

**Calculations:**

- `src/lib/calculations/quick-calc.ts` - Quick score calculations for preview

**Page:**

- `src/app/(dashboard)/criteria/page.tsx` - Criteria management page

**Tests:**

- `tests/unit/services/criteria-service.test.ts` - Service unit tests
- `tests/unit/api/criteria.test.ts` - API route unit tests
- `tests/unit/api/criteria-copy.test.ts` - Copy API tests
- `tests/e2e/criteria.spec.ts` - E2E test suite
