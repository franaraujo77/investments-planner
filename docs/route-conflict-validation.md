# Route Conflict Validation

**Story 7.15: Prevention of Next.js Routing Conflicts**

## Overview

This document describes the automated route conflict validation system that prevents Next.js routing conflicts during development. This system was created in response to a critical production outage caused by conflicting dynamic route parameter names.

## Background

### The Problem (Story 7.15)

Next.js requires all dynamic route parameters at the same path level to use **consistent naming**. When different parameter names are used at the same level, Next.js fails to build the route tree, causing:

- ❌ Server initialization failure
- ❌ All API routes become inaccessible
- ❌ Complete application outage

### Real-World Example

**Conflicting Structure (Causes Failure):**

```
/api/alerts/[alertId]/route.ts     ← Uses [alertId]
/api/alerts/[id]/dismiss/route.ts  ← Uses [id] (CONFLICT!)
/api/alerts/[id]/read/route.ts     ← Uses [id] (CONFLICT!)
```

**Error:**

```
Error: You cannot use different slug names for the same dynamic path ('alertId' !== 'id')
```

**Correct Structure:**

```
/api/alerts/[alertId]/route.ts         ← Uses [alertId]
/api/alerts/[alertId]/dismiss/route.ts ← Uses [alertId] (Consistent!)
/api/alerts/[alertId]/read/route.ts    ← Uses [alertId] (Consistent!)
```

## The Solution: Automated Validation

### Route Conflict Validator Script

**Location:** `scripts/check-route-conflicts.ts`

**What It Does:**

1. Scans entire `src/app/` directory tree recursively
2. Identifies all dynamic route segments (directories matching `[paramName]` pattern)
3. Groups dynamic routes by their parent path
4. Detects conflicts where multiple different parameter names exist at same level
5. Reports conflicts with detailed error messages and fix suggestions

### Usage

#### Manual Check

```bash
# Run route validation manually
pnpm check:routes
```

**Output on Success:**

```
🔍 Scanning routes in src/app...

Route Validation Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total route paths scanned: 15
Dynamic route segments: 12

✓ No conflicts detected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validation PASSED
```

**Output on Conflict Detection:**

```
🔍 Scanning routes in src/app...

Route Validation Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total route paths scanned: 16
Dynamic route segments: 13

❌ Found 1 conflict(s)

✗ Conflict detected
  Path: /api/alerts
  Conflicting parameters:
    • [alertId]
    • [id]

  Problem:
  Next.js requires all dynamic route parameters at the same path level
  to use the SAME parameter name. You have 2 different names.

  Solution:
  Choose ONE parameter name and rename all directories to use it.
  Example: Rename all to [alertId]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validation FAILED

Fix these conflicts before deploying to prevent production outages.
See Story 7.15 for context on why this is critical.
```

#### Automated Checks

The route validation runs automatically in the following scenarios:

**1. Pre-commit Hook** (via Husky)

```bash
# Runs automatically before git commit
pnpm precommit
# Executes: pnpm check:routes && pnpm lint
```

**2. CI Pipeline** (GitHub Actions)

The CI workflow (`.github/workflows/ci.yml`) includes route validation:

```yaml
- name: Check route conflicts (Story 7.15)
  run: pnpm check:routes
```

This runs on:

- Every push to `main` branch
- Every pull request targeting `main`

**3. Manual PR Review Checklist**

From `CLAUDE.md`:

```markdown
### Pre-Commit Verification

Run these commands before committing:

✓ pnpm check:routes # Route conflict validation (Story 7.15)
✓ pnpm exec tsc --noEmit # Type checking
✓ pnpm lint # Linting
✓ pnpm test # Unit tests
✓ pnpm build # Production build
```

## How the Validator Works

### Detection Algorithm

```typescript
1. Scan directory tree starting from src/app/
2. For each directory:
   a. Check if it matches dynamic route pattern: /^\[.*\]$/
   b. Extract parameter name: [alertId] → "alertId"
   c. Group by parent path
3. For each parent path:
   a. Collect all dynamic parameter names at that level
   b. If count > 1 → CONFLICT DETECTED
4. Report all conflicts with paths and parameter names
```

### Exit Codes

- **0:** Validation passed, no conflicts
- **1:** Conflicts detected
- **2:** Script error (filesystem access, etc.)

### Integration with Development Workflow

```
Developer writes code
    ↓
Git commit attempt
    ↓
Pre-commit hook runs (Husky)
    ↓
pnpm check:routes executes
    ↓
┌─────────────────┐
│ Conflicts?      │
└─────────────────┘
        │
        ├─ YES → Commit BLOCKED
        │        Error message displayed
        │        Developer must fix conflicts
        │
        └─ NO  → Commit proceeds
                 CI validation runs
                 Build continues
```

