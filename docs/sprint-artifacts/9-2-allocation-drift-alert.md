# Story 9.2: Allocation Drift Alert

**Status:** done
**Epic:** Epic 9 - Alerts & Polish
**Previous Story:** 9-1-opportunity-alert-better-asset-exists (Status: review)

---

## Story

**As a** user
**I want** to be alerted when my portfolio allocation drifts outside my configured target ranges
**So that** I can take corrective action through contributions to maintain my investment strategy

---

## Acceptance Criteria

### AC-9.2.1: Drift Alert Triggered When Allocation Exceeds Threshold

- **Given** a user has configured asset classes with target allocation ranges
- **And** the drift threshold is set (default 5%)
- **When** any asset class allocation drifts outside its target range by more than the threshold
- **Then** an allocation drift alert is created in the `alerts` table with:
  - `type` = 'allocation_drift'
  - `userId` matching the portfolio owner
  - `severity` = 'warning'
  - `metadata` containing: assetClassId, assetClassName, currentAllocation, targetMin, targetMax, driftAmount, direction ('over' or 'under')

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.2-Allocation-Drift-Alert]

### AC-9.2.2: Alert Shows Current vs Target Allocation

- **Given** an allocation drift alert is created
- **When** the alert is retrieved
- **Then** it includes:
  - Current allocation percentage
  - Target allocation range (min-max)
  - Drift amount (how much over/under)
  - Direction indicator ('over-allocated' or 'under-allocated')
- **And** the message follows format: "[CLASS_NAME] at [CURRENT]%, target is [MIN]-[MAX]%"

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#AC-9.2.2]

### AC-9.2.3: Alert Categorizes Drift Direction

- **Given** allocation drift is detected
- **When** the drift alert is created
- **Then** if current > targetMax: direction = 'over' with message "Consider not adding to this class"
- **And** if current < targetMin: direction = 'under' with message "Increase contributions here"
- **And** severity is set based on drift magnitude:
  - Warning: drift > threshold but < 2x threshold
  - Critical: drift >= 2x threshold

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#AC-9.2.3]

### AC-9.2.4: Drift Threshold is Configurable

- **Given** a user has `driftThreshold` set in alert_preferences (default 5.00%)
- **When** drift detection runs
- **Then** the user's configured threshold is used for comparison
- **And** drift alert is only created if |currentAllocation - targetEdge| > threshold
- **Where** targetEdge = targetMax (if over) or targetMin (if under)

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#AC-9.2.4]

### AC-9.2.5: Alert Respects User Preferences

- **Given** a user has `driftAlertsEnabled` = false in alert_preferences
- **When** drift detection runs
- **Then** no drift alerts are created for that user
- **And** existing preferences are checked before alert creation

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#AC-9.2.5]

### AC-9.2.6: Alert Auto-Clears When Allocation Returns to Range

- **Given** an allocation drift alert exists for an asset class
- **When** portfolio allocation returns to within the target range
- **Then** the drift alert is automatically dismissed
- **And** `isDismissed` is set to true with `dismissedAt` timestamp

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#AC-9.2.6]

### AC-9.2.7: Drift Alert Deduplication

- **Given** a drift alert already exists for a specific asset class
- **When** drift detection runs again
- **Then** no duplicate alert is created for the same (userId, assetClassId) pair
- **And** existing alert is updated if drift amount changes significantly (>2%)

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#AC-9.2.7]

---

## Technical Notes

### Architecture Alignment

Per architecture document and Epic 9 Tech Spec:

- **Event-Sourced Architecture:** Alert creation should emit events for audit trail (integrate with existing event store)
- **Multi-Tenant Isolation:** All alert queries MUST include userId filter
- **Service Layer Pattern:** Follow existing service architecture (AlertService, AlertPreferencesService patterns)
- **Decimal Precision:** Allocation comparisons use decimal.js for accuracy

[Source: docs/architecture.md#Data-Architecture]
[Source: docs/architecture.md#Security-Architecture]

### Tech Spec Reference

Per Epic 9 Tech Spec:

- **Existing Tables:** `alerts`, `alert_preferences` (created in Story 9.1)
- **AlertService:** Extend with `createDriftAlert` method
- **AlertDetectionService:** Extend with `detectDriftAlerts` method
- **Integration Points:**
  - After price updates in overnight processing
  - After investment confirmation (portfolio changes)

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Technical-Architecture]

### Database Schema (Already Exists from Story 9.1)

```typescript
// alerts table - already exists with DriftAlertMetadata support
export interface DriftAlertMetadata {
  assetClassId: string;
  assetClassName: string;
  currentAllocation: string;
  targetMin: string;
  targetMax: string;
  driftAmount: string;
  direction: "over" | "under";
}

// alert_preferences table - already exists with drift fields
// - driftAlertsEnabled: boolean (default true)
// - driftThreshold: numeric(5,2) (default 5.00%)
```

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Drizzle-Schema-Addition]

