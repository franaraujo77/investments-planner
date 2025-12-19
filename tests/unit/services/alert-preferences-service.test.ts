/**
 * Alert Preferences Service Unit Tests
 *
 * Story 9.1: Opportunity Alert (Better Asset Exists)
 * AC-9.1.6: Alert respects user preferences (opportunityAlertsEnabled)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AlertPreferencesService,
  DEFAULT_ALERT_PREFERENCES,
} from "@/lib/services/alert-preferences-service";

// Mock the logger
vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AlertPreferencesService", () => {
  let service: AlertPreferencesService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const mockPreferences = {
    id: "pref-123",
    userId: "user-123",
    opportunityAlertsEnabled: true,
    driftAlertsEnabled: true,
    driftThreshold: "5.00",
    alertFrequency: "daily" as const,
    emailNotifications: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    service = new AlertPreferencesService(mockDb as never);
  });

  describe("getPreferences", () => {
    it("should return existing preferences if found", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });

      const result = await service.getPreferences("user-123");

      expect(result).toEqual(mockPreferences);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("should create default preferences if none exist", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });

      const result = await service.getPreferences("user-123");

      expect(result).toEqual(mockPreferences);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("createDefaultPreferences", () => {
    it("should create preferences with default values", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });

      const result = await service.createDefaultPreferences("user-123");

      expect(result).toEqual(mockPreferences);

      // Verify default values were used
      const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertCall.userId).toBe("user-123");
      expect(insertCall.opportunityAlertsEnabled).toBe(
        DEFAULT_ALERT_PREFERENCES.opportunityAlertsEnabled
      );
      expect(insertCall.driftAlertsEnabled).toBe(DEFAULT_ALERT_PREFERENCES.driftAlertsEnabled);
      expect(insertCall.driftThreshold).toBe(DEFAULT_ALERT_PREFERENCES.driftThreshold);
      expect(insertCall.alertFrequency).toBe(DEFAULT_ALERT_PREFERENCES.alertFrequency);
      expect(insertCall.emailNotifications).toBe(DEFAULT_ALERT_PREFERENCES.emailNotifications);
    });

    it("should throw error if insert fails", async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.createDefaultPreferences("user-123")).rejects.toThrow(
        "Failed to create alert preferences"
      );
    });
  });

  describe("updatePreferences", () => {
    it("should update preferences and return updated record", async () => {
      const updatedPrefs = {
        ...mockPreferences,
        opportunityAlertsEnabled: false,
        emailNotifications: true,
      };

      // Mock getPreferences to return existing
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedPrefs]),
          }),
        }),
      });

      const result = await service.updatePreferences("user-123", {
        opportunityAlertsEnabled: false,
        emailNotifications: true,
      });

      expect(result.opportunityAlertsEnabled).toBe(false);
      expect(result.emailNotifications).toBe(true);
    });

    it("should create preferences first if none exist then update", async () => {
      // Mock getPreferences - no existing, then create
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        }),
      });

      await service.updatePreferences("user-123", {
        driftThreshold: "10.00",
      });

      // Should have called insert (to create defaults) and update
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should throw error if update fails", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.updatePreferences("user-123", { emailNotifications: true })
      ).rejects.toThrow("Failed to update alert preferences");
    });

    it("should allow updating individual fields", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...mockPreferences,
                alertFrequency: "weekly",
              },
            ]),
          }),
        }),
      });

      const result = await service.updatePreferences("user-123", {
        alertFrequency: "weekly",
      });

      expect(result.alertFrequency).toBe("weekly");
    });
  });

  describe("isOpportunityAlertsEnabled", () => {
    describe("AC-9.1.6: Alert respects user preferences", () => {
      it("should return true when opportunity alerts are enabled", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });

        const result = await service.isOpportunityAlertsEnabled("user-123");

        expect(result).toBe(true);
      });

      it("should return false when opportunity alerts are disabled", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                ...mockPreferences,
                opportunityAlertsEnabled: false,
              },
            ]),
          }),
        });

        const result = await service.isOpportunityAlertsEnabled("user-123");

        expect(result).toBe(false);
      });

      it("should create defaults and return true for new users", async () => {
        // No existing preferences
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });
        // Create defaults with opportunityAlertsEnabled: true
        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });

        const result = await service.isOpportunityAlertsEnabled("user-123");

        expect(result).toBe(true);
        expect(mockDb.insert).toHaveBeenCalled();
      });
    });
  });

  describe("isDriftAlertsEnabled", () => {
    it("should return true when drift alerts are enabled", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });

      const result = await service.isDriftAlertsEnabled("user-123");

      expect(result).toBe(true);
    });

    it("should return false when drift alerts are disabled", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              ...mockPreferences,
              driftAlertsEnabled: false,
            },
          ]),
        }),
      });

      const result = await service.isDriftAlertsEnabled("user-123");

      expect(result).toBe(false);
    });
  });

  describe("getDriftThreshold", () => {
    it("should return drift threshold value", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPreferences]),
        }),
      });

      const result = await service.getDriftThreshold("user-123");

      expect(result).toBe("5.00");
    });

    it("should return custom threshold if set", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              ...mockPreferences,
              driftThreshold: "10.00",
            },
          ]),
        }),
      });

      const result = await service.getDriftThreshold("user-123");

      expect(result).toBe("10.00");
    });
  });

  describe("DEFAULT_ALERT_PREFERENCES", () => {
    it("should have opportunity alerts enabled by default", () => {
      expect(DEFAULT_ALERT_PREFERENCES.opportunityAlertsEnabled).toBe(true);
    });

    it("should have drift alerts enabled by default", () => {
      expect(DEFAULT_ALERT_PREFERENCES.driftAlertsEnabled).toBe(true);
    });

    it("should have drift threshold of 5.00 by default", () => {
      expect(DEFAULT_ALERT_PREFERENCES.driftThreshold).toBe("5.00");
    });

    it("should have daily alert frequency by default", () => {
      expect(DEFAULT_ALERT_PREFERENCES.alertFrequency).toBe("daily");
    });

    it("should have email notifications disabled by default", () => {
      expect(DEFAULT_ALERT_PREFERENCES.emailNotifications).toBe(false);
    });
  });

  describe("ensurePreferencesExist", () => {
    describe("AC-9.3.6: Default Preferences Created on User Registration", () => {
      it("should return existing preferences if found", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });

        const result = await service.ensurePreferencesExist("user-123");

        expect(result).toEqual(mockPreferences);
        expect(mockDb.insert).not.toHaveBeenCalled();
      });

      it("should create default preferences if none exist", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });
        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });

        const result = await service.ensurePreferencesExist("user-123");

        expect(result).toEqual(mockPreferences);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it("should be idempotent - calling multiple times returns same result", async () => {
        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });

        const result1 = await service.ensurePreferencesExist("user-123");
        const result2 = await service.ensurePreferencesExist("user-123");

        expect(result1).toEqual(result2);
        expect(mockDb.insert).not.toHaveBeenCalled();
      });
    });
  });

  describe("updatePreferences - AC-9.3.1 to AC-9.3.5", () => {
    describe("AC-9.3.1: Enable/Disable Opportunity Alerts", () => {
      it("should update opportunityAlertsEnabled to false", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          opportunityAlertsEnabled: false,
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          opportunityAlertsEnabled: false,
        });

        expect(result.opportunityAlertsEnabled).toBe(false);
      });

      it("should update opportunityAlertsEnabled to true", async () => {
        const existingPrefs = { ...mockPreferences, opportunityAlertsEnabled: false };
        const updatedPrefs = { ...mockPreferences, opportunityAlertsEnabled: true };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingPrefs]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          opportunityAlertsEnabled: true,
        });

        expect(result.opportunityAlertsEnabled).toBe(true);
      });
    });

    describe("AC-9.3.2: Enable/Disable Drift Alerts", () => {
      it("should update driftAlertsEnabled to false", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          driftAlertsEnabled: false,
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          driftAlertsEnabled: false,
        });

        expect(result.driftAlertsEnabled).toBe(false);
      });
    });

    describe("AC-9.3.3: Configure Drift Threshold", () => {
      it("should update driftThreshold to 10.00", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          driftThreshold: "10.00",
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          driftThreshold: "10.00",
        });

        expect(result.driftThreshold).toBe("10.00");
      });

      it("should update driftThreshold to minimum value 1.00", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          driftThreshold: "1.00",
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          driftThreshold: "1.00",
        });

        expect(result.driftThreshold).toBe("1.00");
      });

      it("should update driftThreshold to maximum value 20.00", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          driftThreshold: "20.00",
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          driftThreshold: "20.00",
        });

        expect(result.driftThreshold).toBe("20.00");
      });
    });

    describe("AC-9.3.4: Set Alert Frequency", () => {
      it("should update alertFrequency to realtime", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          alertFrequency: "realtime" as const,
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          alertFrequency: "realtime",
        });

        expect(result.alertFrequency).toBe("realtime");
      });

      it("should update alertFrequency to weekly", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          alertFrequency: "weekly" as const,
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          alertFrequency: "weekly",
        });

        expect(result.alertFrequency).toBe("weekly");
      });
    });

    describe("AC-9.3.5: Enable/Disable Email Notifications", () => {
      it("should update emailNotifications to true", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          emailNotifications: true,
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          emailNotifications: true,
        });

        expect(result.emailNotifications).toBe(true);
      });
    });

    describe("Partial updates - only specified fields updated", () => {
      it("should only update specified fields, leaving others unchanged", async () => {
        const updatedPrefs = {
          ...mockPreferences,
          driftThreshold: "15.00",
          // Other fields remain unchanged
        };

        mockDb.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPreferences]),
          }),
        });
        mockDb.update.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedPrefs]),
            }),
          }),
        });

        const result = await service.updatePreferences("user-123", {
          driftThreshold: "15.00",
        });

        expect(result.driftThreshold).toBe("15.00");
        expect(result.opportunityAlertsEnabled).toBe(true); // unchanged
        expect(result.driftAlertsEnabled).toBe(true); // unchanged
        expect(result.alertFrequency).toBe("daily"); // unchanged
        expect(result.emailNotifications).toBe(false); // unchanged
      });
    });
  });
});
