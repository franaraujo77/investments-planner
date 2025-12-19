/**
 * Alert Detection Service Unit Tests
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 *
 * AC-9.1.1: Alert triggered when better asset exists (10+ points higher)
 * AC-9.1.4: Alert deduplication for same asset pair
 * AC-9.1.6: Alert respects user preferences (opportunityAlertsEnabled)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlertDetectionService } from "@/lib/services/alert-detection-service";
import Decimal from "decimal.js";

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AlertDetectionService", () => {
  let service: AlertDetectionService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
  };
  let mockAlertService: {
    findExistingAlert: ReturnType<typeof vi.fn>;
    createOpportunityAlert: ReturnType<typeof vi.fn>;
    updateAlertIfChanged: ReturnType<typeof vi.fn>;
    findExistingDriftAlert: ReturnType<typeof vi.fn>;
    createDriftAlert: ReturnType<typeof vi.fn>;
    updateDriftAlertIfChanged: ReturnType<typeof vi.fn>;
    dismissAlert: ReturnType<typeof vi.fn>;
  };
  let mockPreferencesService: {
    isOpportunityAlertsEnabled: ReturnType<typeof vi.fn>;
    isDriftAlertsEnabled: ReturnType<typeof vi.fn>;
    getDriftThreshold: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      select: vi.fn(),
    };

    mockAlertService = {
      findExistingAlert: vi.fn(),
      createOpportunityAlert: vi.fn(),
      updateAlertIfChanged: vi.fn(),
      findExistingDriftAlert: vi.fn(),
      createDriftAlert: vi.fn(),
      updateDriftAlertIfChanged: vi.fn(),
      dismissAlert: vi.fn(),
    };

    mockPreferencesService = {
      isOpportunityAlertsEnabled: vi.fn(),
      isDriftAlertsEnabled: vi.fn(),
      getDriftThreshold: vi.fn(),
    };

    service = new AlertDetectionService(
      mockDb as never,
      mockAlertService as never,
      mockPreferencesService as never
    );
  });

  describe("detectOpportunityAlerts", () => {
    describe("AC-9.1.6: Alert respects user preferences", () => {
      it("should skip detection if opportunity alerts are disabled", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(false);

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.userId).toBe("user-123");
        expect(result.portfolioId).toBe("portfolio-123");
        expect(result.classesAnalyzed).toBe(0);
        expect(result.assetsChecked).toBe(0);
        expect(result.alertsCreated).toBe(0);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
        expect(mockDb.select).not.toHaveBeenCalled();
      });

      it("should proceed with detection if opportunity alerts are enabled", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        // Mock empty portfolio
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.classesAnalyzed).toBe(0);
        expect(mockDb.select).toHaveBeenCalled();
      });
    });

    describe("AC-9.1.1: Alert triggered when better asset exists", () => {
      it("should return early when no portfolio assets found", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.classesAnalyzed).toBe(0);
        expect(result.assetsChecked).toBe(0);
        expect(result.alertsCreated).toBe(0);
      });

      it("should analyze each unique asset class", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        // Mock portfolio assets with 2 different classes
        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
          { assetId: "asset-2", symbol: "GOOG", classId: "class-1", className: "US Stocks" },
          { assetId: "asset-3", symbol: "BND", classId: "class-2", className: "Bonds" },
        ];

        // First select: portfolio assets
        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          // Second select (score for asset-1)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          // Third select (score for asset-2)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "75" }]),
                }),
              }),
            }),
          })
          // Fourth select (score for asset-3)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "60" }]),
                }),
              }),
            }),
          })
          // Fifth select (exclude IDs for class-1)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }, { assetId: "asset-2" }]),
            }),
          })
          // Sixth select (other assets in class-1) - empty
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          })
          // Seventh select (exclude IDs for class-2)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-3" }]),
            }),
          })
          // Eighth select (other assets in class-2) - empty
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.classesAnalyzed).toBe(2);
        expect(result.assetsChecked).toBe(3);
      });

      it("should skip assets without classId (unclassified)", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        // Mock portfolio assets - one without classId
        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
          { assetId: "asset-2", symbol: "UNKNOWN", classId: null, className: null },
        ];

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          // Score for asset-1
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          // Exclude IDs query
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }]),
            }),
          })
          // Other assets query - empty
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        // Only 1 class analyzed (unclassified asset skipped)
        expect(result.classesAnalyzed).toBe(1);
        // Only 1 asset checked (unclassified skipped because no classId)
        expect(result.assetsChecked).toBe(1);
      });
    });

    describe("AC-9.1.4: Alert deduplication", () => {
      it("should skip creating alert if existing alert found and no significant change", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        // Mock portfolio with one asset
        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
        ];

        // Mock other asset that scores higher
        const otherAssets = [{ assetId: "asset-2", symbol: "VOO" }];

        mockDb.select
          // Portfolio assets
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          // Score for asset-1: 70
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          // Exclude IDs
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }]),
            }),
          })
          // Other assets in class
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(otherAssets),
              }),
            }),
          })
          // Score for other asset: 85 (15 points higher - triggers alert)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "85" }]),
                }),
              }),
            }),
          });

        // Mock existing alert found
        mockAlertService.findExistingAlert.mockResolvedValue({ id: "existing-alert" });
        // Mock no significant change (returns null)
        mockAlertService.updateAlertIfChanged.mockResolvedValue(null);

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.alertsCreated).toBe(0);
        expect(result.alertsUpdated).toBe(0);
        expect(result.alertsSkipped).toBe(1);
        expect(mockAlertService.findExistingAlert).toHaveBeenCalledWith(
          "user-123",
          "asset-1",
          "asset-2"
        );
        expect(mockAlertService.createOpportunityAlert).not.toHaveBeenCalled();
      });

      it("should update alert if significant score change detected", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
        ];
        const otherAssets = [{ assetId: "asset-2", symbol: "VOO" }];

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(otherAssets),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "90" }]),
                }),
              }),
            }),
          });

        // Mock existing alert found
        mockAlertService.findExistingAlert.mockResolvedValue({ id: "existing-alert" });
        // Mock significant change (returns updated alert)
        mockAlertService.updateAlertIfChanged.mockResolvedValue({ id: "existing-alert" });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.alertsCreated).toBe(0);
        expect(result.alertsUpdated).toBe(1);
        expect(result.alertsSkipped).toBe(0);
      });

      it("should create new alert if no existing alert found", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
        ];
        const otherAssets = [{ assetId: "asset-2", symbol: "VOO" }];

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(otherAssets),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "85" }]),
                }),
              }),
            }),
          });

        // Mock no existing alert
        mockAlertService.findExistingAlert.mockResolvedValue(null);
        // Mock successful creation
        mockAlertService.createOpportunityAlert.mockResolvedValue({ id: "new-alert" });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.alertsCreated).toBe(1);
        expect(result.alertsUpdated).toBe(0);
        expect(result.alertsSkipped).toBe(0);
        expect(mockAlertService.createOpportunityAlert).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({ id: "asset-1", symbol: "AAPL" }),
          expect.objectContaining({ id: "asset-2", symbol: "VOO" }),
          expect.objectContaining({ id: "class-1", name: "US Stocks" })
        );
      });
    });

    describe("Score threshold checks", () => {
      it("should NOT create alert when score difference is less than 10 points", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
        ];
        const otherAssets = [{ assetId: "asset-2", symbol: "VOO" }];

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(otherAssets),
              }),
            }),
          })
          // Score difference is only 5 points (below 10 threshold)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "75" }]),
                }),
              }),
            }),
          });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.alertsCreated).toBe(0);
        expect(mockAlertService.findExistingAlert).not.toHaveBeenCalled();
        expect(mockAlertService.createOpportunityAlert).not.toHaveBeenCalled();
      });

      it("should create alert when score difference is exactly 10 points", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
        ];
        const otherAssets = [{ assetId: "asset-2", symbol: "VOO" }];

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(otherAssets),
              }),
            }),
          })
          // Score difference is exactly 10 points (threshold)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "80" }]),
                }),
              }),
            }),
          });

        mockAlertService.findExistingAlert.mockResolvedValue(null);
        mockAlertService.createOpportunityAlert.mockResolvedValue({ id: "new-alert" });

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.alertsCreated).toBe(1);
      });

      it("should select highest scoring alternative when multiple better assets exist", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(true);

        const portfolioAssets = [
          { assetId: "asset-1", symbol: "AAPL", classId: "class-1", className: "US Stocks" },
        ];
        // Multiple better alternatives
        const otherAssets = [
          { assetId: "asset-2", symbol: "VOO" },
          { assetId: "asset-3", symbol: "VTI" },
        ];

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(portfolioAssets),
                }),
              }),
            }),
          })
          // User asset score: 70
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "70" }]),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ assetId: "asset-1" }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(otherAssets),
              }),
            }),
          })
          // VOO score: 85
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "85" }]),
                }),
              }),
            }),
          })
          // VTI score: 90 (highest)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ score: "90" }]),
                }),
              }),
            }),
          });

        mockAlertService.findExistingAlert.mockResolvedValue(null);
        mockAlertService.createOpportunityAlert.mockResolvedValue({ id: "new-alert" });

        await service.detectOpportunityAlerts("user-123", "portfolio-123");

        // Should create alert with VTI (highest score)
        expect(mockAlertService.createOpportunityAlert).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({ id: "asset-1", symbol: "AAPL" }),
          expect.objectContaining({ id: "asset-3", symbol: "VTI", score: expect.any(Decimal) }),
          expect.objectContaining({ id: "class-1", name: "US Stocks" })
        );
      });
    });

    describe("Error handling", () => {
      it("should capture error message and return result with error", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockRejectedValue(
          new Error("Database connection failed")
        );

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.error).toBe("Database connection failed");
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      });

      it("should handle non-Error exceptions", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockRejectedValue("Unknown failure");

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(result.error).toBe("Unknown error");
      });
    });

    describe("Result metrics", () => {
      it("should track duration in milliseconds", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(false);

        const result = await service.detectOpportunityAlerts("user-123", "portfolio-123");

        expect(typeof result.durationMs).toBe("number");
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      });

      it("should return correct userId and portfolioId", async () => {
        mockPreferencesService.isOpportunityAlertsEnabled.mockResolvedValue(false);

        const result = await service.detectOpportunityAlerts("user-abc", "portfolio-xyz");

        expect(result.userId).toBe("user-abc");
        expect(result.portfolioId).toBe("portfolio-xyz");
      });
    });
  });

  // ===========================================================================
  // DRIFT ALERT DETECTION TESTS (Story 9.2: Allocation Drift Alert)
  // ===========================================================================

  describe("detectDriftAlerts", () => {
    describe("AC-9.2.5: Alert respects user preferences", () => {
      it("should skip detection if drift alerts are disabled", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(false);

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(result.userId).toBe("user-123");
        expect(result.portfolioId).toBe("portfolio-123");
        expect(result.classesAnalyzed).toBe(0);
        expect(result.alertsCreated).toBe(0);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
        expect(mockDb.select).not.toHaveBeenCalled();
      });

      it("should proceed with detection if drift alerts are enabled", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(true);
        mockPreferencesService.getDriftThreshold.mockResolvedValue("5.00");

        // Mock no asset classes with targets
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(result.classesAnalyzed).toBe(0);
        expect(mockDb.select).toHaveBeenCalled();
      });
    });

    describe("AC-9.2.4: Uses user configured drift threshold", () => {
      it("should fetch user drift threshold from preferences", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(true);
        mockPreferencesService.getDriftThreshold.mockResolvedValue("7.50");

        // Mock no asset classes
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(mockPreferencesService.getDriftThreshold).toHaveBeenCalledWith("user-123");
      });
    });

    describe("AC-9.2.1: Alert when allocation drifts outside target range", () => {
      it("should return early when no asset classes have target ranges", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(true);
        mockPreferencesService.getDriftThreshold.mockResolvedValue("5.00");

        // No asset classes with target ranges
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(result.classesAnalyzed).toBe(0);
        expect(result.alertsCreated).toBe(0);
      });

      it("should return early when portfolio has no value", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(true);
        mockPreferencesService.getDriftThreshold.mockResolvedValue("5.00");

        // Mock asset classes with targets
        const assetClasses = [
          {
            id: "class-1",
            name: "US Stocks",
            targetMin: "40",
            targetMax: "50",
            userId: "user-123",
          },
        ];

        mockDb.select
          // First call: get asset classes
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(assetClasses),
            }),
          })
          // Second call: get portfolio assets (empty portfolio)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          });

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        // Classes were loaded but no value to calculate
        expect(result.classesAnalyzed).toBe(0);
        expect(result.alertsCreated).toBe(0);
      });
    });

    describe("AC-9.2.6: Auto-dismiss when allocation returns to range", () => {
      it("should dismiss existing alert when allocation is back in range", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(true);
        mockPreferencesService.getDriftThreshold.mockResolvedValue("5.00");

        const assetClasses = [
          {
            id: "class-1",
            name: "US Stocks",
            targetMin: "40",
            targetMax: "50",
            userId: "user-123",
          },
        ];

        // Portfolio with 45% in class-1 (within range 40-50%)
        const portfolioAssets = [
          { assetClassId: "class-1", quantity: "4500", purchasePrice: "1" },
          { assetClassId: "class-2", quantity: "5500", purchasePrice: "1" }, // Total = 10000
        ];

        const existingAlert = { id: "drift-alert-123" };

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(assetClasses),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(portfolioAssets),
            }),
          });

        // Mock finding existing alert
        mockAlertService.findExistingDriftAlert.mockResolvedValue(existingAlert);
        mockAlertService.dismissAlert.mockResolvedValue({ ...existingAlert, isDismissed: true });

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(result.classesAnalyzed).toBe(1);
        expect(result.alertsDismissed).toBe(1);
        expect(mockAlertService.dismissAlert).toHaveBeenCalledWith("user-123", "drift-alert-123");
      });
    });

    describe("AC-9.2.7: Deduplication - no duplicate for same asset class", () => {
      it("should check for existing alert before creating new one", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(true);
        mockPreferencesService.getDriftThreshold.mockResolvedValue("5.00");

        const assetClasses = [
          {
            id: "class-1",
            name: "US Stocks",
            targetMin: "40",
            targetMax: "50",
            userId: "user-123",
          },
        ];

        // Portfolio with 65% in class-1 (over-allocated by 15%, above 5% threshold)
        const portfolioAssets = [
          { assetClassId: "class-1", quantity: "6500", purchasePrice: "1" },
          { assetClassId: "class-2", quantity: "3500", purchasePrice: "1" },
        ];

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(assetClasses),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(portfolioAssets),
            }),
          });

        // No existing alert
        mockAlertService.findExistingDriftAlert.mockResolvedValue(null);
        mockAlertService.createDriftAlert.mockResolvedValue({ id: "new-drift-alert" });

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(mockAlertService.findExistingDriftAlert).toHaveBeenCalledWith("user-123", "class-1");
        expect(result.alertsCreated).toBe(1);
      });

      it("should update existing alert if drift changed significantly", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(true);
        mockPreferencesService.getDriftThreshold.mockResolvedValue("5.00");

        const assetClasses = [
          {
            id: "class-1",
            name: "US Stocks",
            targetMin: "40",
            targetMax: "50",
            userId: "user-123",
          },
        ];

        const portfolioAssets = [
          { assetClassId: "class-1", quantity: "7000", purchasePrice: "1" }, // 70% - significant change
          { assetClassId: "class-2", quantity: "3000", purchasePrice: "1" },
        ];

        const existingAlert = { id: "drift-alert-123" };

        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(assetClasses),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(portfolioAssets),
            }),
          });

        mockAlertService.findExistingDriftAlert.mockResolvedValue(existingAlert);
        mockAlertService.updateDriftAlertIfChanged.mockResolvedValue({
          id: "drift-alert-123",
          updated: true,
        });

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(mockAlertService.updateDriftAlertIfChanged).toHaveBeenCalled();
        expect(result.alertsUpdated).toBe(1);
      });
    });

    describe("Error handling", () => {
      it("should capture error and return result with error message", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockRejectedValue(
          new Error("Database connection failed")
        );

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(result.error).toBe("Database connection failed");
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      });

      it("should handle non-Error exceptions", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockRejectedValue("Unknown failure");

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(result.error).toBe("Unknown error");
      });
    });

    describe("Result metrics", () => {
      it("should track duration in milliseconds", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(false);

        const result = await service.detectDriftAlerts("user-123", "portfolio-123");

        expect(typeof result.durationMs).toBe("number");
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      });

      it("should return correct userId and portfolioId", async () => {
        mockPreferencesService.isDriftAlertsEnabled.mockResolvedValue(false);

        const result = await service.detectDriftAlerts("user-abc", "portfolio-xyz");

        expect(result.userId).toBe("user-abc");
        expect(result.portfolioId).toBe("portfolio-xyz");
      });
    });
  });
});
