# Story 6.4: Recommendation Details

Status: done

## Story

As a **user**,
I want **to understand why each asset is recommended**,
so that **I can trust the recommendations are based on my criteria**.

## Acceptance Criteria

1. **AC-6.4.1: Why This Recommendation Panel**
   - Given I am viewing a recommendation
   - When I click "Why this recommendation?"
   - Then I see a breakdown including:
     - Current allocation vs. target range
     - Asset score and ranking
     - How much this purchase will move allocation
     - Key scoring criteria that contributed

2. **AC-6.4.2: Allocation Math Display**
   - Given I view the calculation breakdown
   - When I look at the allocation math
   - Then I see: current %, target range, gap %, recommended amount, new %

3. **AC-6.4.3: Score Contribution Display**
   - Given I view the score contribution
   - When I look at the scoring section
   - Then I see the top 3 criteria that contributed most to the score
   - And I can expand to see full breakdown

4. **AC-6.4.4: Full Calculation Details**
   - Given I want to see all calculations
   - When I click "Full calculation details"
   - Then I see the complete formula and all inputs used
   - And this supports the audit trail requirement

## Tasks / Subtasks

### Task 1: Extend Breakdown API for Score Criteria (AC: 6.4.3, 6.4.4)

- [x] 1.1: Modify `/api/recommendations/[id]/breakdown/route.ts` to include score breakdown data
- [x] 1.2: Add `topCriteria` field to response with top 3 scoring criteria
- [x] 1.3: Add `expectedAllocationAfter` calculation to response
- [x] 1.4: Add `scoreRanking` field (percentile among portfolio assets)
- [x] 1.5: Add unit tests for new API fields

### Task 2: Create Recommendation Details Helper Functions (AC: 6.4.1, 6.4.2)

- [x] 2.1: Create `src/lib/calculations/recommendation-details.ts`
- [x] 2.2: Implement `calculateExpectedAllocation(currentValue, recommendedAmount, portfolioTotal)` function
- [x] 2.3: Implement `getTopCriteria(breakdown: CriterionResult[], count: number)` function
- [x] 2.4: Implement `calculateScoreRanking(assetScore, allScores)` function
- [x] 2.5: Implement `formatAllocationChange(before, after)` function
- [x] 2.6: Add unit tests for all helper functions

### Task 3: Create RecommendationDetailsPanel Component (AC: 6.4.1, 6.4.2, 6.4.3)

- [x] 3.1: Create `src/components/recommendations/recommendation-details-panel.tsx`
- [x] 3.2: Implement allocation math section with before/after visual
- [x] 3.3: Implement score section with ranking badge
- [x] 3.4: Implement top 3 criteria section with expand toggle
- [x] 3.5: Implement allocation movement visualization (how purchase moves %)
- [x] 3.6: Style consistent with existing `RecommendationBreakdownPanel`

### Task 4: Integrate with RecommendationCard (AC: 6.4.1)

- [x] 4.1: Add "Why this recommendation?" button to `RecommendationCard`
- [x] 4.2: Wire button to open `RecommendationDetailsPanel`
- [x] 4.3: Pass all required props (score breakdown data, allocation data)
- [x] 4.4: Update component exports in `index.ts`

### Task 5: Create useRecommendationDetails Hook (AC: 6.4.3, 6.4.4)

- [x] 5.1: Create `src/hooks/use-recommendation-details.ts`
- [x] 5.2: Fetch breakdown API data with caching
- [x] 5.3: Fetch score breakdown data via `useScoreBreakdown`
- [x] 5.4: Combine data for panel display
- [x] 5.5: Add unit tests for hook

### Task 6: Unit Tests (All AC)

- [x] 6.1: Create `tests/unit/components/recommendation-details-panel.test.ts`
- [x] 6.2: Test allocation math display
- [x] 6.3: Test score ranking display
- [x] 6.4: Test top criteria collapse/expand
- [x] 6.5: Test expected allocation calculation

### Task 7: E2E Tests (All AC)

- [x] 7.1: Create E2E test for "Why this recommendation?" flow
- [x] 7.2: Test panel opens with correct data
- [x] 7.3: Test expand to full breakdown
- [x] 7.4: Test score breakdown link works

