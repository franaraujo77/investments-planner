# Project Management Definitions

## 1. Management Project

**Definition:** A project is a collection of issues. Your project might be a software project, a marketing campaign, a helpdesk system, or a project to build a new office. It's a home for a collection of work that can be configured to match the needs of your team.

**Purpose and Use Case:** A Project acts as a container for all the work items (issues) that your team needs to accomplish a specific goal. It provides a centralized space to organize, track, and manage work from start to finish. Different types of projects can be created, such as "Software" for development teams or "Work Management" for business teams.

**How it fits in the hierarchy:** The Project is the highest-level container for work within Jira. It holds all the Epics, Stories, and Tasks related to a specific initiative or team.

**Key Characteristics:**

- **Configurable:** Can be customized with specific workflows, issue types, and fields to match a team's process.
- **Permission-based:** Access and capabilities within a project can be controlled at a granular level.
- **Reporting:** Offers built-in reporting and dashboards to track progress and performance.

**Example:** A "Mobile App Development" project would contain all the epics, stories, and tasks related to building a new mobile application.

## 2. Epic

**Official Atlassian Definition:** An epic is a large body of work that can be broken down into a number of smaller stories. An epic is a large user story that can be broken down into a number of smaller stories. It can take several sprints to complete an epic.

**Purpose and Use Case:** Epics are used to organize work and create a hierarchy. They help teams break down large, complex features or initiatives into more manageable pieces. This allows for a clearer roadmap and better tracking of progress on major goals.

**How it fits in the hierarchy:** An Epic sits below the Project level and above the Story level. A single Epic will contain multiple Stories (and their associated Tasks).

**Key Characteristics:**

- **Large Scope:** Represents a significant feature or body of work.
- **Goal-Oriented:** Tied to a high-level customer need or business objective.
- **Spans Multiple Sprints:** Typically too large to be completed in a single sprint.

**Example:** For a new e-commerce website, an Epic might be "User Account Management". This would encompass all the smaller user stories related to creating an account, logging in, resetting a password, and managing a user profile.

## 3. Story (User Story)

**Official Atlassian Definition:** A user story is the smallest unit of work in an agile framework. It's an informal, general explanation of a software feature written from the perspective of the end user or customer.

**Purpose and Use Case:** The purpose of a user story is to articulate how a piece of work will deliver a particular value back to the customer. They are the primary items that a development team will work on during a sprint.

**How it fits in the hierarchy:** A Story is a child of an Epic and is broken down into one or more Tasks.

**Key Characteristics:**

- **User-centric:** Written from the user's perspective, typically in the format: "As a [persona], I want to [action], so that I can [benefit]."
- **Small and Estimable:** Should be small enough to be completed within a single sprint.
- **Vertical Slice:** Represents a small, self-contained piece of functionality that is valuable to the user.

**Example:** Within the "User Account Management" epic, a Story might be: "As a new user, I want to create an account using my email address, so that I can make a purchase."

## 4. Task

**Official Atlassian Definition:** A task is a specific, actionable item of work that needs to be done. In Jira, tasks are one of the default issue types.

**Purpose and Use Case:** Tasks are used to break down the work within a Story into the individual steps required to complete it. They are the most granular level of work item and are assigned to individual team members.

**How it fits in the hierarchy:** A Task is a child of a Story. A Story is considered "done" when all of its associated Tasks are completed.

**Key Characteristics:**

- **Technical:** Often represents a technical step required to implement a user story (e.g., "Create the database table for users").
- **Assignable:** Can be assigned to a single person.
- **Specific:** Describes a single, well-defined piece of work.

**Example:** For the story "As a new user, I want to create an account...", some tasks might be:

- "Design the account creation UI."
- "Build the front-end form."
- "Create the back-end API endpoint for account creation."
- "Write the unit tests for the account creation service."

**Status Workflow:** Tasks (and all issue types) progress through the following states:

