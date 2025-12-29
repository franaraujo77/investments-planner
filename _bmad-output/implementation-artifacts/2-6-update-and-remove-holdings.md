# Story 2.6: Update and Remove Holdings

Status: done

## Story

As a **user**,
I want **to update quantities, remove assets, or mark them as ignored**,
so that **I can maintain accurate portfolio data**.

## Acceptance Criteria

1. **AC-2.6.1: Edit Holding Action** - Given I have a holding in my portfolio, When I click "Edit" on the holding row in the drawer, Then I can update the quantity and purchase price

2. **AC-2.6.2: Update Holding Saves** - Given I update a holding's quantity or purchase price, When I save the changes, Then the holding is updated and allocation percentages are recalculated immediately

3. **AC-2.6.3: Remove Holding Action** - Given I want to remove an asset, When I click "Remove" on the holding row in the drawer, Then I see a confirmation: "Remove [Asset] from portfolio?"

4. **AC-2.6.4: Confirmed Remove Deletes** - Given I confirm the removal in the dialog, Then the holding is deleted from the portfolio and allocation percentages are recalculated

5. **AC-2.6.5: Ignore Holding Action** - Given I want to exclude an asset from calculations without removing it, When I click "Ignore" on the holding row, Then the asset is marked as ignored

6. **AC-2.6.6: Ignored Appearance** - Given an asset is ignored, Then it appears grayed out in the list and is excluded from allocation calculations

7. **AC-2.6.7: Include Holding Action** - Given I have an ignored asset, When I click "Include" on the holding row, Then the asset is included in calculations again

8. **AC-2.6.8: Multi-tenant Isolation** - Given a user attempts to update/remove/toggle an asset, Then the system verifies portfolio ownership before any operation

## Tasks / Subtasks

- [x] Task 1: Implement Edit Holding Modal (AC: 2.6.1, 2.6.2)
  - [x] 1.1 Create `src/components/portfolio/edit-holding-modal.tsx` with quantity and purchasePrice fields
  - [x] 1.2 Use react-hook-form with zodResolver and custom form schema
  - [x] 1.3 Pre-populate form with current holding values
  - [x] 1.4 Submit via PATCH /api/assets/[id] endpoint (already exists)
  - [x] 1.5 Show success toast on save, trigger router.refresh() to update allocations
  - [x] 1.6 Add loading and error states

- [x] Task 2: Create Asset Update API Endpoint (AC: 2.6.2, 2.6.8) - ALREADY EXISTS
  - [x] 2.1 PATCH endpoint at `src/app/api/assets/[id]/route.ts` already exists
  - [x] 2.2 Uses withAuth middleware for authentication
  - [x] 2.3 Validates input with updateAssetSchema from `@/lib/validations/portfolio`
  - [x] 2.4 Calls updateAsset() from portfolio-service
  - [x] 2.5 Returns standardized responses
  - [x] 2.6 Handles AssetNotFoundError with 404

- [x] Task 3: Update Holding Detail Drawer to Enable Edit (AC: 2.6.1)
  - [x] 3.1 Remove "Coming Soon" badge from Edit button in `holding-detail-drawer.tsx`
  - [x] 3.2 Add state for edit modal open/close
  - [x] 3.3 Wire up Edit button to open EditHoldingModal
  - [x] 3.4 Pass current holding data to modal

- [x] Task 4: Verify Remove/Ignore Already Work (AC: 2.6.3-2.6.7) - ALL PRE-EXISTING
  - [x] 4.1 Verify DeleteAssetDialog and useDeleteAsset hook work correctly
  - [x] 4.2 Verify toggleIgnore and useToggleIgnore hook work correctly
  - [x] 4.3 Ensure grayed-out appearance for ignored assets (already in holdings-table.tsx)
  - [x] 4.4 Ensure allocation exclusion for ignored assets (already in portfolio-service.ts)

- [x] Task 5: Unit Tests (AC: all)
  - [x] 5.1 Create `tests/unit/components/edit-holding-modal.test.tsx` (34 tests)
  - [x] 5.2 API endpoint tests already covered by existing tests
  - [x] 5.3 Test validation errors, success cases, and loading states

- [x] Task 6: E2E Tests (AC: all)
  - [x] 6.1 Add E2E tests in `tests/e2e/portfolio.spec.ts` for edit holding flow (14 new tests)
  - [x] 6.2 Test: Edit holding modal opens from drawer
  - [x] 6.3 Test: Update quantity saves and refreshes allocations
  - [x] 6.4 Test: Validation errors display correctly
  - [x] 6.5 Test: Remove and Ignore flows verified

