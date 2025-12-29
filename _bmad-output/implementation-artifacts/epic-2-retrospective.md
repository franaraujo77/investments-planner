# Epic 2 Retrospective: Portfolio Management Foundation

**Date:** 2025-12-29
**Facilitator:** Bob (Scrum Master)
**Epic Status:** COMPLETE (9/9 stories done)

---

## Epic Summary

| Metric               | Value                                      |
| -------------------- | ------------------------------------------ |
| Stories Planned      | 8                                          |
| Stories Completed    | 9                                          |
| Scope Change         | +12.5% (1 infrastructure story added: 2.9) |
| Code Reviews         | 9/9 completed                              |
| Test Count           | 3,800+ unit tests, growing E2E suite       |
| Production Incidents | 0                                          |
| Known Limitations    | 3 documented                               |

### Stories Delivered

| Story | Title                            | Type                                         |
| ----- | -------------------------------- | -------------------------------------------- |
| 2.1   | Create Portfolio                 | New Implementation                           |
| 2.2   | View Portfolio and Holdings      | New Implementation                           |
| 2.3   | Edit Portfolio                   | New Implementation (partial: impact blocked) |
| 2.4   | Delete Portfolio                 | New Implementation                           |
| 2.5   | Add Holdings to Portfolio        | Verification + Enhancement                   |
| 2.6   | Update and Remove Holdings       | Verification (most existed)                  |
| 2.7   | Multi-Currency Portfolio Display | New Implementation                           |
| 2.8   | Investment History               | New Implementation                           |
| 2.9   | Fix RLS Migration                | Infrastructure (added mid-epic)              |

---

## What Went Well

### 1. Verification Story Pattern Continues to Pay Off

Stories 2.5 and 2.6 revealed that most of the asset management infrastructure already existed from earlier story implementations (Stories 3.2-3.5). Instead of rebuilding, we verified, added missing pieces, and moved on. Story 2.6 only needed ONE new component - the EditHoldingModal.

**Evidence:**

- Story 2.5: API endpoint, service functions, and validation schemas pre-existed
- Story 2.6: Remove/Ignore functionality was 100% pre-existing
- Story 2.4: deletePortfolio service existed, just needed ownership fix

### 2. Code Review Catching Real Issues

Every single story had meaningful code review findings. This wasn't bureaucracy - it was quality assurance.

**Real Issues Found:**

| Story | Issues     | Examples                                                   |
| ----- | ---------- | ---------------------------------------------------------- |
| 2.2   | 7 issues   | Missing testids, duplicate formatRelativeTime, unused hook |
| 2.3   | Documented | Impact analysis schema gap identified                      |
| 2.4   | 5 issues   | Unused imports, missing file docs, placeholder truncation  |
| 2.5   | 3 issues   | API error codes, audit logging, missing tests              |
| 2.7   | 2 issues   | CurrencyDisplay integration, toFixed replacement           |
| 2.8   | 3 issues   | Hardcoded locale, unused interface, test documentation     |

### 3. Consistent Pattern Reuse

Every story followed the same patterns, enabling predictable development:

- Dialog components (delete-portfolio-dialog, impact-confirmation-dialog, add-asset-modal, edit-holding-modal)
- Form pattern (react-hook-form + Zod + shadcn)
- API response pattern (successResponse/errorResponse + ERROR_CODES)
- Toast notifications (sonner)
- Testing structure (unit -> integration -> E2E)

### 4. Strong Security Posture

Every story with data access verified ownership:

- Multi-tenant isolation via userId in all WHERE clauses
- Story 2.4 CRITICAL FIX: deletePortfolio was missing ownership check
- Story 2.9: Idempotent RLS migration for all 22 tables
- Documentation updated with RLS best practices in `docs/security-checklist.md`

### 5. Comprehensive Documentation

The story files are incredibly detailed with dev notes, file lists, completion notes, and code review findings. Future developers will understand exactly what happened and why.

---

## What Didn't Go Well

### 1. Schema Gaps Discovered During Implementation

Story 2.3 hit a significant blocker - the impact analysis feature for asset type changes couldn't work because `portfolio_assets` lacks an `asset_type` column.

**Impact:**

- AC-2.3.3 and AC-2.3.4 (impact confirmation dialogs) return empty results
- E2E tests 10.4, 10.5, 10.6 blocked
- Documented as known limitation, requires future story

**Also Story 2.8:**

- `allocationAtTime` field missing from investments table
- Prevents showing allocation % at time of investment
- Requires data model enhancement in future epic

### 2. Framework Limitations Not Caught in Planning

Story 2.3's unsaved changes warning only works for browser navigation. Next.js App Router doesn't expose router events for in-app navigation interception.

**Root Cause:** Framework research wasn't done pre-implementation

### 3. Infrastructure Story Added Mid-Epic (Again)

