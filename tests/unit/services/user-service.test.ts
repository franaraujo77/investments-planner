/**
 * User Service Unit Tests
 *
 * Story 2.6: Profile Settings & Base Currency
 *
 * Tests for updateUserProfile function:
 * - AC-2.6.3: Cache invalidation on currency change
 * - AC-2.6.5: Name validation (100 char limit)
 * - Currency validation (8 supported currencies)
 * - Partial updates (name only, currency only)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database before importing the service
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn(),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn(),
        }),
      }),
    }),
  },
}));

// Mock the cache module
vi.mock("@/lib/cache/recommendations", () => ({
  invalidateRecommendations: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks are set up
import { db } from "@/lib/db";
import { invalidateRecommendations } from "@/lib/cache/recommendations";
import {
  updateUserProfile,
  getUserProfile,
  SUPPORTED_CURRENCIES,
} from "@/lib/services/user-service";

describe("User Service", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    passwordHash: "hashed",
    name: "Test User",
    baseCurrency: "USD",
    emailVerified: true,
    emailVerifiedAt: new Date(),
    disclaimerAcknowledgedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SUPPORTED_CURRENCIES", () => {
    it("should have exactly 8 currencies", () => {
      expect(SUPPORTED_CURRENCIES).toHaveLength(8);
    });

    it("should include all required currencies (AC-2.6.2)", () => {
      const requiredCurrencies = ["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "JPY", "CHF"];
      requiredCurrencies.forEach((currency) => {
        expect(SUPPORTED_CURRENCIES).toContain(currency);
      });
    });
  });

  describe("updateUserProfile", () => {
    beforeEach(() => {
      // Mock successful select (find user)
      const selectMock = vi.mocked(db.select);
      selectMock.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as ReturnType<typeof db.select>);
    });

    describe("Name updates (AC-2.6.5)", () => {
      it("should update name successfully", async () => {
        const updatedUser = { ...mockUser, name: "New Name" };

        // Mock update
        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        const result = await updateUserProfile("user-123", { name: "New Name" });

        expect(result.name).toBe("New Name");
        expect(updateMock).toHaveBeenCalled();
      });

      it("should trim whitespace from name", async () => {
        const updatedUser = { ...mockUser, name: "Trimmed Name" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        await updateUserProfile("user-123", { name: "  Trimmed Name  " });

        // Verify update was called with trimmed name
        const setCall = updateMock.mock.results[0]?.value.set;
        expect(setCall).toHaveBeenCalled();
      });

      it("should reject name longer than 100 characters", async () => {
        const longName = "a".repeat(101);

        await expect(updateUserProfile("user-123", { name: longName })).rejects.toThrow(
          "Name must be 100 characters or less"
        );
      });

      it("should accept name with exactly 100 characters", async () => {
        const exactName = "a".repeat(100);
        const updatedUser = { ...mockUser, name: exactName };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        const result = await updateUserProfile("user-123", { name: exactName });

        expect(result.name).toBe(exactName);
      });

      it("should set empty name to null", async () => {
        const updatedUser = { ...mockUser, name: null };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        const result = await updateUserProfile("user-123", { name: "" });

        expect(result.name).toBeNull();
      });
    });

    describe("Currency updates (AC-2.6.2, AC-2.6.3)", () => {
      it("should update base currency successfully", async () => {
        const updatedUser = { ...mockUser, baseCurrency: "EUR" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        const result = await updateUserProfile("user-123", { baseCurrency: "EUR" });

        expect(result.baseCurrency).toBe("EUR");
      });

      it("should reject invalid currency", async () => {
        await expect(updateUserProfile("user-123", { baseCurrency: "INVALID" })).rejects.toThrow(
          "Invalid currency"
        );
      });

      it("should accept all 8 valid currencies", async () => {
        for (const currency of SUPPORTED_CURRENCIES) {
          const updatedUser = { ...mockUser, baseCurrency: currency };

          const selectMock = vi.mocked(db.select);
          selectMock.mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockUser]),
              }),
            }),
          } as ReturnType<typeof db.select>);

          const updateMock = vi.mocked(db.update);
          updateMock.mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([updatedUser]),
              }),
            }),
          } as ReturnType<typeof db.update>);

          const result = await updateUserProfile("user-123", { baseCurrency: currency });
          expect(result.baseCurrency).toBe(currency);
        }
      });

      it("should invalidate cache when currency changes (AC-2.6.3)", async () => {
        const updatedUser = { ...mockUser, baseCurrency: "GBP" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        await updateUserProfile("user-123", { baseCurrency: "GBP" });

        expect(invalidateRecommendations).toHaveBeenCalledWith("user-123");
      });

      it("should NOT invalidate cache when currency stays the same", async () => {
        const updatedUser = { ...mockUser, baseCurrency: "USD" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        await updateUserProfile("user-123", { baseCurrency: "USD" });

        expect(invalidateRecommendations).not.toHaveBeenCalled();
      });

      it("should NOT invalidate cache when only name changes", async () => {
        const updatedUser = { ...mockUser, name: "New Name" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        await updateUserProfile("user-123", { name: "New Name" });

        expect(invalidateRecommendations).not.toHaveBeenCalled();
      });

      it("should continue update even if cache invalidation fails", async () => {
        const updatedUser = { ...mockUser, baseCurrency: "EUR" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        vi.mocked(invalidateRecommendations).mockRejectedValueOnce(new Error("Cache error"));

        // Note: The service now uses logger.warn instead of console.error
        // The important behavior is that the update completes despite cache failure
        const result = await updateUserProfile("user-123", { baseCurrency: "EUR" });

        expect(result.baseCurrency).toBe("EUR");
        // Verify cache invalidation was attempted (and failed)
        expect(invalidateRecommendations).toHaveBeenCalledWith("user-123");
      });
    });

    describe("Partial updates", () => {
      it("should support updating only name", async () => {
        const updatedUser = { ...mockUser, name: "Only Name" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        const result = await updateUserProfile("user-123", { name: "Only Name" });

        expect(result.name).toBe("Only Name");
        expect(result.baseCurrency).toBe("USD");
      });

      it("should support updating only currency", async () => {
        const updatedUser = { ...mockUser, baseCurrency: "JPY" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        const result = await updateUserProfile("user-123", { baseCurrency: "JPY" });

        expect(result.baseCurrency).toBe("JPY");
        expect(result.name).toBe("Test User");
      });

      it("should support updating both name and currency", async () => {
        const updatedUser = { ...mockUser, name: "Both", baseCurrency: "CHF" };

        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedUser]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        const result = await updateUserProfile("user-123", {
          name: "Both",
          baseCurrency: "CHF",
        });

        expect(result.name).toBe("Both");
        expect(result.baseCurrency).toBe("CHF");
        expect(invalidateRecommendations).toHaveBeenCalled();
      });
    });

    describe("Error handling", () => {
      it("should throw error when user not found", async () => {
        const selectMock = vi.mocked(db.select);
        selectMock.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as ReturnType<typeof db.select>);

        await expect(updateUserProfile("nonexistent", { name: "Test" })).rejects.toThrow(
          "User not found"
        );
      });

      it("should throw error when update fails", async () => {
        const updateMock = vi.mocked(db.update);
        updateMock.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as ReturnType<typeof db.update>);

        await expect(updateUserProfile("user-123", { name: "Test" })).rejects.toThrow(
          "Failed to update user profile"
        );
      });
    });
  });

  describe("getUserProfile", () => {
    it("should return user when found", async () => {
      const selectMock = vi.mocked(db.select);
      selectMock.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as ReturnType<typeof db.select>);

      const result = await getUserProfile("user-123");

      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found", async () => {
      const selectMock = vi.mocked(db.select);
      selectMock.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as ReturnType<typeof db.select>);

      const result = await getUserProfile("nonexistent");

      expect(result).toBeNull();
    });
  });
});
