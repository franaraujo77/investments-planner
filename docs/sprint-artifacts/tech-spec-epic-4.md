# Epic Technical Specification: Asset Class & Allocation Configuration

Date: 2025-12-04
Author: Bmad
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 delivers the foundational asset classification and allocation configuration capabilities that enable users to define their investment strategy structure. This epic builds directly on Epic 3's portfolio infrastructure to add hierarchical asset organization (classes and subclasses) with configurable allocation ranges, asset count limits, and minimum allocation values.

**Why This Matters:** The Investments Planner's core value proposition is "Configuration over hardcoding" - users define their investment philosophy through allocation rules, and the system executes with mathematical precision. Epic 4 provides the configuration layer that drives all future recommendation calculations (Epic 7).

**Key Capabilities Delivered:**

- Hierarchical asset classification (classes → subclasses → assets)
- Target allocation ranges per class/subclass (e.g., "Fixed Income: 40-50%")
- Asset count limits to maintain focused portfolios
- Minimum allocation values to prevent trivial recommendations

**Dependencies:**

- **Epic 3 Complete:** Portfolio CRUD, asset holdings, allocation percentage view
- **Database Schema:** Extends existing schema with asset_classes and asset_subclasses tables

## Objectives and Scope

**In Scope:**

- Create, read, update, delete (CRUD) operations for asset classes
- Create, read, update, delete operations for subclasses within classes
- Set and validate allocation percentage ranges for classes
- Set and validate allocation percentage ranges for subclasses (constrained by parent)
- Configure maximum asset count limits per class/subclass
- Configure minimum allocation value thresholds per class/subclass
- Visual representation of allocation configuration (AllocationGauge component)
- Validation logic to prevent impossible configurations

**Out of Scope:**

- Scoring criteria configuration (Epic 5)
- Recommendation generation algorithms (Epic 7)
- External data provider integration (Epic 6)
- Historical allocation tracking (deferred)

**Functional Requirements Covered:**
| FR | Description |
|----|-------------|
| FR18 | Users can define asset classes (e.g., Fixed Income, Variable Income, Crypto) |
| FR19 | Users can define subclasses within asset classes |
| FR20 | Users can set allocation percentage ranges for each asset class |
| FR21 | Users can set allocation percentage ranges for each subclass |
| FR22 | Users can set maximum asset count limits per class/subclass |
| FR23 | Users can set minimum allocation values for specific classes/subclasses |

## System Architecture Alignment

**Architecture Pattern Alignment:**

| Decision                            | Epic 4 Implementation                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| **Database (Drizzle + PostgreSQL)** | New `asset_classes` and `asset_subclasses` tables with `numeric` types for ranges |
| **API Routes (Next.js App Router)** | `/api/asset-classes/` and `/api/asset-subclasses/` routes                         |
| **Validation (Zod)**                | Schema validation for allocation ranges and limits                                |
| **UI Components (shadcn/ui)**       | CriteriaBlock-style configuration, AllocationGauge display                        |
| **Service Pattern**                 | `AssetClassService` and `AllocationService` in `lib/services/`                    |
| **Multi-tenant Isolation**          | All queries scoped by `userId`                                                    |

**Components Referenced from Architecture:**

```
lib/
├── db/
│   └── schema.ts                    # Extended with asset_classes, asset_subclasses
├── services/
│   ├── asset-class-service.ts       # NEW: Class/subclass CRUD
│   └── allocation-service.ts        # EXTENDED: Allocation range validation
├── calculations/
│   └── allocation.ts                # EXTENDED: Range validation logic
└── validations/
    └── allocation-schemas.ts        # NEW: Zod schemas for allocation config

components/
├── fintech/
│   ├── allocation-gauge.tsx         # EXISTS: Display current vs target
│   └── criteria-block.tsx           # REUSED: Notion-style editing pattern
└── forms/
    └── allocation-config-form.tsx   # NEW: Range configuration UI
```

