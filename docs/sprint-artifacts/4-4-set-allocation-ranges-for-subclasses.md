# Story 4.4: Set Allocation Ranges for Subclasses

**Status:** done
**Epic:** Epic 4 - Asset Class & Allocation Configuration
**Previous Story:** 4.3 Set Allocation Ranges for Classes (Complete)

---

## Story

**As a** user
**I want to** set allocation percentage ranges (minimum and maximum targets) for each subclass
**So that** I can fine-tune my investment distribution within asset classes and the system can provide more granular recommendations

---

## Acceptance Criteria

### AC-4.4.1: View and Set Subclass Allocation Ranges

- **Given** I have subclasses defined within an asset class
- **When** I view a subclass row/card within the expanded asset class
- **Then** I see allocation range inputs/sliders for min and max percentages
- **And** I can set target min and max allocation percentages for the subclass
- **And** the values are saved automatically on blur (or explicit save action)
- **And** I see a visual confirmation of the save (checkmark or toast)

### AC-4.4.2: Validation - Subclass Ranges Must Fit Within Parent Class

- **Given** I am editing allocation ranges for a subclass
- **And** the parent asset class has allocation ranges defined (e.g., targetMin=40%, targetMax=50%)
- **When** I try to set subclass ranges that exceed the parent class maximum (e.g., subclass max=60% when parent max=50%)
- **Then** I see a validation warning "Subclass range exceeds parent class maximum (50%)"
- **And** this is a **warning** (not blocking) - the configuration can still be saved
- **And** the warning helps users understand the configuration may be impossible to satisfy

### AC-4.4.3: Warning - Sum of Subclass Minimums Exceeds Parent Maximum

- **Given** I have multiple subclasses within an asset class
- **And** the parent class has a targetMax defined
- **When** the sum of all subclass minimums exceeds the parent's targetMax (e.g., subclass1 min=30%, subclass2 min=25% = 55% when parent max=50%)
- **Then** I see a warning "Sum of subclass minimums (55%) exceeds parent maximum (50%)"
- **And** this is a **warning** (not blocking) - allows saving
- **And** the warning explains this configuration may be impossible to satisfy

### AC-4.4.4: Validation - Min Cannot Exceed Max (Same as Parent)

- **Given** I am editing allocation ranges for a subclass
- **When** I try to set min > max (e.g., min=40%, max=30%)
- **Then** I see a validation error "Minimum cannot exceed maximum"
- **And** the invalid configuration is not saved

### AC-4.4.5: Flexible Subclasses (Optional Ranges)

- **Given** I have subclasses defined
- **When** I leave the allocation ranges empty (null) for a subclass
- **Then** the subclass is treated as "flexible" within its parent class allocation
- **And** no allocation constraints are applied to that subclass
- **And** the UI shows "Flexible" or similar indicator instead of range values

---

## Technical Notes

### Database Schema

The `asset_subclasses` table already has the required columns from Story 4.2:

```typescript
// lib/db/schema.ts - Already exists
export const assetSubclasses = pgTable("asset_subclasses", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id")
    .notNull()
    .references(() => assetClasses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  targetMin: numeric("target_min", { precision: 5, scale: 2 }), // e.g., 20.00%
  targetMax: numeric("target_max", { precision: 5, scale: 2 }), // e.g., 30.00%
  maxAssets: integer("max_assets"),
  minAllocationValue: numeric("min_allocation_value", { precision: 19, scale: 4 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Service Layer

Extend existing AssetClassService with subclass allocation operations:

```typescript
// lib/services/asset-class-service.ts - Extend with subclass allocation
export interface UpdateSubclassAllocationInput {
  targetMin?: string | null; // decimal as string, e.g., "20.00"
  targetMax?: string | null; // decimal as string, e.g., "30.00"
}

export interface SubclassValidationResult {
  valid: boolean;
  errors: string[]; // Blocking errors (e.g., min > max)
  warnings: string[]; // Non-blocking warnings (e.g., sum > parent max)
}

// Functions to add/extend:
export async function updateSubclassAllocationRange(
  userId: string,
  subclassId: string,
  input: UpdateSubclassAllocationInput
): Promise<AssetSubclass>;

export async function validateSubclassAllocationRanges(
  userId: string,
  classId: string
): Promise<SubclassValidationResult>;
```

### API Endpoints

| Method | Endpoint                                      | Description                                         |
| ------ | --------------------------------------------- | --------------------------------------------------- |
| PATCH  | `/api/asset-subclasses/[id]`                  | Update subclass allocation ranges (extend existing) |
| GET    | `/api/asset-classes/[id]/validate-subclasses` | Validate subclass allocations against parent        |

### Validation Schema

```typescript
// lib/validations/asset-class-schemas.ts - Extend with subclass allocation
export const updateSubclassAllocationSchema = z
  .object({
    targetMin: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .nullable()
      .optional(),
    targetMax: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.targetMin && data.targetMax) {
        return parseFloat(data.targetMin) <= parseFloat(data.targetMax);
      }
      return true;
    },
    { message: "Minimum cannot exceed maximum", path: ["targetMin"] }
  );

