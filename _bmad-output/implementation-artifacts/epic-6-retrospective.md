# Epic 6 Retrospective: Investment Recommendations

**Date:** 2026-01-02
**Facilitator:** Bob (Scrum Master)
**Participants:** Bmad (Project Lead)

## Epic Summary

| Metric                   | Value                      |
| ------------------------ | -------------------------- |
| **Epic**                 | Investment Recommendations |
| **Stories Completed**    | 7/7 (100%)                 |
| **Production Incidents** | 0                          |
| **Status**               | Done                       |

### Stories Delivered

| Story | Title                            | Highlights                                                        |
| ----- | -------------------------------- | ----------------------------------------------------------------- |
| 6-1   | Monthly Contribution Input       | Validation story - confirmed existing implementation meets AC     |
| 6-2   | Recommendation Generation        | Implemented higher-scoring asset alerts (AC-6.2.3)                |
| 6-3   | Recommendation Display           | Added pie charts, tooltips, before/after preview                  |
| 6-4   | Recommendation Details           | "Why this recommendation?" panel with score breakdown             |
| 6-5   | Investment Confirmation          | Fixed over-budget gap, dynamic "{Month} investments recorded" msg |
| 6-6   | Before/After Comparison          | Dual pie charts, portfolio summary, color-coded target movement   |
| 6-7   | Production DB Migration Pipeline | GitHub Actions pipeline for automated production migrations       |

## What Went Well

| Win                            | Details                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| **100% Story Completion**      | All 7 stories delivered, including bonus infrastructure story (6-7)    |
| **Verification Story Pattern** | Stories 6-1 and parts of 6-3, 6-5 validated existing code efficiently  |
| **Code Review Discipline**     | Every story had AI code review finding 3-8 issues per story            |
| **Component Reuse**            | AllocationPieChart, AllocationGauge, existing hooks reused extensively |
| **Test Coverage**              | 5000+ unit tests passing, E2E tests added for each story               |
| **Gap Analysis Approach**      | Story 6-5 identified critical AC mismatch (over-budget blocking)       |
| **ESLint Rule Enforcement**    | All .toFixed() violations caught and properly documented               |
| **Zero Production Incidents**  | No issues in production throughout epic                                |

## What Didn't Go Well

| Issue                         | Impact                                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| **Multiple PR Review Rounds** | Stories 6.3-6.7 required 3-4 rounds of PR feedback, extending cycle   |
| **Hardcoded Portfolio Value** | Story 6-3 BeforeAfterPreview used hardcoded "10000.00" - caught late  |
| **TODO Proliferation**        | Multiple `TODO(epic-7)` comments for deferred market data integration |
| **E2E Test Waits**            | Magic `waitForTimeout(500)` calls found - replaced with auto-waits    |
| **Migration File Confusion**  | Drizzle auto-renamed migration files causing confusion                |
| **N+1 Query Pattern**         | Multiple instances marked as TODO - performance debt accumulating     |
| **Test File Classification**  | Unit tests for hooks/components only test interfaces, not rendering   |

## Key Learnings

1. **Verification stories are efficient** - Stories 6-1, 6-3, and 6-5 showed that validating existing code before building new features saves time and ensures AC alignment.

2. **Gap analysis prevents AC drift** - Story 6-5's systematic gap analysis found the critical over-budget blocking issue that contradicted the AC.

3. **Multiple PR rounds are expensive** - Each round adds context-switching and delays. Earlier checkpoints (from Epic 5 action items) should help.

4. **ESLint rules work** - The number formatting rule (`.toFixed()` prohibition) caught all violations and forced proper documentation.

5. **Deferred TODOs need tracking** - The proliferation of `TODO(epic-7)` comments shows we're accumulating tech debt. Need to ensure these are captured in story tasks.

6. **Infrastructure stories are valuable** - Story 6-7 (DB migration pipeline) was added mid-sprint and provides significant value for future deployments.

## Epic 5 Action Items Follow-Through

| Action Item                          | Owner        | Status                | Notes                                        |
| ------------------------------------ | ------------ | --------------------- | -------------------------------------------- |
| Mid-Story Technical Checkpoint       | Charlie      | Partially Implemented | Some stories had checkpoints, not systematic |
| Audit E2E Test Coverage Reality      | Dana         | Completed             | Magic waits replaced with auto-waits         |
| Create Code Audit Checklist Template | Bob + Elena  | Not Started           | No checklist created                         |
| Review Findings Tracking             | Alice + Dana | Ongoing               | Issues logged but not categorized            |

## Action Items for Epic 7

| #   | Action Item                                                                                          | Owner   | Trigger/Deadline      | Status  |
| --- | ---------------------------------------------------------------------------------------------------- | ------- | --------------------- | ------- |
| 1   | **Systematize Mid-Story Checkpoint** - Create PR template with 50% checkpoint section                | Bob     | Before Story 7.1      | Pending |
| 2   | **Tech Debt Story** - Create story to address accumulated TODO items (N+1 queries, hardcoded prices) | Alice   | Sprint planning       | Pending |
| 3   | **React Testing Library Setup** - Add @testing-library/react for component unit tests                | Dana    | Story 7.2             | Pending |
| 4   | **PR Review Guidelines** - Document expected review scope to reduce round-trip cycles                | Charlie | Before Story 7.1      | Pending |
| 5   | **Migration Naming Convention** - Document Drizzle migration naming to prevent confusion             | Elena   | Before next migration | Pending |

## Epic 7 Readiness Assessment

### Readiness Checklist

| Criteria                           | Status                                      |
| ---------------------------------- | ------------------------------------------- |
| Technical dependencies from Epic 6 | ✅ Complete                                 |
| Story 7-1 defined with ACs         | ✅ Ready-for-dev                            |
| Test infrastructure                | ✅ In place                                 |
| Architecture documented            | ✅ Data source attribution patterns defined |
| Team capacity                      | ✅ Available                                |
| Action items from retro assigned   | ✅ 5 items with owners                      |

### Epic 7 Overview

**Epic:** Data Transparency & Alerts (6 stories, FR87-FR95)

| Story | Title                     | Status        |
| ----- | ------------------------- | ------------- |
| 7-1   | Data Source Attribution   | ready-for-dev |
| 7-2   | Calculation Transparency  | backlog       |
| 7-3   | Data Freshness Indicators | backlog       |
| 7-4   | Financial Disclaimers     | backlog       |
| 7-5   | Allocation Drift Alerts   | backlog       |
| 7-6   | Opportunity Alerts        | backlog       |

### Dependencies Met

- ✅ Recommendation engine (Story 6-2)
- ✅ Investment confirmation flow (Story 6-5)
- ✅ Allocation visualization (Story 6-6)
- ✅ Production migration pipeline (Story 6-7)
- ✅ Score breakdown infrastructure (Story 6-4)

**Verdict:** ✅ **CLEARED** - Epic 7 is ready to begin.

---

_Retrospective conducted following BMad retrospective workflow._