**UX Alignment:**

- Uses CriteriaBlock (Notion-style) pattern from UX spec for class/subclass management
- AllocationGauge component shows current position within target range
- Drag-and-drop reordering for class priority
- Inline editing with auto-save pattern

## Detailed Design

### Services and Modules

| Module                          | Responsibility                                   | Key Methods                                                                                                                          |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **AssetClassService**           | CRUD operations for asset classes and subclasses | `createClass()`, `updateClass()`, `deleteClass()`, `getClassesForUser()`, `createSubclass()`, `updateSubclass()`, `deleteSubclass()` |
| **AllocationValidationService** | Validate allocation configurations               | `validateClassRanges()`, `validateSubclassConstraints()`, `checkMinimumAllocations()`, `detectImpossibleConfigs()`                   |
| **AllocationCalculator**        | Calculate current vs target allocations          | `calculateCurrentAllocation()`, `calculateGapToTarget()`, `isWithinRange()`                                                          |

**Service Layer Design:**

```typescript
// lib/services/asset-class-service.ts
export class AssetClassService {
  // Class operations
  async createClass(userId: string, data: CreateAssetClassInput): Promise<AssetClass>;
  async updateClass(
    userId: string,
    classId: string,
    data: UpdateAssetClassInput
  ): Promise<AssetClass>;
  async deleteClass(userId: string, classId: string): Promise<void>;
  async getClassesForUser(userId: string): Promise<AssetClassWithSubclasses[]>;
  async reorderClasses(userId: string, orderedIds: string[]): Promise<void>;

  // Subclass operations
  async createSubclass(
    userId: string,
    classId: string,
    data: CreateSubclassInput
  ): Promise<AssetSubclass>;
  async updateSubclass(
    userId: string,
    subclassId: string,
    data: UpdateSubclassInput
  ): Promise<AssetSubclass>;
  async deleteSubclass(userId: string, subclassId: string): Promise<void>;
  async reorderSubclasses(userId: string, classId: string, orderedIds: string[]): Promise<void>;
}

// lib/services/allocation-validation-service.ts
export class AllocationValidationService {
  validateClassRanges(classes: AssetClass[]): ValidationResult;
  validateSubclassConstraints(parent: AssetClass, subclasses: AssetSubclass[]): ValidationResult;
  detectImpossibleConfigs(classes: AssetClassWithSubclasses[]): ConfigurationWarning[];
}
```

### Data Models and Contracts

**Database Schema (Drizzle):**

```typescript
// lib/db/schema.ts - New tables for Epic 4

export const assetClasses = pgTable("asset_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 10 }), // Emoji icon (optional)
  targetMin: numeric("target_min", { precision: 5, scale: 2 }), // e.g., 40.00%
  targetMax: numeric("target_max", { precision: 5, scale: 2 }), // e.g., 50.00%
  maxAssets: integer("max_assets"), // null = no limit
  minAllocationValue: numeric("min_allocation_value", { precision: 19, scale: 4 }), // in base currency
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assetSubclasses = pgTable("asset_subclasses", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id")
    .notNull()
    .references(() => assetClasses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
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
export const assetSubclassesClassIdIdx = index("asset_subclasses_class_id_idx").on(
  assetSubclasses.classId
);
```

**TypeScript Contracts:**

```typescript
// types/asset-class.ts
export interface AssetClass {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  targetMin?: string; // decimal as string
  targetMax?: string;
  maxAssets?: number;
  minAllocationValue?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetSubclass {
  id: string;
  classId: string;
  name: string;
  targetMin?: string;
  targetMax?: string;
  maxAssets?: number;
  minAllocationValue?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetClassWithSubclasses extends AssetClass {
  subclasses: AssetSubclass[];
  currentAllocation?: string; // Computed from portfolio
  assetCount?: number; // Computed from portfolio
}

// API Input types
export interface CreateAssetClassInput {
  name: string;
  icon?: string;
  targetMin?: string;
  targetMax?: string;
  maxAssets?: number;
  minAllocationValue?: string;
}

export interface UpdateAssetClassInput extends Partial<CreateAssetClassInput> {
  sortOrder?: number;
}
```

