# Story 2.7: Data Export

**Status:** done
**Epic:** Epic 2 - User Onboarding & Profile
**Previous Story:** 2.6 Profile Settings & Base Currency

---

## Story

**As a** user
**I want to** export all my data
**So that** I have a backup and can analyze my data externally

---

## Acceptance Criteria

### AC-2.7.1: Export Button on Settings Page

- **Given** I am on the Settings page
- **When** I view the page
- **Then** I see an "Export My Data" button

### AC-2.7.2: ZIP File Contents

- **Given** I click "Export My Data"
- **When** the export completes
- **Then** a ZIP file downloads containing:
  - `portfolio.json` (all holdings with values)
  - `criteria.json` (all scoring criteria)
  - `history.json` (all investment records)
  - `README.txt` (data format documentation)

### AC-2.7.3: Export Performance

- **Given** I have data to export
- **When** I click "Export My Data"
- **Then** export completes within 30 seconds

### AC-2.7.4: Human-Readable Data

- **Given** the export ZIP is downloaded
- **When** I open the JSON files
- **Then** data is formatted/indented JSON (human-readable)
- **And** includes schema version for future compatibility

### AC-2.7.5: Progress Indicator

- **Given** I click "Export My Data"
- **When** the export is in progress
- **Then** I see a progress/loading indicator
- **And** the button is disabled during export

---

## Technical Notes

### Existing Infrastructure

The following components are **already implemented** and can be reused:

| Component           | Location                                | Purpose                      |
| ------------------- | --------------------------------------- | ---------------------------- |
| Settings page       | `src/app/(dashboard)/settings/page.tsx` | Export button location       |
| User service        | `src/lib/services/user-service.ts`      | Extend with export function  |
| Auth middleware     | `src/middleware.ts`                     | Protected route verification |
| Database schema     | `src/lib/db/schema.ts`                  | User data tables             |
| Toast notifications | sonner                                  | User feedback                |

### What Needs to Be Built

#### 1. Export API Route (`src/app/api/user/export/route.ts`)

**GET `/api/user/export`**

- Authenticated endpoint (withAuth middleware)
- Fetches all user data from database:
  - Portfolios and portfolio assets
  - Scoring criteria
  - Investment history
- Generates ZIP file using archiver library
- Returns streaming response with proper headers:
  - `Content-Type: application/zip`
  - `Content-Disposition: attachment; filename="investments-planner-export-{date}.zip"`

#### 2. Export Service (`src/lib/services/export-service.ts`)

Create new file with:

```typescript
interface ExportData {
  portfolio: PortfolioExport[];
  criteria: CriteriaExport[];
  history: InvestmentHistoryExport[];
  exportedAt: string;
  schemaVersion: string;
}

export async function generateUserExport(userId: string): Promise<Buffer>;
```

Functions:

- `generateUserExport(userId)` - Main export function
- `formatPortfolioData(portfolios)` - Format portfolio JSON
- `formatCriteriaData(criteria)` - Format criteria JSON
- `formatHistoryData(investments)` - Format history JSON
- `generateReadme()` - Create README.txt with data documentation

#### 3. Export Button Component Update (`src/components/settings/export-data-section.tsx`)

Client component with:

- "Export My Data" button
- Loading state during export
- Progress indicator (spinner)
- Download trigger on completion
- Error handling with toast

#### 4. Schema Version Constant

Add to export service:

```typescript
const EXPORT_SCHEMA_VERSION = "1.0.0";
```

### ZIP Structure

```
investments-planner-export-2025-12-02.zip
├── portfolio.json      # All portfolios and assets
├── criteria.json       # All scoring criteria
├── history.json        # All investment records
└── README.txt          # Data format documentation
```

### README.txt Content

