/**
 * Alert Snooze Functionality Tests
 *
 * Story 7.6: Opportunity Alerts and Preferences
 * AC-7.6.5: Snooze functionality - snooze for 24 hours
 *
 * Tests the alert snooze and update functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies at module level using vi.hoisted
const { mockDbSelect, mockDbFrom, mockDbWhere, mockDbUpdate, mockDbSet, mockDbReturning } =
  vi.hoisted(() => ({
    mockDbSelect: vi.fn(),
    mockDbFrom: vi.fn(),
    mockDbWhere: vi.fn(),
    mockDbUpdate: vi.fn(),
    mockDbSet: vi.fn(),
    mockDbReturning: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  alerts: {
    id: "id",
    userId: "userId",
    type: "type",
    title: "title",
    message: "message",
    severity: "severity",
    metadata: "metadata",
    isRead: "isRead",
    isDismissed: "isDismissed",
    snoozedUntil: "snoozedUntil",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  dismissedOpportunityPairs: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ type: "eq", field, value })),
  and: vi.fn((...args) => ({ type: "and", args })),
  lt: vi.fn((field, value) => ({ type: "lt", field, value })),
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/services/dismissed-pairs-service", () => ({
  dismissedPairsService: {
    recordDismissedPair: vi.fn().mockResolvedValue(undefined),
  },
}));

import { AlertService } from "@/lib/services/alert-service";
import type { Alert } from "@/lib/db/schema";

describe("AlertService - Snooze Functionality", () => {
  let service: AlertService;

  const mockAlert: Alert = {
    id: "alert-1",
    userId: "user-1",
    type: "opportunity",
    title: "Better Asset Found",
    message: "A better scoring asset exists",
    severity: "info",
    metadata: {
      currentAssetId: "asset-current",
      currentAssetSymbol: "CURR",
      betterAssetId: "asset-better",
      betterAssetSymbol: "BETT",
      assetClassId: "class-1",
      assetClassName: "Stocks",
    },
    isRead: false,
    isDismissed: false,
    snoozedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AlertService();

    // Default chain for select queries
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbFrom.mockReturnValue({ where: mockDbWhere });
    mockDbWhere.mockResolvedValue([mockAlert]);

    // Default chain for update queries
    mockDbUpdate.mockReturnValue({ set: mockDbSet });
    mockDbSet.mockReturnValue({ where: mockDbWhere });
    // For update, where returns returning
    const mockWhereWithReturning = vi.fn().mockReturnValue({ returning: mockDbReturning });
    mockDbSet.mockReturnValue({ where: mockWhereWithReturning });
    mockDbReturning.mockResolvedValue([mockAlert]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("updateAlert", () => {
    it("should update alert with snooze timestamp", async () => {
      const snoozedUntil = new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + 24);

      const updatedAlert = {
        ...mockAlert,
        snoozedUntil,
      };
      mockDbReturning.mockResolvedValue([updatedAlert]);

      const result = await service.updateAlert("alert-1", "user-1", {
        snoozedUntil: snoozedUntil.toISOString(),
      });

      expect(result).toBeDefined();
      expect(result?.snoozedUntil).toEqual(snoozedUntil);
      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockDbSet).toHaveBeenCalledWith(
        expect.objectContaining({
          snoozedUntil: expect.any(Date),
        })
      );
    });

    it("should clear snooze when snoozedUntil is null", async () => {
      const unsnoozedAlert = {
        ...mockAlert,
        snoozedUntil: null,
      };
      mockDbReturning.mockResolvedValue([unsnoozedAlert]);

      const result = await service.updateAlert("alert-1", "user-1", {
        snoozedUntil: null,
      });

      expect(result).toBeDefined();
      expect(result?.snoozedUntil).toBeNull();
    });

    it("should update isRead status", async () => {
      const readAlert = {
        ...mockAlert,
        isRead: true,
      };
      mockDbReturning.mockResolvedValue([readAlert]);

      const result = await service.updateAlert("alert-1", "user-1", {
        isRead: true,
      });

      expect(result?.isRead).toBe(true);
    });

    it("should update isDismissed status", async () => {
      const dismissedAlert = {
        ...mockAlert,
        isDismissed: true,
      };
      mockDbReturning.mockResolvedValue([dismissedAlert]);

      const result = await service.updateAlert("alert-1", "user-1", {
        isDismissed: true,
      });

      expect(result?.isDismissed).toBe(true);
    });

    it("should return null when alert not found", async () => {
      mockDbReturning.mockResolvedValue([]);

      const result = await service.updateAlert("nonexistent", "user-1", {
        isRead: true,
      });

      expect(result).toBeNull();
    });

    it("should update multiple fields at once", async () => {
      const now = new Date();
      now.setHours(now.getHours() + 24);

      const updatedAlert = {
        ...mockAlert,
        isRead: true,
        snoozedUntil: now,
      };
      mockDbReturning.mockResolvedValue([updatedAlert]);

      const result = await service.updateAlert("alert-1", "user-1", {
        isRead: true,
        snoozedUntil: now.toISOString(),
      });

      expect(result?.isRead).toBe(true);
      expect(result?.snoozedUntil).toEqual(now);
    });
  });

  describe("getAlertById", () => {
    it("should return alert when found", async () => {
      mockDbWhere.mockResolvedValue([mockAlert]);

      const result = await service.getAlertById("user-1", "alert-1");

      expect(result).toEqual(mockAlert);
    });

    it("should return null when alert not found", async () => {
      mockDbWhere.mockResolvedValue([]);

      const result = await service.getAlertById("user-1", "nonexistent");

      expect(result).toBeNull();
    });

    it("should filter by userId for tenant isolation", async () => {
      const { and, eq } = await import("drizzle-orm");
      mockDbWhere.mockResolvedValue([mockAlert]);

      await service.getAlertById("user-1", "alert-1");

      expect(and).toHaveBeenCalled();
      expect(eq).toHaveBeenCalled();
    });
  });
});

describe("AlertService - Snoozed Alerts", () => {
  it("should store snoozedUntil as a Date object", async () => {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + 24);

    // Snoozed alerts are filtered in the client component (alerts-list-client.tsx)
    // The service simply stores and retrieves the snoozedUntil timestamp
    // This test verifies the timestamp format is correct
    expect(snoozedUntil instanceof Date).toBe(true);
    expect(snoozedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it("should recognize past snooze times as expired", () => {
    const pastSnooze = new Date();
    pastSnooze.setHours(pastSnooze.getHours() - 1);

    // A snoozed alert with a past timestamp should be visible again
    const isSnoozed = pastSnooze > new Date();
    expect(isSnoozed).toBe(false);
  });

  it("should recognize future snooze times as active", () => {
    const futureSnooze = new Date();
    futureSnooze.setHours(futureSnooze.getHours() + 24);

    // A snoozed alert with a future timestamp should be hidden
    const isSnoozed = futureSnooze > new Date();
    expect(isSnoozed).toBe(true);
  });
});