### APIs and Interfaces

**Asset Class Endpoints:**

| Method | Endpoint                     | Description               | Request Body               | Response                               |
| ------ | ---------------------------- | ------------------------- | -------------------------- | -------------------------------------- |
| GET    | `/api/asset-classes`         | List all classes for user | -                          | `{ data: AssetClassWithSubclasses[] }` |
| POST   | `/api/asset-classes`         | Create new class          | `CreateAssetClassInput`    | `{ data: AssetClass }`                 |
| PATCH  | `/api/asset-classes/[id]`    | Update class              | `UpdateAssetClassInput`    | `{ data: AssetClass }`                 |
| DELETE | `/api/asset-classes/[id]`    | Delete class              | -                          | `{ success: true }`                    |
| POST   | `/api/asset-classes/reorder` | Reorder classes           | `{ orderedIds: string[] }` | `{ success: true }`                    |

**Subclass Endpoints:**

| Method | Endpoint                                     | Description        | Request Body               | Response                  |
| ------ | -------------------------------------------- | ------------------ | -------------------------- | ------------------------- |
| POST   | `/api/asset-classes/[id]/subclasses`         | Create subclass    | `CreateSubclassInput`      | `{ data: AssetSubclass }` |
| PATCH  | `/api/asset-subclasses/[id]`                 | Update subclass    | `UpdateSubclassInput`      | `{ data: AssetSubclass }` |
| DELETE | `/api/asset-subclasses/[id]`                 | Delete subclass    | -                          | `{ success: true }`       |
| POST   | `/api/asset-classes/[id]/subclasses/reorder` | Reorder subclasses | `{ orderedIds: string[] }` | `{ success: true }`       |

**Validation Endpoint:**

| Method | Endpoint                      | Description             | Response                                               |
| ------ | ----------------------------- | ----------------------- | ------------------------------------------------------ |
| GET    | `/api/asset-classes/validate` | Validate current config | `{ valid: boolean, warnings: ConfigurationWarning[] }` |

**Request/Response Examples:**

```typescript
// POST /api/asset-classes
// Request:
{
  "name": "Fixed Income",
  "icon": "💰",
  "targetMin": "40.00",
  "targetMax": "50.00",
  "maxAssets": 10,
  "minAllocationValue": "100.00"
}

// Response:
{
  "data": {
    "id": "uuid-xxx",
    "userId": "user-uuid",
    "name": "Fixed Income",
    "icon": "💰",
    "targetMin": "40.00",
    "targetMax": "50.00",
    "maxAssets": 10,
    "minAllocationValue": "100.00",
    "sortOrder": 0,
    "createdAt": "2025-12-04T...",
    "updatedAt": "2025-12-04T..."
  }
}

// GET /api/asset-classes/validate
// Response (with warning):
{
  "valid": false,
  "warnings": [
    {
      "type": "MINIMUM_SUM_EXCEEDS_100",
      "message": "Total of all class minimums (120%) exceeds 100%",
      "affectedClasses": ["class-1", "class-2", "class-3"]
    }
  ]
}
```

### Workflows and Sequencing

**User Flow: Define Asset Classes (Story 4.1)**

```
1. User navigates to Settings → Asset Classes
2. Page loads existing classes (GET /api/asset-classes)
3. User clicks "Add Asset Class"
4. Modal/inline form appears with:
   - Name (required)
   - Icon selector (optional)
5. User saves → POST /api/asset-classes
6. New class appears in list with empty subclasses
7. User can drag to reorder → POST /api/asset-classes/reorder
```

**User Flow: Set Allocation Ranges (Story 4.3)**

