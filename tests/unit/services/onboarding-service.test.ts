/**
 * Unit Tests: Onboarding Service
 *
 * Story 3.5: Onboarding Tips
 * AC-3.5.3: Tip Dismissal Persistence
 * AC-3.5.4: Reset Onboarding Tips Option
 *
 * Tests for the onboarding service database operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingService } from "@/lib/services/onboarding-service";
import { ONBOARDING_TIPS } from "@/lib/constants/onboarding-tips";

// Mock the database module
const _mockSelect = vi.fn();
const _mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockSet = vi.fn();

const mockDb = {
  select: vi.fn(() => ({
    from: mockFrom.mockReturnValue({
      where: mockWhere,
    }),
  })),
  update: vi.fn(() => ({
    set: mockSet.mockReturnValue({
      where: mockWhere,
    }),
  })),
};

// Mock logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("OnboardingService", () => {
  let service: OnboardingService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create service with mocked database
    service = new OnboardingService(mockDb as any);
  });

  describe("getDismissedTips", () => {
    it("should return empty array when no dismissed tips", async () => {
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: [],
          completedAt: null,
        },
      ]);

      const result = await service.getDismissedTips("user-123");

      expect(result.tipsDismissed).toEqual([]);
      expect(result.completedAt).toBeNull();
    });

    it("should return dismissed tips array", async () => {
      const dismissedTips = ["pie-chart-interaction", "allocation-indicator"];
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: dismissedTips,
          completedAt: null,
        },
      ]);

      const result = await service.getDismissedTips("user-123");

      expect(result.tipsDismissed).toEqual(dismissedTips);
    });

    it("should return empty when user not found", async () => {
      mockWhere.mockResolvedValue([]);

      const result = await service.getDismissedTips("nonexistent-user");

      expect(result.tipsDismissed).toEqual([]);
      expect(result.completedAt).toBeNull();
    });

    it("should handle null tipsDismissed gracefully", async () => {
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: null,
          completedAt: null,
        },
      ]);

      const result = await service.getDismissedTips("user-123");

      expect(result.tipsDismissed).toEqual([]);
    });
  });

  describe("dismissTip", () => {
    it("should add tip to dismissed array", async () => {
      // First call for getDismissedTips
      mockWhere.mockResolvedValueOnce([
        {
          tipsDismissed: [],
          completedAt: null,
        },
      ]);

      // Second call for update
      mockWhere.mockResolvedValueOnce([]);

      await service.dismissTip("user-123", "pie-chart-interaction");

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingTipsDismissed: ["pie-chart-interaction"],
        })
      );
    });

    it("should be idempotent - not add duplicate", async () => {
      mockWhere.mockResolvedValueOnce([
        {
          tipsDismissed: ["pie-chart-interaction"],
          completedAt: null,
        },
      ]);

      await service.dismissTip("user-123", "pie-chart-interaction");

      // Should not call update since tip already dismissed
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should set completedAt when all tips dismissed", async () => {
      // Start with all but one tip dismissed
      const allButOne = ONBOARDING_TIPS.slice(0, -1).map((t) => t.id);
      const lastTipId = ONBOARDING_TIPS[ONBOARDING_TIPS.length - 1].id;

      mockWhere.mockResolvedValueOnce([
        {
          tipsDismissed: allButOne,
          completedAt: null,
        },
      ]);

      mockWhere.mockResolvedValueOnce([]);

      await service.dismissTip("user-123", lastTipId);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingCompletedAt: expect.any(Date),
        })
      );
    });
  });

  describe("resetAllTips", () => {
    it("should clear all dismissed tips", async () => {
      mockWhere.mockResolvedValue([]);

      await service.resetAllTips("user-123");

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingTipsDismissed: [],
          onboardingCompletedAt: null,
        })
      );
    });
  });

  describe("shouldShowTip", () => {
    it("should return true for non-dismissed tip", async () => {
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: ["other-tip"],
          completedAt: null,
        },
      ]);

      const shouldShow = await service.shouldShowTip("user-123", "pie-chart-interaction");

      expect(shouldShow).toBe(true);
    });

    it("should return false for dismissed tip", async () => {
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: ["pie-chart-interaction"],
          completedAt: null,
        },
      ]);

      const shouldShow = await service.shouldShowTip("user-123", "pie-chart-interaction");

      expect(shouldShow).toBe(false);
    });
  });

  describe("getActiveTips", () => {
    it("should return all tips when none dismissed", async () => {
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: [],
          completedAt: null,
        },
      ]);

      const activeTips = await service.getActiveTips("user-123");

      expect(activeTips).toHaveLength(ONBOARDING_TIPS.length);
    });

    it("should filter out dismissed tips", async () => {
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: ["pie-chart-interaction"],
          completedAt: null,
        },
      ]);

      const activeTips = await service.getActiveTips("user-123");

      expect(activeTips.some((t) => t.id === "pie-chart-interaction")).toBe(false);
      expect(activeTips.length).toBe(ONBOARDING_TIPS.length - 1);
    });
  });

  describe("isOnboardingComplete", () => {
    it("should return false when not all tips dismissed", async () => {
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: ["pie-chart-interaction"],
          completedAt: null,
        },
      ]);

      const isComplete = await service.isOnboardingComplete("user-123");

      expect(isComplete).toBe(false);
    });

    it("should return true when all tips dismissed", async () => {
      const allTipIds = ONBOARDING_TIPS.map((t) => t.id);
      mockWhere.mockResolvedValue([
        {
          tipsDismissed: allTipIds,
          completedAt: new Date(),
        },
      ]);

      const isComplete = await service.isOnboardingComplete("user-123");

      expect(isComplete).toBe(true);
    });
  });
});