### Task 8: Component Integration (Epic 3 Retrospective Action Item)

- [x] 8.1: Import RecommendationDetailsPanel into RecommendationCard
- [x] 8.2: Verify component renders in UI (visual check)
- [x] 8.3: Add E2E test confirming component visibility
- [x] 8.4: Update barrel exports if applicable

## Dev Notes

### Existing Infrastructure (STRONG FOUNDATION)

This story builds on substantial existing infrastructure from Stories 6.3, 7.7, and 5.11:

| Component                    | Location                                                            | Relevance                                                       |
| ---------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| RecommendationBreakdownPanel | `src/components/recommendations/recommendation-breakdown-panel.tsx` | **Pattern to extend** - Has allocation gauge, calculation steps |
| RecommendationCard           | `src/components/recommendations/recommendation-card.tsx`            | **Integration target** - Add "Why" button                       |
| ScoreBreakdown               | `src/components/fintech/score-breakdown.tsx`                        | **Score display patterns** - Top criteria chart                 |
| PointsContributionChart      | `src/components/fintech/score-breakdown.tsx`                        | **Reusable** - Bar chart of criteria                            |
| useScoreBreakdown            | `src/hooks/use-score-breakdown.ts`                                  | **Data source** - Criteria breakdown                            |
| Breakdown API                | `src/app/api/recommendations/[id]/breakdown/route.ts`               | **Extend** - Add topCriteria, expected%                         |
| AllocationGauge              | `src/components/recommendations/allocation-gauge.tsx`               | **Reusable** - Visual gauge                                     |
| CalculationSteps             | `src/components/recommendations/calculation-steps.tsx`              | **Reusable** - Step display                                     |

### Key Data Types Available

**From `src/lib/types/recommendations.ts`:**

```typescript
interface DetailedBreakdown {
  item: BreakdownDisplayItem;
  calculation: {
    inputs: CalculationInputs; // Has currentPercentage, targetRange, score
    steps: CalculationStep[]; // Step-by-step formula
    result: CalculationResult; // recommendedAmount, reasoning
  };
  auditTrail: AuditTrailInfo; // correlationId, generatedAt
}

interface CalculationInputs {
  currentValue: string;
  portfolioTotal: string;
  currentPercentage: string;
  targetRange: { min: string; max: string };
  score: string;
  criteriaVersion: string;
}
```

**From `src/hooks/use-score-breakdown.ts`:**

```typescript
interface ScoreBreakdownData {
  assetId: string;
  symbol: string;
  score: string;
  breakdown: CriterionResult[]; // Array of criteria with pointsAwarded
  criteriaVersionId: string;
  calculatedAt: Date;
  isFresh: boolean;
}

interface CriterionResult {
  criterionId: string;
  criterionName: string;
  matched: boolean;
  pointsAwarded: number;
  actualValue: string | null;
  skippedReason: string | null;
}
```

### What Needs Implementation

**1. API Extension** (`/api/recommendations/[id]/breakdown`)

Add to response:

```typescript
interface ExtendedBreakdown extends DetailedBreakdown {
  topCriteria: Array<{
    criterionId: string;
    criterionName: string;
    pointsAwarded: number;
    actualValue: string | null;
  }>;
  expectedAllocationAfter: string; // % after investment
  scoreRanking: {
    percentile: number; // 0-100
    rank: number; // 1-based
    total: number; // total assets
  };
}
```

**2. Expected Allocation Calculation**

```typescript
// Formula: (currentValue + recommendedAmount) / (portfolioTotal + totalInvestable) * 100
function calculateExpectedAllocation(
  currentValue: string,
  recommendedAmount: string,
  portfolioTotal: string,
  totalInvestable: string
): string {
  const current = new Decimal(currentValue);
  const recommended = new Decimal(recommendedAmount);
  const portfolio = new Decimal(portfolioTotal);
  const investable = new Decimal(totalInvestable);

  const newValue = current.plus(recommended);
  const newPortfolio = portfolio.plus(investable);

  return newValue.dividedBy(newPortfolio).times(100).toDecimalPlaces(2).toString();
}
```

