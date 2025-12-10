# Story 5.10: View Asset Score

**Status:** done
**Epic:** Epic 5 - Scoring Engine
**Previous Story:** 5.9 Store Historical Scores (Status: done)

---

## Story

**As a** user
**I want to** view the current score for any asset
**So that** I can see how it ranks against my scoring criteria

---

## Acceptance Criteria

### AC-5.10.1: Score Badge Display

- **Given** I am viewing an asset (in portfolio or search)
- **When** I see the asset card or row
- **Then** I see the score displayed as a badge with color coding
- **And** color coding follows: green (80+), amber (50-79), red (<50)
- **And** scores display as integers (0-100 scale)

### AC-5.10.2: Score Tooltip with Preview

- **Given** I hover over a score badge
- **When** the tooltip appears
- **Then** I see: "Score: 87 - Click for breakdown"
- **And** tooltip includes score freshness timestamp
- **And** tooltip shows brief summary (e.g., "5/8 criteria matched")

### AC-5.10.3: Unscored Asset Indicator

- **Given** an asset exists but has no calculated score
- **When** I view that asset
- **Then** I see "Not scored" indicator instead of score badge
- **And** indicator explains why (e.g., "No criteria configured for this market")
- **And** clicking shows option to configure criteria

### AC-5.10.4: Score Freshness Timestamp

- **Given** a score exists for an asset
- **When** I view the score badge
- **Then** I can see when the score was calculated
- **And** freshness indicator shows: green (<24h), amber (1-3 days), red (>3 days)
- **And** stale scores (>7 days) show warning icon

---

## Technical Notes

### Building on Story 5.9 Infrastructure

This story creates the UI layer for displaying scores stored by Story 5.9:

```typescript
// From Story 5.9 - score-service.ts
// Use getAssetScore() to fetch current score for display
// Use scoreHistory for freshness calculation
```

[Source: docs/sprint-artifacts/5-9-store-historical-scores.md]

### ScoreBadge Component Design

Per tech-spec and UX spec requirements:

```typescript
// src/components/fintech/score-badge.tsx
interface ScoreBadgeProps {
  score: number | null;
  calculatedAt?: Date;
  criteriaMatched?: { matched: number; total: number };
  assetId: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

// Color thresholds per AC-5.10.1
const getScoreColor = (score: number): string => {
  if (score >= 80) return "bg-green-500 text-white"; // High score
  if (score >= 50) return "bg-amber-500 text-white"; // Medium score
  return "bg-red-500 text-white"; // Low score
};
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.10]

### API Integration

Use existing score endpoint from Story 5.8:

```typescript
// GET /api/scores/:assetId
// Response includes: score, breakdown, calculatedAt, criteriaVersionId
// Already implemented - just need UI to consume it
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Score-Endpoints]

### Freshness Calculation

Reuse DataFreshnessBadge pattern from architecture:

```typescript
// Freshness thresholds per AC-5.10.4
const getFreshnessStatus = (calculatedAt: Date): "fresh" | "stale" | "warning" => {
  const hoursSince = (Date.now() - calculatedAt.getTime()) / (1000 * 60 * 60);
  if (hoursSince < 24) return "fresh"; // Green
  if (hoursSince < 72) return "stale"; // Amber
  return "warning"; // Red
};
```

