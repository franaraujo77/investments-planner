# Epic 3 Retrospective: Visual Allocation Feedback

**Date:** 2025-12-31
**Facilitator:** Bob (Scrum Master)
**Epic Status:** COMPLETE (7/7 stories done)

---

## Epic Summary

| Metric               | Value                         |
| -------------------- | ----------------------------- |
| Stories Planned      | 7                             |
| Stories Completed    | 7                             |
| Scope Change         | 0% (no stories added/removed) |
| Code Reviews         | 7/7 completed                 |
| Test Count           | 3,883 → 4,318+ (+435 tests)   |
| Production Incidents | 0                             |
| Known Limitations    | 1 documented                  |

### Stories Delivered

| Story | Title                                 | Type                                |
| ----- | ------------------------------------- | ----------------------------------- |
| 3.1   | Allocation Pie Chart Component        | Verification + Enhancement          |
| 3.2   | Live Allocation Indicator             | New Implementation                  |
| 3.3   | Allocation Validation                 | New Implementation (infrastructure) |
| 3.4   | Visual Status Feedback                | New Implementation                  |
| 3.5   | Onboarding Tips                       | New Implementation (full system)    |
| 3.6   | Strategy Allocation Overview Chart    | New Implementation                  |
| 3.7   | Strategy Allocation Balance Indicator | New Implementation                  |

---

## What Went Well

### 1. Verification Story Pattern Continues to Pay Off

Story 3.1 discovered that AllocationPieChart already existed. Instead of rebuilding, we verified, enhanced accessibility, and moved on.

**Evidence:**

- Story 3.1: Component pre-existed, added ARIA labels and tooltips
- Story 3.3: Built infrastructure ahead of form integration needs

### 2. Reusable Component Patterns Excelled

The `AllocationIndicator` component from Story 3.2 became the foundation for multiple subsequent components:

| Base Component        | Extended By                          | Story |
| --------------------- | ------------------------------------ | ----- |
| `AllocationIndicator` | `FormValidityIndicator`              | 3.3   |
| `AllocationIndicator` | `AllocationHealthIndicator`          | 3.4   |
| `AllocationIndicator` | `StrategyAllocationBalanceIndicator` | 3.7   |

Shared utilities (`getState()`, `getStateStyles()`, `ALLOCATION_FP_TOLERANCE`) enabled consistent behavior across all components.

### 3. Code Review Catching Real Issues

Every story had meaningful code review findings:

| Story | Issues Found | Examples                                   |
| ----- | ------------ | ------------------------------------------ |
| 3.1   | 3 issues     | i18n hardcoded locale, missing animation   |
| 3.2   | 5 issues     | Component not integrated, missing tests    |
| 3.3   | 4 issues     | Placeholder tests, missing dialog tests    |
| 3.4   | 6 issues     | Unused props, missing role="alert"         |
| 3.5   | 5 issues     | Missing OnboardingWrapper integrations     |
| 3.6   | 3 issues     | Duplicate API fetches, local formatPercent |
| 3.7   | 6 issues     | Empty file list, missing completion notes  |

### 4. Comprehensive Test Coverage

+435 tests added across the epic:

- Unit tests for all components and hooks
- Integration tests for API endpoints
- E2E tests for user flows
- Edge case coverage (floating-point, empty states, boundaries)

### 5. Onboarding Infrastructure Created

Story 3.5 built a complete onboarding system:

- Database schema (JSONB column for dismissed tips)
- Service layer with CRUD operations
- React context provider
- Custom hook with localStorage caching
- Reusable OnboardingTip component
- Settings page integration for reset

---

## What Didn't Go Well

### 1. Recurring i18n Formatting Violations

4 out of 7 stories had i18n issues caught in code review:

| Story | Issue                                                |
| ----- | ---------------------------------------------------- |
| 3.1   | `formatValue()` used hardcoded 'en-US' locale        |
| 3.2   | Similar formatting issues                            |
| 3.6   | Local `formatPercent` instead of `useNumberFormat()` |
| 3.8   | Hardcoded locale in investment history               |

**Root Cause:** Developers reaching for vanilla JavaScript formatting (`toFixed()`, `toLocaleString()`) instead of project hook.

### 2. Components Created But Not Integrated

Stories 3.2 and 3.5 had components that weren't wired into the actual app:

- Story 3.2: `AllocationIndicator` created but not rendered anywhere
- Story 3.5: `OnboardingWrapper` created but not integrated into target components

**Root Cause:** No explicit "integration task" in story structure.

### 3. TypeScript Strictness Friction

Multiple stories hit `exactOptionalPropertyTypes` issues:

- Passing `undefined` explicitly to optional props
- Required conditional prop building instead of spread

### 4. Infrastructure Built Ahead of Need

Story 3.3 built allocation validation components, but:

- Portfolio edit form doesn't have allocation % inputs
- Strategy forms use min/max ranges, not 100% totals
- Tasks 5-6 marked N/A

**Note:** This is acceptable - infrastructure ready for future use.

---

## Action Items

### ACTION ITEM #1: Automated i18n Formatting Enforcement ✅ COMPLETED

| Field            | Value                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| What             | Create ESLint rule + pre-commit hook to block hardcoded number/currency formatting |
| Owner            | Charlie (ESLint rule) + Dana (pre-commit hook)                                     |
| When             | Before Epic 4 starts                                                               |
| Success Criteria | Zero i18n formatting violations reach code review                                  |
| Status           | **COMPLETED 2025-12-31**                                                           |