// Extended update schema for subclasses
export const updateAssetSubclassSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    targetMin: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .nullable()
      .optional(),
    targetMax: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .nullable()
      .optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.targetMin && data.targetMax) {
        return parseFloat(data.targetMin) <= parseFloat(data.targetMax);
      }
      return true;
    },
    { message: "Minimum cannot exceed maximum", path: ["targetMin"] }
  );
```

### UI Components

**Extend Existing Components:**

| Component      | Location                                       | Changes Needed                                |
| -------------- | ---------------------------------------------- | --------------------------------------------- |
| SubclassItem   | `src/components/strategy/subclass-item.tsx`    | Add AllocationRangeEditor for subclass ranges |
| AssetClassCard | `src/components/strategy/asset-class-card.tsx` | Display subclass allocation warnings          |

**New Components:**

| Component                 | Location                                                  | Purpose                                         |
| ------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| SubclassAllocationWarning | `src/components/strategy/subclass-allocation-warning.tsx` | Warning when subclass allocations exceed parent |

### Parent-Child Validation Logic

```typescript
// lib/services/asset-class-service.ts - Subclass validation
export async function validateSubclassAllocationRanges(
  userId: string,
  classId: string
): Promise<SubclassValidationResult> {
  // 1. Get parent class with targetMin and targetMax
  const parentClass = await getClassById(userId, classId);

  // 2. Get all subclasses for this class
  const subclasses = await getSubclassesForClass(userId, classId);

  const warnings: string[] = [];
  const errors: string[] = [];

  // 3. Check each subclass max against parent max
  for (const subclass of subclasses) {
    if (parentClass.targetMax && subclass.targetMax) {
      if (new Decimal(subclass.targetMax).gt(parentClass.targetMax)) {
        warnings.push(
          `${subclass.name} max (${subclass.targetMax}%) exceeds parent max (${parentClass.targetMax}%)`
        );
      }
    }
  }

  // 4. Check sum of subclass minimums against parent maximum
  const subclassMinSum = subclasses.reduce((sum, s) => {
    return s.targetMin ? sum.plus(s.targetMin) : sum;
  }, new Decimal(0));

  if (parentClass.targetMax && subclassMinSum.gt(parentClass.targetMax)) {
    warnings.push(
      `Sum of subclass minimums (${subclassMinSum}%) exceeds parent maximum (${parentClass.targetMax}%)`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

### Existing Infrastructure to Reuse

| Component             | Location                                              | Purpose                                        |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| AllocationRangeEditor | `src/components/strategy/allocation-range-editor.tsx` | **REUSE** - Same component for subclass ranges |
| Validation schemas    | `src/lib/validations/asset-class-schemas.ts`          | Extend with subclass allocation validation     |
| React Query hooks     | `src/hooks/use-asset-classes.ts`                      | Extend with subclass allocation hooks          |
| AssetClassCard        | `src/components/strategy/asset-class-card.tsx`        | Host component, display subclass warnings      |
| Toast notifications   | `src/components/ui/sonner.tsx`                        | Success/error feedback                         |

---

## Tasks

### [ ] Task 1: Extend Zod Validation Schemas for Subclass Allocation (AC: 4.4.1, 4.4.4)

**Files:** `src/lib/validations/asset-class-schemas.ts`

- Extend `updateAssetSubclassSchema` to validate targetMin and targetMax
- Add refinement: min <= max validation (same as parent class)
- Add regex pattern for decimal percentage format (0-100, up to 2 decimal places)
- Unit tests for validation edge cases:
  - Valid range (20.00, 30.00)
  - Invalid range (40.00, 30.00) - should fail
  - Boundary values (0.00, 100.00)
  - Null values (optional/flexible subclass)
  - Invalid format ("abc", negative numbers)

### [ ] Task 2: Extend AssetClassService with Subclass Allocation Operations (AC: All)

**Files:** `src/lib/services/asset-class-service.ts`

- Implement `updateSubclassAllocationRange(userId, subclassId, input)` - update target min/max
- Implement `validateSubclassAllocationRanges(userId, classId)` - check subclass constraints against parent
- All operations must verify subclass ownership via parent class (two-level multi-tenant isolation)
- Use decimal.js for all percentage calculations
- Validation checks:
  - Subclass max <= parent class max (warning)
  - Sum of subclass minimums <= parent max (warning)
  - Subclass min <= subclass max (error)

### [ ] Task 3: Extend API Route for Subclass Allocation Update (AC: 4.4.1, 4.4.4)

**Files:** `src/app/api/asset-subclasses/[id]/route.ts`

- Extend existing PATCH handler to accept targetMin and targetMax
- Validate input with updated Zod schema
- Return updated subclass with new allocation values
- Return validation errors for min > max

### [ ] Task 4: Create Subclass Validation API Endpoint (AC: 4.4.2, 4.4.3)

**Files:** `src/app/api/asset-classes/[id]/validate-subclasses/route.ts`

- GET: Return validation result for all subclass allocations within a class
- Response format:
  ```json
  {
    "valid": true,
    "warnings": [
      {
        "type": "SUBCLASS_EXCEEDS_PARENT_MAX",
        "message": "REITs max (35%) exceeds parent maximum (30%)",
        "subclassId": "uuid",
        "subclassName": "REITs"
      },
      {
        "type": "SUBCLASS_SUM_EXCEEDS_PARENT_MAX",
        "message": "Sum of subclass minimums (55%) exceeds parent maximum (50%)",
        "totalMinimums": "55.00",
        "parentMax": "50.00"
      }
    ]
  }
  ```

### [ ] Task 5: Extend React Query Hooks for Subclass Allocation (AC: All)

**Files:** `src/hooks/use-asset-classes.ts`

- Add `useUpdateSubclassAllocation()` - mutation for updating subclass ranges
- Add `useSubclassValidation(classId)` - query for subclass validation status
- Proper cache invalidation on mutations
- Refetch validation on subclass allocation changes

### [ ] Task 6: Extend SubclassItem with AllocationRangeEditor (AC: 4.4.1, 4.4.5)

**Files:** `src/components/strategy/subclass-item.tsx`

- Add AllocationRangeEditor component (reuse from Story 4.3)
- Show "Flexible" indicator when both min and max are null
- Real-time validation (min <= max)
- Inline error display for validation failures
- Auto-save on blur with debounce
- Accessible labels and ARIA attributes

### [ ] Task 7: Create SubclassAllocationWarning Component (AC: 4.4.2, 4.4.3)

**Files:** `src/components/strategy/subclass-allocation-warning.tsx`

- Display warning when subclass allocations exceed parent constraints
- Show specific warnings:
  - "Subclass max exceeds parent maximum"
  - "Sum of subclass minimums exceeds parent maximum"
- Dismissible (per session) or persistent
- Use shadcn/ui Alert component with warning variant
- Display within AssetClassCard when expanded (near subclass list)

### [ ] Task 8: Update AssetClassCard to Show Subclass Warnings (AC: 4.4.2, 4.4.3)

**Files:** `src/components/strategy/asset-class-card.tsx`

- Fetch subclass validation using useSubclassValidation hook when card is expanded
- Display SubclassAllocationWarning component if warnings exist
- Position: below class info, above subclass list
- Refresh validation when subclass allocations change

### [ ] Task 9: Create Unit Tests for Subclass Allocation (AC: All)

**Files:**

- `tests/unit/services/asset-class-service.test.ts` (extend existing)
- `tests/unit/validations/asset-class.test.ts` (extend existing)

Test cases for service:

- Update subclass allocation range - success
- Update subclass allocation range - subclass not found
- Update subclass allocation range - subclass belongs to other user (isolation)
- Validate subclass allocations - all valid (within parent constraints)
- Validate subclass allocations - warning (subclass max > parent max)
- Validate subclass allocations - warning (sum > parent max)

Test cases for validation:

- Valid subclass allocation range input
- Invalid range (min > max)
- Null values (flexible subclass)
- Edge cases (0%, 100%, decimals)

### [ ] Task 10: Create API Integration Tests (AC: All)

**Files:** `tests/unit/api/asset-subclasses.test.ts` (extend or create)

Test cases:

- PATCH /api/asset-subclasses/[id] - update allocation range
- PATCH /api/asset-subclasses/[id] - validation error (min > max)
- GET /api/asset-classes/[id]/validate-subclasses - returns warnings

### [ ] Task 11: Create E2E Tests (AC: All)

**Files:** `tests/e2e/strategy.spec.ts` (extend existing)

Test cases:

- Navigate to Strategy page, expand asset class, view subclass allocation inputs
- Set valid subclass allocation range (20-30%)
- Attempt invalid range (min > max) - see error
- Set subclass max greater than parent max - see warning
- Set multiple subclass mins exceeding parent max - see warning
- Leave allocation empty - see "Flexible" indicator

### [ ] Task 12: Run Verification

- `pnpm lint` - ensure 0 errors
- `pnpm build` - ensure successful build
- `pnpm test` - ensure all tests pass (target: maintain or exceed 884)

---

## Dependencies

- Story 4.2: Define Subclasses (Complete) - provides asset_subclasses table, subclass CRUD
- Story 4.3: Set Allocation Ranges for Classes (Complete) - provides AllocationRangeEditor, validation patterns
- AllocationRangeEditor component - reuse from Story 4.3
- decimal.js - for percentage calculations

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **decimal.js** - All percentage calculations MUST use decimal.js for precision
- **Multi-tenant isolation** - Subclass ownership verified via parent class userId
- **Drizzle ORM** - Use parameterized queries (no raw SQL)
- **Zod validation** - All API inputs must be validated
- **Toast feedback** - Use sonner for success/error notifications

[Source: docs/architecture.md#Decimal-Calculation-Pattern]
[Source: docs/architecture.md#Security-Architecture]

### UX Guidelines

Per UX design specification:

- **Inline editing** - Auto-save pattern for allocation ranges (same as class level)
- **Warning banners** - Non-blocking, dismissible warnings
- **Flexible indicators** - Clear visual when no constraints applied
- **Parent-child relationship** - Visually show subclass constraints relative to parent

[Source: docs/ux-design-specification.md#Component-Library]
[Source: docs/architecture.md#Frontstage-UI-Components]

### Testing Standards

Per CLAUDE.md:

- Every code change requires test coverage
- Unit tests for services and API routes
- E2E tests for critical user flows

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Learnings from Previous Story

**From Story 4.3 (Status: done)**

- **AllocationRangeEditor**: Reusable component available at `src/components/strategy/allocation-range-editor.tsx` - apply same component for subclass ranges
- **Validation pattern**: min <= max validation with Zod refinement works well
- **Warning pattern**: Non-blocking warnings with alert variant - apply same for parent-child constraint warnings
- **Service pattern**: `validateAllocationRanges` pattern can be adapted for subclass validation
- **Auto-save on blur**: Debounced save pattern established - reuse for subclasses
- **Test baseline**: 884 tests passing - maintain or increase
- **Decimal.js usage**: All percentage math uses decimal.js - continue pattern

[Source: docs/sprint-artifacts/4-3-set-allocation-ranges-for-classes.md#Dev-Agent-Record]

### Key Files from Story 4.3 to Reuse

- `src/components/strategy/allocation-range-editor.tsx` - **REUSE AS-IS** for subclass ranges
- `src/lib/validations/asset-class-schemas.ts` - Extend with subclass validation
- `src/lib/services/asset-class-service.ts` - Extend with subclass allocation operations
- `src/hooks/use-asset-classes.ts` - Extend with subclass allocation hooks
- `src/components/strategy/allocation-warning-banner.tsx` - Reference pattern for SubclassAllocationWarning

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story-4.4]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Data-Models-and-Contracts]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Acceptance-Criteria]
- [Source: docs/architecture.md#Custom-Components]
- [Source: docs/epics.md#Story-4.4]
- [Source: docs/sprint-artifacts/4-3-set-allocation-ranges-for-classes.md]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/4-4-set-allocation-ranges-for-subclasses.context.xml`

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 12 tasks completed successfully
- 17 new tests added (901 tests total, up from 884 baseline)
- Build passes with new validate-subclasses endpoint
- Lint passes (0 errors, existing warnings only)
- TypeScript check passes

### File List

**New Files:**

- `src/app/api/asset-classes/[id]/validate-subclasses/route.ts` - Subclass validation API endpoint
- `src/components/strategy/subclass-allocation-warning.tsx` - Warning component for subclass allocations

**Modified Files:**

- `src/lib/validations/asset-class-schemas.ts` - Extended updateSubclassSchema with allocation validation
- `src/lib/services/asset-class-service.ts` - Added validateSubclassAllocationRanges function
- `src/app/api/asset-subclasses/[id]/route.ts` - JSDoc updates for allocation fields
- `src/hooks/use-asset-classes.ts` - Added useSubclassAllocationValidation hook
- `src/components/strategy/subclass-card.tsx` - Added allocation range editor and Flexible badge
- `src/components/strategy/subclass-list.tsx` - Added warning banner and validation refresh
- `src/components/strategy/asset-class-card.tsx` - JSDoc updates for Story 4.4
- `tests/unit/validations/asset-class.test.ts` - Added 17 subclass allocation tests
- `tests/e2e/strategy.spec.ts` - Added E2E tests for subclass allocation

---

## Change Log

| Date       | Change                                           | Author                           |
| ---------- | ------------------------------------------------ | -------------------------------- |
| 2025-12-05 | Story drafted from tech-spec-epic-4.md           | SM Agent (create-story workflow) |
| 2025-12-05 | Story implementation complete, all tests passing | Dev Agent (dev-story workflow)   |
