/**
 * Export Service Unit Tests
 *
 * Story 2.7: Data Export
 *
 * Tests for export service functions:
 * - AC-2.7.2: ZIP contains portfolio.json, criteria.json, history.json, README.txt
 * - AC-2.7.4: Data is formatted/indented JSON (human-readable)
 * - AC-2.7.4: Includes schema version for future compatibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AdmZip from "adm-zip";

// Mock archiver with factory function that uses dynamic import
vi.mock("archiver", async () => {
  const { EventEmitter } = await import("events");
  const AdmZipModule = await import("adm-zip");
  const AdmZipClass = AdmZipModule.default;

  return {
    default: vi.fn(() => {
      const emitter = new EventEmitter();
      const files: Array<{ content: string; name: string }> = [];

      return {
        on: emitter.on.bind(emitter),
        append: vi.fn((content: string, options: { name: string }) => {
          files.push({ content, name: options.name });
        }),
        finalize: vi.fn(() => {
          // Simulate archiver creating a ZIP buffer
          const zip = new AdmZipClass();
          files.forEach((file) => {
            zip.addFile(file.name, Buffer.from(file.content, "utf8"));
          });
          const buffer = zip.toBuffer();

          // Emit data and end events
          emitter.emit("data", buffer);
          emitter.emit("end");
        }),
      };
    }),
  };
});

// Import after mocks are set up
import {
  generateUserExport,
  createZipArchive,
  generateReadme,
  getPortfolioData,
  getCriteriaData,
  getHistoryData,
  EXPORT_SCHEMA_VERSION,
  type ExportData,
} from "@/lib/services/export-service";

describe("Export Service", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("EXPORT_SCHEMA_VERSION", () => {
    it("should be version 1.0.0", () => {
      expect(EXPORT_SCHEMA_VERSION).toBe("1.0.0");
    });
  });

  describe("generateReadme", () => {
    it("should include the export date", () => {
      const date = "2025-12-02T12:00:00.000Z";
      const readme = generateReadme(date);

      expect(readme).toContain(`Exported: ${date}`);
    });

    it("should include the schema version (AC-2.7.4)", () => {
      const readme = generateReadme("2025-12-02T12:00:00.000Z");

      expect(readme).toContain(`Schema Version: ${EXPORT_SCHEMA_VERSION}`);
    });

    it("should include file descriptions", () => {
      const readme = generateReadme("2025-12-02T12:00:00.000Z");

      expect(readme).toContain("portfolio.json");
      expect(readme).toContain("criteria.json");
      expect(readme).toContain("history.json");
    });

    it("should include data format information", () => {
      const readme = generateReadme("2025-12-02T12:00:00.000Z");

      expect(readme).toContain("ISO 8601");
      expect(readme).toContain("numeric strings");
    });
  });

  describe("getPortfolioData", () => {
    it("should return empty array (placeholder until Epic 3)", async () => {
      const result = await getPortfolioData(mockUserId);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getCriteriaData", () => {
    it("should return empty array (placeholder until Epic 5)", async () => {
      const result = await getCriteriaData(mockUserId);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getHistoryData", () => {
    it("should return empty array (placeholder until Story 3.8)", async () => {
      const result = await getHistoryData(mockUserId);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("createZipArchive", () => {
    const mockExportData: ExportData = {
      portfolio: [],
      criteria: [],
      history: [],
      exportedAt: "2025-12-02T12:00:00.000Z",
      schemaVersion: EXPORT_SCHEMA_VERSION,
    };

    it("should return a Buffer", async () => {
      const result = await createZipArchive(mockExportData);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("should create a valid ZIP file (AC-2.7.2)", async () => {
      const result = await createZipArchive(mockExportData);
      const zip = new AdmZip(result);
      const entries = zip.getEntries();

      expect(entries.length).toBe(4);
    });

    it("should include portfolio.json (AC-2.7.2)", async () => {
      const result = await createZipArchive(mockExportData);
      const zip = new AdmZip(result);

      const entry = zip.getEntry("portfolio.json");
      expect(entry).toBeDefined();

      const content = entry!.getData().toString("utf8");
      expect(JSON.parse(content)).toEqual([]);
    });

    it("should include criteria.json (AC-2.7.2)", async () => {
      const result = await createZipArchive(mockExportData);
      const zip = new AdmZip(result);

      const entry = zip.getEntry("criteria.json");
      expect(entry).toBeDefined();

      const content = entry!.getData().toString("utf8");
      expect(JSON.parse(content)).toEqual([]);
    });

    it("should include history.json (AC-2.7.2)", async () => {
      const result = await createZipArchive(mockExportData);
      const zip = new AdmZip(result);

      const entry = zip.getEntry("history.json");
      expect(entry).toBeDefined();

      const content = entry!.getData().toString("utf8");
      expect(JSON.parse(content)).toEqual([]);
    });

    it("should include README.txt (AC-2.7.2)", async () => {
      const result = await createZipArchive(mockExportData);
      const zip = new AdmZip(result);

      const entry = zip.getEntry("README.txt");
      expect(entry).toBeDefined();

      const content = entry!.getData().toString("utf8");
      expect(content).toContain("Investments Planner");
      expect(content).toContain(EXPORT_SCHEMA_VERSION);
    });

    it("should format JSON with 2-space indentation (AC-2.7.4)", async () => {
      const dataWithContent: ExportData = {
        portfolio: [
          {
            id: "p1",
            name: "Test Portfolio",
            baseCurrency: "USD",
            assets: [],
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        criteria: [],
        history: [],
        exportedAt: "2025-12-02T12:00:00.000Z",
        schemaVersion: EXPORT_SCHEMA_VERSION,
      };

      const result = await createZipArchive(dataWithContent);
      const zip = new AdmZip(result);

      const entry = zip.getEntry("portfolio.json");
      const content = entry!.getData().toString("utf8");

      // Check for 2-space indentation (line should start with 2 spaces)
      expect(content).toContain("  ");
      // Verify it's valid JSON
      const parsed = JSON.parse(content);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("Test Portfolio");
    });
  });

  describe("generateUserExport", () => {
    it("should return a Buffer", async () => {
      const result = await generateUserExport(mockUserId);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("should create a ZIP with all 4 files (AC-2.7.2)", async () => {
      const result = await generateUserExport(mockUserId);
      const zip = new AdmZip(result);
      const entries = zip.getEntries();
      const fileNames = entries.map((e) => e.entryName);

      expect(fileNames).toContain("portfolio.json");
      expect(fileNames).toContain("criteria.json");
      expect(fileNames).toContain("history.json");
      expect(fileNames).toContain("README.txt");
    });

    it("should include schema version in export data (AC-2.7.4)", async () => {
      const result = await generateUserExport(mockUserId);
      const zip = new AdmZip(result);

      const readme = zip.getEntry("README.txt")!.getData().toString("utf8");
      expect(readme).toContain(EXPORT_SCHEMA_VERSION);
    });

    it("should handle empty data gracefully", async () => {
      // Even with no data, export should succeed with empty arrays
      const result = await generateUserExport(mockUserId);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const zip = new AdmZip(result);
      const portfolio = JSON.parse(zip.getEntry("portfolio.json")!.getData().toString("utf8"));
      expect(portfolio).toEqual([]);
    });
  });

  // ==========================================================================
  // CSV EXPORT TESTS
  // Story 3.9: Investment History View
  // AC-3.9.4: CSV Export Functionality
  // ==========================================================================

  describe("exportInvestmentsToCSV", () => {
    // Import the function for testing from csv-export (client-safe module)
    let exportInvestmentsToCSV: typeof import("@/lib/services/csv-export").exportInvestmentsToCSV;

    beforeEach(async () => {
      const exportModule = await import("@/lib/services/csv-export");
      exportInvestmentsToCSV = exportModule.exportInvestmentsToCSV;
    });

    const mockInvestments = [
      {
        id: "inv-1",
        userId: "user-123",
        portfolioId: "portfolio-456",
        assetId: "asset-789",
        symbol: "AAPL",
        quantity: "10.00000000",
        pricePerUnit: "150.0000",
        totalAmount: "1500.0000",
        currency: "USD",
        recommendedAmount: "1500.0000",
        investedAt: new Date("2024-12-01T10:00:00Z"),
        createdAt: new Date("2024-12-01T10:00:00Z"),
      },
      {
        id: "inv-2",
        userId: "user-123",
        portfolioId: "portfolio-456",
        assetId: "asset-790",
        symbol: "GOOGL",
        quantity: "5.00000000",
        pricePerUnit: "100.0000",
        totalAmount: "500.0000",
        currency: "USD",
        recommendedAmount: null,
        investedAt: new Date("2024-12-02T10:00:00Z"),
        createdAt: new Date("2024-12-02T10:00:00Z"),
      },
    ];

    it("should include header row with correct columns (AC-3.9.4)", () => {
      const csv = exportInvestmentsToCSV(mockInvestments);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Date,Symbol,Quantity,Price Per Unit,Total Amount,Currency,Recommended Amount"
      );
    });

    it("should export all investment data (AC-3.9.4)", () => {
      const csv = exportInvestmentsToCSV(mockInvestments);
      const lines = csv.split("\n");

      // Header + 2 data rows
      expect(lines.length).toBe(3);

      // First data row (most recent - Dec 2)
      expect(lines[1]).toContain("GOOGL");
      expect(lines[1]).toContain("5.00000000");
      expect(lines[1]).toContain("100.0000");
      expect(lines[1]).toContain("500.0000");
      expect(lines[1]).toContain("USD");

      // Second data row (Dec 1)
      expect(lines[2]).toContain("AAPL");
      expect(lines[2]).toContain("10.00000000");
      expect(lines[2]).toContain("150.0000");
      expect(lines[2]).toContain("1500.0000");
    });

    it("should sort investments by date descending", () => {
      const csv = exportInvestmentsToCSV(mockInvestments);
      const lines = csv.split("\n");

      // First data row should be Dec 2 (most recent)
      expect(lines[1]).toContain("2024-12-02");
      // Second data row should be Dec 1
      expect(lines[2]).toContain("2024-12-01");
    });

    it("should handle null recommended amount", () => {
      const csv = exportInvestmentsToCSV(mockInvestments);
      const lines = csv.split("\n");

      // GOOGL has null recommended amount - should be empty field
      const googlLine = lines[1];
      expect(googlLine).toContain("GOOGL");

      // Count commas - should have 6 (7 fields)
      const commaCount = (googlLine!.match(/,/g) || []).length;
      expect(commaCount).toBe(6);
    });

    it("should handle empty investments array", () => {
      const csv = exportInvestmentsToCSV([]);
      const lines = csv.split("\n");

      // Should only have header
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain("Date,Symbol");
    });

    it("should escape values containing commas", () => {
      const investmentWithComma = [
        {
          ...mockInvestments[0],
          symbol: "TEST,SYMBOL",
        },
      ];

      const csv = exportInvestmentsToCSV(investmentWithComma);

      // Symbol with comma should be quoted
      expect(csv).toContain('"TEST,SYMBOL"');
    });

    it("should escape values containing quotes", () => {
      const investmentWithQuote = [
        {
          ...mockInvestments[0],
          symbol: 'TEST"SYMBOL',
        },
      ];

      const csv = exportInvestmentsToCSV(investmentWithQuote);

      // Quote should be escaped as double quote, wrapped in quotes
      expect(csv).toContain('"TEST""SYMBOL"');
    });

    it("should format dates as YYYY-MM-DD", () => {
      const csv = exportInvestmentsToCSV(mockInvestments);

      expect(csv).toContain("2024-12-01");
      expect(csv).toContain("2024-12-02");
    });
  });
});