## Dev Notes

### Architecture Patterns (CRITICAL)

- **API Response Format**: Use standardized responses from `@/lib/api/responses.ts`
- **Error Codes**: Use codes from `@/lib/api/error-codes.ts`
- **Form Pattern**: react-hook-form with Zod validation (zodResolver)
- **Toast Notifications**: Use `sonner` (consistent with Stories 2.1-2.5)
- **Financial Calculations**: Use Decimal.js - NEVER native JS arithmetic
- **Logging**: Use `logger` from `@/lib/telemetry/logger` - NEVER console.log/error

### Existing Code to Reuse (DO NOT REINVENT)

**Portfolio Service Functions (src/lib/services/portfolio-service.ts):**

```typescript
// Line 863-899: updateAsset - already implements AC-2.6.2, AC-2.6.8
export async function updateAsset(
  userId: string,
  assetId: string,
  input: UpdateAssetInput
): Promise<PortfolioAsset>;

// Line 912-922: removeAsset - already implements AC-2.6.3, AC-2.6.4
export async function removeAsset(userId: string, assetId: string): Promise<void>;

// Line 938-961: toggleAssetIgnored - already implements AC-2.6.5, AC-2.6.7
export async function toggleAssetIgnored(userId: string, assetId: string): Promise<PortfolioAsset>;
```

**Validation Schema (src/lib/validations/portfolio.ts:269-295):**

```typescript
export const updateAssetSchema = z
  .object({
    quantity: z.string().refine(/* positive */),
    purchasePrice: z.string().refine(/* positive */),
  })
  .refine(/* at least one field required */);
```

**Existing Hooks (src/hooks/):**

- `use-toggle-ignore.ts` - handles toggleIgnore API call, toast, router.refresh()
- `use-delete-asset.ts` - handles removeAsset API call, toast, router.refresh()

**Existing Components:**

- `delete-asset-dialog.tsx` - confirmation dialog for removal (AC-2.6.3)
- `holding-detail-drawer.tsx` - already has Remove and Ignore buttons working

### New Files Required

| File                                                | Purpose                          |
| --------------------------------------------------- | -------------------------------- |
| `src/components/portfolio/edit-holding-modal.tsx`   | Modal for editing quantity/price |
| `tests/unit/components/edit-holding-modal.test.tsx` | Unit tests                       |

**Note:** API endpoint (`/api/assets/[id]`) and API tests already existed from Story 3.3/3.4.

### API Endpoint Specification

**PUT /api/assets/[assetId]**

Request:

```json
{
  "quantity": "150.00000000", // optional, string, positive
  "purchasePrice": "45.5000" // optional, string, positive
}
// At least one field required
```

Success Response (200):

```json
{
  "data": {
    "id": "uuid",
    "portfolioId": "uuid",
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "quantity": "150.00000000",
    "purchasePrice": "45.5000",
    "currency": "USD",
    "isIgnored": false,
    "createdAt": "2025-12-29T...",
    "updatedAt": "2025-12-29T..."
  }
}
```

Error Responses:
| Status | Code | Scenario |
|--------|------|----------|
| 400 | VALIDATION_ERRORS.INVALID_INPUT | Validation failed |
| 401 | AUTH_ERRORS.UNAUTHORIZED | Not authenticated |
| 404 | NOT_FOUND_ERRORS.ASSET_NOT_FOUND | Asset not found or not owned |

### Component Integration Points

**holding-detail-drawer.tsx Changes:**

1. Remove `disabled` prop and "Coming Soon" badge from Edit button (line 227-238)
2. Add `useState` for `isEditModalOpen`
3. Add `EditHoldingModal` component with proper props
4. On success callback: call `router.refresh()` and close drawer

**EditHoldingModal Pattern (follow AddAssetModal):**