[Source: docs/architecture.md#Custom-Components]

### Unscored Asset Handling

Per tech-spec, assets may be unscored when:

1. No criteria configured for asset's market
2. Asset missing required fundamentals
3. Scoring job hasn't run yet

```typescript
// Display logic for unscored assets
interface UnscoredReason {
  code: "NO_CRITERIA" | "MISSING_FUNDAMENTALS" | "NOT_CALCULATED";
  message: string;
  actionHref?: string;
}
```

---

## Tasks

### Task 1: Create ScoreBadge Component (AC: 5.10.1, 5.10.4)

**Files:** `src/components/fintech/score-badge.tsx`

- [ ] Create ScoreBadge component with score prop
- [ ] Implement color coding: green (80+), amber (50-79), red (<50)
- [ ] Add size variants (sm, md, lg) for different contexts
- [ ] Add freshness indicator icon based on calculatedAt
- [ ] Support onClick for opening breakdown panel
- [ ] Export from components index

### Task 2: Create ScoreTooltip Component (AC: 5.10.2)

**Files:** `src/components/fintech/score-tooltip.tsx`

- [ ] Create tooltip content component
- [ ] Display score value with "Click for breakdown" hint
- [ ] Show criteria summary (X/Y criteria matched)
- [ ] Show freshness timestamp (relative time: "2 hours ago")
- [ ] Use shadcn Tooltip component as wrapper

### Task 3: Create UnscoredIndicator Component (AC: 5.10.3)

**Files:** `src/components/fintech/unscored-indicator.tsx`

- [ ] Create component for assets without scores
- [ ] Display "Not scored" with explanation icon
- [ ] Show reason tooltip on hover
- [ ] Include CTA link to configure criteria if applicable
- [ ] Style consistently with ScoreBadge

### Task 4: Create useAssetScore Hook (AC: All)

**Files:** `src/hooks/use-asset-score.ts`

- [ ] Create React Query hook for fetching asset score
- [ ] Handle loading state with skeleton
- [ ] Handle error state gracefully
- [ ] Handle null score (unscored asset)
- [ ] Include refetch capability
- [ ] Cache with appropriate staleTime (5 minutes)

### Task 5: Integrate ScoreBadge into Portfolio List (AC: 5.10.1)

**Files:** `src/app/(dashboard)/portfolio/page.tsx`, `src/components/portfolio/asset-row.tsx`

- [ ] Add ScoreBadge to asset rows in portfolio table
- [ ] Connect to score API via useAssetScore hook
- [ ] Handle loading state with skeleton badge
- [ ] Handle unscored assets with UnscoredIndicator
- [ ] Ensure click opens score breakdown (connect to Story 5.11)

### Task 6: Integrate ScoreBadge into Criteria Page Asset Preview (AC: 5.10.1)

**Files:** `src/app/(dashboard)/criteria/page.tsx`, related preview components

- [ ] Add ScoreBadge to asset previews in criteria page
- [ ] Show score changes in preview mode
- [ ] Display "before/after" scores when previewing criteria changes

### Task 7: Create Unit Tests for ScoreBadge (AC: 5.10.1, 5.10.4)

**Files:** `tests/unit/components/score-badge.test.tsx`

- [ ] Test color coding thresholds (80+, 50-79, <50)
- [ ] Test freshness indicator display
- [ ] Test size variants render correctly
- [ ] Test onClick handler fires
- [ ] Test accessibility (aria-label, role)

### Task 8: Create Unit Tests for Unscored Handling (AC: 5.10.3)

**Files:** `tests/unit/components/unscored-indicator.test.tsx`

- [ ] Test "Not scored" display
- [ ] Test reason codes and messages
- [ ] Test CTA link for criteria configuration
- [ ] Test accessibility

### Task 9: Run Verification

- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] ESLint passes with no new errors (`pnpm lint`)
- [ ] `pnpm build` successful
- [ ] `pnpm test` - all tests pass
- [ ] Visual verification in Storybook (optional)

---

## Dependencies

- **Story 5.8:** Score Calculation Engine (Complete) - provides `/api/scores/:assetId` endpoint
- **Story 5.9:** Store Historical Scores (Complete) - provides score freshness data
- **Story 5.11:** Score Breakdown View (Next story) - opens on ScoreBadge click

---

## Dev Notes

### Architecture Constraints

Per architecture document:

- **Component Location:** Custom fintech components go in `src/components/fintech/`
- **Hook Location:** Custom hooks go in `src/hooks/`
- **State Management:** Use React Query for server state
- **Styling:** Use Tailwind CSS with shadcn/ui patterns