## Best Practices

### When Creating New Routes

1. **Check existing patterns first:**

   ```bash
   # List existing dynamic routes in the same area
   ls -la src/app/api/your-feature/
   ```

2. **Use consistent naming:**
   - If `[portfolioId]` exists, use `[portfolioId]` for sub-routes
   - Don't mix `[id]`, `[itemId]`, `[portfolioId]` at same level

3. **Run validation after creation:**
   ```bash
   pnpm check:routes
   ```

### Naming Conventions

From `architecture.md` and `CLAUDE.md`:

**API Route Parameters:** Use **camelCase** with descriptive names

✅ **Good Examples:**

- `[portfolioId]` - Clear, descriptive
- `[alertId]` - Consistent with domain
- `[assetId]` - Follows pattern

❌ **Bad Examples:**

- `[id]` - Too generic, causes conflicts
- `[alert_id]` - Wrong case (snake_case)
- `[AlertId]` - Wrong case (PascalCase)

### Directory Structure Example

**Correct Pattern:**

```
src/app/api/
├── portfolios/
│   ├── route.ts                          # GET/POST /api/portfolios
│   └── [portfolioId]/
│       ├── route.ts                      # GET/PUT/DELETE /api/portfolios/:id
│       ├── holdings/
│       │   └── route.ts                  # GET/POST /api/portfolios/:id/holdings
│       └── recommendations/
│           └── route.ts                  # GET /api/portfolios/:id/recommendations
└── alerts/
    ├── route.ts                          # GET/POST /api/alerts
    └── [alertId]/
        ├── route.ts                      # GET/PATCH /api/alerts/:id
        ├── read/
        │   └── route.ts                  # PATCH /api/alerts/:id/read
        └── dismiss/
            └── route.ts                  # PATCH /api/alerts/:id/dismiss
```

## Troubleshooting

### Common Issues

**Issue:** "Validation script not found"

**Solution:**

```bash
# Ensure script exists
ls -la scripts/check-route-conflicts.ts

# Ensure tsx is installed
pnpm install -D tsx
```

**Issue:** "Permission denied when running script"

**Solution:**

```bash
# Make script executable
chmod +x scripts/check-route-conflicts.ts

# Or run via npx
npx tsx scripts/check-route-conflicts.ts
```

**Issue:** "Conflicts detected but I don't see them"

**Solution:**

```bash
# The validator shows exact paths and parameter names
# Look for the "Path:" and "Conflicting parameters:" in output
# Example output tells you which directories to rename
```

### Fixing Detected Conflicts

**Step 1:** Identify the conflict from validator output

```
✗ Conflict detected
  Path: /api/alerts
  Conflicting parameters:
    • [alertId]
    • [id]
```

**Step 2:** Choose the canonical parameter name

- Use the most descriptive name
- Check which is used in more places
- Example: `[alertId]` is better than `[id]`

**Step 3:** Rename directories using git mv

```bash
cd src/app/api/alerts

# Rename [id] to [alertId]
git mv "[id]" "[alertId]-temp"  # Avoid conflicts with existing
git mv "[alertId]-temp" "[alertId]"  # Final rename

# Or if merging into existing [alertId]:
# Move subdirectories individually
git mv "[id]/read" "[alertId]/read"
git mv "[id]/dismiss" "[alertId]/dismiss"
rm -rf "[id]"  # After moving all contents
```

**Step 4:** Update route handlers

```typescript
// Update params.id → params.alertId in all moved files
// Example in dismiss/route.ts:

// BEFORE:
const alertIdResult = uuidSchema.safeParse(resolvedParams?.id);

// AFTER:
const alertIdResult = uuidSchema.safeParse(resolvedParams?.alertId);
```

**Step 5:** Verify fix

```bash
pnpm check:routes  # Should show "No conflicts detected"
pnpm exec tsc --noEmit  # Verify TypeScript types
pnpm build  # Verify production build succeeds
```

## Additional Resources

- **Story 7.15:** Full context on the production incident
- **Next.js Dynamic Routes:** https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- **Next.js Error Reference:** https://nextjs.org/docs/messages/conflicting-app-route-names
- **Architecture Doc:** `_bmad-output/planning-artifacts/architecture.md`
- **PR Checklist:** `CLAUDE.md`

## Version History

- **2026-01-04:** Initial version created as part of Story 7.15
  - Automated route conflict detection
  - Pre-commit hook integration
  - CI pipeline integration
  - Comprehensive documentation
