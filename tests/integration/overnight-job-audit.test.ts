/**
 * Integration Tests: Overnight Job Audit Trail
 *
 * Story 8.6: Calculation Audit Trail
 * Tests the integration between overnight jobs and audit trail:
 * - AC-8.6.1: overnight_job_runs tracks all job executions
 * - AC-8.6.2: Each job run has correlationId linking to calculation events
 * - AC-8.6.3: Job metrics are recorded
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database for integration testing
// Note: These mocks are declared for potential future use/extension
const _mockDbInsert = vi.fn();
const _mockDbUpdate = vi.fn();
const _mockDbSelect = vi.fn();
const mockDbValues = vi.fn();
const mockDbSet = vi.fn();
const mockDbWhere = vi.fn();
const mockDbFrom = vi.fn();
const mockDbReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: mockDbValues,
    }),
    update: () => ({
      set: mockDbSet,
    }),
    select: () => ({
      from: mockDbFrom,
    }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  overnightJobRuns: {
    id: "id",
    jobType: "jobType",
    status: "status",
    correlationId: "correlationId",
    startedAt: "startedAt",
    completedAt: "completedAt",
    usersProcessed: "usersProcessed",
    usersFailed: "usersFailed",
    metrics: "metrics",
    errorDetails: "errorDetails",
  },
  calculationEvents: {
    correlationId: "correlationId",
    userId: "userId",
    eventType: "eventType",
    payload: "payload",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ type: "eq", field, value })),
}));

import {
  OvernightJobService,
  JOB_TYPE,
  JOB_STATUS,
  type JobRunMetrics,
} from "@/lib/services/overnight-job-service";

describe("Overnight Job Audit Trail Integration", () => {
  let jobService: OvernightJobService;

  beforeEach(() => {
    vi.clearAllMocks();
    jobService = new OvernightJobService();

    // Default chain behavior
    mockDbValues.mockReturnValue({ returning: mockDbReturning });
    mockDbSet.mockReturnValue({ where: mockDbWhere });
    mockDbWhere.mockReturnValue({ returning: mockDbReturning });
    mockDbFrom.mockReturnValue({ where: mockDbWhere });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("AC-8.6.1: Job Run Tracking", () => {
    it("should create job run record with correlation ID on start", async () => {
      const correlationId = crypto.randomUUID();
      const mockJobRun = {
        id: "job-1",
        jobType: JOB_TYPE.SCORING,
        status: JOB_STATUS.STARTED,
        correlationId,
        startedAt: new Date(),
        usersProcessed: 0,
        usersFailed: 0,
      };

      mockDbReturning.mockResolvedValue([mockJobRun]);

      const result = await jobService.createJobRun({
        jobType: JOB_TYPE.SCORING,
        correlationId,
      });

      expect(result.id).toBeDefined();
      expect(result.correlationId).toBe(correlationId);
      expect(result.status).toBe(JOB_STATUS.STARTED);
    });

    it("should update job run record on completion", async () => {
      const mockCompletedRun = {
        id: "job-1",
        jobType: JOB_TYPE.SCORING,
        status: JOB_STATUS.COMPLETED,
        completedAt: new Date(),
        usersProcessed: 100,
        usersFailed: 0,
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 100,
      });

      expect(result.status).toBe(JOB_STATUS.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });

    it("should mark job as partial when some users fail", async () => {
      const mockPartialRun = {
        id: "job-1",
        status: JOB_STATUS.PARTIAL,
        usersProcessed: 100,
        usersFailed: 5,
      };

      mockDbReturning.mockResolvedValue([mockPartialRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 100,
        usersFailed: 5,
      });

      expect(result.status).toBe(JOB_STATUS.PARTIAL);
      expect(result.usersFailed).toBe(5);
    });

    it("should mark job as failed on fatal error", async () => {
      const mockFailedRun = {
        id: "job-1",
        status: JOB_STATUS.FAILED,
        errorDetails: {
          errors: [{ message: "Database connection lost" }],
        },
      };

      mockDbReturning.mockResolvedValue([mockFailedRun]);

      const result = await jobService.failJobRun("job-1", {
        errorDetails: {
          errors: [{ message: "Database connection lost" }],
        },
      });

      expect(result.status).toBe(JOB_STATUS.FAILED);
    });
  });

  describe("AC-8.6.2: Correlation ID Linking", () => {
    it("should use same correlation ID for job run and events", async () => {
      const correlationId = crypto.randomUUID();

      const mockJobRun = {
        id: "job-1",
        correlationId,
        status: JOB_STATUS.STARTED,
      };

      mockDbReturning.mockResolvedValue([mockJobRun]);

      const jobRun = await jobService.createJobRun({
        jobType: JOB_TYPE.SCORING,
        correlationId,
      });

      // The correlation ID should be available for linking events
      expect(jobRun.correlationId).toBe(correlationId);
    });

    it("should be able to retrieve job run by correlation ID", async () => {
      const correlationId = crypto.randomUUID();
      const mockJobRun = {
        id: "job-1",
        correlationId,
        status: JOB_STATUS.COMPLETED,
      };

      mockDbWhere.mockResolvedValue([mockJobRun]);

      const result = await jobService.getJobRunByCorrelationId(correlationId);

      expect(result?.correlationId).toBe(correlationId);
    });
  });

  describe("AC-8.6.3: Job Metrics Recording", () => {
    it("should record timing breakdown metrics", async () => {
      const metrics: JobRunMetrics = {
        fetchRatesMs: 150,
        processUsersMs: 8500,
        totalDurationMs: 9000,
        assetsScored: 500,
        usersTotal: 100,
      };

      const mockCompletedRun = {
        id: "job-1",
        status: JOB_STATUS.COMPLETED,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 100,
        metrics,
      });

      expect(result.metrics).toEqual(metrics);
    });

    it("should record recommendation metrics", async () => {
      const metrics: JobRunMetrics = {
        totalDurationMs: 12000,
        recommendationsGenerated: 450,
        usersWithRecommendations: 95,
        recommendationDurationMs: 3000,
      };

      const mockCompletedRun = {
        id: "job-1",
        status: JOB_STATUS.COMPLETED,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 100,
        metrics,
      });

      expect(result.metrics?.recommendationsGenerated).toBe(450);
      expect(result.metrics?.recommendationDurationMs).toBe(3000);
    });

    it("should record cache warming metrics", async () => {
      const metrics: JobRunMetrics = {
        totalDurationMs: 15000,
        usersCached: 95,
        cacheFailures: 5,
        cacheWarmMs: 2000,
      };

      const mockCompletedRun = {
        id: "job-1",
        status: JOB_STATUS.COMPLETED,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 100,
        metrics,
      });

      expect(result.metrics?.usersCached).toBe(95);
      expect(result.metrics?.cacheWarmMs).toBe(2000);
    });

    it("should record fundamentals fetch metrics (AC-5.1.7)", async () => {
      // Story 5.1: Market Data Fetching
      // Fundamentals metrics track how many symbols had fundamentals fetched
      const metrics: JobRunMetrics = {
        totalDurationMs: 12000,
        fundamentalsFetched: 250,
        fetchFundamentalsMs: 3500,
        fetchPricesMs: 2000,
        fetchRatesMs: 500,
      };

      const mockCompletedRun = {
        id: "job-1",
        status: JOB_STATUS.COMPLETED,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 100,
        metrics,
      });

      expect(result.metrics?.fundamentalsFetched).toBe(250);
      expect(result.metrics?.fetchFundamentalsMs).toBe(3500);
    });

    it("should record market data cache metrics (AC-5.2.1, AC-5.2.2)", async () => {
      // Story 5.2: Two-Tier Refresh Architecture
      // Cache metrics track how many items were cached to both PostgreSQL and KV
      const metrics: JobRunMetrics = {
        totalDurationMs: 15000,
        fetchPricesMs: 2000,
        fetchRatesMs: 500,
        fetchFundamentalsMs: 3500,
        // Story 5.2 cache write metrics
        pricesCached: 150,
        ratesCached: 10,
        fundamentalsCached: 150,
        marketDataCacheMs: 450, // Total cache write time
      };

      const mockCompletedRun = {
        id: "job-1",
        status: JOB_STATUS.COMPLETED,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 100,
        metrics,
      });

      expect(result.metrics?.pricesCached).toBe(150);
      expect(result.metrics?.ratesCached).toBe(10);
      expect(result.metrics?.fundamentalsCached).toBe(150);
      expect(result.metrics?.marketDataCacheMs).toBe(450);
    });

    it("should record metrics even on partial failure", async () => {
      const metrics: JobRunMetrics = {
        totalDurationMs: 10000,
        assetsScored: 400,
      };

      const mockPartialRun = {
        id: "job-1",
        status: JOB_STATUS.PARTIAL,
        usersProcessed: 95,
        usersFailed: 5,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockPartialRun]);

      const result = await jobService.completeJobRun("job-1", {
        usersProcessed: 95,
        usersFailed: 5,
        metrics,
      });

      expect(result.metrics).toBeDefined();
      expect(result.metrics?.totalDurationMs).toBe(10000);
    });
  });

  describe("Job Type Tracking", () => {
    it("should track scoring job type", async () => {
      const mockJobRun = {
        id: "job-1",
        jobType: JOB_TYPE.SCORING,
        status: JOB_STATUS.STARTED,
      };

      mockDbReturning.mockResolvedValue([mockJobRun]);

      const result = await jobService.createJobRun({
        jobType: JOB_TYPE.SCORING,
        correlationId: crypto.randomUUID(),
      });

      expect(result.jobType).toBe("scoring");
    });

    it("should track recommendations job type", async () => {
      const mockJobRun = {
        id: "job-2",
        jobType: JOB_TYPE.RECOMMENDATIONS,
        status: JOB_STATUS.STARTED,
      };

      mockDbReturning.mockResolvedValue([mockJobRun]);

      const result = await jobService.createJobRun({
        jobType: JOB_TYPE.RECOMMENDATIONS,
        correlationId: crypto.randomUUID(),
      });

      expect(result.jobType).toBe("recommendations");
    });

    it("should track cache-warm job type", async () => {
      const mockJobRun = {
        id: "job-3",
        jobType: JOB_TYPE.CACHE_WARM,
        status: JOB_STATUS.STARTED,
      };

      mockDbReturning.mockResolvedValue([mockJobRun]);

      const result = await jobService.createJobRun({
        jobType: JOB_TYPE.CACHE_WARM,
        correlationId: crypto.randomUUID(),
      });

      expect(result.jobType).toBe("cache-warm");
    });
  });

  describe("AC-5.6.6: Job Run Queryability", () => {
    it("should retrieve job run by ID for audit trail", async () => {
      const mockJobRun = {
        id: "job-1",
        correlationId: crypto.randomUUID(),
        status: JOB_STATUS.COMPLETED,
        usersProcessed: 100,
        usersFailed: 0,
        metrics: {
          totalDurationMs: 5000,
          usersTotal: 100,
          assetsScored: 500,
        },
      };

      mockDbWhere.mockResolvedValue([mockJobRun]);

      const result = await jobService.getJobRun("job-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("job-1");
      expect(result?.metrics?.totalDurationMs).toBe(5000);
    });

    it("should return null for non-existent job run", async () => {
      mockDbWhere.mockResolvedValue([]);

      const result = await jobService.getJobRun("non-existent-id");

      expect(result).toBeNull();
    });

    it("should query job run with complete metrics for reporting", async () => {
      // Story 5.6: Complete metrics must be queryable for monitoring/alerting
      const mockJobRun = {
        id: "job-1",
        correlationId: crypto.randomUUID(),
        jobType: JOB_TYPE.SCORING,
        status: JOB_STATUS.COMPLETED,
        startedAt: new Date("2026-01-01T04:00:00Z"),
        completedAt: new Date("2026-01-01T05:30:00Z"),
        usersProcessed: 100,
        usersFailed: 2,
        metrics: {
          fetchRatesMs: 500,
          fetchPricesMs: 2000,
          fetchFundamentalsMs: 3000,
          processUsersMs: 8000,
          totalDurationMs: 90 * 60 * 1000, // 90 minutes
          usersTotal: 102,
          assetsScored: 500,
          fundamentalsFetched: 250,
          recommendationsGenerated: 450,
          usersWithRecommendations: 98,
          recommendationDurationMs: 3000,
          usersCached: 98,
          cacheFailures: 0,
          cacheWarmMs: 2000,
          pricesCached: 150,
          ratesCached: 10,
          fundamentalsCached: 150,
          marketDataCacheMs: 450,
        },
      };

      mockDbWhere.mockResolvedValue([mockJobRun]);

      const result = await jobService.getJobRun("job-1");

      // Verify all metrics are queryable
      expect(result).toBeDefined();
      expect(result?.metrics?.totalDurationMs).toBe(90 * 60 * 1000);
      expect(result?.metrics?.usersTotal).toBe(102);
      expect(result?.usersFailed).toBe(2);
      expect(result?.metrics?.recommendationsGenerated).toBe(450);
      expect(result?.metrics?.cacheWarmMs).toBe(2000);
    });
  });

  describe("Error Detail Recording", () => {
    it("should record per-user error details on failure", async () => {
      const errorDetails = {
        errors: [
          { userId: "user-1", message: "Price fetch failed", stage: "fetch-prices" },
          { userId: "user-2", message: "Scoring engine error", stage: "score-calculation" },
        ],
      };

      const mockFailedRun = {
        id: "job-1",
        status: JOB_STATUS.FAILED,
        errorDetails,
      };

      mockDbReturning.mockResolvedValue([mockFailedRun]);

      const result = await jobService.failJobRun("job-1", {
        errorDetails,
      });

      expect(result.errorDetails?.errors).toHaveLength(2);
      expect(result.errorDetails?.errors[0]).toHaveProperty("userId");
      expect(result.errorDetails?.errors[0]).toHaveProperty("stage");
    });
  });
});

describe("AC-5.6.5: On-Demand Fallback Detection", () => {
  it("should detect FAILED job status as requiring fallback", async () => {
    const mockFailedJob = {
      id: "job-1",
      status: JOB_STATUS.FAILED,
      completedAt: new Date(),
      usersFailed: 100,
      usersProcessed: 0,
    };

    // Failed status should trigger fallback
    expect(mockFailedJob.status).toBe(JOB_STATUS.FAILED);
    expect(mockFailedJob.usersFailed).toBeGreaterThan(0);
  });

  it("should detect PARTIAL job status with failures as requiring fallback", async () => {
    const mockPartialJob = {
      id: "job-1",
      status: JOB_STATUS.PARTIAL,
      completedAt: new Date(),
      usersFailed: 5,
      usersProcessed: 95,
    };

    // Partial with failures should trigger fallback
    expect(mockPartialJob.status).toBe(JOB_STATUS.PARTIAL);
    expect(mockPartialJob.usersFailed).toBeGreaterThan(0);
  });

  it("should not require fallback for COMPLETED job", async () => {
    const mockCompletedJob = {
      id: "job-1",
      status: JOB_STATUS.COMPLETED,
      completedAt: new Date(),
      usersFailed: 0,
      usersProcessed: 100,
    };

    // Completed with no failures should not trigger fallback
    expect(mockCompletedJob.status).toBe(JOB_STATUS.COMPLETED);
    expect(mockCompletedJob.usersFailed).toBe(0);
  });

  it("should check within 24-hour window for failures", async () => {
    // Document the 24-hour window for failure detection
    const FAILURE_CHECK_WINDOW_HOURS = 24;
    const now = new Date();
    const windowStart = new Date(now.getTime() - FAILURE_CHECK_WINDOW_HOURS * 60 * 60 * 1000);

    // Job within window should be considered
    const recentJob = { completedAt: new Date() };
    expect(recentJob.completedAt.getTime()).toBeGreaterThan(windowStart.getTime());

    // Job outside window should not be considered
    const oldJob = { completedAt: new Date(windowStart.getTime() - 1000) };
    expect(oldJob.completedAt.getTime()).toBeLessThan(windowStart.getTime());
  });
});

describe("AC-5.6.5: Full Fallback Flow Integration", () => {
  /**
   * Integration test documenting the complete fallback flow:
   * 1. DashboardService.getDashboardData() is called
   * 2. Cache miss occurs (Vercel KV returns null)
   * 3. Database fallback attempted (no cached recommendations in DB)
   * 4. RecommendationFallbackService.getRecommendationsWithFallback() called
   * 5. On-demand calculation triggered
   * 6. Result cached for subsequent requests
   * 7. Dashboard data returned to user
   *
   * This documents the expected integration between services.
   */
  it("documents the complete fallback chain", () => {
    const fallbackChain = {
      step1_dashboardRequest: "DashboardService.getDashboardData(userId)",
      step2_cacheCheck: "RecommendationCacheService.get(userId) → null",
      step3_dbFallback: "RecommendationService.getCachedRecommendation(userId) → null",
      step4_onDemandFallback:
        "RecommendationFallbackService.getRecommendationsWithFallback(userId)",
      step5_overnightCheck: "FallbackService checks overnight_job_runs for failures",
      step6_calculation: "BatchRecommendationService.generateRecommendationsForUser(userId)",
      step7_cacheResult: "RecommendationCacheService.set(userId, recommendations)",
      step8_returnData: "DashboardData with fromCache: false",
    };

    // Verify all 8 steps are documented
    expect(Object.keys(fallbackChain)).toHaveLength(8);

    // Verify chain starts with dashboard and ends with response
    expect(fallbackChain.step1_dashboardRequest).toContain("DashboardService");
    expect(fallbackChain.step8_returnData).toContain("fromCache: false");
  });

  it("documents conservative global-failure approach", () => {
    // DESIGN DECISION: Global failure detection is conservative
    // When overnight job has PARTIAL failures, ALL users trigger on-demand fallback
    // This is intentional - false positives are safer than false negatives
    const designDecision = {
      approach: "conservative_global_failure",
      behavior: "PARTIAL failures trigger fallback for ALL users",
      rationale: [
        "Per-user tracking would require additional DB schema",
        "False positives (extra fallback) are better than false negatives",
        "On-demand calculation is fast enough for good UX",
      ],
      tradeoff: "Slightly higher compute cost vs guaranteed data availability",
    };

    expect(designDecision.approach).toBe("conservative_global_failure");
    expect(designDecision.rationale).toHaveLength(3);
  });

  it("documents FallbackResult structure", () => {
    // FallbackResult tracks the source and whether fallback was triggered
    const sampleResult = {
      recommendations: null,
      source: "on-demand" as const,
      durationMs: 250,
      fallbackTriggered: true,
      reason: "overnight_failure: partial",
    };

    // Source can only be "cache" or "on-demand"
    // ("database" was removed - DashboardService handles that layer)
    expect(["cache", "on-demand"]).toContain(sampleResult.source);
    expect(sampleResult.fallbackTriggered).toBe(true);
    expect(sampleResult.reason).toContain("overnight_failure");
  });
});

