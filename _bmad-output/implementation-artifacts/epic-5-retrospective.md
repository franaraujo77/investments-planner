# Epic 5 Retrospective: Market Data & Scoring Engine

**Date:** 2026-01-02
**Facilitator:** Bob (Scrum Master)
**Participants:** Alice (PO), Charlie (Dev), Dana (QA), Elena (Jr Dev), Bmad (Project Lead)

## Epic Summary

| Metric                   | Value                        |
| ------------------------ | ---------------------------- |
| **Epic**                 | Market Data & Scoring Engine |
| **Stories Completed**    | 8/8 (100%)                   |
| **Production Incidents** | 0                            |
| **Status**               | Done                         |

### Stories Delivered

| Story | Title                                | Highlights                                      |
| ----- | ------------------------------------ | ----------------------------------------------- |
| 5-1   | Market Data Fetching                 | Provider factories, environment-aware selection |
| 5-2   | Two-Tier Refresh Architecture        | KV cache <50ms, PostgreSQL durable storage      |
| 5-3   | Score Calculation Engine             | Verification story, validated existing logic    |
| 5-4   | View Asset Scores                    | Verification story, UI integration confirmed    |
| 5-5   | Manual Data Refresh                  | Force refresh capability with rate limiting     |
| 5-6   | Overnight Pre-Computation            | Inngest cron jobs, reliable scheduling          |
| 5-7   | Industry/Sector Classification Cache | GICS system, 173 tests                          |
| 5-8   | Asset Type Classification Cache      | Multi-jurisdiction (SEC/CVM), 170+ tests        |

## What Went Well

| Win                            | Details                                                   |
| ------------------------------ | --------------------------------------------------------- |
| **100% Story Completion**      | 8/8 stories delivered, no scope creep                     |
| **Provider Abstraction**       | Gemini/Yahoo/ExchangeRate APIs with clean fallback chains |
| **Test Coverage**              | 340+ new tests across Stories 5.7 & 5.8 alone             |
| **Verification Story Pattern** | Stories 5.3, 5.4 validated existing code efficiently      |
| **Two-Tier Cache Performance** | <50ms cache hits, clean TTL configuration                 |
| **Overnight Job Reliability**  | Inngest cron stable, no production failures               |
| **Zero Incidents**             | No production issues throughout the epic                  |

## What Didn't Go Well

| Issue                                      | Impact                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| **Code Review Findings Late**              | 4-6 issues per story caught in final review, not during implementation |
| **E2E Tests as "Documentation Only"**      | Story 5.6 E2E tests don't assert behavior - false coverage signal      |
| **Icon Order Inconsistency**               | AlertCircle/AlertTriangle swapped in Story 5.5, caught late            |
| **Type Casting Anti-Pattern**              | `null as unknown as T` in Story 5.2 made it to review                  |
| **Epic 4 Action Item Not Operationalized** | Pre-Sprint Code Audit (Bob) wasn't fully implemented                   |

## Key Learnings

1. **Verification stories reduce risk** - Validate existing code before building new features where possible. Stories 5.3 and 5.4 demonstrated this effectively.

2. **Provider abstraction pays off** - The investment in clean interfaces for market data providers meant swapping or adding fallback providers was trivial. Architecture decisions matter.

3. **Late reviews cause rework** - Finding issues at the final review stage adds rework cycles. Need earlier checkpoints in the development cycle.

4. **"Documentation tests" muddy coverage** - If E2E tests are marked as "documentation only" and don't assert behavior, they shouldn't count toward coverage metrics. Be explicit about what's real coverage.

5. **Action items need operationalization** - Assigning an owner isn't enough. Define the _how_ - the specific process, checklist, or template that makes the action item executable.

## Action Items

| #   | Action Item                                                                                                                 | Owner(s)     | Trigger/Deadline    | Status  |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------- | ------- |
| 1   | **Mid-Story Technical Checkpoint** - Define 50% checkpoint process where dev posts summary and gets 15-min peer review      | Charlie      | Trial in Story 6.1  | Pending |
| 2   | **Audit E2E Test Coverage Reality** - Tag behavioral vs. documentation-only tests; fix or exclude from coverage metrics     | Dana         | Before Story 6.3    | Pending |
| 3   | **Create Code Audit Checklist Template** - Pre-implementation checklist covering types, testids, docstrings, error handling | Bob + Elena  | Before Story 6.2    | Pending |
| 4   | **Review Findings Tracking** - Log and categorize code review issues for pattern analysis and checklist updates             | Alice + Dana | Ongoing from Epic 6 | Pending |

## Epic 4 Action Items Follow-Through

| Action Item                    | Owner   | Status              | Notes                                                    |
| ------------------------------ | ------- | ------------------- | -------------------------------------------------------- |
| Pre-Sprint Code Audit          | Bob     | Not Operationalized | Process wasn't defined; replaced by Action Item #3 above |
| Document Decimal.js Edge Cases | Charlie | Completed           | Documentation added to project-context.md                |

## Epic 6 Readiness Assessment

### Readiness Checklist

| Criteria                           | Status                              |
| ---------------------------------- | ----------------------------------- |
| Technical dependencies from Epic 5 | ✅ Complete                         |
| Stories 6-1, 6-2 defined with ACs  | ✅ Ready-for-dev                    |
| Test infrastructure                | ✅ In place                         |
| Architecture documented            | ✅ Recommendation algorithm defined |
| Team capacity                      | ✅ Available                        |
| Action items from retro assigned   | ✅ 4 items with owners              |

### Epic 6 Overview

**Epic:** Investment Recommendations (6 stories)

| Story | Title                      | Status        |
| ----- | -------------------------- | ------------- |
| 6-1   | Monthly Contribution Input | ready-for-dev |
| 6-2   | Recommendation Generation  | ready-for-dev |
| 6-3   | Recommendation Display     | backlog       |
| 6-4   | Recommendation Details     | backlog       |
| 6-5   | Investment Confirmation    | backlog       |
| 6-6   | Before/After Comparison    | backlog       |

### Dependencies Met

- ✅ Score calculation engine (Story 5.3)
- ✅ Market data with two-tier caching (Story 5.2)
- ✅ Asset classification - type and industry/sector (Stories 5.7, 5.8)
- ✅ Overnight pre-computation (Story 5.6)
- ✅ Manual refresh capability (Story 5.5)

**Verdict:** ✅ **CLEARED** - Epic 6 is ready to begin.

---

_Retrospective conducted following BMad retrospective workflow._