### Existing Infrastructure to REUSE

**CRITICAL: Do NOT recreate these existing components:**

1. **AlertService** - `src/lib/services/alert-service.ts` (from Story 9.1)
   - Extend with `createDriftAlert()` method
   - Use existing patterns for deduplication, dismissal

2. **AlertDetectionService** - `src/lib/services/alert-detection-service.ts` (from Story 9.1)
   - Extend with `detectDriftAlerts()` method
   - Follow existing detection patterns

3. **AlertPreferencesService** - `src/lib/services/alert-preferences-service.ts` (from Story 9.1)
   - Already has `isDriftAlertsEnabled()` method
   - Already has `getDriftThreshold()` method

4. **Alerts API Routes** - `src/app/api/alerts/` (from Story 9.1)
   - No new routes needed - drift alerts use same endpoints

5. **Allocation Service** - `src/lib/services/allocation-service.ts`
   - Use for calculating current allocation percentages

6. **Asset Classes Schema** - `src/lib/db/schema.ts`
   - Contains `assetClasses` with `targetMin`, `targetMax` fields

7. **Logger** - `src/lib/telemetry/logger.ts`
   - Use for structured logging (not console)

8. **API Responses** - `src/lib/api/responses.ts`
   - Use standardized response formats

[Source: docs/sprint-artifacts/9-1-opportunity-alert-better-asset-exists.md#Existing-Infrastructure-to-REUSE]
[Source: docs/sprint-artifacts/9-1-opportunity-alert-better-asset-exists.md#File-List]

### Learnings from Previous Story

**From Story 9-1-opportunity-alert-better-asset-exists (Status: review)**

- **AlertService Pattern:** Service at `src/lib/services/alert-service.ts` (594 lines) - use same patterns for drift alerts
- **Deduplication Key:** Use `{userId}-{assetClassId}` pattern (similar to opportunity alert's `{userId}-{currentAssetId}-{betterAssetId}`)
- **Update Logic:** `updateAlertIfChanged()` pattern - update if drift changes by >2% (similar to opportunity's >5 points)
- **Preference Check:** Always check `isDriftAlertsEnabled()` before creating alerts
- **Detection Integration:** Hook into overnight processing at Step 5c (after opportunity alerts)
- **Auto-Dismiss Pattern:** Use similar approach to `autoDismissForAddedAsset()` - dismiss when allocation returns to range
- **Test Structure:** Follow same 4-tier test structure (service unit, detection unit, API, integration)
- **TypeScript Patterns:** Watch for exactOptionalPropertyTypes issues with Drizzle mock chains

**Files to Reference:**

- `src/lib/services/alert-service.ts` - Extend with createDriftAlert, findExistingDriftAlert, updateDriftAlertIfChanged, autoDismissResolvedDriftAlerts
- `src/lib/services/alert-detection-service.ts` - Extend with detectDriftAlerts()
- `src/lib/services/alert-preferences-service.ts` - Has driftAlertsEnabled and driftThreshold methods
- `tests/unit/services/alert-service.test.ts` - Add drift alert tests
- `tests/unit/services/alert-detection-service.test.ts` - Add drift detection tests

[Source: docs/sprint-artifacts/9-1-opportunity-alert-better-asset-exists.md#Dev-Agent-Record]
[Source: docs/sprint-artifacts/9-1-opportunity-alert-better-asset-exists.md#File-List]

### Services and Modules

| Module                             | Responsibility                                    | Location                                         |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| **AlertService** (extend)          | Add drift alert CRUD operations                   | `src/lib/services/alert-service.ts`              |
| **AlertDetectionService** (extend) | Detect drift alerts from allocations              | `src/lib/services/alert-detection-service.ts`    |
| **Overnight Scoring Job** (extend) | Call drift detection after opportunity detection  | `src/lib/inngest/functions/overnight-scoring.ts` |
| **Portfolio Service** (extend)     | Trigger drift check after investment confirmation | `src/lib/services/portfolio-service.ts`          |

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Service-Layer]

### Drift Calculation Logic

```typescript
// Drift calculation algorithm
function calculateDrift(
  currentAllocation: Decimal,
  targetMin: Decimal,
  targetMax: Decimal
): DriftResult {
  if (currentAllocation.gt(targetMax)) {
    return {
      direction: "over",
      driftAmount: currentAllocation.minus(targetMax),
      isOutOfRange: true,
    };
  }
  if (currentAllocation.lt(targetMin)) {
    return {
      direction: "under",
      driftAmount: targetMin.minus(currentAllocation),
      isOutOfRange: true,
    };
  }
  return { direction: null, driftAmount: new Decimal(0), isOutOfRange: false };
}

// Alert creation threshold check
// Only create alert if: driftAmount > userThreshold (default 5%)
```

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Drift-Calculation]

---

## Tasks

### Task 1: Extend AlertService with Drift Alert Methods (AC: 9.2.1, 9.2.2, 9.2.3, 9.2.7)

**Files:** `src/lib/services/alert-service.ts`

- [x] Add `DRIFT_UPDATE_THRESHOLD` constant (threshold for updating existing alerts, default 2%)
- [x] Implement `createDriftAlert(userId, assetClass, currentAllocation, targetMin, targetMax)` method
  - [x] Calculate drift amount and direction
  - [x] Determine severity: 'warning' if drift > threshold, 'critical' if drift >= 2x threshold
  - [x] Generate title: "[CLASS_NAME] allocation drift detected"
  - [x] Generate message per AC-9.2.2 format with direction-specific suggestion
  - [x] Set type = 'allocation_drift'
  - [x] Store DriftAlertMetadata with all required fields
- [x] Implement `findExistingDriftAlert(userId, assetClassId)` for deduplication
- [x] Implement `updateDriftAlertIfChanged(alertId, newDriftAmount, newCurrentAllocation)` method
  - [x] Only update if drift change > 2%
  - [x] Update severity if magnitude changed significantly
- [x] Implement `autoDismissResolvedDriftAlerts(userId, portfolioId)` method
  - [x] Query drift alerts for user
  - [x] For each alert, check if allocation is back in range
  - [x] Auto-dismiss resolved alerts
- [x] All queries MUST include userId filter (tenant isolation)
- [x] Use logger for structured logging

### Task 2: Extend AlertDetectionService with Drift Detection (AC: 9.2.1, 9.2.4, 9.2.5, 9.2.6, 9.2.7)

**Files:** `src/lib/services/alert-detection-service.ts`

- [x] Implement `detectDriftAlerts(userId, portfolioId)` method:
  - [x] Load user's alert preferences - check driftAlertsEnabled
  - [x] Get user's drift threshold from preferences (default 5%)
  - [x] If disabled, return early (no alerts created)
  - [x] Get all asset classes with target allocation ranges for this portfolio
  - [x] Calculate current allocation for each class
  - [x] For each asset class:
    - [x] Calculate drift using targetMin/targetMax
    - [x] If drift > threshold:
      - [x] Check for existing drift alert (deduplication)
      - [x] If no existing alert: create new drift alert
      - [x] If existing alert: update if drift changed >2%
    - [x] If allocation returned to range:
      - [x] Auto-dismiss existing drift alert for this class
- [x] Use decimal.js for all allocation calculations
- [x] Log detection results with structured logging
- [x] Return detection summary: { created: number, updated: number, dismissed: number }

### Task 3: Integrate Drift Detection into Overnight Processing (AC: 9.2.1)

**Files:** `src/lib/inngest/functions/overnight-scoring.ts`

- [x] In Step 5c (after opportunity alert detection), add drift alert detection
- [x] Call `alertDetectionService.detectDriftAlerts(userId, portfolioId)`
- [x] Add try/catch - drift detection failures should not fail entire job
- [x] Log drift detection metrics (alerts created, updated, dismissed)
- [x] Add timing metric for drift detection phase

### Task 4: Integrate Drift Check After Investment Confirmation (AC: 9.2.6)

**Files:** `src/lib/services/portfolio-service.ts` (or investment confirmation handler)

- [x] After investment confirmation updates portfolio:
  - [x] Call `alertService.autoDismissResolvedDriftAlerts(userId, portfolioId)`
  - [x] This will auto-dismiss drift alerts if allocations returned to range
- [x] Log drift recheck after investment

### Task 5: Write Unit Tests - AlertService Drift Methods (AC: 9.2.1-9.2.3, 9.2.7)

**Files:** `tests/unit/services/alert-service.test.ts`

- [x] Test createDriftAlert creates record with correct fields
- [x] Test message format matches AC-9.2.2 specification
- [x] Test metadata includes all required DriftAlertMetadata fields
- [x] Test direction is 'over' when current > targetMax
- [x] Test direction is 'under' when current < targetMin
- [x] Test severity is 'warning' for moderate drift
- [x] Test severity is 'critical' for severe drift (2x threshold)
- [x] Test findExistingDriftAlert deduplication logic
- [x] Test updateDriftAlertIfChanged only updates when change >2%
- [x] Test autoDismissResolvedDriftAlerts dismisses when back in range
- [x] Test tenant isolation (cannot access other user's alerts)

### Task 6: Write Unit Tests - AlertDetectionService Drift Detection (AC: 9.2.1, 9.2.4-9.2.7)

**Files:** `tests/unit/services/alert-detection-service.test.ts`

- [x] Test detectDriftAlerts creates alerts for drift > threshold
- [x] Test no alert created for drift <= threshold
- [x] Test deduplication - no duplicate for same asset class
- [x] Test alert update when drift changes >2%
- [x] Test respects driftAlertsEnabled=false preference
- [x] Test uses user's configured driftThreshold
- [x] Test auto-dismisses when allocation returns to range
- [x] Test handles portfolio with no asset classes gracefully
- [x] Test handles asset class with no target range (skip)
- [x] Test uses decimal.js for allocation comparisons

### Task 7: Write Integration Tests - Drift Detection Flow (AC: 9.2.1, 9.2.4-9.2.7)

**Files:** `tests/integration/alert-detection-flow.test.ts` (extend existing)

- [ ] Test end-to-end: price update → allocation calc → detection → alert creation
- [ ] Test alert contains correct drift data
- [ ] Test deduplication across multiple detection runs
- [ ] Test auto-dismiss when investment brings allocation back to range
- [ ] Test preference enforcement in detection flow
- [ ] Test drift threshold configuration respected

### Task 8: Run Verification

- [ ] TypeScript compilation successful (`pnpm exec tsc --noEmit`)
- [ ] ESLint passes with no new errors (`pnpm lint`)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Build verification passed (`next build`)

---

## Dependencies

- **Story 9.1:** Opportunity Alert - Better Asset Exists (Complete) - AlertService, AlertDetectionService, AlertPreferencesService
- **Story 4.3:** Set Allocation Ranges for Classes (Complete) - Target allocation data
- **Story 3.7:** Allocation Percentage View (Complete) - Allocation calculation logic
- **Story 8.2:** Overnight Scoring Job (Complete) - Integration point for detection

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Tenant Isolation:** All queries MUST include userId filter
- **Decimal Precision:** Allocation comparisons must use decimal.js
- **Service Layer Pattern:** Follow existing AlertService patterns from Story 9.1
- **API Standards:** Reuse existing alerts API endpoints

[Source: docs/architecture.md#Security-Architecture]
[Source: docs/architecture.md#Implementation-Patterns]

### Testing Strategy

Per project testing standards (CLAUDE.md):

- Unit tests for all new service methods with mocked database
- Extend existing alert-detection tests with drift scenarios
- Integration tests for full drift detection flow
- All tests must pass before marking complete
- Follow test patterns from Story 9.1

[Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

### Project Structure Notes

Following unified project structure:

- **AlertService Extension:** `src/lib/services/alert-service.ts` (extend existing)
- **AlertDetectionService Extension:** `src/lib/services/alert-detection-service.ts` (extend existing)
- **Tests:** Extend existing test files in `tests/unit/services/`, `tests/integration/`

[Source: docs/architecture.md#Project-Structure]

### Performance Considerations

- Drift detection runs after scoring in overnight job
- Use existing allocation calculation from AllocationService (avoid recalculation)
- Deduplication check before insert (avoid duplicates)
- Batch update drift alert dismissals when possible

[Source: docs/sprint-artifacts/tech-spec-epic-9.md#Performance-Considerations]

### Key Differences from Opportunity Alerts

| Aspect           | Opportunity Alert                    | Drift Alert                                 |
| ---------------- | ------------------------------------ | ------------------------------------------- |
| Trigger          | Better-scored asset found            | Allocation outside range                    |
| Dedup Key        | userId-currentAssetId-betterAssetId  | userId-assetClassId                         |
| Auto-dismiss     | When better asset added to portfolio | When allocation returns to range            |
| Update threshold | Score diff changes >5 points         | Drift changes >2%                           |
| Severity         | Always 'info'                        | 'warning' or 'critical' based on magnitude  |
| Message          | Asset comparison                     | Allocation vs target with action suggestion |

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.2-Allocation-Drift-Alert]
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Technical-Architecture]
- [Source: docs/architecture.md#Security-Architecture]
- [Source: docs/architecture.md#Implementation-Patterns]
- [Source: docs/epics.md#Story-9.2]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]
- [Source: docs/sprint-artifacts/9-1-opportunity-alert-better-asset-exists.md#Dev-Agent-Record]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/9-2-allocation-drift-alert.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-18 | Story drafted from tech-spec-epic-9.md and epics.md | SM Agent (create-story workflow) |