Just like Epic 1, we added an infrastructure story mid-epic. Story 2.9 (RLS Migration Fix) was necessary because the integration database had 21/22 tables missing RLS.

**Root Cause:**

- Migration 0015 existed but was never applied to integration DB
- `db:push` was used instead of `db:migrate`, losing RLS settings

### 4. Cross-Epic Story Dependencies

Stories 2.5 and 2.6 referenced Stories 3.2-3.5 for existing infrastructure. This suggests our epic boundaries may have overlapping concerns.

---

## Action Items

### ACTION ITEM #1: Pre-Epic Schema Audit

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| What             | Review data model completeness for all AC requirements before epic |
| Owner            | Charlie (Senior Dev)                                               |
| When             | Before Epic 3 story refinement                                     |
| Success Criteria | Zero "missing column" discoveries during implementation            |

**Checklist:**

- [ ] For each AC, verify required database columns exist
- [ ] Check junction tables have necessary relationships
- [ ] Validate foreign key constraints are defined
- [ ] Review indexes for query patterns

---

### ACTION ITEM #2: Framework Capability Research

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| What             | Research framework limitations before AC requiring behaviors |
| Owner            | Elena (Junior Dev)                                           |
| When             | During story refinement for Epic 3                           |
| Success Criteria | Known limitations documented before implementation           |

**Examples to Research:**

- [ ] Next.js App Router navigation interception
- [ ] Real-time updates (WebSockets vs SSE)
- [ ] File upload handling

---

### ACTION ITEM #3: Migration Protocol Enforcement

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| What             | Enforce `db:migrate` over `db:push` for all changes |
| Owner            | Charlie (Senior Dev)                                |
| When             | Immediately (already documented)                    |
| Success Criteria | Zero RLS gaps in any environment                    |

**Already Documented:** `docs/security-checklist.md` updated with RLS Migration Best Practices

---

## Lessons Learned

### Lesson 1: Schema Design Deserves Dedicated Planning Time

When ACs mention features (like "impact analysis for removed asset types"), verify the schema supports them. A 15-minute schema review prevents multi-story blockers.

### Lesson 2: Verification Before Implementation Saves Time

Stories 2.5 and 2.6 proved this again. Before writing new code, check if it already exists. Document gaps, add tests, move on.

### Lesson 3: Framework Research Belongs in Refinement

Next.js App Router limitations should have been discovered before Story 2.3 was committed. Add "framework capability verification" to the refinement checklist.

### Lesson 4: RLS is a First-Class Citizen

Story 2.9 fixed a critical security gap. The new `pnpm security:check-rls` command and Splinter integration ensure this won't recur.

### Lesson 5: Code Review Compounds Quality

9/9 stories had meaningful review findings. This isn't overhead - it's the safety net that catches ownership bugs, missing testids, and pattern violations.

---

## Technical Debt Carried Forward

| Gap                                        | Impact                           | Mitigation                                           |
| ------------------------------------------ | -------------------------------- | ---------------------------------------------------- |
| No `asset_type` column in portfolio_assets | Impact analysis returns empty    | Future story to add column + validation              |
| No `allocationAtTime` in investments       | Can't show historical allocation | Epic 7 investment analytics story                    |
| Unsaved changes only browser-level         | In-app nav won't warn            | Accept limitation or research App Router workarounds |
| Static exchange rates (MVP)                | Not real-time                    | Epic 6 external data integration                     |

---

## Epic 3 Readiness Assessment

### Ready

- Portfolio CRUD complete (create, view, edit, delete)
- Holdings management complete (add, edit, remove, ignore)
- Multi-currency display with exchange rate tooltips
- Investment history with filtering
- RLS enabled on all 22 tables
- Comprehensive test coverage (3,800+ unit tests)
- Consistent patterns established

### Watch Items for Epic 3

1. **Recommendation Engine Complexity** - Scoring algorithms may need performance optimization
2. **External Data Dependencies** - Asset price APIs not yet integrated
3. **Calculation Performance** - <100ms per asset requirement for scoring

### Recommended Pre-Epic 3 Actions

| #   | Action                                          | Owner       | Priority |
| --- | ----------------------------------------------- | ----------- | -------- |
| 1   | Execute schema audit for Epic 3 stories         | Charlie     | High     |
| 2   | Research scoring algorithm performance patterns | Charlie     | High     |
| 3   | Review Epic 3 story boundaries for dependencies | Bob + Alice | Medium   |
| 4   | Verify `asset_type` column needed for Epic 3    | Alice       | Medium   |

---

## Participants

- Bob (Scrum Master) - Facilitator
- Alice (Product Owner)
- Charlie (Senior Dev)
- Dana (QA Engineer)
- Elena (Junior Dev)
- Bmad (Project Lead)

---

## Sign-off

**Epic 2 Status:** COMPLETE
**Retrospective Status:** COMPLETE
**Ready for Epic 3:** YES (with recommended pre-work)

_Generated: 2025-12-29_