```
1. User expands asset class card
2. Range sliders appear for Min/Max allocation
3. User adjusts sliders:
   - Min slider constrained: 0% ≤ min ≤ max
   - Max slider constrained: min ≤ max ≤ 100%
4. Visual feedback shows:
   - Current allocation position
   - Warning if sum of minimums > 100%
5. Auto-save on change → PATCH /api/asset-classes/[id]
6. Background validation runs → GET /api/asset-classes/validate
7. Warning toast if configuration is impossible
```

**Validation Rules:**

| Rule                       | Description                                           | Error Message                             |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| Min ≤ Max                  | Target min cannot exceed target max                   | "Minimum cannot exceed maximum"           |
| Sum of Mins ≤ 100%         | Total minimums cannot exceed 100%                     | "Total minimums exceed 100%"              |
| Subclass fits Parent       | Subclass ranges must fit within parent class          | "Subclass range exceeds parent range"     |
| Subclass Mins ≤ Parent Max | Sum of subclass minimums cannot exceed parent maximum | "Subclass minimums exceed parent maximum" |

**Sequence Diagram: Create Class with Subclasses**

```
User          UI              API            Service          Database
  │            │               │                │                 │
  │─Create Class─►│            │                │                 │
  │            │─POST /asset-classes─►          │                 │
  │            │               │─createClass()─►│                 │
  │            │               │                │─INSERT asset_classes─►
  │            │               │◄──AssetClass───│◄────────────────│
  │            │◄──201 Created─│                │                 │
  │◄─Show Class│               │                │                 │
  │            │               │                │                 │
  │─Add Subclass─►             │                │                 │
  │            │─POST ../subclasses─►           │                 │
  │            │               │─createSubclass()─►               │
  │            │               │                │─INSERT asset_subclasses─►
  │            │               │◄─AssetSubclass─│◄────────────────│
  │            │◄──201 Created─│                │                 │
  │◄─Show Updated│             │                │                 │
```

## Non-Functional Requirements

### Performance

| Metric                | Target  | Rationale                              |
| --------------------- | ------- | -------------------------------------- |
| Class list load       | < 200ms | Simple query with user_id index        |
| Create/Update class   | < 300ms | Single row insert/update               |
| Validation check      | < 100ms | In-memory calculation on small dataset |
| Drag-and-drop reorder | < 500ms | Batch update sort_order values         |

**Optimization Notes:**

- Asset classes per user limited to 10 (PRD spec) - no pagination needed
- Subclasses per class limited to 10 - flat list is efficient
- Validation runs client-side first, server-side second for responsiveness
- Use optimistic updates for drag-and-drop with rollback on error

### Security

| Control                 | Implementation                                    |
| ----------------------- | ------------------------------------------------- |
| **Authentication**      | All endpoints require valid JWT                   |
| **Authorization**       | All queries scoped by `userId` from session       |
| **Input Validation**    | Zod schemas validate all inputs                   |
| **SQL Injection**       | Drizzle parameterized queries                     |
| **Cross-tenant Access** | Service layer enforces `userId` on all operations |

**Validation Schema Example:**

```typescript
// lib/validations/asset-class-schemas.ts
export const createAssetClassSchema = z
  .object({
    name: z.string().min(1).max(50),
    icon: z.string().max(10).optional(),
    targetMin: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .optional(),
    targetMax: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .optional(),
    maxAssets: z.number().int().min(0).max(100).optional(),
    minAllocationValue: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.targetMin && data.targetMax) {
        return parseFloat(data.targetMin) <= parseFloat(data.targetMax);
      }
      return true;
    },
    { message: "Minimum cannot exceed maximum" }
  );
```

### Reliability/Availability