- **To Do:** Not yet started
- **Blocked:** Cannot proceed due to dependencies or impediments
- **Doing:** Currently in progress
- **Reviewing:** Completed and awaiting review
- **Done:** Completed and approved

**Estimation:** Use **Function Points** to estimate the size and complexity of Stories and Tasks. Function Point Analysis is a standardized method for measuring software size from a user's perspective, independent of technology and programming language.

## Hierarchy Summary

```
Project
└── Epic
    └── Story (User Story)
        └── Task
    └── Bug (can be attached at any level)

Sprint (time-boxed iteration)
└── Contains Issues (Epic, Story, Task, Bug) from any Project
```

## 5. Bug

**Definition:** A bug is a defect or error in the system that causes incorrect or unexpected behavior. Bugs can be discovered at any stage of development and may relate to any level of the hierarchy.

**Purpose and Use Case:** Bugs are used to track and resolve issues in the software. They help teams identify problems, prioritize fixes, and ensure quality throughout the development lifecycle.

**How it fits in the hierarchy:** A Bug can be associated with any level - Epic, Story, or Task - via the parent_issue_id field. Bugs are typically prioritized based on severity and impact.

**Key Characteristics:**

- **Defect-focused:** Describes something that is broken or not working as intended
- **Priority-driven:** Often prioritized by severity (Critical, High, Medium, Low)
- **Flexible placement:** Can be linked to the Epic, Story, or Task where the issue was discovered

**Example:** A bug might be: "Login fails with valid credentials on mobile Safari" and could be linked to the "User Authentication" story.

## 6. Sprint

**Definition:** A sprint is a time-boxed iteration of work, typically 1-4 weeks long, during which a team commits to completing a specific set of work items. This concept is central to Scrum and Agile methodologies.

**Purpose and Use Case:** Sprints provide a rhythm for planning, executing, and reviewing work. They help teams maintain focus, deliver incrementally, and adapt quickly to changing requirements.

**How it fits in the system:** Sprints are independent containers that can hold Issues (Epics, Stories, Tasks, Bugs) from any Project. Issues not assigned to a Sprint are in the Backlog.

**Key Characteristics:**

- **Time-boxed:** Has fixed start and end dates (typically 1-4 weeks, 2 weeks is most common)
- **Sequential:** Sprints are numbered sequentially (Sprint 1, Sprint 2, Sprint 3, ...)
- **Single Active Sprint:** Only ONE sprint can have Status = "Open" at any time
- **Status-driven:** Either "Open" (active) or "Closed" (completed)
- **Capacity-planned:** Issues are selected based on team capacity (Function Points)

**Sprint States:**

- **Open:** The sprint is currently active; this is where the team focuses their work
- **Closed:** The sprint has ended; work is complete and retrospective is done

**Example:** "Sprint 1" might run from January 1 to January 14 (2 weeks) with Status = "Open", containing 5 Stories totaling 34 Function Points.

# Refinement Guidelines

## Refining Stories from Epic Descriptions

When breaking down epics into stories, consider these key factors:

### Key Considerations

| Factor                      | Criteria & Considerations                                                                                             | Best Practices                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **User-Centricity**         | - Who is the user? (new user, returning customer, admin) <br> - What is their goal? <br> - Why do they want to do it? | - Write stories as: "As a [user], I want to [action], so that [benefit]" <br> - Use personas for different user types               |
| **Value Delivery**          | - Does this story deliver tangible user benefit? <br> - Can we release this story independently?                      | - Focus on vertical slicing: thin slice of full functionality <br> - Avoid horizontal slicing (e.g., "build database," "create UI") |
| **Size & Estimability**     | - Can it be completed in a single sprint? <br> - Can the team confidently estimate effort?                            | - Use INVEST criteria: Independent, Negotiable, Valuable, Estimable, Small, Testable <br> - Split further if too large              |
| **Acceptance Criteria**     | - What conditions must be met for "done"? <br> - Are criteria specific and testable?                                  | - Use Given/When/Then format <br> - Make each criterion verifiable <br> - Focus on "what," not "how"                                |
| **Clarity & Understanding** | - Is the story unambiguous? <br> - Does everyone understand the requirements?                                         | - Hold backlog refinement sessions <br> - Use story mapping to visualize user journey                                               |
| **Dependencies**            | - Are there dependencies between stories? <br> - Can dependencies be minimized?                                       | - Identify and document dependencies <br> - Prioritize to address dependencies early                                                |

