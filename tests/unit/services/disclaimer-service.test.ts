/**
 * Disclaimer Service Unit Tests
 *
 * Story 9.4: Financial Disclaimers
 * AC-9.4.3: User must acknowledge disclaimer before accessing dashboard
 * AC-9.4.4: Acknowledgment timestamp stored in user record
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DisclaimerService } from "@/lib/services/disclaimer-service";

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DisclaimerService", () => {
  let service: DisclaimerService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const mockUserId = "user-123";
  const mockAcknowledgedAt = new Date("2024-01-15T10:30:00Z");

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      select: vi.fn(),
      update: vi.fn(),
    };

    service = new DisclaimerService(mockDb as never);
  });

  describe("hasAcknowledgedDisclaimer", () => {
    describe("AC-9.4.1: Check for modal display decision", () => {
      it("should return true when disclaimer has been acknowledged", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: mockAcknowledgedAt }]),
          }),
        });

        const result = await service.hasAcknowledgedDisclaimer(mockUserId);

        expect(result).toBe(true);
      });

      it("should return false when disclaimer has not been acknowledged", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: null }]),
          }),
        });

        const result = await service.hasAcknowledgedDisclaimer(mockUserId);

        expect(result).toBe(false);
      });

      it("should return false when user is not found", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const result = await service.hasAcknowledgedDisclaimer(mockUserId);

        expect(result).toBe(false);
      });
    });
  });

  describe("getDisclaimerStatus", () => {
    describe("AC-9.4.4: Retrieve stored timestamp", () => {
      it("should return acknowledged true with timestamp when acknowledged", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: mockAcknowledgedAt }]),
          }),
        });

        const result = await service.getDisclaimerStatus(mockUserId);

        expect(result.acknowledged).toBe(true);
        expect(result.acknowledgedAt).toEqual(mockAcknowledgedAt);
      });

      it("should return acknowledged false with null timestamp when not acknowledged", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: null }]),
          }),
        });

        const result = await service.getDisclaimerStatus(mockUserId);

        expect(result.acknowledged).toBe(false);
        expect(result.acknowledgedAt).toBeNull();
      });

      it("should return acknowledged false when user not found", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const result = await service.getDisclaimerStatus(mockUserId);

        expect(result.acknowledged).toBe(false);
        expect(result.acknowledgedAt).toBeNull();
      });
    });
  });

  describe("acknowledgeDisclaimer", () => {
    describe("AC-9.4.3: Record acknowledgment with timestamp", () => {
      it("should set disclaimerAcknowledgedAt and return timestamp", async () => {
        const newTimestamp = new Date();

        // User exists but hasn't acknowledged
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: null }]),
          }),
        });

        // Update returns new timestamp
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: newTimestamp }]),
            }),
          }),
        });

        const result = await service.acknowledgeDisclaimer(mockUserId);

        expect(result).toEqual(newTimestamp);
        expect(mockDb.update).toHaveBeenCalled();
      });

      it("should be idempotent - return existing timestamp if already acknowledged", async () => {
        // User already acknowledged
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: mockAcknowledgedAt }]),
          }),
        });

        const result = await service.acknowledgeDisclaimer(mockUserId);

        expect(result).toEqual(mockAcknowledgedAt);
        expect(mockDb.update).not.toHaveBeenCalled();
      });

      it("should throw error if user not found", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        await expect(service.acknowledgeDisclaimer(mockUserId)).rejects.toThrow("User not found");
      });

      it("should throw error if update fails", async () => {
        // User exists but hasn't acknowledged
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: null }]),
          }),
        });

        // Update returns empty array (failure)
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        await expect(service.acknowledgeDisclaimer(mockUserId)).rejects.toThrow(
          "Failed to acknowledge disclaimer"
        );
      });
    });

    describe("AC-9.4.4: Store disclaimerAcknowledgedAt in users table", () => {
      it("should call update with correct user ID", async () => {
        const newTimestamp = new Date();

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: null }]),
          }),
        });

        const mockSet = vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: newTimestamp }]),
          }),
        });

        mockDb.update.mockReturnValue({ set: mockSet });

        await service.acknowledgeDisclaimer(mockUserId);

        expect(mockDb.update).toHaveBeenCalled();
        expect(mockSet).toHaveBeenCalled();
      });

      it("should also update the updatedAt timestamp", async () => {
        const newTimestamp = new Date();

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: null }]),
          }),
        });

        const mockSet = vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ disclaimerAcknowledgedAt: newTimestamp }]),
          }),
        });

        mockDb.update.mockReturnValue({ set: mockSet });

        await service.acknowledgeDisclaimer(mockUserId);

        // Verify set was called with an object containing updatedAt
        const setArg = mockSet.mock.calls[0][0];
        expect(setArg).toHaveProperty("disclaimerAcknowledgedAt");
        expect(setArg).toHaveProperty("updatedAt");
        expect(setArg.updatedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe("Service instantiation", () => {
    it("should create service with default database", () => {
      // This tests that the service can be instantiated
      const defaultService = new DisclaimerService();
      expect(defaultService).toBeInstanceOf(DisclaimerService);
    });

    it("should create service with custom database", () => {
      const customDb = {
        select: vi.fn(),
        update: vi.fn(),
      };
      const customService = new DisclaimerService(customDb as never);
      expect(customService).toBeInstanceOf(DisclaimerService);
    });
  });
});
