# Story 3.4: Remove Asset from Portfolio

**Status:** done
**Epic:** Epic 3 - Portfolio Core
**Previous Story:** 3.3 Update Asset Holdings

---

## Story

**As a** user
**I want to** remove assets from my portfolio
**So that** I can track only current holdings

---

## Acceptance Criteria

### AC-3.4.1: Delete Button Display

- **Given** I have assets in my portfolio
- **When** I view the portfolio table
- **Then** each asset row displays a delete icon button (trash icon)

### AC-3.4.2: Confirmation Dialog

- **Given** I click the delete icon on an asset row
- **When** the confirmation dialog opens
- **Then** I see:
  - Dialog title: "Remove [TICKER]?"
  - Warning message: "This cannot be undone."
  - Current value being removed displayed
  - "Cancel" and "Remove" buttons (Remove is destructive/red)

### AC-3.4.3: Successful Removal

- **Given** I confirm deletion in the dialog
- **When** the asset is removed
- **Then**:
  - Asset is hard-deleted from database
  - Portfolio table updates immediately (optimistic)
  - Portfolio totals recalculate
  - Allocation percentages recalculate
  - Success toast shows: "Asset removed successfully"

### AC-3.4.4: Cancel Removal

- **Given** I am viewing the confirmation dialog
- **When** I click "Cancel" or press Escape
- **Then** dialog closes and asset remains unchanged

### AC-3.4.5: Error Handling

- **Given** I confirm deletion
- **When** the deletion fails (network error, etc.)
- **Then**:
  - Asset remains in the table (rollback)
  - Error toast shows: "Failed to remove asset. Please try again."

### AC-3.4.6: Multi-tenant Isolation

- **Given** I attempt to delete an asset
- **When** the API processes the request
- **Then** verification ensures the asset belongs to a portfolio I own

---

## Technical Notes

### Existing Infrastructure

The following components are **already implemented** and can be reused:

| Component         | Location                                               | Purpose                                                                 |
| ----------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| Portfolio service | `src/lib/services/portfolio-service.ts`                | Base service with asset functions (addAsset, updateAsset, getAssetById) |
| Portfolio table   | `src/components/portfolio/portfolio-table.tsx`         | Asset table with inline editing                                         |
| Asset API route   | `src/app/api/assets/[id]/route.ts`                     | PATCH handler for updates (extend with DELETE)                          |
| Asset summary     | `src/components/portfolio/portfolio-asset-summary.tsx` | Portfolio totals calculation                                            |
| Database schema   | `src/lib/db/schema.ts`                                 | portfolioAssets table                                                   |
| Auth middleware   | `src/middleware.ts`                                    | Protected route verification                                            |
| decimal.js config | `src/lib/calculations/decimal-config.ts`               | Financial precision configuration                                       |
| AlertDialog       | shadcn/ui                                              | Confirmation dialog pattern                                             |
| sonner            | Toast notifications                                    | Already used for asset operations                                       |

### What Needs to Be Built

#### 1. Delete Asset API Route (`src/app/api/assets/[id]/route.ts`)

Extend existing route with DELETE handler:

- DELETE handler: Remove asset from database
- Use withAuth middleware
- Verify asset ownership via portfolio -> user chain
- Return 200 on success
- Return 404 if asset not found or doesn't belong to user

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (userId) => {
    const { id } = await params;
    await removeAsset(userId, id);
    return NextResponse.json({ success: true });
  });
}
```

#### 2. Portfolio Service Extension (`src/lib/services/portfolio-service.ts`)

Add removeAsset function:

```typescript
export async function removeAsset(userId: string, assetId: string): Promise<void>;
```

Implementation notes:

- Verify asset belongs to user's portfolio (reuse getAssetById pattern)
- Hard delete from portfolioAssets table
- Throw NotFoundError if asset not found or doesn't belong to user

#### 3. Delete Asset Confirmation Dialog (`src/components/portfolio/delete-asset-dialog.tsx`)

Create confirmation dialog component:

- Props: asset (symbol, value), open, onOpenChange, onConfirm
- Uses shadcn/ui AlertDialog
- Shows asset symbol and current value
- Destructive confirm button (red styling)
- Loading state during deletion

#### 4. useDeleteAsset Hook (`src/hooks/use-delete-asset.ts`)

React hook for asset deletion:

```typescript
export function useDeleteAsset() {
  return useMutation({
    mutationFn: deleteAssetApi,
    onMutate: async (assetId) => {
      // Optimistic: store snapshot, remove from display
    },
    onError: (err, assetId, context) => {
      // Rollback: restore asset
      // Show error toast
    },
    onSettled: () => {
      // Invalidate and refetch
    },
  });
}
```

#### 5. Update Portfolio Table (`src/components/portfolio/portfolio-table.tsx`)

Add delete button and dialog integration:

- Add DropdownMenu with "Delete" option or standalone trash icon
- Integrate DeleteAssetDialog
- Pass delete handler from useDeleteAsset hook
- Trigger portfolio summary recalculation after removal

### Database Migration

No migration needed - using existing portfolioAssets table with DELETE cascade already configured.

---

## Tasks

### [x] Task 1: Add removeAsset Service Function (AC: 3.4.3, 3.4.6)

**File:** `src/lib/services/portfolio-service.ts`

- Implement `removeAsset(userId, assetId)` function
- Verify asset ownership through portfolio -> user relationship
- Hard delete from portfolioAssets table
- Throw AssetNotFoundError if asset not found or doesn't belong to user

### [x] Task 2: Add DELETE Handler to Asset API Route (AC: 3.4.3, 3.4.5)

**File:** `src/app/api/assets/[id]/route.ts`

- Add DELETE handler to existing route
- Use withAuth middleware
- Call removeAsset service function
- Return proper error responses (404)
- Return 200 with `{ success: true }` on success

### [x] Task 3: Create Delete Asset Confirmation Dialog (AC: 3.4.1, 3.4.2, 3.4.4)

**File:** `src/components/portfolio/delete-asset-dialog.tsx`

- Create AlertDialog-based confirmation component
- Props: asset ({ symbol, value, currency }), open, onOpenChange, onConfirm, isLoading
- Display asset symbol in title: "Remove [TICKER]?"
- Display warning: "This cannot be undone."
- Display current value being removed
- Cancel button (outline/secondary)
- Remove button (destructive/red)
- Handle Escape key to close

### [x] Task 4: Create useDeleteAsset Hook (AC: 3.4.3, 3.4.5)

**File:** `src/hooks/use-delete-asset.ts`

- React Query mutation hook for asset deletion
- Optimistic removal from cached data
- Error rollback with toast notification
- Cache invalidation on success
- Success toast: "Asset removed successfully"
- Error toast: "Failed to remove asset. Please try again."

### [x] Task 5: Update Portfolio Table with Delete Action (AC: 3.4.1, 3.4.2)

**File:** `src/components/portfolio/portfolio-table.tsx`

- Add trash icon button to each asset row (or DropdownMenu item)
- Integrate DeleteAssetDialog component
- Track which asset is being deleted (selectedAssetForDeletion state)
- Integrate useDeleteAsset hook
- Ensure portfolio summary recalculates after removal

### [x] Task 6: Create Unit Tests (AC: All)

**Files:** `tests/unit/services/portfolio-asset.test.ts`

Test cases:

- removeAsset successfully deletes asset
- removeAsset throws NotFoundError for invalid asset ID
- removeAsset throws NotFoundError for asset belonging to different user
- removeAsset verifies ownership through portfolio chain

### [x] Task 7: Create E2E Tests (AC: All)

**File:** `tests/e2e/portfolio.spec.ts` (extend existing)

Test cases:

- Delete button is visible on asset row
- Clicking delete opens confirmation dialog
- Confirmation dialog shows asset symbol and value
- Cancel closes dialog without removing asset
- Confirm removes asset and updates table
- Portfolio summary updates after removal
- Error state shows toast and preserves asset

### [x] Task 8: Run Verification

- `pnpm lint` - 0 errors (3 unrelated warnings)
- `pnpm build` - successful build
- `pnpm test` - 507 tests passed

---

## Dependencies

- Story 3.3: Update Asset Holdings (provides asset API infrastructure) - **COMPLETE**
- Story 3.2: Add Asset to Portfolio (provides asset infrastructure) - **COMPLETE**
- Story 3.1: Create Portfolio (provides portfolio infrastructure) - **COMPLETE**
- Story 1.3: Authentication System (provides JWT infrastructure) - **COMPLETE**

---

## Dev Notes

### Destructive Action UX Pattern

Per UX spec and tech spec AC-3.4:

- Confirmation required before deletion
- Show what is being deleted (asset symbol + value)
- Use destructive button styling (red)
- Immediate action after confirmation (no second confirmation)

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#AC-3.4]

### Multi-tenant Isolation

All asset queries MUST verify ownership through the portfolio chain:

```typescript
// First verify asset belongs to user's portfolio
const asset = await getAssetById(userId, assetId);
// getAssetById already throws NotFoundError if not owned by user