### Story Splitting Techniques

- **Workflow Steps:** Break down by sequential user steps
- **Business Rule Variations:** Separate stories for different rules
- **Happy Path vs. Error Handling:** Separate ideal flow from edge cases
- **CRUD Operations:** Break down by Create, Read, Update, Delete
- **User Roles:** Create stories for different user types

## Working with Bugs

### Bug Characteristics

Bugs differ from Stories and Tasks in several ways:

- **Reactive vs. Proactive:** Bugs are discovered issues, not planned features
- **Priority by Severity:** Critical bugs (production down) take precedence over planned work
- **Flexible Hierarchy:** Can be linked to Epic, Story, or Task where discovered
- **Root Cause Focus:** Should identify what's broken and why

### Bug Workflow

1. **Discovery:** Bug is identified through testing, monitoring, or user reports
2. **Documentation:** Create bug with clear title, reproduction steps, and expected vs. actual behavior
3. **Triage:** Assign appropriate Priority (Critical/High/Medium/Low) based on impact
4. **Association:** Link to related Epic, Story, or Task via Parent Issue
5. **Resolution:** Progress through workflow (To Do → Doing → Reviewing → Done)
6. **Verification:** Ensure fix resolves the issue without introducing regressions

### Bug vs. Story Decision

When to create a Bug vs. a Story:

- **Bug:** Something that worked before is now broken, or implemented feature doesn't match acceptance criteria
- **Story:** New functionality, enhancement, or feature that was never implemented
- **Edge Case:** If discovered during initial development of a story, consider adding to Story's acceptance criteria rather than creating separate bug

## Sprint Planning and Management

### Sprint Fundamentals

**Sprint Duration:**

- Typical duration: 2 weeks (10 working days)
- Range: 1-4 weeks depending on team preference
- Consistency is key: Keep sprint duration fixed

**The One Open Sprint Rule:**

- Only ONE sprint can have Status = "Open" at any time
- Before opening a new sprint, close the previous sprint
- This ensures team focus on current work

**Backlog vs. Sprint:**

- **Backlog:** Issues with no Sprint assigned (sprint_id = null)
- **Sprint:** Issues assigned to a specific sprint

### Sprint Lifecycle

**1. Sprint Planning**

- **When:** At the start of each sprint
- **Activities:**
  - Close previous sprint (set Status = "Closed")
  - Create new sprint (Sprint N+1)
  - Review and prioritize backlog
  - Select issues for the sprint based on:
    - Team capacity (velocity from previous sprints)
    - Priority levels (Critical > High > Medium > Low)
    - Function Points estimates
    - Dependencies and technical considerations
  - Assign selected issues to the new sprint
  - Ensure all selected stories have clear acceptance criteria

**2. Daily Work**

- Focus on issues in the current sprint (Status = "Open")
- Move issues through workflow states
- Add urgent bugs to current sprint as needed
- Update blocked issues and create blocking relationships
- Collaborate on completing committed work

**3. Sprint Review**

- **When:** End of sprint
- **Activities:**
  - Demo completed work (Status = "Done")
  - Gather stakeholder feedback
  - Accept or reject completed stories

**4. Sprint Retrospective**

- **When:** End of sprint, after review
- **Activities:**
  - Discuss what went well
  - Identify improvement areas
  - Create action items for next sprint

**5. Sprint Closure**