**Completed Scope:**

- [x] ESLint rule in `eslint.config.mjs` flagging `toFixed()`, `toLocaleString()`, direct `Intl.NumberFormat` in components
- [x] Rule shows clear message suggesting `useNumberFormat()` hook as fix
- [x] Pre-commit hook already configured via `lint-staged` in `package.json`
- [x] Documented in CLAUDE.md (PR Review Checklist, Common Issues table, i18n section)

**Files Modified:**

- `eslint.config.mjs` - Added i18n formatting enforcement rule
- `CLAUDE.md` - Added documentation and checklist items

---

### ACTION ITEM #2: Story Template - Component Integration Task ✅ COMPLETED

| Field            | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| What             | Update story template to include mandatory integration task for new components |
| Owner            | Bob (SM) + Alice (PO)                                                          |
| When             | Before Epic 4 story creation                                                   |
| Success Criteria | Zero 'component not integrated' findings in code review                        |
| Status           | **COMPLETED 2025-12-31**                                                       |

**Completed Updates:**

- [x] Updated `_bmad/bmm/workflows/4-implementation/create-story/template.md` with component integration task template
- [x] Updated `_bmad/bmm/workflows/4-implementation/create-story/checklist.md` with integration verification checks
- [x] Added to "Critical Mistakes to Prevent" list
- [x] Added specific gap analysis section 3.1.1 for component integration

**Template Addition:**

```markdown
### Task N: Component Integration (AC: X.X.X)

- [ ] Subtask N.1: Import [ComponentName] into target page/feature
- [ ] Subtask N.2: Verify component renders in UI (visual check)
- [ ] Subtask N.3: Add E2E test confirming component visibility
- [ ] Subtask N.4: Update barrel exports if applicable
```

**Trigger:** Any story creating a new UI component

---

## Previous Epic Action Item Follow-Through

| Action Item                    | Owner   | Status    | Evidence                                                    |
| ------------------------------ | ------- | --------- | ----------------------------------------------------------- |
| Pre-Epic Schema Audit          | Charlie | COMPLETED | Zero 'missing column' issues in Epic 3                      |
| Framework Capability Research  | Elena   | AS-NEEDED | No major surprises; will research when specific needs arise |
| Migration Protocol Enforcement | Charlie | COMPLETED | `pnpm security:check-rls` in CI, no RLS gaps                |

---

## Lessons Learned

### Lesson 1: Automated Enforcement Beats Manual Vigilance

The recurring i18n violations prove that documentation and code review alone aren't enough. ESLint rules and pre-commit hooks catch issues at the source.

### Lesson 2: Story Templates Should Encode Best Practices

Adding explicit integration tasks to story templates prevents "component not used" issues. Process changes are more reliable than memory.

### Lesson 3: Patterns Compound When Designed for Reuse

The `AllocationIndicator` pattern (`getState()`, `getStateStyles()`, exported utilities) enabled 4 components to share consistent behavior. Invest in reusable foundations.

### Lesson 4: Building Infrastructure Ahead of Need is Acceptable

Story 3.3's validation components await future forms. This is fine - the infrastructure is tested and ready.

### Lesson 5: Code Review is a Quality Multiplier

7/7 stories had meaningful findings. This isn't overhead - it's the safety net catching i18n violations, missing integrations, and pattern deviations.

---

## Technical Debt Carried Forward

| Gap                              | Impact                                            | Mitigation                    |
| -------------------------------- | ------------------------------------------------- | ----------------------------- |
| Story 3.3 components await forms | Validation unused until allocation % inputs exist | Ready for Epic 4+ integration |
| TypeScript strictness friction   | Developer experience                              | Team familiarity improving    |

---

## Epic 4 Readiness Assessment

### Ready

- Strategy page infrastructure complete (Stories 3.6, 3.7)
- `useAllocationSummary` hook available for allocation range config
- `AllocationIndicator` pattern ready for reuse
- Onboarding system ready for new feature tips
- Comprehensive test patterns established
- +435 tests added, 4,318+ total

### Dependencies on Epic 3

| Epic 4 Story                        | Depends On                          |
| ----------------------------------- | ----------------------------------- |
| 4-2: Allocation Range Configuration | Story 3.3 validation components     |
| 4-2: Allocation Range Configuration | Story 3.7 balance indicator         |
| All stories                         | Story 3.5 onboarding infrastructure |

### Watch Items for Epic 4

1. **Scoring Algorithm Complexity** - Stories 4.3-4.6 involve calculations requiring careful testing
2. **Schema Design** - Verify criteria configuration schema before implementation
3. **Integration Points** - Story 3.3 components finally get integrated

### Recommended Pre-Epic 4 Actions

| #   | Action                                          | Owner          | Priority |
| --- | ----------------------------------------------- | -------------- | -------- |
| 1   | Complete Action Item #1 (ESLint + pre-commit)   | Charlie + Dana | High     |
| 2   | Complete Action Item #2 (story template update) | Bob + Alice    | High     |
| 3   | Schema review for scoring criteria stories      | Charlie        | Medium   |

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

**Epic 3 Status:** COMPLETE
**Retrospective Status:** COMPLETE
**Ready for Epic 4:** YES (with action items to complete first)

_Generated: 2025-12-31_
