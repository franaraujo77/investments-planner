/**
 * Inngest Client Tests
 *
 * Story 8.1: Inngest Job Infrastructure
 * AC-8.1.1: Inngest client is configured in lib/inngest/client.ts with correct event types
 *
 * Tests:
 * - Client exports correct configuration
 * - Client ID is 'investments-planner'
 * - Event types are properly defined for overnight processing
 */

import { describe, it, expect } from "vitest";
import { inngest, type Events } from "@/lib/inngest/client";

describe("Inngest Client", () => {
  describe("client configuration", () => {
    it("exports an Inngest client instance", () => {
      expect(inngest).toBeDefined();
      expect(inngest.id).toBe("investments-planner");
    });

    it("has client ID set to 'investments-planner'", () => {
      expect(inngest.id).toBe("investments-planner");
    });
  });

  describe("Event types", () => {
    // Type-level tests to ensure Events type is properly defined
    // These tests verify the type definitions are correct at compile time

    it("includes user deletion event type", () => {
      // Type assertion to verify the event shape
      const deletionEvent: Events["user/deletion.scheduled"]["data"] = {
        userId: "user-123",
        scheduledPurgeDate: "2025-01-15T00:00:00Z",
        deletedAt: "2024-12-15T00:00:00Z",
      };
      expect(deletionEvent.userId).toBe("user-123");
      expect(deletionEvent.scheduledPurgeDate).toBe("2025-01-15T00:00:00Z");
      expect(deletionEvent.deletedAt).toBe("2024-12-15T00:00:00Z");
    });

    it("includes email verification event type", () => {
      const verificationEvent: Events["email/verification.requested"]["data"] = {
        userId: "user-123",
        email: "test@example.com",
        token: "verification-token",
        requestedAt: "2024-12-14T00:00:00Z",
      };
      expect(verificationEvent.userId).toBe("user-123");
      expect(verificationEvent.email).toBe("test@example.com");
    });

    it("includes password reset event type", () => {
      const resetEvent: Events["email/password-reset.requested"]["data"] = {
        userId: "user-123",
        email: "test@example.com",
        token: "reset-token",
        requestedAt: "2024-12-14T00:00:00Z",
      };
      expect(resetEvent.userId).toBe("user-123");
    });

    it("includes overnight scoring started event type", () => {
      const scoringEvent: Events["overnight/scoring.started"]["data"] = {
        correlationId: "corr-123",
        triggeredAt: "2024-12-14T04:00:00Z",
        triggeredBy: "cron",
        market: "US",
      };
      expect(scoringEvent.correlationId).toBe("corr-123");
      expect(scoringEvent.triggeredBy).toBe("cron");
      expect(scoringEvent.market).toBe("US");
    });

    it("includes overnight scoring started event with optional market as undefined", () => {
      const scoringEvent: Events["overnight/scoring.started"]["data"] = {
        correlationId: "corr-123",
        triggeredAt: "2024-12-14T04:00:00Z",
        triggeredBy: "manual",
        market: undefined,
      };
      expect(scoringEvent.market).toBeUndefined();
    });

    it("includes overnight scoring completed event type", () => {
      const completedEvent: Events["overnight/scoring.completed"]["data"] = {
        correlationId: "corr-123",
        completedAt: "2024-12-14T04:30:00Z",
        usersProcessed: 100,
        assetsScored: 500,
        durationMs: 1800000,
        success: true,
        error: undefined,
      };
      expect(completedEvent.usersProcessed).toBe(100);
      expect(completedEvent.success).toBe(true);
    });

    it("includes overnight scoring completed event with error", () => {
      const errorEvent: Events["overnight/scoring.completed"]["data"] = {
        correlationId: "corr-123",
        completedAt: "2024-12-14T04:15:00Z",
        usersProcessed: 50,
        assetsScored: 200,
        durationMs: 900000,
        success: false,
        error: "Database connection failed",
      };
      expect(errorEvent.success).toBe(false);
      expect(errorEvent.error).toBe("Database connection failed");
    });

    it("includes cache warming started event type", () => {
      const warmingEvent: Events["cache/warming.started"]["data"] = {
        correlationId: "corr-123",
        triggeredAt: "2024-12-14T04:30:00Z",
        triggeredBy: "overnight-job",
      };
      expect(warmingEvent.correlationId).toBe("corr-123");
      expect(warmingEvent.triggeredBy).toBe("overnight-job");
    });

    it("includes cache warming completed event type", () => {
      const completedEvent: Events["cache/warming.completed"]["data"] = {
        correlationId: "corr-123",
        completedAt: "2024-12-14T04:35:00Z",
        keysWarmed: 150,
        durationMs: 300000,
        success: true,
        error: undefined,
      };
      expect(completedEvent.keysWarmed).toBe(150);
      expect(completedEvent.success).toBe(true);
    });
  });

  describe("Event type constraints", () => {
    it("triggeredBy for scoring must be cron or manual", () => {
      // Type-level constraint verification
      const cronTrigger: Events["overnight/scoring.started"]["data"]["triggeredBy"] = "cron";
      const manualTrigger: Events["overnight/scoring.started"]["data"]["triggeredBy"] = "manual";
      expect(cronTrigger).toBe("cron");
      expect(manualTrigger).toBe("manual");
    });

    it("triggeredBy for cache warming must be overnight-job or manual", () => {
      // Type-level constraint verification
      const jobTrigger: Events["cache/warming.started"]["data"]["triggeredBy"] = "overnight-job";
      const manualTrigger: Events["cache/warming.started"]["data"]["triggeredBy"] = "manual";
      expect(jobTrigger).toBe("overnight-job");
      expect(manualTrigger).toBe("manual");
    });
  });
});
