import { describe, it, expect, vi, afterEach } from "vitest";

import {
  type LintResult,
  groupLintsBySeverity,
  filterExternalLints,
  formatLintResult,
  analyzeResults,
  fetchSplinterSQL,
} from "../../../scripts/check-splinter";

// =============================================================================
// Test Data
// =============================================================================

function createLintResult(overrides: Partial<LintResult> = {}): LintResult {
  return {
    name: "test_lint",
    title: "Test Lint",
    level: "WARN",
    facing: "EXTERNAL",
    categories: ["test"],
    description: "This is a test lint",
    detail: "Detail about the lint",
    remediation: "How to fix it",
    metadata: null,
    cache_key: "test_cache_key",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Supabase Splinter Database Linter", () => {
  describe("groupLintsBySeverity", () => {
    it("should group lints by severity level", () => {
      const lints: LintResult[] = [
        createLintResult({ name: "error1", level: "ERROR" }),
        createLintResult({ name: "warn1", level: "WARN" }),
        createLintResult({ name: "info1", level: "INFO" }),
        createLintResult({ name: "error2", level: "ERROR" }),
        createLintResult({ name: "warn2", level: "WARN" }),
      ];

      const grouped = groupLintsBySeverity(lints);

      expect(grouped.errors).toHaveLength(2);
      expect(grouped.warnings).toHaveLength(2);
      expect(grouped.infos).toHaveLength(1);
    });

    it("should return empty arrays when no lints of a level exist", () => {
      const lints: LintResult[] = [createLintResult({ name: "warn1", level: "WARN" })];

      const grouped = groupLintsBySeverity(lints);

      expect(grouped.errors).toHaveLength(0);
      expect(grouped.warnings).toHaveLength(1);
      expect(grouped.infos).toHaveLength(0);
    });

    it("should handle empty array input", () => {
      const grouped = groupLintsBySeverity([]);

      expect(grouped.errors).toHaveLength(0);
      expect(grouped.warnings).toHaveLength(0);
      expect(grouped.infos).toHaveLength(0);
    });
  });

  describe("filterExternalLints", () => {
    it("should filter to only EXTERNAL-facing lints", () => {
      const lints: LintResult[] = [
        createLintResult({ name: "external1", facing: "EXTERNAL" }),
        createLintResult({ name: "internal1", facing: "INTERNAL" }),
        createLintResult({ name: "external2", facing: "EXTERNAL" }),
        createLintResult({ name: "internal2", facing: "INTERNAL" }),
      ];

      const filtered = filterExternalLints(lints);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((l) => l.facing === "EXTERNAL")).toBe(true);
    });

    it("should return empty array when all lints are INTERNAL", () => {
      const lints: LintResult[] = [
        createLintResult({ name: "internal1", facing: "INTERNAL" }),
        createLintResult({ name: "internal2", facing: "INTERNAL" }),
      ];

      const filtered = filterExternalLints(lints);

      expect(filtered).toHaveLength(0);
    });

    it("should return all lints when all are EXTERNAL", () => {
      const lints: LintResult[] = [
        createLintResult({ name: "external1", facing: "EXTERNAL" }),
        createLintResult({ name: "external2", facing: "EXTERNAL" }),
      ];

      const filtered = filterExternalLints(lints);

      expect(filtered).toHaveLength(2);
    });
  });

  describe("formatLintResult", () => {
    it("should format a lint result with all fields", () => {
      const lint = createLintResult({
        name: "rls_disabled",
        title: "RLS Disabled",
        description: "Table has RLS disabled",
        detail: "Table: users",
        remediation: "Enable RLS on the table",
      });

      const formatted = formatLintResult(lint);

      expect(formatted).toContain("[rls_disabled]");
      expect(formatted).toContain("RLS Disabled");
      expect(formatted).toContain("Table has RLS disabled");
      expect(formatted).toContain("Detail: Table: users");
      expect(formatted).toContain("Fix: Enable RLS on the table");
    });

    it("should format a lint result without detail", () => {
      const lint = createLintResult({
        name: "no_primary_key",
        title: "No Primary Key",
        description: "Table lacks primary key",
        detail: "",
        remediation: "Add a primary key",
      });

      const formatted = formatLintResult(lint);

      expect(formatted).toContain("[no_primary_key]");
      expect(formatted).toContain("No Primary Key");
      expect(formatted).not.toContain("Detail:");
      expect(formatted).toContain("Fix: Add a primary key");
    });

    it("should format a lint result without remediation", () => {
      const lint = createLintResult({
        name: "unused_index",
        title: "Unused Index",
        description: "Index is never used",
        detail: "Index: idx_users_email",
        remediation: "",
      });

      const formatted = formatLintResult(lint);

      expect(formatted).toContain("[unused_index]");
      expect(formatted).toContain("Unused Index");
      expect(formatted).toContain("Detail:");
      expect(formatted).not.toContain("Fix:");
    });

    it("should apply prefix to all lines", () => {
      const lint = createLintResult({
        name: "test",
        title: "Test",
        description: "Description",
        detail: "Detail",
        remediation: "Fix",
      });

      const formatted = formatLintResult(lint, "  ");

      const lines = formatted.split("\n");
      expect(lines.every((line) => line.startsWith("  "))).toBe(true);
    });
  });

  describe("analyzeResults", () => {
    it("should analyze results with errors (failed)", () => {
      const lints: LintResult[] = [
        createLintResult({ level: "ERROR", facing: "EXTERNAL" }),
        createLintResult({ level: "WARN", facing: "EXTERNAL" }),
        createLintResult({ level: "INFO", facing: "EXTERNAL" }),
        createLintResult({ level: "WARN", facing: "INTERNAL" }), // Should be filtered
      ];

      const result = analyzeResults(lints);

      expect(result.total).toBe(4);
      expect(result.external).toBe(3);
      expect(result.grouped.errors).toHaveLength(1);
      expect(result.grouped.warnings).toHaveLength(1);
      expect(result.grouped.infos).toHaveLength(1);
      expect(result.passed).toBe(false);
    });

    it("should analyze results without errors (passed)", () => {
      const lints: LintResult[] = [
        createLintResult({ level: "WARN", facing: "EXTERNAL" }),
        createLintResult({ level: "INFO", facing: "EXTERNAL" }),
        createLintResult({ level: "INFO", facing: "INTERNAL" }),
      ];

      const result = analyzeResults(lints);

      expect(result.total).toBe(3);
      expect(result.external).toBe(2);
      expect(result.grouped.errors).toHaveLength(0);
      expect(result.grouped.warnings).toHaveLength(1);
      expect(result.grouped.infos).toHaveLength(1);
      expect(result.passed).toBe(true);
    });

    it("should pass with empty results", () => {
      const result = analyzeResults([]);

      expect(result.total).toBe(0);
      expect(result.external).toBe(0);
      expect(result.grouped.errors).toHaveLength(0);
      expect(result.grouped.warnings).toHaveLength(0);
      expect(result.grouped.infos).toHaveLength(0);
      expect(result.passed).toBe(true);
    });

    it("should filter INTERNAL errors (only EXTERNAL errors fail)", () => {
      const lints: LintResult[] = [
        createLintResult({ level: "ERROR", facing: "INTERNAL" }), // Filtered
        createLintResult({ level: "WARN", facing: "EXTERNAL" }),
      ];

      const result = analyzeResults(lints);

      expect(result.total).toBe(2);
      expect(result.external).toBe(1);
      expect(result.grouped.errors).toHaveLength(0);
      expect(result.grouped.warnings).toHaveLength(1);
      expect(result.passed).toBe(true);
    });
  });

  describe("Real-world lint scenarios", () => {
    it("should handle rls_disabled_in_public lint", () => {
      const lint = createLintResult({
        name: "rls_disabled_in_public",
        title: "RLS is disabled for table in public schema",
        level: "ERROR",
        facing: "EXTERNAL",
        categories: ["security"],
        description: "Row Level Security is disabled for a table in the public schema",
        detail: "Table: public.portfolios",
        remediation: 'ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;',
      });

      const result = analyzeResults([lint]);

      expect(result.passed).toBe(false);
      expect(result.grouped.errors).toHaveLength(1);
      expect(result.grouped.errors[0]?.name).toBe("rls_disabled_in_public");
    });

    it("should handle unindexed_foreign_keys lint", () => {
      const lint = createLintResult({
        name: "unindexed_foreign_keys",
        title: "Foreign key without index",
        level: "WARN",
        facing: "EXTERNAL",
        categories: ["performance"],
        description: "Foreign key column lacks an index",
        detail: "Column: portfolios.user_id references users.id",
        remediation: 'CREATE INDEX ON "portfolios" ("user_id");',
      });

      const result = analyzeResults([lint]);

      expect(result.passed).toBe(true); // WARN doesn't fail
      expect(result.grouped.warnings).toHaveLength(1);
    });

    it("should handle multiple lints of different types", () => {
      const lints: LintResult[] = [
        createLintResult({
          name: "rls_disabled_in_public",
          level: "ERROR",
          facing: "EXTERNAL",
        }),
        createLintResult({
          name: "unindexed_foreign_keys",
          level: "WARN",
          facing: "EXTERNAL",
        }),
        createLintResult({
          name: "unused_index",
          level: "INFO",
          facing: "EXTERNAL",
        }),
        createLintResult({
          name: "internal_check",
          level: "ERROR",
          facing: "INTERNAL",
        }),
      ];

      const result = analyzeResults(lints);

      expect(result.total).toBe(4);
      expect(result.external).toBe(3);
      expect(result.passed).toBe(false);
      expect(result.grouped.errors).toHaveLength(1);
      expect(result.grouped.warnings).toHaveLength(1);
      expect(result.grouped.infos).toHaveLength(1);
    });
  });

  describe("fetchSplinterSQL", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should throw on non-ok response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(fetchSplinterSQL()).rejects.toThrow("Failed to fetch splinter.sql: Not Found");
    });

    it("should return text content on success", async () => {
      const mockSQL = "SELECT * FROM lints;";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockSQL),
      });

      const result = await fetchSplinterSQL();

      expect(result).toBe(mockSQL);
    });

    it("should throw on network timeout (AbortError)", async () => {
      global.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));

      await expect(fetchSplinterSQL()).rejects.toThrow("Aborted");
    });
  });
});