**3. Top Criteria Extraction**

```typescript
function getTopCriteria(breakdown: CriterionResult[], count: number = 3): CriterionResult[] {
  return breakdown
    .filter((c) => !c.skippedReason && c.pointsAwarded !== 0)
    .sort((a, b) => Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded))
    .slice(0, count);
}
```

**4. Score Ranking**

```typescript
function calculateScoreRanking(
  assetScore: string,
  allScores: string[]
): { percentile: number; rank: number; total: number } {
  const score = new Decimal(assetScore);
  const sorted = allScores.map((s) => new Decimal(s)).sort((a, b) => b.minus(a).toNumber());
  const rank = sorted.findIndex((s) => s.eq(score)) + 1;
  const percentile = Math.round(((sorted.length - rank) / sorted.length) * 100);
  return { percentile, rank, total: sorted.length };
}
```

### Component Structure for RecommendationDetailsPanel

```tsx
<Sheet>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>{symbol} - Why This Recommendation</SheetTitle>
    </SheetHeader>

    {/* Section 1: Allocation Math (AC-6.4.2) */}
    <AllocationMathSection>
      <AllocationRow label="Current" value={currentAllocation} />
      <AllocationRow label="Target Range" value={`${targetMin}% - ${targetMax}%`} />
      <AllocationRow label="Gap" value={allocationGap} highlight />
      <AllocationRow label="Recommended" value={recommendedAmount} />
      <AllocationRow label="Expected After" value={expectedAllocationAfter} highlight />
      <AllocationMovementBar from={current} to={expected} />
    </AllocationMathSection>

    {/* Section 2: Score & Ranking (AC-6.4.1, 6.4.3) */}
    <ScoreSection>
      <ScoreBadge score={score} size="lg" />
      <RankingBadge percentile={percentile} rank={rank} total={total} />
      <TopCriteriaList
        criteria={topCriteria}
        isExpanded={showAllCriteria}
        onToggle={toggleShowAll}
      />
    </ScoreSection>

    {/* Section 3: Full Calculation (AC-6.4.4) */}
    <Collapsible>
      <CollapsibleTrigger>Full Calculation Details</CollapsibleTrigger>
      <CollapsibleContent>
        <CalculationSteps steps={calculationSteps} />
        <AuditTrailInfo correlationId={correlationId} generatedAt={generatedAt} />
      </CollapsibleContent>
    </Collapsible>
  </SheetContent>
</Sheet>
```

### Integration with RecommendationCard

Current card has:

- Tooltip with current %, target range, expected after %
- Click handler for over-allocated explanation

Add:

- "Why?" icon button that opens `RecommendationDetailsPanel`
- Positioned in card header or as secondary action

```tsx
// In RecommendationCard
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowDetails(true)}
      aria-label="Why this recommendation"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Why this recommendation?</TooltipContent>
</Tooltip>

<RecommendationDetailsPanel
  open={showDetails}
  onOpenChange={setShowDetails}
  item={item}
  // ... other props
/>
```

### Critical Implementation Rules

From `project-context.md`:

- **Decimal.js MANDATORY** - All financial calculations use `new Decimal("value")`
- **Handle -0 edge case** - Use `result.isZero() ? new Decimal(0) : result`
- **Structured logging** - Use `logger` from `@/lib/telemetry/logger`, never console
- **useNumberFormat()** - Use for all number display, never `toFixed()` or `toLocaleString()`
- **Standardized responses** - Use `successResponse/errorResponse` from `@/lib/api/responses.ts`
- **ESLint compliance** - Use `// eslint-disable-line no-restricted-syntax` for internal `.toFixed()` calculations

### Previous Story Learnings (Story 6.3)

1. **Pattern reuse** - Existing `RecommendationBreakdownPanel` is the foundation pattern
2. **Tooltip implementation** - Already added to `RecommendationCard` in 6.3; can extend
3. **Pie chart integration** - `RecommendationPieChart` and `BeforeAfterPreview` exist
4. **Score display** - `ScoreBadge` component with interactive breakdown link works well
5. **Test structure** - Unit tests for data transformation + E2E for user flow