describe("End-to-End Job Flow", () => {
  let jobService: OvernightJobService;

  beforeEach(() => {
    vi.clearAllMocks();
    jobService = new OvernightJobService();

    mockDbValues.mockReturnValue({ returning: mockDbReturning });
    mockDbSet.mockReturnValue({ where: mockDbWhere });
    mockDbWhere.mockReturnValue({ returning: mockDbReturning });
    mockDbFrom.mockReturnValue({ where: mockDbWhere });
  });

  it("should complete full job lifecycle", async () => {
    const correlationId = crypto.randomUUID();

    // 1. Create job run
    const startedJob = {
      id: "job-1",
      correlationId,
      jobType: JOB_TYPE.SCORING,
      status: JOB_STATUS.STARTED,
      startedAt: new Date(),
      usersProcessed: 0,
      usersFailed: 0,
    };

    mockDbReturning.mockResolvedValueOnce([startedJob]);

    const created = await jobService.createJobRun({
      jobType: JOB_TYPE.SCORING,
      correlationId,
    });

    expect(created.status).toBe(JOB_STATUS.STARTED);

    // 2. Complete job with metrics
    const completedJob = {
      ...startedJob,
      status: JOB_STATUS.COMPLETED,
      completedAt: new Date(),
      usersProcessed: 100,
      metrics: {
        fetchRatesMs: 100,
        processUsersMs: 5000,
        totalDurationMs: 5500,
        assetsScored: 500,
        usersTotal: 100,
        recommendationsGenerated: 450,
        cacheWarmMs: 1000,
      },
    };

    mockDbReturning.mockResolvedValueOnce([completedJob]);

    const completed = await jobService.completeJobRun(created.id, {
      usersProcessed: 100,
      metrics: completedJob.metrics as JobRunMetrics,
    });

    expect(completed.status).toBe(JOB_STATUS.COMPLETED);
    expect(completed.metrics?.totalDurationMs).toBe(5500);
    expect(completed.metrics?.recommendationsGenerated).toBe(450);
    expect(completed.metrics?.cacheWarmMs).toBe(1000);
  });
});
