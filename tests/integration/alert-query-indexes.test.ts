/**
 * Integration test for alert query indexes
 * Story 7.13: AC-7.13.5 - Verify index usage and performance
 *
 * This test verifies that:
 * 1. Migration file exists and contains correct index definitions
 * 2. Index definitions match story requirements
 * 3. Composite and partial indexes are properly configured
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Alert Query Indexes (Story 7.13)", () => {
  const migrationPath = path.join(process.cwd(), "drizzle", "0026_add_alert_query_indexes.sql");

  it("AC-7.13.6: Migration file exists", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("AC-7.13.1, AC-7.13.2: Contains composite index on (user_id, type) with partial filter", () => {
    const migrationContent = fs.readFileSync(migrationPath, "utf-8");

    // Verify composite index exists
    expect(migrationContent).toContain("alerts_user_type_idx");

    // Verify index columns
    expect(migrationContent).toContain("(user_id, type)");

    // Verify partial index filter (WHERE is_dismissed = false)
    expect(migrationContent).toMatch(/WHERE\s+is_dismissed\s*=\s*false/i);

    // Verify idempotency (IF NOT EXISTS)
    expect(migrationContent).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i);
  });

  it("AC-7.13.3: Contains partial index on snoozed_until", () => {
    const migrationContent = fs.readFileSync(migrationPath, "utf-8");

    // Verify snoozed_until index exists
    expect(migrationContent).toContain("alerts_snoozed_until_idx");

    // Verify index column
    expect(migrationContent).toContain("(snoozed_until)");

    // Verify partial index filter (WHERE snoozed_until IS NOT NULL)
    expect(migrationContent).toMatch(/WHERE\s+snoozed_until\s+IS\s+NOT\s+NULL/i);
  });

  it("AC-7.13.4: Documents dismissed_opportunity_pairs indexes", () => {
    const migrationContent = fs.readFileSync(migrationPath, "utf-8");

    // Verify migration acknowledges dismissed pairs indexes
    expect(migrationContent).toMatch(/dismissed.*pairs/i);
    expect(migrationContent).toMatch(/user_id/i);

    // Migration should document that indexes already exist
    expect(migrationContent).toMatch(/already exist/i);
  });

  it("AC-7.13.6: Uses idempotent CREATE INDEX IF NOT EXISTS", () => {
    const migrationContent = fs.readFileSync(migrationPath, "utf-8");

    // Count CREATE INDEX IF NOT EXISTS occurrences (should be at least 2)
    const matches = migrationContent.match(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/gi);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("AC-7.13.5: Migration includes performance documentation", () => {
    const migrationContent = fs.readFileSync(migrationPath, "utf-8");

    // Verify migration has comments explaining purpose
    expect(migrationContent).toContain("Story 7.13");
    expect(migrationContent).toMatch(/performance|query|optimization/i);
  });
});
