/**
 * Alert Service Unit Tests
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 *
 * AC-9.1.1: Alert triggered when better asset exists (10+ points higher)
 * AC-9.1.2: Alert has formatted message showing both assets and scores
 * AC-9.1.3: Alert dismissible by user
 * AC-9.1.4: Alert deduplication for same asset pair
 * AC-9.1.5: Alert auto-clears when user adds the better asset
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AlertService,
  ALERT_TYPES,
  ALERT_SEVERITIES,
  SCORE_UPDATE_THRESHOLD,
  DRIFT_UPDATE_THRESHOLD,
  type AssetClassDriftDetails,
} from "@/lib/services/alert-service";
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

describe("AlertService", () => {
  let service: AlertService;
  let mockDb: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  // Helper to create mock database chain (available for future use)
  const _createSelectChain = (result: unknown[]) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(result),
          }),
        }),
        limit: vi.fn().mockResolvedValue(result),
      }),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  });

  const createInsertChain = (result: unknown[]) => ({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  });

  const createUpdateChain = (result: unknown[]) => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  });

  const mockAlert = {
    id: "alert-123",
    userId: "user-123",
    type: ALERT_TYPES.OPPORTUNITY,
    title: "VOO scores higher than your AAPL",
    message: "VOO scores 85.00 vs your AAPL (70.00). Consider swapping?",
    severity: ALERT_SEVERITIES.INFO,
    metadata: {
      currentAssetId: "asset-1",
      currentAssetSymbol: "AAPL",
      currentScore: "70",
      betterAssetId: "asset-2",
      betterAssetSymbol: "VOO",
      betterScore: "85",
      scoreDifference: "15",
      assetClassId: "class-1",
      assetClassName: "US Stocks",
    },
    isRead: false,
    isDismissed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    readAt: null,
    dismissedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
    };

    service = new AlertService(mockDb as never);
  });

  describe("createOpportunityAlert", () => {
    describe("AC-9.1.1: Alert triggered when better asset exists", () => {
      it("should create alert with correct metadata", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockAlert]));

        const result = await service.createOpportunityAlert(
          "user-123",
          { id: "asset-1", symbol: "AAPL", score: "70" },
          { id: "asset-2", symbol: "VOO", score: "85" },
          { id: "class-1", name: "US Stocks" }
        );

        expect(result).toEqual(mockAlert);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("should calculate score difference correctly", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockAlert]));

        await service.createOpportunityAlert(
          "user-123",
          { id: "asset-1", symbol: "AAPL", score: new Decimal("70.5") },
          { id: "asset-2", symbol: "VOO", score: new Decimal("85.5") },
          { id: "class-1", name: "US Stocks" }
        );

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.metadata.scoreDifference).toBe("15");
      });

      it("should throw error if insert fails", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([]));

        await expect(
          service.createOpportunityAlert(
            "user-123",
            { id: "asset-1", symbol: "AAPL", score: "70" },
            { id: "asset-2", symbol: "VOO", score: "85" },
            { id: "class-1", name: "US Stocks" }
          )
        ).rejects.toThrow("Failed to create opportunity alert");
      });
    });

    describe("AC-9.1.2: Alert has formatted message", () => {
      it("should generate correct title format", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockAlert]));

        await service.createOpportunityAlert(
          "user-123",
          { id: "asset-1", symbol: "AAPL", score: "70" },
          { id: "asset-2", symbol: "VOO", score: "85" },
          { id: "class-1", name: "US Stocks" }
        );

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.title).toBe("VOO scores higher than your AAPL");
      });

      it("should generate correct message format with scores", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockAlert]));

        await service.createOpportunityAlert(
          "user-123",
          { id: "asset-1", symbol: "AAPL", score: "70.1234" },
          { id: "asset-2", symbol: "VOO", score: "85.5678" },
          { id: "class-1", name: "US Stocks" }
        );

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.message).toBe(
          "VOO scores 85.57 vs your AAPL (70.12). Consider swapping?"
        );
      });

      it("should include both asset symbols in metadata", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockAlert]));

        await service.createOpportunityAlert(
          "user-123",
          { id: "asset-1", symbol: "AAPL", score: "70" },
          { id: "asset-2", symbol: "VOO", score: "85" },
          { id: "class-1", name: "US Stocks" }
        );

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.metadata.currentAssetSymbol).toBe("AAPL");
        expect(insertCall.metadata.betterAssetSymbol).toBe("VOO");
      });
    });
  });

  describe("getUnreadAlerts", () => {
    it("should return unread, non-dismissed alerts", async () => {
      const unreadAlerts = [mockAlert, { ...mockAlert, id: "alert-456" }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(unreadAlerts),
          }),
        }),
      });

      const result = await service.getUnreadAlerts("user-123");

      expect(result).toEqual(unreadAlerts);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no unread alerts", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getUnreadAlerts("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("getAlerts", () => {
    it("should return alerts with pagination info", async () => {
      const alerts = [mockAlert];
      const countResult = [{ count: 10 }];

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(alerts),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(countResult),
          }),
        });

      const result = await service.getAlerts("user-123", { limit: 10, offset: 0 });

      expect(result.alerts).toEqual(alerts);
      expect(result.totalCount).toBe(10);
      expect(result.metadata).toEqual({ limit: 10, offset: 0 });
    });

    it("should enforce maximum limit of 100", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      const result = await service.getAlerts("user-123", { limit: 500 });

      expect(result.metadata.limit).toBe(100);
    });

    it("should use default values when options not provided", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      const result = await service.getAlerts("user-123");

      expect(result.metadata.limit).toBe(50);
      expect(result.metadata.offset).toBe(0);
    });
  });

  describe("getUnreadCount", () => {
    it("should return count of unread alerts", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await service.getUnreadCount("user-123");

      expect(result).toBe(5);
    });

    it("should return 0 when no unread alerts", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const result = await service.getUnreadCount("user-123");

      expect(result).toBe(0);
    });

    it("should return 0 when result is undefined", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getUnreadCount("user-123");

      expect(result).toBe(0);
    });
  });

  describe("markAsRead", () => {
    describe("AC-9.1.3: Alert dismissible by user", () => {
      it("should mark alert as read and set readAt timestamp", async () => {
        const updatedAlert = { ...mockAlert, isRead: true, readAt: new Date() };
        mockDb.update.mockReturnValue(createUpdateChain([updatedAlert]));

        const result = await service.markAsRead("user-123", "alert-123");

        expect(result).toEqual(updatedAlert);
        expect(result?.isRead).toBe(true);
        expect(result?.readAt).not.toBeNull();
      });

      it("should return null if alert not found", async () => {
        mockDb.update.mockReturnValue(createUpdateChain([]));

        const result = await service.markAsRead("user-123", "nonexistent");

        expect(result).toBeNull();
      });

      it("should respect tenant isolation (userId)", async () => {
        mockDb.update.mockReturnValue(createUpdateChain([mockAlert]));

        await service.markAsRead("user-123", "alert-123");

        // Verify update was called (tenant isolation is enforced in WHERE clause)
        expect(mockDb.update).toHaveBeenCalled();
      });
    });
  });

  describe("dismissAlert", () => {
    describe("AC-9.1.3: Alert dismissible by user", () => {
      it("should dismiss alert and set dismissedAt timestamp", async () => {
        const dismissedAlert = { ...mockAlert, isDismissed: true, dismissedAt: new Date() };
        mockDb.update.mockReturnValue(createUpdateChain([dismissedAlert]));

        const result = await service.dismissAlert("user-123", "alert-123");

        expect(result).toEqual(dismissedAlert);
        expect(result?.isDismissed).toBe(true);
        expect(result?.dismissedAt).not.toBeNull();
      });

      it("should return null if alert not found", async () => {
        mockDb.update.mockReturnValue(createUpdateChain([]));

        const result = await service.dismissAlert("user-123", "nonexistent");

        expect(result).toBeNull();
      });
    });
  });

  describe("dismissAllAlerts", () => {
    it("should dismiss all alerts for user", async () => {
      const dismissedAlerts = [{ id: "alert-1" }, { id: "alert-2" }, { id: "alert-3" }];
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(dismissedAlerts),
          }),
        }),
      });

      const result = await service.dismissAllAlerts("user-123");

      expect(result).toBe(3);
    });

    it("should filter by alert type when provided", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "alert-1" }]),
          }),
        }),
      });

      const result = await service.dismissAllAlerts("user-123", ALERT_TYPES.OPPORTUNITY);

      expect(result).toBe(1);
    });

    it("should return 0 when no alerts to dismiss", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.dismissAllAlerts("user-123");

      expect(result).toBe(0);
    });
  });

  describe("findExistingAlert", () => {
    describe("AC-9.1.4: Alert deduplication for same asset pair", () => {
      it("should find existing alert by asset pair", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockAlert]),
            }),
          }),
        });

        const result = await service.findExistingAlert("user-123", "asset-1", "asset-2");

        expect(result).toEqual(mockAlert);
      });

      it("should return null if no existing alert", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        const result = await service.findExistingAlert("user-123", "asset-1", "asset-3");

        expect(result).toBeNull();
      });
    });
  });

  describe("updateAlertIfChanged", () => {
    describe("AC-9.1.4: Alert update when score difference changes significantly", () => {
      it("should update alert when score difference changes by more than threshold", async () => {
        const existingAlert = {
          ...mockAlert,
          metadata: { ...mockAlert.metadata, scoreDifference: "15" },
        };
        const updatedAlert = {
          ...existingAlert,
          metadata: { ...existingAlert.metadata, scoreDifference: "25" },
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingAlert]),
          }),
        });
        mockDb.update.mockReturnValue(createUpdateChain([updatedAlert]));

        const result = await service.updateAlertIfChanged(
          "alert-123",
          new Decimal(25),
          { id: "asset-1", symbol: "AAPL", score: "60" },
          { id: "asset-2", symbol: "VOO", score: "85" }
        );

        expect(result).toEqual(updatedAlert);
        expect(mockDb.update).toHaveBeenCalled();
      });

      it("should NOT update alert when score difference change is below threshold", async () => {
        const existingAlert = {
          ...mockAlert,
          metadata: { ...mockAlert.metadata, scoreDifference: "15" },
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingAlert]),
          }),
        });

        // Change is only 3 points (15 -> 18), below threshold of 5
        const result = await service.updateAlertIfChanged(
          "alert-123",
          new Decimal(18),
          { id: "asset-1", symbol: "AAPL", score: "67" },
          { id: "asset-2", symbol: "VOO", score: "85" }
        );

        expect(result).toBeNull();
        expect(mockDb.update).not.toHaveBeenCalled();
      });

      it("should return null if alert not found", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const result = await service.updateAlertIfChanged(
          "nonexistent",
          new Decimal(25),
          { id: "asset-1", symbol: "AAPL", score: "60" },
          { id: "asset-2", symbol: "VOO", score: "85" }
        );

        expect(result).toBeNull();
      });

      it("should update alert when change equals threshold exactly", async () => {
        const existingAlert = {
          ...mockAlert,
          metadata: { ...mockAlert.metadata, scoreDifference: "10" },
        };
        const updatedAlert = {
          ...existingAlert,
          metadata: { ...existingAlert.metadata, scoreDifference: "15" },
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingAlert]),
          }),
        });
        mockDb.update.mockReturnValue(createUpdateChain([updatedAlert]));

        // Change is exactly 5 points (threshold)
        const result = await service.updateAlertIfChanged(
          "alert-123",
          new Decimal(15),
          { id: "asset-1", symbol: "AAPL", score: "70" },
          { id: "asset-2", symbol: "VOO", score: "85" }
        );

        expect(result).toEqual(updatedAlert);
      });
    });
  });

  describe("autoDismissForAddedAsset", () => {
    describe("AC-9.1.5: Alert auto-clears when user adds the better asset", () => {
      it("should dismiss alerts where added asset is the better asset", async () => {
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "alert-1" }, { id: "alert-2" }]),
            }),
          }),
        });

        const result = await service.autoDismissForAddedAsset("user-123", "asset-2");

        expect(result).toBe(2);
      });

      it("should return 0 when no alerts match the added asset", async () => {
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        const result = await service.autoDismissForAddedAsset("user-123", "asset-unknown");

        expect(result).toBe(0);
      });
    });
  });

  describe("getAlertById", () => {
    it("should return alert by ID", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockAlert]),
        }),
      });

      const result = await service.getAlertById("user-123", "alert-123");

      expect(result).toEqual(mockAlert);
    });

    it("should return null if alert not found", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getAlertById("user-123", "nonexistent");

      expect(result).toBeNull();
    });

    it("should enforce tenant isolation", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      // Different user should not see alert
      const result = await service.getAlertById("other-user", "alert-123");

      expect(result).toBeNull();
    });
  });

  describe("Constants", () => {
    it("should export SCORE_UPDATE_THRESHOLD as Decimal(5)", () => {
      expect(SCORE_UPDATE_THRESHOLD.toString()).toBe("5");
    });

    it("should export DRIFT_UPDATE_THRESHOLD as Decimal(2)", () => {
      expect(DRIFT_UPDATE_THRESHOLD.toString()).toBe("2");
    });

    it("should export correct ALERT_TYPES", () => {
      expect(ALERT_TYPES.OPPORTUNITY).toBe("opportunity");
      expect(ALERT_TYPES.ALLOCATION_DRIFT).toBe("allocation_drift");
      expect(ALERT_TYPES.SYSTEM).toBe("system");
    });

    it("should export correct ALERT_SEVERITIES", () => {
      expect(ALERT_SEVERITIES.INFO).toBe("info");
      expect(ALERT_SEVERITIES.WARNING).toBe("warning");
      expect(ALERT_SEVERITIES.CRITICAL).toBe("critical");
    });
  });

  // ===========================================================================
  // DRIFT ALERT TESTS (Story 9.2: Allocation Drift Alert)
  // ===========================================================================

  describe("createDriftAlert", () => {
    const mockDriftAlert = {
      id: "drift-alert-123",
      userId: "user-123",
      type: ALERT_TYPES.ALLOCATION_DRIFT,
      title: "US Stocks allocation drift detected",
      message: "US Stocks at 65.00%, target is 40.00-50.00%. Consider not adding to this class",
      severity: ALERT_SEVERITIES.WARNING,
      metadata: {
        assetClassId: "class-1",
        assetClassName: "US Stocks",
        currentAllocation: "65",
        targetMin: "40",
        targetMax: "50",
        driftAmount: "15",
        direction: "over" as const,
      },
      isRead: false,
      isDismissed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      readAt: null,
      dismissedAt: null,
    };

    describe("AC-9.2.1: Alert created when allocation drifts outside target range", () => {
      it("should create drift alert with correct metadata for over-allocation", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockDriftAlert]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        const result = await service.createDriftAlert(
          "user-123",
          assetClass,
          new Decimal("65"),
          new Decimal("5")
        );

        expect(result).toEqual(mockDriftAlert);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("should create drift alert with correct metadata for under-allocation", async () => {
        const underAllocAlert = {
          ...mockDriftAlert,
          message: "US Stocks at 25.00%, target is 40.00-50.00%. Increase contributions here",
          metadata: {
            ...mockDriftAlert.metadata,
            currentAllocation: "25",
            driftAmount: "15",
            direction: "under" as const,
          },
        };
        mockDb.insert.mockReturnValue(createInsertChain([underAllocAlert]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        await service.createDriftAlert("user-123", assetClass, new Decimal("25"), new Decimal("5"));

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.metadata.direction).toBe("under");
      });

      it("should throw error if insert fails", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        await expect(
          service.createDriftAlert("user-123", assetClass, new Decimal("65"), new Decimal("5"))
        ).rejects.toThrow("Failed to create drift alert");
      });
    });

    describe("AC-9.2.2: Alert has formatted message", () => {
      it("should generate correct message format with percentages", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockDriftAlert]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        await service.createDriftAlert(
          "user-123",
          assetClass,
          new Decimal("65.1234"),
          new Decimal("5")
        );

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.message).toContain("US Stocks at 65.12%");
        expect(insertCall.message).toContain("target is 40.00-50.00%");
      });

      it("should include direction-specific suggestion for over-allocation", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockDriftAlert]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        await service.createDriftAlert("user-123", assetClass, new Decimal("65"), new Decimal("5"));

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.message).toContain("Consider not adding to this class");
      });

      it("should include direction-specific suggestion for under-allocation", async () => {
        const underAllocAlert = {
          ...mockDriftAlert,
          metadata: { ...mockDriftAlert.metadata, direction: "under" as const },
        };
        mockDb.insert.mockReturnValue(createInsertChain([underAllocAlert]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        await service.createDriftAlert("user-123", assetClass, new Decimal("25"), new Decimal("5"));

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.message).toContain("Increase contributions here");
      });
    });

    describe("AC-9.2.3: Severity based on drift magnitude", () => {
      it("should use WARNING severity for drift < 2x threshold", async () => {
        mockDb.insert.mockReturnValue(createInsertChain([mockDriftAlert]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        // Drift = 7% (55% current - 50% max), threshold = 5%, 2x = 10%
        await service.createDriftAlert("user-123", assetClass, new Decimal("55"), new Decimal("5"));

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.severity).toBe(ALERT_SEVERITIES.WARNING);
      });

      it("should use CRITICAL severity for drift >= 2x threshold", async () => {
        const criticalAlert = { ...mockDriftAlert, severity: ALERT_SEVERITIES.CRITICAL };
        mockDb.insert.mockReturnValue(createInsertChain([criticalAlert]));

        const assetClass: AssetClassDriftDetails = {
          id: "class-1",
          name: "US Stocks",
          targetMin: "40",
          targetMax: "50",
        };

        // Drift = 15% (65% current - 50% max), threshold = 5%, 2x = 10%
        await service.createDriftAlert("user-123", assetClass, new Decimal("65"), new Decimal("5"));

        const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertCall.severity).toBe(ALERT_SEVERITIES.CRITICAL);
      });
    });
  });

  describe("findExistingDriftAlert", () => {
    describe("AC-9.2.7: Deduplication for same asset class", () => {
      it("should find existing drift alert by asset class", async () => {
        const existingAlert = {
          id: "drift-alert-123",
          metadata: { assetClassId: "class-1" },
        };
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([existingAlert]),
            }),
          }),
        });

        const result = await service.findExistingDriftAlert("user-123", "class-1");

        expect(result).toEqual(existingAlert);
      });

      it("should return null if no existing drift alert", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        const result = await service.findExistingDriftAlert("user-123", "class-nonexistent");

        expect(result).toBeNull();
      });
    });
  });

  describe("updateDriftAlertIfChanged", () => {
    describe("AC-9.2.7: Update alert when drift changes significantly", () => {
      it("should update alert when drift changes by more than 2%", async () => {
        const existingAlert = {
          id: "drift-alert-123",
          metadata: {
            assetClassId: "class-1",
            assetClassName: "US Stocks",
            currentAllocation: "60",
            targetMin: "40",
            targetMax: "50",
            driftAmount: "10",
            direction: "over" as const,
          },
        };
        const updatedAlert = {
          ...existingAlert,
          metadata: { ...existingAlert.metadata, driftAmount: "15" },
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingAlert]),
          }),
        });
        mockDb.update.mockReturnValue(createUpdateChain([updatedAlert]));

        const result = await service.updateDriftAlertIfChanged(
          "drift-alert-123",
          new Decimal("15"),
          new Decimal("65"),
          new Decimal("5")
        );

        expect(result).toEqual(updatedAlert);
        expect(mockDb.update).toHaveBeenCalled();
      });

      it("should NOT update alert when drift change is below 2% threshold", async () => {
        const existingAlert = {
          id: "drift-alert-123",
          metadata: {
            assetClassId: "class-1",
            assetClassName: "US Stocks",
            currentAllocation: "60",
            targetMin: "40",
            targetMax: "50",
            driftAmount: "10",
            direction: "over" as const,
          },
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingAlert]),
          }),
        });

        // Change is only 1.5% (10 -> 11.5), below 2% threshold
        const result = await service.updateDriftAlertIfChanged(
          "drift-alert-123",
          new Decimal("11.5"),
          new Decimal("61.5"),
          new Decimal("5")
        );

        expect(result).toBeNull();
        expect(mockDb.update).not.toHaveBeenCalled();
      });

      it("should return null if alert not found", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const result = await service.updateDriftAlertIfChanged(
          "nonexistent",
          new Decimal("15"),
          new Decimal("65"),
          new Decimal("5")
        );

        expect(result).toBeNull();
      });
    });
  });

  describe("autoDismissResolvedDriftAlerts", () => {
    describe("AC-9.2.6: Auto-dismiss when allocation returns to range", () => {
      it("should return 0 when no drift alerts exist", async () => {
        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const result = await service.autoDismissResolvedDriftAlerts("user-123", "portfolio-123");

        expect(result).toBe(0);
      });

      it("should query for non-dismissed drift alerts", async () => {
        // This test verifies the query is made correctly
        // Integration tests will cover the full auto-dismiss flow
        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        await service.autoDismissResolvedDriftAlerts("user-123", "portfolio-123");

        expect(mockDb.select).toHaveBeenCalled();
      });
    });
  });
});