| Requirement           | Implementation                                            |
| --------------------- | --------------------------------------------------------- |
| **Data Durability**   | All changes persisted to PostgreSQL immediately           |
| **Cascade Delete**    | Deleting class removes all subclasses (ON DELETE CASCADE) |
| **Orphan Prevention** | Subclasses require valid classId foreign key              |
| **Concurrent Edits**  | Optimistic locking via updatedAt timestamp                |
| **Error Recovery**    | Auto-retry on transient database errors                   |

### Observability

| Signal      | Implementation                                                 |
| ----------- | -------------------------------------------------------------- |
| **Logging** | Info: class created/updated/deleted; Warn: validation warnings |
| **Metrics** | Count of classes per user, validation error frequency          |
| **Tracing** | Span for each API request with userId attribute                |

**Log Examples:**

```typescript
logger.info("Asset class created", { userId, classId, className });
logger.warn("Allocation validation warning", { userId, warningType, details });
logger.error("Asset class operation failed", { userId, operation, error: error.message });
```

## Dependencies and Integrations

### Internal Dependencies

| Dependency                  | Type         | Description                                                |
| --------------------------- | ------------ | ---------------------------------------------------------- |
| **Epic 1 (Foundation)**     | ✅ Completed | Auth system, base schema, API patterns                     |
| **Epic 2 (Onboarding)**     | ✅ Completed | User profile with base currency                            |
| **Epic 3 (Portfolio Core)** | ✅ Completed | Portfolios table, assets table for allocation calculations |
| **Users table**             | Schema       | `asset_classes.userId` references `users.id`               |
| **AllocationService**       | Service      | Existing service extended for range validation             |

### External Dependencies

| Dependency           | Type      | Description                                       |
| -------------------- | --------- | ------------------------------------------------- |
| **shadcn/ui Slider** | Component | Range slider for min/max allocation input         |
| **shadcn/ui DnD**    | Component | Drag-and-drop for reordering (via @dnd-kit)       |
| **decimal.js**       | Library   | Precision calculations for allocation percentages |

### Database Migration Dependencies

```sql
-- Migration: 0004_add_asset_classes
-- Depends on: 0001_users table

CREATE TABLE asset_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(10),
  target_min NUMERIC(5,2),
  target_max NUMERIC(5,2),
  max_assets INTEGER,
  min_allocation_value NUMERIC(19,4),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE asset_subclasses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES asset_classes(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  target_min NUMERIC(5,2),
  target_max NUMERIC(5,2),
  max_assets INTEGER,
  min_allocation_value NUMERIC(19,4),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX asset_classes_user_id_idx ON asset_classes(user_id);
CREATE INDEX asset_subclasses_class_id_idx ON asset_subclasses(class_id);
```

## Acceptance Criteria (Authoritative)

### Story 4.1: Define Asset Classes

| #        | Criterion                                                                                                                   | Type       |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| AC-4.1.1 | Given I am authenticated, when I navigate to Asset Classes, then I see a list of my existing asset classes (or empty state) | Functional |
| AC-4.1.2 | Given I click "Add Asset Class", when I enter a name and save, then the class appears in my list                            | Functional |
| AC-4.1.3 | Given I have an asset class, when I edit its name, then the change is saved                                                 | Functional |
| AC-4.1.4 | Given I have an asset class with no assets, when I delete it, then it is removed from my list                               | Functional |
| AC-4.1.5 | Given I have an asset class with assets, when I try to delete it, then I see a warning about orphaned assets                | Functional |

### Story 4.2: Define Subclasses

| #        | Criterion                                                                                                | Type       |
| -------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| AC-4.2.1 | Given I have an asset class, when I click "Add Subclass", then I can create a subclass within that class | Functional |
| AC-4.2.2 | Given I have a subclass, when I edit its name, then the change is saved                                  | Functional |
| AC-4.2.3 | Given I have a subclass, when I delete it, then it is removed from the parent class                      | Functional |
| AC-4.2.4 | Given I delete a parent class, then all its subclasses are also deleted                                  | Functional |

### Story 4.3: Set Allocation Ranges for Classes