- **When:** After review and retrospective
- **Activities:**
  - Handle incomplete issues:
    - Move to next sprint, OR
    - Return to backlog (clear Sprint assignment)
  - Calculate sprint velocity:
    - Sum Function Points of completed issues (Status = "Done")
  - Set sprint Status = "Closed"

### Backlog Management

**Backlog Prioritization:**

1. **Critical:** Production issues, blockers, security vulnerabilities
2. **High:** Important features, significant bugs
3. **Medium:** Standard features, minor bugs
4. **Low:** Nice-to-have features, cosmetic issues

**Backlog Refinement (Weekly):**

- Review and prioritize backlog items
- Break down large Epics into Stories
- Add acceptance criteria to Stories
- Estimate Function Points for Stories and Tasks
- Identify dependencies
- Remove or archive obsolete items

**Sprint Planning from Backlog:**

1. Filter issues by `Sprint is empty` to view backlog
2. Sort by Priority to identify most important items
3. Review Function Points estimates
4. Select items that fit team capacity
5. Assign selected items to the new sprint

### Velocity and Capacity Planning

**Velocity:**

- Sum of Function Points completed in a sprint
- Track over 3-5 sprints for accurate average
- Use average velocity for capacity planning

**Capacity Planning:**

- Calculate team's average velocity
- During sprint planning, select stories totaling ~90% of average velocity
- Leave 10% buffer for bugs and unplanned work
- Don't overcommit

**Example:**

- Average velocity: 40 Function Points
- Plan for: ~36 Function Points
- Buffer: ~4 Function Points for bugs/urgent items

### Sprint Metrics

**Key Metrics to Track:**

1. **Velocity:** Function Points completed per sprint
2. **Commitment vs. Completion:** Planned vs. actual completion
3. **Sprint Goal Achievement:** Were sprint goals met?
4. **Carry-over Rate:** % of issues moved to next sprint
5. **Bugs Added:** Number of bugs discovered during sprint

## Refining Tasks from Story Descriptions

When breaking down stories into tasks, consider these factors:

### Key Considerations

| Factor                          | Criteria & Considerations                                                                       | Best Practices                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Granularity**                 | - Can one person complete in 1-2 days? <br> - Is the task specific and actionable?              | - Break into smallest reasonable units <br> - Avoid vague tasks like "coding" or "testing"                           |
| **Technical Implementation**    | - What specific technical steps are required? <br> - What components need to be built/modified? | - Let development team lead task identification <br> - Encourage collaboration and discussion                        |
| **Acceptance Criteria Mapping** | - Which AC does this task address? <br> - Are all AC covered by tasks?                          | - Link each task to specific AC <br> - Ensure no AC is left unaddressed <br> - Verify tasks collectively meet all AC |
| **Testing & Quality**           | - What testing is required? <br> - How will quality be ensured?                                 | - Create specific tasks for writing tests <br> - Include code review and QA activities                               |
| **Definition of Done**          | - Does task breakdown meet DoD criteria? <br> - Are all DoD requirements covered?               | - Include all DoD requirements in task breakdown <br> - Make DoD criteria explicit                                   |
| **Clarity & Ownership**         | - Who is responsible for each task? <br> - Is the work clearly understood?                      | - Assign tasks to individuals or pairs <br> - Use task boards for status visibility                                  |

### Example Task Refinement

**Story:** "As a user, I want to log in with email and password to access my content"

**Acceptance Criteria:**

- Given I'm on the login page, when I enter valid credentials, then I'm redirected to dashboard
- Given I enter invalid credentials, when I submit, then I see error message
- Given I enter malformed email, when I submit, then I see validation error

**Tasks:**

- **Design:** Create login page wireframe and UI design
- **Backend:** Create authentication API endpoint with credential validation
- **Backend:** Implement JWT token generation for successful login
- **Frontend:** Build login form component with email/password fields
- **Frontend:** Implement API call logic and response handling
- **Frontend:** Add client-side validation for email format
- **Testing:** Write unit tests for authentication logic
- **Testing:** Write integration tests for login API
- **Testing:** Write end-to-end tests for login flow
- **Documentation:** Update API documentation for auth endpoint

