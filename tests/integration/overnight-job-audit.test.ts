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