// Then perform deletion
await db.delete(portfolioAssets).where(eq(portfolioAssets.id, assetId));
```

[Source: docs/architecture.md#Security-Architecture]

### Optimistic Delete Pattern

Follow React Query optimistic delete pattern:

1. Save current asset list before mutation
2. Remove asset from UI immediately (optimistic)
3. On success: invalidate queries to sync
4. On error: rollback to saved list, show toast

[Source: docs/architecture.md#React-Query-Pattern]

### Investment History Preservation

Per tech spec decision D3.4: "Portfolio deletion cascades to assets but preserves investments"

- When asset is deleted, investment records are preserved (asset_id becomes null)
- Investment history retains the symbol for historical reference
- This is already configured in schema via foreign key constraints

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Decision-Log]

### Learnings from Previous Story

**From Story 3-3-update-asset-holdings (Status: done)**

**Patterns to Reuse:**

- Asset service pattern at `src/lib/services/portfolio-service.ts` - extend with removeAsset function
- Asset API route pattern at `src/app/api/assets/[id]/route.ts` - add DELETE handler
- useUpdateAsset hook pattern at `src/hooks/use-update-asset.ts` - follow for useDeleteAsset
- Test patterns at `tests/unit/services/portfolio-asset.test.ts` - extend for delete tests
- E2E patterns at `tests/e2e/portfolio.spec.ts` - extend for delete tests

**New Infrastructure Available from Story 3.3:**

- Asset API route at `/api/assets/[id]` with PATCH handler - add DELETE to same file
- AssetNotFoundError custom error class pattern
- Optimistic update with rollback pattern in useUpdateAsset
- EditableCell component demonstrates inline action pattern

**Technical Decisions from Story 3.3:**

- sonner for toast notifications (use same pattern)
- router.refresh() for data refresh after mutations
- Verify asset ownership through getAssetById helper

**Files Created in Story 3.3 (use as references):**

- `src/app/api/assets/[id]/route.ts` - Extend with DELETE handler
- `src/hooks/use-update-asset.ts` - Follow pattern for useDeleteAsset
- `tests/unit/services/portfolio-asset.test.ts` - Extend for delete tests
- `tests/e2e/portfolio.spec.ts` - Extend for delete tests

**Review Notes from Story 3.3:**

- All acceptance criteria passed review
- No unresolved action items
- Advisory: Consider explicit performance tests (applies here too)
- Advisory: Test fixtures for E2E would improve test isolation

[Source: docs/sprint-artifacts/3-3-update-asset-holdings.md#Dev-Agent-Record]

### Project Structure Notes

Per tech spec alignment:

- DELETE handler: `src/app/api/assets/[id]/route.ts` (extend existing)
- Delete dialog component: `src/components/portfolio/delete-asset-dialog.tsx`
- Delete hook: `src/hooks/use-delete-asset.ts`
- Service extension: `src/lib/services/portfolio-service.ts`

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#AC-3.4]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#Services-and-Modules]
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#APIs-and-Interfaces]
- [Source: docs/epics.md#Story-3.4]
- [Source: docs/architecture.md#Security-Architecture]
- [Source: docs/architecture.md#React-Query-Pattern]
- [Source: docs/sprint-artifacts/3-3-update-asset-holdings.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/3-4-remove-asset-from-portfolio.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Followed patterns from Story 3.3 for useDeleteAsset hook structure
- Extended existing asset API route with DELETE handler
- Used shadcn/ui AlertDialog for confirmation dialog

### Completion Notes List

- All 8 tasks completed successfully
- All acceptance criteria implemented and tested
- Service function with multi-tenant isolation
- DELETE API endpoint with proper error handling
- Confirmation dialog with destructive UX pattern
- useDeleteAsset hook with toast notifications
- Portfolio table updated with trash icon delete buttons
- 4 unit tests added to existing test file
- 8 E2E test cases added to portfolio.spec.ts
- All 507 unit tests pass
- Build successful

### File List

**New Files:**

- src/components/portfolio/delete-asset-dialog.tsx
- src/hooks/use-delete-asset.ts
- src/components/ui/alert-dialog.tsx (shadcn)

**Modified Files:**

- src/lib/services/portfolio-service.ts (added removeAsset function)
- src/app/api/assets/[id]/route.ts (added DELETE handler)
- src/components/portfolio/portfolio-table.tsx (added delete button and dialog integration)
- tests/unit/services/portfolio-asset.test.ts (added removeAsset tests)
- tests/e2e/portfolio.spec.ts (added delete asset E2E tests)

---

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Review Date:** 2025-12-03
**Outcome:** ✅ APPROVE

### Acceptance Criteria Validation

| AC       | Description            | Status  | Evidence                                                                                                 |
| -------- | ---------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| AC-3.4.1 | Delete Button Display  | ✅ PASS | `portfolio-table.tsx:149-160` - Trash2 icon button with `data-testid={delete-${asset.symbol}}`           |
| AC-3.4.2 | Confirmation Dialog    | ✅ PASS | `delete-asset-dialog.tsx:59-77` - AlertDialog with title, warning, value display, Cancel/Remove buttons  |
| AC-3.4.3 | Successful Removal     | ✅ PASS | `portfolio-service.ts:391-404` hard delete, `use-delete-asset.ts:82-83` success toast + router.refresh() |
| AC-3.4.4 | Cancel Removal         | ✅ PASS | `delete-asset-dialog.tsx:69` Cancel button, AlertDialog handles Escape key natively                      |
| AC-3.4.5 | Error Handling         | ✅ PASS | `use-delete-asset.ts:76-77` error toast "Failed to remove asset. Please try again."                      |
| AC-3.4.6 | Multi-tenant Isolation | ✅ PASS | `portfolio-service.ts:396` calls getAssetById which verifies ownership through portfolio chain           |

### Task Validation

| Task   | Description                  | Status  | Evidence                                          |
| ------ | ---------------------------- | ------- | ------------------------------------------------- |
| Task 1 | removeAsset Service Function | ✅ PASS | `portfolio-service.ts:391-404`                    |
| Task 2 | DELETE Handler               | ✅ PASS | `route.ts:142-172`                                |
| Task 3 | Delete Confirmation Dialog   | ✅ PASS | `delete-asset-dialog.tsx` (82 lines)              |
| Task 4 | useDeleteAsset Hook          | ✅ PASS | `use-delete-asset.ts` (98 lines)                  |
| Task 5 | Portfolio Table Integration  | ✅ PASS | `portfolio-table.tsx:149-160,181-216,261-267`     |
| Task 6 | Unit Tests                   | ✅ PASS | `portfolio-asset.test.ts:469-504` (4 tests)       |
| Task 7 | E2E Tests                    | ✅ PASS | `portfolio.spec.ts:727-875` (4 test blocks)       |
| Task 8 | Verification                 | ✅ PASS | lint 0 errors, build successful, 507 tests passed |

### Code Quality Assessment

**Strengths:**

- Implementation follows established patterns from Story 3.3
- Consistent error handling with proper TypeScript types
- Multi-tenant isolation properly enforced via getAssetById ownership check
- Destructive action pattern correctly implemented (confirmation, red styling, clear warning)
- Comprehensive test coverage (unit + E2E)

**Observations:**

- No issues found
- Code is clean, well-documented, and follows project conventions

### Recommendation

Story 3.4 is approved and ready to move to DONE status.

---

## Change Log

| Date       | Change                                                     | Author              |
| ---------- | ---------------------------------------------------------- | ------------------- |
| 2025-12-03 | Story drafted                                              | SM Agent            |
| 2025-12-03 | Story context generated, marked ready-for-dev              | SM Agent            |
| 2025-12-03 | Implementation complete, all tasks done, marked for review | Dev Agent           |
| 2025-12-03 | Code review completed, APPROVED                            | Code Reviewer Agent |