## Best Practices for Acceptance Criteria

### Writing Effective Acceptance Criteria

**Good Acceptance Criteria:**

- Given I'm on the profile page, when I click "Upload Picture," then a file dialog appears
- Given I select a valid image (JPG/PNG, <2MB), when I click "Upload," then the new image displays within 2 seconds
- Given I upload an invalid file type, then I see "Invalid file type. Please upload JPG or PNG"

**Poor Acceptance Criteria:**

- The user can upload a profile picture (vague, not testable)
- The upload should be fast (not specific or measurable)
- The picture should look good (subjective, not verifiable)

### AC Guidelines

- **Be Specific:** Avoid ambiguous language
- **Make Testable:** Each criterion should be verifiable as true/false
- **Use Given/When/Then:** Structure for clarity
- **Focus on "What":** Describe outcome, not implementation
- **Collaborate:** Involve entire team in AC review and discussion

# Development Standards

## Test Requirements for All Code Changes

**MANDATORY POLICY:** Every code change (fix, feature, enhancement, or refactoring) MUST include appropriate test coverage. This applies to:

- Bug fixes discovered during retrospectives
- Issues identified during PR reviews
- New features and enhancements
- Refactoring and code improvements
- Security fixes and patches

### Test Coverage Requirements

| Change Type             | Required Tests                                    |
| ----------------------- | ------------------------------------------------- |
| **Bug Fix**             | Unit test reproducing the bug + verification test |
| **New Function/Method** | Unit tests for all code paths                     |
| **API Endpoint**        | Unit + Integration tests for success/error cases  |
| **Security Fix**        | Unit tests + specific security scenario tests     |
| **Refactoring**         | Ensure existing tests pass + add missing coverage |
| **Utility Functions**   | Comprehensive unit tests with edge cases          |

### Test Categories

1. **Unit Tests** (`tests/unit/`)
   - Test individual functions/methods in isolation
   - Mock external dependencies
   - Cover happy path, edge cases, and error handling
   - Located in matching directory structure (e.g., `src/lib/api/` → `tests/unit/api/`)

2. **Integration Tests** (`tests/integration/`)
   - Test component interactions
   - Verify API endpoint behavior end-to-end
   - Test error response formats and codes
   - May use mocked services but test real route handlers

3. **E2E Tests** (`tests/e2e/`)
   - Test complete user flows
   - Run in browser environment with Playwright
   - Cover critical user journeys

### Definition of Done - Test Checklist

Before marking any task as "Done," verify:

- [ ] All new code has corresponding unit tests
- [ ] All modified code has updated tests (if needed)
- [ ] Tests cover success cases
- [ ] Tests cover error cases and edge cases
- [ ] Security-sensitive code has injection/validation tests
- [ ] All tests pass locally (`pnpm test`)
- [ ] No console.log/console.error in production code (use structured logger)

### Example: Applying Test Requirements to a Fix

**Scenario:** Fix identified in PR review - `console.error` used instead of structured logger

**Required Changes:**

1. Code fix: Replace `console.error` with `logger.error`
2. Unit test: Verify logger is called with correct parameters
3. Unit test: Verify error details are properly formatted

```typescript
// Example test for error handling
describe("withErrorHandling", () => {
  it("should log errors using structured logger", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Test error"));
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler();

    expect(logger.error).toHaveBeenCalledWith("API Error", {
      errorMessage: "Test error",
      errorName: "Error",
    });
  });
});
```

### Enforcement

- **PR Reviews:** Reviewers MUST verify test coverage before approval
- **CI Pipeline:** All tests must pass before merge
- **Code Review Checklist:** Include test verification as mandatory step
- **Retrospectives:** Track test coverage as a quality metric
