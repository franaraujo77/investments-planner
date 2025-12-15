/**
 * Overnight Job Recommendation Generation Integration Tests
 *
 * Story 8.3: Recommendation Pre-Generation
 * Tests the integration of recommendation generation step in overnight job
 *
 * AC-8.3.1: Recommendations Generated from Latest Scores
 * AC-8.3.2: Default Contribution Amount Used
 * AC-8.3.3: Criteria Version Stored for Audit
 * AC-8.3.4: Allocation Gap Calculations Included
 * AC-8.3.5: Continue Processing on User Failure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the job
vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    createFunction: vi.fn((config, trigger, handler) => ({
      ...config,
      trigger,
      handler,
    })),
  },
}));

vi.mock("@/lib/telemetry/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/telemetry", () => ({
  createJobSpan: vi.fn(() => ({
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    end: vi.fn(),
  })),
  SpanStatusCode: {
    OK: 1,
    ERROR: 2,
  },
  SpanAttributes: {
    FETCH_RATES_MS: "fetch_rates_ms",
    FETCH_PRICES_MS: "fetch_prices_ms",
    ASSET_COUNT: "asset_count",
    TOTAL_DURATION_MS: "total_duration_ms",
  },
}));

vi.mock("@/lib/services/overnight-job-service", () => ({
  overnightJobService: {
    createJobRun: vi.fn(() => Promise.resolve({ id: "job-run-123" })),
    completeJobRun: vi.fn(() => Promise.resolve({})),
    failJobRun: vi.fn(() => Promise.resolve({})),
  },
  JOB_TYPE: {
    SCORING: "scoring",
    RECOMMENDATIONS: "recommendations",
    CACHE_WARM: "cache-warm",
  },
}));

vi.mock("@/lib/services/user-query-service", () => ({
  userQueryService: {
    getActiveUsersWithPortfolios: vi.fn(() => Promise.resolve([])),
    getUniqueCurrencies: vi.fn(() => Promise.resolve(["USD"])),
    getUniqueAssetSymbols: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("@/lib/services/batch-scoring-service", () => ({
  batchScoringService: {
    processUserBatch: vi.fn(() =>
      Promise.resolve({
        usersProcessed: 0,
        usersSuccess: 0,
        usersFailed: 0,
        totalAssetsScored: 0,
        results: [],
      })
    ),
  },
}));

vi.mock("@/lib/services/batch-recommendation-service", () => ({
  batchRecommendationService: {
    generateRecommendationsForUsers: vi.fn(() =>
      Promise.resolve({
        usersProcessed: 0,
        usersSuccess: 0,
        usersFailed: 0,
        totalRecommendationsGenerated: 0,
        totalDurationMs: 10,
        results: [],
      })
    ),
  },
}));

vi.mock("@/lib/providers/exchange-rate-service", () => ({
  ExchangeRateService: class MockExchangeRateService {},
}));

vi.mock("@/lib/providers/price-service", () => ({
  PriceService: class MockPriceService {},
}));

// Import after mocks
import { overnightScoringJob } from "@/lib/inngest/functions/overnight-scoring";
import { batchRecommendationService } from "@/lib/services/batch-recommendation-service";
import { userQueryService } from "@/lib/services/user-query-service";
import { batchScoringService } from "@/lib/services/batch-scoring-service";
import { overnightJobService } from "@/lib/services/overnight-job-service";

describe("Overnight Job - Recommendation Generation Step", () => {
  let mockStep: {
    run: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock step.run that executes the provided function
    mockStep = {
      run: vi.fn((name, fn) => fn()),
    };
  });

  describe("Step 6: generate-recommendations", () => {
    it("should call batchRecommendationService after scoring (AC-8.3.1)", async () => {
      // Setup: Mock 2 users with successful scoring
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([
        {
          userId: "user-1",
          email: "user1@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-1",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
        {
          userId: "user-2",
          email: "user2@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-2",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
      ]);

      vi.mocked(batchScoringService.processUserBatch).mockResolvedValue({
        usersProcessed: 2,
        usersSuccess: 2,
        usersFailed: 0,
        totalAssetsScored: 5,
        results: [
          { userId: "user-1", success: true, assetsScored: 3 },
          { userId: "user-2", success: true, assetsScored: 2 },
        ],
      });

      vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mockResolvedValue({
        usersProcessed: 2,
        usersSuccess: 2,
        usersFailed: 0,
        totalRecommendationsGenerated: 10,
        totalDurationMs: 50,
        results: [
          {
            userId: "user-1",
            success: true,
            correlationId: "c1",
            recommendationsGenerated: 5,
            durationMs: 25,
          },
          {
            userId: "user-2",
            success: true,
            correlationId: "c2",
            recommendationsGenerated: 5,
            durationMs: 25,
          },
        ],
      });

      // Execute job handler
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      await handler({ step: mockStep });

      // Verify recommendation service was called
      expect(batchRecommendationService.generateRecommendationsForUsers).toHaveBeenCalled();
    });

    it("should only generate for successfully scored users (AC-8.3.5)", async () => {
      // Setup: 2 users, 1 fails scoring
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([
        {
          userId: "user-1",
          email: "user1@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-1",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
        {
          userId: "user-2",
          email: "user2@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-2",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
      ]);

      // User-1 fails scoring, User-2 succeeds
      vi.mocked(batchScoringService.processUserBatch).mockResolvedValue({
        usersProcessed: 2,
        usersSuccess: 1,
        usersFailed: 1,
        totalAssetsScored: 2,
        results: [
          { userId: "user-1", success: false, error: "Scoring failed", assetsScored: 0 },
          { userId: "user-2", success: true, assetsScored: 2 },
        ],
      });

      vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mockResolvedValue({
        usersProcessed: 1,
        usersSuccess: 1,
        usersFailed: 0,
        totalRecommendationsGenerated: 5,
        totalDurationMs: 25,
        results: [
          {
            userId: "user-2",
            success: true,
            correlationId: "c2",
            recommendationsGenerated: 5,
            durationMs: 25,
          },
        ],
      });

      // Execute
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      await handler({ step: mockStep });

      // Verify only user-2 was passed to recommendation generation
      const recCall = vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mock
        .calls[0];
      expect(recCall?.[0]).toHaveLength(1);
      expect(recCall?.[0]).toContain("user-2");
    });

    it("should pass exchange rates and prices to recommendation service", async () => {
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([
        {
          userId: "user-1",
          email: "user1@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-1",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
      ]);

      vi.mocked(batchScoringService.processUserBatch).mockResolvedValue({
        usersProcessed: 1,
        usersSuccess: 1,
        usersFailed: 0,
        totalAssetsScored: 2,
        results: [{ userId: "user-1", success: true, assetsScored: 2 }],
      });

      // Execute
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      await handler({ step: mockStep });

      // Verify context was passed
      const recCall = vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mock
        .calls[0];
      expect(recCall?.[1]).toHaveProperty("exchangeRates");
      expect(recCall?.[1]).toHaveProperty("prices");
      expect(recCall?.[1]).toHaveProperty("correlationId");
    });

    it("should handle empty user list gracefully", async () => {
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([]);

      // Execute
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      const result = await handler({ step: mockStep });

      // Should complete successfully with 0 counts
      expect(result.success).toBe(true);
    });

    it("should include recommendation metrics in finalize step (AC-8.3.3)", async () => {
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([
        {
          userId: "user-1",
          email: "user1@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-1",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
      ]);

      vi.mocked(batchScoringService.processUserBatch).mockResolvedValue({
        usersProcessed: 1,
        usersSuccess: 1,
        usersFailed: 0,
        totalAssetsScored: 3,
        results: [{ userId: "user-1", success: true, assetsScored: 3 }],
      });

      vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mockResolvedValue({
        usersProcessed: 1,
        usersSuccess: 1,
        usersFailed: 0,
        totalRecommendationsGenerated: 5,
        totalDurationMs: 30,
        results: [
          {
            userId: "user-1",
            success: true,
            correlationId: "c1",
            recommendationsGenerated: 5,
            durationMs: 30,
          },
        ],
      });

      // Execute
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      await handler({ step: mockStep });

      // Verify job service received recommendation metrics
      const completeCall = vi.mocked(overnightJobService.completeJobRun).mock.calls[0];
      const metrics = completeCall?.[1]?.metrics;

      expect(metrics).toBeDefined();
      expect(metrics?.recommendationsGenerated).toBe(5);
      expect(metrics?.usersWithRecommendations).toBe(1);
      // Duration may vary based on step.run execution time
      expect(metrics?.recommendationDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should return recommendation counts in job result", async () => {
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([
        {
          userId: "user-1",
          email: "user1@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-1",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
      ]);

      vi.mocked(batchScoringService.processUserBatch).mockResolvedValue({
        usersProcessed: 1,
        usersSuccess: 1,
        usersFailed: 0,
        totalAssetsScored: 2,
        results: [{ userId: "user-1", success: true, assetsScored: 2 }],
      });

      vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mockResolvedValue({
        usersProcessed: 1,
        usersSuccess: 1,
        usersFailed: 0,
        totalRecommendationsGenerated: 5,
        totalDurationMs: 25,
        results: [
          {
            userId: "user-1",
            success: true,
            correlationId: "c1",
            recommendationsGenerated: 5,
            durationMs: 25,
          },
        ],
      });

      // Execute
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      const result = await handler({ step: mockStep });

      // Verify return value includes recommendation data
      expect(result.recommendationsGenerated).toBe(5);
      expect(result.usersWithRecommendations).toBe(1);
    });
  });

  describe("Error handling in recommendation generation", () => {
    it("should continue on recommendation failure (AC-8.3.5)", async () => {
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([
        {
          userId: "user-1",
          email: "user1@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-1",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
        {
          userId: "user-2",
          email: "user2@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-2",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
      ]);

      vi.mocked(batchScoringService.processUserBatch).mockResolvedValue({
        usersProcessed: 2,
        usersSuccess: 2,
        usersFailed: 0,
        totalAssetsScored: 4,
        results: [
          { userId: "user-1", success: true, assetsScored: 2 },
          { userId: "user-2", success: true, assetsScored: 2 },
        ],
      });

      // First user fails recommendation, second succeeds
      vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mockResolvedValue({
        usersProcessed: 2,
        usersSuccess: 1,
        usersFailed: 1,
        totalRecommendationsGenerated: 3,
        totalDurationMs: 40,
        results: [
          {
            userId: "user-1",
            success: false,
            error: "No default contribution",
            correlationId: "c1",
            recommendationsGenerated: 0,
            durationMs: 10,
          },
          {
            userId: "user-2",
            success: true,
            correlationId: "c2",
            recommendationsGenerated: 3,
            durationMs: 30,
          },
        ],
      });

      // Execute
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      const result = await handler({ step: mockStep });

      // Job should still succeed overall
      expect(result.success).toBe(true);
      // Partial success reflected in counts
      expect(result.usersWithRecommendations).toBe(1);
      expect(result.recommendationsGenerated).toBe(3);
    });

    it("should handle batch failure gracefully", async () => {
      vi.mocked(userQueryService.getActiveUsersWithPortfolios).mockResolvedValue([
        {
          userId: "user-1",
          email: "user1@test.com",
          baseCurrency: "USD",
          portfolioId: "portfolio-1",
          portfolioName: "Main",
          assets: [],
          criteria: null,
        },
      ]);

      vi.mocked(batchScoringService.processUserBatch).mockResolvedValue({
        usersProcessed: 1,
        usersSuccess: 1,
        usersFailed: 0,
        totalAssetsScored: 2,
        results: [{ userId: "user-1", success: true, assetsScored: 2 }],
      });

      // Recommendation service throws
      vi.mocked(batchRecommendationService.generateRecommendationsForUsers).mockRejectedValue(
        new Error("Batch processing failed")
      );

      // Execute - should not throw
      const handler = (overnightScoringJob as { handler: (ctx: unknown) => Promise<unknown> })
        .handler;
      const result = await handler({ step: mockStep });

      // Job should still complete
      expect(result.success).toBe(true);
    });
  });
});