| #        | Criterion                                                                                   | Type       |
| -------- | ------------------------------------------------------------------------------------------- | ---------- |
| AC-4.3.1 | Given I have an asset class, when I set target min and max percentages, then they are saved | Functional |
| AC-4.3.2 | Given I set min > max, then I see a validation error and cannot save                        | Validation |
| AC-4.3.3 | Given the sum of all class minimums > 100%, then I see a warning (not blocking)             | Validation |
| AC-4.3.4 | Given I view my classes, then I see an AllocationGauge showing current vs target            | Visual     |

### Story 4.4: Set Allocation Ranges for Subclasses

| #        | Criterion                                                                                  | Type       |
| -------- | ------------------------------------------------------------------------------------------ | ---------- |
| AC-4.4.1 | Given I have a subclass, when I set target min and max percentages, then they are saved    | Functional |
| AC-4.4.2 | Given I set subclass ranges exceeding parent class ranges, then I see a validation warning | Validation |
| AC-4.4.3 | Given sum of subclass minimums > parent class maximum, then I see a validation warning     | Validation |

### Story 4.5: Set Asset Count Limits

| #        | Criterion                                                                      | Type       |
| -------- | ------------------------------------------------------------------------------ | ---------- |
| AC-4.5.1 | Given I have a class/subclass, when I set a max assets limit, then it is saved | Functional |
| AC-4.5.2 | Given max assets = 5 and I have 6 assets, then I see a warning indicator       | Visual     |
| AC-4.5.3 | Given max assets is not set, then there is no limit enforced                   | Functional |

### Story 4.6: Set Minimum Allocation Values

| #        | Criterion                                                                                                | Type       |
| -------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| AC-4.6.1 | Given I have a class/subclass, when I set a minimum allocation value in base currency, then it is saved  | Functional |
| AC-4.6.2 | Given minimum = $100, then recommendations below $100 for this class are suppressed (Epic 7 integration) | Functional |
| AC-4.6.3 | Given minimum is not set, then any positive amount is valid                                              | Functional |

## Traceability Mapping

| FR   | Story | Acceptance Criteria                              | API Endpoints                                                 | Components                             |
| ---- | ----- | ------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------- |
| FR18 | 4.1   | AC-4.1.1, AC-4.1.2, AC-4.1.3, AC-4.1.4, AC-4.1.5 | GET/POST/PATCH/DELETE `/api/asset-classes`                    | AssetClassList, AssetClassForm         |
| FR19 | 4.2   | AC-4.2.1, AC-4.2.2, AC-4.2.3, AC-4.2.4           | GET/POST/PATCH/DELETE `/api/asset-subclasses`                 | SubclassList, SubclassForm             |
| FR20 | 4.3   | AC-4.3.1, AC-4.3.2, AC-4.3.3, AC-4.3.4           | PATCH `/api/asset-classes/[id]`                               | AllocationRangeSlider, AllocationGauge |
| FR21 | 4.4   | AC-4.4.1, AC-4.4.2, AC-4.4.3                     | PATCH `/api/asset-subclasses/[id]`                            | AllocationRangeSlider                  |
| FR22 | 4.5   | AC-4.5.1, AC-4.5.2, AC-4.5.3                     | PATCH `/api/asset-classes/[id]`, `/api/asset-subclasses/[id]` | AssetCountInput                        |
| FR23 | 4.6   | AC-4.6.1, AC-4.6.2, AC-4.6.3                     | PATCH `/api/asset-classes/[id]`, `/api/asset-subclasses/[id]` | MinAllocationInput                     |

## Risks, Assumptions, Open Questions

### Risks

| Risk                                 | Probability | Impact | Mitigation                                                         |
| ------------------------------------ | ----------- | ------ | ------------------------------------------------------------------ |
| Impossible allocation configurations | Medium      | Low    | Real-time validation with warnings; allow saving but warn          |
| Orphaned assets on class delete      | Medium      | Medium | Require reassignment or explicit "delete with assets" confirmation |
| User confusion with nested ranges    | Low         | Medium | Clear UI with parent constraint visualization                      |