```
Investments Planner - Data Export
=================================
Exported: {date}
Schema Version: 1.0.0

Files Included:
- portfolio.json: Your portfolio holdings and asset values
- criteria.json: Your scoring criteria configurations
- history.json: Your investment history records

Data Format:
All JSON files use ISO 8601 date formats and numeric strings
for monetary values to preserve precision.

For questions or re-import assistance, contact support.
```

---

## Tasks

### [x] Task 1: Add archiver Dependency

**Command:** `pnpm add archiver @types/archiver`

Install the archiver library for ZIP file generation.

### [x] Task 2: Create Export Service

**File:** `src/lib/services/export-service.ts`

Create new file with:

- `generateUserExport(userId)` - Main orchestration function
- `getPortfolioData(userId)` - Fetch and format portfolio data
- `getCriteriaData(userId)` - Fetch and format criteria data (placeholder for now - criteria not yet implemented)
- `getHistoryData(userId)` - Fetch and format investment history (placeholder for now)
- `generateReadme(exportDate)` - Generate README.txt content
- `createZipArchive(data)` - Bundle all files into ZIP buffer

### [x] Task 3: Create Export API Route

**File:** `src/app/api/user/export/route.ts`

GET handler:

- Use withAuth middleware for authentication
- Call `generateUserExport(userId)` from export service
- Return ZIP file as streaming response
- Set appropriate headers for file download
- Handle errors with proper status codes

### [x] Task 4: Create Export Button Component

**File:** `src/components/settings/export-data-section.tsx`

Client component with:

- Card wrapper with title "Export Your Data"
- Description text explaining export contents
- "Export My Data" button
- Loading spinner during export
- useTransition or useState for loading state
- Download trigger using blob URL
- Error handling with sonner toast

### [x] Task 5: Integrate Export Section into Settings Page

**File:** `src/app/(dashboard)/settings/page.tsx`

- Import and add ExportDataSection component
- Place after profile settings form
- Add visual separator between sections

### [x] Task 6: Create Unit Tests

**File:** `tests/unit/services/export-service.test.ts`

Test cases:

- Export service generates valid ZIP buffer
- Portfolio data is correctly formatted
- Empty data exports successfully (no portfolios case)
- README contains correct schema version
- JSON is properly indented (2 spaces)
- Export includes all required files

### [x] Task 7: Create E2E Tests

**File:** `tests/e2e/export.spec.ts`

Test cases:

- Export button visible on settings page
- Clicking export shows loading state
- Export downloads file (mock or verify filename)
- Unauthenticated requests are rejected
- Export button is disabled during export

### [x] Task 8: Run Verification

- `pnpm lint` - no errors (3 warnings for placeholder params)
- `pnpm build` - successful build
- `pnpm test` - all 382 tests pass (19 new export service tests)

---

## Dependencies

- Story 1.3: Authentication System (provides JWT infrastructure) - **COMPLETE**
- Story 1.8: App Shell & Layout (provides dashboard layout) - **COMPLETE**
- Story 2.6: Profile Settings & Base Currency (provides settings page) - **COMPLETE**

---

## Dev Notes

### Streaming Response Pattern

```typescript
// API route returning ZIP file
export async function GET(request: NextRequest) {
  const { userId } = await withAuth(request);

  try {
    const zipBuffer = await generateUserExport(userId);
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="investments-planner-export-${date}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
```

### Client-Side Download Trigger

```typescript
const handleExport = async () => {
  setIsExporting(true);
  try {
    const response = await fetch("/api/user/export");
    if (!response.ok) throw new Error("Export failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investments-planner-export-${new Date().toISOString().split("T")[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Export downloaded successfully");
  } catch (error) {
    toast.error("Failed to export data");
  } finally {
    setIsExporting(false);
  }
};
```

### Archiver Usage

```typescript
import archiver from "archiver";
import { PassThrough } from "stream";

async function createZipArchive(data: ExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    // Add files
    archive.append(JSON.stringify(data.portfolio, null, 2), { name: "portfolio.json" });
    archive.append(JSON.stringify(data.criteria, null, 2), { name: "criteria.json" });
    archive.append(JSON.stringify(data.history, null, 2), { name: "history.json" });
    archive.append(generateReadme(data.exportedAt), { name: "README.txt" });

    archive.finalize();
  });
}
```