[Source: docs/architecture.md#Project-Structure]

### Color Palette for Score Badges

From UX spec and architecture:

```typescript
// Tailwind classes for score colors
const scoreColors = {
  high: "bg-green-500 text-white hover:bg-green-600", // Score >= 80
  medium: "bg-amber-500 text-white hover:bg-amber-600", // Score 50-79
  low: "bg-red-500 text-white hover:bg-red-600", // Score < 50
  unscored: "bg-gray-200 text-gray-500 hover:bg-gray-300", // No score
};
```

[Source: docs/architecture.md#Custom-Components]

### Score Normalization

Per tech-spec, scores are stored as decimals but displayed as integers 0-100:

```typescript
// Normalize score for display
const displayScore = Math.round(parseFloat(score));
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Score-Calculation-Engine]

### Project Structure Notes

Following unified project structure from previous stories:

- **Components:** `src/components/fintech/score-badge.tsx`
- **Hooks:** `src/hooks/use-asset-score.ts`
- **Tests:** `tests/unit/components/`
- **Integration:** Portfolio page at `src/app/(dashboard)/portfolio/page.tsx`

[Source: docs/architecture.md#Project-Structure]

### Learnings from Previous Story

**From Story 5.9 - Store Historical Scores (Status: done)**

- **Existing Services:** `src/lib/services/score-service.ts` already has score fetching methods - REUSE, don't recreate
- **API Pattern:** `/api/scores/[assetId]/` route structure established - add sibling routes consistently
- **Schema:** scoreHistory table exists with calculatedAt timestamps - use for freshness
- **Test Patterns:** API tests use mock patterns from story 5.8/5.9 - follow same patterns
- **Decimal Handling:** Use decimal.js for score calculations, convert to number only for display

[Source: docs/sprint-artifacts/5-9-store-historical-scores.md#Dev-Agent-Record]

### Integration with Story 5.11

ScoreBadge onClick should prepare for Story 5.11 (Score Breakdown View):

```typescript
// onClick handler should navigate to breakdown or open sheet
const handleScoreClick = () => {
  // Option A: URL navigation
  router.push(`/portfolio/${assetId}/score`);

  // Option B: Sheet/Modal (preferred per UX spec)
  setBreakdownAssetId(assetId);
  setBreakdownOpen(true);
};
```

[Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.11]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Story-5.10]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Acceptance-Criteria]
- [Source: docs/epics.md#Story-5.10-View-Asset-Score]
- [Source: docs/architecture.md#Custom-Components]
- [Source: docs/architecture.md#Project-Structure]
- [Source: docs/sprint-artifacts/5-9-store-historical-scores.md]
- [Source: CLAUDE.md#Test-Requirements-for-All-Code-Changes]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/5-10-view-asset-score.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Task 1-3: Created ScoreBadge, ScoreTooltip (inline), UnscoredIndicator components in src/components/fintech/
- Task 4: Created useAssetScore and useAssetScores hooks in src/hooks/
- Task 5: Integrated ScoreBadge into PortfolioTableWithValues with Score column
- Task 6: Updated preview-assets-table.tsx to use ScoreBadge component
- Task 7-8: Created unit tests for all utility functions and reason codes
- Task 9: All tests pass (1385 tests), TypeScript compiles, ESLint passes

### Completion Notes List

1. **ScoreBadge Component:** Created with color coding (green 80+, amber 50-79, red <50), size variants (sm/md/lg), freshness ring indicator, warning icon for >7 day old scores, and tooltip support
2. **ScoreTooltip:** Implemented inline within ScoreBadge showing "Score: X - Click for breakdown", criteria summary (N/M matched), and freshness timestamp
3. **UnscoredIndicator:** Created with 3 reason codes (NO_CRITERIA, MISSING_FUNDAMENTALS, NOT_CALCULATED), action links to criteria page
4. **useAssetScore Hook:** Fetches single asset score with loading/error/unscored states, calculates criteriaMatched summary
5. **useAssetScores Hook:** Batch fetch for portfolio view, returns Map of scores and unscoredReasons
6. **Portfolio Integration:** Added Score column to PortfolioTableWithValues with sorting support
7. **Criteria Preview Integration:** Replaced inline ScoreBadge with imported component in preview-assets-table.tsx
8. **Tests:** 56 new tests covering all utility functions, color thresholds, freshness levels, reason codes

### File List

**New Files:**

- src/components/fintech/score-badge.tsx
- src/components/fintech/unscored-indicator.tsx
- src/hooks/use-asset-score.ts
- tests/unit/components/score-badge.test.ts
- tests/unit/components/unscored-indicator.test.ts
- tests/unit/hooks/use-asset-score.test.ts

**Modified Files:**

- src/components/portfolio/portfolio-table.tsx (added Score column, useAssetScores integration)
- src/components/criteria/preview-assets-table.tsx (replaced inline ScoreBadge with imported component)

---

## Change Log

| Date       | Change                                              | Author                           |
| ---------- | --------------------------------------------------- | -------------------------------- |
| 2025-12-10 | Story drafted from tech-spec-epic-5.md and epics.md | SM Agent (create-story workflow) |
