# Story 7.8: Opportunity Alerts Enhancements

Status: done

## Story

As a **user**,
I want **enhanced alert management features including bulk dismiss, sidebar navigation, and automatic cleanup of old dismissed pairs**,
so that **I can efficiently manage my opportunity alerts and maintain a clean system**.

## Background

This story addresses deferred items from Story 7.6 (Opportunity Alerts and Preferences). The core functionality is complete, and these enhancements improve usability and system maintenance.

## Acceptance Criteria

### AC-7.8.1: Dismiss All in Group Action

**Given** I am viewing the alerts page with grouped opportunity alerts
**When** I click "Dismiss All" on an asset class group header
**Then** all alerts in that group are dismissed
**And** dismissed pairs are recorded for each alert to prevent re-alerting
**And** a success toast shows "X alerts dismissed"

### AC-7.8.2: Sidebar Navigation to Alerts

**Given** I am on any dashboard page
**When** I look at the sidebar navigation
**Then** I see an "Alerts" link in the navigation menu
**And** clicking the link navigates to `/alerts` page

> **Note:** Unread count badge deferred - existing alert dropdown in header provides real-time unread count visibility.

### AC-7.8.3: Automatic Cleanup of Old Dismissed Pairs

**Given** the system has dismissed opportunity pairs older than 90 days
**When** the overnight job runs
**Then** old dismissed pairs are automatically deleted
**And** this allows those opportunity pairs to be re-detected if still relevant
**And** cleanup actions are logged for audit

## Tasks / Subtasks

### Task 1: Implement "Dismiss All in Group" Action (AC: 7.8.1)

**Goal:** Add bulk dismiss functionality to grouped alerts.

- [x] 1.1: Create `POST /api/alerts/bulk-dismiss` endpoint accepting array of alert IDs
- [x] 1.2: Add `dismissMultipleAlerts()` method to AlertService
- [x] 1.3: Record dismissed pairs for all opportunity alerts in batch
- [x] 1.4: Add "Dismiss All" button to group header in `alerts-list-client.tsx`
- [x] 1.5: Show confirmation dialog before bulk dismiss
- [x] 1.6: Display success toast with count of dismissed alerts
- [x] 1.7: Add loading state during bulk operation

### Task 2: Add Sidebar Navigation Link (AC: 7.8.2)

**Goal:** Make alerts page discoverable via sidebar navigation.

- [x] 2.1: Locate sidebar navigation component (`src/components/dashboard/app-sidebar.tsx`)
- [x] 2.2: Add "Alerts" nav item with Bell icon
- [x] 2.3: Position appropriately in navigation hierarchy (after Criteria, before History)
- [x] 2.4: Note: Unread count badge deferred (existing alert dropdown provides this)
- [x] 2.5: Highlight when on `/alerts` route (handled by existing nav logic)
- [x] 2.6: Mobile responsive behavior matches other nav items

### Task 3: Implement Cleanup Job for Old Dismissed Pairs (AC: 7.8.3)

**Goal:** Prevent dismissed_opportunity_pairs table from growing indefinitely.

- [x] 3.1: Review existing `cleanupOldPairs()` method in DismissedPairsService
- [x] 3.2: Integrate cleanup into overnight job (`overnight-scoring.ts`)
- [x] 3.3: Add structured logging for cleanup operations (pairs deleted, duration)
- [x] 3.4: Retention period configured via CLEANUP_AGE_DAYS constant (default 90 days)
- [x] 3.5: Add unit test for cleanup logic

### Task 4: Unit Tests

- [x] 4.1: Test bulk dismiss endpoint (success, partial failure, validation)
- [x] 4.2: Test `dismissMultipleAlerts()` service method
- [x] 4.3: Test cleanup job integration (added cleanup step to overnight job)
- [x] 4.4: Note: Sidebar badge not implemented (deferred)

### Task 5: E2E Tests

- [x] 5.1: Test bulk dismiss flow via UI
- [x] 5.2: Test navigation from sidebar to alerts page
- [x] 5.3: Note: Unread count badge deferred

### Task 6: Verification

- [x] 6.1: Run `pnpm exec tsc --noEmit` (no type errors)
- [x] 6.2: Run `pnpm lint` (no linting errors)
- [x] 6.3: Run `pnpm test` (all new tests pass)
- [x] 6.4: Run `pnpm build` (production build succeeds)
- [x] 6.5: Note: No new tables added, RLS check not required

## Dev Notes

### Existing Infrastructure

From Story 7.6:

- `DismissedPairsService` with `cleanupOldPairs(retentionDays: number)` method already exists
- Alert grouping by asset class already implemented in `alerts-list-client.tsx`
- Individual alert dismiss with dismissed pair recording works

### Bulk Dismiss API Design

```typescript
// POST /api/alerts/bulk-dismiss
interface BulkDismissRequest {
  alertIds: string[];
}

interface BulkDismissResponse {
  success: boolean;
  dismissedCount: number;
  errors?: Array<{ alertId: string; error: string }>;
}
```

### Sidebar Badge Implementation

Consider using existing patterns from the codebase for:

- Badge styling (likely from shadcn/ui)
- Polling or real-time updates for unread count
- Accessibility considerations

### Overnight Job Integration

Cleanup step integrated after drift alert detection in `overnight-scoring.ts` as step 5d:

```typescript
// Step 5d: Cleanup old dismissed pairs (step name: "cleanup-dismissed-pairs")
await dismissedPairsService.cleanupOldPairs(90);
logger.info("Cleaned up old dismissed pairs", { retentionDays: 90, deletedCount });
```

### Critical Implementation Rules

From `project-context.md`:

- **NEVER use console.log/error** - Use `logger` from `@/lib/telemetry/logger`
- **Run `pnpm lint` and `pnpm test`** before committing
- **Decimal.js** for any numeric calculations
- **Run `pnpm security:check-rls`** for table changes

### References

- [Source: `_bmad-output/implementation-artifacts/7-6-opportunity-alerts-and-preferences.md`] - Parent story
- [Source: `src/lib/services/dismissed-pairs-service.ts`] - Existing cleanup method
- [Source: `src/components/alerts/alerts-list-client.tsx`] - Alert grouping UI
- [Source: `src/lib/inngest/functions/overnight-scoring.ts`] - Overnight job
