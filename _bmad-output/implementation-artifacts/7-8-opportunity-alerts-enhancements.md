# Story 7.8: Opportunity Alerts Enhancements

Status: ready-for-dev

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
**Then** I see an "Alerts" link with unread count badge
**And** clicking the link navigates to `/alerts` page

### AC-7.8.3: Automatic Cleanup of Old Dismissed Pairs

**Given** the system has dismissed opportunity pairs older than 90 days
**When** the overnight job runs
**Then** old dismissed pairs are automatically deleted
**And** this allows those opportunity pairs to be re-detected if still relevant
**And** cleanup actions are logged for audit

## Tasks / Subtasks

### Task 1: Implement "Dismiss All in Group" Action (AC: 7.8.1)

**Goal:** Add bulk dismiss functionality to grouped alerts.

- [ ] 1.1: Create `POST /api/alerts/bulk-dismiss` endpoint accepting array of alert IDs
- [ ] 1.2: Add `dismissMultipleAlerts()` method to AlertService
- [ ] 1.3: Record dismissed pairs for all opportunity alerts in batch
- [ ] 1.4: Add "Dismiss All" button to group header in `alerts-list-client.tsx`
- [ ] 1.5: Show confirmation dialog before bulk dismiss
- [ ] 1.6: Display success toast with count of dismissed alerts
- [ ] 1.7: Add loading state during bulk operation

### Task 2: Add Sidebar Navigation Link (AC: 7.8.2)

**Goal:** Make alerts page discoverable via sidebar navigation.

- [ ] 2.1: Locate sidebar navigation component (likely `src/components/layout/sidebar.tsx` or similar)
- [ ] 2.2: Add "Alerts" nav item with Bell icon
- [ ] 2.3: Position appropriately in navigation hierarchy (after Portfolio, before Settings)
- [ ] 2.4: Add unread alert count badge using `useAlertCount` hook or similar
- [ ] 2.5: Highlight when on `/alerts` route
- [ ] 2.6: Ensure mobile responsive behavior matches other nav items

### Task 3: Implement Cleanup Job for Old Dismissed Pairs (AC: 7.8.3)

**Goal:** Prevent dismissed_opportunity_pairs table from growing indefinitely.

- [ ] 3.1: Review existing `cleanupOldPairs()` method in DismissedPairsService
- [ ] 3.2: Integrate cleanup into overnight job (`overnight-scoring.ts`)
- [ ] 3.3: Add structured logging for cleanup operations (pairs deleted, duration)
- [ ] 3.4: Make retention period configurable (default 90 days)
- [ ] 3.5: Add unit test for cleanup logic

### Task 4: Unit Tests

- [ ] 4.1: Test bulk dismiss endpoint (success, partial failure, validation)
- [ ] 4.2: Test `dismissMultipleAlerts()` service method
- [ ] 4.3: Test cleanup job integration
- [ ] 4.4: Test sidebar navigation badge updates

### Task 5: E2E Tests

- [ ] 5.1: Test bulk dismiss flow via UI
- [ ] 5.2: Test navigation from sidebar to alerts page
- [ ] 5.3: Test unread count badge accuracy

### Task 6: Verification

- [ ] 6.1: Run `pnpm exec tsc --noEmit` (no type errors)
- [ ] 6.2: Run `pnpm lint` (no linting errors)
- [ ] 6.3: Run `pnpm test` (all new tests pass)
- [ ] 6.4: Run `pnpm build` (production build succeeds)
- [ ] 6.5: Run `pnpm security:check-rls` (verify RLS policies)

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

Add cleanup step after opportunity detection in `overnight-scoring.ts`:

```typescript
// Step 5c: Cleanup old dismissed pairs
await dismissedPairsService.cleanupOldPairs(90);
logger.info("Cleaned up old dismissed pairs", { retentionDays: 90 });
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