### Assumptions

| #   | Assumption                                                           | Validation                                        |
| --- | -------------------------------------------------------------------- | ------------------------------------------------- |
| A1  | Users will have ≤10 asset classes                                    | PRD specifies this limit; enforced in API         |
| A2  | Subclasses are optional                                              | PRD confirms classes can exist without subclasses |
| A3  | Allocation ranges are percentages (0-100%)                           | Confirmed in PRD                                  |
| A4  | Base currency from user profile applies to minimum allocation values | PRD specifies base currency is set in Epic 2      |

### Open Questions

| #   | Question                                                         | Owner | Status                                                         |
| --- | ---------------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| Q1  | Should we prevent saving impossible configurations or just warn? | PM    | **Resolved**: Warn but allow save (user flexibility)           |
| Q2  | Default allocation ranges for new classes?                       | PM    | **Resolved**: No defaults; user must configure                 |
| Q3  | Can classes be shared across portfolios?                         | PM    | **Resolved**: Yes, classes are user-level, not portfolio-level |

## Test Strategy Summary

### Unit Tests

| Test Area                   | Location                                                    | Coverage Target        |
| --------------------------- | ----------------------------------------------------------- | ---------------------- |
| AssetClassService           | `tests/unit/services/asset-class-service.test.ts`           | 100% of public methods |
| AllocationValidationService | `tests/unit/services/allocation-validation-service.test.ts` | All validation rules   |
| Zod Schemas                 | `tests/unit/validations/asset-class-schemas.test.ts`        | All edge cases         |
| AllocationCalculator        | `tests/unit/calculations/allocation.test.ts`                | Range calculations     |

### Integration Tests

| Test Area              | Location                                              | Scenarios                               |
| ---------------------- | ----------------------------------------------------- | --------------------------------------- |
| Asset Class API        | `tests/integration/api/asset-classes.test.ts`         | CRUD operations, reordering, validation |
| Subclass API           | `tests/integration/api/asset-subclasses.test.ts`      | CRUD operations, cascade delete         |
| Cross-tenant isolation | `tests/integration/security/tenant-isolation.test.ts` | User A cannot access User B classes     |

### E2E Tests

| Test Area                | Location                              | Scenarios                                       |
| ------------------------ | ------------------------------------- | ----------------------------------------------- |
| Asset Class Management   | `tests/e2e/asset-classes.spec.ts`     | Create, edit, delete, reorder classes           |
| Allocation Configuration | `tests/e2e/allocation-config.spec.ts` | Set ranges with slider, see validation warnings |
| Full Setup Flow          | `tests/e2e/first-time-setup.spec.ts`  | Complete asset class setup as new user          |

### Test Data Requirements

```typescript
// Test fixtures
const testAssetClasses = [
  { name: "Fixed Income", targetMin: "40.00", targetMax: "50.00" },
  { name: "Variable Income", targetMin: "30.00", targetMax: "40.00" },
  { name: "Crypto", targetMin: "5.00", targetMax: "10.00" },
];

const testSubclasses = [
  { className: "Fixed Income", name: "Government Bonds", targetMin: "20.00", targetMax: "30.00" },
  { className: "Fixed Income", name: "Corporate Bonds", targetMin: "10.00", targetMax: "20.00" },
];

const invalidConfigs = [
  { scenario: "min > max", targetMin: "60.00", targetMax: "40.00" },
  { scenario: "sum > 100%", classes: [{ min: "50" }, { min: "60" }] },
];
```

---

_Technical Specification generated by BMAD Method Epic Tech Context Workflow v1.0_
_Date: 2025-12-04_
_Epic: 4 - Asset Class & Allocation Configuration_
_Author: Bmad_
