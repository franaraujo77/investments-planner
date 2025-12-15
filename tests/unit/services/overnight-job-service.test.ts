/**
 * Overnight Job Service Tests
 *
 * Story 8.2: Overnight Scoring Job
 * AC-8.2.5: Graceful Error Handling (track job metrics)
 * AC-8.2.6: Performance Target (record timing)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database
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
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ type: "eq", field, value })),
}));

import {
  OvernightJobService,
  JOB_STATUS,
  JOB_TYPE,
  type JobRunMetrics,
  type JobErrorDetails,
} from "@/lib/services/overnight-job-service";

describe("OvernightJobService", () => {
  let service: OvernightJobService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OvernightJobService();

    // Default chain behavior
    mockDbValues.mockReturnValue({ returning: mockDbReturning });
    mockDbSet.mockReturnValue({ where: mockDbWhere });
    mockDbWhere.mockReturnValue({ returning: mockDbReturning });
    mockDbFrom.mockReturnValue({ where: mockDbWhere });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createJobRun", () => {
    it("should create a new job run with started status", async () => {
      const mockJobRun = {
        id: "job-1",
        jobType: JOB_TYPE.SCORING,
        status: JOB_STATUS.STARTED,
        correlationId: "corr-1",
        startedAt: new Date(),
        usersProcessed: 0,
        usersFailed: 0,
      };

      mockDbReturning.mockResolvedValue([mockJobRun]);

      const result = await service.createJobRun({
        jobType: JOB_TYPE.SCORING,
        correlationId: "corr-1",
      });

      expect(result.id).toBe("job-1");
      expect(result.status).toBe(JOB_STATUS.STARTED);
      expect(result.jobType).toBe(JOB_TYPE.SCORING);
    });

    it("should throw if insertion fails", async () => {
      mockDbReturning.mockResolvedValue([]);

      await expect(
        service.createJobRun({
          jobType: JOB_TYPE.SCORING,
          correlationId: "corr-1",
        })
      ).rejects.toThrow("Failed to create overnight job run");
    });
  });

  describe("completeJobRun", () => {
    it("should mark job as completed when no failures", async () => {
      const mockCompletedRun = {
        id: "job-1",
        status: JOB_STATUS.COMPLETED,
        usersProcessed: 10,
        usersFailed: 0,
        completedAt: new Date(),
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await service.completeJobRun("job-1", {
        usersProcessed: 10,
      });

      expect(result.status).toBe(JOB_STATUS.COMPLETED);
      expect(result.usersProcessed).toBe(10);
    });

    it("should mark job as partial when some users failed", async () => {
      const mockPartialRun = {
        id: "job-1",
        status: JOB_STATUS.PARTIAL,
        usersProcessed: 10,
        usersFailed: 2,
        completedAt: new Date(),
      };

      mockDbReturning.mockResolvedValue([mockPartialRun]);

      const result = await service.completeJobRun("job-1", {
        usersProcessed: 10,
        usersFailed: 2,
      });

      expect(result.status).toBe(JOB_STATUS.PARTIAL);
      expect(result.usersFailed).toBe(2);
    });

    it("should store metrics when provided", async () => {
      const metrics: JobRunMetrics = {
        fetchRatesMs: 100,
        processUsersMs: 5000,
        totalDurationMs: 5500,
        assetsScored: 50,
        usersTotal: 10,
      };

      const mockCompletedRun = {
        id: "job-1",
        status: JOB_STATUS.COMPLETED,
        usersProcessed: 10,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockCompletedRun]);

      const result = await service.completeJobRun("job-1", {
        usersProcessed: 10,
        metrics,
      });

      expect(result.metrics).toEqual(metrics);
    });

    it("should throw if job run not found", async () => {
      mockDbReturning.mockResolvedValue([]);

      await expect(
        service.completeJobRun("non-existent", {
          usersProcessed: 10,
        })
      ).rejects.toThrow("Failed to complete job run");
    });
  });

  describe("failJobRun", () => {
    it("should mark job as failed with error details", async () => {
      const errorDetails: JobErrorDetails = {
        errors: [{ userId: "user-1", message: "Scoring failed", stage: "score-calculation" }],
      };

      const mockFailedRun = {
        id: "job-1",
        status: JOB_STATUS.FAILED,
        errorDetails,
        usersProcessed: 0,
        usersFailed: 1,
      };

      mockDbReturning.mockResolvedValue([mockFailedRun]);

      const result = await service.failJobRun("job-1", {
        errorDetails,
      });

      expect(result.status).toBe(JOB_STATUS.FAILED);
      expect(result.errorDetails).toEqual(errorDetails);
    });

    it("should include metrics even on failure", async () => {
      const errorDetails: JobErrorDetails = {
        errors: [{ message: "Fatal error" }],
      };
      const metrics: JobRunMetrics = {
        fetchRatesMs: 100,
        totalDurationMs: 500,
      };

      const mockFailedRun = {
        id: "job-1",
        status: JOB_STATUS.FAILED,
        errorDetails,
        metrics,
      };

      mockDbReturning.mockResolvedValue([mockFailedRun]);

      const result = await service.failJobRun("job-1", {
        errorDetails,
        metrics,
      });

      expect(result.metrics).toEqual(metrics);
    });
  });

  describe("getJobRun", () => {
    it("should return job run by ID", async () => {
      const mockJobRun = {
        id: "job-1",
        jobType: JOB_TYPE.SCORING,
        status: JOB_STATUS.COMPLETED,
      };

      mockDbWhere.mockResolvedValue([mockJobRun]);

      const result = await service.getJobRun("job-1");

      expect(result).toEqual(mockJobRun);
    });

    it("should return null if not found", async () => {
      mockDbWhere.mockResolvedValue([]);

      const result = await service.getJobRun("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getJobRunByCorrelationId", () => {
    it("should return job run by correlation ID", async () => {
      const mockJobRun = {
        id: "job-1",
        correlationId: "corr-1",
        status: JOB_STATUS.COMPLETED,
      };

      mockDbWhere.mockResolvedValue([mockJobRun]);

      const result = await service.getJobRunByCorrelationId("corr-1");

      expect(result?.correlationId).toBe("corr-1");
    });
  });

  describe("updateMetrics", () => {
    it("should update metrics on existing job run", async () => {
      const existingRun = {
        id: "job-1",
        metrics: { fetchRatesMs: 100 },
      };

      mockDbWhere
        .mockResolvedValueOnce([existingRun]) // getJobRun call
        .mockResolvedValueOnce([]); // update call

      await expect(service.updateMetrics("job-1", { processUsersMs: 500 })).resolves.not.toThrow();
    });

    it("should throw if job run not found", async () => {
      mockDbWhere.mockResolvedValue([]);

      await expect(service.updateMetrics("non-existent", { processUsersMs: 500 })).rejects.toThrow(
        "Job run not found"
      );
    });
  });

  describe("incrementUserCounts", () => {
    it("should increment processed and failed counts", async () => {
      const existingRun = {
        id: "job-1",
        usersProcessed: 5,
        usersFailed: 1,
      };

      mockDbWhere
        .mockResolvedValueOnce([existingRun]) // getJobRun call
        .mockResolvedValueOnce([]); // update call

      await expect(
        service.incrementUserCounts("job-1", { processed: 5, failed: 1 })
      ).resolves.not.toThrow();
    });
  });
});

describe("Job Status Constants", () => {
  it("should have expected status values", () => {
    expect(JOB_STATUS.STARTED).toBe("started");
    expect(JOB_STATUS.COMPLETED).toBe("completed");
    expect(JOB_STATUS.FAILED).toBe("failed");
    expect(JOB_STATUS.PARTIAL).toBe("partial");
  });
});

describe("Job Type Constants", () => {
  it("should have expected type values", () => {
    expect(JOB_TYPE.SCORING).toBe("scoring");
    expect(JOB_TYPE.RECOMMENDATIONS).toBe("recommendations");
    expect(JOB_TYPE.CACHE_WARM).toBe("cache-warm");
  });
});