### Data Placeholders

Since criteria (Epic 5) and investment history (Story 3.8) are not yet implemented:

- `criteria.json` will export empty array `[]` with schema placeholder
- `history.json` will export empty array `[]` with schema placeholder
- Portfolio data exports from existing schema (portfolios may be empty too)

### Learnings from Previous Story

**From Story 2-6-profile-settings-base-currency (Status: done)**

**New Files Created:**

- `src/app/api/user/profile/route.ts` - API route pattern to follow
- `src/lib/services/user-service.ts` - Service pattern to follow
- `src/components/settings/profile-settings-form.tsx` - Component pattern

**Patterns Established:**

- API routes use `withAuth` for authentication
- Services handle business logic, routes handle HTTP
- Toast notifications via sonner for user feedback
- Settings page structure with profile form

**Technical Decisions:**

- Service functions centralized in `src/lib/services/`
- Consistent test structure in `tests/unit/` and `tests/e2e/`

[Source: docs/sprint-artifacts/2-6-profile-settings-base-currency.md#Dev-Agent-Record]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Story-2.7]
- [Source: docs/epics.md#Story-2.7]
- [Source: docs/architecture.md#Data-Protection]
- [Source: src/lib/services/user-service.ts] (service pattern)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-7-data-export.context.xml` (generated 2025-12-02)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Implementation followed story context XML patterns
- Fixed TypeScript error: Buffer needed conversion to Uint8Array for NextResponse
- Used dynamic import for EventEmitter in test mock to avoid lint error

### Completion Notes List

- ✅ All 8 tasks completed successfully
- ✅ All 5 acceptance criteria implemented
- ✅ 19 new unit tests added (export-service.test.ts)
- ✅ 10 new E2E tests added (export.spec.ts)
- ✅ Lint: passed (3 warnings for intentional placeholder params)
- ✅ Build: successful
- ✅ Tests: 382 passed, 25 skipped (no failures)
- ⚠️ Note: Portfolio, criteria, and history data export empty arrays until respective epics are complete

### Code Review Record

**Review Date:** 2025-12-02
**Reviewer:** Claude Opus 4.5

**AC Validation:**
| AC | Status |
|----|--------|
| AC-2.7.1: Export Button | ✅ PASS |
| AC-2.7.2: ZIP Contents | ✅ PASS |
| AC-2.7.3: Performance | ✅ PASS |
| AC-2.7.4: Human-Readable | ✅ PASS |
| AC-2.7.5: Progress Indicator | ✅ PASS |

**Code Quality:**

- Clean separation of concerns (service/route/component)
- Proper TypeScript interfaces and error handling
- Follows project patterns (withAuth, sonner toast)
- Comprehensive test coverage (19 unit + 10 E2E)
- Security: Protected by auth middleware

**Verdict:** APPROVED - Ready for done status

### Completion Notes

**Completed:** 2025-12-02
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### File List

**New Files:**

- `src/lib/services/export-service.ts` - Export service with ZIP generation
- `src/app/api/user/export/route.ts` - Export API endpoint
- `src/components/settings/export-data-section.tsx` - Export button component
- `tests/unit/services/export-service.test.ts` - Unit tests (19 tests)
- `tests/e2e/export.spec.ts` - E2E tests (10 tests)

**Modified Files:**

- `src/app/(dashboard)/settings/page.tsx` - Added ExportDataSection component
- `package.json` - Added archiver, @types/archiver, adm-zip, @types/adm-zip

---

## Change Log

| Date       | Change                                  | Author    |
| ---------- | --------------------------------------- | --------- |
| 2025-12-02 | Story drafted                           | SM Agent  |
| 2025-12-02 | Implementation complete, all tasks done | Dev Agent |