```typescript
interface EditHoldingModalProps {
  holding: AssetWithValue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

### Database Constraints

From `src/lib/db/schema.ts:288-312`:

- `quantity`: numeric(19,8) - supports 8 decimal places (crypto satoshis)
- `purchasePrice`: numeric(19,4) - supports 4 decimal places (standard fintech)
- `updatedAt`: automatically set by updateAsset function

### Error Handling Pattern

```typescript
// In API route handler
try {
  const asset = await updateAsset(session.userId, assetId, validatedData);
  return NextResponse.json({ data: asset });
} catch (error) {
  if (error instanceof AssetNotFoundError) {
    return NextResponse.json(
      { error: "Asset not found", code: NOT_FOUND_ERRORS.ASSET_NOT_FOUND },
      { status: 404 }
    );
  }
  const dbError = handleDbError(error, "update asset", { userId: session.userId });
  return databaseError(dbError, "asset");
}
```

### Previous Story Intelligence (from Story 2.5)

**Key Learnings:**

- Modal pattern with trigger prop works well for reusability
- router.refresh() is sufficient for allocation recalculation (no need for manual state)
- Use AssetWithValue type for holding data passed to modals
- Toast notifications with sonner provide good UX feedback
- Validation errors should display inline in form, not just toast

**Code Review Fixes Applied:**

- Use standardized error codes from `@/lib/api/error-codes.ts`
- Add audit logging with logger.info for state changes
- Create comprehensive unit tests for API endpoints

### Testing Standards (MANDATORY)

Per CLAUDE.md and project-context.md:

- Every code change MUST include tests
- Unit tests in `tests/unit/{mirror-src-structure}/`
- Integration tests for API endpoints
- E2E tests for user flows
- Minimum 80% coverage for new code

**Test File Naming:**

- Unit/Integration: `*.test.ts` or `*.test.tsx`
- E2E: `*.spec.ts`

### Security Checklist

- [x] Multi-tenant isolation via userId in updateAsset, removeAsset, toggleAssetIgnored
- [x] Use withAuth middleware in API route (pre-existing in `/api/assets/[id]/route.ts`)
- [x] Validate all inputs server-side with Zod (pre-existing `updateAssetSchema`)
- [x] Log asset updates for audit trail (added `logger.info("Asset updated", ...)` in code review)

### References

- [Source: epics.md#Story 2.6: Update and Remove Holdings] - Original story definition
- [Source: src/lib/services/portfolio-service.ts:863-961] - updateAsset, removeAsset, toggleAssetIgnored functions
- [Source: src/lib/validations/portfolio.ts:269-295] - updateAssetSchema
- [Source: src/components/portfolio/holding-detail-drawer.tsx] - Current drawer with Remove/Ignore
- [Source: src/hooks/use-toggle-ignore.ts] - Toggle ignore hook pattern
- [Source: src/hooks/use-delete-asset.ts] - Delete asset hook pattern
- [Source: Story 2.5 Dev Notes] - Modal and toast patterns
- [Source: project-context.md] - TypeScript, testing, and API response rules

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Implementation was straightforward

### Completion Notes List

1. **API Endpoint Already Existed**: The PATCH endpoint at `/api/assets/[id]` was already fully implemented with proper authentication, validation, and error handling.

2. **Remove/Ignore Functionality Pre-existing**: All AC-2.6.3 through AC-2.6.7 were already implemented in previous stories (Story 3.4 and Story 3.5).

3. **Only New Component Needed**: The EditHoldingModal was the only new component required. It follows the same pattern as AddAssetModal.

4. **Form Schema Differentiation**: Used a component-local Zod schema (`editHoldingFormSchema`) that requires both fields, separate from the API's `updateAssetSchema` which allows partial updates.

5. **Test Coverage**: 34 unit tests + 14 E2E tests added. All 3751 unit tests pass.

### File List

**New Files:**

- `src/components/portfolio/edit-holding-modal.tsx` - Modal for editing quantity/price
- `tests/unit/components/edit-holding-modal.test.tsx` - 34 unit tests

**Modified Files:**

- `src/components/portfolio/holding-detail-drawer.tsx` - Enabled Edit button, added EditHoldingModal
- `tests/e2e/portfolio.spec.ts` - Added 14 E2E tests for Story 2.6

**Pre-existing Files (No Changes Needed):**

- `src/app/api/assets/[id]/route.ts` - PATCH/DELETE endpoints
- `src/app/api/assets/[id]/ignore/route.ts` - Ignore toggle endpoint
- `src/hooks/use-delete-asset.ts` - Delete hook
- `src/hooks/use-toggle-ignore.ts` - Toggle ignore hook
- `src/components/portfolio/delete-asset-dialog.tsx` - Delete confirmation

## Change Log

| Date       | Author          | Change                                                                                                                                                                    |
| ---------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-29 | Claude Opus 4.5 | Story created with full spec                                                                                                                                              |
| 2025-12-29 | Claude Opus 4.5 | Story implemented - all tasks completed                                                                                                                                   |
| 2025-12-29 | Claude Opus 4.5 | Code review fixes: (1) Added audit logging to updateAsset, (2) Made onSuccess prop optional, (3) Fixed documentation contradictions, (4) Added 3 audit logging unit tests |