### Git Context (Recent Commits)

```
7a2aa21 fix(story-6.3): improve PR review comments clarity
9d7205c fix(story-6.3): PR review fixes round 2
75146a1 fix(story-6.3): code review fixes for recommendation display
f9d2eae feat(story-6.1): validate monthly contribution input infrastructure
c822150 feat(story-6.2): implement recommendation generation with code review fixes
```

The 6.x series has established patterns for:

- Recommendation data flow
- Score integration
- Allocation calculations
- Panel/sheet UI patterns

### File Structure

**New Files:**

- `src/lib/calculations/recommendation-details.ts` - Helper functions
- `src/components/recommendations/recommendation-details-panel.tsx` - Main panel
- `src/hooks/use-recommendation-details.ts` - Combined data hook
- `tests/unit/calculations/recommendation-details.test.ts` - Unit tests
- `tests/unit/components/recommendation-details-panel.test.ts` - Component tests
- `tests/unit/hooks/use-recommendation-details.test.ts` - Hook tests

**Modified Files:**

- `src/app/api/recommendations/[id]/breakdown/route.ts` - Add topCriteria, expectedAllocation
- `src/components/recommendations/recommendation-card.tsx` - Add "Why?" button
- `src/components/recommendations/index.ts` - Export new component

### References

- [Source: `src/components/recommendations/recommendation-breakdown-panel.tsx`] - Pattern to extend
- [Source: `src/components/fintech/score-breakdown.tsx`] - Score display patterns
- [Source: `src/hooks/use-score-breakdown.ts`] - Score data hook
- [Source: `src/app/api/recommendations/[id]/breakdown/route.ts`] - API to extend
- [Source: `src/lib/types/recommendations.ts`] - Data types
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 6.4`] - Story requirements
- [Source: `_bmad-output/project-context.md`] - Implementation rules
- [Source: `_bmad-output/implementation-artifacts/6-3-recommendation-display.md`] - Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A

### Completion Notes List

- All 8 tasks completed successfully
- Unit tests: 23 new tests for helper functions, 29 for component interfaces, 24 for hook interfaces
- E2E tests: Extended recommendations-display.spec.ts with AC-6.4.1 through AC-6.4.4 tests
- Code review completed: 7 issues identified, all fixed

### Tech Debt Notes

- **Missing @testing-library/react**: Component and hook tests currently only verify TypeScript interface contracts, not actual rendering behavior. Rendering tests are covered by E2E tests (Playwright). Consider adding @testing-library/react in a future sprint for unit-level React component testing.

### File List

**New Files Created:**
| File | Purpose |
|------|---------|
| `src/lib/calculations/recommendation-details.ts` | Helper functions: calculateExpectedAllocation, getTopCriteria, calculateScoreRanking, formatAllocationChange |
| `src/components/recommendations/recommendation-details-panel.tsx` | Main panel component with allocation math, score ranking, top criteria, and full calculation sections |
| `src/hooks/use-recommendation-details.ts` | Combined data hook fetching breakdown API + score breakdown |
| `tests/unit/calculations/recommendation-details.test.ts` | 23 unit tests for helper functions |
| `tests/unit/components/recommendation-details-panel.test.ts` | 29 interface contract tests for component props |
| `tests/unit/hooks/use-recommendation-details.test.ts` | 24 interface contract tests for hook |

**Modified Files:**
| File | Changes |
|------|---------|
| `src/app/api/recommendations/[id]/breakdown/route.ts` | Added topCriteria, expectedAllocationAfter, scoreRanking fields to response |
| `src/components/recommendations/recommendation-card.tsx` | Added "Why?" button to open RecommendationDetailsPanel |
| `src/components/recommendations/index.ts` | Added export for RecommendationDetailsPanel |
| `src/lib/types/recommendations.ts` | Added TopCriterion, ScoreRanking, ExtendedBreakdown types |
| `tests/e2e/recommendations-display.spec.ts` | Added E2E tests for AC-6.4.1 through AC-6.4.4 |
| `tests/unit/api/recommendations-breakdown.test.ts` | Added Story 6.4 test section for extended breakdown fields |
